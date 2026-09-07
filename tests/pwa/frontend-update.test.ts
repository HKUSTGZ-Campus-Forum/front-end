import { afterEach, describe, expect, it, vi } from "vitest";
import {
  beginFrontendUpdateActivity,
  createFrontendEditGuard,
  createFrontendUpdater,
  FRONTEND_UPDATE_STORAGE_KEY,
  hasActiveFrontendWork,
  parseFrontendVersion,
} from "../../utils/frontendUpdate";

const health = (version = "build-b") => ({ status: "ok", service: "campus-forum-frontend", version });

function storage(initial?: string) {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set(FRONTEND_UPDATE_STORAGE_KEY, initial);
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
  };
}

function setup(overrides: Partial<Parameters<typeof createFrontendUpdater>[0]> = {}) {
  const options = {
    currentVersion: "build-a",
    readVersion: vi.fn().mockResolvedValue(health()),
    canReload: vi.fn(() => true),
    storage: storage(),
    reload: vi.fn(),
    ...overrides,
  };
  return { ...options, updater: createFrontendUpdater(options) };
}

describe("frontend health build identity", () => {
  it("accepts deployment SHAs and explicitly named local builds", () => {
    expect(parseFrontendVersion(health("a".repeat(40)))).toBe("a".repeat(40));
    expect(parseFrontendVersion(health("0.2.1-local_2026"))).toBe("0.2.1-local_2026");
  });

  it.each([
    null, undefined, "build-b", {}, [],
    { ...health(), status: "error" },
    { ...health(), service: "another-service" },
    { ...health(), version: 12 },
    health(""), health(" build-b"), health("build/b"), health("<script>"), health("x".repeat(201)),
  ])("rejects invalid or unrelated health payload %j", payload => {
    expect(parseFrontendVersion(payload)).toBeNull();
  });
});

describe("automatic frontend update decisions", () => {
  it("does nothing when the page already matches the server", async () => {
    const app = setup({ readVersion: vi.fn().mockResolvedValue(health("build-a")) });
    await app.updater.check();
    expect(app.reload).not.toHaveBeenCalled();
    expect(app.storage.setItem).not.toHaveBeenCalled();
  });

  it("automatically reloads a different build exactly once", async () => {
    const app = setup();
    await app.updater.check();
    await app.updater.check();
    expect(app.reload).toHaveBeenCalledOnce();
    expect(app.storage.getItem(FRONTEND_UPDATE_STORAGE_KEY)).toBe('["build-b"]');
    expect(app.readVersion).toHaveBeenCalledOnce();
  });

  it("deduplicates overlapping checks", async () => {
    let resolve!: (payload: unknown) => void;
    const app = setup({ readVersion: vi.fn(() => new Promise(done => { resolve = done; })) });
    const first = app.updater.check();
    await app.updater.check();
    expect(app.readVersion).toHaveBeenCalledOnce();
    resolve(health());
    await first;
    expect(app.reload).toHaveBeenCalledOnce();
  });

  it("rechecks editing state after the asynchronous health request", async () => {
    let resolve!: (payload: unknown) => void;
    let safe = true;
    const app = setup({
      readVersion: vi.fn(() => new Promise(done => { resolve = done; })),
      canReload: () => safe,
    });
    const checking = app.updater.check();
    safe = false;
    resolve(health());
    await checking;
    expect(app.reload).not.toHaveBeenCalled();
    expect(app.storage.setItem).not.toHaveBeenCalled();
    safe = true;
    const next = app.updater.check();
    resolve(health());
    await next;
    expect(app.reload).toHaveBeenCalledOnce();
  });

  it("retries after offline failures or invalid responses without recording a failed attempt", async () => {
    const readVersion = vi.fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ status: "unavailable" })
      .mockResolvedValueOnce(health());
    const app = setup({ readVersion });
    await app.updater.check();
    await app.updater.check();
    expect(app.storage.setItem).not.toHaveBeenCalled();
    await app.updater.check();
    expect(app.reload).toHaveBeenCalledOnce();
  });

  it("retains the attempted-build guard across page/controller recreation", async () => {
    const sharedStorage = storage();
    const beforeReload = setup({ storage: sharedStorage });
    await beforeReload.updater.check();
    const stalePageAfterReload = setup({ storage: sharedStorage });
    await stalePageAfterReload.updater.check();
    expect(stalePageAfterReload.reload).not.toHaveBeenCalled();
    const nextRelease = setup({ storage: sharedStorage, readVersion: vi.fn().mockResolvedValue(health("build-c")) });
    await nextRelease.updater.check();
    expect(nextRelease.reload).toHaveBeenCalledOnce();
  });

  it("handles a server rollback as a distinct target without looping", async () => {
    const sharedStorage = storage('["build-b"]');
    const rollback = setup({ storage: sharedStorage, currentVersion: "build-b", readVersion: vi.fn().mockResolvedValue(health("build-a")) });
    await rollback.updater.check();
    expect(rollback.reload).toHaveBeenCalledOnce();
    const staleRollbackPage = setup({ storage: sharedStorage, currentVersion: "build-b", readVersion: vi.fn().mockResolvedValue(health("build-a")) });
    await staleRollbackPage.updater.check();
    expect(staleRollbackPage.reload).not.toHaveBeenCalled();
  });

  it.each(["not-json", "{}", "null", '["build-old",42]', JSON.stringify(Array.from({ length: 100 }, (_, i) => `old-${i}`))])(
    "fails closed for corrupt or saturated storage %s", async raw => {
      const app = setup({ storage: storage(raw) });
      await app.updater.check();
      expect(app.reload).not.toHaveBeenCalled();
    },
  );

  it.each(["read", "write", "ignored-write"])("fails closed when session storage has a %s failure", async failure => {
    const session = storage();
    if (failure === "read") session.getItem.mockImplementation(() => { throw new Error("SecurityError"); });
    if (failure === "write") session.setItem.mockImplementation(() => { throw new Error("QuotaExceededError"); });
    if (failure === "ignored-write") session.setItem.mockImplementation(() => undefined);
    const app = setup({ storage: session });
    await expect(app.updater.check()).resolves.toBeUndefined();
    expect(app.reload).not.toHaveBeenCalled();
  });
});

