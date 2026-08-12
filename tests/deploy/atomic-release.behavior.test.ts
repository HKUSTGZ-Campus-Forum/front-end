import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  cpSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const controller = resolve(repositoryRoot, "deploy/atomic-release.sh");
const pm2Config = resolve(repositoryRoot, "deploy/ecosystem.dev.config.cjs");
const productionPm2Config = resolve(repositoryRoot, "deploy/ecosystem.prod.config.cjs");
const shaA = "a".repeat(40);
const shaB = "b".repeat(40);

function regularFiles(root: string, directory = root): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) return regularFiles(root, absolutePath);
    if (entry.isFile()) return [relative(root, absolutePath)];
    return [];
  });
}

function writeManifest(outputRoot: string, manifestPath: string) {
  const manifest = regularFiles(outputRoot)
    .sort()
    .map((file) => {
      const digest = createHash("sha256").update(readFileSync(join(outputRoot, file))).digest("hex");
      return `${digest}  ./${file}`;
    })
    .join("\n");
  writeFileSync(manifestPath, `${manifest}\n`);
}

function createRelease(appRoot: string, sha: string, run: number, attempt: number) {
  const releaseId = `${sha}-${run}-${attempt}`;
  const staging = join(appRoot, ".incoming", releaseId);
  const output = join(staging, ".output");
  mkdirSync(join(output, "server"), { recursive: true });
  mkdirSync(join(output, "public", "_nuxt"), { recursive: true });
  mkdirSync(join(staging, "deploy"), { recursive: true });
  writeFileSync(join(output, "server", "index.mjs"), "export default {};\n");
  for (let asset = 0; asset < 10; asset += 1) {
    writeFileSync(join(output, "public", "_nuxt", `asset-${asset}.js`), `export default ${asset};\n`);
  }
  cpSync(pm2Config, join(staging, "deploy", "ecosystem.dev.config.cjs"));
  writeManifest(output, join(staging, "deploy", "output.sha256"));
  return releaseId;
}

function createLegacyConfig(appRoot: string) {
  writeFileSync(join(appRoot, "package.json"), '{"type":"module"}\n');
  writeFileSync(
    join(appRoot, "ecosystem.config.js"),
    `module.exports = { apps: [{
      name: "unikorn-dev",
      script: ${JSON.stringify(join(appRoot, ".output", "server", "index.mjs"))},
      cwd: ${JSON.stringify(appRoot)},
      instances: 1,
      exec_mode: "fork",
      env: { PORT: "3001", NODE_ENV: "production" },
    }] };\n`,
  );
}

function createProductionRelease(appRoot: string, sha: string, run: number, attempt: number) {
  const releaseId = createRelease(appRoot, sha, run, attempt);
  cpSync(
    productionPm2Config,
    join(appRoot, ".incoming", releaseId, "deploy", "ecosystem.prod.config.cjs"),
  );
  return releaseId;
}

