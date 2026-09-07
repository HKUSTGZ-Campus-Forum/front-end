import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import { embedServiceWorkerBuildVersion } from "../../utils/serviceWorkerBuild";

const source = readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8");

function createWorker(scriptUrl = "https://unikorn.test/sw.js?v=stale-tab") {
  const listeners = new Map<string, (event: any) => void>();
  const postMessage = vi.fn();
  const cache = {
    addAll: vi.fn().mockResolvedValue(undefined),
    match: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined),
  };
  const caches = {
    open: vi.fn().mockResolvedValue(cache),
    keys: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(true),
  };
  const clients = {
    matchAll: vi.fn().mockResolvedValue([{ postMessage }]),
    claim: vi.fn().mockResolvedValue(undefined),
  };
  const skipWaiting = vi.fn().mockResolvedValue(undefined);
  const fetch = vi.fn().mockResolvedValue(new Response("ok"));
  runInNewContext(embedServiceWorkerBuildVersion(source, "test"), {
    self: {
      location: new URL(scriptUrl),
      addEventListener: (type: string, callback: (event: any) => void) => listeners.set(type, callback),
      clients,
      skipWaiting,
      navigator: {},
    },
    clients,
    caches,
    fetch,
    URL,
    Response,
    console,
  });

  async function dispatch(type: string, data: Record<string, unknown> = {}) {
    const pending: Promise<unknown>[] = [];
    let response: Promise<Response> | undefined;
    listeners.get(type)!({
      ...data,
      waitUntil: (promise: Promise<unknown>) => pending.push(promise),
      respondWith: (promise: Promise<Response>) => { response = promise; },
    });
    await Promise.all(pending);
    return response ? await response : undefined;
  }

  return { dispatch, cache, caches, clients, postMessage, skipWaiting, fetch };
}

describe("versioned service worker lifecycle", () => {
  it("precaches the embedded build, ignoring old page query versions", async () => {
    const worker = createWorker();
    await worker.dispatch("install");
    expect(worker.caches.open).toHaveBeenCalledWith("unikorn-static-test");
    expect(worker.cache.addAll).toHaveBeenCalledOnce();
    expect(worker.postMessage).not.toHaveBeenCalled();
    expect(worker.skipWaiting).toHaveBeenCalledOnce();
  });

  it("does not activate an update when precaching fails", async () => {
    const worker = createWorker();
    worker.cache.addAll.mockRejectedValueOnce(new Error("offline"));
    await expect(worker.dispatch("install")).rejects.toThrow("offline");
    expect(worker.postMessage).not.toHaveBeenCalled();
    expect(worker.skipWaiting).not.toHaveBeenCalled();
  });

  it("automatically migrates old clients only after precaching finishes", async () => {
    const worker = createWorker();
    let finishPrecaching!: () => void;
    let startPrecaching!: () => void;
    const started = new Promise<void>((resolve) => { startPrecaching = resolve; });
    const precaching = new Promise<void>((resolve) => {
      finishPrecaching = resolve;
    });
    worker.cache.addAll.mockImplementationOnce(() => {
      startPrecaching();
      return precaching;
    });
    const installing = worker.dispatch("install");
    await started;
    expect(worker.skipWaiting).not.toHaveBeenCalled();
    finishPrecaching();
    await installing;
    expect(worker.skipWaiting).toHaveBeenCalledOnce();
  });

  it("only removes this app's obsolete caches, using exact names", async () => {
    const worker = createWorker();
    worker.caches.keys.mockResolvedValue([
      "unikorn-static-test", "unikorn-api-test",
      "unikorn-static-oldtest", "unikorn-api-other", "another-app-cache",
    ]);
    await worker.dispatch("activate");
    expect(worker.caches.delete.mock.calls.map(([name]) => name))
      .toEqual(["unikorn-static-oldtest", "unikorn-api-other"]);
    expect(worker.clients.claim).toHaveBeenCalledOnce();
    expect(worker.postMessage).toHaveBeenCalledWith({ type: "SW_ACTIVATED", version: "test" });
  });

  it("still supports explicit activation requests from existing clients", async () => {
    const worker = createWorker();
    await worker.dispatch("message", { data: { type: "SKIP_WAITING" } });
    expect(worker.skipWaiting).toHaveBeenCalledOnce();
  });

});

describe("service worker fetch boundaries", () => {
  it.each([
    ["/health", "GET", {}],
    ["/sw.js", "GET", {}],
    ["/_nuxt/current.js", "GET", {}],
    ["/api/courses", "POST", {}],
    ["/api/courses", "GET", { range: "bytes=0-10" }],
    ["https://external.test/image.png", "GET", {}],
  ] as const)("does not intercept %s %s", async (path, method, headers) => {
    const worker = createWorker();
    const request = new Request(new URL(path, "https://unikorn.test"), { method, headers });
    await expect(worker.dispatch("fetch", { request })).resolves.toBeUndefined();
    expect(worker.fetch).not.toHaveBeenCalled();
    expect(worker.caches.open).not.toHaveBeenCalled();
  });

  it.each(["private, max-age=60", "no-store", "private, no-store"])("does not cache %s API responses", async (cacheControl) => {
    const worker = createWorker();
    worker.fetch.mockResolvedValueOnce(new Response("private", { headers: { "Cache-Control": cacheControl } }));
    const response = await worker.dispatch("fetch", { request: new Request("https://unikorn.test/api/courses") });
    expect(await response!.text()).toBe("private");
    expect(worker.cache.put).not.toHaveBeenCalled();
  });

  it("keeps public API network-first caching and offline fallback", async () => {
    const worker = createWorker();
    const request = new Request("https://unikorn.test/api/courses");
    await worker.dispatch("fetch", { request });
    expect(worker.caches.open).toHaveBeenCalledWith("unikorn-api-test");
    expect(worker.cache.put).toHaveBeenCalledOnce();
    worker.fetch.mockRejectedValueOnce(new Error("offline"));
    worker.cache.match.mockResolvedValueOnce(new Response("cached"));
    const response = await worker.dispatch("fetch", { request });
    expect(await response!.text()).toBe("cached");
  });

  it("keeps navigations network-first without storing HTML", async () => {
    const worker = createWorker();
    const request = {
      method: "GET", headers: new Headers(), mode: "navigate", url: "https://unikorn.test/forum",
    };
    const response = await worker.dispatch("fetch", { request });
    expect(await response!.text()).toBe("ok");
    expect(worker.caches.open).not.toHaveBeenCalled();
    worker.fetch.mockRejectedValueOnce(new Error("offline"));
    worker.cache.match.mockResolvedValueOnce(new Response("offline page"));
    const offline = await worker.dispatch("fetch", { request });
    expect(await offline!.text()).toBe("offline page");
    expect(worker.cache.match).toHaveBeenCalledWith("/offline.html");
    expect(worker.cache.put).not.toHaveBeenCalled();
  });
});
