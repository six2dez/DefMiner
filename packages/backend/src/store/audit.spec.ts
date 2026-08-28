// packages/backend/src/store/audit.spec.ts — the audit log's behavioural gate
// (STORE-08).
//
// The static gates already cover this module from the moment it lands:
// `schema.spec.ts` asserts its columns are on the allowlist and carry no
// forbidden name, `sql-discipline.spec.ts` asserts its statements are
// project-scoped, positionally bound and free of `RETURNING`, and
// `error-redaction.spec.ts` asserts it renders no error without `describeError`.
// What none of them can assert is what the table is FOR: that a replay writes
// nothing, that a bad `kind` is refused by the database rather than by a comment,
// and that a detail carrying a URL is stored redacted. Those are here.

import { describe, expect, it } from "vitest";

import { URL_REDACTION } from "../telemetry";

import { createFixtureDb } from "../../test/fixtures/sqlite-fixture";

import {
  AUDIT_KINDS,
  AUDIT_LIST_DEFAULT_LIMIT,
  listAudit,
  recordAudit,
  type AuditKind,
} from "./audit";
import { migrate } from "./migrations";

const PROJECT = "proj-alpha";
const OTHER = "proj-beta";

async function migrated() {
  const fx = createFixtureDb();
  const report = await migrate(fx.db);
  expect(report.ok, JSON.stringify(report.steps)).toBe(true);
  return fx;
}

function countAudit(fx: Awaited<ReturnType<typeof migrated>>): number {
  const row = fx.raw.prepare("SELECT COUNT(*) AS n FROM audit").get() as {
    n: number;
  };
  return Number(row.n);
}

describe("the audit log's vocabulary (STORE-08)", () => {
  it("has exactly the seven kinds approved at plan 05-06's checkpoint", () => {
    // Seven, not "at least seven". The vocabulary is a CLOSED set duplicated into
    // a CHECK constraint in migration step v3, and step v3 is immutable — so a
    // member added here without a new migration step would be a value the
    // database refuses at write time, which this count is what catches.
    expect(AUDIT_KINDS).toHaveLength(7);
    expect([...AUDIT_KINDS]).toEqual([
      "triage_set",
      "suppression_create",
      "suppression_remove",
      "finding_projected",
      "export_raw",
      "export_redacted",
      "value_revealed",
    ]);
    expect(new Set(AUDIT_KINDS).size).toBe(7);
  });

  it("the DDL's CHECK constraint lists the SAME seven values, with no member restated by hand", async () => {
    // The one place the vocabulary is legitimately written twice is TypeScript
    // and SQL, which cannot share a literal. So the agreement is asserted rather
    // than assumed: read the shipped constraint out of `sqlite_master` and
    // compare it to `AUDIT_KINDS` member by member.
    const fx = await migrated();
    try {
      const row = fx.raw
        .prepare(
          "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'audit'",
        )
        .get() as { sql: string };
      const constraint = /CHECK \(kind IN \(([^)]*)\)\)/.exec(row.sql);
      expect(constraint, `no kind CHECK in:\n${row.sql}`).not.toBeNull();
      const inDdl = (constraint?.[1] ?? "")
        .split(",")
        .map((t) => t.trim().replace(/^'|'$/g, ""));
      expect(inDdl).toEqual([...AUDIT_KINDS]);
    } finally {
      fx.close();
    }
  });
});

