// packages/backend/src/store/db.ts — the memoised database handle.
//
// `sdk.meta.db()` is ONE database for the plugin across EVERY project. It lives in
// Caido Data, is never garbage-collected by Caido, is not deleted when a project
// is deleted, and survives a force-reinstall. That is why `project_id` is part of
// every primary key and every WHERE clause (STORE-02) rather than a convention.
//
// The handle is a connection POOL over worker threads (default 5 connections),
// which is why nothing in this layer may assume statement-to-connection affinity.

import type { Database } from "sqlite";

type MetaSdk = { meta: { db(): Promise<Database> } };

let handle: Promise<Database> | undefined;

/** Memoised so `init()`, the consumer and every RPC share one pool rather than
 *  opening several. Returns the same promise, not the same awaited value, so
 *  concurrent first callers cannot race two `db()` calls. */
export function getDb(sdk: MetaSdk): Promise<Database> {
  if (handle === undefined) {
    handle = sdk.meta.db();
  }
  return handle;
}

/** Drop the memoised handle. Plan 01-05 calls this on project change; nothing in
 *  Phase 1's tracer path calls it. Deliberately does not close the pool — the SDK
 *  exposes no close, and Caido owns the lifetime. */
export function resetDbHandle(): void {
  handle = undefined;
}
