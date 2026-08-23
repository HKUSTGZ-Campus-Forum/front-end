import { afterEach, describe, expect, it, vi } from "vitest";
import { oidcErrorTranslationKey, safeOidcReturnTo } from "../utils/oidc";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  delete (process as typeof process & { client?: boolean }).client;
});

describe("safeOidcReturnTo", () => {
  it("keeps same-origin application paths", () => {
    expect(safeOidcReturnTo("/courses/planner?semester=2630")).toBe(
      "/courses/planner?semester=2630"
    );
    expect(safeOidcReturnTo("/en/forum")).toBe("/en/forum");
  });

  it("rejects external, protocol-relative, and backslash paths", () => {
    expect(safeOidcReturnTo("https://evil.example", "/en")).toBe("/en");
    expect(safeOidcReturnTo("//evil.example", "/en")).toBe("/en");
    expect(safeOidcReturnTo("/\\evil.example", "/en")).toBe("/en");
  });
});

describe("oidcErrorTranslationKey", () => {
  it("maps known server codes to localized copy", () => {
    expect(oidcErrorTranslationKey("account_conflict")).toBe(
      "auth.login.sso.errors.account_conflict"
    );
  });

  it("does not allow arbitrary translation-key injection", () => {
    expect(oidcErrorTranslationKey("unknown.provider.detail")).toBe(
      "auth.login.sso.errors.authorization_failed"
    );
  });
});

describe("OIDC logout", () => {
  it.each([
    ["/forum", "/"],
    ["/en/forum", "/en"],
  ])(
    "returns %s to the localized UniKorn home without visiting the provider",
    async (pathname, expectedHome) => {
      Object.defineProperty(process, "client", {
        configurable: true,
        value: true,
      });

      const storage = new Map<string, string>();
      const removeItem = vi.fn((key: string) => storage.delete(key));
      const providerAssign = vi.fn();
      const navigateTo = vi.fn();
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: "access-token",
            refresh_token: "refresh-token",
            user: { id: "1", username: "student", isFirstLogin: false },
            return_to: "/",
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            oidc_logout_url:
              "https://sso.hkust-gz.edu.cn/connect/endsession?logout=test",
          }),
        });

      vi.stubGlobal("localStorage", {
        getItem: vi.fn((key: string) => storage.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
        removeItem,
      });
      vi.stubGlobal("window", {
        location: {
          origin: "https://unikorn.hkust-gz.edu.cn",
          pathname,
          assign: providerAssign,
        },
      });
      vi.stubGlobal("useRuntimeConfig", () => ({
        public: { apiBaseUrl: "" },
      }));
      vi.stubGlobal("navigateTo", navigateTo);
      vi.stubGlobal("fetch", fetchMock);

      const { useAuth } = await import("../composables/useAuth");
      const auth = useAuth();
      await auth.exchangeOidcCode("one-time-ticket");
      await auth.logout();

      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        "/api/auth/logout",
        expect.objectContaining({
          method: "POST",
          credentials: "include",
        }),
      );
      expect(removeItem).toHaveBeenCalledWith("auth_token");
      expect(removeItem).toHaveBeenCalledWith("refresh_token");
      expect(removeItem).toHaveBeenCalledWith("user_info");
      expect(auth.user.value).toBeNull();
      expect(auth.accessToken.value).toBeNull();
      expect(auth.refreshToken.value).toBeNull();
      expect(providerAssign).not.toHaveBeenCalled();
      expect(navigateTo).toHaveBeenCalledOnce();
      expect(navigateTo).toHaveBeenCalledWith(expectedHome);
    },
  );
});
