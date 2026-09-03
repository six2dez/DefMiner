// packages/backend/src/store/export.ts — the inventory export, serialised
// (UI-06, UISEC-02).
//
// ===========================================================================
// THIS MODULE RETURNS BYTES. IT DOES NOT WRITE A FILE, AND THERE IS NO PATH
// ANYWHERE IN IT. (decision D-04)
// ===========================================================================
// An export is a BROWSER DOWNLOAD onto the operator's own machine: the backend
// serialises and returns the bytes across the RPC boundary, the frontend
// concatenates the chunks, builds a Blob and triggers the download. No
// `sdk.meta.path()`, no temporary file, no hosted-file delivery mechanism,
// no directory. (The forbidden identifiers are deliberately not written out
// here: the plan's acceptance gate greps this file for them, and a gate a
// comment can trip is a gate that gets weakened rather than obeyed — the same
// reasoning `api/spec.ts` gives for not naming the two deprecated SDK helpers.)
//
// That is not an implementation preference, it is the decision that removes the
// export from the deployment phase's problem space entirely rather than
// deferring it: there is nothing to quota, nothing to orphan-clean, nothing to
// label "on the Caido server", and nothing to make reachable. The behaviour is
// identical on a local desktop install, a remote command-line install and a
// container with or without a persistent volume — and a RAW export never
// touches shared server disk, which is the property that matters most, because
// Caido is client/server and "the server" may be a VPS somebody else also uses.
//
// The cost D-04 accepts is that an export is bounded by what crosses the
// boundary in memory. Plan 05-02 measured that bound rather than guessing it and
// turned it into {@link EXPORT_RPC_CHUNK_ROWS}.
//
// ===========================================================================
// THE FIELD RULE IS IMPORTED, NEVER REIMPLEMENTED
// ===========================================================================
// `csvField`/`csvRow`/`csvHeader` live in `@defminer/engine/csv` and the safety
// specs assert R3 against THEM. Writing a second field escaper here would mean
// the exported bytes and the tested rule are two different things, and the one
// that is wrong stays wrong because nobody diffs two implementations of one
// security rule. The same argument the frontend's `safety/display.ts` makes for
// re-asserting R2 by CALLING the engine rather than by restating it.
//
// The engine's rule is deliberately STRONGER than R3's letter (engine decision
// P5-D10) and this module inherits that strength rather than correcting it: TAB
// and CR are C0 controls, the strip runs BEFORE the lead test, so a TAB or CR
// lead never reaches the test — and whatever it was hiding becomes the first
// character and IS apostrophe-prefixed. Threat T-05-14 closed by construction.
//
// The structured format applies the control strip and the redaction and NOT the
// formula neutralisation, per R3's third bullet: a JSON consumer does not
// evaluate a leading `=`, and an apostrophe there would be a byte every consumer
// has to know to remove.
//
// ===========================================================================
// WHAT "RAW" CANNOT DO, AND WHY THE CONFIRMATION COPY HAD TO BE AMENDED
// ===========================================================================
// The redaction mode lifts only the redaction applied at EXPORT time. Query
// values in observed URLs were replaced with `QUERY_VALUE_REDACTION` at WRITE
// time by `observations.ts` and are not in the database at all, so NO mode can
// recover them. That is a fact about the schema, not a limitation of this
// module, and it is why the design contract's raw-export confirmation was
// amended (decision D-07): the earlier copy promised live values in cleartext,
// which URL query values cannot honour.
//
// ===========================================================================
// NO SQL LIVES HERE
// ===========================================================================
// {@link readExportChunk} pages through `reads.ts`'s audited statement matrix
// and adds no statement of its own — which is why `sql-discipline.spec.ts` has
// nothing to say about this file. An export that built its own query would be a
// second, ungated SQL surface over the same partition.

import type {
  ExportFormat,
  ExportRedactionMode,
  ExportTable,
  PageCursor,
  PageRequest,
} from "@defminer/engine/contract";
import {
  DEGRADED_ANALYSIS_FILTER,
  EXPORT_FORMATS,
} from "@defminer/engine/contract";
import { CSV_LINE_TERMINATOR, csvHeader, csvRow } from "@defminer/engine/csv";
import {
  BIDI_OVERRIDES_ISOLATES,
  C0_C1_CONTROLS,
} from "@defminer/engine/sanitise";
import type { Database } from "sqlite";

// Caught exceptions render through `describeError`, never a bare stringification.
// The reasoning — a driver rejection carries the bound parameters, and one of them
// is the observation URL — is stated once beside the first converted site in
// `artifacts.ts`. Enforced by `error-redaction.spec.ts`. THIS MODULE CATCHES
// NOTHING: it is a read, and this package's split is that writes report their own
// outcome and list reads do not.

import {
  countInventory,
  KEYSET_PAGE_ROWS,
  listArtifactsPage,
  listObservationsPage,
  listRecoveredSourcesPage,
} from "./reads";

// ---------------------------------------------------------------------------
// THE MEASURED CHUNK CONSTANT
// ---------------------------------------------------------------------------

