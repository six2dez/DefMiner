// packages/backend/src/hooks/admit.ts — the complete CORE-02 admission decision.
//
// One pure-ish function, called from the non-async hook. It reads header and
// integer values, asks Caido's own scope engine one synchronous question, and
// returns either an accept carrying scalars or a reject carrying a NAMED reason.
//
// ---------------------------------------------------------------------------
// AXIS ORDER IS PART OF THE CONTRACT
// ---------------------------------------------------------------------------
//   status -> body presence -> size -> kind -> scope,   first failure wins.
//
// A 304 fails THREE of those at once — it has no content-type, a zero-length
// body and a non-2xx status — so the order is what decides whether it gets an
// honest reason or a misleading one. STATUS_304_REACHES_HOOK recorded the
// delivered headers directly: "etag, last-modified, cache-control and
// content-length: 0 — and NO content-type at all, so any admission gate keyed on
// content-type will classify a 304 as non-script". Status-first is the only
// ordering under which `revalidation` is reachable at all.
//
// ---------------------------------------------------------------------------
// TWO THINGS THIS FILE MAY NEVER DO
// ---------------------------------------------------------------------------
// 1. DECODE. `toRaw()` and `toText()` are forbidden here (T-01-14). `body.length`
//    is a readonly property that costs no decode, and SIZE_GATE_SOURCE measured
//    it to be the DECOMPRESSED identity byte count — Caido decodes gzip, brotli
//    and zstd before the hook, and observed ratios ran to 7.25x, so a ceiling
//    written against the wire count would admit up to 7.25x more bytes than
//    intended. `admit.spec.ts` asserts no file under this directory mentions
//    either method.
// 2. USE A REGULAR EXPRESSION. REDOS_RECOVERY is `kill`: SPIKE-01 measured that a
//    catastrophic pattern hangs the QuickJS thread with NO interrupt, that
//    `togglePlugin(enabled:false)` never returns and that `installPluginPackage`
//    fails rather than recovering — SIGKILL was the only teardown that worked,
//    and it takes `caido-cli` down with the operator's real project data. So the
//    classification below is `indexOf` and `endsWith` and nothing else. DET-05's
//    static check lands four phases from now; the discipline starts here.

import { PASSIVE_MAX_BYTES } from "@defminer/engine/thresholds";

/**
 * Every reason a response can be turned away — a CLOSED set, declared once as a
 * runtime array with the type DERIVED from it.
 *
 * Deriving the type from the array rather than declaring both is what makes the
 * "every reason has a test" gate mechanical: `admit.spec.ts` compares the set of
 * reasons its table exercises against this array, so a seventh reason added here
 * with no case fails immediately. A hand-maintained parallel union and list would
 * drift silently, and a counter keyed on a typo'd reason is invisible — it just
 * reads zero forever.
 */
export const REJECT_REASONS = [
  "status",
  "revalidation",
  "empty",
  "too_large",
  "not_scriptish",
  "out_of_scope",
] as const;

export type RejectReason = (typeof REJECT_REASONS)[number];

/** The one artifact kind Phase 1 admits. Detectors arrive in Phase 3. */
export const KIND_JS = "js";

export type AdmitResult =
  | { ok: true; bytes: number; kind: string }
  | { ok: false; reason: RejectReason };

/** What the gate is allowed to be tuned by. One knob today, and it comes from the
 *  generated threshold set rather than a literal. */
export type AdmitConfig = {
  /** Ceiling in DECOMPRESSED identity bytes. */
  maxBytes: number;
};

export const DEFAULT_ADMIT_CONFIG: AdmitConfig = {
  maxBytes: PASSIVE_MAX_BYTES,
};

/** WHATWG MIME Sniffing's JavaScript MIME type essences, plus `text/js` which
 *  the Phase 0 recorder accepted and this plugin already supports. Parameters
 *  are deliberately excluded before matching: a boundary or profile value is
 *  not the response's media type. */
const SCRIPTISH_MEDIA_TYPES = [
  "application/ecmascript",
  "application/javascript",
  "application/x-ecmascript",
  "application/x-javascript",
  "text/ecmascript",
  "text/javascript",
  "text/javascript1.0",
  "text/javascript1.1",
  "text/javascript1.2",
  "text/javascript1.3",
  "text/javascript1.4",
  "text/javascript1.5",
  "text/js",
  "text/jscript",
  "text/livescript",
  "text/x-ecmascript",
  "text/x-javascript",
] as const;

