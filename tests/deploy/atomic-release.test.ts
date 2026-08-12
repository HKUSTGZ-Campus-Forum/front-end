import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const workflow = readFileSync(resolve(root, ".github/workflows/deploy.yml"), "utf8");
const controllerPath = resolve(root, "deploy/atomic-release.sh");
const controller = readFileSync(controllerPath, "utf8");
const pm2Config = readFileSync(resolve(root, "deploy/ecosystem.dev.config.cjs"), "utf8");

describe("atomic frontend deployment", () => {
  it("keeps the release controller valid Bash", () => {
    expect(() => execFileSync("bash", ["-n", controllerPath])).not.toThrow();
  });

  it("uploads to a unique staging directory instead of overlaying live output", () => {
    expect(workflow).toContain(".incoming/${{ github.sha }}-${{ github.run_id }}-${{ github.run_attempt }}");
    expect(workflow).toContain('source: ".output/,deploy/"');
    expect(workflow).not.toContain('target: "/data/dev_unikorn/front-end/"');
    expect(workflow).toContain("Create release checksum manifest");
    expect(workflow).toContain("bash -n deploy/atomic-release.sh");
  });

  it("serializes, verifies, atomically activates, and can roll back releases", () => {
    expect(controller).toContain("flock -w 120");
    expect(controller).toContain("sha256sum --check --strict --quiet");
    expect(controller).toContain('node --check "$staging_dir/.output/server/index.mjs"');
    expect(controller).toContain(".release-complete");
    expect(controller).toContain('mv -Tf -- "$next_link" "$current_link"');
    expect(controller).toContain("wait_for_expected_health");
    expect(controller).toContain("payload.version !== expected");
    expect(controller).toContain("rollback \"$previous_target\"");
    expect(controller).toContain("legacy-in-place");
    expect(controller).not.toMatch(/rm -rf[^\n]*(current|\.output)/);
  });

  it("runs the dev process from current on port 3001 and probes that port", () => {
    expect(pm2Config).toContain('path.join(appRoot, "current")');
    expect(pm2Config).toContain('CAMPUS_FRONTEND_PORT || "3001"');
    expect(workflow).toContain('"3001"');
    expect(workflow).not.toContain("127.0.0.1:3000/health");
  });
});
