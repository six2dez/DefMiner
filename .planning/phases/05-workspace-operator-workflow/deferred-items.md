# Deferred items — phase 05

Out-of-scope discoveries logged during execution. Not fixed by the plan that
found them; recorded so they are visible rather than lost.

## D-05-07-01 — eight now-redundant `@internal` JSDoc tags

**Found during:** plan 05-07, tasks 1–3.
**Reported by:** `pnpm knip` (Tag hints, 8 entries; hints only — the gate exits 0).

`knip.json` sets `tags: ["-internal"]` so an export tagged `@internal` is excluded
from unused-export reporting. That exemption was needed while eight types were
exported but referenced only inside their own module. Plan 05-07 gave all eight a
real cross-module consumer, so knip now reports each tag as unused:

| File | Export |
|---|---|
| `packages/backend/src/compat.ts` | `SurfaceScope`, `SurfaceOutcome` |
| `packages/backend/src/telemetry.ts` | `Counters`, `SlimStatus` |
| `packages/backend/src/lifecycle.ts` | `ProjectOrNull`, `LifecycleSdk` |
| `packages/backend/src/store/artifacts.ts` | `ArtifactRow` |
| `packages/backend/src/store/observations.ts` | `ObservationRow` |

`knip.json`'s own philosophy says an ignore that has stopped being needed is an
ignore that starts hiding the next real one, so these should be removed.

**Why not removed here.** Plan 05-07's task-1 acceptance criterion requires
`git diff packages/backend/src/store/artifacts.ts packages/backend/src/store/observations.ts`
to be EMPTY — the whole point being that the shipped mixed-direction list
statements are not edited. Two of the eight tags live in those files. Removing
six and leaving two would split one cleanup across two commits and leave the
knip output still non-empty, which is worse than deferring the set: the next
reader would see two hints with no record of why the other six went.

**What to do:** remove all eight tags in one edit, in a plan that is not
diff-locked on those two files.
