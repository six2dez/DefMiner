// @vitest-environment jsdom
//
// Per-file, for the reason index.spec.ts states: vitest 4 removed
// `environmentMatchGlobs` and decision P2-D4 forbids a `projects` key.
//
// packages/frontend/src/api/client.spec.ts — the ONE route from a component to
// the backend, driven through a stub SDK.
//
// WHAT THESE SPECS ARE ABOUT. Not "does a wrapper forward an argument" — that
// part is one line per endpoint and the typechecker already holds it. They are
// about the four things a THIN wrapper is the only place to get right, each of
// which fails silently on this runtime (ERR-03: Caido surfaces neither a throw
// nor a rejection from plugin code):
//
//   1. A stale bundle reading a CHANGED return shape. `getContractVersion`
//      exists for exactly this and is worthless unless a mismatch SUPPRESSES
//      the reads rather than logging a warning next to them.
//   2. A rejection carrying target-controlled bytes into UI copy. The design
//      contract's rule that no sentence on this page interpolates a
//      target-controlled string applies to error text too, so the assertion
//      here is not "the reason is nice" but "the reason shares no token with
//      what the backend said".
//   3. A call that never settles. On a single-threaded backend blocked by a
//      large parse this is the NORMAL failure (research P-07), and a promise
//      that hangs forever renders as a skeleton row that never resolves.
//   4. A subscription handle that is dropped. Every mount adds a listener;
//      four project switches later one backend event fires four refreshes and
//      the reaction cap is silently multiplied (research P-04).

import { readFileSync } from "node:fs";

import type {
  DeriveSourceResult,
  InvalidationEventPayload,
  InvalidationSummary,
  PageRequest,
  PageResponse,
  RecoveredSourcePage,
  ScanProgressPayload,
  SourceMappingsResult,
  VisibleTotal,
} from "@defminer/engine/contract";
import {
  INVALIDATION_EVENT,
  RETENTION_MAX_ROWS_KEY,
  SCAN_PROGRESS_KIND,
  SOURCE_TREE_LOAD_MAX,
} from "@defminer/engine/contract";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ArtifactRow } from "../backend";
import { IN_MEMORY_WINDOW_ROWS } from "../stores/inventory";

import type {
  BackendClient,
  CompatReport,
  ContractVersions,
  CountRequest,
  DefMinerBackendSdk,
  ExportChunkOutcome,
  ExportChunkRequest,
  HealthOutcome,
  ObservationRow,
  RecoveredSourcesRequest,
  RpcFailure,
  RpcReason,
  RpcResult,
  ScanHistoryRow,
  SettingRow,
  SourceRef,
  StorageFootprint,
} from "./client";
import {
  createBackendClient,
  FRONTEND_CONTRACT_VERSION,
  RPC_ERROR_STATE_BODY,
  RPC_TIMEOUT_MS,
} from "./client";

// ---------------------------------------------------------------------------
// THE STUB SDK
// ---------------------------------------------------------------------------

/** A page response with `count` synthetic rows. Row CONTENT is irrelevant to
 *  this module — the client neither reads nor renders a field — so the rows are
 *  the cheapest thing that satisfies the type. */
function artifactPage(count: number): PageResponse<ArtifactRow> {
  const rows: ArtifactRow[] = [];
  for (let index = 0; index < count; index++) {
    rows.push({
      project_id: "p1",
      sha256: `sha-${index}`,
      byte_len: 10,
      kind: "script",
      first_seen_at: 1,
      last_seen_at: 2,
      seen_count: 1,
      scan_state: null,
    });
  }
  return { rows, nextCursor: null, scanned: count, exhausted: true };
}

const OBSERVATION_PAGE: PageResponse<ObservationRow> = {
  rows: [
    {
      project_id: "p1",
      sha256: "sha-0",
      request_id: "r-0",
      url: "https://example.test/app.js",
      status: 200,
      content_type: "application/javascript",
      observed_at: 3,
    },
  ],
  nextCursor: { sortValue: 3, tieBreak: "r-0" },
  scanned: 1,
  exhausted: false,
};

const TOTAL: VisibleTotal = {
  visible: 7,
  hiddenBySuppression: 0,
  suppressionRuleCount: 0,
};

const PAGE_REQUEST: PageRequest = {
  projectId: "p1",
  sortKey: "last_seen",
  direction: "desc",
  filter: null,
  cursor: null,
  limit: 100,
};

const COUNT_REQUEST: CountRequest = {
  projectId: "p1",
  table: "artifacts",
  filter: null,
};

