// packages/backend/test/fixtures/fake-sdk.ts — a fake Caido SDK, so backend
// logic is unit-testable with no Caido present.
//
// ---------------------------------------------------------------------------
// WHY THIS FILE EXISTS AT ALL
// ---------------------------------------------------------------------------
// `packages/engine` is SDK-free by construction (DET-03) and therefore trivially
// testable. `packages/backend` is the opposite: it is the ONLY package permitted
// to touch the SDK, so without a fake there is no way to assert the admission
// gate, the hook wiring or the consumer loop except by starting a real Caido —
// which takes seconds per case and cannot drive the branches that matter (a
// reload resolving `undefined`, a 304 with no content-type, a body at exactly the
// size ceiling).
//
// ---------------------------------------------------------------------------
// WHAT IT DELIBERATELY DOES *NOT* FAKE
// ---------------------------------------------------------------------------
// Every measured runtime behaviour that a fake would have to INVENT stays
// live-only:
//   - that Caido QUEUES intercept events rather than dropping them
//     (EVENT_OVERFLOW_BEHAVIOUR, SPIKE-03);
//   - that a throw or a rejection inside a handler is surfaced NOWHERE
//     (HANDLER_ERROR_SURFACED = "neither");
//   - that `sdk.meta.db()` is a connection POOL over worker threads.
// A fake that reproduced any of those would be teaching the specs a lesson
// nobody measured. `scripts/phase1/tracer-e2e.sh` is where those live.
//
// What IS faked is only the SHAPE of the objects: the method names, their
// arities and their return types, taken from
// @caido/quickjs-types@0.26.0/src/caido/requests.d.ts — `Body` (toText / toRaw /
// readonly length), `Response` (getCode / getHeaders / getBody), `Request`
// (getId / getUrl) and `RequestsSDK.inScope`, which is SYNCHRONOUS and returns a
// boolean.
//
// The `node:`-prefix note from sqlite-fixture.ts applies here too: this module
// runs under vitest and is never reachable from `packages/backend/src/index.ts`,
// so it never enters the shipped bundle.

import type { Database } from "sqlite";

// --- bodies -----------------------------------------------------------------

/** The `Body` surface the hook and the consumer actually use. */
export type FakeBody = {
  toText(): string;
  toRaw(): Uint8Array;
  readonly length: number;
};

function utf8(input: Uint8Array | string): Uint8Array {
  return typeof input === "string"
    ? new Uint8Array(Buffer.from(input, "utf8"))
    : input;
}

/**
 * A body backed by real bytes. `length` equals `toRaw().length`, which is what
 * BODY_LENGTH_EQUALS_RAW_LENGTH measured across 24 proxied round trips — the
 * fake must not be more forgiving than the runtime on the one relationship the
 * size gate depends on.
 */
export function makeFakeBody(input: Uint8Array | string): FakeBody {
  const raw = utf8(input);
  return {
    toText: () => Buffer.from(raw).toString("utf8"),
    toRaw: () => raw,
    get length() {
      return raw.length;
    },
  };
}

/**
 * A body that DECLARES a length without allocating one.
 *
 * The admission gate reads `body.length` and nothing else — `toRaw()` and
 * `toText()` are forbidden inside the hook because materialising megabytes there
 * happens on the one thread that also serves every RPC and every timer. So the
 * size axis can be driven at PASSIVE_MAX_BYTES (8 MiB) and at one byte above it
 * without two 8 MiB allocations per case.
 *
 * `toRaw()` and `toText()` THROW here, and that is the point rather than a
 * limitation: a gate that starts decoding will fail loudly in the spec that
 * covers it instead of merely getting slower.
 */
export function makeDeclaredLengthBody(length: number): FakeBody {
  const boom = (): never => {
    throw new Error(
      `makeDeclaredLengthBody(${length}) has no bytes: something called toRaw()/toText() ` +
        `on a body whose length was only DECLARED. The admission gate must read ` +
        `body.length and never decode (T-01-14).`,
    );
  };
  return {
    toText: boom,
    toRaw: boom,
    get length() {
      return length;
    },
  };
}

