import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const health = (version = "build-a") => ({ status: "ok", service: "campus-forum-frontend", version });

class WorkerMock extends EventTarget {
  state = "installing";
  postMessage = vi.fn();
}

class ControlMock extends EventTarget {
  isConnected = true;
  value = "";
  textContent = "";
  tagName = "INPUT";
  type = "text";
  isContentEditable = false;
  closest = vi.fn(() => this);
  matches = vi.fn(() => true);
  getAttribute = vi.fn(() => null);
  getClientRects = () => [{ width: 100, height: 30 }];
}

function eventWithTarget(type: string, target: EventTarget) {
  const event = new Event(type);
  Object.defineProperty(event, "target", { value: target });
  return event;
}

async function flush() {
  for (let i = 0; i < 12; i += 1) await Promise.resolve();
}

async function setup(options: { serviceWorker?: boolean; readyState?: string; waiting?: boolean } = {}) {
  const stored = new Map<string, string>();
  const storage = {
    getItem: vi.fn((key: string) => stored.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { stored.set(key, value); }),
  };
  const windowMock = Object.assign(new EventTarget(), {
    location: { reload: vi.fn() },
    sessionStorage: storage,
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    setInterval: globalThis.setInterval,
    clearInterval: globalThis.clearInterval,
  });
  const documentMock = Object.assign(new EventTarget(), {
    readyState: options.readyState ?? "complete",
    visibilityState: "visible",
    activeElement: null as ControlMock | null,
    querySelector: vi.fn(() => null as ControlMock | null),
    querySelectorAll: vi.fn(() => [] as ControlMock[]),
  });
  const waiting = new WorkerMock();
  const registration = Object.assign(new EventTarget(), {
    waiting: options.waiting ? waiting : null as WorkerMock | null,
    installing: null as WorkerMock | null,
    update: vi.fn().mockResolvedValue(undefined),
  });
  const serviceWorker = Object.assign(new EventTarget(), {
    controller: null as WorkerMock | null,
    register: vi.fn().mockResolvedValue(registration),
  });
  const navigatorMock = options.serviceWorker === false ? { onLine: true } : { onLine: true, serviceWorker };
  const hooks = new Map<string, () => void>();
  const fetchMock = vi.fn().mockImplementation(async () => ({ ok: true, json: async () => health() }));
  vi.stubGlobal("Element", ControlMock);
  vi.stubGlobal("HTMLElement", ControlMock);
  vi.stubGlobal("HTMLInputElement", ControlMock);
  vi.stubGlobal("HTMLTextAreaElement", ControlMock);
  vi.stubGlobal("HTMLSelectElement", ControlMock);
  vi.stubGlobal("window", windowMock);
  vi.stubGlobal("document", documentMock);
  vi.stubGlobal("navigator", navigatorMock);
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("defineNuxtPlugin", (callback: (app: unknown) => unknown) => callback);
  vi.stubGlobal("useRuntimeConfig", () => ({ public: { appBuildVersion: "build-a", appVersion: "0.2.1" } }));
  const { default: plugin } = await import("../../plugins/pwa.client");
  (plugin as unknown as (app: unknown) => void)({ hook: (name: string, callback: () => void) => hooks.set(name, callback) });
  await flush();
  return { window: windowMock, document: documentMock, navigator: navigatorMock, serviceWorker, registration, waiting, fetch: fetchMock, hooks, storage, reload: windowMock.location.reload };
}

