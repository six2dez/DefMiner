// packages/backend/src/store/schema.spec.ts — STORE-01 and STORE-02's gate.
//
// THIS GATE READS STRUCTURE, NOT DDL TEXT. The distinction is the whole point: a
// `CREATE TABLE` whose comment claims a composite key it does not have passes any
// grep over migrations.ts and fails here, because here the key is read back out of
// SQLite as `PRAGMA table_info`'s one-based `pk` ordinal.
//
// Three properties, each one a separate failure:
//   1. STORE-02 — every table has `project_id` IN ITS PRIMARY KEY, by ordinal.
//   2. T-01-21  — every column is on an explicit allowlist, so a column able to
//                 hold a body, a header, a cookie or a secret cannot arrive by
//                 accident. Adding a column is a deliberate TWO-PLACE edit.
//   3. The table SET is exact. A fifth table fails as loudly as a missing one.
//
// Non-vacuity is asserted explicitly. A gate that enumerates an empty schema and
// finds nothing wrong with it has measured nothing — see 01-PATTERNS.md, and
// tests/schema.spec.ts:44-53 where the same guard exists for the same reason.

import { SCAN_LIFECYCLE_STATES, SCAN_STATES } from "@defminer/engine/contract";
import { describe, expect, it } from "vitest";

import {
  createFixtureDb,
  listTables,
  tableInfo,
  userVersion,
} from "../../test/fixtures/sqlite-fixture";

import { migrate, MIGRATIONS, SCHEMA_VERSION } from "./migrations";

/** The eight tables the operator approved, across FIVE one-way checkpoints.
 *  Exactly these, in this order.
 *
 *  - `analyses`, `artifacts`, `observations`, `settings` — plan 01-01's one-way
 *    checkpoint (option-a, 2026-08-20).
 *  - `audit` — plan 05-06's `blocking-human` checkpoint (option-a, 2026-08-28),
 *    which was required precisely BECAUSE this comment named its table set as the
 *    operator's rather than the planner's.
 *  - `scans` — plan 06-01's `blocking-human` checkpoint (approve-as-specified,
 *    2026-08-31). The operator was shown the full eighteen-column list, both
 *    indexes, and the two costs the shape accepts — that only the aggregate
 *    `rejected` is durable, and that O-04 is designed around rather than bet on
 *    — before step v5 was written.
 *  - `sources`, `source_sightings` — plan 07-04's `blocking-human` checkpoint
 *    (approve-as-specified, 2026-09-02). The operator was shown both full column
 *    lists, both indexes, the migration version (v8), the one-way half — that
 *    reversing D-07 means adding a content column, which fires this gate by
 *    design and re-opens D-24 — and the cost D-09 accepts with NO exemption: one
 *    row per recovered source under the normal retention caps, so a 781-source
 *    map is 781 rows in each table against a `DEFAULT_RETENTION_MAX_ROWS` of
 *    50,000, and eviction is met sooner here than on any other table.
 *  - NO TABLE — plan 07-12's `blocking-human` checkpoint (option A,
 *    approve-as-specified, 2026-09-02). THE FIRST APPROVAL IN THIS FILE'S
 *    HISTORY THAT CHANGES A KEY RATHER THAN A TABLE SET, named here because it
 *    is one-way on exactly the terms adding a table is, and stated that way so a
 *    later reader does not scan the array below for a ninth member that was
 *    never added. `source_sightings`' PRIMARY KEY moved from
 *    `(project_id, map_sha256, source_index)` to
 *    `(project_id, artifact_sha256, map_sha256, source_index)` in migration v9.
 *    The operator was shown, before the step was written: both affected column
 *    lists in full — `source_sightings`' ten columns, none of which change type,
 *    nullability or CHECK, and `sources`' five, which this step does not touch
 *    at all; the old key and the new key side by side; the migration version
 *    (v9); the transient table name the rebuild uses (`source_sightings_v9`,
 *    which does not survive the step and is therefore not a member here, the
 *    same shape `audit_v6` has in step v7); the row-volume cost for the
 *    duplicated-map case — where the interim guard wrote one set of sightings
 *    for two bundles this writes two, so D-09's accepted one-row-per-recovered
 *    -source cost now applies PER BUNDLE and a 781-source map seen in two
 *    bundles is 1,562 rows rather than 781; and the irreversible half — the
 *    ladder is forward-only, so undoing this is another forward step that
 *    rebuilds under a narrower key and WOULD lose rows, because two bundles'
 *    sightings collapse onto one key going back. A sighting's published identity
 *    became "this bundle's view of this map at this index" rather than "this map
 *    at this index", and later work inherits the wider identity.
 *
 *  ALL FIVE approval events are named on purpose. A comment reading "five"
 *  above an array holding six is the exact drift shape this repo keeps catching,
 *  and it would have been introduced here by the edit that added the sixth
 *  entry — and again by the edit that added the seventh and eighth, which is
 *  why the count in the first line above was rewritten in the same commit as
 *  the array.
 *
 *  THE FIFTH EVENT IS THE ONE WHERE THE ARRAY DID NOT MOVE, and it is the drift
 *  shape in the direction the paragraph above did not anticipate. Plan 07-12
 *  approved a KEY change, so the approval count in the first line advanced while
 *  the array kept its eight members and every line inside the literal below
 *  stayed byte-identical. The rule survives with its scope corrected: the count
 *  is rewritten in the same commit as the EVENT it counts, which is the array
 *  only when the event is a table. Rewriting `eight` to `nine` here would have
 *  introduced exactly the drift this paragraph exists to catch.
 *  `listTables()` orders `name ASC`, which is why `scans` lands
 *  between `observations` and `settings`, and why `source_sightings` precedes
 *  `sources`: `_` (0x5F) sorts before `s` (0x73). */
const EXPECTED_TABLES = [
  "analyses",
  "artifacts",
  "audit",
  "observations",
  "scans",
  "settings",
  "source_sightings",
  "sources",
];