// --- requests and responses -------------------------------------------------

export type FakeRequest = {
  getId(): string;
  getUrl(): string;
  getMethod(): string;
  getHost(): string;
};

export type FakeRequestInit = {
  id?: string;
  url?: string;
  method?: string;
  host?: string;
};

export function makeFakeRequest(init: FakeRequestInit = {}): FakeRequest {
  const id = init.id ?? "1";
  const url = init.url ?? "https://example.test/app.js";
  const method = init.method ?? "GET";
  const host = init.host ?? "example.test";
  return {
    getId: () => id,
    getUrl: () => url,
    getMethod: () => method,
    getHost: () => host,
  };
}

/**
 * Headers as the fixture accepts them.
 *
 * The SDK TYPES headers as `Record<string, Array<string>>`, but the production
 * recorder found BOTH shapes in the field against real traffic — hence
 * `string | string[]`, and hence `getHeaders()` returning `Record<string, unknown>`
 * rather than the declared type. A fixture that only produced the declared shape
 * could not express the case the header resolver exists to handle.
 */
export type FakeHeaders = Record<string, string | string[]>;

export type FakeResponse = {
  getId(): string;
  getCode(): number;
  getHeaders(): Record<string, unknown>;
  getBody(): FakeBody | undefined;
};

export type FakeResponseInit = {
  id?: string;
  code?: number;
  headers?: FakeHeaders;
  /** Real bytes. A string is encoded UTF-8. */
  bodyBytes?: Uint8Array | string;
  /** A length with no bytes behind it — see {@link makeDeclaredLengthBody}. */
  bodyLength?: number;
  /** `getBody()` returns `undefined`. Distinct from a zero-length body. */
  noBody?: boolean;
};

export function makeFakeResponse(init: FakeResponseInit = {}): FakeResponse {
  const id = init.id ?? "1";
  const code = init.code ?? 200;
  const headers: Record<string, unknown> = init.headers ?? {
    "content-type": ["application/javascript"],
  };
  let body: FakeBody | undefined;
  if (init.noBody === true) {
    body = undefined;
  } else if (init.bodyLength !== undefined) {
    body = makeDeclaredLengthBody(init.bodyLength);
  } else {
    body = makeFakeBody(init.bodyBytes ?? "console.log(1);\n");
  }
  return {
    getId: () => id,
    getCode: () => code,
    getHeaders: () => headers,
    getBody: () => body,
  };
}

/**
 * A 304 exactly as Caido delivers one.
 *
 * STATUS_304_REACHES_HOOK recorded the delivered headers: etag, last-modified,
 * cache-control and `content-length: 0` — and NO content-type at all, with
 * `Body.length` and `toRaw().length` both 0. Built here rather than in each spec
 * so no case can accidentally give a 304 a content-type it never has.
 */
export function makeFake304(init: { id?: string } = {}): FakeResponse {
  return makeFakeResponse({
    id: init.id,
    code: 304,
    headers: {
      etag: ['W/"abc123"'],
      "last-modified": ["Sun, 26 May 2024 10:59:21 GMT"],
      "cache-control": ["max-age=0"],
      "content-length": ["0"],
    },
    bodyBytes: new Uint8Array(0),
  });
}

// --- the retroactive scan's page reads --------------------------------------

/**
 * One item of a `RequestsConnection`, as `RequestsQuery.execute()` resolves it.
 *
 * Structurally identical to `scan/producer.ts`'s `ScanPageItem`, and declared
 * here rather than imported from it for the reason this whole file exists: a
 * fixture that imported the type it is faking would stop failing when the real
 * surface changed shape underneath both of them. The FIELD NAMES and arities
 * are taken from `@caido/quickjs-types@0.26.0/src/caido/requests.d.ts`, exactly
 * as the request and response fakes above are.
 *
 * `response` is OPTIONAL because the SDK declares it optional. A stored request
 * with no response is a real shape and it is not an error.
 */
