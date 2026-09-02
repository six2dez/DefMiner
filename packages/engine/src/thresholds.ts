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
  MAX_SYNC_SLICE_MS,
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
 * The worst-case number of rows one PHASE 1 artifact inserts.
 *
 * ===========================================================================
 * A DOCUMENTATION CONSTANT SINCE 2026-09-02 (plan 07-05, Pitfall 2)
 * ===========================================================================
 * IT NO LONGER BOUNDS ANYTHING, AND IT IS KEPT ANYWAY. Until Phase 7 this was
 * load-bearing: `thresholds.spec.ts` asserted convergence as
 * `RETENTION_SWEEP_MAX_ROWS >= ROWS_INSERTED_PER_ARTIFACT_MAX *
 * RETENTION_SWEEP_EVERY_N`, and the consumer's sweep interval advanced by ONE
 * per row-inserting iteration — so "rows per interval" and "artifacts per
 * interval" differed by exactly this factor.
 *
 * D-09 ENDED THAT. One artifact carrying monaco's real 781-source map inserts
 * `3 + 781 + 781 = 1,565` rows in a single consumer iteration — 521x the figure
 * below — so no constant multiplier relates the two quantities any more. The fix
 * was not a bigger multiplier: `ingest/consumer.ts`'s interval now advances by
 * ROWS, and the inequality is restated as
 * `RETENTION_SWEEP_MAX_ROWS >= RETENTION_SWEEP_EVERY_N`, which holds
 * INDEPENDENTLY of how many rows any single artifact produces.
 *
 * WHY IT IS NOT DELETED. It is the RECORD of what the old inequality meant and
 * of what changed. Deleting it would leave `RETENTION_SWEEP_MAX_ROWS`'s
 * derivation referring to an argument with no surviving trace, and the next
 * reader re-deriving 512 would have no way to see that a per-artifact row bound
 * was ever the term. `thresholds.spec.ts` asserts MECHANICALLY that the
 * convergence check no longer reads it, so the demotion is checkable rather than
 * promised.
 *
 * ORIGINAL DERIVATION, PRESERVED: an `artifacts` row and an `analyses` row when
 * the digest is new at the current corpus version, plus an `observations` row
 * EVERY time, since each sighting carries a distinct request id. Three is an
 * upper bound; at the pessimistic CACHE_HIT_RATE of 0.4 the real figure is
 * nearer 2.2. It remains the correct figure for an artifact carrying NO
 * sourcemap, which is most of them.
 */
export const ROWS_INSERTED_PER_ARTIFACT_MAX = 3;

/**
 * Maximum rows one retention sweep pass may delete.
 *
 * DERIVATION — two properties that pull in opposite directions, and only stating
 * both makes the number derivable rather than chosen:
 *
 *   COST. Every delete is an awaited statement on a pooled worker-thread
 *   connection, so a sweep does not hold the JS thread the way a synchronous loop
 *   would; the bound that matters is that it not starve ingest. Capped at 1024 by
 *   assertion so a PASS stays bounded no matter how the other constants move.
 *
 *   CONVERGENCE — and it is NOT a property of this constant alone. See
 *   {@link RETENTION_SWEEP_MAX_PASSES}, which is the other half and where the
 *   inequality is stated in full.
 *
 * ===========================================================================
 * THE TWO SUPERSEDED FORMS, KEPT BECAUSE EACH ONE WAS WRONG IN A DIFFERENT WAY
 * ===========================================================================
 * FORM 1, through 2026-09-01: `>= ROWS_INSERTED_PER_ARTIFACT_MAX *
 * RETENTION_SWEEP_EVERY_N` — 512 >= 384 — while `ingest/consumer.ts`'s interval
 * counted ARTIFACTS. True and load-bearing for as long as one artifact could only
 * insert three rows. D-09 broke it by up to 521x.
 *
 * FORM 2, 2026-09-02 (plan 07-05, Pitfall 2): the interval was changed to count
 * ROWS and the inequality restated as `RETENTION_SWEEP_MAX_ROWS >=
 * RETENTION_SWEEP_EVERY_N` — 512 >= 128 — claimed in three places to hold
 * "INDEPENDENTLY of how many rows any single artifact produces".
 *
 * IT DID NOT ESTABLISH CONVERGENCE, because it compares the wrong two quantities
 * (07-REVIEW.md HI-04). Convergence needs `rows deleted per pass >= rows inserted
 * per sweep interval`. RETENTION_SWEEP_EVERY_N is not the insert side — it is only
 * the THRESHOLD at which a pass becomes due. The sweep runs BETWEEN drain
 * iterations, so the rows actually inserted before a pass fires are the rows
 * inserted by the iteration that CROSSED the threshold, and one iteration can
 * insert far more than the threshold. On this file's own monaco example, 1,565
 * rows in against 512 out is +1,053 rows per iteration, monotonically — verbatim
 * the failure the inequality exists to prevent. Form 2 did not solve the problem;
 * it moved where the problem was invisible.
 */