describe("automatic PWA update orchestration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-07T00:00:00Z"));
    vi.resetModules();
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("registers one stable uncached worker URL and automatically activates a waiting worker", async () => {
    const app = await setup({ waiting: true });
    expect(app.serviceWorker.register).toHaveBeenCalledExactlyOnceWith("/sw.js", { scope: "/", updateViaCache: "none" });
    expect(app.waiting.postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
    expect(app.fetch).toHaveBeenCalledWith("/health", expect.objectContaining({ cache: "no-store", credentials: "same-origin", signal: expect.any(AbortSignal) }));
    expect(app.reload).not.toHaveBeenCalled();
  });

  it("activates workers discovered later without treating their installation as a page update", async () => {
    const app = await setup();
    const installing = new WorkerMock();
    app.registration.installing = installing;
    app.registration.dispatchEvent(new Event("updatefound"));
    app.registration.waiting = installing;
    installing.state = "installed";
    installing.dispatchEvent(new Event("statechange"));
    expect(installing.postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
    expect(app.reload).not.toHaveBeenCalled();
  });

  it("does not reload on first-install or repeated controllerchange events for the same build", async () => {
    const app = await setup();
    app.serviceWorker.controller = new WorkerMock();
    app.serviceWorker.dispatchEvent(new Event("controllerchange"));
    await vi.advanceTimersByTimeAsync(15_000);
    app.serviceWorker.dispatchEvent(new Event("controllerchange"));
    await flush();
    expect(app.reload).not.toHaveBeenCalled();
  });

  it("detects a new frontend automatically, including without service-worker support", async () => {
    const app = await setup({ serviceWorker: false });
    app.fetch.mockResolvedValue({ ok: true, json: async () => health("build-b") });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(app.reload).toHaveBeenCalledOnce();
    app.window.dispatchEvent(new Event("focus"));
    await vi.advanceTimersByTimeAsync(120_000);
    expect(app.reload).toHaveBeenCalledOnce();
  });

  it("retries bad HTTP/JSON and offline responses on subsequent checks", async () => {
    const app = await setup();
    app.fetch
      .mockResolvedValueOnce({ ok: false, json: async () => health("build-b") })
      .mockResolvedValueOnce({ ok: true, json: async () => { throw new Error("invalid JSON"); } })
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ ok: true, json: async () => health("build-b") });
    await vi.advanceTimersByTimeAsync(180_000);
    expect(app.reload).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(app.reload).toHaveBeenCalledOnce();
  });

  it("checks editing again if input occurs while the health response is pending", async () => {
    const app = await setup();
    let resolve!: (response: unknown) => void;
    app.fetch.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    await vi.advanceTimersByTimeAsync(60_000);
    const input = new ControlMock();
    app.document.dispatchEvent(eventWithTarget("input", input));
    resolve({ ok: true, json: async () => health("build-b") });
    await flush();
    expect(app.reload).not.toHaveBeenCalled();
    input.isConnected = false;
    app.fetch.mockResolvedValue({ ok: true, json: async () => health("build-b") });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(app.reload).toHaveBeenCalledOnce();
  });

  it.each(["change", "drop", "submit"])("protects %s edits until their owner unmounts", async eventType => {
    const app = await setup();
    const owner = new ControlMock();
    app.document.dispatchEvent(eventWithTarget(eventType, owner));
    app.fetch.mockResolvedValue({ ok: true, json: async () => health("build-b") });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(app.reload).not.toHaveBeenCalled();
    owner.isConnected = false;
    await vi.advanceTimersByTimeAsync(60_000);
    expect(app.reload).toHaveBeenCalledOnce();
  });

  it("defers for a workspace marker and updates automatically after leaving it", async () => {
    const app = await setup();
    app.document.querySelector.mockReturnValue(new ControlMock());
    app.fetch.mockResolvedValue({ ok: true, json: async () => health("build-b") });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(app.reload).not.toHaveBeenCalled();
    app.document.querySelector.mockReturnValue(null);
    await vi.advanceTimersByTimeAsync(15_000);
    app.hooks.get("page:finish")!();
    await flush();
    expect(app.reload).toHaveBeenCalledOnce();
  });

  it("does not interrupt an upload whose input has unmounted", async () => {
    const app = await setup();
    const { beginFrontendUpdateActivity } = await import("../../utils/frontendUpdate");
    const release = beginFrontendUpdateActivity();
    try {
      app.fetch.mockResolvedValue({ ok: true, json: async () => health("build-b") });
      await vi.advanceTimersByTimeAsync(60_000);
      expect(app.reload).not.toHaveBeenCalled();
      release();
      await vi.advanceTimersByTimeAsync(60_000);
      expect(app.reload).toHaveBeenCalledOnce();
    } finally {
      release();
    }
  });

  it("aborts a stalled health request and retries later", async () => {
    const app = await setup();
    let pendingSignal: AbortSignal | undefined;
    app.fetch.mockImplementationOnce((_url: string, options: RequestInit) => {
      pendingSignal = options.signal as AbortSignal;
      return new Promise((_resolve, reject) => pendingSignal!.addEventListener("abort", () => reject(new Error("aborted")), { once: true }));
    });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(pendingSignal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(8_000);
    expect(pendingSignal?.aborted).toBe(true);
    expect(app.reload).not.toHaveBeenCalled();
    app.fetch.mockResolvedValue({ ok: true, json: async () => health("build-b") });
    await vi.advanceTimersByTimeAsync(52_000);
    expect(app.reload).toHaveBeenCalledOnce();
  });

  it("throttles rapid focus, visibility and route events into one check", async () => {
    const app = await setup();
    app.window.dispatchEvent(new Event("focus"));
    app.document.dispatchEvent(new Event("visibilitychange"));
    app.hooks.get("page:finish")!();
    await flush();
    expect(app.fetch).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(15_000);
    app.hooks.get("page:finish")!();
    app.window.dispatchEvent(new Event("focus"));
    await flush();
    expect(app.fetch).toHaveBeenCalledTimes(2);
  });

  it("never refreshes a hidden or offline page and checks when it becomes visible/online", async () => {
    const app = await setup();
    app.fetch.mockResolvedValue({ ok: true, json: async () => health("build-b") });
    app.document.visibilityState = "hidden";
    await vi.advanceTimersByTimeAsync(60_000);
    expect(app.fetch).toHaveBeenCalledOnce();
    app.document.visibilityState = "visible";
    app.navigator.onLine = false;
    app.document.dispatchEvent(new Event("visibilitychange"));
    expect(app.fetch).toHaveBeenCalledOnce();
    app.navigator.onLine = true;
    app.window.dispatchEvent(new Event("online"));
    await flush();
    expect(app.reload).toHaveBeenCalledOnce();
  });

  it("fails closed when even reading sessionStorage throws", async () => {
    const app = await setup();
    Object.defineProperty(app.window, "sessionStorage", { get: () => { throw new Error("SecurityError"); } });
    app.fetch.mockResolvedValue({ ok: true, json: async () => health("build-b") });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(app.reload).not.toHaveBeenCalled();
  });

  it("waits for load before registering when the initial document is not ready", async () => {
    const app = await setup({ readyState: "loading" });
    expect(app.serviceWorker.register).not.toHaveBeenCalled();
    app.document.readyState = "complete";
    app.window.dispatchEvent(new Event("load"));
    await flush();
    expect(app.serviceWorker.register).toHaveBeenCalledOnce();
  });

  it("stops checks during pagehide and resumes one timer on BFCache pageshow", async () => {
    const app = await setup();
    app.window.dispatchEvent(new Event("pagehide"));
    await vi.advanceTimersByTimeAsync(120_000);
    expect(app.fetch).toHaveBeenCalledOnce();
    const restored = new Event("pageshow");
    Object.defineProperty(restored, "persisted", { value: true });
    app.window.dispatchEvent(restored);
    await flush();
    const callsAfterRestore = app.fetch.mock.calls.length;
    expect(callsAfterRestore).toBeGreaterThan(1);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(app.fetch).toHaveBeenCalledTimes(callsAfterRestore + 1);
    app.window.dispatchEvent(new Event("pagehide"));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(app.fetch).toHaveBeenCalledTimes(callsAfterRestore + 1);
  });
});