export type FakeScanItem = {
  readonly cursor: string;
  readonly request: FakeRequest & { getCreatedAt(): Date };
  readonly response?: FakeResponse | undefined;
};

/** A capture date, so a fixture item's position is a fact rather than the
 *  clock. 14 Aug 2024, in ms. */
const FAKE_CAPTURED_AT = 1_723_600_000_000;

export function makeFakeScanItem(
  init: FakeRequestInit & {
    cursor?: string;
    createdAt?: number;
    code?: number;
    noResponse?: boolean;
  } = {},
): FakeScanItem {
  const request = makeFakeRequest(init);
  const createdAt = init.createdAt ?? FAKE_CAPTURED_AT;
  return {
    cursor: init.cursor ?? `cursor-${request.getId()}`,
    request: { ...request, getCreatedAt: () => new Date(createdAt) },
    response:
      init.noResponse === true
        ? undefined
        : makeFakeResponse({ id: request.getId(), code: init.code ?? 200 }),
  };
}

/**
 * The slice of `RequestsQuery` the retroactive walk uses.
 *
 * EVERY METHOD RETURNS THE QUERY, exactly as the SDK declares — the builder is
 * chained, not applied. A fake that returned a fresh object from each call
 * would let a LOST `.filter()` pass unnoticed, which is the one mistake that
 * would turn a narrowed scan into a pull of every stored body in history.
 */
export type FakeScanQuery = {
  filter(filter: string): FakeScanQuery;
  descending(target: "req", field: "id"): FakeScanQuery;
  first(n: number): FakeScanQuery;
  execute(): Promise<{
    readonly pageInfo: { readonly hasNextPage: boolean };
    readonly items: readonly FakeScanItem[];
  }>;
};

// --- projects ---------------------------------------------------------------

/**
 * A `Project` as `caido:utils` declares one.
 *
 * `getStatus()` returns the three-member union `ready | restoring | error`, and
 * it is here rather than omitted because the SDK declares it: a fixture that
 * only produced the fields today's code reads would silently stop matching the
 * type the moment somebody read one more.
 */
export type FakeProject = {
  getId(): string;
  getName(): string;
  getPath(): string;
  getVersion(): string;
  getStatus(): "ready" | "restoring" | "error";
};

export function makeFakeProject(
  id: string,
  init: { name?: string; status?: "ready" | "restoring" | "error" } = {},
): FakeProject {
  return {
    getId: () => id,
    getName: () => init.name ?? id,
    getPath: () => "/tmp/fake-projects/" + id,
    getVersion: () => "1.0.0",
    getStatus: () => init.status ?? "ready",
  };
}

/**
 * Drive every registered `onProjectChange` callback.
 *
 * `null` is a FIRST-CLASS argument here, not an edge case a caller has to
 * contrive: the SDK's own doc comment says the project can be null because the
 * user deleted the currently selected one, and that branch has never run against
 * a real Caido in this repo. Awaits each callback, because the SDK types the
 * return as `MaybePromise<void>`.
 */
export async function emitProjectChange(
  sdk: FakeSdk,
  project: FakeProject | null,
): Promise<void> {
  for (const fn of sdk.calls.projectChangeHandlers) {
    await fn(sdk, project);
  }
}

// --- the sdk ----------------------------------------------------------------

/** Everything the fake recorded, so a spec can assert what was INVOKED and not
 *  only what was returned. */