describe("recordAudit — one idempotent statement, append-only", () => {
  it("writes one event and reports one change", async () => {
    const fx = await migrated();
    try {
      const res = await recordAudit(
        fx.db,
        PROJECT,
        "finding_projected",
        "fp:abc123",
        "projected 3 findings",
        1_700_000_000_000,
        "evt-0001",
      );
      expect(res.ok, res.ok ? "" : res.error).toBe(true);
      expect(res.ok && res.changes).toBe(1);
      expect(countAudit(fx)).toBe(1);
    } finally {
      fx.close();
    }
  });

  it("a REPLAY of the same event id writes nothing and is not an error", async () => {
    // The property the whole design rests on. This driver has no usable
    // transaction — `BEGIN` does not span `exec` calls and fails SILENTLY — so a
    // caller that retries after an ambiguous failure must be safe to retry. The
    // do-nothing conflict clause makes the retry a no-op rather than a duplicate
    // or a raised constraint error, and `changes: 0` is how the caller can tell.
    const fx = await migrated();
    try {
      const first = await recordAudit(
        fx.db,
        PROJECT,
        "export_raw",
        "export:2026-08-28",
        "42 rows",
        1_700_000_000_000,
        "evt-dupe",
      );
      const second = await recordAudit(
        fx.db,
        PROJECT,
        "export_raw",
        "export:2026-08-28",
        "42 rows",
        1_700_000_009_999,
        "evt-dupe",
      );

      expect(first.ok && first.changes).toBe(1);
      expect(second.ok, second.ok ? "" : second.error).toBe(true);
      expect(second.ok && second.changes).toBe(0);
      expect(countAudit(fx)).toBe(1);

      // Append-only means the FIRST write stands. The replay's later clock did
      // not overwrite it — a DO UPDATE here would have rewritten history, which
      // is the one thing an audit log may never do.
      const row = fx.raw
        .prepare("SELECT at FROM audit WHERE event_id = ?")
        .get("evt-dupe") as { at: number };
      expect(Number(row.at)).toBe(1_700_000_000_000);
    } finally {
      fx.close();
    }
  });

  it("a kind outside the seven is refused by the DATABASE, and reported rather than thrown", async () => {
    const fx = await migrated();
    try {
      const res = await recordAudit(
        fx.db,
        PROJECT,
        // The cast is the point: this is what a future caller with a stale
        // vocabulary, or a value crossing the RPC boundary, actually looks like.
        // The CHECK constraint is the enforcement; the type is only the warning.
        "finding_deleted" as AuditKind,
        "fp:abc123",
        null,
        1_700_000_000_000,
        "evt-badkind",
      );
      expect(res.ok).toBe(false);
      expect(countAudit(fx)).toBe(0);
    } finally {
      fx.close();
    }
  });

  it("an EMPTY project id is refused by the inline length check", async () => {
    // `project_id = ''` is RESERVED as GLOBAL on `settings` and on `settings`
    // only. An audit event belongs to exactly one project; a row written under
    // `''` here is a row no read will ever return, which is why step v3 gives
    // the column the same `length(project_id) > 0` CHECK v2's tables carry.
    const fx = await migrated();
    try {
      const res = await recordAudit(
        fx.db,
        "",
        "triage_set",
        "fp:abc123",
        null,
        1_700_000_000_000,
        "evt-noproject",
      );
      expect(res.ok).toBe(false);
      expect(countAudit(fx)).toBe(0);
    } finally {
      fx.close();
    }
  });

  it("a detail carrying a URL is stored REDACTED", async () => {
    // T-05-27. The audit log is the operator-facing record and must carry no
    // target bytes: a caller that pastes a URL into `detail` is a mistake the
    // WRITER absorbs, not one the reviewer is expected to catch. Redaction runs
    // before binding, so the unredacted form never reaches the database at all.
    const fx = await migrated();
    try {
      const res = await recordAudit(
        fx.db,
        PROJECT,
        "value_revealed",
        "fp:abc123",
        "revealed at https://target.example.com/admin?token=abc123",
        1_700_000_000_000,
        "evt-url",
      );
      expect(res.ok, res.ok ? "" : res.error).toBe(true);

      const row = fx.raw
        .prepare("SELECT detail FROM audit WHERE event_id = ?")
        .get("evt-url") as { detail: string };
      expect(row.detail).toContain(URL_REDACTION);
      expect(row.detail).not.toContain("target.example.com");
      expect(row.detail).not.toContain("abc123?token");
      expect(row.detail).not.toContain("https://");
    } finally {
      fx.close();
    }
  });

  it("a null detail stays null rather than becoming the string 'null'", async () => {
    const fx = await migrated();
    try {
      await recordAudit(
        fx.db,
        PROJECT,
        "triage_set",
        "fp:abc123",
        null,
        1_700_000_000_000,
        "evt-nulldetail",
      );
      const row = fx.raw
        .prepare("SELECT detail FROM audit WHERE event_id = ?")
        .get("evt-nulldetail") as { detail: string | null };
      expect(row.detail).toBeNull();
    } finally {
      fx.close();
    }
  });
});