/** The sighting a derivation addresses. NO request id: the backend reads which
 *  request produced this sighting out of `source_sightings`, which is what makes
 *  D-24 an integrity control rather than a question the caller already answered.
 *  `artifactSha256` names WHICH sighting is meant — the same digest
 *  `RECOVERED_REQUEST` below uses, because the drill-down that produces this ref
 *  is the one that listed that bundle — and never the digest the reload is
 *  verified against, which stays the stored one. */
const SOURCE_REF: SourceRef = {
  projectId: "p1",
  artifactSha256: "a".repeat(64),
  mapSha256: "b".repeat(64),
  sourceIndex: 0,
};

const RECOVERED_REQUEST: RecoveredSourcesRequest = {
  projectId: "p1",
  artifactSha256: "a".repeat(64),
  cursor: null,
};

const DERIVED: DeriveSourceResult = {
  outcome: "content",
  content: "export default 1;\n",
  byteLen: 18,
  lineCount: 2,
  sha256: "c".repeat(64),
};

/** A BOUNDED tree: fewer rows returned than exist, with both numbers on the
 *  answer so the copy can say so in words rather than truncating silently. */
const RECOVERED_PAGE: RecoveredSourcePage = {
  rows: [
    {
      artifactSha256: "a".repeat(64),
      mapSha256: "b".repeat(64),
      sourceIndex: 0,
      sourcesVerbatim: "webpack://app/src/index.ts",
      sourceSha256: "c".repeat(64),
      byteLen: 18,
      lineCount: 2,
      producibility: "producible",
      recoveredAt: 1_756_000_000_000,
    },
  ],
  nextCursor: { sortValue: 0, tieBreak: "b".repeat(64) },
  returned: 1,
  total: 4,
  bound: SOURCE_TREE_LOAD_MAX,
  exhausted: false,
};

/** ONE analysed artifact that yielded nothing — a RESOLVED zero — and nothing
 *  at all for one that has never been analysed. The absent key is the claim. */
const SOURCE_COUNTS: Readonly<Record<string, number>> = { ["d".repeat(64)]: 0 };

const MAPPINGS: SourceMappingsResult = {
  outcome: "mappings",
  mappings: "AAAA;AACA",
};

const EXPORT_REQUEST: ExportChunkRequest = {
  projectId: "p1",
  table: "observations",
  // NULL ON THE INVENTORY TABLES. The manifest's scope is plan 07-10's CTA.
  scopeSha256: null,
  format: "csv",
  mode: "redacted",
  filter: null,
  sortKey: "observed_at",
  direction: "desc",
  chunkIndex: 0,
  cursor: null,
  chunkRows: null,
};

const EXPORT_CHUNK: ExportChunkOutcome = {
  outcome: "chunk",
  chunk: {
    filename: "defminer-observations-redacted-20260829T000000Z.csv",
    contentType: "text/csv;charset=utf-8",
    text: '"project_id"\r\n',
    chunkIndex: 0,
    rows: 1,
    hasMore: false,
    nextCursor: null,
  },
};

const SETTING_ROWS: readonly SettingRow[] = [
  {
    key: RETENTION_MAX_ROWS_KEY,
    group: "retention",
    documented: "50000",
    project: null,
    global: null,
  },
];

const HEALTH: HealthOutcome = {
  outcome: "health",
  health: {
    queueDepth: 0,
    droppedCount: 0,
    jobsInFlight: 0,
    maxSliceMs: 0,
    sourcemap: {
      announcedInline: 0,
      announcedExternal: 0,
      mapRefusedTooLarge: 0,
      mapMalformed: 0,
      sourcesRecovered: 0,
      sightingsRecorded: 0,
    },
  },
};

/** DEPLOY-02's footprint. Three readable rows against their caps, no path and
 *  no bytes — the shape the storage surface reads. */
const FOOTPRINT: StorageFootprint = {
  artifacts: { count: 0, cap: 50_000, oldestDays: null },
  observations: { count: 0, cap: 50_000, oldestDays: null },
  analyses: { count: 0, cap: 50_000, oldestDays: null },
  observedRestartLoss: false,
};

const COMPAT: CompatReport = {
  compatible: true,
  reason: null,
  minCaido: "0.57.1",
  minSqlite: "3.24.0",
  caidoVersion: "0.58.0",
  sqliteVersion: "3.46.0",
  surfaces: [],
};

/** One scan's history row. EVERY FIELD A DEFMINER-AUTHORED INTEGER, A
 *  CLOSED-VOCABULARY CODE, OR THE OPERATOR'S OWN CLAUSE — the projection's whole
 *  claim, and what makes it safe for a surface with no target-controlled
 *  column. */
