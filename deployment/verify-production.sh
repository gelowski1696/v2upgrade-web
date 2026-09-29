#!/usr/bin/env sh
set -eu

owner_url="${OWNER_URL:-https://vmjamdocuai.cloud}"
work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT INT TERM

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

fetch() {
  url="$1"
  prefix="$2"
  curl --fail --silent --show-error \
    --dump-header "$work_dir/$prefix.headers" \
    --output "$work_dir/$prefix.body" \
    "$url"
}

header_count() {
  header_name="$1"
  header_file="$2"
  awk -v expected="$header_name" '
    BEGIN { count = 0 }
    {
      name = $1
      sub(/:$/, "", name)
      if (tolower(name) == tolower(expected)) count += 1
    }
    END { print count }
  ' "$header_file"
}

header_value() {
  header_name="$1"
  header_file="$2"
  awk -v expected="$header_name" '
    {
      name = $1
      sub(/:$/, "", name)
      if (tolower(name) == tolower(expected)) {
        sub(/^[^:]+:[[:space:]]*/, "")
        sub(/\r$/, "")
        print
      }
    }
  ' "$header_file"
}

assert_single_header() {
  header_name="$1"
  expected_text="$2"
  header_file="$3"
  count="$(header_count "$header_name" "$header_file")"
  [ "$count" -eq 1 ] || fail "$header_name must occur once; found $count"
  value="$(header_value "$header_name" "$header_file")"
  printf '%s' "$value" | grep -Fqi "$expected_text" || \
    fail "$header_name does not contain: $expected_text"
}

fetch "${owner_url%/}/" index

assert_single_header "Content-Security-Policy" "script-src 'self'" "$work_dir/index.headers"
assert_single_header "Referrer-Policy" "strict-origin-when-cross-origin" "$work_dir/index.headers"
assert_single_header "X-Content-Type-Options" "nosniff" "$work_dir/index.headers"
assert_single_header "X-Frame-Options" "DENY" "$work_dir/index.headers"
assert_single_header "X-Robots-Tag" "noindex" "$work_dir/index.headers"
assert_single_header "Cache-Control" "no-store" "$work_dir/index.headers"

if grep -Fq 'onload="this.media=' "$work_dir/index.body"; then
  fail "index.html still contains the CSP-incompatible stylesheet loader"
fi

stylesheet="$(sed -n 's/.*<link rel="stylesheet" href="\([^"]*\.css\)".*/\1/p' "$work_dir/index.body" | head -n 1)"
[ -n "$stylesheet" ] || fail "no stylesheet link was found in index.html"

fetch "${owner_url%/}/${stylesheet#/}" stylesheet
assert_single_header "Content-Type" "text/css" "$work_dir/stylesheet.headers"
assert_single_header "Cache-Control" "immutable" "$work_dir/stylesheet.headers"

fetch "${owner_url%/}/healthz" health
grep -Fqx 'ok' "$work_dir/health.body" || fail "health endpoint did not return ok"

fetch "${owner_url%/}/build-info.json" build_info
assert_single_header "Cache-Control" "no-store" "$work_dir/build_info.headers"
grep -Eq '"app"[[:space:]]*:[[:space:]]*"owner-dashboard"' "$work_dir/build_info.body" || \
  fail "web build information is missing or invalid"
grep -Eq '"release"[[:space:]]*:[[:space:]]*"[^"]+"' "$work_dir/build_info.body" || \
  fail "web release identifier is missing"

request_id="posv2-smoke-$(date +%s)"
curl --fail --silent --show-error \
  --header "X-Request-ID: $request_id" \
  --dump-header "$work_dir/api_health.headers" \
  --output "$work_dir/api_health.body" \
  "${owner_url%/}/api/v1/health"
assert_single_header "X-Request-ID" "$request_id" "$work_dir/api_health.headers"
grep -Eq '"status"[[:space:]]*:[[:space:]]*"ok"' "$work_dir/api_health.body" || \
  fail "API health status is not ok"
grep -Eq '"service"[[:space:]]*:[[:space:]]*"subsapi"' "$work_dir/api_health.body" || \
  fail "API service identity is missing"
grep -Eq '"release"[[:space:]]*:[[:space:]]*"[^"]+"' "$work_dir/api_health.body" || \
  fail "API release identifier is missing"

printf 'PASS: production headers, caching, release metadata, request IDs, and health are valid for %s\n' "$owner_url"
