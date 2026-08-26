# DefMiner

DefMiner is a Caido backend plugin that passively inventories JavaScript seen in
proxied responses. It hashes raw response bytes, stores artifacts by digest and
records where each artifact was observed.

## Status

The Phase 1 backend foundation is implemented. It includes admission, bounded
queuing, project isolation, SQLite persistence, retention, compatibility checks
and status/read RPCs.

It does **not** yet run secret or endpoint detectors, attribute findings through
source maps or provide a frontend. Those are later phases; the current package
should be treated as a tested ingestion and persistence foundation, not as a
finished finding miner.

Coverage is intentionally proxy-only. Replay, Automate, workflows,
plugin-originated sends, `caido:http` fetches and browser-cache hits do not reach
the passive hook. DefMiner reports what it observed, never everything that
exists on a target.

## Current behavior

- Keeps `onInterceptResponse` synchronous and performs only cheap admission
  checks there.
- Accepts in-scope JavaScript responses up to the measured 8 MiB ceiling and
  puts scalar-only entries on a bounded, drop-oldest queue.
- Reloads responses outside the hook, hashes raw bytes with native SHA-256 and
  stores project-scoped artifacts, observations and analysis state in SQLite.
- Redacts query values from durable observation URLs and redacts URL/path data
  from externally visible error strings.
- Runs bounded retention passes and exposes compatibility, status, artifact and
  observation RPCs.
- Issues no outbound network request from shipped source; a source gate and a
  built-bundle import allowlist enforce that constraint.

## Build and verification

Development requires Node.js 22 or newer and pnpm 11. The plugin refuses passive
analysis below Caido 0.57.1 and reports the compatibility reason.

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm lint
pnpm knip
pnpm check:bundle
```

`pnpm test` builds the backend first so the bundle gate always inspects a fresh
artifact. To build without running tests:

```bash
pnpm build:backend
```

The installable package is written to `packages/dist/plugin_package.zip`.

## Layout

| Path                                 | Purpose                                                                |
| ------------------------------------ | ---------------------------------------------------------------------- |
| `packages/backend/`                  | Caido backend entrypoint, hooks, lifecycle, ingestion and SQLite store |
| `packages/engine/`                   | SDK-free queue, hashing, chunking, deadlines and yield-aware pipeline  |
| `packages/caido.config.ts`           | DefMiner package manifest and build configuration                      |
| `scripts/ci/`                        | Generated-threshold and shipped-bundle gates                           |
| `tests/`                             | Cross-package pins and Phase 0 artifact gates                          |
| `scripts/spike/`, `probe/`, `tier1/` | Preserved Phase 0 runtime measurement harness                          |
| `.planning/`                         | Requirements, decisions, plans and measured evidence                   |

## Phase 0 measurements

The original runtime harness remains reproducible. Fetch its SHA-256-pinned
corpus with `bash scripts/spike/fetch-corpus.sh`, then run individual
`scripts/spike/run-spike-*.sh` drivers against an isolated Caido instance. The
aggregated contract consumed by production thresholds is recorded under
`.planning/phases/00-runtime-reality-check/results/`.

## License

UNLICENSED — not currently distributed.
