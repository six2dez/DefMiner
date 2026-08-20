#!/usr/bin/env bash
# scripts/phase1/fetch-caido.sh <version> — hash-pinned fetch of a Caido CLI release.
#
# THE QUESTION, IN WORDS
# ----------------------
# COMPAT-02 asks for a smoke test against the CURRENT Caido release, not against
# the one we happen to have installed. That means an executable enters this
# machine from the network. Threat T-01-30: a compromised or truncated download
# must never be unpacked, let alone run.
#
# THE DISCIPLINE, COPIED FROM scripts/spike/fetch-corpus.sh
# ---------------------------------------------------------
# Fail CLOSED on a hash mismatch, and delete the artifact rather than leave a
# half-trusted file on disk. The difference from fetch-corpus.sh is only WHERE
# the expected hash comes from: jsDelivr publishes none, so that script commits
# its SHA-256es; api.caido.io publishes a per-artifact SHA-512, so the primary
# source here is the API itself.
#
#   VERIFY BEFORE EXTRACT. The hash is compared while the download is still an
#   opaque archive. Nothing is unzipped, nothing is chmod +x, and nothing is
#   executed until the comparison passes — so a bad download cannot place a
#   binary on disk at all, which is a stronger property than "we would have
#   noticed afterwards".
#
# WHAT THE API ACTUALLY PUBLISHES (measured 2026-08-20, not assumed)
# -----------------------------------------------------------------
# `https://api.caido.io/releases/latest` returns `{version, links:[{platform,
# kind, link, format, hash}]}` where `hash` is a BASE64 SHA-512 of the artifact.
# There is NO per-version endpoint: /releases, /releases/0.57.1 and
# /releases/v0.57.1 all return 404. So a version that is not `latest` has no
# published hash to check against, and this script REFUSES it unless the hash is
# committed in PINNED_SHA512 below. That refusal is the point — downloading an
# unpinned, unverifiable executable "because it was asked for" is precisely the
# hole the hash gate exists to close.
#
# The sidecar records the requested version AND the API's current version on
# EVERY run, so a smoke test that has quietly become a test of a stale release is
# visible in the artifact rather than only in someone's memory (threat T-01-35).
#
# The downloaded binary is gitignored. A vendored Caido must never enter git.
set -euo pipefail

cd "$(dirname "$0")/../.."

# shellcheck disable=SC1091
source scripts/phase1/env.sh

VERSION="${1:?usage: fetch-caido.sh <version>   e.g. fetch-caido.sh 0.58.0}"

# The ONLY release index this script trusts. Overridable to a LOCAL FILE ONLY —
# a remote override would hand an attacker both the link and the hash, which
# would defeat the entire gate. The override exists so the pinned path and the
# corrupted-archive path can be exercised deterministically (see
# scripts/phase1/compat-smoke.sh and the plan's acceptance criteria); it cannot
# be pointed at a network location.
RELEASES_URL="https://api.caido.io/releases/latest"
RELEASES_FILE="${CAIDO_RELEASES_JSON:-}"
if [ -n "$RELEASES_FILE" ]; then
  case "$RELEASES_FILE" in
    http://*|https://*|ftp://*)
      echo "FATAL: CAIDO_RELEASES_JSON must be a local file, not a URL." >&2
      echo "       A remote release index supplies BOTH the download link and the" >&2
      echo "       hash it is checked against, so overriding it remotely would" >&2
      echo "       remove the gate rather than redirect it." >&2
      exit 1 ;;
  esac
  [ -f "$RELEASES_FILE" ] || { echo "FATAL: CAIDO_RELEASES_JSON=$RELEASES_FILE does not exist" >&2; exit 1; }
fi

# Hashes committed HERE, for versions the API no longer serves. Same contract as
# fetch-corpus.sh's SHA-256 table: the value is evidence, and adding a line means
# somebody verified that artifact. Key is "<version> <platform>".
#
# 0.58.0/mac-aarch64 is recorded from the API response of 2026-08-20, the day
# 0.58.0 was `latest`. It is here so that when 0.59.0 ships this script can still
# reproduce the exact 0.58.0 leg the COMPAT-02 matrix was measured on.
PINNED_SHA512="\
0.58.0 mac-aarch64 GRf0Pxe/GGfYwmJNLjz+kyJahr5QEGSYZ0dkT88DxL24jjbwrkEgLNa6oZEqLYRDfRyNfTCKaPyDQ3lFZBCyAA==
0.58.0 mac-x86_64 MIycd6p/STVRPUDvSvybPWWlZPhMl6ONqaKwbhiyqmtO7/CLpNDnpxXiLYu5mkov+P+DI+6oJLASGPPDZByfLA==
0.58.0 linux-x86_64 W4jJpNyDiUNvub9vqPSSRityuuHPEgzmHkqqDqeofuKCeheqehAftLEBHvxVlOunrdKGO7ayv9mtPo/fzj0YyQ==
0.58.0 linux-aarch64 TfHf/gIfTrT272dNERMqwE5rUhFkClsn0dv1IOMo/QsptjyPodDZB99rgRTB/+ff6lj9yeiKh73lPRKD2kVKHg==\
"

