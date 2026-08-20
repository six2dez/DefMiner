---
schema_version: 1
open_count: 1
waived_count: 0
fixed_count: 1
total_count: 2
last_updated: 2026-08-20T12:45:07.474Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 00 | unrun-verify | scripts/spike/recorder-session.sh |  | Task 3 optional human-check not run: operator has not routed a real browser through 127.0.0.1:8998. Scripted sessions collect regardless. | open |  | 2026-08-20T12:42:36.666Z |  |
| 2 | 00 | deviation | tests/spike-results.spec.ts | 47 | Gate asserts every threshold value is non-null, but spike-result.schema.json permits null for the inconclusive cross-day case. Plan 00-04 must reconcile. | fixed |  | 2026-08-20T12:42:36.735Z | 2026-08-20T12:45:07.474Z |

````json
[
  {
    "id": 1,
    "kind": "unrun-verify",
    "phase": "00",
    "file": "scripts/spike/recorder-session.sh",
    "line": null,
    "description": "Task 3 optional human-check not run: operator has not routed a real browser through 127.0.0.1:8998. Scripted sessions collect regardless.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-20T12:42:36.666Z",
    "resolved_at": null
  },
  {
    "id": 2,
    "kind": "deviation",
    "phase": "00",
    "file": "tests/spike-results.spec.ts",
    "line": 47,
    "description": "Gate asserts every threshold value is non-null, but spike-result.schema.json permits null for the inconclusive cross-day case. Plan 00-04 must reconcile.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-20T12:42:36.735Z",
    "resolved_at": "2026-08-20T12:45:07.474Z"
  }
]
````
