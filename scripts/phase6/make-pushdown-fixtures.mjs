#!/usr/bin/env node
// scripts/phase6/make-pushdown-fixtures.mjs — the D-06 push-down fixture corpus.
//
// THE QUESTION THIS CORPUS EXISTS TO SETTLE. DefMiner pushes `SCAN_KIND_CLAUSE`
// down to `sdk.requests.query()` as an optimisation, while `admit()` remains the
// gate. The clause must therefore be a SUPERSET of `admit()`'s kind axis: an
// over-matching clause costs bandwidth, an UNDER-matching one costs artifacts the
// operator will never learn were missed. Silently — a subset returns FEWER rows,
// not an error. Every file this generator writes is a place where HTTPQL's
// matching semantics and `hooks/admit.ts`'s `indexOf`/`endsWith` classification
// can disagree.
//
// WRITTEN IN `scripts/spike/make-encoded-fixtures.mjs`'s IDIOM, and into a
// DISTINCT SUBDIRECTORY of `corpus/` rather than into `corpus/` itself, for the
// same reason that generator gives: other plans serve `corpus/` concurrently from
// the same checkout, and a distinct subdirectory with distinct filenames is what
// keeps them out of each other's way. `corpus/` is gitignored in full, so this
// output is GENERATED AND REBUILT, never committed — the reproducible artifact is
// this file, not the 3 kB of inert bytes it emits.
//
// DETERMINISTIC BY CONSTRUCTION. Nothing below reads a clock or a random source —
// deliberately unlike the encoded-fixture generator, which stamps a
// `generated_at`. Re-running this must produce byte-identical output, because the
// manifest is joined against a committed measurement artifact and a corpus that
// differs run to run would make that join unfalsifiable.
//
// `scripts/spike/origin.py` IS NOT MODIFIED, AND THAT IS THE POINT. Its per-path
// sidecar config already carries `content_type`, `status` and `cache_control`
// keys; supplying the whole fixture set as DATA is precisely what those keys
// exist for. A later author reaching for the origin to add a content type is
// reaching for the wrong file.
//
// NO SECOND COPY OF THE KIND AXIS. The seventeen media types are EXTRACTED from
// the shipped `packages/backend/src/hooks/admit.ts` at generation time, never
// restated here. That is what makes the manifest's `media_type_exercised` field
// meaningful: a member added to the shipped list later with no fixture becomes a
// RED TEST in `tests/phase6-pushdown.spec.ts` rather than an invisible gap.
//
// NON-VACUITY IS PART OF THE DATA AND NOT ONLY THE PROSE. A corpus in which the
// clause matches everything satisfies the superset implication TRIVIALLY, which is
// exactly the failure shape Phase 0's round-one review caught three times. Two
// fixtures exist for that and for nothing else:
//   * the SUPERSET fixture — a JavaScript body served `text/plain` at a
//     `.txt` path. `admit()` REJECTS it; the clause may still match it through
//     `resp.raw`, which the HTTPQL reference defines as including the BODY.
//     That is the safe direction, demonstrated rather than asserted.
//   * the MARKUP fixture — an HTML page whose bytes contain none of the five
//     substring terms and whose path contains neither `.js` nor `.mjs`. The
//     clause must NOT match it. `tests/phase6-pushdown.spec.ts` names this
//     fixture id explicitly, so a clause that matched everything fails the suite
//     instead of passing it.
//
// Usage: node scripts/phase6/make-pushdown-fixtures.mjs [--out corpus/pushdown]

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = (() => {
  const i = process.argv.indexOf("--out");
  return i !== -1 ? process.argv[i + 1] : "corpus/pushdown";
})();

const ADMIT = "packages/backend/src/hooks/admit.ts";

