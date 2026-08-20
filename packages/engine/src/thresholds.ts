// packages/engine/src/thresholds.ts — the ONLY place in DefMiner where a tunable
// number is defined.
//
// Two kinds of constant live here and they are not interchangeable:
//
//   MEASURED — re-exported from thresholds.generated.ts, which scripts/ci/gen-thresholds.mjs
//              writes from the Phase 0 exit artifact. Nobody edits those; they change only
//              when a spike is re-run.
//   POLICY   — chosen in Phase 1, each one DERIVED from a measured value and each derivation
//              written down below AND asserted in thresholds.spec.ts. A policy constant with
//              no stated derivation is a number somebody made up.

import {
  CACHE_HIT_RATE_ASSUMED,
  EVENTS_DELIVERED_UNDER_BLOCK,
  HARD_MAX_BYTES,
  RSS_BYTES_PER_INPUT_BYTE,
  TOKENIZER_MS_PER_MB,
} from "./thresholds.generated";

export * from "./thresholds.generated";

// --- POLICY -----------------------------------------------------------------

/**
 * The largest response body the passive gate will admit, in DECOMPRESSED identity
 * bytes (SIZE_GATE_SOURCE).
 *
 * DERIVATION: 8 MiB is the largest input Phase 0 actually measured end to end — its
 * size ladder was 0.5, 1.5, 3 and 8 MB. Anything above that is unmeasured, and an
 * unmeasured input on a runtime that sets NO memory limit and runs under
 * `panic = "abort"` is a host-kill risk, not a slow scan: an OOM takes `caido-cli`
 * down with the operator's real project data. At the measured
 * RSS_BYTES_PER_INPUT_BYTE this ceiling projects to ~856 MB of peak RSS, which
 * thresholds.spec.ts asserts stays under 1 GiB.
 *
 * Note this is far BELOW HARD_MAX_BYTES ({@link HARD_MAX_BYTES}); that figure is
 * where the runtime breaks, not where we are willing to go.
 */
export const PASSIVE_MAX_BYTES = 8_388_608;

/**
 * Depth of the bounded ingest queue.
 *
 * DERIVATION: four times EVENTS_DELIVERED_UNDER_BLOCK. Caido QUEUES intercept
 * events and loses nothing — 499 arrived in a single 20 ms burst after a 30 s
 * handler block — so a queue below that measured burst would report our own
 * under-sizing as if it were target-driven back-pressure (Pitfall 3). A queue
 * entry is `{id, bytes, kind}` at roughly 100-200 bytes because CORE-05 forbids
 * retaining SDK objects, so 2048 entries cost well under 1 MiB.
 */
export const QUEUE_CAP = 2048;

/**
 * Wall-clock budget for analysing one artifact end to end.
 *
 * DERIVATION: must EXCEED the cost of walking a ceiling-sized artifact at the
 * slowest per-MB rate Phase 0 measured on this runtime — 8 MiB at
 * TOKENIZER_MS_PER_MB is ~6.3 s — so that a deadline expiry is always anomalous
 * rather than the routine outcome for a large bundle. 30 s leaves ~4.8x headroom.
 */
export const ARTIFACT_DEADLINE_MS = 30_000;

/**
 * The content-hash cache hit rate CORE-08's budget is planned against.
 *
 * Takes the value of CACHE_HIT_RATE_ASSUMED and NEVER a literal, because
 * CACHE_HIT_RATE_CROSS_DAY is null with status `inconclusive` — one sampled day
 * and a zero denominator (open Broken Window #6). Writing 0.4 here would make the
 * placeholder invisible the day the real number arrives.
 */
export const CACHE_HIT_RATE = CACHE_HIT_RATE_ASSUMED;

/**
 * The worst-case number of rows one processed artifact INSERTS.
 *
 * DERIVATION: an `artifacts` row and an `analyses` row when the digest is new at
 * the current corpus version, plus an `observations` row EVERY time, since each
 * sighting carries a distinct request id. Three is an upper bound; at the
 * pessimistic CACHE_HIT_RATE of 0.4 the real figure is nearer 2.2.
 */
export const ROWS_INSERTED_PER_ARTIFACT_MAX = 3;

/**
 * Maximum rows one retention sweep pass may delete.
 *
 * DERIVATION — two properties that pull in opposite directions, and only stating
 * both makes the number derivable rather than chosen:
 *
 *   CONVERGENCE. RETENTION_SWEEP_MAX_ROWS >= ROWS_INSERTED_PER_ARTIFACT_MAX *
 *   RETENTION_SWEEP_EVERY_N. A sweep that deletes fewer rows per interval than the
 *   interval inserts bounds nothing: past the retention ceiling the database grows
 *   monotonically while the sweep runs exactly as designed. 512 against a
 *   worst-case 384 is 1.33x headroom, which means a backlog DRAINS under sustained
 *   ingest rather than merely failing to grow faster. It is also why a pass
 *   reporting `moreWork` defers to the next cadence boundary instead of looping to
 *   convergence — with the delete rate above the insert rate, deferral converges
 *   anyway, so the loop would buy nothing and cost a long uninterruptible stretch.
 *
 *   COST. Every delete is an awaited statement on a pooled worker-thread
 *   connection, so a sweep does not hold the JS thread the way a synchronous loop
 *   would; the bound that matters is that it not starve ingest. Capped at 1024 by
 *   assertion so a pass stays bounded no matter how the other constants move.
 */
export const RETENTION_SWEEP_MAX_ROWS = 512;

/**
 * Run one retention sweep pass every N processed artifacts.
 *
 * DERIVATION: the consumer loop is the only thing in this plugin that runs
 * periodically by construction — there is one thread and `setTimeout` is the only
 * yield primitive, so a long-lived background timer is a design smell here. Tying
 * the cadence to processed artifacts means retention pressure scales with the
 * ingest that creates it. See RETENTION_SWEEP_MAX_ROWS for the convergence
 * inequality that binds the two (decision P1-D7).
 */
export const RETENTION_SWEEP_EVERY_N = 128;

// Referenced by the derivations above so the imports are not "unused" to a linter
// and so a reader can see, in one place, which measured values the policy set
// hangs off. thresholds.spec.ts asserts every one of these relationships.
export const POLICY_DERIVED_FROM = {
  PASSIVE_MAX_BYTES: { HARD_MAX_BYTES, RSS_BYTES_PER_INPUT_BYTE },
  QUEUE_CAP: { EVENTS_DELIVERED_UNDER_BLOCK },
  ARTIFACT_DEADLINE_MS: { TOKENIZER_MS_PER_MB },
  CACHE_HIT_RATE: { CACHE_HIT_RATE_ASSUMED },
} as const;
