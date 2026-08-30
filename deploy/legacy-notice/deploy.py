"""One-time, content-only update of the retired axfff migration notice."""
import base64
import fcntl
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time
from urllib.request import urlopen


ROOT = Path('/data/prod_unikorn/front-end')
PREVIOUS = ROOT / 'releases/legacy-notice-20260823T162500Z'
RELEASE = ROOT / 'releases/legacy-notice-20260830T182300Z'
CURRENT = ROOT / 'current'
HTML = Path('.output/server/nginx/old-site-notice.html')
SERVER = Path('.output/server/index.mjs')
BEFORE = 'd43bb0e4738291b52973f1130e2ac8c0b5b888781808595901f335f8c3de3120'
AFTER = '00044c40e9efc4fde21d39c5ec6f7b517f97dee2f1aec0fe58ff346a957499d9'


def digest(content):
    return hashlib.sha256(content).hexdigest()


def pm2(arguments):
    # Arguments are fixed in this file; never print the PM2 environment.
    result = subprocess.run(['bash', '-lc', 'pm2 ' + arguments],
                            capture_output=True, text=True, timeout=60)
    if result.returncode:
        raise RuntimeError('PM2 operation failed: ' + arguments)
    return result.stdout


def verify(expected):
    for attempt in range(15):
        try:
            for _ in range(6):
                with urlopen('http://127.0.0.1:3000/', timeout=5) as response:
                    assert response.status == 200
                    assert digest(response.read()) == expected
                    assert response.headers['Refresh'] == '10; url=https://unikorn.hkust-gz.edu.cn/'
            return
        except Exception:
            if attempt == 14:
                raise
            time.sleep(1)


def switch(target):
    temporary = ROOT / ('.legacy-notice-current-' + str(os.getpid()))
    temporary.symlink_to(target)
    os.replace(temporary, CURRENT)


deployment_lock = (ROOT / '.deploy.lock').open('a')
fcntl.flock(deployment_lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
payload = base64.b64decode(sys.argv[1], validate=True)
assert digest(payload) == AFTER, 'Unexpected candidate content'
assert CURRENT.is_symlink(), 'Current release must be a symlink'
active = CURRENT.resolve()
assert active in (PREVIOUS, RELEASE), 'Unexpected active release; stop for review'
processes = json.loads(pm2('jlist'))
targets = [p for p in processes if p['name'] == 'prod-unikorn-frontend']
assert len(targets) == 2, 'Unexpected legacy notice worker count'
for process in targets:
    env = process['pm2_env']
    assert env['pm_exec_path'] == str(CURRENT / SERVER)
    assert env['status'] == 'online'
    assert not env.get('LEGACY_NOTICE_HTML_PATH'), 'Unexpected HTML path override'
assert digest((PREVIOUS / HTML).read_bytes()) == BEFORE, 'Original notice has changed'
if active == RELEASE:
    verify(AFTER)
    print('Already deployed and verified:', RELEASE)
    sys.exit(0)

verify(BEFORE)
assert not RELEASE.exists(), 'Candidate release already exists; stop for review'
(RELEASE / HTML.parent).mkdir(parents=True, mode=0o755)
shutil.copy2(PREVIOUS / SERVER, RELEASE / SERVER)
(RELEASE / HTML).write_bytes(payload)
(RELEASE / HTML).chmod(0o644)
(RELEASE / '.legacy-notice-rollback').write_text('previous_release=' + str(PREVIOUS) + '\n')
subprocess.run(['node', '--check', str(RELEASE / SERVER)], check=True)
print('Rollback release preserved:', PREVIOUS, flush=True)
try:
    switch(RELEASE)
    pm2('reload prod-unikorn-frontend')
    verify(AFTER)
    after_processes = json.loads(pm2('jlist'))
    for previous in processes:
        if previous['name'] == 'prod-unikorn-frontend':
            continue
        current = next(p for p in after_processes if p['pm_id'] == previous['pm_id'])
        assert current['pid'] == previous['pid'], 'Unrelated process changed'
    print('Deployed and verified:', RELEASE, 'sha256:', AFTER, flush=True)
except Exception:
    switch(PREVIOUS)
    pm2('reload prod-unikorn-frontend')
    verify(BEFORE)
    print('Restored original notice after failure', flush=True)
    raise