/**
 * The shipped media-type vocabulary, READ from the shipped module.
 *
 * `SCRIPTISH_MEDIA_TYPES` is module-private in `admit.ts` and stays that way:
 * widening a shipped module's export surface so a generator can see it is a
 * change to the product for the convenience of the test apparatus. The array
 * literal is a flat list of double-quoted strings with no interpolation and no
 * nesting, so a bounded slice plus a quoted-string scan reads it exactly — and
 * the assertions below fail loudly if the shape ever stops being that simple.
 *
 * `tests/phase6-pushdown.spec.ts` performs the SAME extraction independently. The
 * duplication is deliberate: a shared helper would be one module that could be
 * wrong in one place, and the gate would then be checking the helper rather than
 * the shipped list.
 */
function scriptishMediaTypes() {
  const src = readFileSync(ADMIT, "utf8");
  const start = src.indexOf("const SCRIPTISH_MEDIA_TYPES = [");
  if (start === -1) {
    throw new Error(
      `${ADMIT}: could not find 'const SCRIPTISH_MEDIA_TYPES = [' — the shipped ` +
        `kind axis moved or was renamed. Fix this reader; do not restate the list here.`,
    );
  }
  const end = src.indexOf("]", start);
  if (end === -1)
    throw new Error(`${ADMIT}: SCRIPTISH_MEDIA_TYPES is unterminated`);
  const body = src.slice(start, end);
  const types = [];
  let i = 0;
  while (i < body.length) {
    const q = body.indexOf('"', i);
    if (q === -1) break;
    const close = body.indexOf('"', q + 1);
    if (close === -1)
      throw new Error(`${ADMIT}: unterminated string in SCRIPTISH_MEDIA_TYPES`);
    types.push(body.slice(q + 1, close));
    i = close + 1;
  }
  if (types.length < 10) {
    throw new Error(
      `${ADMIT}: extracted only ${types.length} media types — the literal shape changed`,
    );
  }
  return types;
}

// Inert. A few bytes of valid, never-evaluated content: this corpus measures
// CLASSIFICATION, not size and not parsing, and nothing here is ever executed.
// The word "javascript" is deliberately ABSENT so that a fixture's match can only
// come from the surface the fixture is about.
const INERT = (id) => `/* DefMiner push-down fixture ${id} */\nvar a = 1;\n`;