/**
 * EVERY column of EVERY table, named.
 *
 * This is T-01-21's mitigation and it works by ABSENCE: a stolen copy of the
 * plugin database must be a list of URLs, digests and byte counts, not a
 * credential dump. No column below can hold a response body or a cookie.
 *
 * AN AUTHORIZATION TOKEN IS A PER-GRAMMAR CLAIM, NOT A SENTENCE. Stating it as
 * one sentence is what went wrong here before, so it is stated per URL grammar
 * and no wider than the cases that RUN at the moment you are reading this:
 *
 *   ENFORCED — the QUERY grammar, everything after the first `?`, stated as the
 *     rule the code implements rather than as the rule it was hoped to implement
 *     (amended 2026-08-22, CR-07). A segment is a GENUINE PAIR only when its
 *     value half — everything after the FIRST `=` — is non-empty and is not
 *     entirely `=` padding. The VALUE of a genuine pair is replaced. A segment
 *     that is NOT a genuine pair is redacted WHOLE: no `=` at all (decision
 *     P10-D1, 2026-08-21), an EMPTY value half, or a value half of nothing but
 *     padding — which is what every standard-base64 credential looks like on the
 *     wire, since RFC 4648 §4 pads with `=`.
 *     Enforcing spec: `observations.spec.ts`, whose `BARE_CREDENTIAL_SHAPES`
 *     block runs one case per credential format and each goes RED when the branch
 *     is reverted — the eight `=`-less formats (PAT, AWS key id, Stripe secret,
 *     session id, UUID, JWT and two short opaque tokens) plus, since 2026-08-22,
 *     the `=`-bearing ones: "HTTP Basic credential, standard base64 with TWO `=`
 *     of padding", "HTTP Basic credential, standard base64 with ONE `=` of
 *     padding" (the two sub-branches — a value half of a lone `=`, and an EMPTY
 *     value half), "session id with a single trailing `=` and nothing after it",
 *     percent-encoded padding and unpadded base64url. The whole-segment branch's
 *     accepted cost is pinned by "ACCEPTED COST (CR-07): `?debug=` loses its NAME
 *     as well as its value".
 *     LIVE PROOF, PER GRAMMAR, WITH THE TIER THAT PROVES EACH ONE NAMED
 *     (2026-08-22). This entry once ended "Proven end to end by
 *     `scripts/phase1/tracer-e2e.sh`, which reads the column with sqlite3 from
 *     outside Caido" — full stop, covering the whole grammar — and that was wider
 *     than what ran: every dye in that script came from `openssl rand -hex`, and
 *     hex carries no `=`, so the padded grammar was unreachable from the live tier
 *     entirely. It is stated per grammar now:
 *       `=`-less bare segment  UNIT and LIVE. `redactDelimitedSegment`'s `eq === -1`
 *                              branch, plus the tracer's `openssl rand -hex` dye,
 *                              asserted absent from `SELECT url FROM observations`
 *                              read with `sqlite3` from OUTSIDE Caido.
 *       PADDED segment, both   UNIT and LIVE. Unit: the `BARE_CREDENTIAL_SHAPES`
 *       sub-branches           cases named above, including the one that reads the
 *                              row back out of a real SQLite file ("a PADDED
 *                              credential does not reach the column on EITHER
 *                              delimiter"). Live: the tracer's per-run dye set
 *                              carries TWO padded bare segments — `openssl rand
 *                              -base64 16`, whose value half is a lone `=`, and
 *                              `openssl rand -base64 32`, whose value half is EMPTY
 *                              — and asserts each absent under BOTH its padded
 *                              literal AND its PADDING-STRIPPED CORE, because
 *                              against the defect the column stores the dye minus
 *                              one byte of padding and a search for the padded
 *                              spelling alone returns zero on a live credential.
 *       `;` path parameter     UNIT and LIVE, measured — the `;` grammar is recorded
 *                              per run in `grammar-reachability.txt` rather than
 *                              assumed to arrive.
 *       URL userinfo           UNIT only. MEASURED not assumed: curl lifts
 *                              `user:pass@` into an `Authorization: Basic` header
 *                              before the request line exists, so userinfo cannot be
 *                              exercised through the live tier at all. Recorded per
 *                              run in `userinfo-measurement.txt`; enforced by
 *                              `observations.spec.ts`'s HEAD_CASES.
 *     THE RUN EVIDENCE IS INDEXED AT
 *     `.planning/phases/01-skeleton-persistence-compatibility/results/runs/README-01-17.md`,
 *     which names each committed run, the resolved Caido build it ran on, the stored
 *     URL read back out of the file, and the deliberate mutation run in which the
 *     padded-segment assertions are driven RED. Read it before citing this entry:
 *     what the sentence above claims is that the committed script EXERCISES each
 *     grammar at the tier named beside it, which is a fact about the script; whether
 *     a given run passed is a fact about that run, and only the index can tell you.
 *
 *   ENFORCED — URL USERINFO, since 2026-08-21 (plan 01-11). Resolved inside the
 *     AUTHORITY component only — after the first `://`, up to the first `/`, `?`
 *     or `#` — and BOTH halves are replaced, never just the password. The `@` is
 *     kept, so the fact that the URL carried userinfo survives and the bytes do
 *     not. Enforcing spec: `observations.spec.ts`'s `HEAD_CASES` block, whose
 *     MUST-NOT-TOUCH half asserts that an `@` in a PATH — `/@vite/client.js`,
 *     `/@scope/pkg/index.js` — is byte-identical, because an `@`-anywhere rule
 *     is the obvious wrong implementation.
 *     ITS PRECONDITION, STATED (2026-08-22, CR-07) rather than left implicit: the
 *     guarantee holds only when the input CARRIES `://`. The authority is resolved
 *     AFTER the first `://`, so a scheme-relative reference — `//user:pw@cdn/a.js`
 *     — has no authority and keeps its userinfo verbatim. That is a precondition
 *     on the CALLER, not a property of the redactor, and the caller is
 *     `consumer.ts`'s `rr.request.getUrl()`, which is absolute — the only path
 *     that reaches `recordObservation` with a target-controlled URL. Pinned by
 *     "RESIDUAL, PINNED: a SCHEME-RELATIVE reference keeps its userinfo".
 *
 *   ENFORCED — `;`-DELIMITED PATH PARAMETERS IN THE PATH, since 2026-08-21 (plan
 *     01-11), by THE SAME RULE as a query parameter and through the same internal
 *     helper: `;jsessionid=SECRETSESSION` keeps its name and loses its value, and
 *     a `;` segment that is not a genuine pair — no `=`, or an `=` that was
 *     padding — is redacted whole exactly as its query counterpart is. ONE
 *     policy, two delimiters — `redactDelimitedSegment` in `observations.ts` is
 *     the single implementation both loops call, which is what makes that true
 *     rather than asserted. Enforcing spec: `observations.spec.ts`'s
 *     `HEAD_CASES`, which since 2026-08-22 carries the `;` mirror of every padded
 *     shape the query table holds.
 *     QUALIFIED TO THE PATH (2026-08-22, CR-07), and the qualifier is the whole
 *     row's accuracy: the `;` loop runs over `s.slice(pathStart)`, so a `;`
 *     parameter inside the AUTHORITY — `https://cdn.test;jsessionid=S/app.js` —
 *     is returned byte-identical. Same precondition on the caller as the userinfo
 *     row above. Pinned by "RESIDUAL, PINNED: a `;` parameter inside the
 *     AUTHORITY".
 *
 *   OPEN — TWO grammars still reach this column verbatim. The count moved from
 *     one to two on 2026-08-22 (CR-07); see the AMENDED note below.
 *       path-embedded tokens   `https://cdn.test/download/eyJhbGciOiJIUzI1NiJ9…/app.js`
 *                              — stored whole. How signed CDN and object-store
 *                              URLs are shaped when the signature is not a query
 *                              parameter.
 *       the retained NAME HALF `https://cdn.test/a.js?ghp_AAAA…=1` — the name half
 *       of a genuine pair      of a `name=value` segment is KEPT, bounded by
 *                              `QUERY_NAME_MAX` = 64 and by nothing else, WHATEVER
 *                              IT CONTAINS. So a credential pasted where a
 *                              parameter name goes survives, and so does the
 *                              prefix of a token carrying an interior `=`.
 *                              SAY IT IN AS MANY WORDS, because the entry above
 *                              reads as though it were already said: "every VALUE
 *                              is replaced" is NOT the sentence "no authorization
 *                              token reaches this column". They differ by exactly
 *                              this grammar.
 *     NEITHER is closed, and the reasons are specific rather than "out of scope".
 *     For path-embedded tokens: distinguishing a signed-URL segment from a
 *     legitimate path segment needs either entropy scoring — for which Phase 1 has
 *     no measured false-positive rate, and which would shred ordinary hashed asset
 *     names, destroying the analytic core of this column — or a pattern, which
 *     `REDOS_RECOVERY = "kill"` forbids in that module. For the retained name
 *     half: it is KEPT BY POLICY. Parameter names are the analytic value the
 *     operator's UAT decision of 2026-08-21 deliberately chose to keep, and
 *     redacting them would undo that decision rather than implement it.
 *     PINNED, not merely named — the cases titled "RESIDUAL, PINNED: a token
 *     embedded in a path SEGMENT is NOT redacted", "RESIDUAL, PINNED: the
 *     retained NAME half of a GENUINE pair is kept whatever it contains" and
 *     "RESIDUAL, PINNED: the retained NAME half, second face" in
 *     `observations.spec.ts` assert the current behaviour, so the day somebody
 *     closes one that case goes RED and they update it deliberately. SOURCES:
 *     WR-11 (the first), CR-07 (the second).
 *
 * WHY THE WORDING CHANGED, recorded rather than quietly edited. This paragraph
 * used to read "Nothing below can hold … an authorization token", followed by
 * "THAT CLAIM WAS FALSE UNTIL 2026-08-21 AND IS NOW TRUE". Both halves were
 * wrong together in a way neither was alone. The 2026-08-21T13:45 re-verification
 * found a 40-character GitHub PAT pasted as a BARE query segment surviving
 * verbatim into this column, under an "is now true" formulation, with the only
 * test for the bound using a 104-character name — the one length at which
 * truncation is visible — so nothing could go red. An unfalsifiable residual
 * underneath an upgraded claim. The bare-segment half is now closed by
 * construction and IS falsifiable; the grammars listed above as open are not
 * closed, and saying so is the whole point of the rewrite. A claim stronger than
 * its enforcement is an attack surface on the next author, who builds on the
 * claim rather than on the code.
 *
 * AMENDED 2026-08-21 (plan 01-11), and amended in place rather than rewritten.
 * When this paragraph was written it named THREE open grammars — userinfo, `;`
 * path parameters and path-embedded tokens — all owned by plan 01-11. Two of the
 * three are now ENFORCED and are listed as such above; ONE remained, and the
 * count in this note is the record that the number moved from three to one on a
 * date rather than having always been one. The ownership note stopped being a
 * promise by the two grammars closing, not by the sentence being deleted.
 *
 * AMENDED AGAIN 2026-08-22 (CR-07): the count moved from ONE to TWO. A count that
 * only ever goes down is the shape of a claim being MANAGED rather than MEASURED,
 * so the direction of this move is worth as much as the number. THE REASON: the
 * grammar added is not newly opened — it was open the whole time and this list
 * did not name it. The retained NAME half of a genuine pair keeps whatever it
 * contains, and a credential pasted in name position therefore reaches this
 * column. It sat INSIDE the grammar this list declared closed, which is the worst
 * place for an omission: an OPEN list is trusted precisely for its completeness,
 * and an incomplete one is worse than no list at all. Found by code review after
 * the SAME review found that a padded credential took the pair branch at all;
 * that half was a defect and is fixed, this half is policy and is now listed.
 *
 * The four entries that could conceivably carry target bytes, and why each is
 * here deliberately rather than by omission:
 *   observations.url          — a URL with the fragment stripped, EVERY QUERY VALUE
 *                               REPLACED with `<redacted>` — including any segment
 *                               that is not a GENUINE PAIR, which is a bare
 *                               `=`-less segment (P10-D1) and, since 2026-08-22
 *                               (CR-07), one whose value half is empty or is only
 *                               `=` padding — the names of genuine `name=value`
 *                               pairs and their order retained, truncated to 2048.
 *                               It is the
 *                               artifact->request edge; without it the plugin
 *                               records that bytes were seen but not WHERE. The
 *                               names are the analytic value the operator's UAT
 *                               decision of 2026-08-21 deliberately kept; the
 *                               values are credentials and they are gone before the
 *                               row is written. Since 2026-08-21 (plan 01-11) the
 *                               same VALUE rule also covers the head: USERINFO is
 *                               replaced in the authority component with the `@`
 *                               kept, and `;` PATH-PARAMETER values are replaced
 *                               by the same helper the query loop uses. Enforced
 *                               by observations.spec.ts.
 *                               NOT REDACTED, and named here so this entry is not
 *                               read as a complete guarantee — BOTH grammars listed
 *                               as OPEN above, matching that list rather than a
 *                               subset of it (corrected 2026-08-22, CR-07): (1) a
 *                               token embedded in a path SEGMENT, and (2) the
 *                               retained NAME HALF of a genuine pair, which is kept
 *                               by policy whatever it contains, so a credential
 *                               pasted in name position reaches this column
 *                               bounded only by `QUERY_NAME_MAX`. Each is pinned by
 *                               an executed case rather than left as a sentence.
 *                               Two preconditions also stated above rather than
 *                               implied: the userinfo guarantee needs the input to
 *                               carry `://`, and the `;` guarantee is a PATH
 *                               guarantee.
 *                               THE TRUNCATION, and what it costs (added
 *                               2026-08-22, plan 01-20, WR-22). "Truncated to
 *                               2048" above is an UPPER BOUND, not the stored
 *                               length. Past `URL_MAX` the cut drops back to the
 *                               last `&`, so the value ends on a WHOLE query
 *                               segment rather than inside one — never inside a
 *                               `<redacted>` marker. THE COST, measured and not
 *                               estimated: exactly ONE trailing segment more than
 *                               the old byte cut discarded, and that segment is a
 *                               parameter NAME the operator's UAT decision of
 *                               2026-08-21 chose to keep. It is accepted because
 *                               the old rule already mangled that same fragment
 *                               into a severed marker, so the direction is
 *                               strictly LESS retention. Rows written before this
 *                               date carry the old shape and are NOT rewritten
 *                               (decision P8-D1), so this column holds both.
 *                               UNIT — `observations.spec.ts`'s "the truncation
 *                               drops a WHOLE trailing segment, never half of
 *                               one, and never more than one (WR-22)".
 *                               OPEN, and stated no wider than the evidence: the
 *                               truncation is a FIXED POINT ACROSS THE RANGE
 *                               SWEPT — parameter-name lengths 1..64 at 300 and
 *                               900 parameters, 128 cuts — and NOT for every
 *                               possible input. The class the sweep does not
 *                               reach is the NO-SEPARATOR branch, whose condition
 *                               is `q === -1 || amp <= q`: there is no `&` INSIDE
 *                               THE CUT, so there is no boundary to drop back to
 *                               and the byte cut STANDS. That condition is about
 *                               WHERE THE CUT LANDS — before the query's first
 *                               `&` — and NOT about how many parameters the query
 *                               has. This entry used to scope the class to a
 *                               query of one segment only (WR-29); that is
 *                               corrected here, because a long path with a long
 *                               FIRST parameter is the more ordinary shape and it
 *                               is squarely inside the class. Inside the class
 *                               there are THREE shapes and exactly one of them is
 *                               a fixed point (corrected 2026-08-24, WR-35 —
 *                               RE-DERIVED from `observations.ts`'s own WR-22
 *                               paragraph, which has enumerated both unstable
 *                               shapes correctly since it was written): (1) a cut
 *                               landing inside a `;` parameter's `<redacted>`
 *                               MARKER is stable — a second pass re-expands and
 *                               re-truncates to the same byte; (2) a cut landing
 *                               JUST PAST THE `=` leaves a segment whose value
 *                               half is EMPTY, and `redactDelimitedSegment`'s
 *                               CR-07 padding branch redacts it WHOLE — this is
 *                               the FIRST unstable offset in the band and the one
 *                               both fixtures build their exemplars on, because
 *                               they read it out of their own sweep; (3) a cut
 *                               landing inside a parameter NAME is not stable
 *                               either — the second pass sees a segment with no
 *                               `=` at all and P10-D1 redacts it WHOLE. WHAT
 *                               SEPARATES (2) FROM (3) IS THE BRANCH SELECTOR AND
 *                               NOT A LENGTH (WR-39, 2026-08-25): the presence of
 *                               an `=` in the final delimited segment is what
 *                               chooses between the two branches, and that is
 *                               what the sibling fixture now asserts. The LENGTH
 *                               CHANGE is a consequence and it is NAME-LENGTH
 *                               DEPENDENT — the retained tail is swapped for the
 *                               `<redacted>` marker, so the move is the
 *                               difference between the two. MEASURED across four
 *                               parameter-name lengths bracketing the marker's
 *                               own: a name of the marker's length moves by at
 *                               most one byte, which is the coincidence an
 *                               earlier round mistook for a mechanism, while a
 *                               29-character name moves by up to twenty and a
 *                               44-character name by up to thirty-five, each over
 *                               a band that widens with the name. A one-character
 *                               name does not move at all. Shapes (2)
 *                               and (3) used to be asserted STABLE from ONE
 *                               chosen offset (WR-28), and until 2026-08-24 all
 *                               three disclosures named (3) alone while pointing
 *                               at an exemplar that exhibits (2). WHAT THE SWEEP
 *                               ASSERTS IS THE INSTABILITY'S SHAPE, NOT A COUNT
 *                               (IN-28, 2026-08-24): that the unstable set is
 *                               NON-EMPTY, CONTIGUOUS and STRICTLY INTERIOR to
 *                               the swept range. Two bare numbers stood here — a
 *                               range width and a band size — with no derivation
 *                               behind either, which is the defect the sibling
 *                               fixture states in its own words: a number with no
 *                               derivation goes RED for the wrong reason the day
 *                               a constant moves. NEITHER shape
 *                               discloses anything new, and that half is MEASURED
 *                               rather than argued: the sweeps assert secret
 *                               absence at BOTH passes at every offset they walk
 *                               and find zero survivals, and no production path
 *                               applies `normaliseObservedUrl` twice, since
 *                               `recordObservation` runs it once per row. NOT
 *                               CLOSED because the repair — dropping back to the
 *                               last `/` or to the `?` — would truncate an
 *                               oversized path back to its authority, discarding
 *                               far more than one trailing segment and reopening
 *                               a retention question decisions P8-D1 and P10-D1
 *                               settled. PINNED by "THE NO-SEPARATOR BRANCH: with
 *                               no `&` inside the cut the byte cut STANDS, and
 *                               the residual that lives there is SWEPT, not
 *                               pinned at one chosen offset (WR-22/WR-28/WR-29)",
 *                               which sweeps BOTH a head-side `;` input and a
 *                               THREE-parameter query, asserts each unstable set
 *                               is non-empty, contiguous and strictly inside its
 *                               swept range, and goes RED the day either shape is
 *                               closed or widened. UNIT.
 *   observations.content_type — a response HEADER value, and the only one. Bounded
 *                               to 120 chars. It is the admission decision itself,
 *                               so recording it is what makes a wrong admission
 *                               diagnosable.
 *   analyses.error            — a PLUGIN-GENERATED diagnostic, rendered through
 *                               `describeError` and truncated again at the write.
 *                               Never target bytes. Enforced by
 *                               error-redaction.spec.ts's
 *                               `unredacted-persisted-error` rule, which exists
 *                               because the one line that writes this column is
 *                               not inside a catch clause.
 *                               WHAT `describeError` REDACTS is stated as the
 *                               grammars it matches: explicit-scheme URLs,
 *                               POSIX absolute paths, Windows drive/UNC paths,
 *                               scheme-relative URLs and dotted-host references
 *                               without a scheme. Quoted paths may contain
 *                               spaces. Redaction runs BEFORE truncation, with
 *                               explicit URLs first so `file:///...` retains the
 *                               right marker.
 *                               The Windows, schemeless-host and quoted-space
 *                               residuals documented here in WR-18 were closed
 *                               during AF-07. `telemetry.spec.ts` executes each
 *                               grammar plus negative controls for relative
 *                               source paths, dates and single-segment mounts.
 *                               An unquoted path still ends at whitespace; the
 *                               user-bearing prefix is removed when it has enough
 *                               separators and its remaining tail stays useful
 *                               for diagnosis. This is the precise remaining
 *                               boundary, not a claim that arbitrary strings are
 *                               free of target data.
 *   settings.value            — OPERATOR configuration (retention bounds). Never
 *                               target bytes and never a credential: nothing in
 *                               Phase 1 writes a secret to settings, and a phase
 *                               that wants to must change this comment first.
 *
 * `value_raw` (SEC-04) and `path_key` (DIFF-01, v2) are absent and MUST STAY
 * absent — decision P4-D2. Adding either to a migration step fails this gate.
 */