const HISTORY: readonly ScanHistoryRow[] = [
  {
    scanId: "s1",
    state: "suspended",
    suspendReason: "operator_paused",
    operatorFilter: "",
    pagesWalked: 3,
    seen: 60,
    admitted: 12,
    skippedDone: 4,
    rejected: 44,
    queued: 12,
    lastCreatedAt: 1_755_000_000_000,
    startedAt: 1_755_000_000_000,
    finishedAt: null,
  },
];

type Listener = (payload: InvalidationEventPayload) => void;

type Stub = {
  /** Mutable so the factory can attach it after the object exists. NOT spread
   *  into a copy on the way out: a copy would leave the stub's own closure
   *  reading the ORIGINAL object, so `stub.behaviour = "reject"` in a test
   *  would change nothing and every failure case would silently pass. */
  sdk: DefMinerBackendSdk;
  readonly calls: string[];
  readonly listeners: Listener[];
  emit: (payload: InvalidationEventPayload) => void;
  backendVersion: number;
  /** When set, EVERY endpoint returns this instead of its normal answer. */
  behaviour: "resolve" | "reject" | "hang";
  rejectionMessage: string;
};

/** One progress payload, as `scan/producer.ts` emits it. */
const SCAN_PROGRESS: ScanProgressPayload = {
  kind: SCAN_PROGRESS_KIND,
  projectId: "p1",
  scanId: "s1",
  state: "running",
  pagesWalked: 3,
  seen: 60,
  admitted: 12,
  skippedDone: 4,
  rejected: 44,
  queued: 12,
  analysed: null,
  lastCreatedAt: 1_723_600_000_000,
  heldAtWatermark: false,
};

function makeStub(): Stub {
  const calls: string[] = [];
  const listeners: Listener[] = [];

  const stub: Stub = {
    calls,
    listeners,
    backendVersion: FRONTEND_CONTRACT_VERSION,
    behaviour: "resolve",
    rejectionMessage: "",
    emit: (payload) => {
      for (const listener of [...listeners]) listener(payload);
    },
    // Replaced immediately below; declared here so the object is complete.
    sdk: undefined as unknown as DefMinerBackendSdk,
  };

  const answer = <T>(name: string, value: T): Promise<T> => {
    calls.push(name);
    if (stub.behaviour === "reject") {
      return Promise.reject(new Error(stub.rejectionMessage));
    }
    if (stub.behaviour === "hang") return new Promise<T>(() => undefined);
    return Promise.resolve(value);
  };

  const sdk: DefMinerBackendSdk = {
    backend: {
      getContractVersion: () =>
        answer("getContractVersion", stub.backendVersion),
      listArtifactsPage: (request) => {
        expect(request).toEqual(PAGE_REQUEST);
        return answer("listArtifactsPage", artifactPage(2));
      },
      listObservationsPage: (request) => {
        expect(request).toEqual(PAGE_REQUEST);
        return answer("listObservationsPage", OBSERVATION_PAGE);
      },
      getArtifactAnalysis: () => answer("getArtifactAnalysis", null),
      retryAnalysis: () =>
        answer("retryAnalysis", { ok: true, changed: true, state: "pending" }),
      countInventory: (request) => {
        expect(request).toEqual(COUNT_REQUEST);
        return answer("countInventory", TOTAL);
      },
      exportInventory: (request) => {
        expect(request).toEqual(EXPORT_REQUEST);
        return answer("exportInventory", EXPORT_CHUNK);
      },
      // THE PHASE 7 READS. Stubbed on the LITERAL surface for the reason this
      // file's header gives, and each answers the shape a case below asserts
      // against: the four-armed derivation, the bounded tree with its total
      // beside its returned count, the count map whose ABSENT entry means
      // unknown, and the lazy position table.
      deriveSource: (request) => {
        expect(request).toEqual(SOURCE_REF);
        return answer("deriveSource", DERIVED);
      },
      listRecoveredSources: (request) => {
        expect(request).toEqual(RECOVERED_REQUEST);
        return answer("listRecoveredSources", RECOVERED_PAGE);
      },
      countRecoveredSources: () =>
        answer("countRecoveredSources", SOURCE_COUNTS),
      readSourceMappings: (request) => {
        expect(request).toEqual(SOURCE_REF);
        return answer("readSourceMappings", MAPPINGS);
      },
      listSettings: () => answer("listSettings", SETTING_ROWS),
      writeSetting: () =>
        answer("writeSetting", { ok: true as const, stored: "1" }),
      getHealth: () => answer("getHealth", HEALTH),
      getStorageFootprint: () => answer("getStorageFootprint", FOOTPRINT),
      // The scan pair. Both are stubbed on the LITERAL surface rather than cast
      // in, for the reason this file's header gives: a stub that has to be cast
      // is a stub that stops failing when the real surface changes — which is
      // exactly what would have happened here when the contract grew.
      startScan: () =>
        answer("startScan", { outcome: "started" as const, scanId: "s1" }),
      getScanStatus: () => answer("getScanStatus", null),
      // THE THREE LIFECYCLE COMMANDS, stubbed on the same literal surface. A
      // guard that DECLINED is `ok: true, changed: false` — the shape the
      // surface must not report as a failure — so the stub answers the
      // successful, moved form and the declining form is asserted where it is
      // rendered.
      pauseScan: () =>
        answer("pauseScan", {
          ok: true,
          changed: true,
          state: "suspended" as const,
          suspendReason: "operator_paused" as const,
          reason: null,
        }),
      resumeScan: () =>
        answer("resumeScan", {
          ok: true,
          changed: true,
          state: "running" as const,
          suspendReason: null,
          reason: null,
        }),
      discardScan: () =>
        answer("discardScan", {
          ok: true,
          changed: true,
          state: "discarded" as const,
          suspendReason: null,
          reason: null,
        }),
      listScans: () => answer("listScans", HISTORY),
      getCompat: () => answer("getCompat", COMPAT),
      onEvent: (event, callback) => {
        expect(event).toBe(INVALIDATION_EVENT);
        listeners.push(callback);
        return {
          stop: () => {
            const at = listeners.indexOf(callback);
            if (at >= 0) listeners.splice(at, 1);
          },
        };
      },
    },
  };

  stub.sdk = sdk;
  return stub;
}

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------

