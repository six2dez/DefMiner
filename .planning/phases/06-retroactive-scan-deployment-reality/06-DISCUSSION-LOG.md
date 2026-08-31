# Phase 6: Retroactive Scan & Deployment Reality - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `06-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-08-31
**Phase:** 06-retroactive-scan-deployment-reality
**Areas discussed:** Ingestion path for retro traffic, Scan scope & the HTTPQL filter, Cursor
durability & cancel semantics, Progress surface & denominator, Delivery path, Deployment matrix
scope & evidence, Quota & orphan cleanup

**Areas offered but not selected:** Server-storage labelling when nothing is stored — resolved as a
consequence of the delivery decision (D-19) rather than discussed on its own.

---

## Ingestion path for retro traffic

### Q1 — How does the scan get work into the pipeline without starving live browsing?

| Option | Description | Selected |
|--------|-------------|----------|
| Same queue, backpressured producer | Offers into the same BoundedQueue and consumer, pages only below a depth watermark; live traffic always wins | ✓ |
| Same queue, unthrottled producer | Simplest; queue drops oldest at cap so a backfill provably discards live entries | |
| Separate serial drain | Full isolation; a second implementation of the analysis path | |

**User's choice:** Same queue, backpressured producer.

### Q2 — How are retro admissions and rejections attributed in telemetry?

| Option | Description | Selected |
|--------|-------------|----------|
| Parallel retro-scoped counter set | Same closed REJECT_REASONS vocabulary counted twice; one counters object, two sub-maps | ✓ |
| One shared counter set, scan reports its own totals | Cheapest; OBS-01's numbers stop describing live proxying | |
| Retro increments nothing; scan state only | Live telemetry provably untouched; a retro rejection becomes invisible in Health | |

**User's choice:** Parallel retro-scoped counter set.

### Q3 — What should the scan skip before it offers?

| Option | Description | Selected |
|--------|-------------|----------|
| Skip request_ids with a `done` analysis; re-offer partial/failed | One bounded read per page instead of thousands of reloads; repairs earlier failures | ✓ |
| Skip every request_id with an observation row | Cheapest predicate; a failed analysis becomes permanently invisible to every future scan | |
| Never skip — let content-hash dedupe absorb it | No missed item; pays the full reload cost to discover there was nothing to do | |

**User's choice:** Skip done, re-offer partial/failed.

### Q4 — What happens to a running scan on project switch or close?

| Option | Description | Selected |
|--------|-------------|----------|
| Suspend, keep the cursor, explicit resume | Nothing written under a stale epoch, nothing silently restarts | ✓ |
| Suspend and auto-resume on return | Less friction; a scan resumes without being asked | |
| Abort and discard the cursor | Simplest lifecycle; contradicts FIND-03 where resumption matters most | |

**User's choice:** Suspend with cursor, explicit resume.

---

## Scan scope & the HTTPQL filter

### Q1 — What does the operator supply when starting a scan?

| Option | Description | Selected |
|--------|-------------|----------|
| DefMiner's asset filter AND an optional operator HTTPQL | Operator may narrow, never widen; combination is a string build needing its own gate | ✓ |
| Free-text HTTPQL only | Full query power; an empty filter pulls every stored body at 20 per page | |
| No HTTPQL — composed from scope and host | Smallest surface; gives up the push-down FIND-03 names | |

**User's choice:** DefMiner's filter AND an optional operator clause.
**Notes:** Raised and left open as O-06 — how the two clauses are combined and what polices it.

### Q2 — How aggressive should DefMiner's push-down clause be?

| Option | Description | Selected |
|--------|-------------|----------|
| Narrow, proven a superset of `admit()`'s kind axis | A disagreement is a red test, not a silently missed bundle; needs live fixtures | ✓ |
| Broad (2xx with a body), local admit decides | Complete by construction; every body in range crosses at 20 per page | |
| Narrow, mirroring admit closely, unproven | Fewest pages, no proof obligation; the two predicates drift silently | |

**User's choice:** Narrow, proven superset.
**Notes:** The proof obligation became O-03 — HTTPQL semantics are not derivable from the type
definitions.

### Q3 — Does a retroactive scan apply Caido's scope engine?