const COLUMN_ALLOWLIST: Record<string, string[]> = {
  artifacts: [
    "project_id",
    "sha256",
    "byte_len",
    "kind",
    "first_seen_at",
    "last_seen_at",
    "seen_count",
  ],
  observations: [
    "project_id",
    "sha256",
    "request_id",
    "url",
    "status",
    "content_type",
    "observed_at",
  ],
  analyses: [
    "project_id",
    "sha256",
    "detector_set_hash",
    "scan_state",
    "max_slice_ms",
    "bytes_walked",
    "started_at",
    "finished_at",
    "error",
  ],
  settings: ["project_id", "key", "value", "updated_at"],
  // `event_id`, NOT `id` — the forbidden-column map below states the reason, and
  // the reason is a measurement rather than a preference. `subject` holds an
  // entity key or a rule key and `detail` a DefMiner-authored reason code plus
  // counts; neither may hold a raw value or a URL, which is what makes this
  // allowlist the mitigation and not merely a manifest.
  audit: ["project_id", "event_id", "at", "kind", "subject", "detail"],
  // `scan_id`, NOT `id` — same reason `audit.event_id` is spelled that way, and
  // the forbidden-column map below states it once for the package.
  //
  // WHAT IS NOT HERE IS THE MITIGATION. There is no reject-reason column per
  // member of `REJECT_REASONS` and there is no JSON column: six columns would
  // couple a one-way migration to a vocabulary Phases 3 and 4 will grow, and a
  // JSON blob is a column able to hold arbitrary content, which is precisely
  // what this allowlist exists to prevent. Only the AGGREGATE `rejected` is
  // durable, and the accepted cost — a completed scan's per-reason breakdown is
  // not stored — was put to the operator at plan 06-01's checkpoint rather than
  // discovered afterwards.
  //
  // `operator_filter` is the one column on this table that holds OPERATOR input.
  // It is an HTTPQL clause the operator typed, not target-controlled content: no
  // response byte, no header and no URL reaches it. `last_request_id` and
  // `last_cursor` are Caido's own opaque identifiers for a stored request.
  scans: [
    "project_id",
    "scan_id",
    "state",
    "suspend_reason",
    "operator_filter",
    "epoch",
    "last_request_id",
    "last_cursor",
    "last_created_at",
    "pages_walked",
    "seen",
    "admitted",
    "skipped_done",
    "rejected",
    "queued",
    "started_at",
    "updated_at",
    "finished_at",
  ],
  // D-05's IDENTITY MODEL, AND WHAT IS NOT HERE IS THE MITIGATION. `sources` is
  // one row per distinct recovered source CONTENT — a digest, a size, a line
  // count and a first-seen timestamp. THERE IS NO CONTENT COLUMN, in any
  // encoding: D-07 keeps recovered source out of the database entirely and
  // reloads it on demand, so a stolen copy of this file is a list of digests and
  // byte counts rather than the target's source code. `body` would be refused by
  // name below, which is a SECOND and independent reason the same property
  // holds. `line_count` is stored rather than derived because deriving it under
  // D-07 means a full bundle reload, and O-02's no-line-structure case has to be
  // detectable without one.
  sources: [
    "project_id",
    "source_sha256",
    "byte_len",
    "line_count",
    "first_seen_at",
  ],
  // ONE ROW PER `(map, index)` SIGHTING — `observations` applied to a second
  // entity class. `artifact_sha256` is not decoration: plan 07-06 re-verifies a
  // reloaded body against it and FAILS CLOSED (D-24), so recording the digest
  // here is what makes that control possible at all. `request_id` is Caido's own
  // opaque identifier for a stored request, never a URL.
  //
  // `sources_verbatim` IS THE ONE TARGET-CONTROLLED COLUMN ON THIS TABLE, and
  // the first target-controlled string at rest since `observations.url`. Its
  // justification belongs in that column's register and here it is, including
  // the part a reviewer will ask for and which must not be softened:
  //
  //   It is a DEVELOPER-AUTHORED PATH LABEL out of a sourcemap's `sources`
  //   array — not a response body, not a credential-bearing URL. It carries no
  //   query string, no userinfo and no header value, because a `sources` entry
  //   is a build-time module path and nothing in the pipeline puts anything else
  //   there. It is bounded twice: by `SOURCES_LABEL_MAX` in `store/sources.ts`,
  //   which truncates at write exactly as `URL_MAX` does, and by the map's own
  //   size, which `MAP_MAX_BYTES` already caps.
  //
  //   AND IT IS NOT REDACTED AT WRITE TIME, BECAUSE D-06 FORBIDS IT. The label
  //   is EVIDENCE — `parse.ts` keeps it verbatim, unsanitised and unnormalised,
  //   and D-06 puts sanitisation at DISPLAY time only. So this column's safety
  //   rests ENTIRELY on R1/R2 at render and on the O-08 display normaliser. That
  //   is a DISPLAY control and not a STORAGE control, and the distinction is the
  //   whole reason this paragraph is written out rather than summarised: the
  //   database holds bytes a hostile origin chose, and every surface that renders
  //   them is doing the work. `observations.url` differs here and the difference
  //   is deliberate — WR-07 redacts a URL's VALUES at write because they are
  //   credentials; a module path is not a credential and redacting it would
  //   destroy the evidence.
  //
  // `producibility` is the third closed vocabulary (D-22), declared in
  // `contract.ts` as `SOURCE_PRODUCIBILITY_STATES` immediately after the second.
  // NOT named `state` and NOT named `scan_state` — both are taken and both would
  // have accepted a value from the wrong vocabulary silently.
  source_sightings: [
    "project_id",
    "map_sha256",
    "source_index",
    "artifact_sha256",
    "request_id",
    "source_sha256",
    "sources_verbatim",
    "producibility",
    "producibility_at",
    "recovered_at",
  ],
};