describe("createBackendClient — the typed route to the backend", () => {
  it("forwards each endpoint and returns the typed response", async () => {
    const stub = makeStub();
    // Annotated rather than inferred: the exported type is part of what this
    // module ships, and a client that only satisfies its own inference is a
    // client no other package can hold in a variable.
    const client: BackendClient = createBackendClient(stub.sdk);

    const artifacts: RpcResult<PageResponse<ArtifactRow>> =
      await client.listArtifactsPage(PAGE_REQUEST);
    const observations = await client.listObservationsPage(PAGE_REQUEST);
    const total = await client.countInventory(COUNT_REQUEST);

    expect(artifacts).toEqual({ ok: true, value: artifactPage(2) });
    expect(observations).toEqual({ ok: true, value: OBSERVATION_PAGE });
    expect(total).toEqual({ ok: true, value: TOTAL });
    expect(stub.calls).toEqual([
      "listArtifactsPage",
      "listObservationsPage",
      "countInventory",
    ]);
  });

  it("leaves the client usable when the backend's contract version matches", async () => {
    const stub = makeStub();
    stub.backendVersion = FRONTEND_CONTRACT_VERSION;
    const client = createBackendClient(stub.sdk);

    const checked = await client.checkContractVersion();

    expect(checked).toEqual({ ok: true, value: FRONTEND_CONTRACT_VERSION });
    expect(client.contractMismatch()).toBeNull();
    await expect(client.listArtifactsPage(PAGE_REQUEST)).resolves.toEqual({
      ok: true,
      value: artifactPage(2),
    });
  });

  it("records a mismatch carrying BOTH versions, and suppresses reads afterwards", async () => {
    const stub = makeStub();
    stub.backendVersion = FRONTEND_CONTRACT_VERSION + 1;
    const client = createBackendClient(stub.sdk);
    const expected: ContractVersions = {
      frontend: FRONTEND_CONTRACT_VERSION,
      backend: FRONTEND_CONTRACT_VERSION + 1,
    };

    const checked = await client.checkContractVersion();

    expect(checked).toEqual({
      ok: false,
      reason: "contract-version-mismatch",
      versions: expected,
    });
    expect(client.contractMismatch()).toEqual(expected);

    // THE ASSERTION THIS ENDPOINT EXISTS FOR: not that a mismatch is reported,
    // but that a mismatched client STOPS READING. A warning beside a rendered
    // table is worse than no check at all — the wrong rows are on screen and
    // they look right.
    const page = await client.listArtifactsPage(PAGE_REQUEST);
    const count = await client.countInventory(COUNT_REQUEST);

    expect(page).toEqual({
      ok: false,
      reason: "contract-version-mismatch",
      versions: expected,
    });
    expect(count.ok).toBe(false);
    expect(stub.calls).toEqual(["getContractVersion"]);
  });

  it("returns a DefMiner-authored reason and NO token of the rejection", async () => {
    const stub = makeStub();
    stub.behaviour = "reject";
    stub.rejectionMessage =
      "ECONNREFUSED while fetching https://target.example/bundle.js?token=abc123";
    const client = createBackendClient(stub.sdk);

    const page = await client.listArtifactsPage(PAGE_REQUEST);

    const expected: RpcFailure = {
      ok: false,
      reason: "rpc-rejected",
      versions: null,
    };
    expect(page).toEqual(expected);

    // The general form, not a hand-picked substring: EVERY token of five
    // characters or more from what the backend said must be absent from what
    // crosses back. A rejection can quote a target-controlled URL, and
    // 05-UI-SPEC.md's copywriting rule outranks every row of its own table —
    // no sentence on this page interpolates a target-controlled string.
    const serialised = JSON.stringify(page);
    const tokens = stub.rejectionMessage
      .split(/[\s/?=]+/)
      .filter((token) => token.length >= 5);
    expect(tokens.length).toBeGreaterThan(3);
    for (const token of tokens) {
      expect(
        serialised,
        `leaked \`${token}\` from the rejection`,
      ).not.toContain(token);
    }
  });

  it("times out a call that never settles, distinguishably from a rejection", async () => {
    vi.useFakeTimers();
    const stub = makeStub();
    stub.behaviour = "hang";
    const client = createBackendClient(stub.sdk);

    const pending = client.listArtifactsPage(PAGE_REQUEST);
    await vi.advanceTimersByTimeAsync(RPC_TIMEOUT_MS);

    await expect(pending).resolves.toEqual({
      ok: false,
      reason: "rpc-timeout",
      versions: null,
    });
  });

  it("does not time out a call that settles inside the window", async () => {
    vi.useFakeTimers();
    const stub = makeStub();
    const client = createBackendClient(stub.sdk);

    const pending = client.countInventory(COUNT_REQUEST);
    await vi.advanceTimersByTimeAsync(RPC_TIMEOUT_MS - 1);

    await expect(pending).resolves.toEqual({ ok: true, value: TOTAL });
  });

  it("answers only from the closed, DefMiner-authored reason vocabulary", async () => {
    // The claim on `RpcReason` is that it is CLOSED — three members and no
    // `"unknown"`. A reason outside this list is a reason the UI has no copy
    // row for, which renders as a blank error state rather than as anything an
    // operator can act on.
    const vocabulary: readonly RpcReason[] = [
      "rpc-rejected",
      "rpc-timeout",
      "contract-version-mismatch",
    ];

    const rejecting = makeStub();
    rejecting.behaviour = "reject";
    rejecting.rejectionMessage = "anything at all";
    const mismatched = makeStub();
    mismatched.backendVersion = FRONTEND_CONTRACT_VERSION + 9;
    const mismatchedClient = createBackendClient(mismatched.sdk);
    await mismatchedClient.checkContractVersion();

    const observed: RpcResult<VisibleTotal>[] = [
      await createBackendClient(rejecting.sdk).countInventory(COUNT_REQUEST),
      await mismatchedClient.countInventory(COUNT_REQUEST),
    ];

    for (const result of observed) {
      expect(result.ok).toBe(false);
      if (result.ok === false) expect(vocabulary).toContain(result.reason);
    }
  });

  it("states the timeout in the error copy from ONE constant", () => {
    // The copy and the behaviour agree because they read the same number.
    // 05-UI-SPEC.md's error state says "did not answer within 10 seconds"; a
    // second literal here is how the copy comes to promise ten while the client
    // waits thirty.
    expect(RPC_ERROR_STATE_BODY).toContain(`${RPC_TIMEOUT_MS / 1000} seconds`);
    expect(RPC_ERROR_STATE_BODY).toContain("Could not load secrets");
  });
});