export const RETENTION_SWEEP_MAX_ROWS = 512;

/**
 * How many bounded passes one cadence crossing may run before deferring.
 *
 * ===========================================================================
 * THE OTHER HALF OF CONVERGENCE, AND THE HALF THAT MAKES IT TRUE
 * ===========================================================================
 * The inequality that is actually load-bearing, stated in the quantities it is
 * about — `thresholds.spec.ts` asserts exactly this:
 *
 *   RETENTION_SWEEP_MAX_ROWS * RETENTION_SWEEP_MAX_PASSES
 *     >= RETENTION_SWEEP_EVERY_N + ROWS_INSERTED_PER_ITERATION_MAX
 *
 *   8,192 >= 2,179, which is ~3.76x headroom.
 *
 * AND THE FIGURES IN THIS PARAGRAPH ARE THEMSELVES ASSERTED, which they were not
 * when it last drifted. `thresholds.spec.ts`'s describe block "the DOCUMENTED
 * derivation matches the SHIPPED constants" READS this docblock as TEXT and
 * compares every figure below against the constants it imports. The convergence
 * tests beside it compute the inequality FROM the constants and so cannot fail on
 * a stale sentence; that is how this paragraph spent a full verification round
 * computing a value the code had retired (07-VERIFICATION.md WR-01). Edit a
 * constant without editing these words and a test goes red.
 *
 * READ THE RIGHT-HAND SIDE AS WHAT IT IS: the most rows that can be inserted
 * before a pass fires. Up to `RETENTION_SWEEP_EVERY_N - 1` rows can already have
 * accumulated below the threshold, and then ONE iteration crosses it — and a
 * single iteration can insert {@link ROWS_INSERTED_PER_ITERATION_MAX}. Bounding
 * the left-hand side by the per-PASS cap alone can never dominate that, because
 * the per-pass cap is held down by the cost cap.
 *
 * SO THE PASS REPEATS WITHIN ONE CADENCE INSTEAD OF THE CAP BEING RAISED, and the
 * two rejected repairs are why. Raising RETENTION_SWEEP_MAX_ROWS to 2,179 breaks
 * the 1024-row cost cap `thresholds.spec.ts` asserts — and THE REJECTION STILL
 * HOLDS AT THE SMALLER FIGURE, which is worth saying because this sentence carried
 * a larger one until plan 07-14 retired the MD-01 factor: 2,179 is still more than
 * twice the cost cap, so nothing about the argument shrank when the number did. A
 * per-map ROW cap tight enough to fix it instead (~190 sources) would refuse
 * monaco's 781-source map outright, and D-09 rejected a per-map row cap anyway.
 *
 * THE COST ARGUMENT IS UNCHANGED AND THAT IS THE POINT. A pass is still bounded at
 * RETENTION_SWEEP_MAX_ROWS, and `ingest/consumer.ts` YIELDS between passes — so
 * this is not the long uninterruptible stretch the bounded pass exists to prevent.
 * It is up to sixteen bounded stretches with the event loop between them. The
 * loop ALSO stops the moment a pass reports no work remains, so an ordinary
 * cadence still runs exactly one pass; the repeat is reachable only when there is
 * a real backlog, which is the only case where convergence was ever in question.
 *
 * SIXTEEN IS RETAINED HEADROOM AND IT IS NOT THE DERIVED VALUE. The derivation
 * ends at eight. The smallest integer that satisfies the inequality is 5, because
 * 2,179 / 512 = 4.26, and the next power of two above it is 8. Eight ALREADY buys
 * the property the superseded Form 1 comment claimed and never had: a backlog
 * DRAINS under sustained worst-case ingest rather than merely failing to grow.
 *
 * SO WHY IS IT STILL SIXTEEN — because lowering it to 8 was considered on
 * 2026-09-02, when this paragraph was corrected, and was NOT approved. The extra
 * doubling costs nothing at runtime: the loop stops the moment a pass reports no
 * work remains, so an ordinary cadence still runs exactly one pass and the further
 * passes are reachable only under a real backlog. What it buys is a wider drain
 * margin under exactly the sustained worst-case ingest the paragraph above claims
 * to survive. DO NOT "tidy" 16 down to 8 on the strength of this derivation: the
 * derivation produces 8, the constant is 16, and the gap between them is the
 * headroom rather than a mistake.
 *
 * IT IS A CEILING, NOT A TARGET. A pass that reports `moreWork` on the sixteenth
 * iteration defers to the next cadence boundary exactly as before.
 */
