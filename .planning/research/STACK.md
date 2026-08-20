# Stack Research

**Domain:** Caido plugin — offensive-security static analysis of JavaScript/static assets, heavy backend compute inside QuickJS
**Researched:** 2026-08-20
**Confidence:** HIGH (every load-bearing claim was verified empirically against a real QuickJS engine, real npm metadata, or source code read from `caido-community/dev`)

> **How this was produced.** Versions come from live `npm view`, not memory. The QuickJS parser question was not reasoned about — it was **measured**: candidate parsers were bundled with the exact esbuild/tsup configuration `caido-dev` uses, then loaded and run inside **native `quickjs-ng` 0.16.1** and inside `quickjs-emscripten`, against real 1–5 MB minified bundles (echarts 5.5.1, monaco-editor 0.52.2, TypeScript 5.8.3) and a real 12.7 MB monaco sourcemap. Raw numbers are in [Appendix A](#appendix-a--raw-benchmark-data).

---

## Executive Summary — the seven answers

| # | Question | Answer |
|---|----------|--------|
| 1 | What does the scaffold generate? | `@caido-community/create-plugin@0.5.0`, two templates (`frontend-vue`, `no-frontend`). **It is stale** — pins `@caido/sdk-*@^0.46.0` while current is **0.57.1**. Upgrade immediately after scaffolding. |
| 2 | **Which AST parser runs in QuickJS?** | **`meriyah@7.3.2`** — verified running in native quickjs-ng, **3.0 s / 162 MB** for a 4.9 MB minified bundle, **2.4× faster than acorn**. Requires a `structuredClone` guard. Fallback: **`acorn@8.18.0`**. **oxc and swc are impossible** — QuickJS has no `WebAssembly` (verified: `typeof WebAssembly === "undefined"`; LLRT README marks `WASM-JS-API-2 ✘`). |
| 3 | Sourcemaps | **`@jridgewell/sourcemap-codec@1.5.5`** — 2.0 KB minified, decodes a 3.7 MB mappings string in **554 ms** in QuickJS. `source-map@0.8` is **disqualified** (ships `mappings.wasm` + leaks `fs`/`path`/`url` as unbundlable externals). And: DefMiner's *primary* sourcemap feature needs **no VLQ at all** — `JSON.parse` + `sourcesContent` recovers 781 sources in **21 ms**. |
| 4 | Frontend | Vue **3.5.x** + PrimeVue **4.1.0 (exact — hard peer pin)** + `@caido/primevue@0.3.3` in `unstyled: true, pt: Classic` mode + Tailwind **3.4.13 (v3, NOT v4)** + `postcss-prefixwrap`. |
| 5 | Testing | **Vitest**, `environment: "node"`. Backend `caido:*` imports are handled with **`vi.mock("caido:utils", () => ({...}))`** plus a hand-written `createMockSDK()` factory — this is exactly what `caido-community/scanner` does. |
| 6 | Build | `caido-dev build` / `caido-dev watch` + the **Devtools** plugin over a local WS server. Backend = **tsup 8.3.5, ESM, `target: esnext`, `config: false`** (unconfigurable). Frontend = **Vite 6.0.7**. |
| 7 | What NOT to use | Anything WASM, anything napi-native, anything importing Node builtins (they are marked `external` and **silently survive bundling, then explode at runtime**), Tailwind v4, PrimeVue 5, TypeScript 7, `source-map`, `esprima`, `escodegen`. |

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Caido app** | `0.57.1` | Target runtime | Current stable (`api.caido.io/releases/latest`, 2026-08-20). SDK versions track the app version **exactly** — do not mix. |
| **`@caido/sdk-backend`** | `0.57.1` | Backend types + `caido:*` module typings | Types-only devDependency; the runtime is injected by Caido. Pulls `@caido/quickjs-types@0.26.0`. |
| **`@caido/sdk-frontend`** | `0.57.1` | Frontend SDK types | Peers: `vue ^3.0.0`, `@codemirror/view ^6`, `@codemirror/state ^6`, `@ai-sdk/provider ^3.0.1`. |
| **`@caido-community/dev`** | `0.1.7` | Build/watch/package toolkit (`caido-dev`) | The only supported build path. Internally: tsup 8.3.5 (backend), Vite 6.0.7 (frontend), jszip, express+ws (dev server). |
| **`@caido-community/create-plugin`** | `0.5.0` | Scaffold | `pnpm create @caido-community/plugin`. **Stale — see [Scaffold Reality Check](#scaffold-reality-check).** |
| **TypeScript** | `5.8.3` | Language | Proven by `scanner`. **Not TS 7** — `knip@5` peers `typescript >=5.0.4 <7`, and the vue-tsc/typescript-eslint chain is not on 7 yet. |
| **pnpm** | `>=9` | Package manager | Mandated by Caido docs; workspace protocol used by every community plugin. |
| **Node.js** | `20` or `22` LTS | Build host only | `create-plugin` engines: `^18 \|\| >=20`. Never confuse this with the plugin runtime. |

### Backend Analysis Libraries (must survive QuickJS)

| Library | Version | Purpose | Why This One |
|---------|---------|---------|--------------|
| **`meriyah`** | `7.3.2` | **Primary JS/ES2023 AST parser** | Verified running in native quickjs-ng. **3,043 ms / 162 MB** for 4.91 MB minified vs acorn's 7,327 ms / 205 MB. Pure JS, zero deps, no Node builtins, 304 KB bundled. Actively maintained (published 2026-08-17, 1.2k★). ESTree-compatible output. |
| **`acorn`** | `8.18.0` | **Fallback parser + tokenizer** | The reference ESTree parser (11.4k★). 2.4× slower but bulletproof, and its `tokenizer()` gives an **AST-free streaming mode at 6 MB peak heap instead of 205 MB** — the escape hatch for oversized bundles. Also emits a *graceful* `SyntaxError: Not enough stack space to parse` where meriyah throws a raw `RangeError`. |
| **`@jridgewell/sourcemap-codec`** | `1.5.5` | VLQ decode/encode | **1,961 bytes minified / 1,054 gz.** Pure JS, zero deps, zero Node builtins. 554 ms on a 3.7 MB mappings string in QuickJS. The engine behind Rollup/Vite/Svelte. |
| **`@jridgewell/trace-mapping`** | `0.3.31` | Position mapping (`originalPositionFor`) | Only add if you need minified-position → original-position lookups. 6.2 KB, 570 ms incl. 1000 lookups. **5× faster and 5× smaller than `source-map-js`.** |
| **`zod`** | `4.3.6` | Runtime validation of API payloads & persisted config | Exact version proven in `caido-community/scanner`'s **backend** package — i.e. already known-good in Caido's QuickJS. |
| **`js-beautify`** | `1.15.4` | On-demand pretty-print of minified/reconstructed source | Verified in QuickJS (2,765 ms for 0.98 MB). Used by `caido-community/JS-Analyzer` in its backend. **On-demand only — never in the passive path.** |

### Frontend Libraries

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| **`vue`** | `3.5.41` | UI framework | `scanner` runs 3.5.27; 3.5.x required by pinia/vueuse peers. |
| **`primevue`** | **`4.1.0` (EXACT)** | Component library | **Hard constraint:** `@caido/primevue@0.3.3` declares `peerDependencies: { "primevue": "4.1.0" }` — an exact pin, not a range. **PrimeVue 5 will break the Caido theme.** |
| **`@caido/primevue`** | `0.3.3` | Caido pass-through theme | Consumed as `app.use(PrimeVue, { unstyled: true, pt: Classic })`. Exports `Classic` from `dist/primevue.mjs`. |
| **`@caido/tailwindcss`** | `0.1.0` | Caido colour/utility Tailwind plugin | `dependencies: { tailwindcss: "3.4.13" }` — locks you to Tailwind v3. |
| **`tailwindcss`** | **`3.4.13` (EXACT)** | Styling | **Not v4.** `caido.config.ts` calls `tailwindcss({...})` as a *PostCSS plugin with an inline config object*; Tailwind v4 removed that API entirely. |
| **`tailwindcss-primeui`** | `0.6.1` | Tailwind↔PrimeVue bridge | Used by `scanner` and `authmatrix`. |
| **`postcss-prefixwrap`** | `1.57.2` | Wraps all CSS in `#plugin--<id>` | **Mandatory** — prevents style bleed between plugins. |
| **`pinia`** | `3.0.4` | Frontend state (asset inventory, findings table) | Peer `vue ^3.5.11`. Proven in `scanner`. |
| **`@vueuse/core`** | `14.2.0` | Composables | Proven in `scanner`. |
| **`vue-virtual-scroller`** | `2.0.0-beta.8` | Virtualised findings/asset tables | `scanner` uses exactly this for large result sets. DefMiner will have thousands of rows — do not render them all. |
| **`@codemirror/view` / `@codemirror/state`** | `6.39.12` / `6.5.4` | Reconstructed-source viewer | **Must be `external` in the Vite rollup config** (Caido provides them) — see `caido.config.ts` externals list. |

### Development Tools

| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| **Vitest** | `4.1.11` | Unit tests | `environment: "node"`. `create-plugin` itself, `quickssrf` (4.1.2) and `shift` (4.0.18) are on v4; `scanner` is on 3.2.3. |
| **`@vitest/coverage-v8`** | `4.1.11` | Coverage | Must match vitest version exactly (peer pin). Needed for the "measured false-positive rate" release gate. |
| **`@caido/eslint-config`** | `0.10.0` | Lint preset | Bundles typescript-eslint 8.59.2, eslint-plugin-vue 10.6.0, `eslint-plugin-no-unsanitized`. Peers: `eslint >=9`, `prettier ^3`. |
| **`eslint`** | `9.39.2` | Linting | **Stay on 9.x** — `@caido/eslint-config@0.10.0` pins `@eslint/js@9.17.0` internally; ESLint 10 is untested against it. |
| **`prettier`** | `3.8.1` | Formatting | Peer requirement of the eslint config. |
| **`knip`** | `5.86.0` | Dead-code / unused-dep detection | **Stay on 5.x** — the scaffold's `knip.ts` imports `knip/dist/types/config.js`, a v5 internal path. Part of `pnpm validate` in `scanner`. |
| **`vue-tsc`** | `3.2.4` | Frontend typecheck | `scanner`'s version. |
| **`@types/node`** | `25.2.1` | Build-host types | **Backend `tsconfig.json` must NOT include this** — it makes Node globals typecheck that do not exist in QuickJS. Use `"types": ["@caido/sdk-backend"]`. |
| **`@vitejs/plugin-vue`** | `6.0.1` | Vue SFC compilation | `scanner`/`shift` version. |
| **Devtools plugin** | latest from Community Store | Hot reload | Connect it to `http://localhost:3000` after `pnpm watch`. |

---

## The QuickJS Question — Evidence, Not Opinion

### Ground truth on the runtime

> "Javascript in the backend (from `Workflows` and `Backend Plugins`) runs in a small embedded engine called **QuickJS**. This engine supports most of the **ES2023 specification**… By default this engine doesn't come with any of the modules you might expect from NodeJS."
> — `developer.caido.io/plugins/concepts/runtime.md`

The `@caido/quickjs-types` module tree (`llrt/fs`, `llrt/buffer`, `llrt/net`, `llrt/child_process`, `llrt/url`, `extra/sqlite`, `extra/timers`) is **AWS Labs LLRT**'s module namespace. That makes LLRT (rquickjs → QuickJS) the near-certain host, which independently confirms the WASM verdict.

### WebAssembly: definitively unavailable

Two independent confirmations:

1. **Empirical.** In native `quickjs-ng` 0.16.1 and in `quickjs-emscripten`: `typeof WebAssembly === "undefined"`.
2. **Documentary.** [LLRT README](https://github.com/awslabs/llrt) compatibility table: `WASM-JS-API-2 ✘`, `WASM-WEB-API-2 ✘`.

**Consequence:** `oxc-parser` (19 platform-specific `@oxc-parser/binding-*` napi native addons), `@swc/wasm-web` (WASM), `@swc/core` (napi), `esbuild` (Go binary), and `source-map@0.8` (`lib/mappings.wasm`) are **all structurally impossible**. This is not a performance tradeoff; there is no loader for them.

### Parser bake-off — measured

All bundled with **the exact config `caido-dev` uses** (`format: esm`, `platform: node`, `target: esnext`, `external: [/caido:.+/, "sqlite", ...builtinModules]`), then executed in **native quickjs-ng 0.16.1**.

**Bundle size (esbuild, IIFE, minified):**

| Parser | min | min+gzip | Runs in QuickJS | Node builtins leaked |
|--------|-----|----------|-----------------|----------------------|
| **acorn 8.18.0** | **118.3 KB** | **33.2 KB** | ✅ | none |
| **meriyah 7.3.2** | 147.2 KB | 42.8 KB | ✅ | none |
| espree 11.2.0 | 255.8 KB | 72.6 KB | ✅ | none |
| @babel/parser 8.0.4 | 281.4 KB | 70.0 KB | ✅ | none |
| oxc-parser 0.146.0 | — | — | ❌ napi native | — |
| @swc/wasm-web 1.16.1 | — | — | ❌ WASM | — |

**Throughput & memory — native quickjs-ng, 4.91 MB minified (5× echarts 5.5.1):**

| Approach | Time | Peak QuickJS heap | Verdict |
|----------|------|-------------------|---------|
| **meriyah `parseScript`** | **3,043 ms** | **162 MB** | ✅ **PRIMARY** |
| acorn `parse` | 7,327 ms | 205 MB | fallback |
| acorn `tokenizer()` + string collect | 3,818 ms | **6 MB** | **low-memory escape hatch** |
| 20 realistic secret/endpoint regexes | 1,009 ms | ~0 | hot-path baseline |
| 20-anchor `indexOf` prefilter | **174 ms** | ~0 | **cheapest gate** |

**Scaling is linear** (quickjs-emscripten harness, AST retained):

| Corpus | meriyah ms / MB heap | acorn ms / MB heap |
|--------|----------------------|--------------------|
| 0.98 MB | 972 ms / 33 MB | 2,162 ms / 42 MB |
| 1.96 MB | 1,967 ms / 65 MB | 4,371 ms / 83 MB |
| 2.95 MB | 2,992 ms / 98 MB | 6,559 ms / 123 MB |
| 4.91 MB | 4,993 ms / 162 MB | 11,211 ms / 205 MB |

⇒ **meriyah ≈ 1.0 s and 33 MB per MB of minified input** (emscripten) / **0.62 s per MB** (native). Budget with the native figure and a 2× safety margin for dense code — on real monaco (4.57 MB, far denser than echarts) meriyah took **2,306 ms** but **acorn took 16,524 ms** (7.2× worse), i.e. acorn's variance on adversarial input is much worse than meriyah's.

**Engine reference points:** V8 parses the same 4.91 MB with meriyah in **180 ms**. Native QuickJS is **~17× slower than V8** on AST parsing and **~9.4× slower on regex** (1,009 ms vs 107 ms for the same 20 patterns). Plan every budget around that.

### ES2023+ syntax coverage — measured in QuickJS

28 syntax probes run against all four parsers **inside quickjs-ng**:

| Feature class | acorn | meriyah | espree | @babel/parser |
|---|:--:|:--:|:--:|:--:|
| ES2020–ES2023 (optional chaining, `??`, logical assignment, numeric separators, BigInt, private fields/methods, static blocks, `#x in o`, TLA, `import.meta`, dynamic import, `export * as`, RegExp `d`/`v` flags, hashbang, object spread, optional catch binding, async generators, `for await`, complex destructuring) | ✅ | ✅ | ✅ | ✅ |
| ES2024/25 (import attributes `with {}`, `using` / `await using`) | ✅ | ✅ | ✅ | ✅ |
| Decorators | ❌ | ✅ | ❌ | plugin only |
| JSX | ❌ | ❌ | ❌ | plugin only |
| TypeScript annotations | ❌ | ❌ | ❌ | plugin only |

**Implication for DefMiner:** for minified *shipped* bundles (the passive path) meriyah's coverage is complete. For **sourcemap-reconstructed sources**, `sourcesContent` frequently contains `.ts`/`.tsx`/`.vue` — meriyah/acorn **cannot** parse those. Do **not** add `@babel/parser` for this: at 281 KB and 4,242 ms/MB (2× slower than acorn, 4.4× slower than meriyah) it is the worst performer measured. Use regex-only analysis on reconstructed non-JS sources, or strip types with a cheap pre-pass. Revisit only if reconstructed-source AST analysis proves high-value.

### ⚠️ meriyah's one landmine: `structuredClone`

`meriyah@7`'s `Parser.cloneIdentifier()` / `cloneStringLiteral()` call the **global `structuredClone`** (`dist/meriyah.cjs:4909`). Bare QuickJS does not define it.

**Measured blast radius:** without the global, `const {a:{b=1}={}, ...r} = o` — an utterly ordinary destructuring pattern — throws `ReferenceError: 'structuredClone' is not defined`. This will not fail on toy inputs; it fails deep inside real bundles.

**Evidence Caido probably provides it:** LLRT implements `structuredClone` (`libs/llrt_utils/src/clone.rs`, `tests/unit/clone.test.ts`, listed in LLRT `API.md`). Confidence: MEDIUM — Caido may build a subset.

**Mitigation (ship this regardless, it costs 6 lines):**

```ts
// packages/backend/src/runtime/polyfills.ts — import FIRST in src/index.ts
if (typeof globalThis.structuredClone !== "function") {
  (globalThis as { structuredClone?: unknown }).structuredClone = function sc(o: unknown): unknown {
    if (o === null || typeof o !== "object") return o;
    if (Array.isArray(o)) return o.map(sc);
    const r: Record<string, unknown> = {};
    for (const k in o as Record<string, unknown>) r[k] = sc((o as Record<string, unknown>)[k]);
    return r;
  };
}
```

`meriyah@6.1.4` has **zero** `structuredClone` references and is the no-polyfill fallback if the guard ever proves insufficient.

### ⚠️ Recursion depth: a `RangeError` you must catch — and a segfault you cannot

Every candidate is a recursive-descent parser. Measured against pathological (but realistic — minifiers emit these) inputs:

| Input | Stack limit | Result |
|-------|-------------|--------|
| `a?b:` × 5000 | 256 KB – 4 MB | `RangeError: Maximum call stack size exceeded` (**catchable**) |
| `a?b:` × 5000 | **8 MB / 16 MB** | **exit 139 — SIGSEGV** (uncatchable) |
| `[` × 2000 nesting | ≤ 1 MB | `RangeError` (catchable) |
| `1+` × 20000 | any | parses fine (49 ms) — meriyah iterates binary chains |
| real 4.91 MB bundle | 256 KB | parses fine — depth is not a function of size |

acorn degrades more gracefully (`SyntaxError: Not enough stack space to parse`, an explicit internal guard); meriyah throws a raw `RangeError`.

**Design requirements this imposes:**
1. Every parse call is wrapped in `try/catch` and treated as fallible. A failed parse degrades to regex-only, it does not fail the scan.
2. Add a **cheap linear pre-scan** for max bracket/ternary nesting depth and skip the AST path above a threshold (~500). This costs microseconds and eliminates the segfault class entirely, since you cannot control Caido's configured stack limit from a plugin.

---

## Sourcemap Decoding — Measured

Corpus: the **real** `monaco-editor@0.52.2` sourcemap — 12.66 MB, 781 sources, 3.67 MB of VLQ mappings, with `sourcesContent`. Native quickjs-ng.

| Approach | Bundle (min/gz) | Time | Result | Verdict |
|----------|-----------------|------|--------|---------|
| **`JSON.parse` + `sourcesContent`** | 0 | **21 ms** | 781 sources recovered | ✅ **This is DefMiner's sourcemap feature.** |
| **`@jridgewell/sourcemap-codec` `decode()`** | **1.9 KB / 1.0 KB** | **554 ms** | full segment array | ✅ **PRIMARY for VLQ** |
| `@jridgewell/trace-mapping` + 1000 lookups | 6.0 KB / 2.7 KB | 570 ms | 837 hits | ✅ add only if mapping positions |
| `source-map-js@1.2.1` + 1000 lookups | 29.1 KB / 9.0 KB | 2,866 ms | 837 hits | ❌ 5× slower, 5× bigger |
| `source-map@0.8.0` | — | — | — | ❌ **DISQUALIFIED** |

**Why `source-map@0.8.0` is disqualified** — two independent hard failures, verified:
1. Ships `lib/mappings.wasm` and `lib/wasm.js` uses `WebAssembly`. No WASM in QuickJS.
2. Bundled with Caido's exact backend config it emits **unresolved external imports of `url`, `fs`, and `path`**, plus a `__dirname` reference. Because `caido-dev` marks all `builtinModules` external, these **survive the build silently** and only fail at runtime.

**The key architectural insight:** JSMiner-parity sourcemap reconstruction is *recovering original files*, which is `JSON.parse` + `sources[]` + `sourcesContent[]` — **21 ms, zero dependencies, zero VLQ**. Add `sourcemap-codec` only for the genuinely position-dependent features (attributing a finding at minified offset N to a specific original file/line). Do that work lazily, per-finding, never for the whole map.

---

## Frontend — How the Caido Theme Is Actually Consumed

Three coupled pieces, verified from `create-plugin@0.5.0` templates and `scanner`/`JS-Analyzer` `caido.config.ts`:

**1. PrimeVue in unstyled + pass-through mode** (`packages/frontend/src/index.ts`):
```ts
import { Classic } from "@caido/primevue";
import PrimeVue from "primevue/config";
app.use(PrimeVue, { unstyled: true, pt: Classic });
```
`@caido/primevue` ships no CSS — it is a **pass-through (`pt`) object** that maps PrimeVue component slots onto Tailwind classes. That is why the exact `primevue@4.1.0` peer pin exists: `pt` keys are version-coupled to PrimeVue's internal slot names.

**2. CSS variable chain** (`src/styles/`): `caido.css` defines `--c-primary-*` / `--c-surface-*` HSL triples (Caido-user-customisable) → `primevue.css` maps them onto `--p-primary-*` / `--p-surface-*` → `index.css` imports both plus `tailwindcss/base|components|utilities`.

**3. PostCSS pipeline in `caido.config.ts`** — Tailwind v3 is invoked **as a PostCSS plugin with an inline config**, which is why v4 is incompatible:
```ts
css: { postcss: { plugins: [
  prefixwrap(`#plugin--${id}`),            // MANDATORY: prevents cross-plugin style bleed
  tailwindcss({
    corePlugins: { preflight: false },     // MANDATORY: preflight would nuke Caido's own styles
    content: ["./packages/frontend/src/**/*.{vue,ts}",
              "./node_modules/@caido/primevue/dist/primevue.mjs"],  // scans the pt object
    darkMode: ["selector", '[data-mode="dark"]'],  // Caido sets this on <html>
    plugins: [tailwindPrimeui, tailwindCaido],
  }),
]}}
```

And the frontend rollup **must** externalise what Caido already provides, or you ship duplicate Vue/CodeMirror:
```ts
external: ["@caido/frontend-sdk", "vue",
  "@codemirror/autocomplete", "@codemirror/commands", "@codemirror/language",
  "@codemirror/lint", "@codemirror/search", "@codemirror/state", "@codemirror/view",
  "@lezer/common", "@lezer/highlight", "@lezer/lr"]