/**
 * Rows per export RPC call.
 *
 * DERIVED FROM A SERIALISATION THAT ACTUALLY RAN, in plan 05-02: a 50,000-row
 * export is 13.87 MiB of CSV and 17.49 MiB of JSON, a worst case of 366.87
 * bytes per row. Against the 8 MiB per-call figure, 20,000 rows is 7.00 MiB and
 * fits while 25,000 would be 8.75 MiB and does not — so a 50,000-row export
 * crosses as THREE calls.
 *
 * THE 8 MiB FIGURE IS A BUDGET THIS PROJECT SETS, NOT A CEILING IT MEASURED
 * FROM CAIDO. Nothing in this repository can push bytes through Caido's RPC, so
 * the real ceiling is live-only — the same honest limit
 * `test/fixtures/sqlite-fixture.ts` records about pool affinity. The budget is
 * chosen so the chunk seam is exercised by the largest export the product
 * contemplates rather than being a code path nobody runs, and so the peak string
 * on the single QuickJS thread stays in single-digit megabytes.
 *
 * ITS HOME IS HERE AND NOT IN `tests/`. It was exported from
 * `tests/export-payload-budget.spec.ts` while no production statement needed it;
 * production code must not import from a spec, so this plan moved it. That spec
 * now imports it from here and still DERIVES it — multiplying it by the measured
 * bytes-per-row and asserting the product fits the budget while one step larger
 * would not — so the number stays measured rather than remembered.
 */
export const EXPORT_RPC_CHUNK_ROWS = 20_000;

// ---------------------------------------------------------------------------
// THE TWO CLOSED VOCABULARIES — IMPORTED, NOT DECLARED HERE
// ---------------------------------------------------------------------------
//
// `EXPORT_FORMATS` and `EXPORT_REDACTION_MODES` live in
// `@defminer/engine/contract` beside every other vocabulary both packages bind
// to. The frontend needs them as VALUES to render the two radio options in the
// order the design contract fixes, and the two packages cannot import each
// other — so a copy here would be a second copy of a list whose ORDER is a
// safety property. See the contract's own note: the first member is what a
// positional mistake lands on, and the one it must land on is the one that
// withholds.

/**
 * The content type each format is downloaded as.
 *
 * The charset is stated rather than left to the browser: an export of target
 * URLs contains non-ASCII, and a Blob built without a charset opens as mojibake
 * in the one place the operator was hoping to read a hostname.
 */
export const EXPORT_CONTENT_TYPES: Readonly<Record<ExportFormat, string>> =
  Object.freeze({
    csv: "text/csv;charset=utf-8",
    json: "application/json;charset=utf-8",
  });

/** The file extension each format is downloaded with. */
const EXPORT_EXTENSIONS: Readonly<Record<ExportFormat, string>> = Object.freeze(
  {
    csv: "csv",
    json: "json",
  },
);

// ---------------------------------------------------------------------------
// THE REDACTION POLICY, PER COLUMN
// ---------------------------------------------------------------------------

/**
 * What a covered field reads as in the redacted mode.
 *
 * Shaped to rhyme with `telemetry.ts`'s `URL_REDACTION` and `observations.ts`'s
 * `QUERY_VALUE_REDACTION` so the three read as ONE policy rather than three
 * accidents, and distinct from both so a reader can tell WHICH rule fired.
 */
export const EXPORT_QUERY_REDACTION = "<query-redacted>";

/**
 * The redacted form of an observed URL: everything up to the query or fragment,
 * and a marker in place of the rest.
 *
 * WHY THE QUERY AND NOT THE WHOLE URL. The host and path are the analytic
 * content — an export that withheld them would be an export nobody uses, and an
 * operator who never uses the safe default is an operator who always picks raw,
 * which defeats the whole design. What the query carries is the residual
 * `observations.ts` DISCLOSES rather than closes: query VALUES were replaced at
 * write time, but the NAME half of a genuine pair is retained whatever it
 * contains, including a credential pasted where a parameter name goes. That
 * residual is exactly what the raw mode exposes and the redacted mode withholds,
 * which is what makes the two modes a real choice rather than a ceremony.
 *
 * The marker is APPENDED rather than the query silently dropped: a reader who
 * cannot tell whether a URL had a query cannot tell whether anything was
 * withheld, and a redaction nobody can see is indistinguishable from data that
 * was never there.
 */
