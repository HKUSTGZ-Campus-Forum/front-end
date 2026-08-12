import { spawn, spawnSync } from "node:child_process";
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
  existsSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const controller = resolve(repositoryRoot, "deploy/atomic-release.sh");
const lockHelper = resolve(repositoryRoot, "deploy/atomic-release-lock.py");
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
    .filter((file) => resolve(outputRoot, file) !== resolve(manifestPath))
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
  cpSync(controller, join(staging, "deploy", "atomic-release.sh"));
  cpSync(lockHelper, join(staging, "deploy", "atomic-release-lock.py"));
  writeManifest(staging, join(staging, "deploy", "release.sha256"));
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
  writeManifest(
    join(appRoot, ".incoming", releaseId),
    join(appRoot, ".incoming", releaseId, "deploy", "release.sha256"),
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
    if [[ "\${TEST_MARKERLESS_UNTIL_RESTART:-false}" == "true" && ! -f "$TEST_PM2_STATE" ]]; then
      release_sha="legacy"
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
if [[ "\${TEST_PM2_DAEMONIZE:-false}" == "true" && ( "$command_name" == "start" || "$command_name" == "startOrReload" ) ]]; then
  /bin/sleep 3 >/dev/null 2>&1 &
fi
exit 0
`,
  );
  chmodSync(pm2, 0o755);
  const curl = join(bin, "curl");
  writeFileSync(
    curl,
    `#!/usr/bin/env bash
target_url=\${*: -1}
if [[ "$target_url" == */health ]]; then
  version=$TEST_HEALTH_VERSION
  if [[ "$target_url" == https://* && -n "\${TEST_PUBLIC_HEALTH_VERSION:-}" ]]; then
    version=$TEST_PUBLIC_HEALTH_VERSION
  elif [[ -L "$TEST_APP_ROOT/current" ]]; then
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
  options: {
    app?: string;
    port?: string;
    config?: string;
    mixed?: boolean;
    markerless?: boolean;
    daemonize?: boolean;
    publicHealthVersion?: string;
    expectedMaxInstances?: string;
  } = {},
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
        TEST_MARKERLESS_UNTIL_RESTART: options.markerless ? "true" : "false",
        TEST_PM2_DAEMONIZE: options.daemonize ? "true" : "false",
        TEST_PUBLIC_HEALTH_VERSION: options.publicHealthVersion ?? "",
        ATOMIC_RELEASE_TESTING: "1",
        DEPLOY_EXPECTED_MAX_INSTANCES:
          options.expectedMaxInstances ??
          ((options.app ?? "unikorn-dev") === "prod-unikorn-frontend" ? "2" : "1"),
        ...(options.publicHealthVersion
          ? {
              DEPLOY_PUBLIC_HEALTH_URL: "https://public.test/health",
              DEPLOY_PUBLIC_ROOT_URL: "https://public.test/",
              DEPLOY_PUBLIC_PLANNER_URL: "https://public.test/courses/planner",
            }
          : {}),
        DEPLOY_HEALTH_ATTEMPTS: "1",
      },
    },
  );
  return { ...result, pm2Log, pm2State };
}

async function waitForPath(path: string, child: ReturnType<typeof spawn>) {
  for (let attempt = 0; attempt < 500; attempt += 1) {
    if (existsSync(path)) return;
    if (child.exitCode !== null) throw new Error(`child exited before creating ${path}`);
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 10));
  }
  child.kill("SIGKILL");
  throw new Error(`timed out waiting for ${path}`);
}

