import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const workflow = readFileSync(resolve(root, ".github/workflows/deploy.yml"), "utf8");
const productionWorkflow = readFileSync(
  resolve(root, ".github/workflows/deploy-frontend-prod.yml"),
  "utf8",
);
const controllerPath = resolve(root, "deploy/atomic-release.sh");
const controller = readFileSync(controllerPath, "utf8");
const lockHelperPath = resolve(root, "deploy/atomic-release-lock.py");
const lockHelper = readFileSync(lockHelperPath, "utf8");
const pm2Config = readFileSync(resolve(root, "deploy/ecosystem.dev.config.cjs"), "utf8");
const productionPm2Config = readFileSync(
  resolve(root, "deploy/ecosystem.prod.config.cjs"),
  "utf8",
);
const knownHostsPath = resolve(root, "deploy/ssh_known_hosts");

describe("atomic frontend deployment", () => {
  it("keeps the release controller valid Bash", () => {
    expect(() => execFileSync("bash", ["-n", controllerPath])).not.toThrow();
    expect(() =>
      execFileSync("python3", [
        "-c",
        "import ast, pathlib, sys; ast.parse(pathlib.Path(sys.argv[1]).read_text())",
        lockHelperPath,
      ]),
    ).not.toThrow();
  });

  it("uploads to a unique staging directory instead of overlaying live output", () => {
    expect(workflow).toContain("RELEASE_ID: ${{ github.sha }}-${{ github.run_id }}-${{ github.run_attempt }}");
    expect(workflow).toContain('remote_staging="/data/dev_unikorn/front-end/.incoming/$RELEASE_ID"');
    expect(workflow).toContain("tar -czf - .output deploy");
    expect(workflow).toContain('tar -xzf - --no-same-owner --no-same-permissions -C "$remote_staging"');
    expect(workflow).toContain("Create release checksum manifest");
    expect(workflow).toContain("bash -n deploy/atomic-release.sh");
    expect(workflow).toContain("find .output deploy -type f");
    expect(workflow).toContain("deploy/release.sha256");
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
    expect(controller).toContain('exec python3 "$lock_helper"');
    expect(controller).toContain("sha256sum --check --strict --quiet");
    expect(controller).toContain('node --check "$staging_dir/.output/server/index.mjs"');
    expect(controller).toContain(".release-complete");
    expect(controller).toContain('mv -Tf -- "$next_link" "$current_link"');
    expect(controller).toContain("wait_for_health_version");
    expect(controller).toContain('actual_version" == "$expected_version');
    expect(controller).toContain('pm2 jlist | node -e');
    expect(controller).toContain('"$running_script" != "$expected_script"');
    expect(controller).toContain('pm2 delete "$pm2_app"');
    expect(controller).toContain('legacy_frozen_config="$releases_root/legacy-ecosystem.config.cjs"');
    expect(controller).toContain('start_known_config "$legacy_frozen_config" "legacy"');
    expect(controller).toContain('previous_config_path="$app_root/$previous_target/$pm2_config_relative"');
    expect(controller).toContain("CAMPUS_FRONTEND_RELEASE_SHA");
    expect(controller).toContain("wait_for_running_release");
    expect(controller).toContain("trap handle_exit EXIT");
    expect(controller).toContain('previous_exec_path=$(get_running_script)');
    expect(controller).toContain('legacy release root is not healthy before deployment');
    expect(controller).toContain('[[ "$previous_exec_path" == "$legacy_script" ]]');
    expect(controller).toContain("wait_for_root");
    expect(controller).toContain("wait_for_public_acceptance");
    expect(controller).toContain("rollback \"$previous_target\"");
    expect(controller).toContain("legacy-in-place");
    expect(controller).not.toMatch(/rm -rf[^\n]*(current|\.output)/);
  });

  it("deploys production through the same immutable controller and production topology", () => {
    expect(productionWorkflow).toContain("if: github.ref == 'refs/heads/production'");
    expect(productionWorkflow).toContain("Verify built readiness endpoint");
    expect(productionWorkflow).toContain("payload.version !== expected");
    expect(productionWorkflow).toContain("Create release checksum manifest");
    expect(productionWorkflow).toContain("PROD_SSH_HOST");
    expect(productionWorkflow).toContain("PROD_SSH_USER");
    expect(productionWorkflow).toContain("PROD_SSH_KEY");
    expect(productionWorkflow).toContain("StrictHostKeyChecking yes");
    expect(productionWorkflow).toContain("HostKeyAlias unikorn.axfff.com");
    expect(productionWorkflow).toContain(
      'remote_staging="/data/prod_unikorn/front-end/.incoming/$RELEASE_ID"',
    );
    expect(productionWorkflow).toContain('[[ -d "$incoming_root" && ! -L "$incoming_root" ]]');
    expect(productionWorkflow).toContain('[[ $(dirname -- "$staging_dir") == "$incoming_root" ]]');
    expect(productionWorkflow).toContain('mkdir -- "$staging_dir"');
    expect(productionWorkflow).not.toContain('mkdir -p -- "$staging_dir"');
    expect(productionWorkflow).toContain('"prod-unikorn-frontend"');
    expect(productionWorkflow).toContain('"3000"');
    expect(productionWorkflow).toContain('"deploy/ecosystem.prod.config.cjs"');
    expect(productionWorkflow).toContain("Confirm public production from external runner");
    expect(productionWorkflow).toContain(
      'export DEPLOY_PUBLIC_HEALTH_URL="https://unikorn.axfff.com/health"',
    );
    expect(productionWorkflow).toContain(
      'export DEPLOY_PUBLIC_ROOT_URL="https://unikorn.axfff.com/"',
    );
    expect(productionWorkflow).toContain(
      'export DEPLOY_PUBLIC_PLANNER_URL="https://unikorn.axfff.com/courses/planner"',
    );
    expect(productionWorkflow).toContain('health_url="https://unikorn.axfff.com/health"');
    expect(productionWorkflow).toContain('root_url="https://unikorn.axfff.com/"');
    expect(productionWorkflow).toContain(
      'planner_url="https://unikorn.axfff.com/courses/planner"',
    );
    expect(productionWorkflow).toContain('payload.version !== expected');
    expect(productionWorkflow).not.toContain("appleboy/");
    expect(productionWorkflow).not.toMatch(/mv \/data\/prod_unikorn\/front-end\/\.output/);

    expect(productionPm2Config).toContain('instances: "max"');
    expect(productionPm2Config).toContain('exec_mode: "cluster"');
    expect(productionPm2Config).toContain('HOST: "0.0.0.0"');
    expect(productionPm2Config).toContain('error_file: "/var/unikorn/prod_log/pm2-error.log"');
    expect(productionPm2Config).toContain('out_file: "/var/unikorn/prod_log/pm2-out.log"');
  });

  it("opens release roots and the deployment lock without following symlinks", () => {
    expect(controller).toContain('[[ -d "$app_root" && ! -L "$app_root" ]]');
    expect(controller).toContain('for managed_root in "$incoming_root" "$releases_root"');
    expect(controller).toContain('[[ -d "$managed_root" && ! -L "$managed_root" ]]');
    expect(lockHelper).toContain("os.O_NOFOLLOW");
    expect(lockHelper).toContain("os.O_NONBLOCK");
    expect(lockHelper).toContain("os.O_CLOEXEC");
    expect(lockHelper).toContain('os.open(".deploy.lock", flags, 0o600, dir_fd=root_fd)');
    expect(lockHelper).toContain("close_fds=True");
    expect(lockHelper).toContain("os.fchmod(lock_fd, 0o600)");
    expect(controller).not.toMatch(/exec [0-9]+<>/);
  });

  it("keeps public acceptance inside the rollback window", () => {
    const publicAcceptance = controller.indexOf('if ! wait_for_public_acceptance "$expected_sha"');
    const persistState = controller.indexOf("if ! pm2 save --force");
    const commitActivation = controller.indexOf("activation_committed=false", persistState);
    expect(publicAcceptance).toBeGreaterThan(0);
    expect(publicAcceptance).toBeLessThan(persistState);
    expect(persistState).toBeLessThan(commitActivation);
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