export const RETENTION_SWEEP_MAX_PASSES = 16;

/**
 * Run one retention sweep pass every N processed artifacts.
 *
 * DERIVATION: the consumer loop is the only thing in this plugin that runs
 * periodically by construction — there is one thread and `setTimeout` is the only
 * yield primitive, so a long-lived background timer is a design smell here. Tying
 * the cadence to processed artifacts means retention pressure scales with the
 * ingest that creates it. See {@link RETENTION_SWEEP_MAX_PASSES} for the
 * convergence inequality that binds the three (decision P1-D7).
 *
 * COUNTED IN ROWS since 2026-09-02, which is what this comment always claimed.
 * IT IS A THRESHOLD AND NOT AN INSERT RATE, and confusing the two is how the
 * superseded convergence inequality came to compare the wrong quantities: the
 * rows inserted before a pass fires are this number PLUS whatever the crossing
 * iteration inserted, which is {@link ROWS_INSERTED_PER_ITERATION_MAX}.
 */
export const RETENTION_SWEEP_EVERY_N = 128;

/**
 * How many requests one retroactive-scan page asks Caido for (FIND-03, D-01).
 *
 * DERIVATION, and it is a property of the SDK surface rather than of a
 * measurement: `RequestsQuery` in `@caido/quickjs-types@0.26.0` has `after`,
 * `before`, `first`, `last`, `filter`, `ascending`, `descending` and `execute`
 * — and NO `includeRaw(false)` or any other projection control. Every
 * `RequestsConnectionItem` therefore carries the full `Response`, so a page is
 * not a page of metadata: it is a transfer of every matching response body, on
 * the single QuickJS thread, into a runtime that sets no memory limit and runs
 * under `panic = "abort"`.
 *
 * That is why the documented 1000-item page size is not usable here and why
 * this number is small. Twenty at the shipped `PASSIVE_MAX_BYTES` ceiling
 * projects to at most ~160 MiB in flight for one page, and the realistic case
 * is orders below that; 1000 at the same ceiling is a host kill that takes
 * `caido-cli` down with the operator's real project data.
 *
 * NOT IN {@link POLICY_DERIVED_FROM}, and the absence is deliberate rather than
 * an omission: that map exists to bind each policy constant to the MEASURED
 * value it hangs off, and this one hangs off a type declaration. Adding it with
 * an empty derivation set would say it was measured when it was read.
 */
