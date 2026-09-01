import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  EVIDENCE_PANEL_MAX_GRAPHEMES,
  TABLE_CELL_MAX_GRAPHEMES,
} from "../packages/engine/src/sanitise";
import {
  HOSTILE_MAP_CASE_IDS,
  HOSTILE_MAP_CASES,
  SIZE_BOUNDARY_CASE_IDS,
  SIZE_BOUNDARY_MIN_BYTES,
  sizeBoundaryCases,
  SOURCES_LABEL_CASE_IDS,
  SOURCES_LABEL_CASES,
} from "../packages/engine/src/sourcemap/map-fixture";

// THE FIXTURE'S OWN GATE.
//
// `packages/engine/src/sourcemap/map-fixture.ts` is the single module three
// plans read — the D-10 probe's hostile companion, plan 07-02's MAP-05 suite and
// plan 07-03's traversal-sink gate. A fixture nobody checks is a fixture that
// decays: a duplicated id makes an `it.each` run one case twice and skip
// another silently, a case that quietly became the empty string asserts nothing
// while still counting, and an id array that stopped tracking its own cases
// makes "asserted IN FULL" a claim rather than a property.
//
// FAIL, NEVER SKIP, and name the remedy in every message — the doctrine
// `tests/go-no-go.spec.ts` set.
//
// AND IT GATES THE OTHER HALF OF THE CORPUS TOO. The corpus splits by size
// across two TRACKED homes, because `corpus/` is gitignored in its entirety
// (`.gitignore:9`): the small fixtures live in the module above, and the large
// real maps live in `scripts/phase7/fetch-maps.sh` behind committed SHA-256
// hashes. A hash placeholder in that script is the same defect class as an empty
// fixture value here — apparatus that looks complete and verifies nothing — so
// both are asserted in one file.

const FETCH_MAPS = "scripts/phase7/fetch-maps.sh";
const FIXTURE_MODULE = "packages/engine/src/sourcemap/map-fixture.ts";

/** The one case whose value is LEGITIMATELY the empty string, named explicitly. */
const DELIBERATELY_EMPTY = "empty";

/** SPIKE-12's corpus is 22 rows; D-12 adds the 4 KB label SPIKE-12 does not cover. */
const SPIKE_12_CASE_COUNT = 22;
const SOURCES_LABEL_EXPECTED_COUNT = SPIKE_12_CASE_COUNT + 1;

/** The 4 KB label's size, restated here so the boundary claim is checkable. */
const FOUR_KILOBYTES = 4096;

function duplicates(ids: readonly string[]): string[] {
  const seen = new Map<string, number>();
  for (const id of ids) seen.set(id, (seen.get(id) ?? 0) + 1);
  return [...seen.entries()].filter(([, n]) => n > 1).map(([id]) => id);
}

describe("every case id is unique, in every array", () => {
  it.each([
    ["HOSTILE_MAP_CASE_IDS", HOSTILE_MAP_CASE_IDS],
    ["SOURCES_LABEL_CASE_IDS", SOURCES_LABEL_CASE_IDS],
    ["SIZE_BOUNDARY_CASE_IDS", SIZE_BOUNDARY_CASE_IDS],
  ])("%s", (name: string, ids: readonly string[]) => {
    expect(
      duplicates(ids),
      `${FIXTURE_MODULE}: ${name} carries duplicate id(s). A duplicate makes an ` +
        `\`it.each\` run one case TWICE and skip another SILENTLY — the consumer still ` +
        `reports the same assertion count, so nothing looks wrong.`,
    ).toEqual([]);
  });

  it("and no id collides ACROSS the three arrays", () => {
    // Consumers reference cases by id in failure messages and in UAT notes. Two
    // arrays sharing an id makes "which `empty` did this fail on" unanswerable.
    const all = [
      ...HOSTILE_MAP_CASE_IDS,
      ...SOURCES_LABEL_CASE_IDS,
      ...SIZE_BOUNDARY_CASE_IDS,
    ];
    expect(
      duplicates(all),
      `${FIXTURE_MODULE}: an id appears in more than one of the three arrays. ` +
        `Cases are referenced by id alone in failure messages, so a collision makes a ` +
        `failure unattributable.`,
    ).toEqual([]);
  });
});

