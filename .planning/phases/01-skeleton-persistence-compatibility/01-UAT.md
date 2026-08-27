---
status: complete
phase: 01-skeleton-persistence-compatibility
source: [01-01-SUMMARY.md … 01-45-SUMMARY.md (45 files), 01-REVIEW-FIX.md]
started: 2026-08-27T00:00:00Z
updated: 2026-08-27T00:00:00Z
round: 2
supersedes: 01-UAT-round1.md
scope: operator-observable
scope_note: |
  Scope chosen by the operator at session start. Coverage classification over all 45
  SUMMARYs resolved 250 deliverables as auto-passed by their own tests and 56 as needing
  human judgment. Of those 56, roughly 25 (from 01-27 onward) are CORE-11 gate-discipline
  questions — "does this prose claim only what executes" — which the phase's own contract
  assigns to verification pass 12, not to UAT. Those are DEFERRED here by decision, not
  dropped. This session tests the operator-observable remainder.
carried_gaps: |
  Round 1 gap 1 (observations.url query-string redaction) — RESOLVED. QUERY_VALUE_REDACTION
  ships in packages/backend/src/store/observations.ts with 64 assertions in
  observations.spec.ts, and Caido 0.58.2 run 20260826T224147Z-25836 showed every tracer dye
  absent from both the raw SQLite column and the RPC projection. Re-tested here as test 7.
  Round 1 gap 2 (CORE-11 outbound enforcement) — STILL OPEN. .planning/REQUIREMENTS.md:46
  reads `- [ ] **CORE-11**`. Owned by verification pass 12. Disposition confirmed as test 18.
coverage_anomalies: |
  01-07-SUMMARY.md and 01-08-SUMMARY.md carry an older coverage schema (`deliverable:`
  instead of `id:`/`description:`, and `kind: test`/`kind: command` outside the valid kind
  set), so their 13 entries fail validation and default to human checkpoints under the
  fail-safe rule. Read directly: 12 of the 13 are marked human_judgment: false and are
  covered by passing tests; the one genuine human_judgment: true entry is 01-08's
  "disposition of pre-policy rows", carried here as test 10. No deliverable was dropped.
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running Caido instance, clear the plugin's SQLite DB and lock/temp files, then install and start DefMiner from scratch. Plugin registers without error, migrations build the schema from nothing, and a primary read returns live data.
result: pass
reported: "he instalado defminer pero no lo veo en caido en la lista de plugins" → on re-check: "pass"
note: |
  First response reported the plugin absent from Caido's plugin list. Diagnosed inline and
  REFUTED by Caido's own records: logging.2026-08-27.log holds one clean DefMiner cycle at
  07:27:17Z (init → sqlite 3.46.0 schema v2 → lifecycle installed, active project
  8730d2f3-0fb2-45a8-ae7d-69d210914886 → ready — observing proxied responses → Started),
  with zero errors, warnings or refusals, followed by an operator uninstall at 07:32:29Z.
  The package installed was named "DefMiner", so the correct artifact
  (packages/dist/plugin_package.zip) was used, not the Phase 0 tier-1 probe zip.
  The observation's real cause: DefMiner ships no frontend in Phase 1, so it has no sidebar
  entry and no page — its only visible surface is a row on the Plugins page. Operator
  reinstalled, found the row, and confirmed pass. Cold start verified: schema built from
  nothing, lifecycle bound, plugin ready.

### 2. Plugin builds and installs into a live Caido instance
expected: DefMiner builds as its own Caido plugin package, separate from the Phase 0 tier-1 probe build, and installs into a live instance without hand-editing anything.
source_deliverable: 01-01 D10
result: pass

### 3. End-to-end capture on real Caido 0.58.2
expected: Proxying JavaScript responses produces content-addressed artifacts with a correct seen_count, one observation per distinct request ID, and a host SHA-256 matching the digest read back from the plugin database — with zero hook, consumer, store or queue-overflow errors.
source_deliverable: 01-REVIEW-FIX real-Caido proof (run 20260826T224147Z-25836)
result: pass

### 4. RPC stays responsive under sustained load
expected: The plugin's own RPC keeps answering an external prober throughout a 200-chunk load — a steady stream of replies, not a quiet stretch followed by a burst.
source_deliverable: 01-05 D10
result: pass

### 5. Retention bounds and convergence
expected: Database growth is bounded by row count AND age, per table per project. A retention pass honours and reports its per-pass cap, and repeated passes converge to moreWork = false rather than sweeping forever.
source_deliverable: 01-04 D7
result: pass

### 6. COMPAT-01 refusal message readability
expected: Read as an operator would see it in the host log, the COMPAT-01 refusal explains why DefMiner declined to run and names the version it found — a clear explanation, not an obscure failure.
source_deliverable: 01-06 D5
result: pass
note: "Judged by reading the four refusal texts in compat.ts (no-version, unparseable-version, below-minimum, missing-SDK-surface); the gate could not be fired live because Caido 0.58.2 clears MIN_CAIDO 0.57.1."