function createCommandStubs(root: string) {
  const bin = join(root, "test-bin");
  mkdirSync(bin, { recursive: true });
  const pm2 = join(bin, "pm2");
  writeFileSync(
    pm2,
    `#!/usr/bin/env bash
set -eu
command_name=\${1:-}
printf '%s\\n' "$*" >> "$TEST_PM2_LOG"
if [[ "$command_name" == "jlist" ]]; then
  script_path=""
  if [[ -f "$TEST_PM2_STATE" ]]; then script_path=$(<"$TEST_PM2_STATE");
  elif [[ -n "\${TEST_PM2_INITIAL_EXEC_PATH:-}" ]]; then script_path=$TEST_PM2_INITIAL_EXEC_PATH; fi
  if [[ -n "$script_path" ]]; then
    cwd_path="$TEST_APP_ROOT/current"
    release_sha="$TEST_EXPECTED_SHA"
    if [[ "$script_path" == "$TEST_APP_ROOT/.output/server/index.mjs" ]]; then
      cwd_path="$TEST_APP_ROOT"
      release_sha="legacy"
    elif [[ -L "$TEST_APP_ROOT/current" && $(readlink "$TEST_APP_ROOT/current") != *"$TEST_EXPECTED_SHA"* ]]; then
      release_sha="$TEST_PREVIOUS_HEALTH_VERSION"
    fi
    process_count=1
    exec_mode=fork_mode
    if [[ "$TEST_PM2_APP" == "prod-unikorn-frontend" ]]; then process_count=2; exec_mode=cluster_mode; fi
    if [[ "\${TEST_FORCE_MIXED_JLIST:-false}" == "true" && ! -f "$TEST_PM2_STATE" ]]; then
      printf '[{"name":"%s","pm2_env":{"status":"online","pm_exec_path":"%s","pm_cwd":"%s","exec_mode":"%s","CAMPUS_FRONTEND_RELEASE_SHA":"%s"}},{"name":"%s","pm2_env":{"status":"offline","pm_exec_path":"%s","pm_cwd":"%s","exec_mode":"%s","CAMPUS_FRONTEND_RELEASE_SHA":"mixed"}}]\\n' "$TEST_PM2_APP" "$script_path" "$cwd_path" "$exec_mode" "$release_sha" "$TEST_PM2_APP" "$script_path" "$cwd_path" "$exec_mode"
    else
      printf '['
      for index in $(seq 1 "$process_count"); do
        if (( index > 1 )); then printf ','; fi
        printf '{"name":"%s","pm2_env":{"status":"online","pm_exec_path":"%s","pm_cwd":"%s","exec_mode":"%s","CAMPUS_FRONTEND_RELEASE_SHA":"%s"}}' "$TEST_PM2_APP" "$script_path" "$cwd_path" "$exec_mode" "$release_sha"
      done
      printf ']\\n'
    fi
  else
    printf '[]\\n'
  fi
elif [[ "$command_name" == "delete" ]]; then
  : > "$TEST_PM2_STATE"
elif [[ "$command_name" == "start" ]]; then
  printf 'NUXT_HOST=%s\n' "\${NUXT_HOST:-}" >> "$TEST_PM2_LOG"
  script_or_config=\${2:-}
  if [[ "$script_or_config" == *.mjs ]]; then
    printf '%s\\n' "$script_or_config" > "$TEST_PM2_STATE"
  elif [[ "$script_or_config" == */ecosystem.config.js || "$script_or_config" == */legacy-ecosystem.config.cjs ]]; then
    printf '%s\\n' "$TEST_APP_ROOT/.output/server/index.mjs" > "$TEST_PM2_STATE"
  else
    printf '%s\\n' "$CAMPUS_FRONTEND_ROOT/current/.output/server/index.mjs" > "$TEST_PM2_STATE"
  fi
elif [[ "$command_name" == "startOrReload" ]]; then
  printf '%s\\n' "$CAMPUS_FRONTEND_ROOT/current/.output/server/index.mjs" > "$TEST_PM2_STATE"
fi
exit 0
`,
  );
  chmodSync(pm2, 0o755);
  const curl = join(bin, "curl");
  writeFileSync(
    curl,
    `#!/usr/bin/env bash
if [[ "\${*: -1}" == */health ]]; then
  version=$TEST_HEALTH_VERSION
  if [[ -L "$TEST_APP_ROOT/current" ]]; then
    current_target=$(readlink "$TEST_APP_ROOT/current")
    if [[ "$current_target" == "releases/legacy-in-place" ]]; then
      if [[ "\${TEST_LEGACY_HEALTH_AVAILABLE:-false}" != "true" ]]; then exit 22; fi
      version=$TEST_PREVIOUS_HEALTH_VERSION
    elif [[ "$current_target" != *"$TEST_EXPECTED_SHA"* ]]; then
      version=$TEST_PREVIOUS_HEALTH_VERSION
    fi
  fi
  printf '{"status":"ok","service":"campus-forum-frontend","version":"%s"}' "$version"
fi
`,
  );
  chmodSync(curl, 0o755);
  const sleep = join(bin, "sleep");
  writeFileSync(sleep, "#!/usr/bin/env bash\nexit 0\n");
  chmodSync(sleep, 0o755);
  if (process.platform === "darwin") {
    const flock = join(bin, "flock");
    writeFileSync(flock, "#!/usr/bin/env bash\nexit 0\n");
    chmodSync(flock, 0o755);

    const sha256sum = join(bin, "sha256sum");
    writeFileSync(
      sha256sum,
      "#!/usr/bin/env bash\nmanifest=${*: -1}\nexec shasum -a 256 -c \"$manifest\" >/dev/null\n",
    );
    chmodSync(sha256sum, 0o755);

    const find = join(bin, "find");
    writeFileSync(
      find,
      "#!/usr/bin/env bash\nif [[ \" $* \" == *\" -printf \"* ]]; then root=$1; /usr/bin/find \"$root\" -mindepth 1 -maxdepth 1 -type d -exec stat -f '%m %N' {} \\;; else exec /usr/bin/find \"$@\"; fi\n",
    );
    chmodSync(find, 0o755);

    const mv = join(bin, "mv");
    writeFileSync(
      mv,
      "#!/usr/bin/env bash\natomic=false\nargs=()\nfor arg in \"$@\"; do case \"$arg\" in -Tf|-fT|-T) atomic=true ;; --) ;; *) args+=(\"$arg\") ;; esac; done\nif [[ \"$atomic\" == true ]]; then /bin/rm -f \"${args[1]}\"; exec /bin/mv -f \"${args[0]}\" \"${args[1]}\"; fi\nexec /bin/mv \"${args[@]}\"\n",
    );
    chmodSync(mv, 0o755);
  }
  return bin;
}