# --- this host's platform, in the API's own vocabulary ----------------------
case "$(uname -s)" in
  Darwin) OS_TAG="mac" ;;
  Linux)  OS_TAG="linux" ;;
  *) echo "FATAL: unsupported OS $(uname -s)" >&2; exit 1 ;;
esac
case "$(uname -m)" in
  arm64|aarch64) ARCH_TAG="aarch64" ;;
  x86_64|amd64)  ARCH_TAG="x86_64" ;;
  *) echo "FATAL: unsupported architecture $(uname -m)" >&2; exit 1 ;;
esac
PLATFORM="$OS_TAG-$ARCH_TAG"

DEST=".caido-bin/$VERSION"
SIDECAR="$DEST/release.json"

# --- resolve the release index ----------------------------------------------
INDEX="$(mktemp "${TMPDIR:-/tmp}/caido-releases.XXXXXX.json")"
trap 'rm -f "$INDEX"' EXIT
if [ -n "$RELEASES_FILE" ]; then
  cp "$RELEASES_FILE" "$INDEX"
  INDEX_SOURCE="file:$RELEASES_FILE"
else
  curl -fsSL --retry 3 --max-time 60 "$RELEASES_URL" -o "$INDEX" || {
    echo "FATAL: could not fetch $RELEASES_URL" >&2
    echo "       COMPAT-02 cannot be closed against a release that cannot be fetched." >&2
    exit 1; }
  INDEX_SOURCE="$RELEASES_URL"
fi

# Select the CLI artifact for THIS platform, and report what the API calls
# current. Both come out of one python pass so the two can never disagree.
RESOLVED="$(python3 - "$INDEX" "$PLATFORM" "$VERSION" <<'PY'
import json, sys
index, platform, requested = sys.argv[1], sys.argv[2], sys.argv[3]
d = json.load(open(index))
current = d.get("version")
if not current:
    sys.exit("release index carries no version field")
links = [l for l in d.get("links", [])
         if l.get("kind") == "cli" and l.get("platform") == platform]
if not links:
    sys.exit(f"release index has no cli artifact for platform {platform}")
l = links[0]
link = l["link"]
# The link is versioned; rewrite it for the REQUESTED version so a pinned older
# release resolves to its own artifact rather than to the current one.
link = link.replace("v" + current, "v" + requested)
print(current)
print(link)
print(l.get("hash") or "")
print(l.get("format") or "")
PY
)" || { echo "FATAL: could not resolve a CLI artifact from $INDEX_SOURCE" >&2; exit 1; }

CURRENT_VERSION="$(printf '%s' "$RESOLVED" | sed -n 1p)"
ARTIFACT_URL="$(printf '%s'  "$RESOLVED" | sed -n 2p)"
API_HASH_B64="$(printf '%s'  "$RESOLVED" | sed -n 3p)"
ARTIFACT_FORMAT="$(printf '%s' "$RESOLVED" | sed -n 4p)"

# --- pick the expected hash, and refuse if there is not one -----------------
PINNED_HASH_B64="$(printf '%s\n' "$PINNED_SHA512" \
  | awk -v v="$VERSION" -v p="$PLATFORM" '$1==v && $2==p {print $3}')"

if [ "$VERSION" = "$CURRENT_VERSION" ]; then
  EXPECTED_B64="$API_HASH_B64"
  HASH_SOURCE="api"
  # Belt and braces: when the version is BOTH current and pinned, the two must
  # agree. A silent disagreement would mean the artifact behind a fixed URL had
  # changed, which is the single most interesting thing this script could learn.
  if [ -n "$PINNED_HASH_B64" ] && [ "$PINNED_HASH_B64" != "$API_HASH_B64" ]; then
    echo "FATAL: the API's hash for $VERSION/$PLATFORM differs from the pin committed in this script." >&2
    echo "  api    $API_HASH_B64" >&2
    echo "  pinned $PINNED_HASH_B64" >&2
    echo "       The artifact behind a fixed versioned URL changed. Investigate before fetching." >&2
    exit 1
  fi
elif [ -n "$PINNED_HASH_B64" ]; then
  EXPECTED_B64="$PINNED_HASH_B64"
  HASH_SOURCE="pinned"
  echo "note: $VERSION is not the current release ($CURRENT_VERSION); using the hash pinned in this script." >&2
else
  echo "FATAL: $VERSION is not the current release ($CURRENT_VERSION) and has no pinned hash." >&2
  echo "       api.caido.io publishes hashes for 'latest' ONLY — /releases/$VERSION is 404 —" >&2
  echo "       so there is nothing to verify this download against." >&2
  echo "       Refusing to download an unverifiable executable (threat T-01-30)." >&2
  echo "       To proceed, add a verified line to PINNED_SHA512 in this script:" >&2
  echo "         $VERSION $PLATFORM <base64-sha512>" >&2
  exit 1