// ---------------------------------------------------------------------------
// THE PATH-AND-HEADER EDGE FIXTURES.
//
// `expected` is the SHIPPED classifier's disposition stated as a plain word. It
// is a declaration of intent, not the proof: the gate re-derives it by calling
// `isScriptish` on the RECORDED content type and URL and fails when the two
// disagree, so a wrong word here is a red test rather than a silent premise.
// ---------------------------------------------------------------------------
const EDGE = [
  {
    fixture_id: "path-js-markup-content-type",
    file: "f01-suffix.js",
    content_type: "text/html",
    expected: "accepted",
    probes:
      "A `.js` path served a markup content type. `isScriptish` accepts on the SUFFIX branch " +
      "after the content-type branch has already declined. Does the clause reach it? " +
      '(`req.path.cont:".js"`)',
  },
  {
    fixture_id: "path-uppercase-js-opaque-content-type",
    file: "F02-UPPER.JS",
    content_type: "application/octet-stream",
    expected: "accepted",
    probes:
      "THE CASE-SENSITIVITY HOLE, and the single most important fixture in this corpus. " +
      '`isScriptish` LOWERCASES the URL before `.endsWith(".js")`, so `/F02-UPPER.JS` is ' +
      'admitted. `req.ext.eq:".js"` is documented CASE SENSITIVE and would MISS it — a strict ' +
      "subset, and an invisible one. The shipped clause uses the case-insensitive `cont` family " +
      "instead, and this fixture is what proves that choice rather than asserting it.",
  },
  {
    fixture_id: "path-mjs-module-suffix",
    file: "f03-module.mjs",
    content_type: "application/octet-stream",
    expected: "accepted",
    probes:
      'The `.mjs` term. `".mjs"` does NOT contain `".js"` — the substring needs `.` immediately ' +
      "followed by `j` — which is the error 06-RESEARCH § O-03 records catching on its first " +
      'pass. Exercises `req.path.cont:".mjs"` specifically.',
  },
  {
    fixture_id: "no-extension-scriptish-content-type",
    file: "f04-noext",
    content_type: "application/javascript",
    expected: "accepted",
    probes:
      "A URL with NO extension at all, served a scriptish content type. `isScriptish` accepts on " +
      "the HEADER alone and every path-shaped term is blind here. An absent extension is a " +
      "COMPLETE input, not a missing one.",
  },
  {
    fixture_id: "path-js-with-query-string",
    file: "f05-query.js",
    query: "v=2",
    content_type: "application/octet-stream",
    expected: "accepted",
    probes:
      "`isScriptish` strips the query before its suffix test. Whether Caido's `req.path` excludes " +
      "the query string the same way is CITED from the reference (`req.query` is a separate " +
      "field) and UNMEASURED. This fixture measures it.",
  },
  {
    fixture_id: "path-js-with-fragment",
    file: "f06-frag.js",
    fragment: "frag",
    content_type: "application/octet-stream",
    expected: "accepted",
    probes:
      "`isScriptish` strips the fragment too. A fragment is CLIENT-SIDE ONLY and never crosses " +
      "the wire, so what this fixture actually records is that the proxy never sees one — which " +
      "is the answer, and is worth having on the record rather than assumed.",
  },
  {
    fixture_id: "content-type-with-charset-parameter",
    file: "f07-charset.bin",
    content_type: "text/javascript; charset=utf-8",
    expected: "accepted",
    probes:
      "`isScriptish` splits on `;` and matches the ESSENCE. `resp.raw.cont` sees the whole header " +
      "including the parameter. The path carries no scriptish suffix, so a match here can only " +
      "come from the header term.",
  },
  {
    fixture_id: "content-type-uppercase",
    file: "f08-upperct.bin",
    content_type: "TEXT/JAVASCRIPT",
    expected: "accepted",
    probes:
      "`isScriptish` lowercases the essence. `cont` is DOCUMENTED case-insensitive — confirm it " +
      "rather than believe it. Whether that folding is byte-wise or Unicode-aware is exactly what " +
      "06-RESEARCH § O-03 lists as unmeasured.",
  },
  {
    fixture_id: "javascript-body-served-text-plain",
    file: "f09-plain.txt",
    content_type: "text/plain",
    expected: "rejected",
    body: "/* DefMiner push-down fixture: a javascript body served as text/plain. */\nvar a = 1;\n",
    probes:
      "NON-VACUITY, THE SUPERSET HALF. `admit()` REJECTS this — wrong essence, wrong suffix — and " +
      "the clause may still match it, because `resp.raw` is defined as including the BODY and this " +
      "body contains the word the header does not. That is the SAFE direction demonstrated, not " +
      "asserted: the push-down is allowed to over-match and `admit()` still runs on every returned " +
      "item.",
  },
  {
    fixture_id: "markup-page-with-script-element",
    file: "f10-markup.html",
    content_type: "text/html",
    expected: "rejected",
    body:
      "<!doctype html>\n<html><head><title>DefMiner push-down fixture</title>\n" +
      '<script src="/f10-asset.txt"></script>\n' +
      "</head><body><p>An ordinary page.</p></body></html>\n",
    probes:
      "NON-VACUITY, THE NEGATIVE. `admit()` rejects it AND the clause must NOT match it. Its path " +
      "contains neither `.js` nor `.mjs`, and neither its bytes nor any header the origin sends " +
      "contain any of the five substring terms — `<script` is not `jscript`, which needs a `j` " +
      "immediately before `script`. `tests/phase6-pushdown.spec.ts` names THIS fixture id: a clause " +
      "that matched everything fails the suite here instead of passing it trivially.",
  },
];