/** Column names that must never exist anywhere, whatever the table. Named rather
 *  than merely omitted so the failure message says WHY. */
const FORBIDDEN_COLUMNS: Record<string, string> = {
  value_raw:
    "SEC-04 — a finding's raw value is never stored; HMAC fingerprint plus redacted preview only",
  path_key:
    "DIFF-01 is v2 scope and its validating spike moved to v2 with it (decision P4-D2)",
  body: "T-01-21 — no column may hold a response body",
  headers: "T-01-21 — no column may hold header values",
  cookie: "T-01-21 — no column may hold cookies",
  authorization: "T-01-21 — no column may hold authorization material",
  id: "no surrogate id anywhere: last_insert_rowid() is unusable on the pooled connection (decision P1-D1)",
};

/**
 * THE THREE SCALAR AFFINITIES A COLUMN OF THIS SCHEMA MAY DECLARE — D-24.
 *
 * WHY THIS IS NOT REDUNDANT WITH `FORBIDDEN_COLUMNS` ABOVE, WHICH IS THE WHOLE
 * REASON IT EXISTS. That list bans NAMES: `body`, `headers`, `cookie`,
 * `authorization`, `value_raw`, `path_key`, `id`. A column named for anything at
 * all — `payload`, `blob_data`, `cached`, `scratch` — with a binary declared type
 * passes every one of those checks while holding exactly the content the name
 * check exists to keep out. Half of D-24 shipped as that name list; this is the
 * other half, and it reads the DECLARED TYPE out of `PRAGMA table_info` the same
 * structural way the STORE-02 gate reads the `pk` ordinal.
 *
 * WHAT IT PROTECTS, AND WHY THE ARGUMENT IS ABOUT DISK RATHER THAN ABOUT TYPES.
 * DEPLOY-04 says to treat server disk as shared instance storage, with quotas and
 * orphan cleanup. D-17 discharges it BY CONSTRUCTION instead: DefMiner writes no
 * files at all — `filesystem-prohibition.spec.ts` is the gate that keeps that
 * true — and it stores no response bodies, so its ENTIRE server-disk footprint is
 * fixed-shape metadata already bounded by retention on rows and on age. No quota
 * machinery ships and no orphan sweep ships, because nothing can create the files
 * they would reclaim.
 *
 * That guarantee has exactly one other way to fail: a column that can hold
 * arbitrary bytes. A BLOB column, or an UNTYPED column — which takes BLOB
 * affinity in SQLite and which a name-based check misses entirely — re-opens the
 * footprint argument and decision D-24 with it. This gate is where that gets
 * caught, on the day it is written rather than on the day a disk fills.
 *
 * WHAT IT MAKES TRUE TODAY, VERIFIED AGAINST THE SHIPPED DDL RATHER THAN
 * ASSUMED: across every migration step in `migrations.ts` — v1's `artifacts` and
 * `observations`, v2's `analyses` and `settings`, v4's `audit`, v5's `scans` —
 * every declared type is already one of these three. So the gate goes GREEN on
 * the current schema and ALL of its value is in the day it goes red. That is not
 * a weakness of the check; it is what a gate is.
 */