async function waitForChild(child: ReturnType<typeof spawn>) {
  if (child.exitCode !== null) return child.exitCode;
  return await new Promise<number | null>((resolvePromise) => child.once("close", resolvePromise));
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

  it("rejects a partial production max cluster even when every surviving worker is healthy", () => {
    const appRoot = mkdtempSync(join(tmpdir(), "frontend-atomic-production-partial-"));
    const releaseId = createProductionRelease(appRoot, shaB, 116, 1);

    const result = runController(appRoot, releaseId, shaB, shaB, "", {
      app: "prod-unikorn-frontend",
      port: "3000",
      config: "deploy/ecosystem.prod.config.cjs",
      expectedMaxInstances: "3",
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("new release did not start all PM2 processes");
    expect(existsSync(join(appRoot, "current"))).toBe(false);
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
      { markerless: true },
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
      { markerless: true },
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("previous release restored");
    expect(readlinkSync(join(appRoot, "current"))).toBe(`releases/${oldId}`);
    expect(readFileSync(result.pm2State, "utf8").trim()).toBe(
      join(appRoot, "current", ".output", "server", "index.mjs"),
    );
  }, 40_000);

  it("rolls back while armed when public exact-SHA acceptance fails", () => {
    const appRoot = mkdtempSync(join(tmpdir(), "frontend-atomic-public-rollback-"));
    const oldId = `${shaA}-94-1`;
    const oldRelease = join(appRoot, "releases", oldId);
    mkdirSync(join(oldRelease, ".output", "server"), { recursive: true });
    mkdirSync(join(oldRelease, "deploy"), { recursive: true });
    writeFileSync(join(oldRelease, ".output", "server", "index.mjs"), "export default {};\n");
    cpSync(productionPm2Config, join(oldRelease, "deploy", "ecosystem.prod.config.cjs"));
    symlinkSync(`releases/${oldId}`, join(appRoot, "current"));
    const releaseId = createProductionRelease(appRoot, shaB, 112, 1);

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
        publicHealthVersion: "wrong-public-build",
      },
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      "public health, root, or planner acceptance failed; previous release restored",
    );
    expect(readlinkSync(join(appRoot, "current"))).toBe(`releases/${oldId}`);
    expect(readFileSync(result.pm2Log, "utf8")).toContain(
      "ecosystem.prod.config.cjs --only prod-unikorn-frontend --update-env",
    );
  }, 40_000);

  it("rejects symlinked incoming and releases roots without touching their targets", () => {
    for (const managedName of [".incoming", "releases"]) {
      const appRoot = mkdtempSync(join(tmpdir(), `frontend-atomic-${managedName.slice(1)}-link-`));
      const outside = mkdtempSync(join(tmpdir(), "frontend-atomic-outside-"));
      const sentinel = join(outside, "sentinel");
      writeFileSync(sentinel, "unchanged\n");
      symlinkSync(outside, join(appRoot, managedName));
      const stubBin = createCommandStubs(appRoot);

      const result = spawnSync(
        "bash",
        [controller, appRoot, `${shaA}-109-1`, shaA, "unikorn-dev", "3001", "3"],
        {
          encoding: "utf8",
          env: {
            ...process.env,
            PATH: `${stubBin}:${process.env.PATH}`,
            TEST_PM2_LOG: join(appRoot, "pm2.log"),
            TEST_PM2_STATE: join(appRoot, "pm2.state"),
          },
        },
      );

      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("must be a real directory");
      expect(readFileSync(sentinel, "utf8")).toBe("unchanged\n");
      expect(readdirSync(outside)).toEqual(["sentinel"]);
    }
  });

  it("rejects a staged lock helper changed after its release manifest was created", () => {
    const appRoot = mkdtempSync(join(tmpdir(), "frontend-atomic-helper-tamper-"));
    const releaseId = createRelease(appRoot, shaA, 115, 1);
    writeFileSync(
      join(appRoot, ".incoming", releaseId, "deploy", "atomic-release-lock.py"),
      "raise SystemExit('tampered')\n",
    );
    const stubBin = createCommandStubs(appRoot);

    const result = spawnSync(
      "bash",
      [controller, appRoot, releaseId, shaA, "unikorn-dev", "3001", "3"],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${stubBin}:${process.env.PATH}`,
          TEST_PM2_LOG: join(appRoot, "pm2.log"),
          TEST_PM2_STATE: join(appRoot, "pm2.state"),
          TEST_EXPECTED_SHA: shaA,
          TEST_HEALTH_VERSION: shaA,
          TEST_PREVIOUS_HEALTH_VERSION: shaA,
          TEST_APP_ROOT: appRoot,
          TEST_PM2_APP: "unikorn-dev",
          DEPLOY_EXPECTED_MAX_INSTANCES: "1",
          DEPLOY_HEALTH_ATTEMPTS: "1",
        },
      },
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("staged release checksum verification failed");
    expect(existsSync(join(appRoot, "current"))).toBe(false);
  }, 40_000);

  it("rejects a symlinked deployment lock without truncating its target", () => {
    const appRoot = mkdtempSync(join(tmpdir(), "frontend-atomic-lock-link-"));
    const target = join(appRoot, "lock-target");
    writeFileSync(target, "do-not-truncate\n");
    symlinkSync(target, join(appRoot, ".deploy.lock"));
    const stubBin = createCommandStubs(appRoot);

    const result = spawnSync(
      "bash",
      [controller, appRoot, `${shaA}-110-1`, shaA, "unikorn-dev", "3001", "3"],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${stubBin}:${process.env.PATH}`,
          TEST_PM2_LOG: join(appRoot, "pm2.log"),
          TEST_PM2_STATE: join(appRoot, "pm2.state"),
        },
      },
    );

    expect(result.status).not.toBe(0);
    expect(readFileSync(target, "utf8")).toBe("do-not-truncate\n");
    expect(existsSync(join(appRoot, ".deploy.lock"))).toBe(true);
  });

  it("rejects symlink and FIFO swaps between lock coordination and open", async () => {
    for (const replacement of ["symlink", "fifo"] as const) {
      const appRoot = mkdtempSync(join(tmpdir(), `frontend-atomic-lock-race-${replacement}-`));
      const stubBin = createCommandStubs(appRoot);
      const gate = join(appRoot, "lock-gate");
      const lockPath = join(appRoot, ".deploy.lock");
      const target = join(appRoot, "lock-target");
      writeFileSync(target, "do-not-open-or-truncate\n");
      let stderr = "";
      const child = spawn(
        "bash",
        [controller, appRoot, `${shaA}-113-1`, shaA, "unikorn-dev", "3001", "3"],
        {
          env: {
            ...process.env,
            PATH: `${stubBin}:${process.env.PATH}`,
            ATOMIC_RELEASE_TESTING: "1",
            ATOMIC_RELEASE_TEST_LOCK_GATE: gate,
          },
          stdio: ["ignore", "ignore", "pipe"],
        },
      );
      child.stderr?.on("data", (chunk) => {
        stderr += String(chunk);
      });

      await waitForPath(`${gate}.ready`, child);
      if (replacement === "symlink") {
        symlinkSync(target, lockPath);
      } else {
        const fifo = spawnSync("mkfifo", [lockPath], { encoding: "utf8" });
        expect(fifo.status, fifo.stderr).toBe(0);
      }
      writeFileSync(`${gate}.continue`, "continue\n");

      expect(await waitForChild(child)).not.toBe(0);
      expect(stderr).toMatch(/must not be a symlink|is not a regular file/);
      expect(readFileSync(target, "utf8")).toBe("do-not-open-or-truncate\n");
      if (replacement === "fifo") expect(lstatSync(lockPath).isFIFO()).toBe(true);
    }
  }, 40_000);

  it("does not leak either deployment lock into a daemonized PM2 descendant", () => {
    const appRoot = mkdtempSync(join(tmpdir(), "frontend-atomic-lock-leak-"));
    const releaseId = createRelease(appRoot, shaA, 114, 1);

    const result = runController(appRoot, releaseId, shaA, shaA, "", { daemonize: true });
    expect(result.status).toBe(0);

    const probe = spawnSync(
      "python3",
      [
        "-c",
        `import fcntl, os, sys
root = os.open(sys.argv[1], os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC)
lock = os.open(".deploy.lock", os.O_RDWR | os.O_CLOEXEC, dir_fd=root)
fcntl.flock(root, fcntl.LOCK_EX | fcntl.LOCK_NB)
fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)`,
        appRoot,
      ],
      { encoding: "utf8" },
    );
    expect(probe.status, probe.stderr).toBe(0);
  }, 40_000);

  it("queues cancellation received before controller spawn and releases both locks", async () => {
    const appRoot = mkdtempSync(join(tmpdir(), "frontend-atomic-signal-window-"));
    const releaseId = createRelease(appRoot, shaA, 117, 1);
    const stubBin = createCommandStubs(appRoot);
    const gate = join(appRoot, "signal-gate");
    let stderr = "";
    const child = spawn(
      "bash",
      [controller, appRoot, releaseId, shaA, "unikorn-dev", "3001", "3"],
      {
        env: {
          ...process.env,
          PATH: `${stubBin}:${process.env.PATH}`,
          TEST_HEALTH_VERSION: shaA,
          TEST_PREVIOUS_HEALTH_VERSION: shaA,
          TEST_EXPECTED_SHA: shaA,
          TEST_APP_ROOT: appRoot,
          TEST_PM2_LOG: join(appRoot, "pm2.log"),
          TEST_PM2_STATE: join(appRoot, "pm2.state"),
          TEST_PM2_APP: "unikorn-dev",
          ATOMIC_RELEASE_TESTING: "1",
          ATOMIC_RELEASE_TEST_SIGNAL_GATE: gate,
          DEPLOY_EXPECTED_MAX_INSTANCES: "1",
          DEPLOY_HEALTH_ATTEMPTS: "1",
        },
        stdio: ["ignore", "ignore", "pipe"],
      },
    );
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });

    await waitForPath(`${gate}.ready`, child);
    child.kill("SIGTERM");
    writeFileSync(`${gate}.continue`, "continue\n");

    expect(await waitForChild(child)).toBe(143);
    expect(stderr).not.toContain("timed out waiting");
    expect(existsSync(join(appRoot, "current"))).toBe(false);

    const probe = spawnSync(
      "python3",
      [
        "-c",
        `import fcntl, os, sys
root = os.open(sys.argv[1], os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC)
lock = os.open(".deploy.lock", os.O_RDWR | os.O_CLOEXEC, dir_fd=root)
fcntl.flock(root, fcntl.LOCK_EX | fcntl.LOCK_NB)
fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)`,
        appRoot,
      ],
      { encoding: "utf8" },
    );
    expect(probe.status, probe.stderr).toBe(0);
  }, 40_000);

  it("contends on the same deployment lock file as existing flock users", async () => {
    if (process.platform === "darwin") return;
    const appRoot = mkdtempSync(join(tmpdir(), "frontend-atomic-lock-contention-"));
    const lockPath = join(appRoot, ".deploy.lock");
    writeFileSync(lockPath, "");
    const holder = spawn("flock", [lockPath, "sleep", "2"], { stdio: "ignore" });
    await new Promise(resolve => setTimeout(resolve, 100));

    const result = spawnSync(
      "bash",
      [controller, appRoot, `${shaA}-111-1`, shaA, "unikorn-dev", "3001", "3"],
      {
        encoding: "utf8",
        env: { ...process.env, DEPLOY_LOCK_WAIT_SECONDS: "1" },
      },
    );
    holder.kill("SIGTERM");

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("another deployment still holds");
    expect(existsSync(join(appRoot, ".incoming", `${shaA}-111-1`))).toBe(false);
  });

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