| Option | Description | Selected |
|--------|-------------|----------|
| Always applied, no override | Retro is never looser than live; scope is the authorization statement | ✓ |
| Applied by default, overridable with confirmation | Allows a deliberate wider backfill; an override writes rows for excluded hosts | |
| Not applied — the operator's HTTPQL is the scope statement | One place to express intent; the two paths disagree about what DefMiner may look at | |

**User's choice:** Always applied, no override.
**Notes:** Accepted consequence — traffic captured while a host was in scope becomes unscannable
once that host leaves scope. To be stated in the UI, not hidden.

### Q4 — What happens when a backfill exceeds the retention headroom and evicts its own results?

| Option | Description | Selected |
|--------|-------------|----------|
| Detect via `sweepRetention`'s `deleted`, suspend at the cursor, report why | Nothing silently lost; resumable after the operator raises the cap or narrows the filter | ✓ |
| Let retention do its job; document the consequence | No new machinery; the failure is silent by design and looks like a failed scan | |
| Suspend the sweep for the duration of a scan | Results land coherently; the database is deliberately unbounded for hours | |
| Ask for a ceiling up front | Explicit; asks the operator to guess a number about an uncountable set | |

**User's choice:** Detect and stop, reporting why.

---

## Cursor durability & cancel semantics

### Q1 — Where does a scan's cursor and state live?

| Option | Description | Selected |
|--------|-------------|----------|
| A new project-scoped `scans` table | Survives restart, gives progress a real data source; EXPECTED_TABLES grows to six | ✓ |
| The existing `settings` table | No migration; runtime state hiding in a closed config-key surface | |
| In memory only | No persistence machinery; drops the case FIND-03's resumable cursor exists for | |

**User's choice:** A new `scans` table.

### Q2 — What does cancel do?

| Option | Description | Selected |
|--------|-------------|----------|
| One control that pauses; discard is separate | One suspended state; a mis-clicked cancel costs nothing | ✓ |
| Cancel is terminal; the cursor is discarded | Unambiguous verb; a mis-click on a three-hour backfill is unrecoverable | |
| Two buttons: Pause and Cancel | Most explicit; two adjacent controls where one is irreversible | |

**User's choice:** Pause-only cancel, separate discard.

### Q3 — What does `init()` do with a `running` row after a crash?

| Option | Description | Selected |
|--------|-------------|----------|
| Move running → suspended with a reason; never auto-resume | Applies ERR-02's rule early; Phase 2 inherits the pattern | ✓ |
| Auto-resume at init | Survives a restart unattended; contradicts the project-switch decision | |
| Leave it; Phase 2 owns startup recovery | Phase 6 touches no Phase 2 requirement; the row reads running forever | |

**User's choice:** running → suspended at init.
**Notes:** Acknowledged as shipping a slice of a Phase 2 requirement; the plan must say so out loud.

### Q4 — Which direction does the backfill walk?

| Option | Description | Selected |
|--------|-------------|----------|
| Descending — newest first, back into history | The live hook owns the present, the scan owns the past; new traffic never re-walked | ✓ |
| Ascending — oldest first, toward the present | Cursor stable under append; operator waits longest for what they care about most | |
| Operator picks the direction | Two orderings and two resumption behaviours; a choice with no visible basis | |

**User's choice:** Descending, newest first.

---

## Progress surface & denominator

### Q1 — Where does the scan live in the workspace?

| Option | Description | Selected |
|--------|-------------|----------|
| A fifth Scan tab plus a compact toolbar indicator | Visible from every tab while running; the toolbar gains its first stateful element | ✓ |
| A fifth Scan tab only | One place, no cross-tab state; heavy serial work with no on-screen explanation | |
| Inside the Health tab | Health is the operational surface; puts a job-starting form in a read-only panel | |

**User's choice:** Fifth tab plus toolbar indicator.

### Q2 — What is progress made of?

| Option | Description | Selected |
|--------|-------------|----------|
| Absolute counters plus the current position's timestamp; no percentage | Honest and free; the timestamp answers "how far back am I" | ✓ |
| A counting pass first, then a real percentage | Doubles the most expensive thing the feature does | |
| Percentage against an operator-supplied total | Familiar bar; a percentage of a guess rendered as measurement | |

**User's choice:** Counters plus position timestamp, no percentage.