/**
 * Content type first, URL extension second.
 *
 * Exact MIME-essence matching, not a pattern: see the ReDoS note in this file's
 * header. The extension check strips the fragment AND the query before looking
 * at the suffix, or `/app.js?v=2` would miss — and a cache-busting query is
 * common enough on exactly the bundles this tool exists to read.
 */
export function isScriptish(
  contentType: string | null,
  url: string | null,
): boolean {
  if (contentType) {
    const essence = String(contentType)
      .split(";", 1)[0]
      .trim()
      .toLowerCase();
    for (const mediaType of SCRIPTISH_MEDIA_TYPES) {
      if (essence === mediaType) return true;
    }
  }
  if (url) {
    const bare = String(url).split("#")[0].split("?")[0].toLowerCase();
    if (bare.endsWith(".js") || bare.endsWith(".mjs")) return true;
  }
  return false;
}

/**
 * Resolve the content type from Caido's header map.
 *
 * BOTH casings are checked rather than assuming which spelling Caido normalises
 * to, and an array value is unwrapped: the SDK types headers as
 * `Record<string, Array<string>>`, but the production recorder found BOTH shapes
 * in the field against real traffic. Neither branch is speculative — each one was
 * observed.
 */
export function contentTypeOf(
  headers: Record<string, unknown> | undefined,
): string | null {
  if (!headers) return null;
  const raw = headers["content-type"] ?? headers["Content-Type"];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === undefined || value === null ? null : String(value);
}

/** The narrow slice of the SDK the gate touches. Deliberately not `SDK`: the gate
 *  asks exactly one question of it, and a narrow parameter is what lets the fake
 *  in `test/fixtures/fake-sdk.ts` be small enough to read. */
export type AdmitSdk = {
  requests: { inScope(request: unknown): boolean };
};

export type AdmitRequest = {
  getId(): string;
  getUrl(): string;
};

export type AdmitResponse = {
  getCode(): number;
  getHeaders(): Record<string, unknown>;
  getBody(): { readonly length: number } | undefined;
};

const reject = (reason: RejectReason): AdmitResult => ({ ok: false, reason });

/**
 * Decide whether one proxied response becomes work.
 *
 * Synchronous, by construction: this is called from `onInterceptResponse`, which
 * CORE-01 requires to be non-async. Everything here is an integer comparison, a
 * string `indexOf`, or one synchronous call into Caido's scope engine.
 */
export function admit(
  sdk: AdmitSdk,
  request: AdmitRequest,
  response: AdmitResponse,
  cfg: AdmitConfig = DEFAULT_ADMIT_CONFIG,
): AdmitResult {
  // --- 1. status ------------------------------------------------------------
  const status = response.getCode();
  // 304 FIRST and under its OWN reason. It is a revalidation of a bundle we may
  // already know, not a content-type miss — and folding it into `not_scriptish`
  // would make the two indistinguishable in the counters, which is precisely the
  // number Phase 6's retroactive scanner has to work from (decision P3-D2).
  if (status === 304) return reject("revalidation");
  if (status < 200 || status >= 300) return reject("status");

  // --- 2. body presence -----------------------------------------------------
  const body = response.getBody();
  if (!body) return reject("empty");
  const bytes = body.length;
  // Zero-length is rejected HERE, before anything downstream can write a row, so
  // no artifact can ever carry the SHA-256 of the empty byte string.
  if (!(bytes > 0)) return reject("empty");

  // --- 3. size --------------------------------------------------------------
  // The security control, not a performance tweak: this is what keeps an
  // oversized body from taking `caido-cli` down under `panic = "abort"`
  // (T-01-14). `>` and not `>=` — a body at EXACTLY the ceiling is admitted, so
  // the boundary is stated rather than left to whichever comparison got typed.
  if (bytes > cfg.maxBytes) return reject("too_large");

  // --- 4. kind --------------------------------------------------------------
  const url = request.getUrl();
  const contentType = contentTypeOf(response.getHeaders());
  if (!isScriptish(contentType, url)) return reject("not_scriptish");

  // --- 5. scope -------------------------------------------------------------
  // Caido's OWN engine, called synchronously. Re-implementing scope matching
  // would diverge from the operator's configured scope on the first edge case,
  // and the operator would have no way to see that it had.
  if (!sdk.requests.inScope(request)) return reject("out_of_scope");

  return { ok: true, bytes, kind: KIND_JS };
}