describe("the id arrays track their own cases", () => {
  it("HOSTILE_MAP_CASE_IDS is HOSTILE_MAP_CASES' ids, in declaration order", () => {
    expect(
      HOSTILE_MAP_CASE_IDS,
      `${FIXTURE_MODULE}: HOSTILE_MAP_CASE_IDS has drifted from HOSTILE_MAP_CASES. ` +
        `It must be derived by mapping over the cases, never written out — a ` +
        `hand-maintained id list is a second copy, and consumers assert against the ` +
        `LIST while exercising the CASES.`,
    ).toEqual(HOSTILE_MAP_CASES.map((c) => c.id));
  });

  it("SOURCES_LABEL_CASE_IDS is SOURCES_LABEL_CASES' ids, in declaration order", () => {
    expect(
      SOURCES_LABEL_CASE_IDS,
      `${FIXTURE_MODULE}: SOURCES_LABEL_CASE_IDS has drifted from SOURCES_LABEL_CASES.`,
    ).toEqual(SOURCES_LABEL_CASES.map((c) => c.id));
  });

  it("SIZE_BOUNDARY_CASE_IDS is the builder's ids", () => {
    expect(
      SIZE_BOUNDARY_CASE_IDS,
      `${FIXTURE_MODULE}: SIZE_BOUNDARY_CASE_IDS has drifted from sizeBoundaryCases().`,
    ).toEqual(sizeBoundaryCases(SIZE_BOUNDARY_MIN_BYTES).map((c) => c.id));
  });

  it("all three arrays are exported and non-empty", () => {
    // The non-vacuity guard, in tests/schema.spec.ts's habit: an empty array
    // makes every `it.each` in every consumer disappear and the suite pass
    // having checked nothing.
    for (const [name, ids] of [
      ["HOSTILE_MAP_CASE_IDS", HOSTILE_MAP_CASE_IDS],
      ["SOURCES_LABEL_CASE_IDS", SOURCES_LABEL_CASE_IDS],
      ["SIZE_BOUNDARY_CASE_IDS", SIZE_BOUNDARY_CASE_IDS],
    ] as const) {
      expect(
        ids.length,
        `${FIXTURE_MODULE}: ${name} is empty. Every consumer's \`it.each\` would ` +
          `disappear and its suite would pass having asserted nothing.`,
      ).toBeGreaterThan(0);
    }
  });
});

describe("no case is silently empty, and every case says why it exists", () => {
  const everyCase = [...HOSTILE_MAP_CASES, ...SOURCES_LABEL_CASES];

  it.each(everyCase.map((c) => [c.id, c] as const))(
    "%s has a non-empty value, unless its id declares otherwise",
    (id: string, c: { readonly value: string }) => {
      if (id === DELIBERATELY_EMPTY) {
        expect(
          c.value,
          `${FIXTURE_MODULE}: the case named \`${DELIBERATELY_EMPTY}\` must BE the empty ` +
            `string — it is SPIKE-12 #20, the degenerate label, and the whole point is ` +
            `that a row keeps its index.`,
        ).toBe("");
        return;
      }
      expect(
        c.value.length,
        `${FIXTURE_MODULE}: case \`${id}\` has an EMPTY value. An empty payload passes ` +
          `every sanitiser, every parser and every renderer while asserting nothing, and ` +
          `it still counts towards the consumer's assertion total. Exactly one case is ` +
          `allowed to be empty and it is called \`${DELIBERATELY_EMPTY}\`.`,
      ).toBeGreaterThan(0);
    },
  );

  it.each(everyCase.map((c) => [c.id, c] as const))(
    "%s explains itself",
    (id: string, c: { readonly why: string }) => {
      expect(
        c.why.trim().length,
        `${FIXTURE_MODULE}: case \`${id}\` has no \`why\`. A failing \`it.each\` prints ` +
          `the id, and the id is only useful next to the reason the case exists.`,
      ).toBeGreaterThan(20);
    },
  );
});

