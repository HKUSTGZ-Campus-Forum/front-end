import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  emptyAgentProviderSettings,
  agentErrorI18nKey,
  canSendAgentMessage,
  isAgentProviderReady,
  normalizeAgentProviderSettings,
  toAgentProviderPayload,
} from "../../utils/agentChat";


describe("forum assistant UI helpers", () => {
  it("maps backend errors to stable localized messages", () => {
    expect(agentErrorI18nKey("agent_unavailable")).toBe(
      "assistant.errors.unavailable"
    );
    expect(agentErrorI18nKey("rate_limited")).toBe(
      "assistant.errors.rateLimited"
    );
    expect(agentErrorI18nKey("invalid_provider")).toBe(
      "assistant.errors.invalidProvider"
    );
    expect(agentErrorI18nKey("login_required")).toBe(
      "assistant.errors.loginRequired"
    );
    expect(agentErrorI18nKey("unknown")).toBe("assistant.errors.generic");
  });

  it("only enables send for a non-empty ready request", () => {
    expect(canSendAgentMessage(" question ", false, true)).toBe(true);
    expect(canSendAgentMessage("   ", false, true)).toBe(false);
    expect(canSendAgentMessage("question", true, true)).toBe(false);
    expect(canSendAgentMessage("question", false, false)).toBe(false);
  });

  it("normalizes and validates bring-your-own model settings", () => {
    expect(emptyAgentProviderSettings()).toEqual({
      enabled: false,
      baseUrl: "",
      apiKey: "",
      model: "",
    });
    const settings = normalizeAgentProviderSettings({
      enabled: true,
      baseUrl: " https://llm.example/v1/ ",
      apiKey: " test-key ",
      model: " qwen-plus ",
    });

    expect(settings).toEqual({
      enabled: true,
      baseUrl: "https://llm.example/v1",
      apiKey: "test-key",
      model: "qwen-plus",
    });
    expect(isAgentProviderReady(settings)).toBe(true);
    expect(toAgentProviderPayload(settings)).toEqual({
      base_url: "https://llm.example/v1",
      api_key: "test-key",
      model: "qwen-plus",
    });
    expect(
      isAgentProviderReady({ ...settings, baseUrl: "ftp://llm.example/v1" })
    ).toBe(false);
  });

  it("keeps provider credentials out of the global client", () => {
    const component = readFileSync(
      new URL("../../components/assistant/AgentChat.client.vue", import.meta.url),
      "utf8"
    );
    const composable = readFileSync(
      new URL("../../composables/useAgentChat.ts", import.meta.url),
      "utf8"
    );
    const app = readFileSync(new URL("../../app.vue", import.meta.url), "utf8");

    expect(component).toContain("lucide:history");
    expect(component).toContain("lucide:settings-2");
    expect(component).toContain("openSettings");
    expect(component).toContain("!authInitialized && view !== 'settings'");
    expect(component).toContain("!isLoggedIn && view !== 'settings' && !customProviderReady");
    expect(component).toContain("historyLoginRequired");
    expect(component).toContain("providerDraft");
    expect(component).toContain("currentContextMessages");
    expect(component).toContain("openConversation");
    expect(component).toContain("openHistory");
    expect(component).toContain("defineExpose");
    expect(composable).toContain("fetchPublic");
    expect(composable).toContain("/api/agent/chat");
    expect(composable).toContain("provider?: AgentProviderPayload");
    expect(composable).toContain("context_messages");
    expect(app).toContain("@assistant-message");
    expect(app).toContain("@open-agent-settings");
    expect(app).toContain("@open-chat-history");
    expect(`${component}${composable}`).not.toMatch(/AGENT_API_KEY|SUB2API_KEY/);
  });
});