describe("subscribeInvalidation — the handle is returned, not swallowed", () => {
  it("delivers summaries to the handler under the contract's event name", () => {
    const stub = makeStub();
    const client = createBackendClient(stub.sdk);
    const seen: InvalidationSummary[] = [];

    client.subscribeInvalidation((summary) => seen.push(summary));
    const summary: InvalidationSummary = {
      projectId: "p1",
      category: "artifacts",
      changedCount: 3,
      newestId: "sha-1",
    };
    stub.emit(summary);

    expect(seen).toEqual([summary]);
  });

  it("stops the listener — an event emitted after stop() invokes NO handler", () => {
    const stub = makeStub();
    const client = createBackendClient(stub.sdk);
    const seen: InvalidationSummary[] = [];

    const handle = client.subscribeInvalidation((summary) =>
      seen.push(summary),
    );
    handle.stop();
    stub.emit({
      projectId: "p1",
      category: "observations",
      changedCount: 1,
      newestId: "r-9",
    });

    expect(seen).toEqual([]);
    expect(stub.listeners).toEqual([]);
  });

  // =========================================================================
  // ONE SUBSCRIPTION, TWO DESTINATIONS (FIND-04, D-15)
  // =========================================================================
  //
  // The event carries two payload variants and the discrimination happens HERE,
  // at the single subscription site, before either handler is called. That is
  // what leaves both of the coalescer's triage-lock early returns literally
  // unmodified: a progress payload never reaches `onSummary`, so there is
  // nothing to exempt it from.

  it("routes a progress payload to the progress handler and NEVER to the summary one", () => {
    const stub = makeStub();
    const client = createBackendClient(stub.sdk);
    const summaries: InvalidationSummary[] = [];
    const progress: ScanProgressPayload[] = [];

    client.subscribeInvalidation(
      (s) => summaries.push(s),
      (p) => progress.push(p),
    );
    stub.emit(SCAN_PROGRESS);

    expect(progress).toEqual([SCAN_PROGRESS]);
    expect(
      summaries,
      "a progress payload reached the coalescer's summary handler. It would be " +
        "counted into `pending`, held behind the triage lock, and rendered as a " +
        "row count that changed — none of which describes a scan.",
    ).toEqual([]);
  });

  it("routes an invalidation summary to the summary handler and NEVER to the progress one", () => {
    const stub = makeStub();
    const client = createBackendClient(stub.sdk);
    const summaries: InvalidationSummary[] = [];
    const progress: ScanProgressPayload[] = [];
    const summary: InvalidationSummary = {
      projectId: "p1",
      category: "analyses",
      changedCount: 2,
      newestId: "sha-7",
    };

    client.subscribeInvalidation(
      (s) => summaries.push(s),
      (p) => progress.push(p),
    );
    stub.emit(summary);

    expect(summaries).toEqual([summary]);
    expect(progress).toEqual([]);
  });

  it("subscribes ONCE for both variants — one channel, as D-15 requires", () => {
    const stub = makeStub();
    const client = createBackendClient(stub.sdk);

    client.subscribeInvalidation(
      () => undefined,
      () => undefined,
    );

    expect(stub.listeners).toHaveLength(1);
  });

  it("DROPS a progress payload when no progress handler was given", () => {
    // The state until a surface renders the readout. Dropping it at the client
    // is deliberate and is the safe half: what must never happen is a progress
    // payload arriving at the coalescer, and that is what this asserts.
    const stub = makeStub();
    const client = createBackendClient(stub.sdk);
    const summaries: InvalidationSummary[] = [];

    client.subscribeInvalidation((s) => summaries.push(s));
    stub.emit(SCAN_PROGRESS);

    expect(summaries).toEqual([]);
  });
});

