// packages/frontend/src/components/source-filename.ts — R6, and the last sink a
// `sources` string could plausibly reach.
//
// ===========================================================================
// WHY THIS MODULE EXISTS AT ALL
// ===========================================================================
// MAP-04 reads: `sources` entries from the map are never used as filesystem
// paths. Its first clause has no subject under D-07 — nothing is written — and
// its second is proven mechanically on the backend by plan 07-03's
// `filesystem-prohibition.spec.ts`, a static gate that no `sources` value
// reaches a path-like sink.
//
// That gate cannot see a BROWSER DOWNLOAD NAME. The name is constructed in the
// frontend, handed to an `<a download>` and written by the operator's own
// browser onto the operator's own disk. It is the one remaining place a
// developer's path could become a path again, and 07-UI-SPEC.md's R6 closes it
// HERE rather than leaving it to a reviewer.
//
// ===========================================================================
// CLOSED BY CONSTRUCTION, NOT BY SANITISATION
// ===========================================================================
// The name is:
//
//     {first 16 hex characters of the source's content sha256}{extension}
//
// where the extension is MATCHED — never derived, never sliced — against a
// CLOSED, DefMiner-AUTHORED allowlist. The label's only influence on the output
// is a choice among ten DefMiner literals; NO BYTE OF THE TARGET'S STRING
// REACHES THE FILENAME. That is a stronger property than "the label was
// sanitised", because a sanitiser can be wrong about a case nobody thought of
// and a ten-way choice cannot.
//
// The distinction matters more than it looks. A sanitising implementation would
// have to be right about `..%2f..%2f`, `C:\\`, `\\\\server\\share`, `CON`,
// `NUL.js`, a NUL byte mid-path, FULLWIDTH FULL STOP pairs and an RTL override
// that `path.normalize` itself corrupts — every one of which is in this repo's
// measured 23-label corpus. A matcher has to be right about nothing at all.

/**
 * The extensions a recovered source may be saved with.
 *
 * CLOSED AND DefMiner-AUTHORED. Membership is a PROPOSAL (planner assumption
 * U7-7); what is binding is that the list is closed, that it is matched rather
 * than derived, and that the generated name is asserted against an exact
 * pattern. Frozen so that membership is one edit in one place, and so that a
 * caller cannot push onto it.
 */
export const SOURCE_EXTENSION_ALLOWLIST: readonly string[] = Object.freeze([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".vue",
  ".css",
  ".scss",
  ".json",
  ".md",
]);

/**
 * What a label that matches nothing gets.
 *
 * PLAIN TEXT, and that is the fail-closed direction: a file saved as `.txt` is
 * inconvenient, a file saved with an extension a host might execute is not. A
 * label carrying a query string, a fragment, an unknown suffix or no suffix at
 * all lands here, which is most of the hostile corpus by construction.
 */
export const SOURCE_EXTENSION_FALLBACK = ".txt";

/**
 * A source's content digest, as the content arm reports it.
 *
 * VALIDATED RATHER THAN TRUSTED. The digest is DefMiner-computed and never
 * target-controlled, so a value that is not 64 lowercase hex characters is an
 * internal invariant violation rather than an attack — but the whole claim this
 * module makes is that the output matches an exact pattern, and a claim that
 * holds only when its input is well-formed is a claim with a hole in it.
 */
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

/** How much of the digest the name carries. 16 hex characters is 64 bits: two
 *  sources colliding on it inside one bundle is not a threat model, it is a
 *  birthday problem with no adversary — the digest is of DefMiner's own
 *  recovered bytes and the operator sees the full digest in the viewer. */
const DIGEST_CHARACTERS = 16;

/**
 * The extension for a label, MATCHED against the closed allowlist.
 *
 * The comparison is case-folded and the RETURNED VALUE IS THE ALLOWLIST'S OWN
 * LITERAL, never a slice of the label — so `APP.TS` yields the constant `.ts`
 * rather than the target's `.TS`. Longest match first, so a future two-part
 * extension cannot be shadowed by a shorter member of the list.
 */
function matchExtension(label: string | null): string {
  if (label === null) return SOURCE_EXTENSION_FALLBACK;
  const folded = label.toLowerCase();
  const byLength = [...SOURCE_EXTENSION_ALLOWLIST].sort(
    (a, b) => b.length - a.length,
  );
  for (const extension of byLength) {
    if (folded.endsWith(extension)) return extension;
  }
  return SOURCE_EXTENSION_FALLBACK;
}

/**
 * The download name for one recovered source, or `null` when there is none.
 *
 * TOTAL, AND FAIL-CLOSED. `null` rather than a throw, and `null` rather than a
 * best-effort name: this is called from a render path, so a throw would take
 * the viewer down behind the source it was supposed to offer, and a best-effort
 * name would be a name that does not match R6's pattern. A `null` means the
 * save affordance is not offered, which is the honest outcome for a digest
 * DefMiner cannot vouch for.
 *
 * @param contentSha256 the source's content digest — DefMiner-computed.
 * @param label the verbatim `sources` entry. TARGET-CONTROLLED and hostile; it
 *   selects among ten DefMiner literals and contributes nothing else.
 */
export function sourceDownloadName(
  contentSha256: string,
  label: string | null,
): string | null {
  if (!SHA256_PATTERN.test(contentSha256)) return null;
  return `${contentSha256.slice(0, DIGEST_CHARACTERS)}${matchExtension(label)}`;
}
