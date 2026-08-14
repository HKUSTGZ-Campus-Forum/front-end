#!/usr/bin/env bash

set -Eeuo pipefail
umask 077

usage() {
  cat >&2 <<'EOF'
Usage: verify-public-assets.sh PUBLIC_DIR PAGE_URL [PAGE_URL ...]

Fetch each HTTPS page, extract its same-origin Nuxt JavaScript and CSS paths,
and require every public response to match the corresponding built file byte
for byte.
EOF
}

die() {
  echo "verify-public-assets: $*" >&2
  exit 1
}

(( $# >= 2 )) || {
  usage
  exit 2
}

public_dir=${1%/}
shift

[[ "$public_dir" != "/" && "$public_dir" != *[[:space:]]* ]] ||
  die "PUBLIC_DIR must be a non-root path without whitespace"
[[ -d "$public_dir" && ! -L "$public_dir" ]] || die "PUBLIC_DIR must be a real directory"
public_dir=$(cd -- "$public_dir" && pwd -P)
[[ -d "$public_dir/_nuxt" && ! -L "$public_dir/_nuxt" ]] ||
  die "PUBLIC_DIR/_nuxt must be a real directory"

for command_name in cat cmp curl grep mktemp node rm sort; do
  command -v "$command_name" >/dev/null 2>&1 || die "required command not found: $command_name"
done

work_dir=$(mktemp -d /tmp/unikorn-public-assets.XXXXXX)
cleanup() {
  rm -rf -- "$work_dir"
}
trap cleanup EXIT

all_assets="$work_dir/all-assets"
: > "$all_assets"
expected_origin=""
page_index=0

for page_url in "$@"; do
  [[ "$page_url" == https://* && "$page_url" != *[[:space:]]* ]] ||
    die "PAGE_URL must be a whitespace-free HTTPS URL"

  page_origin=$(node -e '
      const url = new URL(process.argv[1]);
      if (url.protocol !== "https:" || url.username || url.password) process.exit(1);
      process.stdout.write(url.origin);
    ' "$page_url") || die "PAGE_URL is invalid: $page_url"
  if [[ -z "$expected_origin" ]]; then
    expected_origin=$page_origin
  elif [[ "$page_origin" != "$expected_origin" ]]; then
    die "all PAGE_URL values must use the same origin"
  fi

  page_html="$work_dir/page-$page_index.html"
  page_assets="$work_dir/page-$page_index.assets"
  curl --fail --silent --show-error --max-time 10 \
    -H 'Accept-Encoding: identity' \
    -H 'Cache-Control: no-cache' \
    -o "$page_html" \
    "$page_url" || die "could not fetch page: $page_url"

  node - "$page_html" > "$page_assets" <<'NODE'
const fs = require("node:fs");
const html = fs.readFileSync(process.argv[2], "utf8");
const pattern = /\/_nuxt\/[-A-Za-z0-9_][A-Za-z0-9_.-]*\.(?:js|css)(?=[?#"'()< >\s]|$)/g;
const assets = [...new Set(html.match(pattern) ?? [])].sort();
if (assets.length === 0) process.exit(1);
process.stdout.write(`${assets.join("\n")}\n`);
NODE
  [[ -s "$page_assets" ]] || die "page references no supported Nuxt assets: $page_url"
  cat "$page_assets" >> "$all_assets"
  ((page_index += 1))
done

LC_ALL=C sort -u "$all_assets" -o "$all_assets"
grep -Eq '\.js$' "$all_assets" || die "pages reference no Nuxt JavaScript assets"
grep -Eq '\.css$' "$all_assets" || die "pages reference no Nuxt CSS assets"

asset_count=0
while IFS= read -r asset_path; do
  [[ "$asset_path" =~ ^/_nuxt/[-A-Za-z0-9_][A-Za-z0-9_.-]*\.(js|css)$ ]] ||
    die "unsupported asset path: $asset_path"
  expected_file="$public_dir$asset_path"
  [[ -f "$expected_file" && ! -L "$expected_file" ]] ||
    die "built asset must be a regular nonsymlink file: $asset_path"

  response_file="$work_dir/response-$asset_count"
  curl --fail --silent --show-error --max-time 10 \
    -H 'Accept-Encoding: identity' \
    -H 'Cache-Control: no-cache' \
    -o "$response_file" \
    "$expected_origin$asset_path" || die "public asset is unavailable: $asset_path"
  cmp -s -- "$expected_file" "$response_file" ||
    die "public asset does not match the active build: $asset_path"
  ((asset_count += 1))
done < "$all_assets"

(( asset_count >= 2 )) || die "too few public assets were verified"
printf 'verified_public_assets=%s origin=%s\n' "$asset_count" "$expected_origin"