export const SCAN_PAGE_SIZE = 20;

/**
 * The queue depth at or above which the retroactive scan stops offering pages
 * (FIND-03, D-01).
 *
 * DERIVATION, and the argument is written out so a reader can DISAGREE with it
 * rather than merely read a number:
 *
 *   The scan may offer a page only while there is still room for a full MEASURED
 *   live burst on top of everything the scan has just added. A burst is
 *   EVENTS_DELIVERED_UNDER_BLOCK — 499 intercept events arrived in a single 20 ms
 *   window after a 30 s handler block (SPIKE-03), and it is the only burst anyone
 *   has measured; `BoundedQueue`'s constructor already refuses a cap below it.
 *   One scan page adds at most SCAN_PAGE_SIZE entries. So the watermark must
 *   satisfy
 *
 *       WATERMARK <= QUEUE_CAP - EVENTS_DELIVERED_UNDER_BLOCK - SCAN_PAGE_SIZE
 *
 *   and it is set TO that bound. Computed from the three identifiers rather than
 *   written as the number they currently produce, in the idiom
 *   RETENTION_SWEEP_MAX_ROWS's convergence property uses: the derivation is
 *   referenced in code, so it is not merely a comment.
 *
 * WHY A WATERMARK AT ALL, stated here because it is the whole reason plan 06-01
 * shipped a producer with no caller: `BoundedQueue.offer()` drops the OLDEST
 * entry at cap. That is the right trade for live traffic — the newest artifact
 * is the one the operator is looking at — and it is exactly wrong under a
 * backfill, where the oldest entries ARE the operator's live browsing. An
 * ungated producer therefore does not merely run fast: it provably discards the
 * live responses the operator is watching, and the drop counter is the only
 * place that shows.
 *
 * THE RESIDUAL, named here rather than left to be discovered. This is a
 * DROP-safety bound and it says nothing about LATENCY. At TOKENIZER_MS_PER_MB a
 * full PASSIVE_MAX_BYTES artifact takes roughly six seconds to walk and the
 * consumer is strictly serial, so a queue standing at this watermark can be a
 * long backlog in front of every live response the operator generates — none of
 * them dropped, all of them waiting. A latency-derived watermark would need a
 * MEDIAN ARTIFACT SIZE, and no such distribution has been measured: SPIKE-06's
 * ladder was four sizes over a corpus of two, which is a ladder and not a
 * distribution. That measurement — a size distribution over a real Caido
 * project's stored traffic — is what would close this, and until it exists no
 * number is projected here. In particular RSS_BYTES_PER_INPUT_BYTE is NOT used
 * for it: that figure was measured for the tokenizer's memory profile, and
 * reusing it as a latency proxy would produce a fabricated number of exactly the
 * shape Phase 0 refused.
 */
export const SCAN_BACKPRESSURE_WATERMARK =
  QUEUE_CAP - EVENTS_DELIVERED_UNDER_BLOCK - SCAN_PAGE_SIZE;

// --- PHASE 7: THE INLINE SOURCEMAP BOUNDS (D-10, D-02, MAP-06, O-02) --------
//
// Every constant below is DERIVED FROM ONE MEASUREMENT, and the measurement is
// a file: `.planning/phases/07-sourcemap-reconstruction/results/map-bytes.json`.
// A reader who asks where a number came from is one `grep map-bytes.json` from
// the artifact, and `tests/phase7-mapbytes.spec.ts` is what keeps that artifact
// honest.
//
// WHY THE MEASUREMENT HAD TO EXIST AT ALL, since the obvious move is to reuse a
// Phase 0 number. SPIKE-06 measures exactly seven operations — `read`, `decode`,
// `hash`, `hash_js_loop`, `vlq_decode`, `tokenize`, `parse` — and its `decode` is
// `Buffer.toString("utf8")`, NOT a base64 decode and NOT `JSON.parse`. There is
// no `json_parse` measurement anywhere in Phase 0. The two constants most likely
// to be misappropriated are {@link AST_MAX_BYTES} (derived from a meriyah stall
// at 785.8 ms/MB — a different cost curve and a different allocator profile) and
// {@link RSS_BYTES_PER_INPUT_BYTE} (whose go-no-go rationale scopes it verbatim
// to "the parse operation", at MEDIUM confidence). D-10 forbids both.

