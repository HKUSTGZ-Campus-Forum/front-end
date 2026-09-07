const BUILD_VERSION_LITERAL = JSON.stringify("__UNIKORN_BUILD_VERSION__");

/** Replace exactly one JS string literal, not unescaped source text. */
export function embedServiceWorkerBuildVersion(source: string, version: string): string {
  if (!version.trim() || version === "__UNIKORN_BUILD_VERSION__") {
    throw new Error("The service worker requires a non-empty frontend build version.");
  }

  if (source.split(BUILD_VERSION_LITERAL).length !== 2) {
    throw new Error("Expected exactly one service worker build version placeholder.");
  }

  return source.replace(BUILD_VERSION_LITERAL, () => JSON.stringify(version));
}
