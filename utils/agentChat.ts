export function agentErrorI18nKey(code: string | undefined): string {
  switch (code) {
    case "agent_unavailable":
      return "assistant.errors.unavailable";
    case "agent_request_failed":
      return "assistant.errors.requestFailed";
    case "invalid_provider":
      return "assistant.errors.invalidProvider";
    case "provider_private_url":
      return "assistant.errors.privateProvider";
    case "agent_client_provider_disabled":
      return "assistant.errors.providerDisabled";
    case "message_too_long":
      return "assistant.errors.tooLong";
    case "rate_limited":
      return "assistant.errors.rateLimited";
    case "conversation_not_found":
      return "assistant.errors.notFound";
    case "login_required":
      return "assistant.errors.loginRequired";
    default:
      return "assistant.errors.generic";
  }
}

export function canSendAgentMessage(
  draft: string,
  sending: boolean,
  available: boolean
): boolean {
  return available && !sending && draft.trim().length > 0;
}

export const AGENT_PROVIDER_STORAGE_KEY = "unikorn_agent_provider_config";

export interface AgentProviderSettings {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  model: string;
}

export function emptyAgentProviderSettings(): AgentProviderSettings {
  return {
    enabled: false,
    baseUrl: "",
    apiKey: "",
    model: "",
  };
}

export function normalizeAgentProviderSettings(
  value: Partial<AgentProviderSettings> | null | undefined
): AgentProviderSettings {
  return {
    enabled: Boolean(value?.enabled),
    baseUrl: String(value?.baseUrl || "").trim().replace(/\/+$/, ""),
    apiKey: String(value?.apiKey || "").trim(),
    model: String(value?.model || "").trim(),
  };
}

export function isAgentProviderBaseUrlCandidate(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return (
      (parsed.protocol === "https:" || parsed.protocol === "http:") &&
      Boolean(parsed.host) &&
      !parsed.username &&
      !parsed.password
    );
  } catch {
    return false;
  }
}

export function isAgentProviderReady(
  settings: AgentProviderSettings
): boolean {
  const normalized = normalizeAgentProviderSettings(settings);
  return (
    normalized.enabled &&
    isAgentProviderBaseUrlCandidate(normalized.baseUrl) &&
    normalized.apiKey.length > 0 &&
    normalized.model.length > 0
  );
}

export function toAgentProviderPayload(settings: AgentProviderSettings):
  | { base_url: string; api_key: string; model: string }
  | null {
  const normalized = normalizeAgentProviderSettings(settings);
  if (!isAgentProviderReady(normalized)) return null;
  return {
    base_url: normalized.baseUrl,
    api_key: normalized.apiKey,
    model: normalized.model,
  };
}