/**
 * The largest INLINE sourcemap, in DECODED map-JSON bytes, that the phase will
 * accept and reconstruct.
 *
 * DERIVATION: `min(measured_stall_bound, measured_rss_bound, 6_291_456)`, from
 * the four-point ladder in
 * `.planning/phases/07-sourcemap-reconstruction/results/map-bytes.json`,
 * measured inside a version-asserted Caido 0.58.0 with one fresh instance per
 * point. The three terms, in the order the artifact reports them:
 *
 *   measured_stall_bound  2,954,422 B — the inline path (`announce_scan` +
 *     `b64_decode_buffer` + `json_parse`) fitted at 8.87 ms/MB against
 *     {@link MAX_SYNC_SLICE_MS}. D-08 puts that stretch on the PROXY THREAD, so
 *     the slice budget is the binding cost, not the artifact deadline.
 *   measured_rss_bound   94,824,930 B — 11.32 RSS bytes per decoded byte
 *     against the same 1 GiB projection {@link PASSIVE_MAX_BYTES} is asserted
 *     under. Slack by a factor of thirty; recorded so nobody re-derives it.
 *   structural ceiling    6,291,456 B — `floor(PASSIVE_MAX_BYTES * 3/4)`. Base64
 *     expands 4:3 and `admit()` refuses any body over PASSIVE_MAX_BYTES, so an
 *     inline map's decoded JSON CANNOT exceed this. Not a preference; a
 *     consequence of two shipped constants.
 *
 * THE BOUND IS BINDING — the stall term wins by more than 2x. That is O-03's
 * first outcome and it has a UI consequence the phase owes the operator: DefMiner
 * will refuse a minority of the inline maps `admit()` would let through, and must
 * SAY SO rather than appear to have found nothing (UI-09). A silent floor reads
 * as an empty result.
 *
 * ROUNDED DOWN, and the direction is the whole point. 2,954,422 is a
 * least-squares fit through four timing points; a re-run moves it by a few
 * percent in either direction (2,752,788 on the immediately preceding run). The
 * shipped constant is 2,621,440 = 2.5 MiB — the nearest 512 KiB boundary BELOW
 * the fit — so the policy sits outside the measurement's own noise on the safe
 * side, and a number a reader can hold. Rounding UP would put the ceiling inside
 * the noise on the wrong side.
 *
 * REFUSE, NEVER TRUNCATE, above this. A truncated map decodes to WRONG POSITIONS
 * rather than to an error, which is the quiet-wrongness class every gate in this
 * codebase exists to prevent.
 */
export const MAP_MAX_BYTES = 2_621_440;

/**
 * The longest `//# sourceMappingURL=data:...;base64,` prefix the scanner must
 * allow for, in bytes.
 *
 * DERIVATION: the longest legal spelling is
 * `//# sourceMappingURL=data:application/json;charset=utf-8;base64,` at 63
 * bytes. 128 doubles it, which covers the `charset=UTF-8` casing, the legacy
 * `//@` spelling, and whitespace the ECMA-426 pattern
 * `^[@#]\s*sourceMappingURL=(\S*?)\s*$` permits between the marker and the URL.
 * A sibling of {@link SOURCEMAP_TAIL_WINDOW_BYTES} and never used alone.
 */
export const ANNOUNCEMENT_PREFIX_MAX = 128;