const PERMITTED_DECLARED_TYPES: readonly string[] = Object.freeze([
  "INTEGER",
  "REAL",
  "TEXT",
]);

/** What `PRAGMA table_info` reports for a column declared with no type at all. */
const UNTYPED_DECLARATION = "";

type FixtureRaw = Parameters<typeof listTables>[0];

/**
 * Why one column fails D-24, as the message a reader gets at 2am.
 *
 * The reason travels with the finding rather than being left in this file, and it
 * carries the ARGUMENT rather than a rule name — the same choice
 * `outbound-prohibition.spec.ts` and `filesystem-prohibition.spec.ts` make when
 * their `why` strings travel into the violation detail.
 */
function whyForbiddenType(
  table: string,
  column: string,
  declared: string,
): string {
  const shape =
    declared === UNTYPED_DECLARATION
      ? "is declared with NO TYPE AT ALL, which takes BLOB affinity in SQLite — the case a name-based check misses entirely"
      : `declares type \`${declared}\`, which is not one of ${PERMITTED_DECLARED_TYPES.join(", ")}`;
  return (
    `${table}.${column} ${shape}. ` +
    "D-24: no column may hold a response body, header values, cookies, authorization " +
    "material or artifact content. DEPLOY-04 is satisfied BY CONSTRUCTION — DefMiner " +
    "writes no files and stores no bodies, so its whole server-disk footprint is " +
    "fixed-shape metadata already bounded by retention on rows and on age, and no quota " +
    "or orphan-cleanup machinery ships because nothing can create what it would reclaim. " +
    "A binary-affinity column re-opens that guarantee and decision D-24 with it. If this " +
    "column is genuinely needed, re-open D-24 deliberately rather than widening this set."
  );
}

