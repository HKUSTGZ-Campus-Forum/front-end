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
});
