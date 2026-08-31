// packages/backend/src/store/settings.spec.ts — the three-level resolution as an
// OPERATOR-READABLE surface, and the write edge that refuses a bound the sweep
// would obey.
//
// ===========================================================================
// WHAT THESE CASES ARE ACTUALLY GUARDING
// ===========================================================================
// `settings.ts` shipped in Phase 1 with two comments recording a debt: the
// resolution is three levels deep "because Phase 5 will want an operator-wide
// default that a single project can override", and each retention default is
// deliberately conservative because "there is no UI to change this until Phase
// 5". This plan is that phase. Four things fail silently if these cases are not
// here, and every one of them is a data-loss failure rather than a display one:
//
//   1. A BOUND THAT IS NOT A FINITE POSITIVE NUMBER, STORED. The shipped read
//      guard already refuses to APPLY one — `Number("")` is 0 and `Number("abc")`
//      is NaN, and either silently applied as a retention bound would delete
//      everything. That guard is a backstop, not an excuse: an interface that
//      accepts "0" and then quietly sweeps at the default has told the operator
//      their change took effect when it did not.
//   2. THE THREE LEVELS COLLAPSING INTO TWO. An absent project row and a project
//      row holding an empty string are DIFFERENT — `settings.value` is NOT NULL,
//      so `""` is a value somebody wrote. A list that reported both as "unset"
//      would make a stored empty string unfindable and unclearable.
//   3. A PROJECT WRITE LANDING IN THE GLOBAL SCOPE. The empty `project_id` is
//      reserved on this table and only this table; a scope mix-up here changes
//      every project the operator has (threat T-05-67).
//   4. THE KEY LIST DRIFTING FROM WHAT ANYTHING READS. A key with no shipped
//      consumer is a field the operator sets and nothing obeys, which is worse
//      than an absent field because it looks like it works. The last case in this
//      file runs every listed key through the shipped resolution function.

import {
  AUDIT_RETENTION_MAX_ROWS_KEY,
  INTERNAL_SETTING_KEYS,
  OPERATOR_SETTING_KEYS,
  RETENTION_MAX_AGE_MS_KEY,
  RETENTION_MAX_ROWS_KEY,
  SETTING_KEYS,
  SETTINGS_GROUPS,
  STORAGE_BOOT_COUNT_KEY,
  STORAGE_INSTALL_ID_KEY,
  STORAGE_OBSERVED_LOSS_KEY,
} from "@defminer/engine/contract";
import { beforeEach, describe, expect, it } from "vitest";

import {
  createFixtureDb,
  type SqliteFixture,
} from "../../test/fixtures/sqlite-fixture";

import { migrate } from "./migrations";
import {
  clearSetting,
  DEFAULT_AUDIT_RETENTION_MAX_ROWS,
  DEFAULT_RETENTION_MAX_AGE_MS,
  DEFAULT_RETENTION_MAX_ROWS,
  getRetentionBounds,
  GLOBAL_PROJECT_ID,
  KNOWN_SETTINGS,
  listKnownSettings,
  putBoundedSetting,
  putSetting,
  readStorageFootprint,
  recordBoot,
  resetBootMarkerForTest,
  resolveSetting,
  validateBound,
} from "./settings";

const P1 = "project-one";
const NOW = 1_800_000_000_000;

let fx: SqliteFixture;

beforeEach(async () => {
  fx = createFixtureDb();
  const report = await migrate(fx.db);
  expect(report.ok, JSON.stringify(report.steps)).toBe(true);
  return () => {
    fx.close();
  };
});

/** How many rows the `settings` table actually holds for one key, across every
 *  scope. Read through `raw` rather than through the module under test: a case
 *  claiming "two scopes are two rows" must not be able to pass because the
 *  module's own reader collapsed them. */
