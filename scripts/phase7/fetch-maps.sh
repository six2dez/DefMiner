#!/usr/bin/env bash
# scripts/phase7/fetch-maps.sh [dir] — the Phase 7 map corpus. Idempotent, fails
# CLOSED on hash mismatch. Copied in shape from scripts/spike/fetch-corpus.sh,
# which is Phase 0's and is not modified here.
#
# WHY THIS SCRIPT EXISTS AT ALL, stated because the obvious alternative is wrong.
# RESEARCH § Pitfall 8 measured it: NO pinned corpus bundle carries an INLINE
# map. Three announce an EXTERNAL `.map` and five announce nothing. D-01 consumes
# only the inline path, so the entire corpus exercises zero of what this phase
# does. The fixtures therefore do not exist and have to be built.
#
# WHY THE BYTES ARE NOT COMMITTED, and why RESEARCH § O-03's `corpus/maps/`
# instruction is NOT followed. `corpus/` is gitignored IN ITS ENTIRETY
# (.gitignore:9 — check with `git check-ignore -v corpus/`). Bytes written there
# do not survive a clean checkout, so committing fixtures under it would be a
# claim rather than an artifact. 07-PATTERNS.md names the two homes that ARE
# tracked, and the corpus splits across both by SIZE:
#
#   LARGE real maps (megabyte scale, needed only by the probe) -> THIS SCRIPT and
#   its committed SHA-256 hashes, in the fetch-corpus.sh idiom. The script and
#   the hashes are the reproducible artifact; the ~37 MB of vendor JSON is not.
#
#   SMALL hostile and structural fixtures (needed by CI on every commit, with no
#   network) -> packages/engine/src/sourcemap/map-fixture.ts as string literals,
#   in the hostile.fixture.ts idiom.
#
# Threat T-07-18: three unreviewed minified sourcemaps from a CDN entering the
# measurement path. Every one is pinned to an IMMUTABLE VERSIONED jsDelivr path
# AND gated on a committed SHA-256; a mismatch deletes the file and exits
# non-zero rather than measuring something nobody chose. Map content is read,
# hashed, base64-encoded and JSON-parsed but NEVER evaluated: `eval` and
# `new Function` appear in no probe in this phase.
#
# The three `.map` files pair with the pinned bundle VERSIONS already in
# scripts/spike/fetch-corpus.sh, so the map corpus and the bundle corpus describe
# the same three artifacts rather than two unrelated version sets.
set -euo pipefail

# The caller's directory, captured BEFORE the `cd` below. Every SYNTH path is
# resolved against it, so a driver can pass repo-relative paths without having
# to know that the fetch half of this script runs from inside the target dir.
INVOKED_FROM="$(pwd)"
DIR="${1:-.spike/maps}"
mkdir -p "$DIR"
cd "$DIR"
CDN="https://cdn.jsdelivr.net/npm"