### 7. Query-string values redacted in the durable column
expected: A URL carrying a secret in its query string persists to observations.url with the path and the parameter NAMES and their order intact, and the VALUES replaced. The secret appears nowhere in the raw SQLite column or the RPC projection.
source_deliverable: 01-07 coverage block
result: pass

### 8. The path-embedded token — the one named residual
expected: A secret embedded in the URL PATH (not the query string) is the single acknowledged residual of the redaction policy, named as such with its reason in every document describing that column. Confirm that residual is acceptable to keep for this phase.
source_deliverable: 01-11 D7, 01-20 D5
result: pass
note: "Operator accepts the path-embedded token as the phase's one named redaction residual."

### 9. URL grammar disclosure — the open grammars
expected: The enforced URL grammar is stated per grammar, and the grammars that remain open are named rather than implied. Two are named open in schema.spec.ts:231-239 — (1) a token embedded in a path SEGMENT, and (2) the retained NAME HALF of a genuine pair, kept by policy whatever it contains, so a credential pasted in name position reaches the column bounded only by QUERY_NAME_MAX. Confirm the disclosure is accurate and the open set is acceptable.
source_deliverable: 01-10 D3
checkpoint_correction: |
  This checkpoint originally read "the three open grammars", taken from 01-10 D3's
  description. That count is stale: plan 01-11 redacted userinfo and `;` path-parameter
  values, and CR-07 (2026-08-22) corrected the disclosure to name exactly TWO open grammars
  and to match that list rather than a subset of it. Corrected before the operator answered.
result: pass

### 10. Pre-policy observation rows — the LEAVE decision
expected: Observation rows written before the redaction policy landed were left in place rather than swept, on decision P8-D1, with the count measured read-only and no URL value printed or committed. Confirm LEAVE still stands.
source_deliverable: 01-08 (human_judgment: true), 01-15 D8
result: pass
note: "Operator re-confirms decision P8-D1 (LEAVE) at round 2. This is the one genuine human_judgment entry recovered from 01-08-SUMMARY.md's malformed coverage block."

### 11. Error-text redaction boundary — privacy vs diagnosis
expected: In error text, an unquoted path ends at whitespace and its user-bearing prefix is redacted while the tail stays diagnostic; a dotted relative source prefix followed by /, ? or # is instead treated as a schemeless host and redacted. Confirm this is the boundary you want.
source_deliverable: 01-REVIEW-FIX AF-07 / open item 3
result: pass

### 12. Three-leg compatibility rerun
expected: The original compatibility matrix compared real Caido 0.57.1, 0.58.0 and 0.55.3. This host's app bundle auto-updated to 0.58.2 and 0.57.1 is unavailable, so the three-leg rerun could not execute. The historical matrix was not relabelled or fabricated. Confirm the gap is acknowledged rather than papered over.
source_deliverable: 01-14 D6/D7, 01-REVIEW-FIX open item 2
result: pass
note: "Passed as an accurate disclosure, not as an executed rerun. The three-leg matrix (0.57.1 / 0.58.0 / 0.55.3) remains unexecuted on this host — 0.57.1 binaries unavailable, app bundle auto-updated to 0.58.2. Operator accepts the acknowledgement; the historical matrix stands unrelabelled."

### 13. Tracer userinfo reachability
expected: curl converts URL userinfo into an Authorization header before Caido sees the request URL, so the live run does not attest the userinfo URL grammar — the SQLite behavioural tests are the evidence for that branch instead. Confirm that substitution is acceptable.
source_deliverable: 01-REVIEW-FIX open item 4
result: pass
note: "Operator accepts SQLite behavioural tests as the evidence for the userinfo URL branch; the live tracer cannot reach it because curl lifts userinfo into an Authorization header before Caido sees the URL."

### 14. Evidence integrity of the committed runs
expected: Run directories under results/ that predate the IN-21 fix carry a dated pointer amendment that is precise about what is and is not in doubt, and no run directory silently misrepresents what it measured.
source_deliverable: 01-22 D6
result: pass

### 15. Dependency drift left deliberately pinned
expected: New majors exist for ESLint, Knip and TypeScript, and a newer Caido SDK exists. All were left unupgraded as compatibility-contract changes rather than security fixes, keeping the measured Caido 0.57.1 SDK and TypeScript 5 baseline. Confirm holding the pins is right.
source_deliverable: 01-REVIEW-FIX open item 5
result: pass
note: "Operator holds the pins. Not a security deferral: pnpm audit --audit-level low is clean after AF-04 pinned the 22 transitive advisories."

