import { afterEach, describe, expect, it, vi } from "vitest";

describe("frontend health endpoint", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("returns the build version and disables caching", async () => {
    const setResponseHeader = vi.fn();

    vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
    vi.stubGlobal("useRuntimeConfig", () => ({
      public: { appBuildVersion: "test-build" },
    }));
    vi.stubGlobal("setResponseHeader", setResponseHeader);

    const { default: healthHandler } = await import(
      "../../server/routes/health.get"
    );
    const event = {};

    expect(healthHandler(event as never)).toEqual({
      status: "ok",
      service: "campus-forum-frontend",
      version: "test-build",
    });
    expect(setResponseHeader).toHaveBeenCalledWith(
      event,
      "Cache-Control",
      "no-store",
    );
  });
});