export type FakeSdkCalls = {
  consoleLog: string[];
  requestsGet: string[];
  inScope: unknown[];
  /** Every `sdk.requests.query()` the code under test built, recorded as the
   *  composed filter string it was given — or `null` if it never called
   *  `.filter()`. THE FILTER IS THE WHOLE SECURITY QUESTION on this path: D-05
   *  promises the operator may narrow a scan and never widen it, and the only
   *  place that promise becomes a fact is the string handed to Caido. */
  scanFilters: (string | null)[];
  apiRegister: string[];
  /** Every `sdk.api.send(...)` the code under test made, recorded as the event
   *  name and the arguments EXACTLY as they were handed over.
   *
   *  Recorded rather than swallowed because the invalidation event's whole
   *  security property is negative — that the payload carries four scalars and
   *  NOTHING else (UI-07, T-05-35) — and a negative property can only be asserted
   *  against the object that actually crossed the boundary. Caido surfaces
   *  nothing from plugin code, so an event that quietly grew a `rows` field would
   *  otherwise be invisible until it reached a frontend. */
  apiSend: { event: string; args: unknown[] }[];
  interceptResponseHandlers: Array<(...args: unknown[]) => unknown>;
  /** Every `onProjectChange` callback the code under test registered. Recorded
   *  rather than swallowed so {@link emitProjectChange} can DRIVE the event —
   *  no probe in this repo has ever registered one, so there is no live
   *  observation of it to fall back on. */
  projectChangeHandlers: Array<
    (sdk: unknown, project: FakeProject | null) => unknown
  >;
  projectsGetCurrent: number;
  metaDb: number;
};

export type FakeSdk = {
  runtime: { version: string | null };
  projects: { getCurrent(): Promise<unknown> };
  requests: {
    get(id: string): Promise<unknown>;
    inScope(request: unknown): boolean;
    query(): FakeScanQuery;
  };
  meta: { db(): Promise<Database> };
  console: { log(msg: string): void };
  api: {
    register(name: string, fn: unknown): void;
    send(event: string, ...args: unknown[]): void;
  };
  events: {
    onInterceptResponse(fn: (...args: unknown[]) => unknown): void;
    onProjectChange(
      fn: (sdk: unknown, project: FakeProject | null) => unknown,
    ): void;
  };
  calls: FakeSdkCalls;
};

export type FakeSdkOverrides = {
  /** `sdk.runtime.version`. `null` models the field being absent, which
   *  compat.ts reads through an optional chain. */
  version?: string | null;
  /** Shorthand: `projects.getCurrent()` resolves to a project with this id.
   *  `null` resolves to `undefined` — no project selected. */
  projectId?: string | null;
  getCurrent?: () => Promise<unknown>;
  get?: (id: string) => Promise<unknown>;
  inScope?: (request: unknown) => boolean;
  /** The pages `requests.query().execute()` answers, in order. THE DEFAULT IS
   *  ONE EMPTY PAGE, which is a complete and correct answer — a filter that
   *  matches nothing is what finishing looks like — and it is what keeps every
   *  case that is not about the scan from accidentally driving a walk. */
  scanPages?: FakeScanItem[][];
  /** What `pageInfo.hasNextPage` says on the LAST page of {@link scanPages}.
   *  `false` by default: the sequence ends where it ends. */
  scanHasNextPageAfterLast?: boolean;
  db?: () => Promise<unknown>;
  log?: (msg: string) => void;
  register?: (name: string, fn: unknown) => void;
  send?: (event: string, ...args: unknown[]) => void;
};

/**
 * A fake SDK whose every method is individually overridable and individually
 * recorded.
 *
 * Defaults are the BORING case — version 0.57.1 (the measured build), a selected
 * project, everything in scope, `requests.get` resolving `undefined`. A spec
 * overrides exactly the one method its case is about, so what a case is testing
 * is visible in the override list rather than buried in a builder.
 */
/** The `undefined` the default `meta.db()` resolves, widened once so the
 *  assertion at its single use site has something to assert from. */
const absentDatabase: unknown = undefined;