function rowsForKey(key: string): { project_id: string; value: string }[] {
  return fx.raw
    .prepare("SELECT project_id, value FROM settings WHERE key = ?")
    .all(key) as unknown as { project_id: string; value: string }[];
}

// ---------------------------------------------------------------------------
// THE KEY LIST
// ---------------------------------------------------------------------------

describe("the known-key list is what this build ACTUALLY has", () => {
  it("names exactly the OPERATOR keys the shared vocabulary declares, in its order", () => {
    expect(KNOWN_SETTINGS.map((s) => s.key)).toEqual([
      ...OPERATOR_SETTING_KEYS,
    ]);
  });

  // THE ASSERTION T-06-41 RESTS ON, AND IT IS WRITTEN IN BOTH DIRECTIONS.
  //
  // `SETTING_KEYS` is now the UNION of two arrays: keys the operator sets, and
  // internal durable state this plugin writes to observe its own deployment.
  // `KNOWN_SETTINGS` is what the Settings panel renders. An internal marker that
  // leaked into the rendered list would be a field the operator can edit and
  // nothing sensibly reads — an editable value that looks like a control.
  it("keeps every INTERNAL marker key OUT of the list the Settings panel renders", () => {
    const rendered = new Set<string>(KNOWN_SETTINGS.map((s) => s.key));
    for (const internal of INTERNAL_SETTING_KEYS) {
      expect(rendered.has(internal), `${internal} is operator-editable`).toBe(
        false,
      );
    }
    expect(INTERNAL_SETTING_KEYS).toContain(STORAGE_INSTALL_ID_KEY);
    expect(INTERNAL_SETTING_KEYS).toContain(STORAGE_BOOT_COUNT_KEY);
    expect(INTERNAL_SETTING_KEYS).toContain(STORAGE_OBSERVED_LOSS_KEY);
  });

  it("declares SETTING_KEYS as exactly the operator keys followed by the internal ones", () => {
    expect([...SETTING_KEYS]).toEqual([
      ...OPERATOR_SETTING_KEYS,
      ...INTERNAL_SETTING_KEYS,
    ]);
    // No key is in both halves — the two arrays partition the vocabulary rather
    // than overlapping it, which is what makes "which array is it in" a
    // decidable question.
    expect(new Set<string>(SETTING_KEYS).size).toBe(SETTING_KEYS.length);
  });

  // THE SWEEP THE CLOSED LIST HAS ALWAYS CARRIED, WIDENED TO THE WHOLE LIST.
  // The shipped case below runs the OPERATOR keys through `resolveSetting`; the
  // internal keys are stored in the same table by the same writer and must be
  // readable by the same reader, or the marker is a row nothing can find.
  it("resolves EVERY key in the closed list — internal markers included", async () => {
    for (const [i, key] of SETTING_KEYS.entries()) {
      const written = await putSetting(
        fx.db,
        GLOBAL_PROJECT_ID,
        key,
        `v${String(i)}`,
        NOW,
      );
      expect(written.ok).toBe(true);
      expect(await resolveSetting(fx.db, P1, key)).toBe(`v${String(i)}`);
    }
  });

  it("carries only groups the shared vocabulary declares", () => {
    for (const setting of KNOWN_SETTINGS) {
      expect([...SETTINGS_GROUPS]).toContain(setting.group);
    }
  });

  it("has a shipped consumer for EVERY listed key — each resolves through the shipped resolution function", async () => {
    // THE CLAIM: no key is invented for a phase that has not shipped its
    // control. Proven by writing a distinguishable value at each key and reading
    // it back through `resolveSetting`, which is the function `getRetentionBounds`
    // itself calls — so a key this list carries and nothing reads would have to
    // be a key `resolveSetting` cannot find.
    for (const [i, setting] of KNOWN_SETTINGS.entries()) {
      const written = await putSetting(
        fx.db,
        P1,
        setting.key,
        String(1000 + i),
        NOW,
      );
      expect(written.ok).toBe(true);
      expect(await resolveSetting(fx.db, P1, setting.key)).toBe(
        String(1000 + i),
      );
    }
    // And the ONE shipped consumer reads all three back as the bounds it
    // applies, so the list is not merely resolvable but actually obeyed.
    const bounds = await getRetentionBounds(fx.db, P1);
    expect(bounds.maxRows).toBe(1000);
    expect(bounds.maxAgeMs).toBe(1001);
    expect(bounds.auditMaxRows).toBe(1002);
  });

  it("carries the DOCUMENTED default for each key, as the string a stored row would hold", () => {
    const byKey = new Map(KNOWN_SETTINGS.map((s) => [s.key, s.documented]));
    expect(byKey.get(RETENTION_MAX_ROWS_KEY)).toBe(
      String(DEFAULT_RETENTION_MAX_ROWS),
    );
    expect(byKey.get(RETENTION_MAX_AGE_MS_KEY)).toBe(
      String(DEFAULT_RETENTION_MAX_AGE_MS),
    );
    expect(byKey.get(AUDIT_RETENTION_MAX_ROWS_KEY)).toBe(
      String(DEFAULT_AUDIT_RETENTION_MAX_ROWS),
    );
  });

  it("offers NO age bound for the audit table — decision D-06, enforced by the vocabulary", () => {
    // The absence asserted as an EQUALITY over the whole list, not as a search
    // for one name: a search cannot catch a key added under another spelling.
    // `retention.ts` has no audit-age statement to obey such a key with, so a
    // surface that offered one would be a control that does nothing.
    expect(
      KNOWN_SETTINGS.filter((s) => s.key.startsWith("retention.audit")),
    ).toHaveLength(1);
    expect(
      KNOWN_SETTINGS.map((s) => s.key).filter((k) => k.includes("audit")),
    ).toEqual([AUDIT_RETENTION_MAX_ROWS_KEY]);
  });
});

