import { describe, expect, it } from "vitest";
import { selectApiBaseUrl } from "../utils/apiBaseUrl";

describe("selectApiBaseUrl", () => {
  const config = {
    apiInternalBaseUrl: "http://edge:8080/",
    public: {
      apiBaseUrl: "https://forum.example.edu/",
    },
  };

  it("uses the private internal base during SSR", () => {
    expect(selectApiBaseUrl(config, false)).toBe("http://edge:8080");
  });

  it("keeps browser requests on the public base", () => {
    expect(selectApiBaseUrl(config, true)).toBe("https://forum.example.edu");
  });

  it("falls back to the public base when no internal base is configured", () => {
    expect(
      selectApiBaseUrl(
        {
          apiInternalBaseUrl: "",
          public: config.public,
        },
        false
      )
    ).toBe("https://forum.example.edu");
  });

  it("supports a same-origin browser deployment with no public host baked in", () => {
    expect(
      selectApiBaseUrl(
        {
          apiInternalBaseUrl: "http://edge:8080/",
          public: { apiBaseUrl: "" },
        },
        true
      )
    ).toBe("");
  });
});
