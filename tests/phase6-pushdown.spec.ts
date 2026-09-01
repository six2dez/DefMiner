import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

import { isScriptish } from "../packages/backend/src/hooks/admit";
import { SCAN_KIND_CLAUSE } from "../packages/engine/src/contract";

// THE PHASE 6 D-06 GATE — the push-down superset relation, as a suite that can
// FAIL.
//
// D-06 says a disagreement between HTTPQL's matching semantics and
// `hooks/admit.ts`'s classification must be a RED TEST naming the fixture, never
// a silently missed bundle. This file is that red test. It has already earned its
// keep once: the clause it was written against used `cont`, the HTTPQL reference
// documents `cont` as case INSENSITIVE, and Caido 0.58.2 disagrees — two
// responses the shipped classifier accepts were not matched by the shipped
// clause. See `results/pushdown-superset.json` and the `cont` note in
// `packages/backend/src/scan/filter.ts`.
//
// ===========================================================================
// WHY THE PROOF IS SPLIT ACROSS TWO RUNTIMES, AND WHAT JOINS IT
// ===========================================================================
// `sdk.requests.matches()` is a plugin-runtime method: it does not exist in node
// and faking it would mean inventing an HTTPQL engine, at which point this suite
// would be a test of the fake. `isScriptish` is ordinary TypeScript and is only
// meaningful as the SHIPPED module, which the plugin bundle does not re-export.
// So Caido's evaluator answers per fixture into an artifact, and this file joins
// that artifact to the shipped classifier BY FIXTURE ID.
//
// A SPLIT PROOF WHOSE TWO HALVES CANNOT BE SHOWN TO DESCRIBE THE SAME INPUT IS
// NOT A PROOF. The join is therefore the load-bearing part, and it is asserted
// three ways rather than assumed: the recorded clause is byte-identical to the
// shipped constant, every manifest fixture id appears in the artifact EXACTLY
// once, and the artifact names no fixture the manifest does not.
//
// FAIL, NEVER SKIP, and name the remedy in every message — the doctrine
// `tests/go-no-go.spec.ts` set and `tests/phase1-load.spec.ts` carries. An absent
// or unreadable artifact must fail here rather than pass vacuously.
//
// WHY THE VERSION CONSTANT BELOW IS PHASE 6'S OWN (D-21). `tests/phase1-*.spec.ts`
// pin "0.57.1". That is not drift and it is not a value to reuse: it is a
// deliberate fail-closed tripwire over artifacts whose numbers were MEASURED on
// 0.57.1. This phase measures its own build and declares its own constant.

const RESULT =
  ".planning/phases/06-retroactive-scan-deployment-reality/results/pushdown-superset.json";
const SCHEMA =
  ".planning/phases/06-retroactive-scan-deployment-reality/results/pushdown-superset.schema.json";
const MANIFEST = "corpus/pushdown/manifest.json";
const ADMIT = "packages/backend/src/hooks/admit.ts";
const EXPECTED_CAIDO_VERSION = "0.58.2";
const REMEASURE = "re-run `bash scripts/phase6/pushdown-superset.sh`";
const REGENERATE = "re-run `node scripts/phase6/make-pushdown-fixtures.mjs`";
const STATUSES = ["pass", "fail", "inconclusive", "not_run"];

/* eslint-disable @typescript-eslint/no-explicit-any --
   Both the artifact and the manifest are plain recorded JSON, written by a shell
   script and a generator, with no shipped type. A parallel interface here would
   be a second hand-maintained copy of a shape neither file imports — and the gate
   would then be checking the copy. */

function loadJson(path: string): any {
  const raw = readFileSync(path, "utf8");
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`${path} is not valid JSON: ${(err as Error).message}`);
  }
}

// THE MANIFEST IS REGENERATED RATHER THAN COMMITTED, and that is the same
// decision `corpus/` itself embodies: the reproducible artifact is the generator,
// not the bytes. Regenerating it here also means this gate covers the GENERATOR —
// a generator that stopped emitting the case-folding fixture would fail below
// rather than quietly shrinking the proof. The generator is deterministic, reads
// no clock and no random source, and touches only a gitignored directory.
if (!existsSync(MANIFEST)) {
  execFileSync("node", ["scripts/phase6/make-pushdown-fixtures.mjs"], {
    stdio: "ignore",
  });
}

const d = existsSync(RESULT) ? loadJson(RESULT) : null;
const m = existsSync(MANIFEST) ? loadJson(MANIFEST) : null;