// ---------------------------------------------------------------------------
// THE THREE FIELDS
// ---------------------------------------------------------------------------

describe("listKnownSettings reports three DISTINGUISHABLE levels", () => {
  it("reports the documented default and two nulls when nothing is stored", async () => {
    const listed = await listKnownSettings(fx.db, P1);
    expect(listed).toHaveLength(KNOWN_SETTINGS.length);
    for (const row of listed) {
      expect(row.project).toBeNull();
      expect(row.global).toBeNull();
      expect(row.documented).toBe(
        KNOWN_SETTINGS.find((s) => s.key === row.key)?.documented,
      );
    }
  });

  it("distinguishes an ABSENT project row from a project row holding an EMPTY STRING", async () => {
    // The distinction the shipped `getSetting` already guarantees —
    // `settings.value` is NOT NULL, so `""` is a value somebody wrote and `null`
    // is a row that does not exist. A list that collapsed them would make a
    // stored empty string unfindable, and it is precisely the value the write
    // guard exists to refuse.
    expect(
      (await putSetting(fx.db, P1, RETENTION_MAX_ROWS_KEY, "", NOW)).ok,
    ).toBe(true);

    const listed = await listKnownSettings(fx.db, P1);
    const withEmpty = listed.find((r) => r.key === RETENTION_MAX_ROWS_KEY);
    const withNothing = listed.find((r) => r.key === RETENTION_MAX_AGE_MS_KEY);

    expect(withEmpty?.project).toBe("");
    expect(withEmpty?.project).not.toBeNull();
    expect(withNothing?.project).toBeNull();
  });

  it("reports the project value and the global value SIDE BY SIDE, not one resolved value", async () => {
    await putSetting(
      fx.db,
      GLOBAL_PROJECT_ID,
      RETENTION_MAX_ROWS_KEY,
      "9",
      NOW,
    );
    await putSetting(fx.db, P1, RETENTION_MAX_ROWS_KEY, "4", NOW);

    const row = (await listKnownSettings(fx.db, P1)).find(
      (r) => r.key === RETENTION_MAX_ROWS_KEY,
    );
    expect(row?.project).toBe("4");
    expect(row?.global).toBe("9");
    expect(row?.documented).toBe(String(DEFAULT_RETENTION_MAX_ROWS));
    // And the shipped resolution still picks the project row, unchanged.
    expect(await resolveSetting(fx.db, P1, RETENTION_MAX_ROWS_KEY)).toBe("4");
  });

  it("reports a project value EQUAL to the global one as a project row all the same", async () => {
    // EDGE / adjacency. The resolution order makes them indistinguishable on
    // READ, and that is exactly why they must stay distinguishable here: an
    // override elided because it matched would silently start tracking a later
    // change to the global value.
    await putSetting(
      fx.db,
      GLOBAL_PROJECT_ID,
      RETENTION_MAX_ROWS_KEY,
      "7",
      NOW,
    );
    await putSetting(fx.db, P1, RETENTION_MAX_ROWS_KEY, "7", NOW);

    const row = (await listKnownSettings(fx.db, P1)).find(
      (r) => r.key === RETENTION_MAX_ROWS_KEY,
    );
    expect(row?.project).toBe("7");
    expect(row?.global).toBe("7");
    expect(rowsForKey(RETENTION_MAX_ROWS_KEY)).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// THE TWO SCOPES
// ---------------------------------------------------------------------------

describe("the two scopes are two rows", () => {
  it("a project write and an operator-wide write of the SAME key produce two rows", async () => {
    expect(
      (await putBoundedSetting(fx.db, P1, RETENTION_MAX_ROWS_KEY, "11", NOW))
        .ok,
    ).toBe(true);
    expect(
      (
        await putBoundedSetting(
          fx.db,
          GLOBAL_PROJECT_ID,
          RETENTION_MAX_ROWS_KEY,
          "22",
          NOW,
        )
      ).ok,
    ).toBe(true);

    const rows = rowsForKey(RETENTION_MAX_ROWS_KEY);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.project_id).sort()).toEqual([
      GLOBAL_PROJECT_ID,
      P1,
    ]);
    expect(rows.find((r) => r.project_id === P1)?.value).toBe("11");
    expect(rows.find((r) => r.project_id === GLOBAL_PROJECT_ID)?.value).toBe(
      "22",
    );
  });

  it("clearing the project override falls the resolution back to the global row", async () => {
    await putBoundedSetting(
      fx.db,
      GLOBAL_PROJECT_ID,
      RETENTION_MAX_ROWS_KEY,
      "22",
      NOW,
    );
    await putBoundedSetting(fx.db, P1, RETENTION_MAX_ROWS_KEY, "11", NOW);
    expect(await resolveSetting(fx.db, P1, RETENTION_MAX_ROWS_KEY)).toBe("11");

    const cleared = await clearSetting(fx.db, P1, RETENTION_MAX_ROWS_KEY);
    expect(cleared.ok).toBe(true);

    expect(await resolveSetting(fx.db, P1, RETENTION_MAX_ROWS_KEY)).toBe("22");
    // The GLOBAL row is untouched — clearing an override is not clearing the
    // default it falls back to.
    expect(rowsForKey(RETENTION_MAX_ROWS_KEY)).toHaveLength(1);
  });

  it("clearing a key that has no project row is a no-op, not a failure", async () => {
    const cleared = await clearSetting(fx.db, P1, RETENTION_MAX_AGE_MS_KEY);
    expect(cleared.ok).toBe(true);
    expect(rowsForKey(RETENTION_MAX_AGE_MS_KEY)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// THE WRITE EDGE
// ---------------------------------------------------------------------------

describe("a bound that is not a finite positive number never reaches the table", () => {
  // FIVE DISTINGUISHABLE REASONS, NOT ONE "invalid". "0" is what an operator
  // types when they mean "no limit" and is the single most dangerous thing they
  // can mean here, so its copy has to say something different from a typo's.
  const cases: readonly [string, string][] = [
    ["", "empty"],
    ["   ", "empty"],
    ["abc", "not-numeric"],
    ["Infinity", "not-finite"],
    ["0", "zero"],
    ["-5", "negative"],
  ];

  for (const [raw, reason] of cases) {
    it(`rejects ${JSON.stringify(raw)} as ${reason} and stores NOTHING`, async () => {
      const outcome = await putBoundedSetting(
        fx.db,
        P1,
        RETENTION_MAX_ROWS_KEY,
        raw,
        NOW,
      );
      expect(outcome.ok).toBe(false);
      expect(outcome.ok === false && outcome.reason).toBe(reason);
      expect(rowsForKey(RETENTION_MAX_ROWS_KEY)).toHaveLength(0);
    });
  }

  it("validates through the SAME predicate the shipped read guard uses", async () => {
    // THE CONTRAST THAT MAKES THIS MORE THAN A SECOND IMPLEMENTATION. Every
    // input the write edge rejects is also an input the shipped defensive read
    // falls back on — so the two cannot disagree about what a usable bound is.
    // Written straight past the edge with `putSetting`, which is how a value
    // from before this surface existed got there.
    for (const [raw] of cases) {
      expect(validateBound(raw).ok).toBe(false);
      await putSetting(fx.db, P1, RETENTION_MAX_ROWS_KEY, raw, NOW);
      const bounds = await getRetentionBounds(fx.db, P1);
      expect(
        bounds.maxRows,
        `${JSON.stringify(raw)} was applied as a bound`,
      ).toBe(DEFAULT_RETENTION_MAX_ROWS);
    }
  });

  it("accepts a bound EQUAL to the documented default and stores it as a row", async () => {
    // EDGE / boundary. The documented default is a legal value, and storing it
    // is not the same state as leaving the key unset — the row pins the value
    // against a later change to the shipped default.
    const outcome = await putBoundedSetting(
      fx.db,
      P1,
      RETENTION_MAX_ROWS_KEY,
      String(DEFAULT_RETENTION_MAX_ROWS),
      NOW,
    );
    expect(outcome.ok).toBe(true);
    expect(outcome.ok && outcome.stored).toBe(
      String(DEFAULT_RETENTION_MAX_ROWS),
    );
    expect(rowsForKey(RETENTION_MAX_ROWS_KEY)).toHaveLength(1);
  });

  it("FLOORS a fractional bound, matching the shipped guard rather than correcting it", async () => {
    const outcome = await putBoundedSetting(
      fx.db,
      P1,
      RETENTION_MAX_ROWS_KEY,
      "50000.7",
      NOW,
    );
    expect(outcome.ok).toBe(true);
    expect(outcome.ok && outcome.stored).toBe("50000");
    expect(rowsForKey(RETENTION_MAX_ROWS_KEY)[0]?.value).toBe("50000");
    expect((await getRetentionBounds(fx.db, P1)).maxRows).toBe(50000);
  });

  it("stores the FLOORED value, so a re-read shows what was stored and not what was typed", async () => {
    await putBoundedSetting(fx.db, P1, RETENTION_MAX_ROWS_KEY, "42.9", NOW);
    const row = (await listKnownSettings(fx.db, P1)).find(
      (r) => r.key === RETENTION_MAX_ROWS_KEY,
    );
    expect(row?.project).toBe("42");
  });

  it("writing the same value twice succeeds both times and leaves ONE row", async () => {
    // EDGE / idempotency. The shipped write is an upsert on the natural key, so
    // the second call updates the timestamp and nothing else.
    const first = await putBoundedSetting(
      fx.db,
      P1,
      RETENTION_MAX_ROWS_KEY,
      "1234",
      NOW,
    );
    const second = await putBoundedSetting(
      fx.db,
      P1,
      RETENTION_MAX_ROWS_KEY,
      "1234",
      NOW + 5000,
    );
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(rowsForKey(RETENTION_MAX_ROWS_KEY)).toHaveLength(1);
    expect(rowsForKey(RETENTION_MAX_ROWS_KEY)[0]?.value).toBe("1234");
  });

  it("leaves a previously stored GOOD value in place when a later bad one is rejected", async () => {
    // The property the form's error path depends on: a rejection changes
    // nothing, so the operator's stored configuration is never a casualty of a
    // typo.
    await putBoundedSetting(fx.db, P1, RETENTION_MAX_ROWS_KEY, "999", NOW);
    const bad = await putBoundedSetting(
      fx.db,
      P1,
      RETENTION_MAX_ROWS_KEY,
      "0",
      NOW + 1,
    );
    expect(bad.ok).toBe(false);
    expect(rowsForKey(RETENTION_MAX_ROWS_KEY)[0]?.value).toBe("999");
  });
});

// ---------------------------------------------------------------------------
// THE BOOT MARKER — O-02's OBSERVED PERSISTENCE
// ---------------------------------------------------------------------------
//
// WHAT THESE CASES ARE GUARDING, AND IT IS ONE THING ABOVE ALL THE OTHERS:
// A FIRST INSTALL MUST NEVER REPORT A LOSS. The sentence this marker feeds says
// "a previous restart of this Caido lost DefMiner's database". Said to somebody
// who has just installed the plugin it is false, and a persistence claim that is
// false the first time it is shown is a persistence claim nobody reads again.

describe("the boot marker is an OBSERVATION of the past, never a prediction", () => {
  beforeEach(() => {
    resetBootMarkerForTest();
  });

  it("records no loss on a FIRST boot against an empty database", async () => {
    const marker = await recordBoot(fx.db, "install-a", NOW);

    expect(marker.installId).toBe("install-a");
    expect(marker.bootCount).toBe(1);
    expect(marker.observedLoss).toBe(false);
  });

  it("increments the boot count and KEEPS the install id on a second boot", async () => {
    await recordBoot(fx.db, "install-a", NOW);
    // A SECOND MINTED ID IS OFFERED AND MUST BE IGNORED. The caller mints one
    // unconditionally because it cannot know whether a marker exists; the
    // stored id is what identifies the install.
    const second = await recordBoot(fx.db, "install-b", NOW + 1000);

    expect(second.installId).toBe("install-a");
    expect(second.bootCount).toBe(2);
    expect(second.observedLoss).toBe(false);
  });

  it("does NOT report a loss when a boot count is simply absent on a fresh process", async () => {
    // The ephemeral-deployment case as a REAL deployment produces it: the whole
    // database is gone AND so is the process that wrote the marker. With no
    // memory of a prior marker there is no evidence, so there is no claim.
    await recordBoot(fx.db, "install-a", NOW);
    resetBootMarkerForTest();
    fx.raw.prepare("DELETE FROM settings").run();

    const after = await recordBoot(fx.db, "install-c", NOW + 2000);
    expect(after.observedLoss).toBe(false);
    expect(after.bootCount).toBe(1);
  });

  it("reports a loss when THIS process's own marker has disappeared", async () => {
    await recordBoot(fx.db, "install-a", NOW);
    // The marker this process wrote is gone from the database it wrote it to.
    // That is the one condition that is evidence rather than inference.
    fx.raw.prepare("DELETE FROM settings").run();

    const after = await recordBoot(fx.db, "install-c", NOW + 2000);
    expect(after.observedLoss).toBe(true);
    expect(after.installId).toBe("install-c");
    expect(after.bootCount).toBe(1);
  });

  it("KEEPS the loss recorded across subsequent boots of the same database", async () => {
    await recordBoot(fx.db, "install-a", NOW);
    fx.raw.prepare("DELETE FROM settings").run();
    await recordBoot(fx.db, "install-c", NOW + 2000);

    // A fresh process, the same surviving database: the flag is read back from
    // the row rather than re-derived, so the observation outlives the process
    // that made it for exactly as long as the database does.
    resetBootMarkerForTest();
    const later = await recordBoot(fx.db, "install-d", NOW + 3000);
    expect(later.observedLoss).toBe(true);
    expect(later.installId).toBe("install-c");
    expect(later.bootCount).toBe(2);
  });

  it("writes the marker at the RESERVED GLOBAL scope and at no project scope", async () => {
    await recordBoot(fx.db, "install-a", NOW);

    for (const key of [
      STORAGE_INSTALL_ID_KEY,
      STORAGE_BOOT_COUNT_KEY,
    ] as const) {
      const rows = rowsForKey(key);
      expect(rows.map((r) => r.project_id)).toEqual([GLOBAL_PROJECT_ID]);
    }
  });
});

// ---------------------------------------------------------------------------
// D-25 — THE FOOTPRINT, AGAINST THE CAPS
// ---------------------------------------------------------------------------

describe("the storage footprint reports counts against their caps", () => {
  it("returns three count/cap pairs from the already-shipped reads", async () => {
    const footprint = await readStorageFootprint(fx.db, P1, NOW);

    for (const row of [
      footprint.artifacts,
      footprint.observations,
      footprint.analyses,
    ]) {
      expect(row).not.toBeNull();
      expect(row?.count).toBe(0);
      expect(row?.cap).toBe(DEFAULT_RETENTION_MAX_ROWS);
    }
  });

  it("reports a MEASURED ZERO as a zero — distinguishable from an unread count", async () => {
    const footprint = await readStorageFootprint(fx.db, P1, NOW);
    expect(footprint.artifacts?.count).toBe(0);
    // A genuinely empty project has no oldest row, so the age is ABSENT rather
    // than zero. "oldest 0 days" is a fabricated number.
    expect(footprint.artifacts?.oldestDays).toBeNull();
  });

  it("counts and ages only THIS project's rows", async () => {
    fx.raw
      .prepare(
        "INSERT INTO artifacts (project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .run(P1, "a".repeat(64), 10, "js", NOW - 3 * 86_400_000, NOW, 1);
    fx.raw
      .prepare(
        "INSERT INTO artifacts (project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .run("other", "b".repeat(64), 10, "js", NOW - 99 * 86_400_000, NOW, 1);

    const footprint = await readStorageFootprint(fx.db, P1, NOW);
    expect(footprint.artifacts?.count).toBe(1);
    expect(footprint.artifacts?.oldestDays).toBe(3);
  });

  it("carries the observed-loss flag beside the counts, so the surface reads ONE call", async () => {
    resetBootMarkerForTest();
    await recordBoot(fx.db, "install-a", NOW);
    expect(
      (await readStorageFootprint(fx.db, P1, NOW)).observedRestartLoss,
    ).toBe(false);

    fx.raw.prepare("DELETE FROM settings").run();
    await recordBoot(fx.db, "install-c", NOW + 1000);
    expect(
      (await readStorageFootprint(fx.db, P1, NOW)).observedRestartLoss,
    ).toBe(true);
  });

  it("returns a row ABSENT rather than zero when its count cannot be read", async () => {
    // A read that throws is the case the surface must distinguish from an empty
    // project. Dropping the table is the cheapest way to make the shipped
    // statement fail for real rather than through a stub.
    fx.raw.prepare("DROP TABLE observations").run();

    const footprint = await readStorageFootprint(fx.db, P1, NOW);
    expect(footprint.observations).toBeNull();
    // And the endpoint still resolves: one unreadable table does not take the
    // other two with it.
    expect(footprint.artifacts).not.toBeNull();
    expect(footprint.analyses).not.toBeNull();
  });
});