### 16. Toolchain decisions — eslint-config and the knip weakening
expected: @caido/eslint-config@0.10.0 — the one Phase 1 package never exercised in Phase 0 — entered the tree only through an explicit human decision; and knip's exports and types rules were restored to error at the cost of one documented weakening and one @public tag. Confirm both trades.
source_deliverable: 01-02 D7, 01-03 D12
result: pass

### 17. Gitleaks synthetic-secret baseline
expected: Gitleaks found 28 historical matches, all synthetic credential-shaped test payloads or their reports. Only those exact historical fingerprints were baselined — no rule and no path was globally exempted, so a real future secret still trips the scanner.
source_deliverable: 01-REVIEW-FIX AF-08
result: pass

### 18. CORE-11 disposition
expected: CORE-11 (no outbound network request from shipped code) stays `- [ ]` in REQUIREMENTS.md. The must-NOT itself holds — no outbound call in any non-spec source under either root, and the shipped bundle's whole import set is one specifier, `crypto` — but the gate's own disclosure discipline is unsettled and the phase contract assigns that checkbox to verification pass 12. Confirm this stays a verification item rather than a UAT gap.
source_deliverable: round 1 gap 2 carry-forward
result: pass
note: "Operator confirms CORE-11 stays a verification item, not a UAT gap. Round 1's gap 2 is therefore NOT carried into round 2's Gaps section — it remains 01-VERIFICATION.md's single open truth, owned by pass 12. The box stays [ ]."

## Summary

total: 18
passed: 18
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

- gap_id: G-01-1
  truth: "DefMiner installs into a live Caido instance and appears in Caido's plugin list"
  status: withdrawn
  withdrawn_at: 2026-08-27
  withdrawn_reason: "Refuted by Caido's log and confirmed by operator re-check — see test 1 note. Not a code defect. Kept on the record rather than deleted, because the operator-facing fact behind it is real: a backend-only plugin is invisible everywhere except the Plugins page, and that surprised the operator."
  reason: "User reported: he instalado defminer pero no lo veo en caido en la lista de plugins"
  severity: blocker
  test: 1
  note: "Blocks tests 2-14, every one of which needs a loaded plugin. Contrast with 01-REVIEW-FIX.md's run 20260826T224147Z-25836, which installed the built package into an ISOLATED Caido 0.58.2 on port 8971 and succeeded — so the failure is in the operator's install path or the artifact they installed, not necessarily in the package itself."
  root_cause: |
    NOT A CODE DEFECT — refuted by Caido's own log. `logging.2026-08-27.log` records ONE
    clean DefMiner cycle and no error, warning or refusal at any point:
      07:27:17.890  Installing plugin package DefMiner
      07:27:17.891  Installing plugin DefMiner Backend (backend)
      07:27:17.893  Starting plugin DefMiner Backend (c0df60cd-6461-4458-b397-ded5e74d621a)
      07:27:17.905  [defminer] init
      07:27:17.911  [defminer] sqlite 3.46.0 schema v2
      07:27:17.911  [defminer] lifecycle installed; active project 8730d2f3-0fb2-45a8-ae7d-69d210914886
      07:27:17.911  [defminer] ready — observing proxied responses
      07:27:17.911  Started plugin DefMiner Backend
      07:32:29.973  Uninstalling plugin package DefMiner
    (UTC; 09:27 and 09:32 local.) The package installed, migrations built schema v2 from
    nothing, the lifecycle bound to the active project and the plugin reported ready — then
    it was uninstalled five minutes later, which is why `plugins.db` holds no `defminer` row
    now and why the Plugins page is empty of it.
    THE REAL CAUSE OF THE OBSERVATION is that DefMiner ships NO FRONTEND in Phase 1
    (`packages/caido.config.ts` declares one `kind: "backend"` plugin; the package README
    says "does not include a frontend"). It therefore never appears in the sidebar and has
    no page to open — its only visible surface is a row on the Plugins page.
    RULED OUT: the compat gate (`compat.ts:45` sets MIN_CAIDO = "0.57.1" as a MINIMUM, which
    Caido 0.58.2 clears, and by `compat.ts:27` a refusal leaves the plugin installed and
    visible anyway); and the wrong-artifact theory (the log names the package "DefMiner",
    not "DefMiner Tier-1 Parse Probe", so the correct zip was installed).
  artifacts:
    - path: "packages/caido.config.ts"
      issue: "Backend-only package with no frontend plugin — no sidebar entry and no page exists in Phase 1. This is by design for this phase, not a defect; recorded because it is what the operator actually hit."
  missing:
    - "Operator re-check: reinstall packages/dist/plugin_package.zip and confirm the Plugins page lists DefMiner"
  debug_session: "inline — Caido plugins.db + logging.2026-08-27.log"
  disposition: "operator re-checked and passed — NOT a defect. Withdrawn."
