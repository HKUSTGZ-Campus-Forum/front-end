#!/usr/bin/env python3
"""Run the release controller while holding non-inheritable deployment locks."""

from __future__ import annotations

import errno
import fcntl
import os
import signal
import stat
import subprocess
import sys
import time
from typing import NoReturn, Optional


def fail(message: str) -> NoReturn:
    print(f"atomic-release: {message}", file=sys.stderr)
    raise SystemExit(1)


def acquire(fd: int, deadline: float, lock_path: str) -> None:
    while True:
        try:
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
            return
        except BlockingIOError:
            if time.monotonic() >= deadline:
                fail(f"another deployment still holds {lock_path}")
            time.sleep(min(0.1, max(0.0, deadline - time.monotonic())))


def wait_for_test_gate(environment_name: str) -> None:
    gate = os.environ.get(environment_name)
    if not gate:
        return
    if os.environ.get("ATOMIC_RELEASE_TESTING") != "1":
        fail("the lock interposition gate is test-only")

    ready = f"{gate}.ready"
    proceed = f"{gate}.continue"
    ready_fd = os.open(
        ready,
        os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC,
        0o600,
    )
    os.close(ready_fd)
    deadline = time.monotonic() + 10
    while not os.path.exists(proceed):
        if time.monotonic() >= deadline:
            fail("timed out waiting for the test lock interposition gate")
        time.sleep(0.01)


def checked_root(app_root: str) -> tuple[int, os.stat_result]:
    flags = os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    try:
        root_fd = os.open(app_root, flags)
    except OSError as error:
        fail(f"APP_ROOT could not be opened safely: {error.strerror}")

    root_stat = os.fstat(root_fd)
    try:
        path_stat = os.stat(app_root, follow_symlinks=False)
    except OSError as error:
        os.close(root_fd)
        fail(f"APP_ROOT could not be inspected safely: {error.strerror}")
    if not stat.S_ISDIR(path_stat.st_mode) or (
        root_stat.st_dev,
        root_stat.st_ino,
    ) != (path_stat.st_dev, path_stat.st_ino):
        os.close(root_fd)
        fail("APP_ROOT changed while it was opened")
    return root_fd, root_stat


def checked_lock(root_fd: int, root_stat: os.stat_result) -> int:
    flags = os.O_RDWR | os.O_CREAT | os.O_CLOEXEC | os.O_NONBLOCK
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    try:
        lock_fd = os.open(".deploy.lock", flags, 0o600, dir_fd=root_fd)
    except OSError as error:
        if error.errno in (errno.ELOOP, errno.EMLINK):
            fail("deployment lock must not be a symlink")
        fail(f"deployment lock could not be opened safely: {error.strerror}")

    lock_stat = os.fstat(lock_fd)
    if not stat.S_ISREG(lock_stat.st_mode):
        os.close(lock_fd)
        fail("deployment lock is not a regular file")
    if lock_stat.st_uid != root_stat.st_uid:
        os.close(lock_fd)
        fail("deployment lock is not owned by the application owner")
    if lock_stat.st_nlink != 1:
        os.close(lock_fd)
        fail("deployment lock must have exactly one hard link")

    try:
        path_stat = os.stat(".deploy.lock", dir_fd=root_fd, follow_symlinks=False)
    except OSError as error:
        os.close(lock_fd)
        fail(f"deployment lock changed while it was opened: {error.strerror}")
    if not stat.S_ISREG(path_stat.st_mode) or (
        lock_stat.st_dev,
        lock_stat.st_ino,
    ) != (path_stat.st_dev, path_stat.st_ino):
        os.close(lock_fd)
        fail("deployment lock changed while it was opened")
    os.fchmod(lock_fd, 0o600)
    if stat.S_IMODE(os.fstat(lock_fd).st_mode) != 0o600:
        os.close(lock_fd)
        fail("deployment lock permissions could not be restricted")
    return lock_fd


def verify_lock_identity(root_fd: int, lock_fd: int) -> None:
    lock_stat = os.fstat(lock_fd)
    try:
        path_stat = os.stat(".deploy.lock", dir_fd=root_fd, follow_symlinks=False)
    except OSError as error:
        fail(f"deployment lock changed while it was acquired: {error.strerror}")
    if not stat.S_ISREG(path_stat.st_mode) or (
        lock_stat.st_dev,
        lock_stat.st_ino,
    ) != (path_stat.st_dev, path_stat.st_ino):
        fail("deployment lock changed while it was acquired")


def run_controller(controller: str, arguments: list[str]) -> int:
    environment = os.environ.copy()
    environment["ATOMIC_RELEASE_LOCK_HELD"] = "1"
    child: Optional[subprocess.Popen[bytes]] = None
    pending_signals: list[int] = []

    def forward_signal(signum: int, _frame: object) -> None:
        if child is None:
            pending_signals.append(signum)
        elif child.poll() is None:
            try:
                os.killpg(child.pid, signum)
            except ProcessLookupError:
                pass

    previous_handlers = {
        signal_number: signal.signal(signal_number, forward_signal)
        for signal_number in (signal.SIGHUP, signal.SIGINT, signal.SIGTERM)
    }
    try:
        wait_for_test_gate("ATOMIC_RELEASE_TEST_SIGNAL_GATE")
        child = subprocess.Popen(
            ["bash", controller, *arguments],
            close_fds=True,
            env=environment,
            start_new_session=True,
        )
        for pending_signal in pending_signals:
            forward_signal(pending_signal, None)
        return_code = child.wait()
    finally:
        for signal_number, previous_handler in previous_handlers.items():
            signal.signal(signal_number, previous_handler)
    return return_code if return_code >= 0 else 128 - return_code


def main() -> int:
    if len(sys.argv) < 5:
        fail("lock helper requires APP_ROOT, timeout, controller, and controller arguments")
    app_root, timeout_text, controller, *controller_arguments = sys.argv[1:]
    try:
        timeout = int(timeout_text)
    except ValueError:
        fail("lock timeout must be an integer")
    if timeout < 1 or timeout > 120:
        fail("lock timeout must be between 1 and 120 seconds")

    root_fd, root_stat = checked_root(app_root)
    lock_fd = -1
    lock_path = os.path.join(app_root, ".deploy.lock")
    try:
        deadline = time.monotonic() + timeout
        # The directory lock is the canonical race-free lock. The regular-file
        # lock preserves coordination with deployments using the previous scheme.
        acquire(root_fd, deadline, lock_path)
        wait_for_test_gate("ATOMIC_RELEASE_TEST_LOCK_GATE")
        lock_fd = checked_lock(root_fd, root_stat)
        acquire(lock_fd, deadline, lock_path)
        verify_lock_identity(root_fd, lock_fd)
        return run_controller(controller, controller_arguments)
    finally:
        if lock_fd >= 0:
            os.close(lock_fd)
        os.close(root_fd)


if __name__ == "__main__":
    raise SystemExit(main())