```

---

## Testing — How Real Caido Plugins Do It

**Verified from `caido-community/scanner` (the reference implementation, 4 `*.test.ts` + 10 `*.spec.ts`).**

The problem: backend code imports `caido:plugin` / `caido:utils`, which exist only inside Caido. Two mechanisms, used together:

**1. Type-only imports erase themselves.** For anything used purely as a type, `import type { SDK } from "caido:plugin"` compiles to nothing — vitest never has to resolve it. `scanner` does this for `SDK`, `Request`, `Response` in ~15 files. Prefer this everywhere.

**2. `vi.mock` with a factory intercepts the bare specifier.** For genuine *value* imports (e.g. `RequestSpec`), vitest's factory form never touches the module resolver:
```ts
// scanner/packages/backend/src/api/config.test.ts
vi.mock("caido:utils", () => ({ RequestSpec: class {} }));
```

**3. A hand-written SDK factory.** `scanner/packages/backend/src/__tests__/mockSdk.ts` exports `createMockSDK()` returning a plain object of `vi.fn()`s shaped like the real SDK (`console`, `meta`, `api`, `env`, `events`, `findings`, `requests`, `replay`, `projects`, `scope`, `runtime`, `graphql`, `hostedFile`, `net`). Passed as `createMockSDK() as never`. No `@caido/sdk-backend` runtime dependency involved.

**Config** (`scanner/packages/engine/vitest.config.ts`):
```ts
export default defineConfig({ test: { globals: true, environment: "node" } });
```
`quickssrf` adds `include: ["packages/backend/src/**/*.test.ts"]`; `shift` uses a root config with `include: ["packages/**/src/**/*.spec.ts"]` and an `@` alias.

**The architectural lesson worth stealing:** `scanner` puts its analysis logic in a **separate `packages/engine` workspace** that has *no* Caido SDK value-imports at all — only type imports and a tiny `Runner` interface. That package is trivially unit-testable and 100% of the hard logic lives there. **DefMiner should do the same:** a `packages/engine` (or `packages/detect`) holding parsers, regex detectors, entropy/confidence scoring and the sourcemap decoder — pure functions over strings, testable in Node with zero mocks, plus a paper-thin `packages/backend` that wires the SDK to it. This is also what makes the "measured false-positive rate on a real corpus" release gate mechanically possible.

⚠️ **Vitest runs in V8/Node, not QuickJS.** Green tests do **not** prove QuickJS compatibility. See [Spike 1](#required-spikes).

---

## Build & Tooling — Read From Source

`@caido-community/dev@0.1.7`, `src/build/backend.ts` (verbatim):

```ts
defineConfig({
  target: "esnext",
  entry: [".../src/index.ts"],
  outDir:  ".../dist",
  outExtension: () => ({ js: ".js" }),
  format: ["esm"],
  config: false,          // ← your tsup.config.ts is IGNORED
  clean: true,
  sourcemap: false,
  external: [/caido:.+/, "sqlite", ...builtinModules],   // ← the trap
})
```

**Four consequences you must design around:**

1. **`config: false` — the backend build is unconfigurable.** `src/types.ts` defines `backendPluginConfigSchema` as a **`z.strictObject`** with only `{kind, id, name, root, assets}`. Unlike the frontend, there is **no `vite`/`tsup` escape hatch**. You cannot change the target, add plugins, or alias modules. Anything a backend dependency needs must work as-shipped.
2. **`target: "esnext"` means zero downleveling.** Whatever syntax your dependencies ship lands in QuickJS verbatim. QuickJS is ES2023 — a dependency using ES2024+ syntax would break. (Verified non-issue for meriyah/acorn/sourcemap-codec, all of which target older syntax.)
3. **`...builtinModules` external is the single most dangerous line for this project.** A dependency importing `fs`, `path`, `util`, `crypto`, `stream`, `zlib`… is **not** an error at build time — esbuild leaves a bare `import ... from "fs"` in `dist/index.js`, and you find out at runtime, on a user's machine. **Every backend dependency must be audited for this before adoption.** Reproduce the check locally:
   ```bash
   npx esbuild src/index.ts --bundle --format=esm --platform=node --target=esnext \
     --external:sqlite --external:fs --external:path --external:url ... --metafile=meta.json
   # then assert metafile.outputs[*].imports[*].external is empty
   ```
   Wire this into `pnpm validate` as a **CI gate**.
4. Frontend is Vite **6.0.7**; the `vite:` key in `caido.config.ts` is merged in. Do **not** install Vite 8.

**Undocumented config options found in `src/types.ts`** (absent from `developer.caido.io/plugins/reference/config`): `watch: { port?: number }` and `links: { sponsor?: string }`.

**Watch loop:** `pnpm watch` → `caido-dev watch` → rebuilds backend (tsup) + frontend (vite) → serves `dist/plugin_package.zip` over HTTP + WS on `localhost:3000` → the **Devtools** community plugin (installed in Caido, "Connect" to that URL) live-reloads the package.

---

## Scaffold Reality Check

`pnpm create @caido-community/plugin` runs `@caido-community/create-plugin@0.5.0` (published 2026-05-05; the GitHub `main` templates are byte-identical, so there is no newer unreleased version). It offers **`frontend-vue`** and **`no-frontend`**, and emits:

```
caido.config.ts  tsconfig.json  eslint.config.mjs  knip.ts  pnpm-workspace.yaml
LICENSE  README.md  .gitignore
.github/workflows/{release.yml,validate.yml}
.cursor/rules/*.mdc          (8 files: caido, caido-backend, caido-frontend,
                              components, best-practices, style, linter, sdk-validation)
packages/backend/{package.json,tsconfig.json,src/index.ts}
packages/frontend/{package.json,tsconfig.json,
                   src/{index.ts,types.ts,plugins/sdk.ts,views/App.vue,
                        styles/{index,caido,primevue}.css}}
```

**Generated versions vs. current — upgrade every one of these on day 1:**

| Package | Scaffold pins | Current | Δ |
|---------|---------------|---------|---|
| `@caido/sdk-backend` | `^0.46.0` | **0.57.1** | 11 minors |
| `@caido/sdk-frontend` | `^0.46.0` | **0.57.1** | 11 minors |
| `@caido-community/dev` | `^0.1.3` | **0.1.7** | 4 patches |
| `@caido/primevue` | `0.1.2` | **0.3.3** | 2 minors |
| `@caido/tailwindcss` | `0.0.1` | **0.1.0** | 1 minor |
| `@caido/eslint-config` | `^0.5.0` | **0.10.0** | 5 minors |
| `vue` | `3.4.37` | **3.5.41** | 1 minor |
| `typescript` | `5.5.4` | 5.8.3 (rec.) | 3 minors |
| `@vitejs/plugin-vue` | `5.2.1` | **6.0.1** | 1 major |
| `vue-tsc` | `2.0.29` | **3.2.4** | 1 major |
| `eslint` | `9.29.0` | 9.39.2 | 10 minors |
| `knip` | `5.70.2` | 5.86.0 | 16 minors |
| **no test setup at all** | — | vitest 4.1.11 | add it |
| `primevue` | `4.1.0` | **keep 4.1.0** | ⛔ do not bump |
| `tailwindcss` | `3.4.13` | **keep 3.4.13** | ⛔ do not bump |

The scaffold also generates **no `test` script and no vitest dependency**. Given DefMiner's "measured false-positive rate is a release gate" requirement, adding the test harness is the first post-scaffold task.

---

## Installation

```bash
# 0. Scaffold (choose "frontend-vue")
pnpm create @caido-community/plugin
cd defminer

# 1. Root tooling — bring the stale scaffold current
pnpm add -D -w \
  @caido-community/dev@0.1.7 \
  @caido/eslint-config@0.10.0 \
  @caido/tailwindcss@0.1.0 \
  @vitejs/plugin-vue@6.0.1 \
  eslint@9.39.2 prettier@3.8.1 knip@5.86.0 \
  postcss-prefixwrap@1.57.2 \
  tailwindcss@3.4.13 tailwindcss-primeui@0.6.1 \
  typescript@5.8.3 \
  vitest@4.1.11 @vitest/coverage-v8@4.1.11 \
  @types/node@25.2.1 esbuild   # esbuild = for the CI "no leaked builtins" gate

# 2. Backend runtime deps — every one verified to run in QuickJS
pnpm --filter backend add \
  meriyah@7.3.2 \
  acorn@8.18.0 \
  @jridgewell/sourcemap-codec@1.5.5 \
  zod@4.3.6
# optional, on-demand pretty-printing only:
pnpm --filter backend add js-beautify@1.15.4
pnpm --filter backend add -D @types/js-beautify@1.14.3 @caido/sdk-backend@0.57.1 vitest@4.1.11

# 3. Shared analysis engine (pure, SDK-free, 100% unit-testable)
mkdir -p packages/engine/src && pnpm --filter engine add -D vitest@4.1.11

# 4. Frontend
pnpm --filter frontend add \
  vue@3.5.41 \
  primevue@4.1.0 \
  @caido/primevue@0.3.3 \
  pinia@3.0.4 \
  @vueuse/core@14.2.0 \
  vue-virtual-scroller@2.0.0-beta.8
pnpm --filter frontend add -D \
  @caido/sdk-frontend@0.57.1 \
  @caido/sdk-backend@0.57.1 \
  @codemirror/view@6.39.12 @codemirror/state@6.5.4 \
  vue-tsc@3.2.4

# 5. Dev loop
pnpm watch          # then connect the Devtools plugin to http://localhost:3000
pnpm validate       # typecheck && lint && knip && test  (mirror scanner's script)
```

**`package.json` guard — make the two exact pins unbreakable:**
```json
{ "pnpm": { "overrides": { "primevue": "4.1.0", "tailwindcss": "3.4.13" } } }
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| **meriyah 7.3.2** | **acorn 8.18.0** | If a meriyah bug or the `structuredClone` guard ever proves insufficient. 2.4× slower and 7.2× worse on dense real-world code (monaco), but the most battle-tested ESTree parser in existence and it degrades more gracefully on deep recursion. **Keep it installed as a runtime fallback** — the cost is 33 KB gzipped. |
| **meriyah 7.3.2** | **meriyah 6.1.4** | Only if Caido's QuickJS turns out to lack `structuredClone` *and* the polyfill causes trouble. v6 has zero `structuredClone` references. Costs you ~1 year of syntax updates. |
| **meriyah full AST** | **`acorn.tokenizer()`** | For bundles above your memory ceiling. **6 MB peak heap vs 205 MB** — a 34× reduction — while still recovering 35,870 string literals from 4.91 MB in 3,818 ms. Endpoint/secret extraction from string literals works fine on a token stream. Use as the automatic degradation path above ~8 MB. |
| **`@jridgewell/sourcemap-codec`** | `@jridgewell/trace-mapping` | Add when you need minified-offset → original-file/line attribution for a specific finding. 6 KB, same speed class. |
| **`@jridgewell/sourcemap-codec`** | `source-map-js@1.2.1` | Never for DefMiner. Only if you need the full legacy `SourceMapConsumer`/`SourceNode` API. 5× slower, 5× larger, still pure-JS (unlike `source-map`). |
| **regex hot path + AST background** | AST-only | Never. Regex over 4.91 MB (20 patterns) = 1,009 ms vs meriyah AST = 3,043 ms. And a **20-anchor `indexOf` prefilter costs 174 ms** — 5.8× cheaper than the regex sweep — so most assets can be dismissed before any real work. Gate: `indexOf` prefilter → regex → (only if warranted) AST. |
| **Vitest** | node:test | Vitest is what every Caido community plugin uses, has the `vi.mock` bare-specifier factory that makes `caido:*` testable, and gives V8 coverage for the FP-rate gate. |
| **`sdk.meta.db()` (SQLite)** | JSON on disk via `llrt/fs` | SQLite for the findings/asset inventory (queryable, indexed, survives restarts, supports the re-scan diffing feature). Flat files only for the "dump static files to disk" feature. |
| **`@lezer/lr` generated grammar** | — | `scanner` uses `@lezer/lr@1.4.8` + `@lezer/generator@1.8.0` in its **backend** for CSP parsing — proof that generated LR parsers run in QuickJS. Viable if DefMiner ever needs a custom grammar (e.g. GraphQL SDL). **Not viable for JavaScript** — writing an ES2023 Lezer grammar is a multi-month project with no upside over meriyah. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **`oxc-parser`** | 19 platform-specific napi native addons (`@oxc-parser/binding-*`). QuickJS has no native addon loader. **Structurally impossible.** | `meriyah` |
| **`@swc/core` / `@swc/wasm-web` / `@swc/wasm-typescript`** | WASM or napi. `typeof WebAssembly === "undefined"` in QuickJS (verified); LLRT: `WASM-JS-API-2 ✘`. | `meriyah` |
| **`esbuild` / `rolldown` / `tree-sitter` (runtime)** | Native binaries / WASM. Fine as *build-time* tools, impossible as backend runtime deps. | `meriyah` |
| **`source-map@0.8.0`** | Two hard failures: ships `lib/mappings.wasm`, **and** leaks unresolved `fs`/`path`/`url` imports through Caido's `external: builtinModules` build (verified). Fails silently at build, loudly at runtime. | `@jridgewell/sourcemap-codec` |
| **`@babel/parser`** | Works, but **slowest measured** (4,242 ms for 0.98 MB ≈ 4,330 ms/MB — 4.4× meriyah) and largest (281 KB min). Its only advantage (TS/JSX/decorators) is irrelevant for minified shipped bundles. | `meriyah`; regex-only for reconstructed TS/JSX |
| **`espree`** | acorn + acorn-jsx + eslint-visitor-keys wrapper. 2.2× acorn's bundle size, 10% slower than acorn, no capability gain. Exists to serve ESLint. | `acorn` directly |
| **`esprima` / `escodegen` / `estraverse`** | Unmaintained (esprima's last release predates ES2020). Cannot parse optional chaining, private fields, static blocks — i.e. cannot parse the modern web. | `meriyah` + a hand-rolled 30-line ESTree walker |
| **`jsdom` / `cheerio` / `parse5` (backend)** | jsdom needs Node internals. If you need HTML parsing in the backend, `scanner`'s engine uses **`html5parser@2.0.2`** — pure JS, proven in Caido's QuickJS. | `html5parser@2.0.2` |
| **Anything importing Node builtins** | `caido-dev` marks all `builtinModules` **external**. Bare `import "fs"` survives the build and fails at runtime on the user's machine. This is the #1 silent-failure mode for this project. | Audit with an esbuild `metafile` externals assertion in CI |
| **`worker_threads` / `Worker` / `SharedArrayBuffer` parallelism** | Not in Caido's implemented module list; QuickJS has no `Atomics` (verified `typeof Atomics === "undefined"`). There is no way to parallelise a parse. | Cooperative chunking + yielding via `setTimeout(…, 0)` from `extra/timers` |
| **`child_process.exec`** | Caido implements `spawn` but **not** `exec`, and streams cannot `pipe()`. Also a Developer-Policy smell for a store plugin. | Pure-JS in-process analysis |
| **Tailwind CSS v4** | `@caido/tailwindcss@0.1.0` hard-depends on `tailwindcss@3.4.13`, and `caido.config.ts` uses the v3 PostCSS-plugin-with-inline-config API that v4 removed. | `tailwindcss@3.4.13` |
| **PrimeVue 5.x** | `@caido/primevue@0.3.3` peer is the **exact string `"4.1.0"`**. The `pt` pass-through keys are coupled to PrimeVue 4's internal slot names. | `primevue@4.1.0` exact |
| **TypeScript 7.x** | `knip@5` peers `typescript >=5.0.4 <7`; typescript-eslint 8.59.2 (inside `@caido/eslint-config`) is not validated on 7. | `typescript@5.8.3` |
| **ESLint 10.x** | `@caido/eslint-config@0.10.0` bundles `@eslint/js@9.17.0` + typescript-eslint 8.x internally. | `eslint@9.39.2` |
| **`knip@6`** | The scaffold's `knip.ts` imports the v5-internal path `knip/dist/types/config.js`. | `knip@5.86.0` |
| **Vite 8 / `@types/node` in the backend tsconfig** | `caido-dev` bundles Vite 6.0.7; the backend must typecheck against `"types": ["@caido/sdk-backend"]` only, or you will write code against Node globals that do not exist in QuickJS. | Vite 6.0.7; scoped `types` array |
| **Running an AST parse inside `onInterceptResponse`** | Measured **3.0 s for 5 MB** in native QuickJS (17× slower than V8), on a single-threaded runtime, in the proxy path. This is the project's #1 architectural risk. | Enqueue + budget + background; regex/prefilter only in the hook |

---

## Stack Patterns by Variant

**If the asset is < ~256 KB of JS:**
- Full meriyah AST inline in the background worker is affordable (< ~160 ms native, < ~9 MB heap).
- Run all detectors: AST endpoint extraction, DOM sink analysis, `postMessage` discovery, GraphQL ops.

**If the asset is 256 KB – 8 MB (the common SPA case):**
- Hot path (`onInterceptResponse`): hash + dedupe + `indexOf` anchor prefilter only (**~35 ms/MB**). Enqueue, return immediately.
- Background: regex sweep (~205 ms/MB) → meriyah AST (~620 ms/MB native) under a wall-clock budget with a `try/catch` and a nesting-depth pre-check.

**If the asset is > 8 MB, or the AST budget is exceeded, or the parse throws:**
- Degrade to **`acorn.tokenizer()`** — 6 MB peak heap regardless of input size, still yields every string literal.
- Degrade again to regex-only. Record the degradation level on the finding so the operator knows the analysis depth.

**If analysing sourcemap-reconstructed sources:**
- `JSON.parse` + `sourcesContent` (21 ms) is the whole feature. Do not decode VLQ unless attributing positions.
- Reconstructed files are frequently `.ts`/`.tsx`/`.vue` — **meriyah/acorn will throw on them**. Route by `sources[i]` extension: `.js`/`.mjs`/`.cjs` → AST; everything else → regex-only.

**If the operator explicitly opens a file in the viewer:**
- `js-beautify@1.15.4` on demand (~2.8 s/MB). Never automatically, never for more than one file at a time.

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `@caido/primevue@0.3.3` | `primevue@4.1.0` **only** | Exact-string peer dependency. Not a range. |
| `@caido/tailwindcss@0.1.0` | `tailwindcss@3.4.13` | Direct exact dependency. v4 incompatible. |
| `tailwindcss-primeui@0.6.1` | `tailwindcss >=3.1.0` | Loose peer, but pinned to 3.4.13 by the chain above. |
| `@caido/sdk-frontend@0.57.1` | `vue ^3.0.0`, `@codemirror/view ^6`, `@codemirror/state ^6`, `@ai-sdk/provider ^3.0.1` | Externalise all of these in the frontend rollup config. |
| `@caido/sdk-backend@0.57.1` | `@caido/quickjs-types@^0.26.0`, `@caido/sdk-shared@^0.2.0` | Community plugins add `pnpm.overrides: {"@caido/sdk-shared": "0.2.2"}` to dedupe. |
| `@caido/sdk-*@0.57.1` | Caido app `v0.57.1` | SDK versions track app versions **exactly**. Do not run SDK 0.57 types against an older app. |
| `@caido-community/dev@0.1.7` | `vite@6.0.7`, `tsup@8.3.5` | Bundled internally. Do not install competing Vite majors. |
| `pinia@3.0.4` / `@vueuse/core@14.2.0` | `vue ^3.5.11` / `^3.5.0` | Forces Vue 3.5.x — do not stay on the scaffold's 3.4.37. |
| `knip@5.86.0` | `typescript >=5.0.4 <7` | **Excludes TypeScript 7.** |
| `vitest@4.1.11` | `vite ^6 \|\| ^7 \|\| ^8` | Compatible with `caido-dev`'s Vite 6.0.7. |
| `@vitest/coverage-v8` | must equal `vitest` version | Hard peer pin. |
| `@caido/eslint-config@0.10.0` | `eslint >=9`, `prettier ^3` | Internally pins `@eslint/js@9.17.0`, `typescript-eslint@8.59.2`. |

---

## Required Spikes

Everything below was verified on `quickjs-ng 0.16.1` and `quickjs-emscripten`, **not on Caido's actual embedded engine**. Caido publishes no QuickJS build details. These spikes close the gap and should be the **first phase's first task** — they are cheap (one afternoon) and they de-risk the entire project.

### Spike 1 — "Hello QuickJS" capability probe (blocks all backend design)
Ship a throwaway backend plugin whose `index.ts` registers one API endpoint returning:
```ts
JSON.stringify({
  caido: sdk.runtime.version,
  WebAssembly: typeof WebAssembly,
  structuredClone: typeof structuredClone,
  TextDecoder: typeof TextDecoder, TextEncoder: typeof TextEncoder,
  atob: typeof atob, btoa: typeof btoa,
  setTimeout: typeof setTimeout, queueMicrotask: typeof queueMicrotask,
  URL: typeof URL, performance: typeof performance,
  Atomics: typeof Atomics, WeakRef: typeof WeakRef,
  regexpV: (() => { try { new RegExp("[a]", "v"); return true } catch { return false } })(),
  toSorted: typeof [].toSorted, groupBy: typeof Object.groupBy,
  fromAsync: typeof Array.fromAsync,
  stackDepth: (function d(n){ try { return d(n+1) } catch { return n } })(0),
})
```
**Answers:** the `structuredClone` question definitively (LLRT ships it — MEDIUM confidence it survives into Caido); the exact ES level; and **`stackDepth`**, which tells you whether the parser will `RangeError` gracefully or SIGSEGV.

### Spike 2 — Parser + timing on the real engine (blocks the analysis-engine design)
Same throwaway plugin, with `meriyah@7.3.2` + `@jridgewell/sourcemap-codec@1.5.5` bundled and an endpoint that parses a bundled 5 MB fixture, returning `{ ok, ms, topLevelNodes }`.
**Answers:** does the exact `caido-dev` tsup output load in Caido's QuickJS (proven for quickjs-ng, not for Caido), and what the real per-MB budget is. My native measurement of **3,043 ms** is the number to validate — if Caido's build is slower, every budget in the roadmap shifts.

### Spike 3 — Memory ceiling (blocks the degradation-threshold decision)
Parse progressively larger fixtures (1/2/4/8/16 MB) until it fails. **Answers:** is there a per-plugin memory limit, and does exceeding it throw a catchable error or kill the backend thread? Determines the exact byte threshold at which DefMiner switches from `meriyah` AST → `acorn.tokenizer()` → regex-only. Working estimate from measurement: meriyah costs **~33 MB of QuickJS heap per MB of input**.

### Spike 4 — Proxy-path latency (blocks the passive-hook design)
Measure end-to-end latency added by an `onInterceptResponse` handler that does hash + `indexOf` prefilter + enqueue, under sustained browsing. **Answers:** what fits in the hook. Budget from measurement: the 20-anchor prefilter costs **~35 ms/MB** in QuickJS — for a 5 MB bundle that is already 174 ms *in the response path*. If that is too much, the prefilter also has to move to the background queue and the hook does nothing but hash + enqueue.

### Spike 5 — Backgrounding primitive (blocks the concurrency design)
Confirm that `setTimeout(fn, 0)` from `extra/timers` actually yields the QuickJS event loop, and that a long `await`-chunked loop does not block `onInterceptResponse`. **Answers:** whether cooperative chunking is viable at all. There is no `Worker` and no `Atomics` (verified) — if the event loop does not yield usefully, the whole "budget and background" strategy needs rethinking, and this is the single hardest constraint in `PROJECT.md`.

---

## Appendix A — Raw Benchmark Data

**Harnesses:** (a) native `quickjs-ng 0.16.1` (Homebrew, arm64) via `qjs --stack-size 65536 --memory-limit 4194304`; (b) `quickjs-emscripten` (wasm32 QuickJS) for the memory-instrumented runs; (c) Node 26.7.0 / V8 as the reference. Host: Apple Silicon, macOS 25.6.0.
**Corpora:** `echarts@5.5.1` min (0.98 MB) and 2/3/5× concatenations; `monaco-editor@0.52.2` `editor.main.js` + echarts (4.57 MB — much denser code); `monaco-editor@0.52.2` sourcemap (12.66 MB, 781 sources, 3.67 MB mappings).
**Bundling:** esbuild, matching `caido-dev`'s tsup config exactly (`format: esm`, `platform: node`, `target: esnext`, `external: [sqlite, ...builtinModules]`).

**AST parse — native quickjs-ng:**
| Corpus | meriyah 7.3.2 | acorn 8.18.0 | acorn tokenizer |
|--------|---------------|--------------|-----------------|
| 0.98 MB echarts | 597 ms | 1,439 ms | — |
| 4.91 MB echarts×5 | **3,043 ms** | 7,327 ms | 3,818 ms |
| 4.57 MB monaco+echarts | **2,306 ms** | 16,524 ms | — |

**AST parse + peak heap — quickjs-emscripten (AST retained):**
| Corpus | meriyah | acorn | acorn tokenizer |
|--------|---------|-------|-----------------|
| 0.98 MB | 972 ms / 33 MB | 2,162 ms / 42 MB | 1,237 ms / **2 MB** |
| 1.96 MB | 1,967 ms / 65 MB | 4,371 ms / 83 MB | — |
| 2.95 MB | 2,992 ms / 98 MB | 6,559 ms / 123 MB | 3,624 ms / **4 MB** |
| 4.91 MB | 4,993 ms / 162 MB | 11,211 ms / 205 MB | 6,123 ms / **6 MB** |
| 0.98 MB espree 11.2.0 | 2,364 ms | — | — |
| 0.98 MB @babel/parser 8.0.4 | 4,242 ms | — | — |

**Engine reference (4.91 MB):** V8 meriyah 180 ms · V8 acorn 411 ms · V8 acorn-tokenize 134 ms ⇒ native QuickJS ≈ **17× slower than V8**.

**Regex (4.91 MB, 20 realistic provider/endpoint patterns), native quickjs-ng:** sequential **1,009 ms** · single combined alternation **842 ms** · 20-anchor `indexOf` prefilter **174 ms** · 20-literal alternation regex 435 ms. **V8 sequential: 107 ms ⇒ QuickJS regex ≈ 9.4× slower than V8.**

**Sourcemap (12.66 MB monaco map), native quickjs-ng:** `JSON.parse`+`sourcesContent` **21 ms** · `@jridgewell/sourcemap-codec` decode **554 ms** · `@jridgewell/trace-mapping` +1000 lookups **570 ms** · `source-map-js` +1000 lookups **2,866 ms**.

**Other:** `js-beautify@1.15.4` on 0.98 MB minified → 2,765 ms, output 1.88 MB. Bundle load (eval) times, native: meriyah+codec 27 ms · acorn 16 ms · sourcemap libs 2 ms.

**Stack-depth stress, native quickjs-ng:**
| Input | ≤4 MB stack | ≥8 MB stack |
|---|---|---|
| `a?b:` ×5000 | `RangeError` (catchable) | **exit 139 / SIGSEGV** |
| `[` ×2000 | `RangeError` (catchable) | parses (3 ms) |
| `1+` ×20000 | parses (49 ms) | parses |
| 4.91 MB real bundle | parses at 256 KB stack | parses |

**Engine capability probe (bare quickjs-ng 0.16.1 / quickjs-emscripten):** `WebAssembly` **undefined** · `structuredClone` **undefined** · `Atomics` **undefined** · `BigInt`/`Proxy`/`WeakRef`/`FinalizationRegistry`/`SharedArrayBuffer` present · `Object.hasOwn`/`Array.prototype.at`/`findLast`/`toSorted`/`with`/`Object.groupBy` present · `Array.fromAsync` **undefined** · RegExp `d` flag ✅ · RegExp `v` flag ✅ · unicode property escapes ✅ · named groups ✅ · lookbehind ✅ · class static blocks / private fields / `#x in o` / hashbang ✅. (`setTimeout`, `URL`, `TextDecoder`, `atob` are **host**-provided in Caido via `extra/timers`, `llrt/url`, `llrt/buffer` — their absence in bare qjs is expected and not a Caido finding.)

---

## Sources

**Primary — code and metadata read directly (HIGH confidence):**
- `npm view` on 2026-08-20 for every version stated — `@caido/sdk-backend@0.57.1`, `@caido/sdk-frontend@0.57.1`, `@caido-community/dev@0.1.7`, `@caido-community/create-plugin@0.5.0`, `@caido/quickjs-types@0.26.0`, `@caido/primevue@0.3.3`, `@caido/tailwindcss@0.1.0`, `@caido/eslint-config@0.10.0`, `meriyah@7.3.2`, `acorn@8.18.0`, `espree@11.2.0`, `@babel/parser@8.0.4`, `oxc-parser@0.146.0`, `@swc/wasm-web@1.16.1`, `@jridgewell/sourcemap-codec@1.5.5`, `@jridgewell/trace-mapping@0.3.31`, `source-map@0.8.0`, `source-map-js@1.2.1`, `js-beautify@1.15.4`, `vue@3.5.41`, `primevue@5.0.1`(rejected), `pinia@3.0.4`/`4.0.3`, `@vueuse/core@14.2.0`, `knip@5.86.0`/`6.32.2`, `vitest@4.1.11`, `typescript@5.8.3`/`7.0.2`(rejected), `eslint@9.39.2`/`10.8.1`(rejected), `tailwindcss@3.4.13`/`4.3.3`(rejected), `vue-tsc@3.2.4`, `tailwindcss-primeui@0.6.1`, `vue-virtual-scroller@2.0.0-beta.8`, `postcss-prefixwrap@1.57.2`, `@vitejs/plugin-vue@6.0.1`, `zod@4.3.6`
- `github.com/caido-community/dev` — `src/build/backend.ts`, `src/build/frontend.ts`, `src/types.ts` (the tsup config and the `z.strictObject` backend schema, read verbatim)
- `github.com/caido-community/scanner` — root + `packages/{backend,engine,frontend,shared}/package.json`, `caido.config.ts`, `packages/engine/vitest.config.ts`, `src/api/config.test.ts`, `src/__tests__/mockSdk.ts`, `scripts/generate-parsers.sh`
- `github.com/caido-community/JS-Analyzer` — root + backend/frontend `package.json`, `vitest.config.ts`, `caido.config.ts` (**direct prior art: regex-only, `js-beautify`, no AST parser**)
- `github.com/caido-community/{quickssrf,shift,authmatrix,plugin-demo}` — `package.json`, `vitest.config.ts`
- `@caido-community/create-plugin@0.5.0` tarball — all template files, extracted and read
- `api.caido.io/releases/latest` — Caido stable = **v0.57.1**

**Primary — empirical (HIGH confidence, reproducible; artefacts in the session scratchpad):**
- Native `quickjs-ng 0.16.1` (`brew install quickjs-ng`) — all parser/regex/sourcemap/stack benchmarks
- `quickjs-emscripten` (wasm32 QuickJS) — memory-instrumented runs via `Runtime.computeMemoryUsage()`
- esbuild `--metafile` externals analysis — proves `source-map@0.8.0` leaks `fs`/`path`/`url` under Caido's build config
- Corpora: `echarts@5.5.1`, `monaco-editor@0.52.2` (+ its real sourcemap), `typescript@5.8.3`

**Documentary (HIGH confidence):**
- `developer.caido.io/llms-full.txt` (local copy, 56,593 lines) — `plugins/concepts/runtime.md` (QuickJS/ES2023), `plugins/concepts/ui.md`, `plugins/concepts/tooling.md`, `plugins/concepts/child_process.md`, `plugins/reference/config`, `plugins/guides/*`, Developer Policy, backend SDK reference
- `github.com/awslabs/llrt` — `README.md` compatibility table (`WASM-JS-API-2 ✘`), `API.md` (`structuredClone` listed), `tests/unit/clone.test.ts`, `libs/llrt_utils/src/clone.rs`
- `github.com/caido-community/caido-plugin-skill` — `skills/caido-plugin-dev/SKILL.md`

**MEDIUM confidence (flagged, spike required):**
- Caido's QuickJS build == quickjs-ng/LLRT semantics (strong circumstantial evidence from the `llrt/*` type namespace; not stated in Caido docs) → Spikes 1–3
- `structuredClone` available in Caido's backend (LLRT ships it; Caido may build a subset) → Spike 1. Mitigated unconditionally by the polyfill guard.
- Caido's configured QuickJS stack and memory limits (undocumented) → Spikes 1, 3

---
*Stack research for: Caido plugin — JS/static-asset static analysis for offensive security (DefMiner)*
*Researched: 2026-08-20*
