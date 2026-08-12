#!/usr/bin/env bash

set -Eeuo pipefail
umask 022

usage() {
  cat >&2 <<'EOF'
Usage: atomic-release.sh APP_ROOT RELEASE_ID EXPECTED_SHA PM2_APP PORT [KEEP_RELEASES]

The release must already be uploaded to APP_ROOT/.incoming/RELEASE_ID.
EOF
}

die() {
  echo "atomic-release: $*" >&2
  exit 1
}

if (( $# < 5 || $# > 6 )); then
  usage
  exit 2
fi

app_root=${1%/}
release_id=$2
expected_sha=$3
pm2_app=$4
port=$5
keep_releases=${6:-3}
health_attempts=${DEPLOY_HEALTH_ATTEMPTS:-20}

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
[[ "$health_attempts" =~ ^[0-9]+$ ]] && (( health_attempts >= 1 && health_attempts <= 20 )) ||
  die "DEPLOY_HEALTH_ATTEMPTS must be between 1 and 20"

for command_name in curl flock node pm2 sha256sum; do
  command -v "$command_name" >/dev/null 2>&1 || die "required command not found: $command_name"
done

incoming_root="$app_root/.incoming"
releases_root="$app_root/releases"
staging_dir="$incoming_root/$release_id"
release_dir="$releases_root/$release_id"
current_link="$app_root/current"
legacy_release="$releases_root/legacy-in-place"
pm2_config_relative="deploy/ecosystem.dev.config.cjs"
manifest_relative="deploy/output.sha256"
health_url="http://127.0.0.1:$port/health"
root_url="http://127.0.0.1:$port/"

mkdir -p "$incoming_root" "$releases_root"
exec 9>"$app_root/.deploy.lock"
flock -w 120 9 || die "another deployment still holds $app_root/.deploy.lock"

[[ -d "$staging_dir" && ! -L "$staging_dir" ]] || die "staging directory is missing"
[[ ! -e "$release_dir" && ! -L "$release_dir" ]] || die "release already exists: $release_id"
[[ -f "$staging_dir/.output/server/index.mjs" ]] || die "staged server entry point is missing"
[[ -d "$staging_dir/.output/public/_nuxt" ]] || die "staged Nuxt assets are missing"
[[ -f "$staging_dir/$pm2_config_relative" ]] || die "staged PM2 config is missing"
[[ -f "$staging_dir/$manifest_relative" ]] || die "staged checksum manifest is missing"

node --check "$staging_dir/.output/server/index.mjs" >/dev/null || die "staged server entry point is invalid"
node --check "$staging_dir/$pm2_config_relative" >/dev/null || die "staged PM2 config is invalid"

asset_count=$(find "$staging_dir/.output/public/_nuxt" -type f | wc -l)
(( asset_count >= 10 )) || die "staged Nuxt asset count is unexpectedly low: $asset_count"

echo "Verifying staged release checksums..."
(
  cd "$staging_dir/.output"
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

wait_for_expected_health() {
  local response
  local attempt

  for attempt in $(seq 1 "$health_attempts"); do
    response=$(curl --fail --silent --show-error --max-time 5 "$health_url" 2>/dev/null || true)
    if [[ -n "$response" ]] && node -e '
      const payload = JSON.parse(process.argv[1]);
      const expected = process.argv[2];
      if (payload.status !== "ok" || payload.service !== "campus-forum-frontend" || payload.version !== expected) {
        process.exit(1);
      }
    ' "$response" "$expected_sha" 2>/dev/null; then
      return 0
    fi
    sleep 3
  done

  return 1
}

wait_for_root() {
  local attempt
  for attempt in $(seq 1 10); do
    if curl --fail --silent --show-error --max-time 5 "$root_url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  return 1
}

reload_app() {
  local config_path=$1

  CAMPUS_FRONTEND_ROOT="$app_root" \
    CAMPUS_FRONTEND_PORT="$port" \
    CAMPUS_FRONTEND_PM2_APP="$pm2_app" \
    pm2 startOrReload "$config_path" --only "$pm2_app" --update-env
}

rollback() {
  local previous_target=$1
  local config_path=$2

  echo "Deployment failed; rolling back $pm2_app to $previous_target" >&2
  if [[ -n "$previous_target" ]]; then
    activate "$previous_target"
    reload_app "$config_path" || return 1
    wait_for_root || return 1
    pm2 save --force >/dev/null
  else
    rm -f -- "$current_link"
    pm2 delete "$pm2_app" >/dev/null 2>&1 || true
    pm2 save --force >/dev/null
  fi
}

if [[ -e "$current_link" && ! -L "$current_link" ]]; then
  die "$current_link exists but is not a symlink"
fi

# First migration: retain the historical in-place .output as a no-copy fallback.
# It is intentionally not removed or modified by this script.
if [[ ! -L "$current_link" && -f "$app_root/.output/server/index.mjs" ]]; then
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

previous_target=""
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

printf '%s\n' "$expected_sha" > "$staging_dir/.release-complete"
mv -- "$staging_dir" "$release_dir"
release_target="releases/$release_id"
config_path="$release_dir/$pm2_config_relative"
[[ $(<"$release_dir/.release-complete") == "$expected_sha" ]] || die "release completion marker is invalid"
activate "$release_target"

if ! reload_app "$config_path" || ! wait_for_expected_health; then
  pm2 logs "$pm2_app" --nostream --lines 100 || true
  rollback "$previous_target" "$config_path" || die "deployment and rollback both failed"
  die "new release did not become healthy; previous release restored"
fi

if ! pm2 save --force >/dev/null; then
  rollback "$previous_target" "$config_path" || die "PM2 state save and rollback both failed"
  die "could not persist PM2 state; previous release restored"
fi

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