describe("the SPIKE-12 corpus is carried in full, plus the class it does not cover", () => {
  it("has exactly 23 label cases — SPIKE-12's 22 and D-12's 4 KB label", () => {
    expect(
      SOURCES_LABEL_CASE_IDS.length,
      `${FIXTURE_MODULE}: SOURCES_LABEL_CASES has ${SOURCES_LABEL_CASE_IDS.length} ` +
        `members, not ${SOURCES_LABEL_EXPECTED_COUNT}. SPIKE-12's path_resolution corpus ` +
        `is ${SPIKE_12_CASE_COUNT} rows and D-12 adds the ONE class it does not cover — ` +
        `the 4 KB label. Dropping a case here silently narrows three downstream gates.`,
    ).toBe(SOURCES_LABEL_EXPECTED_COUNT);
  });

  it("keeps the two documented path.normalize CORRUPTION cases", () => {
    // Named individually rather than counted: these two are the direct evidence
    // for O-08's "must not call node:path", and losing either would leave the
    // ban with no fixture behind it.
    for (const id of ["unicode-rtl-override", "trailing-dots-spaces"]) {
      expect(
        SOURCES_LABEL_CASE_IDS,
        `${FIXTURE_MODULE}: \`${id}\` is gone. It is one of the two SPIKE-12 rows whose ` +
          `\`normalized\` field DIFFERS from its source in a way that changes the target — ` +
          `the direct evidence for the ban on node:path in the display path (O-08).`,
      ).toContain(id);
    }
  });

  it("keeps the legal control", () => {
    expect(
      SOURCES_LABEL_CASE_IDS,
      `${FIXTURE_MODULE}: \`benign-control\` is gone. A corpus in which EVERY case fires ` +
        `proves only that the check fires. SPIKE-12 #22 is the label that must be ` +
        `accepted, and without it a gate that rejects everything looks correct.`,
    ).toContain("benign-control");
  });

  it("sizes the 4 KB label above BOTH shipped graphemes caps", () => {
    const label = SOURCES_LABEL_CASES.find(
      (c) => c.id === "four-kilobyte-label",
    );
    expect(
      label,
      `${FIXTURE_MODULE}: \`four-kilobyte-label\` is gone.`,
    ).toBeDefined();
    expect(
      label?.value.length,
      `${FIXTURE_MODULE}: the 4 KB label is ${label?.value.length} characters, not ` +
        `${FOUR_KILOBYTES}.`,
    ).toBe(FOUR_KILOBYTES);
    // THE INEQUALITIES ARE THE PROPERTY, not the number they evaluate to — the
    // rule thresholds.spec.ts states. If a cap is raised past 4,096 this label
    // stops exercising the truncation boundary at all and goes green having
    // proved nothing.
    expect(
      label?.value.length,
      `${FIXTURE_MODULE}: the 4 KB label no longer exceeds TABLE_CELL_MAX_GRAPHEMES ` +
        `(${TABLE_CELL_MAX_GRAPHEMES}), so it stops exercising the table cell's ` +
        `truncation boundary and the case goes green having proved nothing.`,
    ).toBeGreaterThan(TABLE_CELL_MAX_GRAPHEMES);
    expect(
      label?.value.length,
      `${FIXTURE_MODULE}: the 4 KB label no longer exceeds EVIDENCE_PANEL_MAX_GRAPHEMES ` +
        `(${EVIDENCE_PANEL_MAX_GRAPHEMES}). Plan 07-07's SOURCE_LINE_MAX_GRAPHEMES must ` +
        `also land BELOW ${FOUR_KILOBYTES} for this fixture to keep exercising it.`,
    ).toBeGreaterThan(EVIDENCE_PANEL_MAX_GRAPHEMES);
  });
});