describe("listAudit — newest first, always bounded, never cross-project", () => {
  async function seed(fx: Awaited<ReturnType<typeof migrated>>): Promise<void> {
    // Two events share a millisecond ON PURPOSE: `at` alone is not a total order,
    // and without a tie-break SQLite may return them in whichever order the scan
    // produced — which can differ between two runs of the same query.
    const rows: [string, AuditKind, string, number, string][] = [
      [PROJECT, "triage_set", "fp:a", 1_700_000_000_000, "evt-a"],
      [PROJECT, "suppression_create", "rule:b", 1_700_000_002_000, "evt-b"],
      [PROJECT, "export_redacted", "export:c", 1_700_000_002_000, "evt-c"],
      [PROJECT, "finding_projected", "fp:d", 1_700_000_005_000, "evt-d"],
      [OTHER, "export_raw", "export:e", 1_700_000_009_000, "evt-e"],
    ];
    for (const [p, kind, subject, at, id] of rows) {
      const res = await recordAudit(fx.db, p, kind, subject, null, at, id);
      expect(res.ok, res.ok ? "" : res.error).toBe(true);
    }
  }

  it("returns this project's events newest first with a deterministic tie-break", async () => {
    const fx = await migrated();
    try {
      await seed(fx);
      const rows = await listAudit(fx.db, PROJECT);
      expect(rows.map((r) => r.event_id)).toEqual([
        "evt-d",
        "evt-c",
        "evt-b",
        "evt-a",
      ]);
      // `evt-c` before `evt-b` is the tie-break asserted, not incidental: both
      // carry the same `at`, and the order is `event_id DESC`.
      expect(rows[0]?.at).toBe(1_700_000_005_000);
    } finally {
      fx.close();
    }
  });

  it("the same query run twice returns the SAME sequence", async () => {
    const fx = await migrated();
    try {
      await seed(fx);
      const a = await listAudit(fx.db, PROJECT);
      const b = await listAudit(fx.db, PROJECT);
      expect(a).toEqual(b);
    } finally {
      fx.close();
    }
  });

  it("never returns another project's rows", async () => {
    // T-05-28, asserted behaviourally as well as statically. The SQL gate's
    // unscoped-multi-row rule proves the predicate EXISTS; only this proves it
    // selects the right side of it.
    const fx = await migrated();
    try {
      await seed(fx);
      const mine = await listAudit(fx.db, PROJECT);
      expect(mine.every((r) => r.project_id === PROJECT)).toBe(true);
      expect(mine.map((r) => r.event_id)).not.toContain("evt-e");

      const theirs = await listAudit(fx.db, OTHER);
      expect(theirs.map((r) => r.event_id)).toEqual(["evt-e"]);
    } finally {
      fx.close();
    }
  });

  it("is ALWAYS bounded — the limit is never absent and a junk limit falls back", async () => {
    // A read with no limit is a read whose cost the TARGET sets. This database is
    // never garbage-collected by Caido and survives a force-reinstall, so "how
    // many rows are there" has no ceiling the plugin controls.
    const fx = await migrated();
    try {
      await seed(fx);
      expect(AUDIT_LIST_DEFAULT_LIMIT).toBeGreaterThan(0);

      expect(await listAudit(fx.db, PROJECT)).toHaveLength(4);
      expect(await listAudit(fx.db, PROJECT, 2)).toHaveLength(2);
      expect((await listAudit(fx.db, PROJECT, 2)).map((r) => r.event_id)).toEqual(
        ["evt-d", "evt-c"],
      );

      // Zero, negative and non-finite are not "unbounded" — they fall back to
      // the default, the same way `boundOrDefault` guards the retention bounds.
      expect(await listAudit(fx.db, PROJECT, 0)).toHaveLength(4);
      expect(await listAudit(fx.db, PROJECT, -1)).toHaveLength(4);
      expect(await listAudit(fx.db, PROJECT, Number.NaN)).toHaveLength(4);
    } finally {
      fx.close();
    }
  });

  it("an empty project has an empty log rather than everyone else's", async () => {
    const fx = await migrated();
    try {
      await seed(fx);
      expect(await listAudit(fx.db, "proj-nobody")).toEqual([]);
    } finally {
      fx.close();
    }
  });
});
