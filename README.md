# DefMiner

**A passive JavaScript inventory for [Caido](https://caido.io).** It watches the
scripts a target actually serves you, stores each one once, and reconstructs
their original source when a source map is available — without ever sending a
request of its own.

---

## What it does

As you browse through Caido, DefMiner looks at every proxied response and keeps
the JavaScript.

- **Inventory by content, not by URL.** Each script is hashed and stored once per
  digest. The same bundle served from ten paths is one artifact with ten
  observations, so you see distinct scripts rather than repeated requests.
- **Original source, recovered.** When a script carries an inline source map,
  DefMiner reconstructs the pre-minification sources and shows them as a
  browsable tree — the real file names, the real directory structure, the real
  code.
- **Retroactive scanning.** Installed DefMiner after the interesting browsing
  already happened? The Scan tab replays the same analysis over traffic Caido
  captured earlier, walking backwards from now.
- **Evidence you can hand over.** Export the inventory to a file, with a redacted
  mode that strips query strings from URLs and source labels.
- **Honest about its own health.** A single-threaded backend chewing a large
  bundle looks exactly like a frozen UI. The Health tab shows queue depth,
  dropped count, jobs in flight and the largest synchronous slice, so you can
  tell those two apart.
- **Built-in Help.** A Help tab explains the behaviours that surprise people,
  and it renders even when the backend is not answering.

## What it does *not* do

Worth being blunt, because the name suggests more:

- **It does not scan for secrets, endpoints or other findings.** The detection
  engine is a planned later phase. Today DefMiner tells you *what JavaScript
  exists* and *what its original source says*. You do the finding.
- **It never makes an outbound request.** Every byte it analyses came from
  traffic Caido already captured. An external `.map` referenced by URL is
  counted, never fetched.
- **Coverage is proxy-only.** Replay, Automate, workflows, plugin-originated
  sends and browser-cache hits do not reach the passive hook. DefMiner reports
  what it observed, never everything that exists on a target.

## Install

From the Caido plugin store: open **Plugins**, find **DefMiner**, install.

To build from source:

```bash
pnpm install
pnpm build
```

That writes `packages/dist/plugin_package.zip`, which you can install through
Caido's **Plugins → Install from file**.

> The `dist/` directory at the repository root belongs to the Phase 0
> measurement probes and is **not** the plugin. The installable package is
> always `packages/dist/plugin_package.zip`.

## Using it

### 1. Set your scope

DefMiner applies **Caido's scope with no override of its own**. A host outside
the active scope is rejected — while browsing and while scanning alike.

This is the single most common reason a new user sees nothing: the traffic is
there, the scripts are there, and every one of them is out of scope.

### 2. Browse

Artifacts appear as you go. Open one to see where it was observed, and — if it
shipped a source map — its reconstructed source tree.

### 3. Or scan what you already captured

The **Scan** tab walks stored traffic backwards from now. You may add an HTTPQL
clause to narrow it; it is combined with DefMiner's own filter using `AND`. You
can narrow a scan, never widen it, and the composed filter is shown before you
start so you can verify that yourself.

**Reading the result matters.** A scan that reports `Finished · 110 seen` may
have admitted *nothing* — `seen` counts what the walk looked at, not what it
kept. Open the scan's detail for `Admitted` and `Rejected`. A healthy scan can
legitimately admit zero, and when it does, the scope is the first thing to
check.

## Behaviours worth knowing before they surprise you

| Behaviour | Why |
|---|---|
| A host that **leaves** scope makes its already-captured traffic unscannable | Admission re-checks scope at analysis time. No filter reaches it; the host has to be back in scope. |
| Scans report no percentage | Counting matching requests would mean transferring every response body — that *is* the scan. DefMiner reports what it has done rather than guessing what is left. |
| Responses over **8 MiB** are not analysed | The backend is single-threaded; the ceiling protects Caido's responsiveness. |
| Source maps over **2.5 MiB** are refused, not truncated | A partly-read map yields sources that look complete and are not. |
| Re-running a scan does not redo finished work | Anything partial or failed *is* re-offered, so a second scan repairs earlier failures rather than cementing them. |
| Data is per-project and bounded | Switching Caido projects switches the inventory. Old rows are evicted on a retention sweep. |

## Where your data lives

DefMiner's SQLite database lives **on the Caido server**, not on the machine
you are looking at. On a remote or containerised Caido that is a different
disk. Nothing is sent anywhere else — the plugin makes no network requests.

## Development

A pnpm workspace with three packages:

| Package | What it is |
|---|---|
| `packages/engine` | Pure analysis: parsing, source maps, digests, thresholds. No SDK, no I/O. |
| `packages/backend` | The Caido backend plugin: admission, queueing, SQLite, RPCs. |
| `packages/frontend` | The Vue workspace page. |

```bash
pnpm test        # full suite
pnpm typecheck
pnpm lint
pnpm knip        # unused exports
pnpm build       # -> packages/dist/plugin_package.zip
```

The codebase leans hard on executable assertions over prose. Thresholds stated
in user-facing copy are asserted against the constants themselves, so a limit
that moves fails a test rather than quietly making a sentence wrong.

## Contributing

Issues and pull requests are welcome. When reporting a problem, the **Health**
tab's four numbers and the scan's `Admitted` / `Rejected` counts are the two
most useful things to include.

## License

[MIT](LICENSE) © six2dez