describe("exportInventory — the export crosses as a VALUE, and a stale bundle may not take one", () => {
  it("forwards the request and answers the typed chunk outcome", async () => {
    const stub = makeStub();
    const client = createBackendClient(stub.sdk);

    const result = await client.exportInventory(EXPORT_REQUEST);
    expect(result).toEqual({ ok: true, value: EXPORT_CHUNK });
    expect(stub.calls).toContain("exportInventory");
  });

  it("is GUARDED by the contract mismatch — an export is the last thing a stale bundle should take", async () => {
    // It is a READ of every row the operator can reach and it lands on their
    // disk. A bundle that is already known to be misreading the return shape
    // must not produce a file somebody will later trust.
    const stub = makeStub();
    stub.backendVersion = FRONTEND_CONTRACT_VERSION + 1;
    const client = createBackendClient(stub.sdk);
    await client.checkContractVersion();

    const before = stub.calls.length;
    const result = await client.exportInventory(EXPORT_REQUEST);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("contract-version-mismatch");
    expect(stub.calls.length, "the endpoint was called anyway").toBe(before);
  });

  it("answers a VALUE and never a rejection when the backend rejects", async () => {
    const stub = makeStub();
    stub.behaviour = "reject";
    stub.rejectionMessage = "failed reading https://victim.example/app.js";
    const client = createBackendClient(stub.sdk);

    const result = await client.exportInventory(EXPORT_REQUEST);
    expect(result).toEqual({
      ok: false,
      reason: "rpc-rejected",
      versions: null,
    });
    // The rejection's text is discarded WITHOUT INSPECTION. The reason is a
    // DefMiner-authored code and shares no token with what the backend said.
    expect(JSON.stringify(result)).not.toContain("victim.example");
  });
});

// ---------------------------------------------------------------------------
// THE PHASE 7 SURFACE, AND THE TWO AGREEMENTS THAT KEEP IT HONEST
// ---------------------------------------------------------------------------
//
// These two packages cannot import each other, so every shared shape here is a
// MIRROR — and a mirror nobody checks is a mirror that drifts. The two cases
// below read the backend's own source text off disk and compare, which is the
// `contract.spec.ts` idiom applied across a package boundary: the claim is about
// two files, so it is asserted against both rather than trusted in one.

