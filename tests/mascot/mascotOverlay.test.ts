import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const overlay = readFileSync(
  new URL("../../components/mascot/Overlay.client.vue", import.meta.url),
  "utf8"
);

describe("mascot overlay controls", () => {
  it("keeps one persistent toggle available after collapsing", () => {
    expect(overlay).toContain('@click="toggleCollapsed"');
    expect(overlay).toContain("collapsed ? 'lucide:chevron-up'");
    expect(overlay).not.toContain('v-if="collapsed"');
    expect(overlay).not.toContain("mascot-launcher");
  });

  it("clears the speech bubble while collapsing", () => {
    expect(overlay).toContain('v-show="!collapsed" class="mascot-stage"');
    expect(overlay).toMatch(
      /function collapse\(\)[\s\S]*message\.value = "";[\s\S]*clearSpeechTimers\(\)/
    );
  });

  it("shows hover quick actions for model settings and chat history", () => {
    expect(overlay).toContain("mascot-quick-actions");
    expect(overlay).toContain("lucide:settings-2");
    expect(overlay).toContain("lucide:history");
    expect(overlay).toContain('"open-agent-settings"');
    expect(overlay).toContain('"open-chat-history"');
  });

  it("pauses the original rig on collapse and supports assistant state changes", () => {
    expect(overlay).toContain("new YouyouMascotRenderer()");
    expect(overlay).toContain("new L2dMascotRenderer()");
    expect(overlay).toContain("renderer.setPaused?.(true)");
    expect(overlay).toContain("renderer.setPaused?.(false)");
    expect(overlay).toContain("renderer.setActivity?.(value)");
    expect(overlay).toContain('if (value !== "speaking") stopMouthTimers()');
    expect(overlay).toContain('document.removeEventListener("visibilitychange", handleVisibility)');
    const app = readFileSync(new URL("../../app.vue", import.meta.url), "utf8");
    expect(app).toContain('@assistant-state="handleAssistantState"');
    const chat = readFileSync(new URL("../../components/assistant/AgentChat.client.vue", import.meta.url), "utf8");
    expect(chat).toContain('emit("assistant-state", "thinking")');
    expect(chat).toContain('emit("assistant-state", "error")');
  });
});
