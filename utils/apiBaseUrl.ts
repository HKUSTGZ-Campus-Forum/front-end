interface ApiRuntimeConfig {
  apiInternalBaseUrl?: unknown;
  public: {
    apiBaseUrl?: unknown;
  };
}

export function selectApiBaseUrl(
  config: ApiRuntimeConfig,
  isClient: boolean
): string {
  const configuredBaseUrl = isClient
    ? config.public.apiBaseUrl
    : config.apiInternalBaseUrl || config.public.apiBaseUrl;

  return String(configuredBaseUrl || "").replace(/\/$/, "");
}
