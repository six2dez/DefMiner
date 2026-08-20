#!/usr/bin/env bash
# scripts/spike/re2js-provenance.sh — query npm for re2js@2.8.6's published metadata.
#
# SPIKE-01's package audit flagged a provenance gap: `re2js` was reported as
# publishing no `repository.url`, with its source only ASSERTED to be
# github.com/le0pard/re2js. This asks the registry directly rather than
# re-quoting the claim, so the result records what is actually published.
#
# Output is a plain KEY: VALUE file that scripts/spike/analyse-spike-01.py reads.
# It lands under .spike/ (gitignored) because it is a fetched artifact, not
# evidence — this script plus the recorded measurements in SPIKE-01.json are the
# reproducible pair.
set -euo pipefail

cd "$(dirname "$0")/../.."
PKG="${PKG:-re2js}"
VERSION="${VERSION:-2.8.6}"
OUTFILE="${OUTFILE:-.spike/${PKG}-registry.txt}"
mkdir -p .spike

READ_PROG=$(cat <<'PYPROG'
import json, sys
v = sys.argv[1]
d = json.load(sys.stdin)
m = d["versions"][v]
print("name:", d["name"])
print("dist-tags.latest:", d["dist-tags"]["latest"])
print("version_under_test:", v)
print("repository (version doc):", json.dumps(m.get("repository")))
print("repository (packument):", json.dumps(d.get("repository")))
print("homepage:", m.get("homepage"))
print("bugs:", json.dumps(m.get("bugs")))
print("license:", m.get("license"))
print("maintainers:", [x.get("name") for x in d.get("maintainers", [])])
print("dist.tarball:", m["dist"]["tarball"])
print("dist.integrity:", m["dist"].get("integrity"))
print("dist.shasum:", m["dist"].get("shasum"))
print("scripts:", json.dumps(m.get("scripts")))
print("dependencies:", json.dumps(m.get("dependencies")))
print("time.published:", d["time"][v])
print("versions_published:", len(d["versions"]))
print("_npmUser:", json.dumps(m.get("_npmUser")))
PYPROG
)
curl -sf "https://registry.npmjs.org/${PKG}" | python3 -c "$READ_PROG" "$VERSION" > "$OUTFILE"

# Provenance ATTESTATIONS are a separate endpoint from the trusted-publisher
# marker in _npmUser, and the two do not imply each other. Record both.
curl -sf "https://registry.npmjs.org/-/npm/v1/attestations/${PKG}@${VERSION}" 2>/dev/null \
  | python3 -c '
import json, sys
try:
    d = json.load(sys.stdin)
except Exception:
    print("attestation_count: 0"); raise SystemExit
atts = d.get("attestations", [])
print("attestation_count:", len(atts))
for a in atts:
    print("attestation_predicate:", a.get("predicateType"))
' >> "$OUTFILE"
# `|| true` and not a fallback echo: under `set -o pipefail` a 404 from the
# attestations endpoint makes the PIPELINE fail even though the python above
# already wrote "attestation_count: 0", and a fallback would emit it twice.
true

echo "wrote $OUTFILE" >&2
cat "$OUTFILE" >&2
