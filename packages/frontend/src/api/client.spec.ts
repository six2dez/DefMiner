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

import type {
  InvalidationSummary,
  PageRequest,
  PageResponse,
  VisibleTotal,
} from "@defminer/engine/contract";
import { INVALIDATION_EVENT } from "@defminer/engine/contract";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ArtifactRow } from "../backend";

import type {
  BackendClient,
  ContractVersions,
  CountRequest,
  DefMinerBackendSdk,
  ExportChunkOutcome,
  ExportChunkRequest,
  ObservationRow,
  RpcFailure,
  RpcReason,
  RpcResult,
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

const EXPORT_REQUEST: ExportChunkRequest = {
  projectId: "p1",
  table: "observations",
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

type Listener = (summary: InvalidationSummary) => void;

type Stub = {
  /** Mutable so the factory can attach it after the object exists. NOT spread
   *  into a copy on the way out: a copy would leave the stub's own closure
   *  reading the ORIGINAL object, so `stub.behaviour = "reject"` in a test
   *  would change nothing and every failure case would silently pass. */
  sdk: DefMinerBackendSdk;
  readonly calls: string[];
  readonly listeners: Listener[];
  emit: (summary: InvalidationSummary) => void;
  backendVersion: number;
  /** When set, EVERY endpoint returns this instead of its normal answer. */
  behaviour: "resolve" | "reject" | "hang";
  rejectionMessage: string;
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
    emit: (summary) => {
      for (const listener of [...listeners]) listener(summary);
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
