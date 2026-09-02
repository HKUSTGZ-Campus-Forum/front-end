import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  agentErrorI18nKey,
  canSendAgentMessage,
} from "../../utils/agentChat";


describe("forum assistant UI helpers", () => {
  it("maps backend errors to stable localized messages", () => {
    expect(agentErrorI18nKey("agent_unavailable")).toBe(
      "assistant.errors.unavailable"
    );
    expect(agentErrorI18nKey("rate_limited")).toBe(
      "assistant.errors.rateLimited"
    );
    expect(agentErrorI18nKey("unknown")).toBe("assistant.errors.generic");
  });

  it("only enables send for a non-empty ready request", () => {
    expect(canSendAgentMessage(" question ", false, true)).toBe(true);
    expect(canSendAgentMessage("   ", false, true)).toBe(false);
    expect(canSendAgentMessage("question", true, true)).toBe(false);
    expect(canSendAgentMessage("question", false, false)).toBe(false);
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
    expect(component).toContain("openConversation");
    expect(component).toContain("openHistory");
    expect(component).toContain("defineExpose");
    expect(composable).toContain("/api/agent/chat");
    expect(app).toContain("@assistant-message");
    expect(app).toContain("@open-chat-history");
    expect(`${component}${composable}`).not.toMatch(/AGENT_API_KEY|SUB2API_KEY/);
  });
});
