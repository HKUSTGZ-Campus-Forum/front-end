#!/usr/bin/env bash

set -Eeuo pipefail
umask 022

usage() {
  cat >&2 <<'EOF'
Usage: atomic-release.sh APP_ROOT RELEASE_ID EXPECTED_SHA PM2_APP PORT [KEEP_RELEASES] [PM2_CONFIG]

The release must already be uploaded to APP_ROOT/.incoming/RELEASE_ID.
EOF
}

die() {
  echo "atomic-release: $*" >&2
  exit 1
}

if (( $# < 5 || $# > 7 )); then
  usage
  exit 2
fi

app_root=${1%/}
release_id=$2
expected_sha=$3
pm2_app=$4
port=$5
keep_releases=${6:-3}
pm2_config_relative=${7:-deploy/ecosystem.dev.config.cjs}
health_attempts=${DEPLOY_HEALTH_ATTEMPTS:-20}
lock_wait_seconds=${DEPLOY_LOCK_WAIT_SECONDS:-120}

[[ "$app_root" == /* && "$app_root" != "/" && "$app_root" != *[[:space:]]* ]] ||
  die "APP_ROOT must be an absolute, non-root path without whitespace"
[[ "$release_id" =~ ^[0-9a-f]{40}-[0-9]+-[0-9]+$ ]] ||
  die "RELEASE_ID must be SHA-RUN_ID-RUN_ATTEMPT"
[[ "$expected_sha" =~ ^[0-9a-f]{40}$ ]] || die "EXPECTED_SHA must be a full lowercase Git SHA"
[[ "$release_id" == "$expected_sha-"* ]] || die "RELEASE_ID must start with EXPECTED_SHA"
[[ "$pm2_app" =~ ^[A-Za-z0-9_-]+$ ]] || die "PM2_APP contains unsupported characters"
[[ "$port" =~ ^[0-9]+$ ]] && (( port >= 1 && port <= 65535 )) || die "PORT is invalid"
[[ "$keep_releases" =~ ^[0-9]+$ ]] && (( keep_releases >= 2 && keep_releases <= 10 )) ||
  die "KEEP_RELEASES must be between 2 and 10"
[[ "$pm2_config_relative" =~ ^deploy/ecosystem\.[A-Za-z0-9_-]+\.config\.cjs$ ]] ||
  die "PM2_CONFIG must be a deploy/ecosystem.<name>.config.cjs path"
[[ "$health_attempts" =~ ^[0-9]+$ ]] && (( health_attempts >= 1 && health_attempts <= 20 )) ||
  die "DEPLOY_HEALTH_ATTEMPTS must be between 1 and 20"
[[ "$lock_wait_seconds" =~ ^[0-9]+$ ]] && (( lock_wait_seconds >= 1 && lock_wait_seconds <= 120 )) ||
  die "DEPLOY_LOCK_WAIT_SECONDS must be between 1 and 120"

for command_name in cmp curl mktemp node pm2 python3 sha256sum sort; do
  command -v "$command_name" >/dev/null 2>&1 || die "required command not found: $command_name"
done

expected_max_instances=${DEPLOY_EXPECTED_MAX_INSTANCES:-$(node -p 'require("node:os").cpus().length')}
[[ "$expected_max_instances" =~ ^[1-9][0-9]*$ ]] && (( expected_max_instances <= 1024 )) ||
  die "DEPLOY_EXPECTED_MAX_INSTANCES must be between 1 and 1024"

incoming_root="$app_root/.incoming"
releases_root="$app_root/releases"
staging_dir="$incoming_root/$release_id"
release_dir="$releases_root/$release_id"
current_link="$app_root/current"
legacy_release="$releases_root/legacy-in-place"
legacy_config_path="$app_root/ecosystem.config.js"
legacy_frozen_config="$releases_root/legacy-ecosystem.config.cjs"
manifest_relative="deploy/release.sha256"
public_asset_verifier_relative="deploy/verify-public-assets.sh"
health_url="http://127.0.0.1:$port/health"
root_url="http://127.0.0.1:$port/"
public_health_url=${DEPLOY_PUBLIC_HEALTH_URL:-}
public_root_url=${DEPLOY_PUBLIC_ROOT_URL:-}
public_planner_url=${DEPLOY_PUBLIC_PLANNER_URL:-}
public_planner_en_url=${DEPLOY_PUBLIC_PLANNER_EN_URL:-}

[[ -d "$app_root" && ! -L "$app_root" ]] || die "APP_ROOT must be a real directory"

if [[ -n "$public_health_url" || -n "$public_root_url" || -n "$public_planner_url" || -n "$public_planner_en_url" ]]; then
  [[ "$public_health_url" == https://* && "$public_health_url" != *[[:space:]]* ]] ||
    die "DEPLOY_PUBLIC_HEALTH_URL must be a whitespace-free HTTPS URL"
  [[ "$public_root_url" == https://* && "$public_root_url" != *[[:space:]]* ]] ||
    die "DEPLOY_PUBLIC_ROOT_URL must be a whitespace-free HTTPS URL"
  [[ "$public_planner_url" == https://* && "$public_planner_url" != *[[:space:]]* ]] ||
    die "DEPLOY_PUBLIC_PLANNER_URL must be a whitespace-free HTTPS URL"
  [[ "$public_planner_en_url" == https://* && "$public_planner_en_url" != *[[:space:]]* ]] ||
    die "DEPLOY_PUBLIC_PLANNER_EN_URL must be a whitespace-free HTTPS URL"
fi

if [[ ${ATOMIC_RELEASE_LOCK_HELD:-} != "1" ]]; then
  controller_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
  controller_path="$controller_dir/$(basename -- "${BASH_SOURCE[0]}")"
  lock_helper="$controller_dir/atomic-release-lock.py"
  [[ -f "$controller_path" && ! -L "$controller_path" ]] || die "release controller must be a regular file"
  [[ -f "$lock_helper" && ! -L "$lock_helper" ]] || die "deployment lock helper is missing"
  exec python3 "$lock_helper" "$app_root" "$lock_wait_seconds" "$controller_path" "$@"
fi
unset ATOMIC_RELEASE_LOCK_HELD

for managed_root in "$incoming_root" "$releases_root"; do
  if [[ -e "$managed_root" || -L "$managed_root" ]]; then
    [[ -d "$managed_root" && ! -L "$managed_root" ]] ||
      die "$managed_root must be a real directory"
  else
    mkdir -- "$managed_root"
    [[ -d "$managed_root" && ! -L "$managed_root" ]] ||
      die "could not create safe managed directory: $managed_root"
  fi
done

[[ -d "$staging_dir" && ! -L "$staging_dir" ]] || die "staging directory is missing"
[[ ! -e "$release_dir" && ! -L "$release_dir" ]] || die "release already exists: $release_id"
[[ -f "$staging_dir/.output/server/index.mjs" ]] || die "staged server entry point is missing"
[[ -d "$staging_dir/.output/public/_nuxt" ]] || die "staged Nuxt assets are missing"
[[ -f "$staging_dir/$pm2_config_relative" ]] || die "staged PM2 config is missing"
[[ -f "$staging_dir/$manifest_relative" ]] || die "staged checksum manifest is missing"
[[ -f "$staging_dir/$public_asset_verifier_relative" && ! -L "$staging_dir/$public_asset_verifier_relative" ]] ||
  die "staged public asset verifier is missing"

node --check "$staging_dir/.output/server/index.mjs" >/dev/null || die "staged server entry point is invalid"
bash -n "$staging_dir/$public_asset_verifier_relative" || die "staged public asset verifier is invalid"

asset_count=$(find "$staging_dir/.output/public/_nuxt" -type f | wc -l)
(( asset_count >= 10 )) || die "staged Nuxt asset count is unexpectedly low: $asset_count"

echo "Verifying staged release checksums..."
(
  cd "$staging_dir"
  sha256sum --check --strict --quiet "$staging_dir/$manifest_relative"
) || die "staged release checksum verification failed"

while IFS= read -r -d '' link_path; do
  resolved_link=$(readlink -f "$link_path") || die "broken symlink in staged output: $link_path"
  case "$resolved_link" in
    "$staging_dir/.output"/*) ;;
    *) die "symlink escapes staged output: $link_path -> $resolved_link" ;;
  esac
done < <(find "$staging_dir/.output" -type l -print0)

activate() {
  local target=$1
  local next_link="$app_root/.current.next.$release_id.$$"

  [[ "$target" == "releases/legacy-in-place" || "$target" =~ ^releases/[0-9a-f]{40}-[0-9]+-[0-9]+$ ]] ||
    die "refusing to activate an invalid release target: $target"

  rm -f -- "$next_link"
  ln -s "$target" "$next_link"
  mv -Tf -- "$next_link" "$current_link"
}

read_health_version() {
  read_health_version_at "$health_url"
}

read_health_version_at() {
  local target_url=$1
  local response
  response=$(curl --fail --silent --show-error --max-time 5 \
    -H 'Cache-Control: no-cache' "$target_url" 2>/dev/null) || return 1
  [[ -n "$response" ]] || return 1
  node -e '
      const payload = JSON.parse(process.argv[1]);
      if (
        payload.status !== "ok" ||
        payload.service !== "campus-forum-frontend" ||
        !/^[0-9a-f]{40}$/.test(payload.version)
      ) {
        process.exit(1);
      }
      process.stdout.write(payload.version);
    ' "$response" 2>/dev/null
}

wait_for_public_acceptance() {
  local expected_version=$1
  local process_count=${2:-1}
  local actual_version
  local accepted
  local asset_result=""
  local attempt
  local probe
  local probe_count=$process_count

  [[ -n "$public_health_url" ]] || return 0
  (( probe_count >= 3 )) || probe_count=3
  (( probe_count <= 10 )) || probe_count=10

  for attempt in $(seq 1 "$health_attempts"); do
    accepted=true
    for probe in $(seq 1 "$probe_count"); do
      actual_version=$(read_health_version_at "$public_health_url" || true)
      if [[ "$actual_version" != "$expected_version" ]]; then
        accepted=false
        break
      fi
    done
    if [[ "$accepted" == true ]]; then
      if asset_result=$(bash "$release_dir/$public_asset_verifier_relative" \
        "$release_dir/.output/public" \
        "$public_root_url" \
        "$public_planner_url" \
        "$public_planner_en_url" 2>&1); then
        return 0
      fi
    fi
    sleep 3
  done

  [[ -z "$asset_result" ]] || printf '%s\n' "$asset_result" >&2
  return 1
}

wait_for_health_version() {
  local expected_version=$1
  local process_count=${2:-1}
  local actual_version
  local attempt
  local probe
  local probe_count=$(( process_count * 2 ))

  (( probe_count >= 3 )) || probe_count=3

  for attempt in $(seq 1 "$health_attempts"); do
    for probe in $(seq 1 "$probe_count"); do
      actual_version=$(read_health_version || true)
      [[ "$actual_version" == "$expected_version" ]] || break
    done
    if (( probe == probe_count )) && [[ "$actual_version" == "$expected_version" ]]; then
      return 0
    fi
    sleep 3
  done

  return 1
}

capture_health_version() {
  local version
  local attempt

  for attempt in $(seq 1 "$health_attempts"); do
    version=$(read_health_version || true)
    if [[ -n "$version" ]]; then
      printf '%s' "$version"
      return 0
    fi
    sleep 3
  done

  return 1
}

wait_for_root() {
  local process_count=${1:-1}
  local attempt
  local probe
  local probe_count=$(( process_count * 2 ))

  (( probe_count >= 3 )) || probe_count=3

  for attempt in $(seq 1 "$health_attempts"); do
    for probe in $(seq 1 "$probe_count"); do
      curl --fail --silent --show-error --max-time 5 "$root_url" >/dev/null 2>&1 || break
    done
    if (( probe == probe_count )); then
      return 0
    fi
    sleep 3
  done

  return 1
}

get_running_state() {
  pm2 jlist | node -e '
      let input = "";
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (chunk) => { input += chunk; });
      process.stdin.on("end", () => {
        const appName = process.argv[1];
        const lines = input.split(/\r?\n/);
        let processes;

        for (let index = 0; index < lines.length; index += 1) {
          if (!lines[index].trimStart().startsWith("[")) continue;
          try {
            const candidate = JSON.parse(lines.slice(index).join("\n"));
            if (Array.isArray(candidate)) {
              processes = candidate;
              break;
            }
          } catch {
            // PM2 may print a version warning before its JSON document.
          }
        }

        if (!processes) process.exit(2);
        const apps = processes.filter((processInfo) => processInfo.name === appName);
        if (apps.length === 0) {
          process.stdout.write("0");
          return;
        }
        if (apps.some((app) => app?.pm2_env?.status !== "online" || !app?.pm2_env?.pm_exec_path)) {
          process.exit(3);
        }
        const scripts = [...new Set(apps.map((app) => app.pm2_env.pm_exec_path))];
        const cwds = [...new Set(apps.map((app) => app.pm2_env.pm_cwd || ""))];
        const modes = [...new Set(apps.map((app) => app.pm2_env.exec_mode || ""))];
        const versions = [...new Set(apps.map((app) =>
          app.pm2_env.CAMPUS_FRONTEND_RELEASE_SHA ??
          app.pm2_env.env?.CAMPUS_FRONTEND_RELEASE_SHA ??
          "legacy"
        ))];
        if (scripts.length !== 1) process.exit(4);
        if (cwds.length !== 1 || modes.length !== 1 || versions.length !== 1) process.exit(5);
        process.stdout.write([apps.length, scripts[0], cwds[0], modes[0], versions[0]].join("\t"));
      });
    ' "$pm2_app"
}

get_running_script() {
  local state
  state=$(get_running_state) || return 1
  [[ "$state" == 0 ]] && return 0
  state=${state#*$'\t'}
  printf '%s' "${state%%$'\t'*}"
}

wait_for_running_release() {
  local expected_script=$1
  local expected_cwd=$2
  local expected_mode=$3
  local expected_instances=$4
  local expected_release_sha=$5
  local state
  local count
  local script
  local cwd
  local mode
  local release_sha
  local remainder
  local attempt

  for attempt in $(seq 1 "$health_attempts"); do
    state=$(get_running_state || true)
    count=${state%%$'\t'*}
    remainder=${state#*$'\t'}
    script=${remainder%%$'\t'*}
    remainder=${remainder#*$'\t'}
    cwd=${remainder%%$'\t'*}
    remainder=${remainder#*$'\t'}
    mode=${remainder%%$'\t'*}
    release_sha=${remainder#*$'\t'}
    if [[ "$state" == *$'\t'* && "$count" =~ ^[1-9][0-9]*$ && \
      "$script" == "$expected_script" && "$cwd" == "$expected_cwd" && \
      "$mode" == "$expected_mode" && "$release_sha" == "$expected_release_sha" && \
      ( ( "$expected_instances" == "max" && "$count" == "$expected_max_instances" ) || \
        ( "$expected_instances" != "max" && "$count" == "$expected_instances" ) ) ]]; then
      printf '%s' "$count"
      return 0
    fi
    sleep 3
  done
  return 1
}

validate_pm2_config() {
  local config_path=$1
  local expected_script=$2
  local expected_cwd=$3
  local expected_mode=$4
  local expected_instances=$5
  local expected_release_sha=$6
  local expected_error_file=""
  local expected_out_file=""

  if [[ "$pm2_config_relative" == "deploy/ecosystem.prod.config.cjs" ]]; then
    expected_error_file="/var/unikorn/prod_pm2_log/pm2-error.log"
    expected_out_file="/var/unikorn/prod_pm2_log/pm2-out.log"
  fi

  node --check "$config_path" >/dev/null || return 1
  CAMPUS_FRONTEND_ROOT="$app_root" \
    CAMPUS_FRONTEND_PORT="$port" \
    CAMPUS_FRONTEND_PM2_APP="$pm2_app" \
    CAMPUS_FRONTEND_RELEASE_SHA="$expected_release_sha" \
    node - "$config_path" "$pm2_app" "$expected_script" "$expected_cwd" "$port" "$expected_mode" "$expected_instances" "$expected_release_sha" "$expected_error_file" "$expected_out_file" <<'NODE'
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const [
  configPath,
  appName,
  expectedScript,
  expectedCwd,
  expectedPort,
  expectedMode,
  expectedInstances,
  expectedReleaseSha,
  expectedErrorFile,
  expectedOutFile,
] = process.argv.slice(2);
const moduleRecord = { exports: {} };
const source = fs.readFileSync(configPath, "utf8");
vm.runInNewContext(source, {
  module: moduleRecord,
  exports: moduleRecord.exports,
  require: (specifier) => {
    if (specifier !== "node:path") throw new Error(`unsupported PM2 config import: ${specifier}`);
    return path;
  },
  process: { env: process.env },
  __dirname: path.dirname(configPath),
  __filename: configPath,
}, { filename: configPath, timeout: 1000 });
const apps = moduleRecord.exports?.apps;
if (!Array.isArray(apps)) process.exit(2);
const matches = apps.filter((app) => app?.name === appName);
if (matches.length !== 1) process.exit(3);
const app = matches[0];
const cwd = path.resolve(app.cwd || path.dirname(configPath));
const script = path.resolve(cwd, app.script || "");
if (cwd !== expectedCwd || script !== expectedScript) process.exit(4);
if (String(app.env?.PORT) !== expectedPort || app.env?.NODE_ENV !== "production") process.exit(5);
if (app.exec_mode !== expectedMode || String(app.instances) !== expectedInstances) process.exit(6);
if (expectedReleaseSha !== "legacy" && app.env?.CAMPUS_FRONTEND_RELEASE_SHA !== undefined && app.env.CAMPUS_FRONTEND_RELEASE_SHA !== expectedReleaseSha) process.exit(7);
if (expectedErrorFile || expectedOutFile) {
  if (!expectedErrorFile || !expectedOutFile) process.exit(8);
  if (typeof app.error_file !== "string" || app.error_file !== expectedErrorFile) process.exit(8);
  if (typeof app.out_file !== "string" || app.out_file !== expectedOutFile) process.exit(9);
}
NODE
}

reload_app() {
  local config_path=$1
  local expected_mode=$2
  local expected_instances=$3
  local release_sha=$4
  local expected_script="$app_root/current/.output/server/index.mjs"
  local running_script

  validate_pm2_config "$config_path" "$expected_script" "$app_root/current" "$expected_mode" "$expected_instances" "$release_sha" || return 1
  running_script=$(get_running_script) || return 1

  if [[ -n "$running_script" && "$running_script" != "$expected_script" ]]; then
    echo "Migrating $pm2_app from $running_script to $expected_script"
    pm2 delete "$pm2_app" || return 1
    running_script=""
  fi

  if [[ -z "$running_script" ]]; then
      CAMPUS_FRONTEND_ROOT="$app_root" \
      CAMPUS_FRONTEND_PORT="$port" \
      CAMPUS_FRONTEND_PM2_APP="$pm2_app" \
      CAMPUS_FRONTEND_RELEASE_SHA="$release_sha" \
      pm2 start "$config_path" --only "$pm2_app" --update-env
  else
      CAMPUS_FRONTEND_ROOT="$app_root" \
      CAMPUS_FRONTEND_PORT="$port" \
      CAMPUS_FRONTEND_PM2_APP="$pm2_app" \
      CAMPUS_FRONTEND_RELEASE_SHA="$release_sha" \
      pm2 startOrReload "$config_path" --only "$pm2_app" --update-env
  fi
}

start_known_config() {
  local config_path=$1
  local release_sha=$2

  CAMPUS_FRONTEND_ROOT="$app_root" \
    CAMPUS_FRONTEND_PORT="$port" \
    CAMPUS_FRONTEND_PM2_APP="$pm2_app" \
    CAMPUS_FRONTEND_RELEASE_SHA="$release_sha" \
    pm2 start "$config_path" --only "$pm2_app" --update-env
}

rollback() {
  local previous_target=$1
  local previous_config_path=$2
  local previous_exec_path=$3
  local previous_health_version=$4
  local previous_mode=$5
  local previous_instances=$6
  local previous_pm2_release_sha=${7:-$previous_health_version}
  local legacy_script="$app_root/.output/server/index.mjs"
  local running_script
  local process_count

  echo "Deployment failed; rolling back $pm2_app to $previous_target" >&2
  if [[ -n "$previous_target" ]]; then
    activate "$previous_target"
    pm2 delete "$pm2_app" >/dev/null 2>&1 || true
    if [[ "$previous_target" == "releases/legacy-in-place" && "$previous_exec_path" == "$legacy_script" ]]; then
      validate_pm2_config "$legacy_frozen_config" "$legacy_script" "$app_root" "$previous_mode" "$previous_instances" "legacy" || return 1
      start_known_config "$legacy_frozen_config" "legacy" || return 1
      process_count=$(wait_for_running_release "$legacy_script" "$app_root" "${previous_mode}_mode" "$previous_instances" "legacy") || return 1
      wait_for_root "$process_count" || return 1
    else
      validate_pm2_config \
        "$previous_config_path" \
        "$app_root/current/.output/server/index.mjs" \
        "$app_root/current" \
        "$previous_mode" \
        "$previous_instances" \
        "$previous_health_version" || return 1
      start_known_config "$previous_config_path" "$previous_health_version" || return 1
      [[ -n "$previous_health_version" ]] || return 1
      process_count=$(wait_for_running_release "$app_root/current/.output/server/index.mjs" "$app_root/current" "${previous_mode}_mode" "$previous_instances" "$previous_health_version") || return 1
      wait_for_health_version "$previous_health_version" "$process_count" || return 1
    fi
    pm2 save --force >/dev/null
  else
    rm -f -- "$current_link"
    pm2 delete "$pm2_app" >/dev/null 2>&1 || true
    pm2 save --force >/dev/null
  fi
}

activation_committed=false
rollback_in_progress=false
previous_target=""
previous_config_path=""
previous_exec_path=""
previous_health_version=""
previous_mode=""
previous_instances=""
previous_pm2_release_sha=""

perform_rollback() {
  if [[ "$rollback_in_progress" == true ]]; then
    return 1
  fi
  rollback_in_progress=true
  if rollback "$previous_target" "$previous_config_path" "$previous_exec_path" "$previous_health_version" "$previous_mode" "$previous_instances" "$previous_pm2_release_sha"; then
    activation_committed=false
    rollback_in_progress=false
    return 0
  fi
  rollback_in_progress=false
  return 1
}

handle_termination() {
  local signal_name=$1
  local exit_code=$2

  if [[ "$rollback_in_progress" == true ]]; then
    echo "atomic-release: ignoring $signal_name while rollback is already in progress" >&2
    return 0
  fi
  if [[ "$activation_committed" == true ]]; then
    echo "atomic-release: received $signal_name after activation; restoring the previous release" >&2
    if ! perform_rollback; then
      echo "atomic-release: rollback after $signal_name failed" >&2
      exit 1
    fi
  fi
  exit "$exit_code"
}

handle_exit() {
  local exit_code=$?
  trap - EXIT
  if (( exit_code != 0 )) && [[ "$activation_committed" == true && "$rollback_in_progress" == false ]]; then
    echo "atomic-release: unexpected failure after activation; restoring the previous release" >&2
    perform_rollback || exit 1
  fi
  exit "$exit_code"
}

trap 'handle_termination HUP 129' HUP
trap 'handle_termination INT 130' INT
trap 'handle_termination TERM 143' TERM
trap handle_exit EXIT

if [[ -e "$current_link" && ! -L "$current_link" ]]; then
  die "$current_link exists but is not a symlink"
fi

# First migration: retain the historical in-place .output as a no-copy fallback.
# It is intentionally not removed or modified by this script.
if [[ ! -L "$current_link" && -f "$app_root/.output/server/index.mjs" ]]; then
  [[ -f "$legacy_config_path" ]] || die "legacy PM2 config is missing"
  legacy_state=$(get_running_state) || die "could not inspect the legacy PM2 processes"
  [[ "$legacy_state" == *$'\t'* ]] || die "legacy bundle exists but its PM2 process is not running"
  legacy_count=${legacy_state%%$'\t'*}
  legacy_remainder=${legacy_state#*$'\t'}
  legacy_exec=${legacy_remainder%%$'\t'*}
  legacy_remainder=${legacy_remainder#*$'\t'}
  legacy_cwd=${legacy_remainder%%$'\t'*}
  legacy_remainder=${legacy_remainder#*$'\t'}
  legacy_mode=${legacy_remainder%%$'\t'*}
  legacy_release_sha=${legacy_remainder#*$'\t'}
  [[ "$legacy_count" =~ ^[1-9][0-9]*$ && "$legacy_exec" == "$app_root/.output/server/index.mjs" && \
    "$legacy_cwd" == "$app_root" && "$legacy_release_sha" == "legacy" ]] ||
    die "legacy PM2 processes do not match the in-place deployment"
  legacy_instances="$legacy_count"
  [[ "$legacy_mode" == "cluster_mode" ]] && legacy_instances="max"
  [[ "$legacy_mode" == "fork_mode" && "$legacy_count" == 1 ]] || [[ "$legacy_mode" == "cluster_mode" ]] ||
    die "legacy PM2 topology is unsupported"
  validate_pm2_config \
    "$legacy_config_path" \
    "$app_root/.output/server/index.mjs" \
    "$app_root" \
    "${legacy_mode%_mode}" \
    "$legacy_instances" \
    "legacy" || die "legacy PM2 config does not match the running topology"
  wait_for_root "$legacy_count" || die "legacy release root is not healthy before deployment"
  if [[ -e "$legacy_frozen_config" && ! -f "$legacy_frozen_config" ]]; then
    die "legacy frozen PM2 config exists but is not a regular file"
  fi
  if [[ -f "$legacy_frozen_config" ]]; then
    cmp -s "$legacy_config_path" "$legacy_frozen_config" ||
      die "legacy frozen PM2 config differs from the active config"
  else
    install -m 0444 "$legacy_config_path" "$legacy_frozen_config"
  fi
  if [[ -e "$legacy_release" && ! -L "$legacy_release" ]]; then
    die "$legacy_release exists but is not a symlink"
  fi
  if [[ -L "$legacy_release" ]]; then
    [[ $(readlink "$legacy_release") == "$app_root" ]] || die "legacy fallback points somewhere unexpected"
  else
    ln -s "$app_root" "$legacy_release"
  fi
  activate "releases/legacy-in-place"
fi

if [[ -L "$current_link" ]]; then
  previous_target=$(readlink "$current_link")
  [[ "$previous_target" == "releases/legacy-in-place" || "$previous_target" =~ ^releases/[0-9a-f]{40}-[0-9]+-[0-9]+$ ]] ||
    die "current symlink points to an invalid release: $previous_target"
  if [[ "$previous_target" == "releases/legacy-in-place" ]]; then
    [[ -L "$app_root/$previous_target" && $(readlink "$app_root/$previous_target") == "$app_root" ]] ||
      die "legacy fallback is invalid"
  else
    [[ -d "$app_root/$previous_target" && ! -L "$app_root/$previous_target" ]] ||
      die "current release is missing or is not a real directory"
  fi
fi

previous_exec_path=$(get_running_script) || die "could not inspect the existing PM2 process"
if [[ -z "$previous_target" && -n "$previous_exec_path" ]]; then
  die "PM2 process exists without a managed or legacy release target"
fi
if [[ -n "$previous_target" ]]; then
  [[ -n "$previous_exec_path" ]] || die "current release has no running PM2 process"
  if [[ "$previous_target" == "releases/legacy-in-place" ]]; then
    legacy_script="$app_root/.output/server/index.mjs"
    [[ -f "$legacy_config_path" ]] || die "legacy PM2 config is missing"
    previous_state=$(get_running_state) || die "could not inspect legacy PM2 topology"
    previous_process_count=${previous_state%%$'\t'*}
    previous_remainder=${previous_state#*$'\t'}
    previous_remainder=${previous_remainder#*$'\t'}
    previous_remainder=${previous_remainder#*$'\t'}
    previous_pm2_mode=${previous_remainder%%$'\t'*}
    previous_mode=${previous_pm2_mode%_mode}
    previous_instances="$previous_process_count"
    [[ "$previous_mode" == "cluster" ]] && previous_instances="max"
    [[ -f "$legacy_frozen_config" ]] || die "legacy frozen PM2 config is missing"
    validate_pm2_config "$legacy_frozen_config" "$legacy_script" "$app_root" "$previous_mode" "$previous_instances" "legacy" ||
      die "legacy PM2 config does not match the running production topology"
    [[ "$previous_exec_path" == "$legacy_script" ]] ||
      die "legacy release is not running from its expected script"
    previous_process_count=$(wait_for_running_release "$legacy_script" "$app_root" "$previous_pm2_mode" "$previous_instances" "legacy") ||
      die "legacy release PM2 processes are not uniformly online"
    wait_for_root "$previous_process_count" || die "legacy release root is not healthy before deployment"
    previous_config_path="$legacy_frozen_config"
  else
    previous_config_path="$app_root/$previous_target/$pm2_config_relative"
    [[ -f "$previous_config_path" ]] || die "previous release PM2 config is missing"
    previous_state=$(get_running_state) || die "could not inspect current PM2 topology"
    previous_process_count=${previous_state%%$'\t'*}
    previous_remainder=${previous_state#*$'\t'}
    previous_remainder=${previous_remainder#*$'\t'}
    previous_remainder=${previous_remainder#*$'\t'}
    previous_pm2_mode=${previous_remainder%%$'\t'*}
    previous_remainder=${previous_remainder#*$'\t'}
    previous_pm2_release_sha=$previous_remainder
    previous_release_id=${previous_target#releases/}
    previous_health_version=${previous_release_id%%-*}
    [[ "$previous_health_version" =~ ^[0-9a-f]{40}$ ]] || die "previous release target has no valid Git SHA"
    previous_mode=${previous_pm2_mode%_mode}
    previous_instances="$previous_process_count"
    [[ "$previous_mode" == "cluster" ]] && previous_instances="max"
    validate_pm2_config \
      "$previous_config_path" \
      "$app_root/current/.output/server/index.mjs" \
      "$app_root/current" \
      "$previous_mode" \
      "$previous_instances" \
      "$previous_health_version" || die "previous release PM2 config is invalid"
    previous_process_count=$(wait_for_running_release "$app_root/current/.output/server/index.mjs" "$app_root/current" "$previous_pm2_mode" "$previous_instances" "$previous_pm2_release_sha") ||
      die "current release PM2 processes are not uniformly online"
    wait_for_health_version "$previous_health_version" "$previous_process_count" ||
      die "could not verify the current release health identity before deployment"
  fi
fi

new_mode="fork"
new_instances="1"
if [[ "$pm2_config_relative" == "deploy/ecosystem.prod.config.cjs" ]]; then
  new_mode="cluster"
  new_instances="max"
fi
validate_pm2_config \
  "$staging_dir/$pm2_config_relative" \
  "$app_root/current/.output/server/index.mjs" \
  "$app_root/current" \
  "$new_mode" \
  "$new_instances" \
  "$expected_sha" || die "staged PM2 config is invalid"

printf '%s\n' "$expected_sha" > "$staging_dir/.release-complete"
mv -- "$staging_dir" "$release_dir"
release_target="releases/$release_id"
config_path="$release_dir/$pm2_config_relative"
[[ $(<"$release_dir/.release-complete") == "$expected_sha" ]] || die "release completion marker is invalid"
activation_committed=true
activate "$release_target"

if ! reload_app "$config_path" "$new_mode" "$new_instances" "$expected_sha"; then
  pm2 logs "$pm2_app" --nostream --lines 100 || true
  perform_rollback ||
    die "deployment and rollback both failed"
  die "new release did not become healthy; previous release restored"
fi
new_process_count=$(wait_for_running_release "$app_root/current/.output/server/index.mjs" "$app_root/current" "${new_mode}_mode" "$new_instances" "$expected_sha") || {
  pm2 logs "$pm2_app" --nostream --lines 100 || true
  perform_rollback || die "deployment and rollback both failed"
  die "new release did not start all PM2 processes; previous release restored"
}
if ! wait_for_health_version "$expected_sha" "$new_process_count"; then
  pm2 logs "$pm2_app" --nostream --lines 100 || true
  perform_rollback || die "deployment and rollback both failed"
  die "new release did not become healthy; previous release restored"
fi
if ! wait_for_public_acceptance "$expected_sha" "$new_process_count"; then
  pm2 logs "$pm2_app" --nostream --lines 100 || true
  perform_rollback || die "public acceptance and rollback both failed"
  die "public health or release-matched asset acceptance failed; previous release restored"
fi

if ! pm2 save --force >/dev/null; then
  perform_rollback ||
    die "PM2 state save and rollback both failed"
  die "could not persist PM2 state; previous release restored"
fi
activation_committed=false

echo "Release $release_id is healthy; pruning inactive releases..."
kept=0
while IFS=' ' read -r _ release_path; do
  [[ -n "$release_path" ]] || continue
  if [[ "$release_path" == "$release_dir" || "$release_path" == "$releases_root/${previous_target#releases/}" ]]; then
    ((kept += 1))
    continue
  fi
  if (( kept < keep_releases )); then
    ((kept += 1))
    continue
  fi
  release_name=${release_path#"$releases_root"/}
  [[ "$release_name" =~ ^[0-9a-f]{40}-[0-9]+-[0-9]+$ ]] ||
    die "refusing to prune unexpected release path: $release_path"
  rm -rf -- "$release_path"
done < <(find "$releases_root" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -nr)

# Failed uploads never become releases. Remove only strictly named staging
# directories older than a day, after a successful deployment and under lock.
while IFS= read -r -d '' stale_staging; do
  [[ "$stale_staging" == "$staging_dir" ]] && continue
  stale_name=${stale_staging#"$incoming_root"/}
  [[ "$stale_name" =~ ^[0-9a-f]{40}-[0-9]+-[0-9]+$ ]] ||
    die "refusing to prune unexpected staging path: $stale_staging"
  rm -rf -- "$stale_staging"
done < <(find "$incoming_root" -mindepth 1 -maxdepth 1 -type d -mtime +1 -print0)

echo "Activated $release_id for $pm2_app; health reports build $expected_sha"
