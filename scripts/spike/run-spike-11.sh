#!/usr/bin/env bash
# scripts/spike/run-spike-11.sh — SPIKE-11 end to end on a fresh instance.
#
# SPIKE-11 (REQUIREMENTS.md is the ID authority; the spike is absent from
# PITFALLS.md): do browser-cached responses and 304s reach onInterceptResponse
# at all? The answer decides whether FIND-03's retroactive scan is a convenience
# or a correctness requirement.
#
# Owns port 8996 (Caido) and 8083 (origin), per plan 00-03.
#
# Builds a small web root rather than serving the corpus directly, because the
# spike needs HTML wrappers: a `no-store` page per scenario so every navigation
# is a fresh proxied transaction (an in-scenario control that the hook is live),
# and two copies of the same JavaScript under different Cache-Control policies
# so freshness and revalidation can be exercised independently. Per-path
# behaviour comes from origin.py's --headers sidecar, so origin.py itself — a
# plan 00-01 file — is not modified.
set -euo pipefail

export PORT="${PORT:-8996}"
export OUT="${OUT:-.planning/phases/00-runtime-reality-check/results}"
ORIGIN_PORT="${ORIGIN_PORT:-8083}"
SOURCE_JS="${SOURCE_JS:-corpus/ace-1.36.5.js}"

ORIGIN_PID=""
cleanup() {
  [ -n "$ORIGIN_PID" ] && kill -9 "$ORIGIN_PID" 2>/dev/null || true
  if declare -F teardown >/dev/null 2>&1; then teardown || true; fi
}
trap cleanup EXIT

[ -f "$SOURCE_JS" ] || { echo "FATAL: $SOURCE_JS missing — run scripts/spike/fetch-corpus.sh" >&2; exit 1; }

# shellcheck disable=SC1091
source scripts/spike/instance.sh
# shellcheck disable=SC1091
source scripts/spike/probe-run.sh

mkdir -p "$RUN_DIR/raw"
WEBROOT="$RUN_DIR/raw/webroot"
PROFILE="$RUN_DIR/raw/chromium-profile"
rm -rf "$WEBROOT" "$PROFILE"
mkdir -p "$WEBROOT" "$PROFILE"

cp "$SOURCE_JS" "$WEBROOT/fresh.js"
cp "$SOURCE_JS" "$WEBROOT/revalidate.js"

TAG_FILE="$RUN_DIR/raw/markers.txt"
: > "$TAG_FILE"

# The wrapper pages. Each references exactly one resource so a scenario's
# subresource traffic is unambiguous. The `dfm` markers are substituted by the
# driver at request time via the query string it navigates to; the src here
# carries the resource marker, which the driver reads back from markers.txt.
write_page() { # write_page <file> <script-src>
  cat > "$WEBROOT/$1" <<HTML
<!doctype html>
<html><head><meta charset="utf-8"><title>DefMiner SPIKE-11 $1</title></head>
<body><p>SPIKE-11 $1</p>
<script src="$2"></script>
</body></html>
HTML
}

# The driver needs the resource URLs to carry ITS markers, so the tag is minted
# here and handed to the driver, keeping the HTML and the driver in agreement.
TAG="$(date +%s%N | shasum -a 256 | cut -c1-10)"
echo "TAG=$TAG" >> "$TAG_FILE"
write_page p1.html "/fresh.js?dfm=freshres-$TAG"
write_page p2.html "/fresh.js?dfm=freshres-$TAG"
write_page p3.html "/revalidate.js?dfm=revalres-$TAG"
write_page p4.html "/revalidate.js?dfm=revalres-$TAG"

# Per-path behaviour. The HTML wrappers are `no-store` so every navigation is a
# real proxied transaction; fresh.js is cacheable for ten minutes; revalidate.js
# must be revalidated on every use, which is what produces a genuine 304 from a
# genuine cache decision rather than a hand-built conditional request.
cat > "$RUN_DIR/raw/origin-headers.json" <<JSON
{
  "/p1.html": {"content_type": "text/html; charset=utf-8", "cache_control": "no-store"},
  "/p2.html": {"content_type": "text/html; charset=utf-8", "cache_control": "no-store"},
  "/p3.html": {"content_type": "text/html; charset=utf-8", "cache_control": "no-store"},
  "/p4.html": {"content_type": "text/html; charset=utf-8", "cache_control": "no-store"},
  "/fresh.js": {"content_type": "application/javascript", "cache_control": "public, max-age=600"},
  "/revalidate.js": {"content_type": "application/javascript", "cache_control": "no-cache"}
}
JSON

ORIGIN_LOG="$RUN_DIR/raw/origin.log"
python3 scripts/spike/origin.py --dir "$WEBROOT" --port "$ORIGIN_PORT" \
  --headers "$RUN_DIR/raw/origin-headers.json" --verbose > "$ORIGIN_LOG" 2>&1 &
ORIGIN_PID=$!
for i in $(seq 1 30); do
  curl -sf -o /dev/null "http://127.0.0.1:$ORIGIN_PORT/_health" && break
  sleep 0.5
done
curl -sf -o /dev/null "http://127.0.0.1:$ORIGIN_PORT/_health" || {
  echo "FATAL: origin did not come up on 127.0.0.1:$ORIGIN_PORT" >&2; exit 1; }

# The tier0-events probe from task 1, installed UNMODIFIED.
probe_install probe/tier0-events

CACHE_JSON="$RUN_DIR/raw/spike-11-cache.json"
node scripts/spike/cache-browse.mjs \
  --port "$PORT" --run-id "$RUN_ID" --backend "$BACKEND_ID" \
  --origin "127.0.0.1:$ORIGIN_PORT" --profile "$PROFILE" \
  --origin-log "$ORIGIN_LOG" --tag "$TAG" --out "$CACHE_JSON"

echo "RUN_ID=$RUN_ID CACHE_JSON=$CACHE_JSON"