/**
 * How far back from EOF the D-02 announcement scan reads.
 *
 * DERIVED, NEVER CHOSEN:
 * `Math.ceil(MAP_MAX_BYTES * 4 / 3) + ANNOUNCEMENT_PREFIX_MAX`.
 *
 * WHY A SMALL CONSTANT HERE SHIPS A PHASE THAT RECOVERS NOTHING, which is the
 * failure this derivation exists to prevent. For an EXTERNAL map the
 * announcement is a short comment at the very end — measured at 38 bytes from
 * EOF on babel, 67 on monaco and 35 on tfjs. For an INLINE map the marker sits
 * `payload_length + ~45` bytes from the end, up to ~8.4 MB. A sensible-looking
 * 64 KB window therefore finds EVERY external announcement and NO inline one —
 * and inline is the only kind D-01 consumes. Every test passes, the D-03
 * external counter climbs, the recovered-source count stays at zero, and nothing
 * fails.
 *
 * The window only ever needs to be as wide as the largest map the phase will
 * accept, which is what ties this discretionary number to D-10's measurement.
 * `thresholds.spec.ts` asserts the relation rather than the value, INCLUDING
 * that the two rounding directions oppose — the encode direction ceils and the
 * decode direction floors — so the window can never be narrower than the payload
 * it must contain.
 *
 * COST, measured rather than assumed: `announce_scan` over a window this wide
 * was the MOST EXPENSIVE of the probe's five operations at 3.80 ms/MB, above
 * `json_parse`'s 2.91. RESEARCH assumption A2 predicted it might be, and named
 * the mitigation in advance: a single 16-byte `lastIndexOf("sourceMappingURL")`
 * prefilter before the two full marker searches. That is now an evidenced
 * optimisation rather than a precaution.
 */
export const SOURCEMAP_TAIL_WINDOW_BYTES =
  Math.ceil((MAP_MAX_BYTES * 4) / 3) + ANNOUNCEMENT_PREFIX_MAX;

/**
 * The most lines the recovered-source viewer will render for one file.
 *
 * DERIVATION, as an inequality against the decoded ceiling rather than as a
 * preference — this is O-02's residual, and it is a real one: a file with six
 * million SHORT lines is line-structured and passes every other check, while the
 * split array is then ~6M strings.
 *
 * A source file that reaches this cap while fitting inside
 * `floor(PASSIVE_MAX_BYTES * 3/4)` averages 12.58 characters per line —
 * 6,291,456 / 500,000, computed rather than eyeballed.
 * `thresholds.spec.ts` declares that figure as `MIN_CHARS_PER_LINE` and asserts
 * `SOURCE_LINE_COUNT_MAX * MIN_CHARS_PER_LINE <= floor(PASSIVE_MAX_BYTES * 3/4)`,
 * so the argument is EXECUTABLE rather than prose. Below that density the file
 * is line noise a hostile map declared as a source, and SAYING SO is more useful
 * to the operator than rendering it — which is the same UI-09 move
 * {@link MAP_MAX_BYTES}'s minority-recovery case needs.
 */
export const SOURCE_LINE_COUNT_MAX = 500_000;

