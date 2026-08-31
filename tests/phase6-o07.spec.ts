import { existsSync, readFileSync } from "node:fs";
import { userInfo } from "node:os";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

// THE PHASE 6 O-07 GATE.
//
// This file measures nothing. `scripts/phase6/o07-body-length.sh` does, against
// a fresh version-asserted Caido, because the question — does `Body.length` on a
// response returned by `sdk.requests.get()` and by `sdk.requests.query()` report
// the DECOMPRESSED identity byte count? — is a question about a running build and
// has no answer that can be derived by reading code.
//
// FAIL, NEVER SKIP, and name the remedy in every message. That is the doctrine
// `tests/go-no-go.spec.ts` set and `tests/phase1-load.spec.ts` carries; an absent
// or unreadable artifact must fail here rather than pass vacuously.
//
// WHY THE VERSION CONSTANT BELOW IS PHASE 6'S OWN AND NOT AN IMPORT (D-21).
// `tests/phase1-load.spec.ts` and `tests/phase1-runtime.spec.ts` pin "0.57.1".
// That is not drift and it is not a value to reuse: it is a deliberate
// fail-closed tripwire over artifacts whose numbers were MEASURED on 0.57.1, and
// re-running those harnesses on a newer build must fail loudly rather than
// silently rebaseline a threshold. This phase measures its own build and says so
// in its own artifact, so it declares its own constant and touches neither of
// theirs.
//
// AND WHY THIS ARTIFACT DOES NOT LIVE IN THE PHASE 0 RESULTS DIRECTORY
// (Pitfall 7, T-06-11). Phase 0's directory holds the threshold artifacts every
// later phase budgets against. A Phase 6 measurement written beside them — even a
// correct one — makes the boundary between "measured on the build the thresholds
// belong to" and "measured on today's build" unreadable.

const RESULT =
  ".planning/phases/06-retroactive-scan-deployment-reality/results/o07-body-length.json";
const SCHEMA =
  ".planning/phases/06-retroactive-scan-deployment-reality/results/o07-body-length.schema.json";
const EXPECTED_CAIDO_VERSION = "0.58.2";
const REMEASURE = "re-run `bash scripts/phase6/o07-body-length.sh`";
const STATUSES = ["pass", "fail", "inconclusive", "not_run"];
const ENCODINGS = ["identity", "gzip", "br", "zstd"];
const PATH_VERDICTS = ["identity", "wire", "not_measured"];

/* eslint-disable @typescript-eslint/no-explicit-any --
   The artifact is plain recorded JSON written by a shell script, with no shipped
   type. A parallel interface here would be a second hand-maintained copy of that
   shape, and the gate would then be checking the copy. */

function loadJson(path: string): any {
  const raw = readFileSync(path, "utf8");
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`${path} is not valid JSON: ${(err as Error).message}`);
  }
}

const d = existsSync(RESULT) ? loadJson(RESULT) : null;

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