### Q3 — How does progress reach the frontend?

| Option | Description | Selected |
|--------|-------------|----------|
| Same coalescer, a new scan category | One mechanism; the 2/second cap is already right for a progress readout | ✓ |
| Frontend polls a getScanStatus RPC | Zero events when the workspace is closed; introduces polling beside the coalescer | |
| A separate event channel with its own throttle | Tuned for progress; two throttles and two flood origins | |

**User's choice:** Same coalescer, new category.

### Q4 — Does a scan write to the audit table?

| Option | Description | Selected |
|--------|-------------|----------|
| Only when it destroys something | Matches D-06's stated subject; keeps the age-exempt ledger for irreversible actions | ✓ |
| Every scan lifecycle event | Complete history; competes with projections in a row-bounded table | |
| Nothing in audit; `scans` rows are the whole record | One record; the eviction evidence ages out with the row | |

**User's choice:** Only when a scan destroys something.

---

## Delivery path

### Q1 — Does Phase 6 build a server-side delivery path?

| Option | Description | Selected |
|--------|-------------|----------|
| Extend D-04 project-wide — RPC download is the only delivery path | hostedFile declined; DEPLOY-04 loses its subject; Phase 7's traversal suite becomes vacuous | ✓ |
| Build the server-disk substrate now; delivery over the RPC download | Honours the roadmap dependency; builds quota machinery for a consumer that does not exist | |
| Build hostedFile delivery now, as the roadmap intends | Satisfies DEPLOY-03's first-named mechanism; create-only/no-delete makes DEPLOY-04 impossible | |
| Defer the whole question to Phase 7 | Nothing speculative built; ROADMAP's Phase 7 dependency becomes false | |

**User's choice:** Extend D-04 project-wide.
**Notes:** The decisive facts were surfaced during discussion — `HostedFileSDK` is `getAll()` and
`create()` with no delete and no expiry, so DEPLOY-03's expiry rules and DEPLOY-04's orphan cleanup
are inexpressible against it; and DEPLOY-03's own wording names "a bounded authenticated frontend
download" as an equal alternative. Recorded as resting on O-01 (can Phase 7's reconstructed source
live in SQLite within QuickJS memory) — the planner must not treat that as settled.

### Q2 — What enforces "nothing lands on server disk"?

| Option | Description | Selected |
|--------|-------------|----------|
| Ban the fs import and `sdk.hostedFile` in the 01-09 eslint rule family | Bans the capability, not the usage; firing and legal fixtures per rule | ✓ |
| A static AST gate in the sql-discipline.spec.ts style | Strongest reach; a third gate pattern in a codebase that has two | |
| A grep in the plan's acceptance criteria | Cheapest, has precedent; binds one file at one moment | |

**User's choice:** eslint rule in the 01-09 family.

### Q3 — What does the Settings surface say for DEPLOY-02?

| Option | Description | Selected |
|--------|-------------|----------|
| Never show a path; state where data lives and whether it survives a restart | The path leaks an OS username and the operator cannot reach it anyway | ✓ |
| Show the labelled left-truncated path plus the statement | Finally gives 05-12's renderer a data source; re-introduces the username string | |
| A fixed prose statement, no detection, no path | Unfalsifiable; cannot warn the Docker-without-a-volume operator | |

**User's choice:** Never a path; state location and persistence.
**Notes:** Recorded as O-02 — with the filesystem banned, what the backend can learn about its own
deployment shape from the SDK alone determines whether the persistence sentence can be conditional.

---

## Deployment matrix scope & evidence

### Q1 — What counts as "tested against four deployment shapes"?

| Option | Description | Selected |
|--------|-------------|----------|
| Scripted harness per shape, Phase 0's result-artifact pattern | Re-runs as evidence; the phase's largest single build | ✓ |
| Scripted where scriptable, operator checklist for the rest | Honest about reach; one leg unrepeatable | |
| Operator checklist for all four | Real signal from a real Caido; nothing re-runs | |

**User's choice:** Scripted harness per shape.

### Q2 — Which Caido version does the matrix assert?

