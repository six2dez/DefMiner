// packages/backend/test/fixtures/sqlite-fixture.ts — an in-process SQLite handle
// whose surface matches Caido's `sqlite` module, so store code written against the
// real SDK types runs here UNCHANGED.
//
// ---------------------------------------------------------------------------
// THIS FIXTURE'S HONEST LIMIT — READ BEFORE TRUSTING A GREEN RUN
// ---------------------------------------------------------------------------
// `node:sqlite` is SINGLE-CONNECTION. It therefore CANNOT REPRODUCE THE
// POOL-AFFINITY FAILURE MODE Phase 0 measured: `sdk.meta.db()` is a connection
// POOL over worker threads (up to 5 connections by default), and a multi-statement
// `exec` that FAILS strands an open write transaction on a connection nothing in
// the plugin API can reach — every subsequent write then fails with "database is
// locked" until the plugin restarts. A single-connection fixture would either not
// reproduce that at all or, worse, fake it and teach the specs a wrong lesson.
//
// So: use this fixture for schema, migration, upsert and retention CORRECTNESS
// ONLY. Every pool-specific behaviour is LIVE-ONLY and is exercised by
// `scripts/phase1/tracer-e2e.sh` against a real Caido, not here. A spec that
// claims to prove something about connection affinity, statement reuse across
// connections, `PRAGMA` persistence or transaction stranding does not belong in
// this file's blast radius.
//
// Also unfaked, deliberately: `last_insert_rowid()` works fine under `node:sqlite`
// and is unusable on the real pool. No store module may use it, and the reason it
// is not caught here is that this fixture is too FORGIVING, not too strict — which
// is exactly why `sql-discipline.spec.ts` gates it statically instead.
//
// ---------------------------------------------------------------------------
// The `node:` prefix is CORRECT in this file and forbidden in the bundle.
// ---------------------------------------------------------------------------
// This module runs on Node under vitest and is never bundled — nothing reachable
// from `packages/backend/src/index.ts` imports it. `scripts/ci/check-bundle-imports.mjs`
// treats `node:`-prefixed specifiers as unresolvable because Caido's QuickJS probe
// loaded bare `crypto` and never `node:crypto`; that gate reads the SHIPPED
// artifact (`packages/backend/dist/index.js`), which this file cannot reach.

/* eslint-disable @typescript-eslint/require-await --
   Every adapter method below is `async` WITH NO `await` INSIDE, and that is the
   point rather than an oversight. `node:sqlite` is synchronous and THROWS;
   Caido's driver is asynchronous and REJECTS. Store code catches rejections. An
   async wrapper converts the synchronous throw into a rejection, so a spec that
   asserts "the write reported ok:false" exercises the SAME code path the plugin
   takes in production. Dropping `async` here would make every error-path spec in
   this package test a shape the real driver never produces. */

import { DatabaseSync } from "node:sqlite";

import type { Database, Parameter, Result, Statement } from "sqlite";

/** What `createFixtureDb()` hands back. `db` is the Caido-shaped handle the store
 *  modules take; `raw` is the underlying `node:sqlite` database, for the few
 *  assertions that want to bypass the adapter entirely (seeding at a pinned
 *  migration version, reading `PRAGMA table_info` key ordinals). */
export type SqliteFixture = {
  db: Database;
  raw: DatabaseSync;
  close: () => void;
};

/** Wrap one `node:sqlite` statement so it looks like Caido's `Statement`.
 *
 *  Every method is `async`, which matters for more than ergonomics: `node:sqlite`
 *  throws SYNCHRONOUSLY where the real driver REJECTS, and store code catches a
 *  rejection. An async wrapper turns the throw into a rejection, so a spec that
 *  asserts "the write reports `ok: false`" is asserting the same code path the
 *  plugin will take in production. */
function wrapStatement(raw: DatabaseSync, sql: string): Statement {
  const stmt = raw.prepare(sql);
  const wrapped = {
    all: async <T extends object = object>(
      ...params: Parameter[]
    ): Promise<T[]> => (stmt.all(...toNodeParams(params)) as T[]) ?? [],
    get: async <T extends object = object>(
      ...params: Parameter[]
    ): Promise<T | undefined> => {
      const row = stmt.get(...toNodeParams(params)) as T | undefined;
      // `node:sqlite` returns NULL-PROTOTYPE objects. Spreading gives a plain
      // object, so `toEqual` and property access behave the way a spec author
      // expects rather than the way the driver happens to allocate.
      return row === undefined ? undefined : { ...row };
    },
    run: async (...params: Parameter[]): Promise<Result> => {
      const res = stmt.run(...toNodeParams(params));
      return {
        changes: Number(res.changes),
        lastInsertRowid: Number(res.lastInsertRowid),
      };
    },
  };
  return wrapped;
}

/** `node:sqlite` accepts the same scalar set Caido's `Parameter` declares
 *  (null, number, bigint, string, Uint8Array), so this is an identity cast and
 *  not a conversion. It exists so the cast has ONE place and a comment. */
function toNodeParams(params: Parameter[]): never[] {
  return params as unknown as never[];
}

/**
 * An empty in-memory database at `user_version` 0 — no tables, no migrations run.
 *
 * Callers migrate it themselves, which is the point: `migrations.spec.ts` needs to
 * apply step v1 ALONE, seed rows, and only then run the rest of the ladder.
 */
export function createFixtureDb(): SqliteFixture {
  const raw = new DatabaseSync(":memory:");
  const db = {
    exec: async (sql: string): Promise<void> => {
      raw.exec(sql);
    },
    prepare: async (sql: string): Promise<Statement> => wrapStatement(raw, sql),
  } as unknown as Database;

  return {
    db,
    raw,
    close: () => {
      raw.close();
    },
  };
}

/** One table's column metadata, as `PRAGMA table_info` reports it.
 *
 *  `pk` is the ONE-BASED position of the column within the PRIMARY KEY, and 0 for
 *  a column that is not part of it. Reading this rather than the DDL text is what
 *  makes the STORE-02 gate structural: a CREATE TABLE whose comment claims a
 *  composite key it does not have passes a text scan and fails this. */
export type ColumnInfo = {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
};

/** Every user table in the database, sorted, excluding SQLite's own internals. */
export function listTables(raw: DatabaseSync): string[] {
  const rows = raw
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC",
    )
    .all() as { name: string }[];
  return rows.map((r) => String(r.name));
}

/** `PRAGMA table_info(<table>)` as plain objects.
 *
 *  The table name is interpolated because a PRAGMA argument CANNOT be bound — the
 *  same non-bindable position the migration ladder's `user_version` write has. It
 *  is safe for the same reason and for one more: this is test-only code whose
 *  argument comes from {@link listTables}, i.e. from `sqlite_master` itself. */
export function tableInfo(raw: DatabaseSync, table: string): ColumnInfo[] {
  const rows = raw.prepare(`PRAGMA table_info(${table})`).all();
  return rows.map((r) => ({ ...r }) as ColumnInfo);
}

/** The database's current ladder position. */
export function userVersion(raw: DatabaseSync): number {
  const row = raw.prepare("PRAGMA user_version").get() as {
    user_version: number;
  };
  return Number(row.user_version);
}
