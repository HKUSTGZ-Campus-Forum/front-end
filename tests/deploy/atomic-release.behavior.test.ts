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

function createCommandStubs(root: string) {
  const bin = join(root, "test-bin");
  mkdirSync(bin, { recursive: true });
  const pm2 = join(bin, "pm2");
  writeFileSync(pm2, "#!/usr/bin/env bash\nprintf '%s\\n' \"$*\" >> \"$TEST_PM2_LOG\"\nexit 0\n");
  chmodSync(pm2, 0o755);
  const curl = join(bin, "curl");
  writeFileSync(
    curl,
    "#!/usr/bin/env bash\nif [[ \"${*: -1}\" == */health ]]; then printf '{\"status\":\"ok\",\"service\":\"campus-forum-frontend\",\"version\":\"%s\"}' \"$TEST_HEALTH_VERSION\"; fi\n",
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

function runController(appRoot: string, releaseId: string, sha: string, healthVersion: string) {
  const stubBin = createCommandStubs(appRoot);
  const pm2Log = join(appRoot, "pm2.log");
  const result = spawnSync(
    "bash",
    [controller, appRoot, releaseId, sha, "unikorn-dev", "3001", "3"],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${stubBin}:${process.env.PATH}`,
        TEST_HEALTH_VERSION: healthVersion,
        TEST_PM2_LOG: pm2Log,
        DEPLOY_HEALTH_ATTEMPTS: "1",
      },
    },
  );
  return { ...result, pm2Log };
}

describe("atomic release controller behavior", () => {
  it("activates a verified release while retaining the legacy in-place bundle", () => {
    const appRoot = mkdtempSync(join(tmpdir(), "frontend-atomic-success-"));
    mkdirSync(join(appRoot, ".output", "server"), { recursive: true });
    writeFileSync(join(appRoot, ".output", "server", "index.mjs"), "export default {};\n");
    const releaseId = createRelease(appRoot, shaA, 101, 1);

    const result = runController(appRoot, releaseId, shaA, shaA);

    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(readlinkSync(join(appRoot, "current"))).toBe(`releases/${releaseId}`);
    expect(readlinkSync(join(appRoot, "releases", "legacy-in-place"))).toBe(appRoot);
    expect(lstatSync(join(appRoot, ".output")).isDirectory()).toBe(true);
    expect(readFileSync(result.pm2Log, "utf8")).toContain("startOrReload");
  }, 20_000);

  it("restores the previous release when exact-build health validation fails", () => {
    const appRoot = mkdtempSync(join(tmpdir(), "frontend-atomic-rollback-"));
    const oldId = `${shaA}-99-1`;
    const oldRelease = join(appRoot, "releases", oldId);
    mkdirSync(join(oldRelease, ".output", "server"), { recursive: true });
    writeFileSync(join(oldRelease, ".output", "server", "index.mjs"), "export default {};\n");
    symlinkSync(`releases/${oldId}`, join(appRoot, "current"));
    const releaseId = createRelease(appRoot, shaB, 102, 1);

    const result = runController(appRoot, releaseId, shaB, "wrong-build");

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("previous release restored");
    expect(readlinkSync(join(appRoot, "current"))).toBe(`releases/${oldId}`);
    expect(readFileSync(result.pm2Log, "utf8").match(/startOrReload/g)?.length).toBe(2);
  }, 20_000);

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
        },
      },
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("RELEASE_ID must be SHA-RUN_ID-RUN_ATTEMPT");
  });
});