/**
 * MAP-06's aggregate limit, expressed as a ROW bound AND ENFORCED AS ONE.
 *
 * A ROW BOUND AND NOT A SOURCE-COUNT BOUND, deliberately, so that Pitfall 2's
 * convergence fix and MAP-06's aggregate limit are THE SAME CONSTANT. Under
 * D-05 + D-09 one map-bearing artifact inserts a derived-source row per new
 * content hash and a sighting row per `(map, index)` — monaco's real 781-source
 * map is 1,562 rows on its own, which is 521x
 * {@link ROWS_INSERTED_PER_ARTIFACT_MAX}'s declared worst case. Two constants
 * for one quantity is how the retention sweep comes to bound nothing while
 * running exactly as designed.
 *
 * AND THE GATE NOW EXECUTES THAT ARITHMETIC RATHER THAN APPROXIMATING IT, which
 * is 07-REVIEW.md MD-01's closing sentence and the difference between a
 * derivation and a hope. `parse.ts`'s `absorb` compares
 * `declared * ROWS_PER_RECOVERED_SOURCE` against this number. Until plan 07-14 it
 * compared the DECLARED SOURCE count against it, so a map declaring 2,048
 * sources — 4,096 rows — passed a bound documented as 2,048 rows, and the real
 * ceiling was twice the stated one. `parse.spec.ts` exercises the boundary from
 * both sides in the unit stated here: 1,024 sources ACCEPTED at exactly 2,048
 * rows, 1,025 REFUSED at 2,050.
 *
 * DERIVATION FROM THE PROBE'S RSS CURVE, not from a preference. `map-bytes.json`
 * measured 11.32 RSS bytes per decoded map byte, and at {@link MAP_MAX_BYTES}
 * that projects to ~29.7 MB of peak RSS for one map. The probe's own points give
 * the source density: 1,131 sources in 6,291,456 decoded bytes at the top point,
 * so a map at MAP_MAX_BYTES carries roughly 471 sources and 942 rows. 2,048 is
 * the next power of two above that, giving ~2.2x headroom for a map whose
 * sources are unusually small — and it stays inside the same RSS projection
 * because the rows are bounded by the bytes that produced them. THAT 942 IS THE
 * NUMBER THE GATE IS NOW MEASURED AGAINST: a map at MAP_MAX_BYTES writes ~942
 * rows against a 2,048-row refusal, rather than ~942 rows against a refusal that
 * only fired at 4,096.
 *
 * `million-tiny-sources` in `packages/engine/src/sourcemap/map-fixture.ts` is the
 * fixture this refuses: a legal map declaring 1,000,000 one-character sources.
 */
export const SOURCE_ROWS_PER_MAP_MAX = 2_048;

/**
 * The most rows ONE consumer iteration can insert — the insert side of the
 * retention convergence inequality (07-REVIEW.md HI-04).
 *
 * DERIVED RATHER THAN CHOSEN, and it is the quantity the superseded inequality
 * left out. One iteration processes one artifact, which inserts at most
 * {@link ROWS_INSERTED_PER_ARTIFACT_MAX} base rows plus whatever its announced
 * map recovers. `parseSourceMap` refuses past {@link SOURCE_ROWS_PER_MAP_MAX}
 * ROWS — `absorb` converts the declared source count at D-05's two rows per
 * source and compares the ROW figure — so the map half is
 * `SOURCE_ROWS_PER_MAP_MAX` itself, with no conversion left to do here.
 *
 * ===========================================================================
 * THE `2 *` THIS SUM ONCE CARRIED, KEPT AS HISTORY BECAUSE A READER WOULD
 * OTHERWISE FIND THE FACTOR ARBITRARY AND ITS REMOVAL UNEXPLAINED
 * ===========================================================================
 * Through 2026-09-02 the map half read `2 * SOURCE_ROWS_PER_MAP_MAX`, and the
 * factor was the UNIT MISMATCH 07-REVIEW.md MD-01 records rather than a choice
 * made here: `SOURCE_ROWS_PER_MAP_MAX` was derived and documented as a ROW bound
 * and ENFORCED as a declared-SOURCES bound, so the real ceiling was twice the
 * stated one and an insert bound using the stated one would have been half of
 * what the code could actually do. That comment ended by predicting exactly what
 * plan 07-14 then did — "if MD-01 is fixed by enforcing the gate in rows, this
 * factor becomes 1 and the inequality only gets slacker; it cannot become false
 * by that edit" — and the prediction is the record of why the ORDER of the two
 * commits mattered. The gate landed first (4,227 on the insert side, over-stated
 * and therefore safe) and the factor was retired second (2,179, exact). Taken the
 * other way round the insert side would have UNDER-stated for the length of one
 * commit, which is verbatim the failure HI-04 records.
 *
 * ONE MAP PER ITERATION. `findAnnouncement` returns the LAST announcement in the
 * body and the derived stage is refused at `DERIVED_MAX_DEPTH`, so a single
 * iteration reconstructs one map and not a chain of them.
 */
