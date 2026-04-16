const ensureLeadingSlash = (value = "/") => {
  if (!value) return "/";
  return value.startsWith("/") ? value : `/${value}`;
};

const ensureTrailingSlash = (value = "/") => {
  const normalized = ensureLeadingSlash(value);
  return normalized.endsWith("/") ? normalized : `${normalized}/`;
};

const joinURL = (...parts) => {
  const filtered = parts.filter(Boolean);
  if (filtered.length === 0) return "/";

  const [first, ...rest] = filtered;
  let result = ensureLeadingSlash(first);

  for (const part of rest) {
    result = `${result.replace(/\/+$/, "")}/${String(part).replace(/^\/+/, "")}`;
  }

  return result;
};

export function baseURL() {
  return ensureTrailingSlash(process.env.NUXT_APP_BASE_URL || "/");
}

export function buildAssetsDir() {
  return ensureTrailingSlash(process.env.NUXT_APP_BUILD_ASSETS_DIR || "/_nuxt/");
}

export function publicAssetsURL(...path) {
  return path.length ? joinURL(baseURL(), ...path) : baseURL();
}

export function buildAssetsURL(...path) {
  return joinURL(baseURL(), buildAssetsDir(), ...path);
}