fi
[ -n "$EXPECTED_B64" ] || { echo "FATAL: resolved an empty expected hash for $VERSION/$PLATFORM" >&2; exit 1; }

EXPECTED_HEX="$(python3 -c '
import base64, sys
print(base64.b64decode(sys.argv[1]).hex())' "$EXPECTED_B64")"

# --- download ---------------------------------------------------------------
mkdir -p "$DEST"
ARCHIVE_NAME="$(basename "$ARTIFACT_URL")"
ARCHIVE="$DEST/$ARCHIVE_NAME"
if [ ! -f "$ARCHIVE" ]; then
  echo "fetching $ARTIFACT_URL" >&2
  curl -fsSL --retry 3 --max-time 600 "$ARTIFACT_URL" -o "$ARCHIVE" || {
    echo "FATAL: download failed: $ARTIFACT_URL" >&2
    rm -f "$ARCHIVE"
    exit 1; }
else
  echo "reusing existing $ARCHIVE" >&2
fi

# --- GATE: verify BEFORE anything is extracted or executed ------------------
COMPUTED_HEX="$(shasum -a 512 "$ARCHIVE" | cut -d' ' -f1)"
if [ "$COMPUTED_HEX" != "$EXPECTED_HEX" ]; then
  echo "HASH MISMATCH $ARCHIVE" >&2
  echo "  want (sha512, $HASH_SOURCE) $EXPECTED_HEX" >&2
  echo "  got  (sha512, computed)     $COMPUTED_HEX" >&2
  echo "  base64 published            $EXPECTED_B64" >&2
  # Delete the whole version directory, not only the archive. Leaving a
  # previously extracted binary next to a failed verification would mean the
  # NEXT run finds a usable caido-cli that this run just refused to trust.
  rm -rf "$DEST"
  echo "  removed $DEST — nothing was extracted and nothing was executed." >&2
  exit 1
fi
echo "sha512 ok ($HASH_SOURCE): $COMPUTED_HEX" >&2

# --- extract (only now) ------------------------------------------------------
case "$ARTIFACT_FORMAT" in
  zip)    unzip -oq "$ARCHIVE" -d "$DEST" ;;
  tar.gz) tar -xzf "$ARCHIVE" -C "$DEST" ;;
  *) echo "FATAL: unsupported artifact format ${ARTIFACT_FORMAT:-<none>}" >&2; exit 1 ;;
esac

# The archive lays the binary out however it likes; find it rather than guess.
# NEVER `command -v caido-cli`: bare caido-cli on PATH resolves to a stale 0.55.3
# on this machine, and a leg that silently measured that instead of the release
# it claims to measure is exactly the failure this whole plan exists to prevent.
BIN="$DEST/caido-cli"
if [ ! -f "$BIN" ]; then
  FOUND="$(find "$DEST" -type f -name 'caido-cli' 2>/dev/null | head -1)"
  [ -n "$FOUND" ] || { echo "FATAL: no caido-cli inside $ARCHIVE" >&2; exit 1; }
  [ "$FOUND" = "$BIN" ] || mv "$FOUND" "$BIN"
fi
chmod +x "$BIN"
[ -x "$BIN" ] || { echo "FATAL: $BIN is not executable after extraction" >&2; exit 1; }

# --- GATE: the binary is the one we asked for -------------------------------
# Same principle as scripts/spike/instance.sh's version gate: a hash proves the
# bytes are the ones published, and this proves the bytes are the RELEASE we
# named. Both, because they answer different questions.
REPORTED="$("$BIN" --version 2>/dev/null | awk '{print $2}')"
if [ "$REPORTED" != "$VERSION" ]; then
  echo "FATAL: $BIN reports version '${REPORTED:-<none>}', expected '$VERSION'" >&2
  exit 1
fi

# --- sidecar ----------------------------------------------------------------
python3 - "$SIDECAR" <<PY
import datetime, json, sys
json.dump({
  "requested_version": "$VERSION",
  "current_version": "$CURRENT_VERSION",
  "is_current_release": $( [ "$VERSION" = "$CURRENT_VERSION" ] && echo True || echo False ),
  "release_index": "$INDEX_SOURCE",
  "platform": "$PLATFORM",
  "artifact_url": "$ARTIFACT_URL",
  "artifact_file": "$ARCHIVE_NAME",
  "artifact_format": "$ARTIFACT_FORMAT",
  "hash_algorithm": "sha512",
  "hash_source": "$HASH_SOURCE",
  "published_hash_base64": "$EXPECTED_B64",
  "published_sha512": "$EXPECTED_HEX",
  "computed_sha512": "$COMPUTED_HEX",
  "verified": True,
  "verified_before_extraction": True,
  "binary_path": "$BIN",
  "reported_version": "$REPORTED",
  "fetched_at": datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
}, open(sys.argv[1], "w"), indent=2)
PY

echo "$BIN  ->  Caido $REPORTED (sha512 verified from $HASH_SOURCE, current release $CURRENT_VERSION)"
