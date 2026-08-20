#!/usr/bin/env bash
# scripts/spike/fetch-corpus.sh [dir] — idempotent, fails CLOSED on hash mismatch.
#
# Threat T-00-12: these are seven unreviewed minified bundles from a CDN entering
# the measurement path. Every one is pinned to an immutable versioned jsDelivr
# path AND gated on SHA-256; a mismatch deletes the file and exits non-zero
# rather than measuring something nobody chose.
#
# Corpus content is read, hashed and pattern-matched but NEVER evaluated: `eval`
# and `new Function` appear in no probe in this phase.
#
# The script and its hashes are committed; the ~22 MB of vendor JS is gitignored.
set -euo pipefail

DIR="${1:-corpus}"
mkdir -p "$DIR"
cd "$DIR"
CDN="https://cdn.jsdelivr.net/npm"

fetch() { # <local> <sha256> <cdn-path>
  local f="$1" want="$2" p="$3" got
  if [ ! -f "$f" ]; then
    curl -fsSL --retry 3 --max-time 300 "$CDN/$p" -o "$f"
  fi
  got="$(shasum -a 256 "$f" | cut -d' ' -f1)"
  if [ "$got" != "$want" ]; then
    echo "HASH MISMATCH $f" >&2
    echo "  want $want" >&2
    echo "  got  $got" >&2
    rm -f "$f"
    exit 1
  fi
  printf '  %-24s %9d B  ok\n' "$f" "$(wc -c < "$f")"
}

fetch ace-1.36.5.js     519c9f3866177fe911c7a065a5f30868892a970b69a79b52a98b01fb441f680e "ace-builds@1.36.5/src-min-noconflict/ace.js"
fetch echarts-5.5.1.js  e84270bd0cd5bdf60fefc26d00c2a391cb2e81f4d26a7a9ee16185a54773a3cf "echarts@5.5.1/dist/echarts.min.js"
fetch tfjs-4.22.0.js    300dfae273d20b4046f46a06d735688f03675a807561e9bcb5f664eb2f3d2831 "@tensorflow/tfjs@4.22.0/dist/tf.min.js"
fetch babel-7.26.4.js   a12872ea8da3d29b2a296c51bfac7c482e81419c755f2207a49ad9b77200f4ea "@babel/standalone@7.26.4/babel.min.js"
fetch monaco-0.52.2.js  90b588bc0b624e24052a576e1bcab2eaffec7bc666895188862eebd9c9745782 "monaco-editor@0.52.2/min/vs/editor/editor.main.js"
fetch plotly-2.35.2.js  6d21266ce1bd7d9e5ab4e115989c70c20de0382fd973a8f26ab58619eba4d603 "plotly.js-dist-min@2.35.2/plotly.min.js"
fetch cesium-1.124.0.js 7520b29545f5803c1f690650545d84d1bf5c25ce3c47ca65a43059604cdf1f58 "cesium@1.124.0/Build/Cesium/Cesium.js"

# The 8 MB tier is TWO DISTINCT BUNDLES concatenated, not one bundle repeated.
# Self-concatenation gives an unrepresentatively small distinct-literal set,
# which flatters BOTH the literal prefilter and the content-hash cache and would
# make ReDoS measurements optimistic too.
#
# Be honest about what this tier is: a single 8 MB minified JS file is genuinely
# rare in the wild. The largest real single artifacts found were Cesium at
# 4.90 MB and Plotly at 4.35 MB. 8 MB is an UPPER STRESS BOUND, not a realistic
# sample, and must be labelled as such wherever it appears in the go/no-go table.
cat monaco-0.52.2.js plotly-2.35.2.js > composite-8mb.js
printf '  %-24s %9d B  (derived: monaco || plotly, two distinct bundles)\n' \
  composite-8mb.js "$(wc -c < composite-8mb.js)"