function runController(
  appRoot: string,
  releaseId: string,
  sha: string,
  healthVersion: string,
  initialExecPath = "",
  options: { app?: string; port?: string; config?: string; mixed?: boolean } = {},
) {
  const stubBin = createCommandStubs(appRoot);
  const pm2Log = join(appRoot, "pm2.log");
  const pm2State = join(appRoot, "pm2.state");
  const result = spawnSync(
    "bash",
    [
      controller,
      appRoot,
      releaseId,
      sha,
      options.app ?? "unikorn-dev",
      options.port ?? "3001",
      "3",
      options.config ?? "deploy/ecosystem.dev.config.cjs",
    ],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${stubBin}:${process.env.PATH}`,
        TEST_HEALTH_VERSION: healthVersion,
        TEST_PREVIOUS_HEALTH_VERSION: shaA,
        TEST_EXPECTED_SHA: sha,
        TEST_APP_ROOT: appRoot,
        TEST_PM2_LOG: pm2Log,
        TEST_PM2_STATE: pm2State,
        TEST_PM2_INITIAL_EXEC_PATH: initialExecPath,
        TEST_LEGACY_HEALTH_AVAILABLE: "false",
        TEST_PM2_APP: options.app ?? "unikorn-dev",
        TEST_FORCE_MIXED_JLIST: options.mixed ? "true" : "false",
        DEPLOY_HEALTH_ATTEMPTS: "1",
      },
    },
  );
  return { ...result, pm2Log, pm2State };
}

describe("atomic release controller behavior", () => {
  it("activates a verified release while retaining the legacy in-place bundle", () => {
    const appRoot = mkdtempSync(join(tmpdir(), "frontend-atomic-success-"));
    mkdirSync(join(appRoot, ".output", "server"), { recursive: true });
    writeFileSync(join(appRoot, ".output", "server", "index.mjs"), "export default {};\n");
    createLegacyConfig(appRoot);
    const releaseId = createRelease(appRoot, shaA, 101, 1);

    const result = runController(
      appRoot,
      releaseId,
      shaA,
      shaA,
      join(appRoot, ".output", "server", "index.mjs"),
    );

    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(readlinkSync(join(appRoot, "current"))).toBe(`releases/${releaseId}`);
    expect(readlinkSync(join(appRoot, "releases", "legacy-in-place"))).toBe(appRoot);
    expect(lstatSync(join(appRoot, ".output")).isDirectory()).toBe(true);
    expect(readFileSync(result.pm2Log, "utf8")).toContain("delete unikorn-dev");
    expect(readFileSync(result.pm2Log, "utf8")).toContain("start ");
    expect(readFileSync(result.pm2State, "utf8").trim()).toBe(
      join(appRoot, "current", ".output", "server", "index.mjs"),
    );
    expect(readFileSync(result.pm2Log, "utf8")).not.toContain("previous health");
  }, 40_000);

  it("restores the original absolute legacy process path when first-migration health fails", () => {
    const appRoot = mkdtempSync(join(tmpdir(), "frontend-atomic-legacy-rollback-"));
    const legacyScript = join(appRoot, ".output", "server", "index.mjs");
    mkdirSync(join(appRoot, ".output", "server"), { recursive: true });
    writeFileSync(legacyScript, "export default {};\n");
    createLegacyConfig(appRoot);
    const releaseId = createRelease(appRoot, shaB, 104, 1);

    const result = runController(appRoot, releaseId, shaB, "wrong-build", legacyScript);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("previous release restored");
    expect(readlinkSync(join(appRoot, "current"))).toBe("releases/legacy-in-place");
    expect(readFileSync(result.pm2State, "utf8").trim()).toBe(legacyScript);
    const pm2Log = readFileSync(result.pm2Log, "utf8");
    expect(pm2Log.match(/delete unikorn-dev/g)?.length).toBe(2);
    expect(pm2Log).toContain("start ");
    expect(pm2Log).toContain("legacy-ecosystem.config.cjs --only unikorn-dev --update-env");
  }, 40_000);

  it("restores the previous release when exact-build health validation fails", () => {
    const appRoot = mkdtempSync(join(tmpdir(), "frontend-atomic-rollback-"));
    const oldId = `${shaA}-99-1`;
    const oldRelease = join(appRoot, "releases", oldId);
    mkdirSync(join(oldRelease, ".output", "server"), { recursive: true });
    mkdirSync(join(oldRelease, "deploy"), { recursive: true });
    writeFileSync(join(oldRelease, ".output", "server", "index.mjs"), "export default {};\n");
    cpSync(pm2Config, join(oldRelease, "deploy", "ecosystem.dev.config.cjs"));
    symlinkSync(`releases/${oldId}`, join(appRoot, "current"));
    const releaseId = createRelease(appRoot, shaB, 102, 1);

    const result = runController(
      appRoot,
      releaseId,
      shaB,
      "wrong-build",
      join(appRoot, "current", ".output", "server", "index.mjs"),
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("previous release restored");
    expect(readlinkSync(join(appRoot, "current"))).toBe(`releases/${oldId}`);
    expect(readFileSync(result.pm2Log, "utf8")).toContain("startOrReload");
  }, 40_000);

  it("reloads without replacing a process already using the stable current path", () => {
    const appRoot = mkdtempSync(join(tmpdir(), "frontend-atomic-reload-"));
    const oldId = `${shaA}-98-1`;
    mkdirSync(join(appRoot, "releases", oldId, "deploy"), { recursive: true });
    cpSync(pm2Config, join(appRoot, "releases", oldId, "deploy", "ecosystem.dev.config.cjs"));
    symlinkSync(`releases/${oldId}`, join(appRoot, "current"));
    const releaseId = createRelease(appRoot, shaB, 103, 1);

    const result = runController(
      appRoot,
      releaseId,
      shaB,
      shaB,
      join(appRoot, "current", ".output", "server", "index.mjs"),
    );

    expect(result.status).toBe(0);
    expect(readlinkSync(join(appRoot, "current"))).toBe(`releases/${releaseId}`);
    const pm2Log = readFileSync(result.pm2Log, "utf8");
    expect(pm2Log).toContain("startOrReload");
    expect(pm2Log).not.toContain("delete unikorn-dev");
  }, 40_000);

  it("verifies every production cluster worker carries the exact release identity", () => {
    const appRoot = mkdtempSync(join(tmpdir(), "frontend-atomic-production-"));
    const releaseId = createProductionRelease(appRoot, shaB, 105, 1);

    const result = runController(appRoot, releaseId, shaB, shaB, "", {
      app: "prod-unikorn-frontend",
      port: "3000",
      config: "deploy/ecosystem.prod.config.cjs",
    });

    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(readlinkSync(join(appRoot, "current"))).toBe(`releases/${releaseId}`);
    expect(readFileSync(result.pm2Log, "utf8")).toContain(
      "ecosystem.prod.config.cjs --only prod-unikorn-frontend --update-env",
    );
  }, 40_000);

  it("rejects a mixed or offline PM2 pre-state before moving staged output", () => {
    const appRoot = mkdtempSync(join(tmpdir(), "frontend-atomic-mixed-prestate-"));
    const oldId = `${shaA}-97-1`;
    const oldRelease = join(appRoot, "releases", oldId);
    mkdirSync(join(oldRelease, ".output", "server"), { recursive: true });
    mkdirSync(join(oldRelease, "deploy"), { recursive: true });
    writeFileSync(join(oldRelease, ".output", "server", "index.mjs"), "export default {};\n");
    cpSync(productionPm2Config, join(oldRelease, "deploy", "ecosystem.prod.config.cjs"));
    symlinkSync(`releases/${oldId}`, join(appRoot, "current"));
    const releaseId = createProductionRelease(appRoot, shaB, 106, 1);

    const result = runController(
      appRoot,
      releaseId,
      shaB,
      shaB,
      join(appRoot, "current", ".output", "server", "index.mjs"),
      {
        app: "prod-unikorn-frontend",
        port: "3000",
        config: "deploy/ecosystem.prod.config.cjs",
        mixed: true,
      },
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("could not inspect the existing PM2 process");
    expect(readlinkSync(join(appRoot, "current"))).toBe(`releases/${oldId}`);
    expect(lstatSync(join(appRoot, ".incoming", releaseId)).isDirectory()).toBe(true);
  }, 40_000);

  it("upgrades a marker-less managed release using the SHA in its immutable target", () => {
    const appRoot = mkdtempSync(join(tmpdir(), "frontend-atomic-markerless-"));
    const oldId = `${shaA}-96-1`;
    const oldRelease = join(appRoot, "releases", oldId);
    mkdirSync(join(oldRelease, ".output", "server"), { recursive: true });
    mkdirSync(join(oldRelease, "deploy"), { recursive: true });
    writeFileSync(join(oldRelease, ".output", "server", "index.mjs"), "export default {};\n");
    writeFileSync(
      join(oldRelease, "deploy", "ecosystem.dev.config.cjs"),
      readFileSync(pm2Config, "utf8").replace(
        "        CAMPUS_FRONTEND_RELEASE_SHA: releaseSha,\n",
        "",
      ),
    );
    symlinkSync(`releases/${oldId}`, join(appRoot, "current"));
    const releaseId = createRelease(appRoot, shaB, 107, 1);

    const result = runController(
      appRoot,
      releaseId,
      shaB,
      shaB,
      join(appRoot, "current", ".output", "server", "index.mjs"),
    );

    expect(result.status).toBe(0);
    expect(readlinkSync(join(appRoot, "current"))).toBe(`releases/${releaseId}`);
  }, 40_000);

  it("restores a marker-less managed release and validates its exact HTTP SHA", () => {
    const appRoot = mkdtempSync(join(tmpdir(), "frontend-atomic-markerless-rollback-"));
    const oldId = `${shaA}-95-1`;
    const oldRelease = join(appRoot, "releases", oldId);
    mkdirSync(join(oldRelease, ".output", "server"), { recursive: true });
    mkdirSync(join(oldRelease, "deploy"), { recursive: true });
    writeFileSync(join(oldRelease, ".output", "server", "index.mjs"), "export default {};\n");
    writeFileSync(
      join(oldRelease, "deploy", "ecosystem.dev.config.cjs"),
      readFileSync(pm2Config, "utf8").replace(
        "        CAMPUS_FRONTEND_RELEASE_SHA: releaseSha,\n",
        "",
      ),
    );
    symlinkSync(`releases/${oldId}`, join(appRoot, "current"));
    const releaseId = createRelease(appRoot, shaB, 108, 1);

    const result = runController(
      appRoot,
      releaseId,
      shaB,
      "wrong-build",
      join(appRoot, "current", ".output", "server", "index.mjs"),
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("previous release restored");
    expect(readlinkSync(join(appRoot, "current"))).toBe(`releases/${oldId}`);
    expect(readFileSync(result.pm2State, "utf8").trim()).toBe(
      join(appRoot, "current", ".output", "server", "index.mjs"),
    );
  }, 40_000);

  it("rejects release identifiers that could escape the release root", () => {
    const appRoot = mkdtempSync(join(tmpdir(), "frontend-atomic-invalid-"));
    const stubBin = createCommandStubs(appRoot);
    const result = spawnSync(
      "bash",
      [controller, appRoot, `../${basename(appRoot)}`, shaA, "unikorn-dev", "3001", "3"],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${stubBin}:${process.env.PATH}`,
          TEST_HEALTH_VERSION: shaA,
          TEST_PM2_LOG: join(appRoot, "pm2.log"),
          TEST_PM2_STATE: join(appRoot, "pm2.state"),
        },
      },
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("RELEASE_ID must be SHA-RUN_ID-RUN_ATTEMPT");
  });
});