/**
 * The backend contract, as text.
 *
 * READ RATHER THAN IMPORTED: `@defminer/backend` is not a dependency of this
 * package and must not become one — the whole reason these shapes are mirrors is
 * that the two packages cannot import each other.
 *
 * A REPOSITORY-RELATIVE PATH, in `frontend-safety.spec.ts`'s idiom, and NOT one
 * derived from `import.meta.url`. This file runs under the jsdom environment,
 * where `import.meta.url` is an `http:` URL and `fileURLToPath` throws — a
 * failure mode worth naming here, because the fix looks like a style preference
 * and is not.
 */
function backendSpecSource(): string {
  return readFileSync("packages/backend/src/api/spec.ts", "utf8");
}

/**
 * Backend endpoint names this client deliberately does NOT expose.
 *
 * NAMED RATHER THAN LEFT AS A GAP. `getStatus` is the raw telemetry projection
 * and no surface in this bundle reads it; `getArtifacts` and `getObservations`
 * are the pre-Phase-5 unpaginated reads kept only because the compatibility
 * smoke test drives them. An omission that is listed is a decision; an omission
 * that is merely absent is the thing this assertion exists to catch.
 */
const NOT_EXPOSED_TO_THE_FRONTEND: readonly string[] = [
  "getStatus",
  "getArtifacts",
  "getObservations",
];

describe("the frontend surface agrees with the backend contract", () => {
  it("reads the SAME contract version the backend declares", () => {
    // THE ONE CHECK THAT PREVENTS A STALE BUNDLE FROM MISREADING A CHANGED
    // SHAPE IS WORTHLESS IF THE TWO NUMBERS DRIFT WITHOUT ANYBODY NOTICING.
    // They are two independently shipped constants — that is what makes the
    // runtime check able to fail at all — so this asserts they were moved
    // TOGETHER, which is the only thing a build can check about them.
    const declared = /export const CONTRACT_VERSION = (\d+);/.exec(
      backendSpecSource(),
    );
    expect(declared, "CONTRACT_VERSION not found in the backend spec").not.toBe(
      null,
    );
    expect(Number(declared?.[1])).toBe(FRONTEND_CONTRACT_VERSION);
  });

  it("calls no endpoint the backend does not declare, and the check is non-vacuous", () => {
    // A FRONTEND METHOD NAMING AN ENDPOINT THAT DOES NOT EXIST FAILS SILENTLY
    // on this runtime — Caido surfaces neither a throw nor a rejection from
    // plugin code — so the typed surface is the only place it can be caught.
    const spec = backendSpecSource();
    const stub = makeStub();
    const names = Object.keys(stub.sdk.backend).filter(
      (name) => name !== "onEvent",
    );
    expect(names.length, "the stub surface is empty").toBeGreaterThan(15);
    for (const name of names) {
      expect(
        new RegExp(`^\\s{4}${name}:`, "m").test(spec),
        `${name} is not declared on the backend contract`,
      ).toBe(true);
    }
    // AND THE OTHER DIRECTION, as a listed decision rather than a gap: every
    // backend name is either exposed here or named above as deliberately not.
    for (const omitted of NOT_EXPOSED_TO_THE_FRONTEND) {
      expect(names).not.toContain(omitted);
      expect(new RegExp(`^\\s{4}${omitted}:`, "m").test(spec)).toBe(true);
    }
    // The four names this plan added, asserted by name so the surface cannot
    // lose one to a refactor and still pass the shape check above.
    expect(names).toEqual(
      expect.arrayContaining([
        "deriveSource",
        "listRecoveredSources",
        "countRecoveredSources",
        "readSourceMappings",
      ]),
    );
  });

  it("bounds the source tree at the SAME number the inventory window uses", () => {
    // U7-1: "the shipped in-memory window number, reused rather than invented".
    // The backend enforces the bound and cannot import this package, so the
    // constant lives on the engine contract; this is what stops the two from
    // becoming two numbers that merely happen to agree today.
    expect(SOURCE_TREE_LOAD_MAX).toBe(IN_MEMORY_WINDOW_ROWS);
  });
});