export function makeFakeSdk(overrides: FakeSdkOverrides = {}): FakeSdk {
  const calls: FakeSdkCalls = {
    consoleLog: [],
    requestsGet: [],
    inScope: [],
    scanFilters: [],
    apiRegister: [],
    apiSend: [],
    interceptResponseHandlers: [],
    projectChangeHandlers: [],
    projectsGetCurrent: 0,
    metaDb: 0,
  };

  const projectId =
    overrides.projectId === undefined ? "p1" : overrides.projectId;

  const sdk: FakeSdk = {
    runtime: {
      version: overrides.version === undefined ? "0.57.1" : overrides.version,
    },
    projects: {
      getCurrent: async () => {
        calls.projectsGetCurrent += 1;
        if (overrides.getCurrent !== undefined) return overrides.getCurrent();
        if (projectId === null) return null;
        return makeFakeProject(projectId);
      },
    },
    requests: {
      get: async (id: string) => {
        calls.requestsGet.push(id);
        if (overrides.get !== undefined) return overrides.get(id);
        return undefined;
      },
      // SYNCHRONOUS and returns a boolean, exactly as the SDK declares it. An
      // async fake here would let a spec pass while the real hook awaited a
      // Promise object, which is always truthy.
      inScope: (request: unknown) => {
        calls.inScope.push(request);
        return overrides.inScope === undefined
          ? true
          : overrides.inScope(request);
      },
      // ONE BUILDER PER `query()` CALL, and it records the filter it was given.
      // `executes` is not a separate counter here: the number of pages consumed
      // is `calls.scanFilters.length` minus the builders that were never
      // executed, and a spec that cares asserts the filters themselves — which
      // is the stronger claim.
      query: (): FakeScanQuery => {
        const at = calls.scanFilters.length;
        calls.scanFilters.push(null);
        const query: FakeScanQuery = {
          filter(f: string) {
            calls.scanFilters[at] = f;
            return query;
          },
          descending() {
            return query;
          },
          first() {
            return query;
          },
          execute: () => {
            const pages = overrides.scanPages ?? [[]];
            const index = at;
            const page = pages[index] ?? [];
            const isLast = index >= pages.length - 1;
            return Promise.resolve({
              pageInfo: {
                hasNextPage: isLast
                  ? (overrides.scanHasNextPageAfterLast ?? false)
                  : true,
              },
              items: page,
            });
          },
        };
        return query;
      },
    },
    meta: {
      // TYPED AS THE SDK TYPES IT, WITH THE LIE IN ONE PLACE. `sdk.meta.db()`
      // resolves a `Database`, and the plugin's own entry point is now typed
      // against that (api/spec.ts's PluginSdk). The DEFAULT here still resolves
      // `undefined`, because most cases are not about the database at all and
      // constructing a fixture handle for them would be noise — so the cast
      // lives here, once, with this comment, rather than at every `init(sdk)`
      // call site across four spec files. A case that DOES need a handle passes
      // one through `overrides.db` and gets the real thing.
      db: async (): Promise<Database> => {
        calls.metaDb += 1;
        if (overrides.db !== undefined)
          return (await overrides.db()) as Database;
        // The assertion goes through `absentDatabase`, whose declared type is
        // `unknown`, rather than through an inline `undefined as unknown as
        // Database` — eslint's fixer strips the redundant-looking first half of
        // that chain and leaves a typecheck error behind. The indirection is
        // load-bearing, not style.
        return absentDatabase as Database;
      },
    },
    console: {
      log: (msg: string) => {
        calls.consoleLog.push(msg);
        overrides.log?.(msg);
      },
    },
    api: {
      register: (name: string, fn: unknown) => {
        calls.apiRegister.push(name);
        overrides.register?.(name, fn);
      },
      // The ARGUMENTS are kept, not just the name. What crosses this call is the
      // difference between a summary and a leak, and only the object itself can
      // answer which one it was.
      send: (event: string, ...args: unknown[]) => {
        calls.apiSend.push({ event, args });
        overrides.send?.(event, ...args);
      },
    },
    events: {
      onInterceptResponse: (fn: (...args: unknown[]) => unknown) => {
        calls.interceptResponseHandlers.push(fn);
      },
      onProjectChange: (
        fn: (sdk: unknown, project: FakeProject | null) => unknown,
      ) => {
        calls.projectChangeHandlers.push(fn);
      },
    },
    calls,
  };

  return sdk;
}