/**
 * EVERY column whose declared type is outside the scalar set, across EVERY table.
 *
 * Collects rather than throwing on the first, so one run names every problem
 * instead of turning a schema review into a sequence of single-offender reruns.
 * Pure over `(raw)` so its FAILING PATH can actually be executed against a
 * throwaway table below — a gate whose failure path has never run is a gate
 * nobody has tested, which is the rule the two static gates in this package
 * already follow.
 */
function contentBearingColumns(raw: FixtureRaw): string[] {
  const offenders: string[] = [];
  for (const table of listTables(raw)) {
    for (const col of tableInfo(raw, table)) {
      const declared = col.type.trim().toUpperCase();
      if (!PERMITTED_DECLARED_TYPES.includes(declared)) {
        offenders.push(whyForbiddenType(table, col.name, declared));
      }
    }
  }
  return offenders;
}

async function migratedFixture() {
  const fx = createFixtureDb();
  const report = await migrate(fx.db);
  expect(report.ok, JSON.stringify(report.steps)).toBe(true);
  return fx;
}

describe("schema shape (STORE-01, STORE-02, T-01-21)", () => {
  it("migrates a fresh database to the head version", async () => {
    const fx = await migratedFixture();
    try {
      expect(userVersion(fx.raw)).toBe(SCHEMA_VERSION);
      expect(SCHEMA_VERSION).toBe(MIGRATIONS[MIGRATIONS.length - 1].v);
    } finally {
      fx.close();
    }
  });

  it("the table set is EXACTLY the six approved tables", async () => {
    const fx = await migratedFixture();
    try {
      const tables = listTables(fx.raw);
      // NON-VACUITY. An empty schema must fail this gate, not sail through it.
      expect(
        tables.length,
        "no user tables found — the gate would pass vacuously",
      ).toBeGreaterThan(0);
      // Exact set equality, so an EXTRA table fails as loudly as a missing one.
      // A fifth table is a schema decision that has not been through the
      // allowlist above, and this is where it gets caught.
      expect(tables).toEqual(EXPECTED_TABLES);
    } finally {
      fx.close();
    }
  });

  it("every table has project_id in its PRIMARY KEY, read by ordinal", async () => {
    const fx = await migratedFixture();
    try {
      const tables = listTables(fx.raw);
      expect(tables.length).toBeGreaterThan(0);
      let checked = 0;
      for (const table of tables) {
        const cols = tableInfo(fx.raw, table);
        expect(cols.length, `${table} has no columns`).toBeGreaterThan(0);
        const projectId = cols.find((c) => c.name === "project_id");
        expect(projectId, `${table} has no project_id column`).toBeDefined();
        // `pk` is the ONE-BASED position within the PRIMARY KEY and 0 when the
        // column is not part of it. > 0 is therefore the assertion, and it is
        // read from SQLite rather than from the CREATE TABLE text.
        expect(
          projectId?.pk,
          `${table}.project_id is not part of the PRIMARY KEY (pk ordinal ${String(projectId?.pk)})`,
        ).toBeGreaterThan(0);
        expect(projectId?.notnull, `${table}.project_id is nullable`).toBe(1);
        checked += 1;
      }
      expect(checked).toBe(EXPECTED_TABLES.length);
    } finally {
      fx.close();
    }
  });

  it("every column across every table is on the explicit allowlist", async () => {
    const fx = await migratedFixture();
    try {
      const tables = listTables(fx.raw);
      expect(tables.length).toBeGreaterThan(0);
      let columnsSeen = 0;
      for (const table of tables) {
        const allowed = COLUMN_ALLOWLIST[table];
        expect(allowed, `${table} has no allowlist entry`).toBeDefined();
        const actual = tableInfo(fx.raw, table).map((c) => c.name);
        columnsSeen += actual.length;
        // Set equality both ways: an unlisted column fails, and a listed column
        // that was silently dropped fails too.
        expect([...actual].sort()).toEqual([...(allowed ?? [])].sort());
      }
      expect(
        columnsSeen,
        "no columns enumerated — the allowlist checked nothing",
      ).toBeGreaterThan(0);
    } finally {
      fx.close();
    }
  });

  it("no forbidden column name exists in any table", async () => {
    const fx = await migratedFixture();
    try {
      const offenders: string[] = [];
      for (const table of listTables(fx.raw)) {
        for (const col of tableInfo(fx.raw, table)) {
          const reason = FORBIDDEN_COLUMNS[col.name];
          if (reason !== undefined)
            offenders.push(`${table}.${col.name}: ${reason}`);
        }
      }
      expect(offenders).toEqual([]);
    } finally {
      fx.close();
    }
  });

  it("every column of every table declares one of the three scalar affinities (D-24)", async () => {
    const fx = await migratedFixture();
    try {
      // NON-VACUITY BEFORE THE RULE. A collector that walked no columns reports
      // no offenders, which is indistinguishable from a clean schema.
      const tables = listTables(fx.raw);
      expect(tables).toEqual(EXPECTED_TABLES);
      const columnsWalked = tables.reduce(
        (total, table) => total + tableInfo(fx.raw, table).length,
        0,
      );
      expect(
        columnsWalked,
        "no columns enumerated — the declared-type gate checked nothing",
      ).toBeGreaterThan(0);

      expect(contentBearingColumns(fx.raw)).toEqual([]);
    } finally {
      fx.close();
    }
  });

  it("a BLOB column turns the collector non-empty, and the message says why", async () => {
    // THE FAILING PATH, EXECUTED. Built as a real table against the fixture
    // database rather than asserted in a comment, because a gate whose failure
    // path has never run is a gate nobody has tested.
    const fx = await migratedFixture();
    try {
      fx.raw.exec(
        "CREATE TABLE throwaway_blob (project_id TEXT NOT NULL, payload BLOB, PRIMARY KEY (project_id))",
      );
      const offenders = contentBearingColumns(fx.raw);
      expect(offenders.length).toBe(1);
      const [only] = offenders;
      // The table, the column and the offending declared type all named.
      expect(only).toContain("throwaway_blob.payload");
      expect(only).toContain("BLOB");
      // And the ARGUMENT, not just a rule id.
      expect(only).toContain("D-24");
      expect(only).toContain("DEPLOY-04 is satisfied BY CONSTRUCTION");

      // AND THE POINT OF THE WHOLE CHECK: this column is invisible to the
      // name-based half. `payload` is on no forbidden list, so without the
      // declared-type gate it would have shipped.
      expect(FORBIDDEN_COLUMNS["payload"]).toBeUndefined();
    } finally {
      fx.close();
    }
  });

  it("an UNTYPED column fails too — it takes BLOB affinity, and a name check misses it entirely", async () => {
    const fx = await migratedFixture();
    try {
      // `scratch` is declared with no type at all. SQLite accepts this and gives
      // the column BLOB affinity, so it can hold exactly the bytes a BLOB can.
      fx.raw.exec(
        "CREATE TABLE throwaway_untyped (project_id TEXT NOT NULL, scratch, PRIMARY KEY (project_id))",
      );
      const offenders = contentBearingColumns(fx.raw);
      expect(offenders.length).toBe(1);
      const [only] = offenders;
      expect(only).toContain("throwaway_untyped.scratch");
      expect(only).toContain("NO TYPE AT ALL");
      expect(only).toContain("BLOB affinity");
      // The declared type really is the empty string — the fact the message
      // rests on, asserted rather than assumed.
      const scratch = tableInfo(fx.raw, "throwaway_untyped").find(
        (c) => c.name === "scratch",
      );
      expect(scratch?.type).toBe(UNTYPED_DECLARATION);
    } finally {
      fx.close();
    }
  });

  it("collects ALL offenders in one run, across tables, rather than failing on the first", async () => {
    // The behaviour that makes one run enough to fix a schema, executed. Two
    // offending columns in one throwaway table and a third in another: a
    // first-failure gate would name one of the three and hide the rest.
    const fx = await migratedFixture();
    try {
      fx.raw.exec(
        "CREATE TABLE throwaway_a (project_id TEXT NOT NULL, one BLOB, two, PRIMARY KEY (project_id))",
      );
      fx.raw.exec(
        "CREATE TABLE throwaway_b (project_id TEXT NOT NULL, three NUMERIC, PRIMARY KEY (project_id))",
      );
      const offenders = contentBearingColumns(fx.raw);
      expect(offenders.length).toBe(3);
      expect(offenders.some((o) => o.includes("throwaway_a.one"))).toBe(true);
      expect(offenders.some((o) => o.includes("throwaway_a.two"))).toBe(true);
      expect(offenders.some((o) => o.includes("throwaway_b.three"))).toBe(true);
    } finally {
      fx.close();
    }
  });

  it("the permitted set is exactly the three scalar affinities and nothing else", () => {
    // Stated as its own case so widening the set is a visible, reviewable edit
    // with a failing test attached rather than a quiet addition to an array.
    expect([...PERMITTED_DECLARED_TYPES].sort()).toEqual([
      "INTEGER",
      "REAL",
      "TEXT",
    ]);
    expect(Object.isFrozen(PERMITTED_DECLARED_TYPES)).toBe(true);
    expect(PERMITTED_DECLARED_TYPES).not.toContain("BLOB");
    expect(PERMITTED_DECLARED_TYPES).not.toContain("NUMERIC");
  });

  it("artifacts still has NO url column — identity is content-addressed", async () => {
    const fx = await migratedFixture();
    try {
      const names = tableInfo(fx.raw, "artifacts").map((c) => c.name);
      expect(names).not.toContain("url");
      // The URL lives on the edge, and this is the assertion that says so.
      expect(tableInfo(fx.raw, "observations").map((c) => c.name)).toContain(
        "url",
      );
    } finally {
      fx.close();
    }
  });

  it("analyses is keyed on (project_id, sha256, detector_set_hash) in that order", async () => {
    const fx = await migratedFixture();
    try {
      const key = tableInfo(fx.raw, "analyses")
        .filter((c) => c.pk > 0)
        .sort((a, b) => a.pk - b.pk)
        .map((c) => c.name);
      // The corpus version is part of the KEY, not a column beside it: that is
      // what makes a corpus bump invalidate exactly the analyses at the old
      // value (CORE-08, STORE-04).
      expect(key).toEqual(["project_id", "sha256", "detector_set_hash"]);
    } finally {
      fx.close();
    }
  });

  it("settings is the ONLY table that accepts an empty project_id", async () => {
    const fx = await migratedFixture();
    try {
      // '' is RESERVED on settings and means "global".
      const put = await fx.db.prepare(
        "INSERT INTO settings (project_id, key, value, updated_at) VALUES (?, ?, ?, ?)",
      );
      await expect(
        put.run("", "retention.max_rows", "5000", 1),
      ).resolves.toBeDefined();

      // And is a project-scoping BUG everywhere else.
      const art = await fx.db.prepare(
        "INSERT INTO artifacts (project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count) VALUES (?, ?, ?, ?, ?, ?, 1)",
      );
      await expect(
        art.run("", "a".repeat(64), 10, "js", 1, 1),
      ).rejects.toThrow();

      const obs = await fx.db.prepare(
        "INSERT INTO observations (project_id, sha256, request_id, url, status, content_type, observed_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      );
      await expect(
        obs.run("", "a".repeat(64), "r1", "https://x/y.js", 200, null, 1),
      ).rejects.toThrow();

      const ana = await fx.db.prepare(
        "INSERT INTO analyses (project_id, sha256, detector_set_hash, scan_state, started_at) VALUES (?, ?, ?, ?, ?)",
      );
      await expect(
        ana.run("", "a".repeat(64), "h", "pending", 1),
      ).rejects.toThrow();
    } finally {
      fx.close();
    }
  });

  it("analyses.scan_state is a CLOSED vocabulary", async () => {
    const fx = await migratedFixture();
    try {
      const stmt = await fx.db.prepare(
        "INSERT INTO analyses (project_id, sha256, detector_set_hash, scan_state, started_at) VALUES (?, ?, ?, ?, ?)",
      );
      // OBS-02 owns the degradation vocabulary in Phase 2. These five values are
      // picked now and must not be contradicted later; `pending` is what makes
      // this table double as the durable job queue ERR-02 and CORE-09 need.
      //
      // READ FROM `SCAN_STATES`, NEVER RESTATED (plan 05-09). The list moved to
      // @defminer/engine/contract so the frontend's status badge could bind to
      // the shipped values without importing this package; a literal copy here
      // would let the DDL and the vocabulary drift with this gate still green.
      for (const state of SCAN_STATES) {
        await expect(
          stmt.run("p1", state.padEnd(64, "0"), "h", state, 1),
        ).resolves.toBeDefined();
      }
      await expect(
        stmt.run("p1", "z".repeat(64), "h", "in_progress", 1),
      ).rejects.toThrow();
    } finally {
      fx.close();
    }
  });

  it("scans keys on (project_id, scan_id) IN THAT ORDER, by PRAGMA ordinal", async () => {
    // STORE-02's rule read structurally rather than from the DDL text: `pk` is
    // the ONE-BASED position within the PRIMARY KEY, so `project_id` at 1 and
    // `scan_id` at 2 is the assertion. A CREATE TABLE whose comment claims a
    // project-first key it does not have passes any grep and fails here.
    const fx = await migratedFixture();
    try {
      const cols = tableInfo(fx.raw, "scans");
      const byName = new Map(cols.map((c) => [c.name, c]));

      expect(byName.get("project_id")?.pk).toBe(1);
      expect(byName.get("scan_id")?.pk).toBe(2);
      expect(byName.get("project_id")?.notnull).toBe(1);
      expect(byName.get("scan_id")?.notnull).toBe(1);

      // THE IDENTIFIER IS `scan_id` AND THERE IS NO `id`. Asserted here as well
      // as in the package-wide forbidden-column check, because this is the one
      // table where the temptation is live: `last_insert_rowid()` is unusable
      // on the pooled connection, so a surrogate id would be a row identity
      // nothing can read back.
      expect(byName.has("id")).toBe(false);
    } finally {
      fx.close();
    }
  });

  it("scans.state is a CLOSED vocabulary, and it is the LIFECYCLE one", async () => {
    // READ FROM `SCAN_LIFECYCLE_STATES`, NEVER RESTATED — the same discipline
    // the `analyses.scan_state` case above follows, and it matters more here:
    // `running` is a member of BOTH vocabularies, so a literal copy in this
    // file could satisfy the wrong one and still look right.
    const fx = await migratedFixture();
    try {
      const stmt = await fx.db.prepare(
        `INSERT INTO scans (project_id, scan_id, state, operator_filter, epoch,
                            last_request_id, pages_walked, seen, admitted,
                            skipped_done, rejected, queued, started_at, updated_at)
         VALUES (?, ?, ?, '', 0, '', 0, 0, 0, 0, 0, 0, 1, 1)`,
      );
      for (const state of SCAN_LIFECYCLE_STATES) {
        await expect(
          stmt.run("p1", `scan-${state}`, state),
        ).resolves.toBeDefined();
      }
      // A member of the OTHER vocabulary. `done` is a perfectly good analysis
      // state and is not a scan lifecycle state, and the database says so.
      await expect(stmt.run("p1", "scan-done", "done")).rejects.toThrow();
    } finally {
      fx.close();
    }
  });

  it("at most ONE running scan per project, enforced by the driver and not by a prior read", async () => {
    // The invariant that cannot be a caller-side check: `BEGIN` does not span
    // `exec` calls on this driver and every statement still reports success, so
    // "read whether one is running, then insert" is two operations nothing can
    // make atomic. The partial unique index makes the second insert FAIL.
    const fx = await migratedFixture();
    try {
      const insert = await fx.db.prepare(
        `INSERT INTO scans (project_id, scan_id, state, operator_filter, epoch,
                            last_request_id, pages_walked, seen, admitted,
                            skipped_done, rejected, queued, started_at, updated_at)
         VALUES (?, ?, ?, '', 0, '', 0, 0, 0, 0, 0, 0, 1, 1)`,
      );
      await expect(insert.run("p1", "s1", "running")).resolves.toBeDefined();
      await expect(insert.run("p1", "s2", "running")).rejects.toThrow();

      // ANOTHER PROJECT IS UNAFFECTED. The index is partial on `state` and
      // keyed on `project_id`, so the invariant is per project rather than
      // global — one SQLite file serves every Caido project (T-01-20).
      await expect(insert.run("p2", "s3", "running")).resolves.toBeDefined();

      // AND A SUSPENDED SCAN DOES NOT HOLD THE SLOT. It is the state predicate
      // in the index that makes resuming possible at all.
      await expect(insert.run("p1", "s4", "suspended")).resolves.toBeDefined();
    } finally {
      fx.close();
    }
  });
});