describe("the recovered-source reads — four arms, a bounded tree, and a lazy table", () => {
  it("forwards each of the four and returns the typed answer", async () => {
    const stub = makeStub();
    const client: BackendClient = createBackendClient(stub.sdk);

    expect(await client.deriveSource(SOURCE_REF)).toEqual({
      ok: true,
      value: DERIVED,
    });
    expect(await client.listRecoveredSources(RECOVERED_REQUEST)).toEqual({
      ok: true,
      value: RECOVERED_PAGE,
    });
    expect(await client.countRecoveredSources()).toEqual({
      ok: true,
      value: SOURCE_COUNTS,
    });
    expect(await client.readSourceMappings(SOURCE_REF)).toEqual({
      ok: true,
      value: MAPPINGS,
    });
    expect(stub.calls).toEqual([
      "deriveSource",
      "listRecoveredSources",
      "countRecoveredSources",
      "readSourceMappings",
    ]);
  });

  it("a rejected derivation is an RpcFailure and NEVER a tombstone", async () => {
    // THE RULE THAT OUTRANKS EVERYTHING ELSE ON THIS SURFACE. `RpcResult`
    // answers "did the backend answer" and the arm answers "what did it find";
    // a client that turned a rejection into a `gone` value would be making the
    // permanent claim from an absence of evidence that 07-UI-SPEC.md's most
    // emphatic sentence forbids. The assertion is that no producibility word
    // and no arm tag appears anywhere in the failure.
    const stub = makeStub();
    stub.behaviour = "reject";
    stub.rejectionMessage = "sqlite: no such table: source_sightings";
    const client = createBackendClient(stub.sdk);

    const failure = (await client.deriveSource(SOURCE_REF)) as RpcFailure;
    expect(failure.ok).toBe(false);
    expect(failure.reason).toBe("rpc-rejected");
    // And nothing the backend said crossed into it.
    expect(JSON.stringify(failure)).not.toContain("source_sightings");
    expect(JSON.stringify(failure)).not.toContain("gone");
    expect(JSON.stringify(failure)).not.toContain("outcome");
  });

  it("a timed-out position read degrades to a failure, not to a missing table", async () => {
    vi.useFakeTimers();
    const stub = makeStub();
    stub.behaviour = "hang";
    const client = createBackendClient(stub.sdk);

    const pending = client.readSourceMappings(SOURCE_REF);
    await vi.advanceTimersByTimeAsync(RPC_TIMEOUT_MS + 1);
    const failure = (await pending) as RpcFailure;
    expect(failure.reason).toBe("rpc-timeout");
    expect(failure.versions).toBeNull();
  });

  it("a contract mismatch SUPPRESSES all four rather than reading through it", async () => {
    // A bundle known to be misreading the contract must not derive content,
    // must not paint a tombstone, and must not put a count against the wrong
    // column. The guard answers BEFORE the endpoint is called, which is what
    // makes the check a stop rather than a warning beside a read.
    const stub = makeStub();
    stub.backendVersion = FRONTEND_CONTRACT_VERSION + 1;
    const client = createBackendClient(stub.sdk);
    await client.checkContractVersion();
    const before = stub.calls.length;

    for (const result of [
      await client.deriveSource(SOURCE_REF),
      await client.listRecoveredSources(RECOVERED_REQUEST),
      await client.countRecoveredSources(),
      await client.readSourceMappings(SOURCE_REF),
    ]) {
      expect(result.ok).toBe(false);
      expect((result as RpcFailure).reason).toBe("contract-version-mismatch");
    }
    expect(
      stub.calls.length,
      "a suppressed read reached the backend anyway",
    ).toBe(before);
  });

  it("keeps the bounded tree's two numbers as two FIELDS, not one comparison", async () => {
    // The sentence the operator reads — "Showing the first {bound} of {total}"
    // — needs both, and a frontend that derived one from the other would be
    // deriving a claim about the database from a fact about its own memory.
    const stub = makeStub();
    const client = createBackendClient(stub.sdk);
    const page = await client.listRecoveredSources(RECOVERED_REQUEST);
    expect(page.ok).toBe(true);
    if (!page.ok) return;
    expect(page.value.returned).toBe(1);
    expect(page.value.total).toBe(4);
    expect(page.value.bound).toBe(SOURCE_TREE_LOAD_MAX);
    expect(page.value.exhausted).toBe(false);
    // NO CONTENT ON ANY ROW. The whole reason the eager load is affordable.
    for (const row of page.value.rows) expect("content" in row).toBe(false);
  });

  it("carries the count map's ZERO-versus-UNKNOWN distinction across the boundary", async () => {
    // An ENTRY with value 0 is a resolved zero; NO ENTRY is unknown. A `Map`
    // would have serialised to `{}` and turned every count into unknown, which
    // is why the contract carries a plain object.
    const stub = makeStub();
    const client = createBackendClient(stub.sdk);
    const counts = await client.countRecoveredSources();
    expect(counts.ok).toBe(true);
    if (!counts.ok) return;
    const analysed = "d".repeat(64);
    const never = "e".repeat(64);
    expect(counts.value[analysed]).toBe(0);
    expect(Object.prototype.hasOwnProperty.call(counts.value, analysed)).toBe(
      true,
    );
    expect(Object.prototype.hasOwnProperty.call(counts.value, never)).toBe(
      false,
    );
    expect(counts.value[never]).toBeUndefined();
  });
});