| Option | Description | Selected |
|--------|-------------|----------|
| Its own pinned constant, asserted before any result is recorded | Separate from Phase 1's threshold tripwire so neither contaminates the other | ✓ |
| Accept any version at or above MIN_CAIDO | Never blocked; four legs can run against four different Caidos and read green | |
| Pin to `latest` on every leg | The only reliably fetchable tag; `latest` moves and the artifact stops identifying a build | |

**User's choice:** Its own pinned constant.
**Notes:** Recorded as O-05 — whether the Docker image can be pinned to the same version, given
PROJECT.md's P6-D5 that api.caido.io 404s non-`latest` versions.

### Q3 — What does each leg assert?

| Option | Description | Selected |
|--------|-------------|----------|
| Loads, migrates, ingests one artifact, restart-persistence | Four assertions that each genuinely differ by shape | ✓ |
| Loads, init succeeds, migrations run | Smallest viable leg; never exercises what DEPLOY-01 exists to catch | |
| Full end-to-end on every leg | Strongest claim; a harness larger than the feature it tests | |

**User's choice:** Loads / migrates / ingests / restart-persistence.

### Q4 — What if a leg is unreachable?

| Option | Description | Selected |
|--------|-------------|----------|
| Record NOT RUN with the reason; never a pass; the phase can complete | Matches 05-VERIFICATION's insufficient_spec discipline | ✓ |
| The phase blocks until every leg runs | Strongest guarantee; stalls a finished feature on infrastructure | |
| Substitute a labelled local approximation | Something runs on every leg; a green leg asserts what it cannot know | |

**User's choice:** Record NOT RUN with the reason.

---

## Quota & orphan cleanup

### Q1 — What does the phase ship for DEPLOY-04?

| Option | Description | Selected |
|--------|-------------|----------|
| Satisfied by construction, with a gate that keeps it true | No BLOB in the schema plus no files means nothing unbounded remains; ship the proof | ✓ |
| Ship a real byte quota measured from the database | The honest number for a shared instance; buys a PRAGMA allowlist argument | |
| Build the file quota and orphan-cleanup machinery anyway | A ready substrate for Phase 7; tests fixtures of a thing that cannot exist | |

**User's choice:** Satisfied by construction, with a schema gate.
**Notes:** Established during discussion by reading `migrations.ts` — there is no BLOB column and
no body storage anywhere, so row bounds are effectively byte bounds.

### Q2 — Should the workspace report how much is stored?

| Option | Description | Selected |
|--------|-------------|----------|
| Row counts against their caps, beside the DEPLOY-02 statement | Uses shipped count functions; no PRAGMA, no new discipline exception | ✓ |
| No — leave storage reporting to Phase 2's OBS work | One requirement in one phase; the suspended-by-retention operator has no surface | |
| Yes, and in actual bytes via PRAGMA | What a shared instance's owner cares about; derivable from counts as it is | |

**User's choice:** Row counts against caps.

### Q3 — Does the `scans` table participate in retention?

| Option | Description | Selected |
|--------|-------------|----------|
| Exempt the suspended STATE, not the table | The exemption attaches to a state, so it does not widen D-06's precedent | ✓ |
| Normal retention, with the UI warning first | One rule per table; the operator can lose a resumable backfill to a timer | |
| Row-bound only, like audit — the whole table age-exempt | Durable scan history; makes D-06's single exception into two | |

**User's choice:** Exempt the suspended state, not the table.

---

## Claude's Discretion

None. The operator answered every question; nothing was delegated. Seven questions surfaced open
items (O-01 … O-07 in CONTEXT.md) that the researcher settles from evidence and the planner
escalates rather than answering — those are research obligations, not discretion.

## Deferred Ideas

- More than one scan per project, or a queue of scans — never raised as a requirement; one at a
  time should be an explicit invariant rather than an accident.
- A durable long-term record of every filter ever run — declined under Q4 of the progress area; it
  would fill the age-exempt `audit` ledger with background-job chatter.
- Database size in bytes on Health via `PRAGMA page_count` — declined under Q2 of the quota area;
  revisit only if Phase 7 stores content, which is O-01.
- Server-disk quota and orphan-cleanup machinery — declined under the delivery decision; returns as
  a set, not piecemeal, if O-01 forces D-17 to be re-opened.
- Removing the eight now-redundant `@internal` JSDoc tags, carried from phase 05's
  `deferred-items.md` (D-05-07-01). Not a Phase 6 obligation.