// Two or more absolute path segments — `/a/b`. One segment (`/ace-small.js`) is
// a URL path template and carries nothing about this machine, which is why the
// pattern requires the SECOND separator rather than just a leading slash.
const ABSOLUTE_PATH = /(^|[\s"'(<=,;:])\/[A-Za-z0-9._+-]+\/[A-Za-z0-9._+-]/;
// The home-directory shapes, checked SEPARATELY and with no exemption at all —
// including over `binary.path`, the one field the absolute-path check exempts.
const HOME_PATH = /\/(?:Users|home)\/[^/\s"']+/;

// `binary.path` is EXEMPT from the absolute-path check and from nothing else.
// The path of the binary under test is the repudiation control T-06-09 turns on:
// an artifact that does not name the binary it was produced by cannot be checked
// against the "two caido-cli binaries" hazard at all. It is exempt from the
// generic shape check and still subject to HOME_PATH above.
const ABSOLUTE_PATH_EXEMPT = new Set(["$.binary.path"]);

function ajv() {
  const a = new Ajv2020({ allErrors: true, strict: false });
  addFormats(a);
  return a;
}

describe("the O-07 result schema", () => {
  it("compiles", () => {
    expect(existsSync(SCHEMA), `${SCHEMA} missing`).toBe(true);
    expect(() => ajv().compile(loadJson(SCHEMA))).not.toThrow();
  });

  it("admits `not_run` and REQUIRES a reason alongside it", () => {
    const schema = loadJson(SCHEMA);
    expect(
      schema?.properties?.status?.enum,
      `${SCHEMA}: status must admit not_run — D-23 records an unreachable leg ` +
        `with its reason and never as a pass.`,
    ).toContain("not_run");

    // Asserted by VALIDATION rather than by reading the `allOf` back, because a
    // conditional that is present but mis-wired reads identical to a correct one.
    const validate = ajv().compile(schema);
    const skeleton = {
      probe: "O-07",
      recorded_at: "2026-08-31T00:00:00Z",
      binary: {
        path: "caido-cli",
        expected_version: EXPECTED_CAIDO_VERSION,
        reported_version: EXPECTED_CAIDO_VERSION,
        sha256: "0".repeat(64),
      },
      host: { os: "darwin", arch: "arm64" },
      instances: [{ run_id: "x", listen: "127.0.0.1:8971" }],
      method: "skeleton",
      measurements: {
        byte_len_mismatch: 0,
        ...Object.fromEntries(
          ENCODINGS.map((e) => [
            e,
            {
              fixture: "f.js",
              identity_byte_len: null,
              hook_body_length: null,
              reload_raw_length: null,
              query_body_length: null,
              wire_byte_len: null,
            },
          ]),
        ),
      },
      verdict: {
        get_path_reports: "not_measured",
        query_path_reports: "not_measured",
      },
    };
    expect(
      validate({ ...skeleton, status: "not_run" }),
      `${SCHEMA}: a not_run document WITHOUT a reason validated. The whole point ` +
        `of the state is that it carries why.`,
    ).toBe(false);
    expect(
      validate({ ...skeleton, status: "not_run", reason: "fixtures missing" }),
      `${SCHEMA}: a not_run document WITH a reason failed to validate: ` +
        JSON.stringify(validate.errors),
    ).toBe(true);
  });
});

describe("the O-07 artifact", () => {
  it("exists — O-07 has no other answer", () => {
    expect(existsSync(RESULT), `${RESULT} missing — ${REMEASURE}`).toBe(true);
  });

  it("parses", () => {
    expect(d, `${RESULT} did not parse — ${REMEASURE}`).not.toBeNull();
  });

  it("validates against its own schema", () => {
    const validate = ajv().compile(loadJson(SCHEMA));
    const ok = validate(d);
    if (!ok) {
      throw new Error(
        `${RESULT} failed schema validation — ${REMEASURE}:\n` +
          (validate.errors ?? [])
            .map((e) => `  ${e.instancePath || "/"} ${e.message}`)
            .join("\n"),
      );
    }
    expect(ok).toBe(true);
  });

  // TWO SEPARATE ASSERTIONS, for two different failures. The first catches a
  // result recorded against a build nobody meant to measure. The second catches
  // an EXPECTATION quietly moved to match whatever happened to be running — so
  // editing `expected_version` does not rescue the run.
  it("names the build it describes, and that build is Phase 6's own constant", () => {
    expect(
      d?.binary?.reported_version,
      `${RESULT}: expected_version does not match reported_version. Do not edit ` +
        `the file — ${REMEASURE} against the app-bundle binary.`,
    ).toBe(d?.binary?.expected_version);
    expect(
      d?.binary?.reported_version,
      `${RESULT}: reported_version is not ${EXPECTED_CAIDO_VERSION}. Bare ` +
        `\`caido-cli\` on PATH resolves to a STALE 0.55.3 on this machine; the ` +
        `probe must use the absolute app-bundle path. ${REMEASURE}.`,
    ).toBe(EXPECTED_CAIDO_VERSION);
  });

  it("carries a terminal status, and a not_run carries its reason", () => {
    expect(
      STATUSES,
      `${RESULT}: status "${d?.status}" is not one of ${STATUSES.join(", ")}.`,
    ).toContain(d?.status);
    if (d?.status === "not_run") {
      expect(
        String(d?.reason ?? "").trim(),
        `${RESULT}: status is not_run with no reason. A probe that could not run ` +
          `is recorded with WHY, never as a pass and never as a bare state (D-23).`,
      ).toBeTruthy();
    }
  });
});

describe("the artifact carries nothing about this machine (T-06-10)", () => {
  it("records no absolute path outside the binary it names", () => {
    const leaked = strings(d).filter(
      (s) => !ABSOLUTE_PATH_EXEMPT.has(s.path) && ABSOLUTE_PATH.test(s.value),
    );
    expect(
      leaked.map((s) => s.path),
      `${RESULT} carries an absolute filesystem path. The probe runs against an ` +
        `isolated --data-path under a temporary directory, and this file is ` +
        `COMMITTED — the data path, the repository root and the run directory are ` +
        `all facts about the operator's machine and none of them is evidence.`,
    ).toEqual([]);
  });

  it("records no home-directory path, INCLUDING in binary.path", () => {
    const leaked = strings(d).filter((s) => HOME_PATH.test(s.value));
    expect(
      leaked.map((s) => s.path),
      `${RESULT} carries a home-directory path. \`binary.path\` is exempt from ` +
        `the generic absolute-path check and is NOT exempt from this one: a probe ` +
        `that ran against \`$HOME/.caido/caido-cli\` measured the stale 0.55.3, ` +
        `which is both a wrong measurement and an operator identifier.`,
    ).toEqual([]);
  });

  it("records no username", () => {
    let username = "";
    try {
      username = userInfo().username ?? "";
    } catch {
      username = "";
    }
    // A one- or two-character username would match half the English language and
    // turn this into a false-positive generator. Skipping the CHECK is not
    // skipping the TEST: the assertion below still runs, on an empty hit list.
    const hits =
      username.length >= 3
        ? strings(d).filter((s) => s.value.includes(username))
        : [];
    expect(
      hits.map((s) => s.path),
      `${RESULT} carries the running user's username.`,
    ).toEqual([]);
  });
});

describe("the measurement is non-vacuous", () => {
  it("carries at least one encoding block — an artifact of empty objects cannot pass", () => {
    const present = ENCODINGS.filter(
      (e) =>
        d?.measurements?.[e] !== undefined && d?.measurements?.[e] !== null,
    );
    expect(
      present,
      `${RESULT}: measurements carries no encoding block at all. A document that ` +
        `validates against the schema and measures nothing is the failure this ` +
        `assertion exists for. ${REMEASURE}.`,
    ).not.toEqual([]);
  });

  it("compared a real number of reloads before reporting byte_len_mismatch", () => {
    if (d?.status === "not_run") return;
    expect(
      d?.measurements?.reload_pairs_compared,
      `${RESULT}: reload_pairs_compared is ` +
        `${JSON.stringify(d?.measurements?.reload_pairs_compared)}. Zero ` +
        `comparisons and zero mismatches produce the same byte_len_mismatch, and ` +
        `only one of them is evidence. ${REMEASURE}.`,
    ).toBeGreaterThan(0);
  });

  it.each(ENCODINGS)(
    "the %s block carries both read paths' byte counts, or the run is not_run",
    (enc: string) => {
      if (d?.status === "not_run") return;
      const block = d?.measurements?.[enc];
      expect(
        block,
        `${RESULT}: no measurements.${enc} block. ${REMEASURE}.`,
      ).toBeTruthy();
      expect(
        block?.reload_raw_length,
        `${RESULT}: measurements.${enc}.reload_raw_length is null. That is the ` +
          `get() read path, and a null there means the leg did not run — which ` +
          `must be recorded as status not_run with a reason, not as a hole in a ` +
          `passing artifact (D-23).`,
      ).not.toBeNull();
      expect(
        block?.query_body_length,
        `${RESULT}: measurements.${enc}.query_body_length is null. That is the ` +
          `query() read path — the half that matters for the retro scan.`,
      ).not.toBeNull();
      expect(
        block?.identity_byte_len,
        `${RESULT}: measurements.${enc}.identity_byte_len is null, so every ` +
          `comparison against it below holds vacuously.`,
      ).not.toBeNull();
    },
  );
});

describe("the verdict agrees with its own measurements", () => {
  it.each([
    ["get_path_reports", () => d?.verdict?.get_path_reports],
    ["query_path_reports", () => d?.verdict?.query_path_reports],
  ])("%s is one of the three answers", (_name: string, read: () => unknown) => {
    expect(
      PATH_VERDICTS,
      `${RESULT}: ${_name} is ${JSON.stringify(read())}.`,
    ).toContain(read());
  });

  // THE ASSERTION THIS GATE EXISTS FOR. A verdict is a claim about a number that
  // is sitting right beside it, and a verdict that does not agree with that
  // number is worse than no verdict — it is a wrong answer wearing evidence.
  it("reads `identity` on the get() path only when byte_len_mismatch is 0", () => {
    const v = d?.verdict?.get_path_reports;
    const mismatch = d?.measurements?.byte_len_mismatch;
    if (v === "identity") {
      expect(
        mismatch,
        `${RESULT}: verdict.get_path_reports is "identity" while ` +
          `measurements.byte_len_mismatch is ${JSON.stringify(mismatch)}. The ` +
          `counter's own JSDoc in packages/backend/src/telemetry.ts says a ` +
          `non-zero value means the hook's Body.length disagreed with ` +
          `toRaw().length on the RELOADED response — which is the opposite of ` +
          `the verdict recorded here. ${REMEASURE}.`,
      ).toBe(0);
    }
    if (v === "wire") {
      expect(
        mismatch,
        `${RESULT}: verdict.get_path_reports is "wire" while ` +
          `measurements.byte_len_mismatch is ${JSON.stringify(mismatch)}. A ` +
          `reload reporting the WIRE count would disagree with the hook on every ` +
          `compressed response, so the counter cannot be 0.`,
      ).toBeGreaterThan(0);
    }
  });

  it("reads each per-encoding count as the count its verdict names", () => {
    if (d?.status === "not_run") return;
    for (const enc of ENCODINGS) {
      const b = d?.measurements?.[enc];
      if (b === undefined || b === null || b.identity_byte_len === null)
        continue;
      if (d?.verdict?.query_path_reports === "identity") {
        expect(
          b.query_body_length,
          `${RESULT}: verdict.query_path_reports is "identity" but ` +
            `measurements.${enc}.query_body_length is ` +
            `${JSON.stringify(b.query_body_length)} against an identity byte ` +
            `count of ${JSON.stringify(b.identity_byte_len)}.`,
        ).toBe(b.identity_byte_len);
      }
      if (d?.verdict?.query_path_reports === "wire") {
        expect(
          b.query_body_length,
          `${RESULT}: verdict.query_path_reports is "wire" but ` +
            `measurements.${enc}.query_body_length is ` +
            `${JSON.stringify(b.query_body_length)} against a wire byte count of ` +
            `${JSON.stringify(b.wire_byte_len)}.`,
        ).toBe(b.wire_byte_len);
      }
      if (d?.verdict?.get_path_reports === "identity") {
        expect(
          b.reload_raw_length,
          `${RESULT}: verdict.get_path_reports is "identity" but ` +
            `measurements.${enc}.reload_raw_length is ` +
            `${JSON.stringify(b.reload_raw_length)} against an identity byte ` +
            `count of ${JSON.stringify(b.identity_byte_len)}.`,
        ).toBe(b.identity_byte_len);
      }
      if (d?.verdict?.get_path_reports === "wire") {
        expect(
          b.reload_raw_length,
          `${RESULT}: verdict.get_path_reports is "wire" but ` +
            `measurements.${enc}.reload_raw_length is ` +
            `${JSON.stringify(b.reload_raw_length)} against a wire byte count of ` +
            `${JSON.stringify(b.wire_byte_len)}.`,
        ).toBe(b.wire_byte_len);
      }
    }
  });
});
