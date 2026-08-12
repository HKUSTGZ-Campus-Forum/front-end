import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const workflow = readFileSync(resolve(root, ".github/workflows/deploy.yml"), "utf8");
const controllerPath = resolve(root, "deploy/atomic-release.sh");
const controller = readFileSync(controllerPath, "utf8");
const pm2Config = readFileSync(resolve(root, "deploy/ecosystem.dev.config.cjs"), "utf8");
const knownHostsPath = resolve(root, "deploy/ssh_known_hosts");

describe("atomic frontend deployment", () => {
  it("keeps the release controller valid Bash", () => {
    expect(() => execFileSync("bash", ["-n", controllerPath])).not.toThrow();
  });

  it("uploads to a unique staging directory instead of overlaying live output", () => {
    expect(workflow).toContain("RELEASE_ID: ${{ github.sha }}-${{ github.run_id }}-${{ github.run_attempt }}");
    expect(workflow).toContain('remote_staging="/data/dev_unikorn/front-end/.incoming/$RELEASE_ID"');
    expect(workflow).toContain("tar -czf - .output deploy");
    expect(workflow).toContain('tar -xzf - --no-same-owner --no-same-permissions -C "$remote_staging"');
    expect(workflow).toContain("Create release checksum manifest");
    expect(workflow).toContain("bash -n deploy/atomic-release.sh");
  });

  it("uses native OpenSSH with strict pinned host-key verification", () => {
    expect(workflow).not.toContain("appleboy/ssh-action");
    expect(workflow).not.toContain("appleboy/scp-action");
    expect(workflow).not.toContain("drone-ssh");
    expect(workflow).not.toContain("drone-scp");
    expect(workflow).toContain('ssh -F "$ssh_config" unikorn-deploy');
    expect(workflow).toContain("HostKeyAlias unikorn.axfff.com");
    expect(workflow).toContain("StrictHostKeyChecking yes");
    expect(workflow).toContain("IdentitiesOnly yes");

    const fingerprint = execFileSync(
      "ssh-keygen",
      ["-lf", knownHostsPath, "-E", "sha256"],
      { encoding: "utf8" },
    );
    expect(fingerprint).toContain("SHA256:mG33HUMsz+94mAc8vjSe9aIpRoiVhvwiMI9NrC1sgTg");
    expect(fingerprint).toContain("ED25519");
  });

  it("serializes, verifies, atomically activates, and can roll back releases", () => {
    expect(controller).toContain("flock -w 120");
    expect(controller).toContain("sha256sum --check --strict --quiet");
    expect(controller).toContain('node --check "$staging_dir/.output/server/index.mjs"');
    expect(controller).toContain(".release-complete");
    expect(controller).toContain('mv -Tf -- "$next_link" "$current_link"');
    expect(controller).toContain("wait_for_health_version");
    expect(controller).toContain('actual_version" == "$expected_version');
    expect(controller).toContain('pm2 jlist | node -e');
    expect(controller).toContain('"$running_script" != "$expected_script"');
    expect(controller).toContain('pm2 delete "$pm2_app"');
    expect(controller).toContain(
      'pm2 start "$legacy_script" --name "$pm2_app" --cwd "$app_root" --update-env',
    );
    expect(controller).toContain('NUXT_HOST="127.0.0.1"');
    expect(controller).toContain("previous_health_version=$(capture_health_version)");
    expect(controller).toContain('previous_exec_path=$(get_running_script)');
    expect(controller).toContain("rollback \"$previous_target\"");
    expect(controller).toContain("legacy-in-place");
    expect(controller).not.toMatch(/rm -rf[^\n]*(current|\.output)/);
  });

  it("runs the dev process from current on port 3001 and probes that port", () => {
    expect(pm2Config).toContain('path.join(appRoot, "current", ".output/server/index.mjs")');
    expect(pm2Config).toContain('CAMPUS_FRONTEND_PORT || "3001"');
    expect(workflow).toContain('"3001"');
    expect(workflow).not.toContain("127.0.0.1:3000/health");
    expect(workflow).toContain("Verify built readiness endpoint");
    expect(workflow).toContain("http://127.0.0.1:3100/health");
    expect(workflow).toContain('payload.version !== expected');
  });
});
