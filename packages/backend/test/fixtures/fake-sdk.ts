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
  apiRegister: string[];
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
  };
  meta: { db(): Promise<unknown> };
  console: { log(msg: string): void };
  api: { register(name: string, fn: unknown): void };
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
  db?: () => Promise<unknown>;
  log?: (msg: string) => void;
  register?: (name: string, fn: unknown) => void;
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
export function makeFakeSdk(overrides: FakeSdkOverrides = {}): FakeSdk {
  const calls: FakeSdkCalls = {
    consoleLog: [],
    requestsGet: [],
    inScope: [],
    apiRegister: [],
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
    },
    meta: {
      db: async () => {
        calls.metaDb += 1;
        if (overrides.db !== undefined) return overrides.db();
        return undefined;
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