function main() {
  const mediaTypes = scriptishMediaTypes();

  // Rebuilt from empty every run, so a fixture removed from this file cannot
  // linger on disk and keep a stale manifest entry alive.
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  const fixtures = [];
  const originHeaders = {};

  const emit = (f) => {
    const path = "/" + f.file;
    if (originHeaders[path] !== undefined) {
      throw new Error(
        `duplicate request path ${path} — the manifest join keys on it`,
      );
    }
    writeFileSync(join(OUT, f.file), f.body ?? INERT(f.fixture_id), "latin1");
    // `no-store` on every fixture. A cached response, or a real 304, would
    // silently change WHICH bytes reached the traffic table — and a 304 has no
    // content-type at all, which would make the classifier's disposition a
    // statement about a different response than the one the manifest declares.
    originHeaders[path] = {
      content_type: f.content_type,
      cache_control: "no-store",
      status: f.status ?? 200,
    };
    fixtures.push({
      fixture_id: f.fixture_id,
      file: f.file,
      request_path: path,
      request_query: f.query ?? null,
      request_fragment: f.fragment ?? null,
      content_type: f.content_type,
      status: f.status ?? 200,
      expected: f.expected,
      media_type_exercised: f.media_type_exercised ?? null,
      probes: f.probes,
    });
  };

  for (const f of EDGE) emit(f);

  // ONE FIXTURE PER SHIPPED MEDIA TYPE, generated FROM the extracted list.
  //
  // Not "one per substring term". The clause's five `resp.raw.cont` terms are a
  // COVER of the seventeen essences, and a cover is exactly the kind of claim
  // that is right until the list changes — `text/jscript` is not a substring of
  // `javascript`, and noticing that was a one-character-wide accident. Driving a
  // fixture from every list MEMBER makes the cover a measured property: a
  // seventeenth-plus essence added later with no term to catch it fails the gate.
  //
  // Every path here carries a non-scriptish suffix, so an accept can only come
  // from the header branch and never from the path branch — which is what makes
  // each of these a test of a HEADER term.
  mediaTypes.forEach((mediaType, i) => {
    const n = String(i + 1).padStart(2, "0");
    emit({
      fixture_id: `media-${mediaType.replace(/[^a-z0-9]+/g, "-")}`,
      file: `m${n}.bin`,
      content_type: mediaType,
      expected: "accepted",
      media_type_exercised: mediaType,
      probes:
        `The shipped essence \`${mediaType}\`, on a path with no scriptish suffix — so a match ` +
        `can only come from a \`resp.raw.cont\` term.`,
    });
  });

  const ids = new Set(fixtures.map((f) => f.fixture_id));
  if (ids.size !== fixtures.length) throw new Error("duplicate fixture_id");
  if (!fixtures.some((f) => f.expected === "rejected")) {
    throw new Error("no rejected fixture — the suite would be vacuous");
  }

  const manifest = {
    generator: "scripts/phase6/make-pushdown-fixtures.mjs",
    corpus_dir: OUT,
    decision: "D-06",
    requirements: ["FIND-03"],
    media_type_source: `${ADMIT} SCRIPTISH_MEDIA_TYPES (extracted, never restated)`,
    media_types: mediaTypes,
    // Named, not counted. `tests/phase6-pushdown.spec.ts` asserts the markup
    // fixture is among the entries the clause does NOT match; a count-only
    // assertion passes on an artifact where the one non-matching fixture is an
    // accident.
    non_vacuity: {
      markup_fixture_id: "markup-page-with-script-element",
      superset_fixture_id: "javascript-body-served-text-plain",
    },
    case_folding_fixture_id: "path-uppercase-js-opaque-content-type",
    fixtures,
  };

  writeFileSync(
    join(OUT, "origin-headers.json"),
    JSON.stringify(originHeaders, null, 2) + "\n",
  );
  writeFileSync(
    join(OUT, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );

  for (const f of fixtures) {
    process.stdout.write(
      `  ${f.request_path.padEnd(22)} ${String(f.content_type).padEnd(32)} ${f.expected}\n`,
    );
  }
  process.stdout.write(
    `wrote ${fixtures.length} fixtures (${mediaTypes.length} shipped media types) to ${OUT}\n`,
  );
}

main();
