# DefMiner

A Caido plugin that mines proxied JavaScript for secrets, endpoints and other
findings, with sourcemap-aware position attribution.

**Status: Phase 0 — runtime reality check.** No product code exists yet. What is
here is a measurement harness that establishes what Caido's QuickJS backend
runtime can actually do, so that every size ceiling, budget and degradation
threshold in the phases that follow is a measured number rather than an
assumption.

## Layout

| Path | What it is |
|---|---|
| `.planning/` | Requirements, roadmap, phase plans and the recorded spike results |
| `scripts/spike/` | The Phase 0 measurement harness — instance launcher, probe driver, RSS sampler, corpus fetcher, controlled origin, result writer |
| `probe/` | Tier-0 probes: hand-rolled plugin zips, no build step |
| `tier1/` | Tier-1 probes: built by `caido-dev build` through Caido's own tsup pipeline, for the spikes where the build itself is under test |
| `tests/` | Artifact gates — schema validation and per-spike result assertions |
| `corpus/` | SHA-256-pinned third-party bundles, fetched on demand (gitignored) |

## Running the Phase 0 spikes

Requires a local Caido 0.57.1. Every script asserts the version of the
app-bundle binary before recording any measurement, because a stale `caido-cli`
on `PATH` will otherwise be measured instead.

```bash
pnpm install
bash scripts/spike/fetch-corpus.sh        # SHA-256 gated, fails closed
pnpm exec caido-dev build                 # Tier-1 probes
pnpm vitest run                           # artifact gates
```

Individual spikes are driven by `scripts/spike/run-spike-*.sh`. Each launches an
isolated, disposable Caido instance on its own port and data path, and tears it
down with `SIGKILL`. None of them touches a Caido instance they did not start.

## Results

Per-spike results are written to
`.planning/phases/00-runtime-reality-check/results/SPIKE-NN.json` and validated
against `spike-result.schema.json`. Later phases read the aggregated
`go-no-go.json`, never the individual files.

## License

UNLICENSED — not currently distributed.