export const ROWS_INSERTED_PER_ITERATION_MAX =
  ROWS_INSERTED_PER_ARTIFACT_MAX + SOURCE_ROWS_PER_MAP_MAX;

// Referenced by the derivations above so the imports are not "unused" to a linter
// and so a reader can see, in one place, which measured values the policy set
// hangs off. thresholds.spec.ts asserts every one of these relationships.
export const POLICY_DERIVED_FROM = {
  PASSIVE_MAX_BYTES: { HARD_MAX_BYTES, RSS_BYTES_PER_INPUT_BYTE },
  QUEUE_CAP: { EVENTS_DELIVERED_UNDER_BLOCK },
  ARTIFACT_DEADLINE_MS: { TOKENIZER_MS_PER_MB },
  CACHE_HIT_RATE: { CACHE_HIT_RATE_ASSUMED },
  // The only entry whose inputs are not all MEASURED, and the exception is
  // deliberate rather than an oversight. QUEUE_CAP and SCAN_PAGE_SIZE are
  // themselves POLICY, so this row records a derivation over two policy values
  // and one measured one. Recording it anyway is what makes the relationship
  // machine-checkable — thresholds.spec.ts reads this entry — and the measured
  // term, EVENTS_DELIVERED_UNDER_BLOCK, is the one the safety argument turns on.
  SCAN_BACKPRESSURE_WATERMARK: {
    QUEUE_CAP,
    EVENTS_DELIVERED_UNDER_BLOCK,
    SCAN_PAGE_SIZE,
  },

  // --- PHASE 7 ------------------------------------------------------------
  //
  // THE FIRST ENTRIES WHOSE MEASURED TERM IS A FILE PATH RATHER THAN AN
  // IMPORTED SYMBOL, and the difference is the point. Every other row above
  // names a constant re-exported from `thresholds.generated.ts`, which the
  // generator writes from Phase 0's `go-no-go.json`. Phase 7's measurement is
  // NOT in go-no-go.json and must not be: `scripts/ci/gen-thresholds.mjs`
  // emits `thresholds.generated.ts` from that one artifact, and
  // `thresholds.spec.ts` gate 1 byte-compares the result — so adding a Phase 7
  // number there would mean either editing a generated file or reopening a
  // Phase 0 aggregate whose whole value is that it describes 0.57.1.
  //
  // Naming the artifact BY PATH is what keeps the derivation checkable anyway:
  // `grep -rn map-bytes.json` reaches the measurement, the schema that
  // validates it and the gate that fails when it is absent, from anywhere in
  // the tree. `thresholds.spec.ts` asserts this string is present.
  MAP_MAX_BYTES: {
    PASSIVE_MAX_BYTES,
    measured_in:
      ".planning/phases/07-sourcemap-reconstruction/results/map-bytes.json",
    measured_against: MAX_SYNC_SLICE_MS,
  },
  ANNOUNCEMENT_PREFIX_MAX: {
    measured_in:
      ".planning/phases/07-sourcemap-reconstruction/results/map-bytes.json",
  },
  SOURCEMAP_TAIL_WINDOW_BYTES: {
    MAP_MAX_BYTES,
    ANNOUNCEMENT_PREFIX_MAX,
    measured_in:
      ".planning/phases/07-sourcemap-reconstruction/results/map-bytes.json",
  },
  SOURCE_LINE_COUNT_MAX: {
    PASSIVE_MAX_BYTES,
    measured_in:
      ".planning/phases/07-sourcemap-reconstruction/results/map-bytes.json",
  },
  SOURCE_ROWS_PER_MAP_MAX: {
    MAP_MAX_BYTES,
    ROWS_INSERTED_PER_ARTIFACT_MAX,
    measured_in:
      ".planning/phases/07-sourcemap-reconstruction/results/map-bytes.json",
  },
} as const;