fetch() { # <local> <sha256> <cdn-path>
  local f="$1" want="$2" p="$3" got
  if [ ! -f "$f" ]; then
    curl -fsSL --retry 3 --max-time 600 "$CDN/$p" -o "$f"
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

fetch monaco-0.52.2.js.map 8a8d82a3c25f592a7184bdbc293c3c4b5c981657c173907a62f265729975a731 \
  "monaco-editor@0.52.2/min-maps/vs/editor/editor.main.js.map"
fetch babel-7.26.4.js.map  21b2977ec753fb8465e92a5cfa1fe36d9677f92aea59616b77491f8372d60973 \
  "@babel/standalone@7.26.4/babel.min.js.map"
fetch tfjs-4.22.0.js.map   f34dc381fd183c3905fa431e59656cb6da8e882e3acd893fafb28f45833bc836 \
  "@tensorflow/tfjs@4.22.0/dist/tf.min.js.map"

# ---------------------------------------------------------------------------
# synth <source.map> <decoded-bytes> <out.js>
#
# Wrap a REAL map as an INLINE-map JS fixture whose decoded map JSON is EXACTLY
# <decoded-bytes> long. Real, not generated: RESEARCH § O-03 is explicit that
# `JSON.parse` cost depends on the string-vs-structure ratio and a map is ~90%
# long string literals in `sourcesContent`, which is not what a generic JSON
# fixture looks like.
#
# Exactness matters because the ladder point IS the x-axis of the measurement.
# "roughly 1.5 MB" makes the ms/MB slope an estimate of an estimate.
#
# THE EMITTED SHAPE IS MONACO'S, and deliberately: the announcement is the LAST
# LINE and there is NO TRAILING NEWLINE. That property is what broke
# corpus/composite-8mb.js (SPIKE-06 notes: monaco's `//# sourceMappingURL`
# comment with no trailing newline swallowed plotly's opening `/**`), and it is
# the same property the announcement scanner must be robust to — an announcement
# is only an announcement if it is on the last line.
# ---------------------------------------------------------------------------
synth() {
  local src="$1" want="$2" out="$3"
  python3 - "$src" "$want" "$out" <<'PY'
import base64, json, os, sys

src, want, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]
m = json.load(open(src))

COMPACT = (",", ":")


def dump(doc):
    # ensure_ascii=False so a non-ASCII byte in sourcesContent stays a non-ASCII
    # byte. Escaping it would make the encoded length differ from the decoded
    # length in a way the ladder point would silently absorb, and it would also
    # remove the exact Pitfall 4 hazard (atob's latin1 corruption) that the
    # b64_decode_atob vs b64_decode_buffer comparison exists to expose.
    return json.dumps(doc, separators=COMPACT, ensure_ascii=False).encode("utf-8")


sources = m.get("sources") or []
contents = m.get("sourcesContent") or []
mappings = m.get("mappings") or ""

# Scale `mappings` in PROPORTION to the target rather than keeping it whole. A
# 0.5 MB point carrying monaco's full 3.67 MB mappings string is not a 0.5 MB
# map. Cut at a `;` (a generated-line boundary) so the string stays a
# well-formed sequence of segments rather than half a VLQ digit.
ratio = min(1.0, want / max(1, len(dump(m))))
cut = int(len(mappings) * ratio)
cut = mappings.rfind(";", 0, cut + 1)
mappings = mappings[: cut + 1] if cut > 0 else ""

doc = {
    "version": m.get("version", 3),
    "file": m.get("file", os.path.basename(src).replace(".map", "")),
    "sources": [],
    "sourcesContent": [],
    "names": [],
    "mappings": mappings,
}

# Grow by whole source entries until one more would overshoot, then land EXACTLY
# on `want` by sizing the final entry's body. Padding uses "x", which JSON does
# not escape, so one character is one byte and the arithmetic below is exact.
n = len(dump(doc))
i = 0
while i < len(sources):
    entry = contents[i] if i < len(contents) else None
    if not isinstance(entry, str):
        i += 1
        continue
    trial = dict(doc)
    trial["sources"] = doc["sources"] + [sources[i]]
    trial["sourcesContent"] = doc["sourcesContent"] + [entry]
    size = len(dump(trial))
    if size > want:
        break
    doc, n = trial, size
    i += 1

# The final entry, sized to close the remaining gap exactly.
label = sources[i] if i < len(sources) else "defminer://synthetic/pad.js"
probe = dict(doc)
probe["sources"] = doc["sources"] + [label]
probe["sourcesContent"] = doc["sourcesContent"] + [""]
base = len(dump(probe))
pad = want - base
if pad < 0:
    sys.exit(
        "synth: cannot reach %d bytes from %s — the empty-tail skeleton is "
        "already %d bytes. Raise the target or pick a smaller source map." % (want, src, base)
    )
probe["sourcesContent"][-1] = "x" * pad
blob = dump(probe)

if len(blob) != want:
    sys.exit(
        "synth: landed on %d bytes, wanted %d. The padding arithmetic assumes "
        "one JSON-unescaped character per byte." % (len(blob), want)
    )

payload = base64.b64encode(blob).decode("ascii")

# A short JS prelude so the announcement scan has a body to scan past rather
# than finding the marker at offset 0. Deliberately tiny: the quantity under
# measurement is the DECODED MAP, and a large prelude would put bytes into the
# file that no recorded figure accounts for.
prelude = (
    "/* DefMiner Phase 7 synthetic inline-map fixture.\n"
    "   Built by scripts/phase7/fetch-maps.sh from %s.\n"
    "   Decoded map JSON: %d bytes. Base64 payload: %d bytes.\n"
    "   NOT vendor code and NEVER evaluated — it is read, scanned and parsed. */\n"
    "(function(){var defminerFixture=%d;return defminerFixture;})();\n"
) % (os.path.basename(src), len(blob), len(payload), len(blob))

os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
with open(out, "wb") as fh:
    fh.write(prelude.encode("utf-8"))
    # NO TRAILING NEWLINE after the announcement. See the header.
    fh.write(b"//# sourceMappingURL=data:application/json;base64," + payload.encode("ascii"))

print(
    "  %-28s decoded=%d b64=%d file=%d"
    % (os.path.basename(out), len(blob), len(payload), os.path.getsize(out)),
    file=sys.stderr,
)
PY
}

# Only synthesise when asked. `bash scripts/phase7/fetch-maps.sh` on its own
# fetches and verifies; the driver calls `synth` through this script's SYNTH
# hook so the two concerns stay in one file without the fetch path doing work
# nobody asked for.
if [ -n "${SYNTH:-}" ]; then
  cd "$INVOKED_FROM"
  # SYNTH is a newline-separated list of `<source.map> <decoded-bytes> <out.js>`.
  while read -r s w o; do
    [ -z "$s" ] && continue
    synth "$s" "$w" "$o"
  done <<< "$SYNTH"
fi