/** Every string anywhere in the artifact, with its path. */
function strings(
  value: unknown,
  path = "$",
  out: Array<{ path: string; value: string }> = [],
): Array<{ path: string; value: string }> {
  if (typeof value === "string") out.push({ path, value });
  else if (Array.isArray(value)) {
    value.forEach((v, i) => strings(v, `${path}[${i}]`, out));
  } else if (value !== null && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      strings(v, `${path}.${k}`, out);
    }
  }
  return out;
}

// Two or more absolute path segments — `/a/b`. One segment (`/f01-suffix.js`) is
// a URL path and carries nothing about this machine, which is why the pattern
// requires the SECOND separator rather than just a leading slash.
const ABSOLUTE_PATH = /(^|[\s"'(<=,;:])\/[A-Za-z0-9._+-]+\/[A-Za-z0-9._+-]/;
// The home-directory shapes, checked SEPARATELY and with no exemption at all —
// including over `binary.path`, the one field the absolute-path check exempts.
const HOME_PATH = /\/(?:Users|home)\/[^/\s"']+/;
// `binary.path` is EXEMPT from the absolute-path check and from nothing else. An
// artifact that does not name the binary it was produced by cannot be checked
// against the two-caido-cli hazard at all (T-06-09).
const ABSOLUTE_PATH_EXEMPT = new Set(["$.binary.path"]);

/**
 * The shipped media-type vocabulary, READ from the shipped module.
 *
 * `SCRIPTISH_MEDIA_TYPES` is module-private in `admit.ts` and stays that way:
 * widening a shipped module's export surface for the convenience of a test is a
 * change to the product. `scripts/phase6/make-pushdown-fixtures.mjs` performs the
 * SAME extraction independently, and the duplication is deliberate — a shared
 * helper would be one module that could be wrong in one place, and this gate
 * would then be checking the helper rather than the shipped list.
 */
function shippedMediaTypes(): string[] {
  const src = readFileSync(ADMIT, "utf8");
  const start = src.indexOf("const SCRIPTISH_MEDIA_TYPES = [");
  expect(
    start,
    `${ADMIT}: 'const SCRIPTISH_MEDIA_TYPES = [' not found — the shipped kind ` +
      `axis moved or was renamed. Fix this reader; never restate the list here.`,
  ).not.toBe(-1);
  const body = src.slice(start, src.indexOf("]", start));
  const types: string[] = [];
  let i = 0;
  for (;;) {
    const q = body.indexOf('"', i);
    if (q === -1) break;
    const close = body.indexOf('"', q + 1);
    if (close === -1) break;
    types.push(body.slice(q + 1, close));
    i = close + 1;
  }
  return types;
}

/** The 2xx window the clause itself carries — read OUT of the clause, never
 *  restated, so a bound that moves moves here too. */
function statusBounds(clause: string): { gte: number; lt: number } {
  const read = (key: string) => {
    const at = clause.indexOf(key);
    expect(at, `${key} is missing from SCAN_KIND_CLAUSE`).not.toBe(-1);
    return parseInt(clause.slice(at + key.length), 10);
  };
  return { gte: read("resp.code.gte:"), lt: read("resp.code.lt:") };
}

function ajv() {
  const a = new Ajv2020({ allErrors: true, strict: false });
  addFormats(a);
  return a;
}

const live = () => d !== null && d.status !== "not_run";

describe("the D-06 push-down artifact", () => {
  it("exists — the superset relation has no other evidence", () => {
    expect(existsSync(RESULT), `${RESULT} missing — ${REMEASURE}`).toBe(true);
  });

  it("parses", () => {
    expect(d, `${RESULT} did not parse — ${REMEASURE}`).not.toBeNull();
  });

  it("validates against its own schema", () => {
    expect(existsSync(SCHEMA), `${SCHEMA} missing`).toBe(true);
    const validate = ajv().compile(loadJson(SCHEMA));
    const ok = validate(d);
    expect(
      ok,
      `${RESULT} does not validate: ${JSON.stringify(validate.errors ?? [])} — ${REMEASURE}`,
    ).toBe(true);
  });

  it("carries one of the four statuses, and a reason when it is `not_run`", () => {
    expect(STATUSES, `unknown status ${d?.status}`).toContain(d?.status);
    if (d?.status === "not_run") {
      expect(
        typeof d.reason === "string" && d.reason.length > 0,
        `${RESULT}: not_run without a reason — D-23 records an unreachable run ` +
          `WITH its reason and never as a pass. ${REMEASURE}`,
      ).toBe(true);
    }
  });

  it("names the build it describes, and that build is this phase's", () => {
    if (!live()) {
      // A `not_run` artifact is a legitimate terminal state and is exempt from
      // the version assertion — it recorded no measurement to be wrong about.
      expect(d?.status).toBe("not_run");
      return;
    }
    expect(
      d.binary?.reported_version,
      `${RESULT} was recorded against ${d?.binary?.reported_version}, not ` +
        `${EXPECTED_CAIDO_VERSION}. NOTE: bare 'caido-cli' on PATH is a stale ` +
        `0.55.3 on this machine; always the absolute app-bundle path. ${REMEASURE}`,
    ).toBe(EXPECTED_CAIDO_VERSION);
    expect(d.binary?.expected_version).toBe(EXPECTED_CAIDO_VERSION);
  });

  it("records NO fixture verdicts on a run that did not happen", () => {
    if (d?.status !== "not_run") return;
    expect(
      d.fixtures,
      `${RESULT}: not_run carrying fixture verdicts — a recorded verdict on a ` +
        `run that did not happen is exactly the shape D-23 forbids.`,
    ).toHaveLength(0);
  });

  it("leaks no absolute host path and no username", () => {
    for (const s of strings(d)) {
      if (!ABSOLUTE_PATH_EXEMPT.has(s.path)) {
        expect(
          ABSOLUTE_PATH.test(s.value),
          `${RESULT}: ${s.path} looks like an absolute host path: ${s.value}`,
        ).toBe(false);
      }
      expect(
        HOME_PATH.test(s.value),
        `${RESULT}: ${s.path} carries a home-directory path: ${s.value}`,
      ).toBe(false);
    }
  });
});

// ===========================================================================
// THE CLAUSE IDENTITY ASSERTION — FIRST, because everything after it is
// meaningless without it.
// ===========================================================================
// The evaluator ran somewhere this process cannot reach. This is the ONLY thing
// tying its answers to the constant that ships; without it the suite could stay
// green forever against a clause nobody deploys.
describe("the recorded clause IS the shipped clause", () => {
  it("is byte-identical to SCAN_KIND_CLAUSE", () => {
    if (!live()) return;
    expect(
      d.clause?.value,
      `${RESULT} records a proof about a clause that is NO LONGER THE ONE THAT ` +
        `SHIPS. Every verdict in this artifact describes the recorded string, ` +
        `so none of them says anything about the push-down DefMiner performs. ` +
        `${REMEASURE}`,
    ).toBe(SCAN_KIND_CLAUSE);
  });

  it("is the clause the probe echoed back, unmodified", () => {
    if (!live()) return;
    // Recorded separately from `value` so a probe that silently normalised the
    // clause is VISIBLE rather than assumed away.
    expect(
      d.clause?.echoed_by_probe,
      `${RESULT}: the probe evaluated a different string than the harness sent. ` +
        `${REMEASURE}`,
    ).toBe(SCAN_KIND_CLAUSE);
  });

  it("names the route it was obtained by", () => {
    if (!live()) return;
    expect(["node-type-stripping", "built-backend-bundle"]).toContain(
      d.clause?.route,
    );
  });
});

// ===========================================================================
// THE JOIN — every manifest fixture, exactly once, and nothing else.
// ===========================================================================
describe("the artifact covers the corpus exactly", () => {
  it("has a manifest to join against", () => {
    expect(existsSync(MANIFEST), `${MANIFEST} missing — ${REGENERATE}`).toBe(
      true,
    );
    expect(
      m?.fixtures?.length,
      `${MANIFEST} names no fixtures`,
    ).toBeGreaterThan(11);
  });

  it("names every manifest fixture EXACTLY once", () => {
    if (!live()) return;
    const seen = new Map<string, number>();
    for (const f of d.fixtures as Array<any>) {
      seen.set(f.fixture_id, (seen.get(f.fixture_id) ?? 0) + 1);
    }
    const missing = (m.fixtures as Array<any>)
      .map((f) => f.fixture_id)
      .filter((id: string) => !seen.has(id));
    const duplicated = [...seen.entries()]
      .filter(([, n]) => n > 1)
      .map(([id]) => id);
    expect(
      missing,
      `${RESULT} has no verdict for ${missing.join(", ")}. A fixture that never ` +
        `reached the traffic table must FAIL here rather than quietly reduce the ` +
        `proof. ${REMEASURE}`,
    ).toEqual([]);
    expect(duplicated, `${RESULT}: duplicated fixture ids`).toEqual([]);
  });

  it("names no fixture the manifest does not", () => {
    if (!live()) return;
    const known = new Set((m.fixtures as Array<any>).map((f) => f.fixture_id));
    const extra = (d.fixtures as Array<any>)
      .map((f) => f.fixture_id)
      .filter((id: string) => !known.has(id));
    expect(
      extra,
      `${RESULT} carries verdicts for ${extra.join(", ")}, which the manifest ` +
        `does not name — the join is not describing the corpus. ${REMEASURE}`,
    ).toEqual([]);
  });

  it("records both directions of an unjoined row as empty", () => {
    if (!live()) return;
    expect(d.unmatched?.manifest_entries_without_record).toEqual([]);
    expect(d.unmatched?.records_without_manifest_entry).toEqual([]);
  });
});

// ===========================================================================
// THE IMPLICATION — `admit()` accepts  ⟹  the clause matches.
// ===========================================================================
describe("the push-down clause is a SUPERSET of admit()'s kind axis", () => {
  it("matches every response the SHIPPED classifier accepts", () => {
    if (!live()) return;
    const { gte, lt } = statusBounds(SCAN_KIND_CLAUSE);
    const violations: string[] = [];
    for (const f of d.fixtures as Array<any>) {
      const accepted = isScriptish(f.response_content_type, f.request_url);
      const inWindow =
        typeof f.response_status === "number" &&
        f.response_status >= gte &&
        f.response_status < lt;
      if (accepted && inWindow && f.clause_matched !== true) {
        violations.push(`${f.fixture_id} (${f.request_url})`);
      }
    }
    expect(
      violations,
      `THE PUSH-DOWN IS A STRICT SUBSET OF THE ADMISSION GATE.\n` +
        `DefMiner would ADMIT these responses on the live path, and the ` +
        `retroactive scan would NEVER SEE THEM — silently, because a subset ` +
        `returns fewer rows and not an error:\n  ${violations.join("\n  ")}\n` +
        `Widen SCAN_KIND_CLAUSE in packages/engine/src/contract.ts, then ` +
        `${REMEASURE}. Never widen the fixture set to make this pass.`,
    ).toEqual([]);
  });

  it("does NOT assert the converse — over-matching is the safe direction", () => {
    if (!live()) return;
    // Stated as an executable fact rather than a comment: at least one fixture
    // the classifier REJECTS is matched by the clause. `resp.raw` includes the
    // body, so an HTML page mentioning the word matches too — an optimisation
    // that over-matches costs bandwidth, and `admit()` still runs on every
    // returned item. A corpus in which this were empty would mean the clause had
    // been narrowed to the gate, which is a different (and fragile) design.
    const overMatched = (d.fixtures as Array<any>).filter(
      (f) =>
        !isScriptish(f.response_content_type, f.request_url) &&
        f.clause_matched === true,
    );
    expect(
      overMatched.length,
      `${RESULT}: no fixture demonstrates the superset direction. The corpus ` +
        `should contain a JavaScript body served text/plain. ${REGENERATE}`,
    ).toBeGreaterThan(0);
  });

  it("agrees with the manifest about what the classifier does", () => {
    if (!live()) return;
    const expectedBy = new Map<string, string>(
      (m.fixtures as Array<any>).map((f) => [f.fixture_id, f.expected]),
    );
    const disagreements: string[] = [];
    for (const f of d.fixtures as Array<any>) {
      const actual = isScriptish(f.response_content_type, f.request_url)
        ? "accepted"
        : "rejected";
      if (actual !== expectedBy.get(f.fixture_id)) {
        disagreements.push(
          `${f.fixture_id}: manifest says ${expectedBy.get(f.fixture_id)}, ` +
            `isScriptish says ${actual}`,
        );
      }
    }
    expect(
      disagreements,
      `The corpus's declared intent and the shipped classifier disagree. Either ` +
        `the classifier changed or the generator is wrong; the fixture is not ` +
        `probing what it claims to.\n  ${disagreements.join("\n  ")}`,
    ).toEqual([]);
  });
});

// ===========================================================================
// NON-VACUITY — asserted BY NAME, not by count.
// ===========================================================================
describe("the proof is not passing because everything matches", () => {
  it("has at least one fixture the clause does not match", () => {
    if (!live()) return;
    const notMatched = (d.fixtures as Array<any>).filter(
      (f) => f.clause_matched === false,
    );
    expect(
      notMatched.length,
      `${RESULT}: the clause matched EVERY fixture, so the superset implication ` +
        `is satisfied trivially and this suite proves nothing. ${REMEASURE}`,
    ).toBeGreaterThan(0);
  });

  it("does not match the MARKUP fixture the manifest names", () => {
    if (!live()) return;
    // BY NAME and not by count. A count-only assertion passes on an artifact
    // where the one non-matching fixture is an accident; naming the fixture is
    // what makes the negative a statement about the CLAUSE.
    const id = m?.non_vacuity?.markup_fixture_id;
    expect(typeof id, `${MANIFEST} does not name a markup fixture`).toBe(
      "string",
    );
    const entry = (d.fixtures as Array<any>).find((f) => f.fixture_id === id);
    expect(
      entry,
      `${RESULT} has no verdict for ${id} — ${REMEASURE}`,
    ).toBeTruthy();
    expect(
      entry.clause_matched,
      `${RESULT}: the clause MATCHED ${id}, an ordinary HTML page carrying none ` +
        `of the kind terms. A clause that matches everything satisfies the ` +
        `superset relation trivially — this is the assertion that stops that.`,
    ).toBe(false);
    expect(
      isScriptish(entry.response_content_type, entry.request_url),
      `${id} must be REJECTED by the shipped classifier, or it is not a ` +
        `non-vacuity negative at all.`,
    ).toBe(false);
  });
});

// ===========================================================================
// THE CASE-FOLDING HOLE, NAMED — so a regression reads as itself.
// ===========================================================================
describe("the uppercase script path research found, closed by a fixture", () => {
  it("is accepted by the classifier AND matched by the clause", () => {
    if (!live()) return;
    const id = m?.case_folding_fixture_id;
    const entry = (d.fixtures as Array<any>).find((f) => f.fixture_id === id);
    expect(
      entry,
      `${RESULT} has no verdict for ${id} — ${REMEASURE}`,
    ).toBeTruthy();
    expect(
      isScriptish(entry.response_content_type, entry.request_url),
      `${id}: the shipped classifier must ACCEPT an uppercase script path — it ` +
        `lowercases before its suffix test.`,
    ).toBe(true);
    expect(
      entry.clause_matched,
      `${id} (${entry.request_url}): DefMiner ADMITS this and the push-down ` +
        `MISSES it. This is the exact hole 06-RESEARCH § O-03 predicted for the ` +
        `case-sensitive extension operator, and the reason the clause is on the ` +
        `case-folding \`like\` family rather than \`cont\`. ${REMEASURE}`,
    ).toBe(true);
  });
});

// ===========================================================================
// TERM COVERAGE — a list member added later with no fixture is a RED TEST.
// ===========================================================================
describe("every shipped media type has a fixture", () => {
  it("the manifest declares the SHIPPED vocabulary, not a copy of it", () => {
    const shipped = shippedMediaTypes();
    expect(
      shipped.length,
      `${ADMIT}: extracted no media types`,
    ).toBeGreaterThan(10);
    expect(
      [...(m.media_types as string[])].sort(),
      `${MANIFEST} declares a media-type set that is not the shipped one — ` +
        `${REGENERATE}`,
    ).toEqual([...shipped].sort());
  });

  it("exercises every member, in the artifact and not only in the manifest", () => {
    if (!live()) return;
    const shipped = shippedMediaTypes();
    const exercised = new Set(
      (d.fixtures as Array<any>)
        .map((f) => f.media_type_exercised)
        .filter((t: unknown): t is string => typeof t === "string"),
    );
    const uncovered = shipped.filter((t) => !exercised.has(t));
    expect(
      uncovered,
      `These shipped media types have no fixture, so nothing proves the clause ` +
        `covers them: ${uncovered.join(", ")}. Add them to ` +
        `scripts/phase6/make-pushdown-fixtures.mjs and ${REMEASURE}.`,
    ).toEqual([]);
    const stray = [...exercised].filter((t) => !shipped.includes(t));
    expect(
      stray,
      `${RESULT} exercises media types the shipped list does not contain: ` +
        `${stray.join(", ")}`,
    ).toEqual([]);
  });

  it("matches the clause for every one of them", () => {
    if (!live()) return;
    const missed = (d.fixtures as Array<any>)
      .filter((f) => typeof f.media_type_exercised === "string")
      .filter((f) => f.clause_matched !== true)
      .map((f) => `${f.media_type_exercised} (${f.fixture_id})`);
    expect(
      missed,
      `The clause's substring terms do not cover these shipped essences: ` +
        `${missed.join(", ")}. That is a silent hole in the retroactive scan.`,
    ).toEqual([]);
  });
});