describe("mounted editing protection", () => {
  afterEach(() => vi.unstubAllGlobals());

  class Control extends EventTarget {
    isConnected = true;
    editable: Control | null = this;
    closest = vi.fn(() => this.editable);
    getAttribute = vi.fn(() => null as string | null);
  }

  it("retains edits after blur or disabling and releases removed controls", () => {
    vi.stubGlobal("Element", Control);
    const guard = createFrontendEditGuard();
    const control = new Control();
    guard.record(control);
    guard.record(control);
    expect(guard.hasEdits()).toBe(true);
    control.isConnected = false;
    expect(guard.hasEdits()).toBe(false);
  });

  it("does not permanently block updates after using the persistent global search", () => {
    vi.stubGlobal("Element", Control);
    const guard = createFrontendEditGuard();
    const search = new Control();
    search.getAttribute.mockReturnValue("");
    guard.record(search);
    expect(search.getAttribute).toHaveBeenCalledWith("data-auto-update-disposable");
    expect(guard.hasEdits()).toBe(false);
  });

  it("tracks contenteditable descendants and ignores unrelated events", () => {
    vi.stubGlobal("Element", Control);
    const guard = createFrontendEditGuard();
    guard.record(null);
    guard.record(new EventTarget());
    const unrelated = new Control();
    unrelated.editable = null;
    guard.record(unrelated);
    expect(guard.hasEdits()).toBe(false);
    const nested = new Control();
    const editor = new Control();
    nested.editable = editor;
    guard.record(nested);
    nested.isConnected = false;
    expect(guard.hasEdits()).toBe(true);
    editor.isConnected = false;
    expect(guard.hasEdits()).toBe(false);
  });
});

describe("active frontend work protection", () => {
  function doc(overrides: Record<string, unknown> = {}) {
    return {
      querySelector: vi.fn(() => null),
      querySelectorAll: vi.fn(() => []),
      activeElement: null,
      ...overrides,
    } as unknown as Document;
  }

  it("does not block normal browsing merely because blank textareas exist", () => {
    const page = doc({ querySelectorAll: () => [{ tagName: "TEXTAREA", value: "   " }, { tagName: "DIV", textContent: "" }] });
    expect(hasActiveFrontendWork(page)).toBe(false);
  });

  it.each([
    { tagName: "TEXTAREA", value: "unsaved comment" },
    { tagName: "DIV", textContent: "unsaved rich text" },
  ])("protects populated editors, including before any captured edit event", control => {
    expect(hasActiveFrontendWork(doc({ querySelectorAll: () => [control] }))).toBe(true);
  });

  it("protects the actively focused editor even when it is still empty", () => {
    const matches = vi.fn(() => true);
    expect(hasActiveFrontendWork(doc({ activeElement: { matches } }))).toBe(true);
    expect(matches).toHaveBeenCalledWith(expect.stringContaining("textarea"));
  });

  it.each(["#scheduler-planner-workspace", ".teamup-host iframe", "[data-auto-update-blocked]", '[aria-busy="true"]'])(
    "protects explicit workspace or busy marker %s", selector => {
      const querySelector = (query: string) => query.split(", ").includes(selector) ? {} : null;
      expect(hasActiveFrontendWork(doc({ querySelector }))).toBe(true);
    },
  );

  it("protects overlapping operations until every activity releases, with idempotent cleanup", () => {
    const releaseFirst = beginFrontendUpdateActivity();
    const releaseSecond = beginFrontendUpdateActivity();
    try {
      expect(hasActiveFrontendWork(doc())).toBe(true);
      releaseFirst();
      releaseFirst();
      expect(hasActiveFrontendWork(doc())).toBe(true);
      releaseSecond();
      expect(hasActiveFrontendWork(doc())).toBe(false);
    } finally {
      releaseFirst();
      releaseSecond();
    }
  });
});