describe("the hostile map corpus covers each documented pitfall", () => {
  // Named individually. A count would pass while the wrong thirteen were present.
  it.each([
    ["sources-content-absent", "Pitfall 3 — the whole field is optional"],
    [
      "sources-content-shorter-than-sources",
      "Pitfall 3 — the array may be short",
    ],
    ["sources-content-null-entry", "Pitfall 3 — entries may be null"],
    ["sources-null-entry", "Pitfall 3 — `sources` entries may be null"],
    ["sections-index-map", "Pitfall 5 — the second, indexed shape"],
    [
      "sections-nested",
      "Pitfall 5 / D-13 — must be REFUSED; the bound is 1 by spec",
    ],
    [
      "sections-unsorted-overlapping",
      "Pitfall 5 — a `shall` a hostile map violates",
    ],
    ["sections-map-null", "Pitfall 5 — a section whose map is null"],
    ["xssi-prefix", "Pitfall 6 — the `)]}'` prefix ECMA-426 permits"],
    [
      "deep-nested-past-stack-limit",
      "T-07-03 — past the measured 710-bracket boundary",
    ],
    ["million-tiny-sources", "MAP-06 / D-09 — the aggregate row bound"],
    [
      "single-giant-sources-content",
      "T-05-12 / O-02 — no line structure at all",
    ],
    ["non-ascii-round-trip", "Pitfall 4 — atob's latin1 corruption"],
  ])("%s is present (%s)", (id: string) => {
    expect(
      HOSTILE_MAP_CASE_IDS,
      `${FIXTURE_MODULE}: hostile case \`${id}\` is gone. Each of these is a documented ` +
        `pitfall with its own required outcome; removing one removes the only fixture ` +
        `that proves the outcome.`,
    ).toContain(id);
  });

  it("the four cases that must PARSE do parse, and the one that must not is caught", () => {
    // Non-vacuity from the other direction: a corpus of documents that all fail
    // to parse would satisfy every "must be refused" assertion downstream while
    // testing nothing about the accept path.
    for (const id of [
      "sources-content-absent",
      "sources-content-shorter-than-sources",
      "sources-content-null-entry",
      "sources-null-entry",
      "sections-index-map",
      "sections-nested",
      "sections-unsorted-overlapping",
      "sections-map-null",
      "non-ascii-round-trip",
    ]) {
      const c = HOSTILE_MAP_CASES.find((x) => x.id === id);
      expect(
        () => JSON.parse(c?.value ?? ""),
        `${FIXTURE_MODULE}: case \`${id}\` is not valid JSON. It is meant to be a map a ` +
          `parser ACCEPTS and a consumer then has to handle — if it fails at JSON.parse, ` +
          `the structural hazard it names is never reached.`,
      ).not.toThrow();
    }
    const xssi = HOSTILE_MAP_CASES.find((x) => x.id === "xssi-prefix");
    expect(
      () => JSON.parse(xssi?.value ?? ""),
      `${FIXTURE_MODULE}: the XSSI case parses as-is, so it is not carrying the prefix. ` +
        `The whole hazard is that JSON.parse THROWS on a map that is perfectly valid ` +
        `once the leading \`)]}'\` line is stripped (Pitfall 6).`,
    ).toThrow();
    expect(
      JSON.parse(xssi?.value.slice(xssi.value.indexOf("\n") + 1) ?? ""),
      `${FIXTURE_MODULE}: the XSSI case does not parse after its first line is stripped, ` +
        `so it is not testing the prefix — it is testing malformed JSON.`,
    ).toMatchObject({ version: 3 });
  });

  it("the non-ASCII case really does carry non-ASCII once parsed", () => {
    // The escape-not-literal rule means the source shows `£`; this asserts
    // that what a consumer receives is the character and not the escape text.
    const c = HOSTILE_MAP_CASES.find((x) => x.id === "non-ascii-round-trip");
    const parsed = JSON.parse(c?.value ?? "{}");
    const body = String(parsed?.sourcesContent?.[0] ?? "");
    for (const ch of ["£", "—", "説"]) {
      expect(
        body,
        `${FIXTURE_MODULE}: the non-ASCII case has lost ${JSON.stringify(ch)}. Its whole ` +
          `job is to round-trip to a DIFFERENT sha256 under \`atob\` than under ` +
          `\`Buffer.from(…,"base64")\` — with a pure-ASCII body the two agree and the ` +
          `case proves the opposite of what it claims (Pitfall 4).`,
      ).toContain(ch);
    }
  });

  it("the deep-nesting case really is past the measured bracket boundary", () => {
    const c = HOSTILE_MAP_CASES.find(
      (x) => x.id === "deep-nested-past-stack-limit",
    );
    const depth = (c?.value.match(/\[/g) ?? []).length;
    expect(
      depth,
      `${FIXTURE_MODULE}: the deep-nesting case is ${depth} brackets deep. SPIKE-06 ` +
        `bisected this runtime's boundary at last-good 710 / first-bad 718, so a fixture ` +
        `below 718 exercises the SUCCESS path while claiming to exercise the failure one.`,
    ).toBeGreaterThan(718);
  });
});

describe("the size boundary is exercised from BOTH sides, exactly", () => {
  it("builds one document at the ceiling and one a single byte above it", () => {
    const ceiling = 4096;
    const [at, over] = sizeBoundaryCases(ceiling);
    expect(
      at.value.length,
      `${FIXTURE_MODULE}: sizeBoundaryCases(${ceiling}) produced a ${at.value.length}-byte ` +
        `document for the AT case. "Roughly the ceiling" is not a boundary — the whole ` +
        `value of the pair is that one is exactly one byte larger than the other.`,
    ).toBe(ceiling);
    expect(
      over.value.length,
      `${FIXTURE_MODULE}: the OVER case is ${over.value.length} bytes, not ${ceiling + 1}.`,
    ).toBe(ceiling + 1);
    expect(
      over.value.length - at.value.length,
      `${FIXTURE_MODULE}: the two boundary documents differ by more than one byte, so a ` +
        `\`>=\` / \`>\` slip could pass by landing between them — which is the exact ` +
        `off-by-one the admit.spec.ts idiom exists to catch.`,
    ).toBe(1);
  });

  it("both documents are valid maps, so a refusal is about SIZE and nothing else", () => {
    for (const c of sizeBoundaryCases(8192)) {
      const parsed = JSON.parse(c.value);
      expect(
        parsed.version,
        `${FIXTURE_MODULE}: boundary case \`${c.id}\` is not a well-formed map. If it is ` +
          `refused for being malformed rather than for being over the ceiling, the ` +
          `boundary is never actually tested.`,
      ).toBe(3);
      expect(Array.isArray(parsed.sources)).toBe(true);
      expect(Array.isArray(parsed.sourcesContent)).toBe(true);
    }
  });

  it("is exact at a size no reader would expect to be round", () => {
    // A builder that happened to work only on powers of two would pass the case
    // above and fail on MAP_MAX_BYTES, which is a measured number.
    const odd = 2_752_789;
    expect(
      sizeBoundaryCases(odd)[0].value.length,
      `${FIXTURE_MODULE}: the builder is not exact at ${odd}. MAP_MAX_BYTES is a MEASURED ` +
        `number and will never be round.`,
    ).toBe(odd);
  });

  it("refuses a ceiling below its own skeleton rather than returning a short document", () => {
    expect(
      () => sizeBoundaryCases(SIZE_BOUNDARY_MIN_BYTES - 1),
      `${FIXTURE_MODULE}: sizeBoundaryCases accepted a ceiling below ` +
        `SIZE_BOUNDARY_MIN_BYTES (${SIZE_BOUNDARY_MIN_BYTES}) and returned SOMETHING. A ` +
        `document shorter than its own structure is not a smaller map, it is a broken ` +
        `one, and it would be refused for the wrong reason.`,
    ).toThrow(RangeError);
    expect(() => sizeBoundaryCases(SIZE_BOUNDARY_MIN_BYTES)).not.toThrow();
  });
});

describe("the LARGE half of the corpus — fetch-maps.sh and its committed hashes", () => {
  const script = readFileSync(FETCH_MAPS, "utf8");
  // `fetch <local> <sha256> <cdn-path>`, matched across the line break the real
  // calls use.
  const calls = [
    ...script.matchAll(/^fetch\s+(\S+)\s+([0-9a-fA-Fx]+)\s*\\?\s*$/gm),
  ];

  it("declares at least the three maps the ladder points at", () => {
    expect(
      calls.length,
      `${FETCH_MAPS}: found ${calls.length} \`fetch\` calls. The ladder needs monaco, ` +
        `babel and tfjs — the three maps that pair with the pinned bundle VERSIONS in ` +
        `scripts/spike/fetch-corpus.sh.`,
    ).toBeGreaterThanOrEqual(3);
  });

  it.each(["monaco", "babel", "tfjs"])("names the %s map", (name: string) => {
    expect(
      calls.map((m) => m[1]).join(" "),
      `${FETCH_MAPS}: no fetch line for ${name}.`,
    ).toContain(name);
  });

  it("gives EVERY fetch a real 64-hex SHA-256, with no placeholder", () => {
    for (const [, file, hash] of calls) {
      expect(
        hash,
        `${FETCH_MAPS}: \`${file}\` is pinned to ${JSON.stringify(hash)}, which is not a ` +
          `64-character hex SHA-256. The script and its hashes ARE the reproducible ` +
          `artifact — the ~37 MB of vendor JSON is gitignored — so a placeholder here is ` +
          `apparatus that looks complete and verifies nothing (threat T-07-18).`,
      ).toMatch(/^[0-9a-f]{64}$/);
      expect(
        /^(0+|f+|x+)$/i.test(hash),
        `${FETCH_MAPS}: \`${file}\`'s hash is a repeated character — a placeholder wearing ` +
          `the right shape.`,
      ).toBe(false);
    }
  });

  it("gives every fetch exactly ONE hash", () => {
    const files = calls.map((m) => m[1]);
    expect(
      duplicates(files),
      `${FETCH_MAPS}: a local filename appears in more than one \`fetch\` line. The ` +
        `second call would overwrite the first's verification with its own.`,
    ).toEqual([]);
  });

  it("pins every CDN path to an IMMUTABLE versioned specifier", () => {
    // `@scope/name@version/...` or `name@version/...`. A floating specifier
    // (`monaco-editor/min-maps/...`) resolves to whatever is current, which
    // makes the committed hash a tripwire that fires on the CDN's schedule
    // rather than a pin.
    const paths = [...script.matchAll(/"((?:@[\w.-]+\/)?[\w.-]+@[^"]+)"/g)].map(
      (m) => m[1],
    );
    expect(
      paths.length,
      `${FETCH_MAPS}: found no version-pinned CDN paths at all.`,
    ).toBeGreaterThanOrEqual(3);
    for (const p of paths) {
      expect(
        p,
        `${FETCH_MAPS}: the CDN path ${JSON.stringify(p)} is not pinned to an exact ` +
          `version. jsDelivr serves a floating specifier as whatever is current, so the ` +
          `committed hash would fire on the CDN's schedule instead of pinning anything ` +
          `(threat T-07-18).`,
      ).toMatch(/@\d+\.\d+\.\d+\//);
    }
  });

  it("fails CLOSED on a mismatch — deletes the file and exits non-zero", () => {
    expect(
      script,
      `${FETCH_MAPS}: no HASH MISMATCH branch. A fetch script that reports a mismatch and ` +
        `carries on measures something nobody chose.`,
    ).toContain("HASH MISMATCH");
    expect(
      script,
      `${FETCH_MAPS}: the mismatch branch does not remove the bad file. Leaving it means ` +
        `the NEXT run finds it present, skips the download, and fails identically for ever.`,
    ).toMatch(/rm -f "\$f"/);
    expect(
      script,
      `${FETCH_MAPS}: the mismatch branch does not exit non-zero.`,
    ).toMatch(/exit 1/);
  });
});

describe("the fixture module is TRACKED source, not a gitignored mirror", () => {
  it("is not under corpus/", () => {
    // The whole reason this module exists rather than `corpus/maps/`. Asserted
    // as a property of the PATH so it cannot be satisfied by a comment.
    expect(
      FIXTURE_MODULE.startsWith("corpus/"),
      `The fixture module has moved under corpus/, which is gitignored IN ITS ENTIRETY ` +
        `(.gitignore:9 — check with \`git check-ignore -v corpus/\`). Bytes written there ` +
        `do not survive a clean checkout, so the fixtures would silently stop existing ` +
        `for everyone but the machine that wrote them.`,
    ).toBe(false);
  });

  it("is readable from the repo root — the module a clean checkout gets", () => {
    expect(
      readFileSync(FIXTURE_MODULE, "utf8").length,
      `${FIXTURE_MODULE} is missing or empty.`,
    ).toBeGreaterThan(0);
  });
});