export function redactUrlForExport(url: string): string {
  const cut = url.search(/[?#]/);
  return cut === -1 ? url : `${url.slice(0, cut)}${EXPORT_QUERY_REDACTION}`;
}

/**
 * The schemes a `sources` label may carry WITHOUT an authority separator, and
 * the separator itself.
 *
 * A SECOND IMPLEMENTATION OF ONE CLASSIFICATION, AND THAT COST IS RECORDED
 * RATHER THAN HIDDEN. `packages/frontend/src/sourcemap/tree.ts` already decides
 * this for the display tree, in `classify()` behind the exported
 * `sourcePathShape()`, and its `"protocol"` branch is the one restated here.
 * The backend CANNOT call it: `packages/backend/package.json` depends on
 * `@defminer/engine` alone, the frontend is not a dependency of it, and adding
 * one would run a Vue-package import graph through the plugin that talks to the
 * Caido SDK. Inventing that dependency to save nine lines is the worse trade.
 *
 * SO THE TWO ARE KEPT ALIGNED BY NAME. If `sourcePathShape`'s `"protocol"`
 * branch changes — a scheme added, the separator rule loosened — this list and
 * {@link isProtocolShapedLabel} change with it. Nothing in the toolchain
 * enforces that, which is exactly why it is written here instead of being left
 * for a reader to notice.
 */
const LABEL_KNOWN_SCHEMES = ["webpack:", "file:", "https:", "http:"] as const;
const LABEL_SCHEME_SEPARATOR = "://";

/**
 * Whether one `sources` label is a URL rather than a path.
 *
 * The `firstSlash === separator + 1` test is not decoration: it is what stops a
 * path segment that merely CONTAINS a colon-slash-slash — `src/a://b` — from
 * being read as an authority separator. `tree.ts` makes the same test for the
 * same reason.
 *
 * @internal
 */
export function isProtocolShapedLabel(label: string): boolean {
  const separator = label.indexOf(LABEL_SCHEME_SEPARATOR);
  const firstSlash = label.indexOf("/");
  if (separator > 0 && firstSlash === separator + 1) return true;
  return LABEL_KNOWN_SCHEMES.some((scheme) => label.startsWith(scheme));
}

/**
 * The redacted form of one manifest `sources` label.
 *
 * ===========================================================================
 * THIS IS NOT A PER-COLUMN EXEMPTION. IT IS EACH AXIS REDACTED WHERE THAT AXIS
 * EXISTS (LO-04, THEN WR-03)
 * ===========================================================================
 * The `sources` entry below used to argue that "NO PER-COLUMN EXEMPTION IS
 * INVENTED", and that argument STILL STANDS — nothing here withholds less of a
 * URL than `observations.url` withholds, and the raw option remains the only
 * route to the unredacted bytes. What changed is narrower than an exemption:
 * {@link redactUrlForExport} cuts at the first `?` or `#` because in a URL
 * those characters BEGIN the query and the fragment, and a `sources` label is a
 * URL only when it is protocol-shaped.
 *
 * THE TWO AXES ARE NOT THE SAME QUESTION. That is what LO-04 got right and
 * what 07-16 then overshot by collapsing them back into one shape test.
 *
 * THE FRAGMENT AXIS, UNMOVED. `#` is a legal filename character;
 * `src/components/Button#new.tsx` is a real name. Cutting it did two wrong
 * things at once: it DISCARDED a legal path tail, and it printed a marker
 * telling the reader a query had been withheld when there had never been one —
 * `src/components/Button<query-redacted>`, two wrong claims in one field. So
 * the fragment axis is still cut only on a label that is actually a URL.
 *
 * THE QUERY AXIS, RESTORED. 07-16's premise — that a label which is not a URL
 * has neither axis — was FALSE for the commonest shape there is.
 * `src/App.vue?vue&type=script&lang.ts` is the ordinary vite and webpack loader
 * query, and `sourcePathShape()` puts it in `relative`, so between 07-16 and
 * WR-03 it exported VERBATIM in the mode an operator picks BECAUSE the artifact
 * is going to be shared. `map-fixture.ts` carries that shape as `loader-query`,
 * and `export.spec.ts` pins both of its modes by that id.
 *
 * WHY THE ASYMMETRY IS DEFENSIBLE, AND WHAT KIND OF CLAIM IT IS. `?` is a
 * reserved delimiter in URI syntax (RFC 3986) and the Win32 API rejects it in a
 * path, so a `?` inside a BUNDLER-EMITTED `sources` label is overwhelmingly a
 * loader or URL artifact rather than part of a source name. That is a claim
 * about the population of labels a bundler produces. It is deliberately NOT the
 * stronger claim that a `?` cannot be part of a name — that stronger claim is
 * untrue, and this comment does not make it. On the population that reaches
 * this function, a marker beside a cut `?` is a TRUE statement, which is the
 * constraint LO-04 established and the only one that governs here.
 *
 * AND THE PREMISE IS THE OPERATOR'S, NOT THIS MODULE'S. It was put to them at a
 * blocking checkpoint on 2026-09-02 (WR-03, `07-22-PLAN.md` task 1), against the
 * stated alternative of correcting the sentence and SANCTIONING the disclosure
 * instead, with the note that the alternative was the right answer if they
 * judged a `?` could legitimately be part of a source name. They accepted it.
 * What a redacted manifest label is now promised to withhold, in the words the
 * decision was made against:
 *
 *   "A non-protocol label is cut at the first `?` only, with the SHIPPED marker
 *   appended, and keeps its `#` tail."
 *
 * THAT PRINCIPLE IS STATED OF THIS BRANCH, NOT OF THE EXPORT AS A WHOLE. On the
 * label branch this function decides, a redaction that reports withholding
 * something that was never there is not a stronger redaction. It is an
 * unreliable one, and an operator who finds one marker they can prove is false
 * has no reason to trust the next. The scoping is deliberate: the delegated
 * branch does NOT honour it, and that exception is recorded immediately below
 * rather than papered over by a sentence that covers it silently.
 *
 * THE KNOWN AND ACCEPTED EXCEPTION, ON THE DELEGATED BRANCH.
 * {@link redactUrlForExport} cuts at the first `?` OR `#` and appends
 * {@link EXPORT_QUERY_REDACTION} for either hit, so a fragment-only URL such as
 * `webpack:///./src/app.js#L5` exports with a query marker over a value that has
 * no query axis. `export.spec.ts` pins exactly that as EXPECTED, and the column
 * comment on `sources_verbatim` names the same output as the wrong thing LO-04's
 * fix removed on the path branch. It is PRE-EXISTING `redactUrlForExport`
 * behaviour and it is `observations.url`'s shipped behaviour on every row it has
 * ever written.
 *
 * IT IS ACCEPTED RATHER THAN DEFENDED, and the cost is named so nobody has to
 * re-derive it: the marker discloses LESS than the truth, so what it costs is
 * OPERATOR TRUST AND REVIEWABILITY, not disclosure. Nothing leaks. Making the
 * marker true on both branches needs a second vocabulary word and a change to
 * `observations.url`'s shipped output — the operator declined that here as a
 * decision needing its own round rather than a drive-by (07-UAT.md G-07-7,
 * 2026-09-03).
 *
 * NO NEW VOCABULARY. The marker is {@link EXPORT_QUERY_REDACTION}, unchanged
 * and spelt in exactly one place; this function decides WHERE the shipped
 * redactor runs, never what it says. And `observations.url` does not reach this
 * function at all — `redactUrlForExport` is untouched, so that column's output
 * is byte-identical to what it has always been.
 *
 * @internal
 */
export function redactSourceLabelForExport(label: string): string {
  if (isProtocolShapedLabel(label)) return redactUrlForExport(label);
  // NOT a URL, so only the query axis applies: `#` here is a filename
  // character, and `redactUrlForExport` would cut on it. Hence the first `?`
  // by hand rather than delegating — the SAME marker, a narrower cut.
  const query = label.indexOf("?");
  return query === -1
    ? label
    : `${label.slice(0, query)}${EXPORT_QUERY_REDACTION}`;
}

/**
 * One exported column.
 *
 * `redact` is `null` for a column the raw mode has nothing to reveal about, and
 * a function for one it does. A BOOLEAN plus a policy elsewhere would put the
 * "which columns" question and the "what does redaction mean" question in two
 * files that only ever change in one of them.
 *
 * @internal
 */
export type ExportColumn = {
  readonly name: string;
  readonly redact: ((value: string) => string) | null;
};

/**
 * The exported columns of each export table, in order.
 *
 * TWO COVERED COLUMNS EXIST TODAY: `observations.url` and the manifest's
 * `sources_verbatim`. `artifacts` carries none — a digest, a byte length, a kind
 * and three timestamps are all DefMiner's own measurements — so a raw export of
 * `artifacts` is byte-identical to a redacted one, asserted in `export.spec.ts`.
 *
 * THE CEREMONY IN FRONT OF THE RAW OPTION IS NOT WEAKENED FOR THAT TABLE, and
 * that is deliberate: an operator should not have to learn which tables are
 * "safe", because that knowledge stops being true the moment a table with a
 * covered column is added — which is exactly what the manifest did.
 *
 * ===========================================================================
 * THE MANIFEST, AND WHICH HALF OF MAP-07 EACH MECHANISM MEETS (D-20)
 * ===========================================================================
 * MAP-07 asks that recovered source be "browsable in the plugin UI and
 * exportable with a manifest", and it splits at THIS PATH's own seam. Stated
 * here rather than left for a verifier to work out:
 *
 *   "browsable in the plugin UI"   `listRecoveredSources` + `deriveSource`,
 *                                  with content RE-DERIVED ON DEMAND per D-07 —
 *                                  nothing is held at rest, so there is nothing
 *                                  here to serialise.
 *   "exportable with a manifest"   THE ROWS BELOW, riding this module unchanged
 *                                  and delivered by the shipped chunked RPC
 *                                  download.
 *   single-file content            a browser download from the content already
 *                                  in the viewer, one file at a time.
 *
 * WHAT WAS REJECTED, AND WHY, because a rejected option that is not written
 * down gets proposed again. A BULK CONTENT EXPORT would need a second export
 * shape `serialiseRows` does not describe — it serialises ROWS, not file bodies
 * — it would RE-DERIVE EVERY FILE during the export, reloading and re-hashing
 * one bundle per source, and it would therefore be a long serial job needing its
 * own progress surface, its own cancellation and its own partial-result
 * semantics. That is Phase 6's lesson about what a long serial job costs, paid a
 * second time, for a capability the single-file download already covers.
 *
 * NINE COLUMNS, MIRRORING THE ROW `listRecoveredSourcesPage` RETURNS, plus the
 * artifact digest the read carries as its SCOPE rather than as a column. It is
 * first because it is what makes an exported row self-describing: a manifest
 * read a week later has no drill-down header above it.
 */
export const EXPORT_COLUMNS: Readonly<
  Record<ExportTable, readonly ExportColumn[]>
> = Object.freeze({
  artifacts: Object.freeze([
    { name: "project_id", redact: null },
    { name: "sha256", redact: null },
    { name: "byte_len", redact: null },
    { name: "kind", redact: null },
    { name: "scan_state", redact: null },
    { name: "first_seen_at", redact: null },
    { name: "last_seen_at", redact: null },
    { name: "seen_count", redact: null },
  ]),
  observations: Object.freeze([
    { name: "project_id", redact: null },
    { name: "sha256", redact: null },
    { name: "request_id", redact: null },
    { name: "url", redact: redactUrlForExport },
    { name: "status", redact: null },
    { name: "content_type", redact: null },
    { name: "observed_at", redact: null },
  ]),
  sources: Object.freeze([
    { name: "artifact_sha256", redact: null },
    { name: "map_sha256", redact: null },
    { name: "source_index", redact: null },
    // ===================================================================
    // THE MANIFEST'S ONE TARGET-CONTROLLED COLUMN, AND WHICH HALF OF THE
    // ORIGINAL ARGUMENT SURVIVED LO-04
    // ===================================================================
    // WHAT SURVIVES. A `sources` entry is OFTEN URL-SHAPED — `webpack://…`,
    // `file://…` and `http://…` are all real shapes SPIKE-12 measured against
    // the corpus — and for those the shipped redactor applies for the same
    // reason it applies to an observed URL: the host and path are the analytic
    // content and the QUERY is the residual. NO PER-COLUMN EXEMPTION IS
    // INVENTED, and that is still true: the evidence D-06 preserves is
    // retrievable through the raw option, which is what the raw option is for,
    // and this column is inside the same ceremony as every other one.
    //
    // WHAT DOES NOT SURVIVE: "URL-SHAPED BY CONSTRUCTION". It is not. Five
    // shapes are measured and four of them are paths, so the sentence held for
    // the `webpack://` prefix and never for the path body. Cutting a bare path
    // at its first `#` discarded a legal filename tail AND printed a marker
    // claiming a query had been withheld from a value with no query axis.
    //
    // Hence {@link redactSourceLabelForExport}: the SAME redactor, the SAME
    // marker, applied where its subject exists. Not an exemption — a narrowed
    // application, which is a different thing and is argued in full at that
    // function.
    { name: "sources_verbatim", redact: redactSourceLabelForExport },
    { name: "source_sha256", redact: null },
    { name: "byte_len", redact: null },
    { name: "line_count", redact: null },
    { name: "producibility", redact: null },
    { name: "recovered_at", redact: null },
  ]),
});

// ---------------------------------------------------------------------------
// THE FLOOR STATEMENT THE FILE ITSELF CARRIES (UI-09)
// ---------------------------------------------------------------------------

/**
 * How many contributing artifacts there are, and how many of them stopped short.
 *
 * `degraded` is `partial` PLUS `failed`, which is the predicate
 * `isDegradedScanState` names in the engine contract. Both numbers are counted
 * by the BACKEND through `reads.ts`'s `countInventory`; neither is derived in
 * the frontend, for the same reason the panel's byte numbers are not.
 */
export type ContributingArtifactCounts = {
  readonly total: number;
  readonly degraded: number;
};

/**
 * Count the contributing artifacts, and how many of them stopped short.
 *
 * TWO COUNTS THROUGH `reads.ts`'s ALREADY-AUDITED STATEMENTS, and no statement
 * of its own: the unfiltered artifact count, and the same count under
 * {@link DEGRADED_ANALYSIS_FILTER} — the one filter that expresses "partial OR
 * failed", which a single bound equality cannot.
 *
 * COUNTED ON THE BACKEND, NOT DERIVED IN THE FRONTEND. The dialog shows the
 * operator the same two numbers before the confirmation, but the numbers the
 * FILE carries are these — read at the moment the export is serialised, from the
 * same partition it is serialised from. A file whose caveat came from a frontend
 * snapshot taken some seconds earlier would be a caveat about a different view.
 *
 * The counts are over `artifacts` whichever table is being exported: an
 * observation is a SIGHTING of an artifact and the analysis lives on the bytes,
 * so the artifacts are what contribute to any inventory the export covers.
 */
export async function readContributingArtifactCounts(
  db: Database,
  projectId: string,
): Promise<ContributingArtifactCounts> {
  const total = await countInventory(db, projectId, "artifacts", null);
  const degraded = await countInventory(
    db,
    projectId,
    "artifacts",
    DEGRADED_ANALYSIS_FILTER,
  );
  return { total: total.visible, degraded: degraded.visible };
}

/**
 * The sentence an incomplete export carries INSIDE the file, or `null`.
 *
 * WHY IT IS IN THE FILE AND NOT ONLY IN THE VIEW. A file read a week later has
 * no banner above it. If the floor caveat lives only in the UI, the export
 * silently becomes a claim of completeness the moment it leaves the tool — and
 * UI-09 forbids a degraded analysis being presented as complete, which is
 * exactly what a bare spreadsheet of rows is.
 *
 * DEFMINER-AUTHORED END TO END, and it must stay that way: the only
 * interpolations are two integers. It carries no `"` and no line terminator,
 * which is what lets the delimited format emit it as a bare comment line without
 * a field escape — {@link csvFloorComment} asserts that rather than trusting it.
 */
export function floorStatement(
  counts: ContributingArtifactCounts,
): string | null {
  if (counts.degraded <= 0) return null;
  const noun = counts.total === 1 ? "artifact" : "artifacts";
  return (
    `Partial analysis — ${String(counts.degraded)} of ${String(counts.total)} ` +
    `${noun} contributing to this export are Partial or Failed. ` +
    `The rows below are a floor, not a total.`
  );
}

/**
 * The floor statement as a leading comment line, or the empty string.
 *
 * RFC 4180 HAS NO COMMENT SYNTAX, so this is a leading `#` line — which every
 * spreadsheet shows as the top row and every text reader shows as a sentence.
 * That visibility IS the point: a metadata field nobody renders would put the
 * caveat back where UI-09 says it must not be.
 *
 * It is emitted UNQUOTED, and the throw below is what makes that safe rather
 * than lucky. A statement carrying a quote or a line terminator could break the
 * document's row grammar, and the day somebody edits the sentence is the day
 * that would happen silently.
 */
function csvFloorComment(statement: string | null): string {
  if (statement === null) return "";
  if (/["\r\n]/.test(statement)) {
    throw new Error(
      "export: the floor statement must contain no quote and no line " +
        "terminator — it is emitted as a bare comment line and would " +
        "otherwise break the document's row grammar.",
    );
  }
  return `# ${statement}${CSV_LINE_TERMINATOR}`;
}

// ---------------------------------------------------------------------------
// SERIALISATION
// ---------------------------------------------------------------------------

/** One row as the serialiser reads it — the columns it names, and nothing the
 *  serialiser has to know the table's TypeScript shape to reach. */
export type ExportableRow = Record<string, string | number | null>;

/**
 * R2's two strips, over the IMPORTED ranges.
 *
 * The ranges come from `@defminer/engine/sanitise` and are not restated here:
 * one security constant, many consumers, which is the same rule `csv.ts`'s own
 * header states about importing `C0_C1_CONTROLS` rather than declaring a second
 * copy of it.
 *
 * NO TRUNCATION. R2's grapheme caps are DOM caps — 256 in a 32px table cell,
 * 2,048 in the evidence panel — and they exist because a value that grows a
 * fixed row breaks a virtualised list. A file has no row height, and truncating
 * an exported value would silently produce a file that disagrees with the
 * database it came from.
 */
function stripForExport(value: string): string {
  return value.replace(C0_C1_CONTROLS, "").replace(BIDI_OVERRIDES_ISOLATES, "");
}

/** One row projected onto its columns, in order, as strings.
 *
 *  EVERY VALUE IS A STRING, INCLUDING THE NUMERIC COLUMNS, so the two formats
 *  carry byte-identical field values and any difference between them can only
 *  come from the format's own syntax. A structured export that emitted numbers
 *  as numbers would be a second projection of the same row, and the two would
 *  eventually disagree about a null. */
function projectRow(
  row: ExportableRow,
  columns: readonly ExportColumn[],
  mode: ExportRedactionMode,
): string[] {
  return columns.map((column) => {
    const value = row[column.name];
    // `null` becomes the EMPTY value, not the word "null": a column keeps its
    // position and a reader is not told the string `null` was stored.
    const text = value === null || value === undefined ? "" : String(value);
    const withheld =
      mode === "redacted" && column.redact !== null
        ? column.redact(text)
        : text;
    return stripForExport(withheld);
  });
}

/** What one call to {@link serialiseRows} is serialising.
 *
 *  @internal */
export type SerialiseRequest = {
  readonly table: ExportTable;
  readonly format: ExportFormat;
  readonly mode: ExportRedactionMode;
  readonly rows: readonly ExportableRow[];
  /** Zero for the first chunk. The header, and the floor comment, belong to it
   *  and to no other. */
  readonly chunkIndex: number;
  /** True for the chunk that closes the document. The structured format needs
   *  it — an array has to be closed — and the delimited one does not. */
  readonly lastChunk: boolean;
  readonly counts: ContributingArtifactCounts;
};

/**
 * One chunk of the document, as bytes.
 *
 * THE CHUNK SEAM IS BYTE-IDENTICAL TO A SINGLE PASS, in both formats, and
 * `export.spec.ts` asserts it over real rows rather than describing it. That is
 * the whole of the chunking contract: the header appears on chunk zero and
 * nowhere else, the structured format's element separator IS the seam, and
 * concatenating the chunks in order reproduces the file exactly.
 */
export function serialiseRows(request: SerialiseRequest): string {
  const columns = EXPORT_COLUMNS[request.table];
  const projected = request.rows.map((row) =>
    projectRow(row, columns, request.mode),
  );

  if (request.format === "csv") {
    const head =
      request.chunkIndex === 0
        ? csvFloorComment(floorStatement(request.counts)) +
          csvHeader(columns.map((c) => c.name))
        : "";
    return head + projected.map((fields) => csvRow(fields)).join("");
  }

  const elements = projected.map((fields) => {
    const object: Record<string, string> = {};
    columns.forEach((column, i) => {
      object[column.name] = fields[i] ?? "";
    });
    return JSON.stringify(object);
  });

  // THE SEAM IS INSIDE THE BRACKETS. Concatenating complete `[...]` arrays
  // would produce `][`, so a later chunk opens with the separator the single
  // pass would have written anyway.
  let out = "";
  if (request.chunkIndex === 0) {
    const statement = floorStatement(request.counts);
    // ABSENT, not null, when the analysis was complete. A `null` floor is a
    // field a consumer has to interpret; an absent one says the question did
    // not arise.
    const floor =
      statement === null ? "" : `"floor":${JSON.stringify(statement)},`;
    out += `{${floor}"rows":[`;
  } else if (elements.length > 0) {
    out += ",";
  }
  out += elements.join(",");
  if (request.lastChunk) out += "]}";
  return out;
}

/**
 * The downloaded file's name. DefMiner-authored end to end.
 *
 * NO TARGET-CONTROLLED BYTE REACHES IT — not a host, not a path, not a value.
 * A filename is written to the operator's own filesystem by a browser, and a
 * name assembled from a target string is the one place in this feature where a
 * path separator or a control character would be interpreted by something other
 * than a spreadsheet.
 */
export function exportFilename(
  table: ExportTable,
  mode: ExportRedactionMode,
  format: ExportFormat,
  nowMs: number,
): string {
  const stamp = new Date(nowMs)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d+Z$/, "Z");
  return `defminer-${table}-${mode}-${stamp}.${EXPORT_EXTENSIONS[format]}`;
}

// ---------------------------------------------------------------------------
// READING ONE CHUNK
// ---------------------------------------------------------------------------

/** Why an export produced nothing. A closed, DefMiner-authored vocabulary — a
 *  reason code the caller maps to its own copy, never a message. */
export type ExportRefusal = "no-project" | "unknown-table" | "unknown-format";

/** One chunk, as it crosses the boundary. */
export type ExportChunk = {
  readonly filename: string;
  readonly contentType: string;
  readonly text: string;
  readonly chunkIndex: number;
  readonly rows: number;
  readonly hasMore: boolean;
  /** The keyset cursor the NEXT chunk must send. `null` on the last chunk.
   *
   *  A CURSOR AND NOT AN OFFSET: 05-UI-SPEC.md's table contract bans `OFFSET`
   *  outright, and `reads.ts` has no offset statement to answer one with. The
   *  chunk INDEX still exists — it is what decides the header and the audit
   *  row — but it is not how the rows are found. */
  readonly nextCursor: PageCursor | null;
};

/** What {@link readExportChunk} answers with. Never a rejection it invented,
 *  and never a partial file without saying so. */
export type ExportChunkResult =
  | { readonly outcome: "chunk"; readonly chunk: ExportChunk }
  | { readonly outcome: "empty" }
  | { readonly outcome: "refused"; readonly reason: ExportRefusal };

/** The argument one chunk read takes. */
export type ExportChunkRequest = {
  readonly projectId: string;
  readonly table: ExportTable;
  /**
   * The ARTIFACT the manifest is scoped to. `null` on the inventory tables.
   *
   * A SCOPE AND NOT A FILTER, which is why it is its own field. The manifest is
   * the recovered sources of ONE bundle in the map's own declaration order;
   * `filter`, `sortKey` and `direction` describe axes that read has none of and
   * are IGNORED for it, which is stated at the branch that ignores them.
   */
  readonly scopeSha256: string | null;
  readonly format: ExportFormat;
  readonly mode: ExportRedactionMode;
  readonly filter: PageRequest["filter"];
  readonly sortKey: string;
  readonly direction: "asc" | "desc";
  readonly chunkIndex: number;
  readonly cursor: PageCursor | null;
  /** A CEILING on the rows this chunk carries, clamped into
   *  `[1, EXPORT_RPC_CHUNK_ROWS]`. `null` takes the measured constant. A caller
   *  may only make a chunk SMALLER, which is the safe direction: the constant
   *  bounds what crosses the boundary in one call and nothing may raise it. */
  readonly chunkRows: number | null;
  readonly counts: ContributingArtifactCounts;
  readonly nowMs: number;
};

function clampChunkRows(requested: number | null): number {
  if (requested === null || !Number.isFinite(requested)) {
    return EXPORT_RPC_CHUNK_ROWS;
  }
  const n = Math.floor(requested);
  if (n < 1) return 1;
  if (n > EXPORT_RPC_CHUNK_ROWS) return EXPORT_RPC_CHUNK_ROWS;
  return n;
}

/**
 * One page of whichever table is being exported, projected onto plain rows.
 *
 * THREE ARMS AND NO STATEMENT OF ITS OWN, which is the property `readExportChunk`
 * has always had and the manifest does not get to break: every arm goes through
 * `reads.ts`'s already-audited statements, so an export can never be a second,
 * ungated SQL surface over the same partition.
 *
 * THE MANIFEST ARM IGNORES `sortKey`, `direction` AND `filter`, and that is the
 * read's own contract rather than an omission here. `07-UI-SPEC.md` fixes the
 * order as the map's own `sources` declaration order — WHICH IS THE EVIDENCE —
 * so the list is not sortable, will not become sortable, and offers no filter.
 * `store/reads.ts` carries the same argument at the statement, which is why that
 * read has two literals where the inventory reads have a matrix.
 */
async function readOnePage(
  db: Database,
  request: ExportChunkRequest,
  cursor: PageCursor | null,
  pageLimit: number,
): Promise<{
  rows: readonly ExportableRow[];
  nextCursor: PageCursor | null;
  exhausted: boolean;
}> {
  if (request.table === "artifacts") {
    return listArtifactsPage(db, {
      projectId: request.projectId,
      sortKey: request.sortKey,
      direction: request.direction,
      filter: request.filter,
      cursor,
      limit: pageLimit,
    });
  }
  if (request.table === "observations") {
    return listObservationsPage(db, {
      projectId: request.projectId,
      sortKey: request.sortKey,
      direction: request.direction,
      filter: request.filter,
      cursor,
      limit: pageLimit,
    });
  }
  const scope = request.scopeSha256 ?? "";
  const page = await listRecoveredSourcesPage(
    db,
    request.projectId,
    scope,
    cursor,
    pageLimit,
  );
  return {
    // MAPPED FIELD BY FIELD, NEVER SPREAD — the rule the RPC projections
    // follow, applied here for the same reason: a spread would carry every
    // column this table grows into an exported FILE on the day somebody adds
    // one, and a file outlives the session.
    //
    // `artifact_sha256` comes from the request's SCOPE, because the statement is
    // scoped to it and does not select it back. It is the first column so an
    // exported row is self-describing a week later, with no drill-down header
    // above it.
    rows: page.rows.map((row) => ({
      artifact_sha256: scope,
      map_sha256: row.map_sha256,
      source_index: row.source_index,
      sources_verbatim: row.sources_verbatim,
      source_sha256: row.source_sha256,
      byte_len: row.byte_len,
      line_count: row.line_count,
      producibility: row.producibility,
      recovered_at: row.recovered_at,
    })),
    nextCursor: page.nextCursor,
    exhausted: page.exhausted,
  };
}

/**
 * One chunk of the export, read and serialised.
 *
 * PAGES THROUGH `reads.ts` AND ADDS NO STATEMENT. The chunk is assembled from
 * WHOLE keyset pages: a page's cursor addresses the page, so stopping in the
 * middle of one and resuming from its cursor would skip every row after the cut.
 * The consequence, stated because it is not what `chunkRows` sounds like: a
 * chunk carries whole pages up to the ceiling and can therefore be smaller than
 * it, never larger.
 *
 * THIS COSTS SEVERAL HUNDRED PAGE READS PER CHUNK AT THE MEASURED CEILING —
 * 20,000 rows at 100 rows a page — and that is the price of not opening a second
 * SQL surface over the same partition. The bound the chunk constant sets is on
 * what crosses the RPC in one call, which is a different quantity from what the
 * database is asked for.
 *
 * DOES NOT try/catch. This package's split is that writes report their own
 * outcome and list reads do not: a driver rejection propagates, the endpoint
 * writes no completion audit row, and the frontend's typed client turns it into
 * a value. A failed export is not a disclosure that happened.
 */
export async function readExportChunk(
  db: Database,
  request: ExportChunkRequest,
): Promise<ExportChunkResult> {
  if (request.projectId === "") {
    return { outcome: "refused", reason: "no-project" };
  }
  if (!Object.prototype.hasOwnProperty.call(EXPORT_COLUMNS, request.table)) {
    return { outcome: "refused", reason: "unknown-table" };
  }
  if (!EXPORT_FORMATS.includes(request.format)) {
    return { outcome: "refused", reason: "unknown-format" };
  }

  const ceiling = clampChunkRows(request.chunkRows);
  const pageLimit = Math.min(ceiling, KEYSET_PAGE_ROWS);

  // THE MANIFEST IS SCOPED TO ONE ARTIFACT AND CANNOT BE ASKED FOR WITHOUT ONE.
  // A request with no scope has genuinely nothing in scope, which is the SAME
  // claim the zero-row path below makes — so it takes the same explicit `empty`
  // outcome rather than a new refusal reason. Open decision D3's rule is
  // unchanged: a zero-row export is DISABLED at the control with the reason on
  // it, never answered with a header-only file.
  const scope = request.scopeSha256;
  if (request.table === "sources" && scope === null) {
    return { outcome: "empty" };
  }

  const rows: ExportableRow[] = [];
  let cursor = request.cursor;
  let exhausted = false;

  for (;;) {
    const page = await readOnePage(db, request, cursor, pageLimit);

    for (const row of page.rows) rows.push(row);

    if (page.exhausted || page.nextCursor === null) {
      exhausted = true;
      cursor = null;
      break;
    }
    cursor = page.nextCursor;
    if (rows.length + pageLimit > ceiling) break;
  }

  // THE EXPLICIT EMPTY OUTCOME, and never a header-only document. The design
  // contract's open decision D3 settles that a zero-row export is DISABLED with
  // the reason on the button; a serialiser that happily produced an empty file
  // would invite a caller that ignores the rule.
  if (request.chunkIndex === 0 && rows.length === 0 && exhausted) {
    return { outcome: "empty" };
  }

  return {
    outcome: "chunk",
    chunk: {
      filename: exportFilename(
        request.table,
        request.mode,
        request.format,
        request.nowMs,
      ),
      contentType: EXPORT_CONTENT_TYPES[request.format],
      text: serialiseRows({
        table: request.table,
        format: request.format,
        mode: request.mode,
        rows,
        chunkIndex: request.chunkIndex,
        lastChunk: exhausted,
        counts: request.counts,
      }),
      chunkIndex: request.chunkIndex,
      rows: rows.length,
      hasMore: !exhausted,
      nextCursor: cursor,
    },
  };
}
