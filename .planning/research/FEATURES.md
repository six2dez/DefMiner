# Feature Research

**Domain:** Offensive-security JavaScript / static-asset mining (in-proxy, passive-first)
**Researched:** 2026-08-20
**Confidence:** HIGH for competitor behaviour (source read directly), HIGH for detector-architecture lessons (Context7 + source), MEDIUM for market/noise claims (community sources)

---

## Competitive Reality Check (read this first)

Two findings materially change the shape of this project. Both were verified by reading source, not by reading marketing.

**1. `caido-community/JS-Analyzer` already exists and is the direct incumbent.**
Official Caido org, MIT, TypeScript monorepo, `sdk.events.onInterceptResponse` hook, 10 analyzers, 44 secret patterns, 21 cloud providers, in the Plugin Store. **Last commit 2026-03-10** (5 months stale, 6 stars, 21 commits total, ~3,100 lines including tests). It is not a strawman — it is roughly JSMiner-parity-plus, already shipped, on the platform DefMiner targets.

What it does **not** have, verified by reading every analyzer file:

| Capability | JS-Analyzer status |
|---|---|
| Dependency confusion **verification** | **PRESENT — this row was wrong on first pass and is corrected here.** `dependencyConfusion.ts` is indeed pure regex, but verification lives one layer up: `services/scanService.ts:17` imports `verifyPackagesOnNpm` from `services/npmVerifier.ts`, which queries `https://registry.npmjs.org/<pkg>` and, on 404 for a scoped package, additionally checks `/-/org/<org>/package` to determine whether the org is claimed. This is a faithful JSMiner-equivalent check. **Not a DefMiner differentiator.** The real weaknesses are implementation-level: a serial `for` loop with no concurrency, no rate limiting, no caching, no cross-scan dedup, and no consent gate before internal package names are sent to npmjs. |
| Sourcemap **reconstruction** | Absent — `inlineSourceMap.ts` decodes the map and reports `sources[]` names + size. Never writes files, never re-scans recovered source. |
| Active `.map` probing | Absent (passive only) |
| Real chunk **enumeration** | Absent — `chunkDiscovery.ts` matches `/__webpack_require__\b/g` globally. It fingerprints the bundler; it does not resolve `chunkId → URL`. On a real bundle this emits hundreds of identical "webpack detected" rows. |
| Secret **validation** | Absent |
| Vulnerable-library fingerprinting | Absent |
| AST parsing | Absent (regex + `js-beautify` 1.15.4) |
| JWT claim decoding | Absent (regex `eyJ...` → "JWT Token", medium) |
| Cross-deploy diffing | Absent |
| Findings dedup / native Caido Findings | Absent (own store only) |

**2. DOM sink monitoring on Caido is already owned, and by a better technique.**
`kevin-mizu/domloggerpp-caido` (47 stars) is a browser extension that **hooks JS sinks at runtime** and webhooks findings into a Caido plugin. Runtime taint observation beats static pattern matching on minified bundles, and the academic literature agrees: *"Static Analysis is easily fooled by minification, bundling or obfuscation"* and static DOM-XSS detection suffers *"high false positive rates."* DefMiner should not compete here. See Anti-Features.

Also live in the niche: `diegoespindola/jssecrets-caido-plugin` (Aug 2026, 14 patterns, 2 MB response cap, custom-pattern editor), `rust-memo/caido-js-secret-hunter` (Aug 2026), `F2u0a0d3/JSLogger` (9 stars, JS file inventory only).

**Strategic consequence:** "JSMiner parity" is no longer a differentiator on Caido — JS-Analyzer already reached it. DefMiner's wedge must be **(a) the four capabilities nobody on Caido has (sourcemap reconstruction, real chunk enumeration, verified dependency confusion, library CVE fingerprinting)** and **(b) a measurably lower false-positive rate on the detectors everyone already ships.**

---

## Licensing Constraint on the Detector Corpus

This determines where detector patterns can legally come from and belongs in feature planning, not just legal review.

| Source | License | Assets | Usable in an MIT Caido plugin? |
|---|---|---|---|
| **TruffleHog** | **AGPL-3.0** | ~800 secret types, ~700 verifying detectors | **NO — do not copy code or patterns.** Study the *architecture* only. |
| **Gitleaks** | MIT | 222 rules, per-rule `keywords` + `entropy` + `allowlists` | **YES** — the primary legal corpus |
| **nuclei-templates** | MIT | 107 entries under `file/keys/`, `http/exposures/tokens/*` (~200 providers) | **YES** |
| **retire.js** `jsrepository-v2.json` | Apache-2.0 | 76 libraries / 723 vulnerabilities, **auto-updated daily** (verified: commit `2026-08-20T06:18:30Z`) | **YES** |
| **jsluice** | MIT | AST URL/secret matcher design | **YES** (stale since 2024-05, but MIT) |
| **SecretFinder** | **GPL-3.0** | regex corpus | **NO** for a permissive plugin |
| **keyhacks** | no license declared | ~80 services' validation curl commands | **Reimplement from provider docs**, don't copy |

Practical read: build the corpus from **gitleaks (structure + patterns) + nuclei `file/keys` (coverage) + retire.js (library CVEs)**, and derive validation endpoints from each provider's own API docs (keyhacks is a discovery index, not a source to copy).

---

## Feature Landscape

### Table Stakes (Users Expect These)

Missing any of these and the tool is not credible against JSMiner or JS-Analyzer.

| Feature | Why Expected | Complexity | FP Risk | Notes |
|---------|--------------|------------|---------|-------|
| **Asset ingestion pipeline** — content-type + extension gate, **scope gate**, size cap, dedupe by response-body hash, budgeted background execution | Every competitor has it; without it the proxy stalls on a 10 MB bundle | **M** | N/A | JSMiner dedupes on `(taskName, url, bodyHash)`; JS-Analyzer has `inScopeOnly`; jssecrets caps at **2 MB**. All three signals converge — copy all three. This is the single hardest constraint (PROJECT.md) and it is a *feature*, not plumbing. |
| **Provider-specific secret detectors** (~40–60, not 800) | JSMiner's one generic regex is the stated reason this project exists; JS-Analyzer ships 44 | **M** | **LOW** per-provider, **HIGH** for the generic tail | Structural prefixes (`AKIA`, `ghp_`, `sk_live_`, `SG.`, `xox[bpors]-`) are near-zero FP. The `generic-api-key` tail is where all the noise lives — see Anti-Features. |
| **Multi-signal confidence** — keyword prefilter → pattern → per-pattern entropy floor → allowlist/stopwords → context | JSMiner uses entropy alone on one regex group; that is the quality gap | **M** | Reduces FP | Copy gitleaks' rule shape verbatim: **221 of 222 gitleaks rules carry a `keywords` array**, 130 carry a tuned `entropy` (Stripe = `2` because the prefix carries the confidence; `generic-api-key` = `3.5` plus allowlists). Entropy is a *modifier*, never a rule. |
| **Subdomain extraction, PSL-correct** | JSMiner + JS-Analyzer both ship it | **S** | **MEDIUM** | **Concrete bug to fix:** JSMiner's `Utilities.getRootDomain` is `Pattern.compile("[a-z0-9]+.[a-z0-9]+$")`. For `app.example.co.uk` it returns `co.uk`; for `foo.github.io` it returns `github.io`. Every subdomain finding on a multi-label-suffix target is wrong. Requires a Public Suffix List. |
| **Cloud-storage URL detection** | Explicit PROJECT.md requirement | **S** | **LOW** | JSMiner's list is 2023-era; JS-Analyzer has 21 providers. Both miss **Cloudflare R2** (`r2.dev`, `*.r2.cloudflarestorage.com`), **Supabase Storage**, **Wasabi**, **Vercel Blob**, **MinIO**, **Azure Front Door**, `firebasestorage.googleapis.com`. Verified absent from both. Ship the 2026 list. Emit the **bucket name**, not just the URL — the bucket is the testable artifact. |
| **API endpoint extraction (regex hot path)** | Universal expectation | **S** | **HIGH** without gating | JSMiner's five `\.[$]?get\(...\)` regexes are useless. JS-Analyzer's `RELATIVE_PATH_REGEX` (`["'\`](\/[a-zA-Z0-9_-]+(?:\/[...]){1,}\/?)["'\`]`) matches every icon path, i18n key and CSS URL in the bundle — it is tagged `"low"` but still emitted. Gate hard (see jsluice `MaybeURL` below). |
| **Sourcemap handling — inline base64 (passive) + `.map` probing (active) + safe extraction to disk** | JSMiner's flagship feature; **nothing on Caido has extraction** | **M** | N/A | See the quality section below. This is the highest value-per-effort item in the whole tool. |
| **Static file dumping to disk** | JSMiner parity, feeds offline tooling | **S** | N/A | Trivially cheap; operators pipe it into their own grep/nuclei. |
| **JWT detection with claim decoding** | Everyone regexes `eyJ`; nobody decodes | **S** | **LOW** if gated | See judgment below. |
| **Internal host / private IP discovery** | PROJECT.md requirement | **S** | **HIGH** without gating | See judgment below. |
| **Native Caido Findings (deduped) + workspace inventory table + JSON/CSV export** | Product-level expectation on this platform | **M** | N/A | Division of labour: Findings = high-severity, deduped, integrates with existing flow. Workspace = inventory, triage, reconstructed source, diffs. |
| **Per-detector on/off + measured FP rate on a real corpus** | Release gate per PROJECT.md Core Value | **M** | N/A | No competitor publishes an FP number. Publishing one is itself a differentiator. |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | FP Risk | Notes |
|---------|-------------------|------------|---------|-------|
| **Sourcemap reconstruction, done properly** | Nothing on Caido extracts source. Original source has comments, real identifiers, `.env` fallbacks — **detector yield on reconstructed source is far higher than on minified output** | **M** | N/A (reduces FP downstream) | Four quality dimensions below. Makes sourcemaps a *dependency of* secret detection, not a sibling. |
| **Real webpack/Vite/Next chunk graph enumeration** | Finds lazy chunks the browser never requested — unreleased features, admin bundles, feature-flagged routes. **The single highest-value unique capability.** | **M** (Next/Vite manifests) → **L** (generic webpack runtime) | **LOW** — self-verifying (a candidate URL is 200 or it isn't) | Nobody on Caido does this. See technique below. |
| **Verified dependency confusion (NPM only), tiered** | JS-Analyzer doesn't verify at all; JSMiner verifies but with a ~80%-FP-baseline naive design | **M** | **HIGH** if naive | See tiering below — this is JSMiner's biggest noise generator and the easiest place to beat it. |
| **Vulnerable/outdated library fingerprinting (retire.js dataset)** | Nothing on Caido has it. Dataset is Apache-2.0 and **auto-updated daily** | **M** | **LOW–MEDIUM** | 76 libraries / 723 vulns. Honest severity required — see judgment. |
| **AST endpoint extraction that emits a *replayable request*** | The differentiator is not "AST", it is method + path + headers + content-type + query/body params → send straight to Replay | **L** | **LOW** for call-expression matchers | jsluice proves the model. See judgment. |
| **GraphQL operation + persisted-query extraction** | Recovers a partial schema **without sending a single request** — replaces a Clairvoyance run | **M** | **LOW** (distinctive grammar) | See judgment. |
| **Secret validation — verified / unverified / unknown, OFF by default** | Turns a wall of maybes into "these 2 are live". TruffleHog's tri-state is the gold standard | **M** | Eliminates FP by construction | Operational risk is the real cost, not FP. See judgment. |
| **Cross-deploy finding diffing** | "3 new endpoints appeared in this deploy" is a finding. JSMon proved demand; nobody does it in-proxy | **M** | **MEDIUM** (asset-identity normalisation) | Diff *findings*, never bundle text. See judgment. |
| **postMessage handlers with an origin-check verdict** | Narrow, bounded, 0–3 findings per app, each individually actionable | **M** | **MEDIUM** | The *only* DOM-security feature worth building. See judgment. |
| **Published FP rate on a public corpus** | No competitor does this. It is the marketing embodiment of the Core Value | **M** | N/A | Release gate per PROJECT.md. |

---

## Judgments on the Specifically-Named Candidates

### 1. Provider-specific detectors + live validation — **BUILD BOTH, but reject the "800 detectors" framing**

**Detectors: table stakes.** Complexity **M**, FP risk **LOW** per provider.

TruffleHog's `Detector` interface is the model to imitate (architecture, not code — AGPL):

```go
type Detector interface {
    FromData(ctx context.Context, verify bool, data []byte) ([]Result, error)
    Keywords() []string          // cheap prefilter, runs before regex
    Type() detector_typepb.DetectorType
    Description() string
}
```

The `Keywords()` prefilter is the performance insight that makes DefMiner viable in QuickJS: build one Aho-Corasick automaton over all detector keywords, run it once over the 5 MB bundle, and only execute the expensive per-provider regex for detectors whose keyword actually appeared. TruffleHog uses the same trie for false-positive wordlists (`fp_words.txt`, `fp_badlist.txt`, `fp_programmingbooks.txt`, `fp_uuids.txt`). Gitleaks independently arrived at the same design — **221 of its 222 rules carry `keywords`**.

**Reject 800 detectors.** TruffleHog's count is driven by scanning git repos across every language and ecosystem — server-side DB URIs, CI tokens, Terraform state, `.pem` files. A *browser JS bundle* contains a much narrower population: analytics/product keys (Segment, Mixpanel, Amplitude, Intercom, Hotjar), search (Algolia, Elastic), maps (Google, Mapbox), payments (Stripe pk/sk, Braintree), errors (Sentry DSN, Bugsnag), CMS/media (Contentful, Cloudinary, Sanity), auth (Auth0, Firebase, Supabase, Clerk), comms (Twilio, SendGrid, Slack webhooks), cloud (AWS, GCP, Azure), VCS (GitHub, GitLab), and AI (OpenAI, Anthropic). **~40–60 detectors captures essentially all real-world JS-bundle yield.** Past that the marginal find rate approaches zero while the maintenance surface and FP tail grow. Ship 50 excellent detectors, not 800 mediocre ones.

**Validation: differentiator, OFF by default, three-state result.** Complexity **M**.

Adopt TruffleHog's tri-state, not a boolean:

| State | Meaning | Presentation |
|---|---|---|
| `verified` | provider API confirmed the credential is live | High severity, top of the list, never suppressed |
| `unverified` | pattern matched, verification not run or returned an auth failure | Default state; subject to entropy/allowlist suppression |
| `unknown` | verification *attempted and errored* (network, rate-limit, DNS) | **Must be distinct from `unverified`** — an operator who cannot tell "not live" from "we couldn't check" will discard real findings |

Design details worth copying from real detectors:
- **Verification endpoints must be read-only.** TruffleHog's Stripe detector `GET`s `https://api.stripe.com/v1/charges` with the key as a Bearer token and accepts **both `200` and `403`** as verified — `403` proves the key authenticates but lacks scope. Encode per-provider `successRanges` and `rotatedRanges` (TruffleHog's custom-detector YAML exposes exactly these).
- Never call an endpoint that writes, charges, or sends. `keyhacks` includes a Slack-webhook POST that *posts a message to the target's channel* — that class of check must be excluded, not just disabled.
- Cache verification results (TruffleHog has `--no-verification-cache` to turn it off, implying it is on by default). Re-verifying the same key on every page load will get you rate-limited and looks like an attack.

**Operational risk, not FP risk, is why this is off by default:** the request is logged by the provider, is attributable to the operator's IP, and increasingly triggers the *key owner's* alerting. A validation sweep can burn the finding and the researcher's standing before a report is even filed.

---

### 2. AST-based endpoint extraction vs regex — **HYBRID, and the differentiator is not the AST**

**Verdict: both. Regex in the passive hot path, AST in the background pass.** Complexity **L**. This matches PROJECT.md's existing Key Decision, and research supports it — but sharpens *why*.

What AST actually buys, concretely, from reading `jsluice/url-matchers.go`:

1. **Only real string literals are considered.** The tree-sitter query is `[(assignment_expression) (call_expression) (string)] @matches`. A path-looking substring inside a comment, a regex literal, or an identifier is structurally excluded. This alone kills a large FP class that no regex can.
2. **Call-site context becomes a replayable request.** jsluice's `fetch` matcher reads the second argument as an object and extracts `method` (default `"GET"`), `headers`, and `content-type`:
   ```go
   return &URL{
       URL:         arguments.NamedChild(0).CollapsedString(),
       Method:      init.GetString("method", "GET"),
       Headers:     init.GetObject("headers").AsMap(),
       ContentType: init.GetObject("headers").GetStringI("content-type", ""),
       Type:        "fetch",
   }
   ```
   **This is the differentiator.** Everyone emits `/api/v2/users`. Emitting `POST /api/v2/users` with `Content-Type: application/json` and the body param names is a request the operator sends to Replay in one click.
3. **Concatenation folding with an `EXPR` placeholder.** `"/login?redirect=" + r + "&method=oauth"` → `/login?redirect=EXPR&method=oauth`, with `queryParams: ["method","redirect"]` recovered. Regex cannot do this. jsluice then **discards URLs made entirely of `EXPR`** — an important suppression rule.

What AST does **not** buy, and where the FP control actually comes from — jsluice's cheap heuristics matter as much as the parser:

- **Matcher ordering by context richness.** The bare `(string)` matcher is explicitly last, with the comment *"This should always go last because it's the matcher that provides the least amount of context... a duplicate with more context would 'win'"*. Dedupe by path, keep the richest match.
- **`MaybeURL()` prefilter** rejects any string containing `` space ( ) ! < > ' " ` { } ^ $ , `` — killing regex literals, HTML blobs, and template garbage — with the author's own stated tradeoff: *"We will miss a handful of URLs this way, but that's probably better than spitting out a ton of false-positives."* That sentence is DefMiner's Core Value written by someone else.
- **Scheme suppression** for `data:`, `tel:`, `about:`, `javascript:`.
- **A literal blocklist for `www.w3.org`** — *"just because it shows up so damn often"* (SVG/XML namespaces in every icon component).

**Cost to budget:** parsing a 2–10 MB minified bundle with a pure-JS parser (acorn, MIT) inside QuickJS is the risk. Mitigation shape: AST pass runs off the intercept path, on a queue, with a per-asset time/size budget and a graceful regex-only fallback when the budget blows. **Never on the intercept hook.**

---

### 3. Webpack/Vite chunk graph discovery — **BUILD. This is the flagship.**

**Verdict: highest-value unique capability. Complexity M→L, FP risk LOW.**

Why it wins: lazy chunks are code the app *has* but the browser only fetches on a route the operator never visited — admin panels, feature-flagged screens, internal tooling, half-shipped features. Passive browsing structurally cannot reach them. Every other detector in the tool then gets to run over that newly-discovered code.

**Be honest about what JS-Analyzer's `chunkDiscovery` is.** It matches `/__webpack_require__\b/g` and `/webpackJsonp\b/g` across the whole file. On a real bundle that emits hundreds of identical rows saying "webpack detected". It is a **bundler fingerprinter mislabelled as chunk discovery**. Real enumeration means resolving `chunkId → absolute URL`.

**Tiered implementation, cheapest first:**

| Tier | Technique | Complexity | Coverage |
|---|---|---|---|
| 1 | **Next.js `_buildManifest.js` / `_ssgManifest.js`** — a literal route → chunk-array map. Also `/_next/static/chunks/app/**` for App Router. | **S** | Very high on Next targets, which are a large share of modern SPAs |
| 2 | **Vite `__vite__mapDeps([...])`** — the dep array is a plain string array of chunk paths. Plus `/assets/*.<hash>.js` literals. | **S** | High on Vite targets |
| 3 | **Nuxt** `buildAssetsDir` + `_payload.json` | **S** | Moderate |
| 4 | **Generic webpack runtime** — locate the flat `{chunkId: "<hash>"}` object (values ≥6 hex chars), find the enclosing builder assigned to `__webpack_require__.u` (or webpack-4 `jsonpScriptSrc`), and resolve `__webpack_require__.p` (publicPath). Then evaluate the builder **symbolically** for every key. | **L** | Universal fallback |

`xia0maiiii/webpack-dl` documents exactly this three-strategy static approach, plus a live "JSONP push-trick" (`webpackChunk*.push([[probeId],{},runtime])` to capture `__webpack_require__`, then call `require.u(id)`). **The JSONP trick is unavailable to DefMiner** — the QuickJS backend has no DOM and no page context. Static resolution is the only option, which makes Tiers 1–3 disproportionately valuable.

**Hard constraint — do not `eval()` the builder function.** It is attacker-controlled code from the target, and QuickJS will happily run it inside the plugin backend. Interpret the concatenation expression symbolically (string literals + `publicPath` + `chunkId` + hash-map lookup) from the AST. This is a security requirement, not a style preference. Listed again in Anti-Features.

**Then fetch the candidates.** This is an *active* feature: it issues requests to the target. Gate it behind scope, rate-limit it, and feed 200-responses back through the full analyzer pipeline. FP risk is genuinely low because the target itself adjudicates every candidate.

---

### 4. GraphQL operation/schema extraction — **BUILD, P2. Narrower than it sounds, but genuinely differentiated.**

**Verdict: differentiator. Complexity M, FP risk LOW.**

What survives minification is the key insight: `gql`/`graphql` template literals are **string data**, not code, so terser leaves them intact. What you recover from a bundle for free:

- Operation names and types: `query GetUserBilling($id: ID!) { ... }` → operation inventory
- **Variable names *with their GraphQL types*** — `$id: ID!`, `$role: AdminRole` — type names leak schema structure and enum names
- Field selection sets → partial type shape
- Fragment definitions → reusable type fragments
- **Apollo persisted-query (APQ) hash maps** — `{operationName: "<sha256>"}` objects, directly replayable against `?extensions={"persistedQuery":...}` even when arbitrary queries are rejected

**Why this matters competitively:** the standard alternative when introspection is disabled is `clairvoyance`, which brute-forces field names against the server's suggestion messages — thousands of requests, slow, noisy, and detectable. DefMiner recovers a meaningful slice of the same information from a file the browser already downloaded, with **zero requests**. That is a strong, concrete story.

**Scope discipline:** write a small operation-header parser over string literals (operation type, name, variable definitions, top-level fields). **Do not bundle `graphql-js`** — it is large, and full document validation is not the goal. Do not attempt schema *reconstruction* into SDL in v1; an operation + variable-type inventory is the 90% value at 20% of the cost.

---

### 5. DOM XSS source/sink + postMessage — **SPLIT: reject the sink list, build the postMessage verdict**

**Sink/source listing: ANTI-FEATURE. Do not build.** See Anti-Features for the full argument. Summary: JS-Analyzer ships 27 sink/source patterns including `/(?:window\.)?location\.hash/g` and `/\.innerHTML\s*=[^=]/g` at `medium`/`high` confidence. In a 5 MB React bundle those fire hundreds of times with no dataflow evidence. DOMLogger++ (47 stars) already solves this on Caido with runtime hooking, and the research literature is unambiguous that static analysis on minified/bundled code is high-FP.

**postMessage handler discovery with an origin-check verdict: BUILD, P2.** Complexity **M**, FP risk **MEDIUM**.

This is defensible precisely because it is narrow and produces a *verdict*, not an observation:

1. AST-query `addEventListener("message", <fn>)` and `window.onmessage = <fn>`.
2. Walk the handler body for any comparison involving `.origin` (`e.origin === ...`, `["a","b"].includes(e.origin)`, `ORIGINS.indexOf(...)`, a regex test against `.origin`).
3. **Report only handlers with no origin check reachable in the body.**

Typical yield: 0–3 per application, each worth reading. Contrast with `location.hash`: hundreds, none worth reading. Note the FP mode honestly — the check may live in a helper function the handler calls, so mark these `unverified` and show the handler source inline so the operator adjudicates in two seconds. Also worth flagging the inverse: `.postMessage(data, "*")` **send** sites, which is a distinct and often more impactful finding.

Complementary positioning: DefMiner tells you which handlers *exist* before you trigger them; DOMLogger++ tells you what actually fired. Say so in the docs rather than pretending to compete.

---

### 6. JWT detection + claim decoding — **BUILD. Cheapest high-signal win in the tool.**

**Verdict: table stakes at trivial cost, but reframe the finding.** Complexity **S**, FP risk **LOW** if gated.

Everyone regexes `eyJ[A-Za-z0-9_-]+\.eyJ...` and emits "JWT Token, medium" (JSMiner has no JWT detector at all; JS-Analyzer emits exactly that). **"Found a JWT" is not a finding** — SPA bundles contain JWT-shaped strings in test fixtures, library READMEs bundled as docs, and `jwt-decode` unit tests.

The finding is the **decoded verdict**:

| Signal | Verdict |
|---|---|
| `alg: "none"` | **High** — the app demonstrably handles unsigned tokens |
| No `exp`, or `exp` in the future, **and** real-looking `iss`/`aud`/`sub` | **High** — this is a live static credential hardcoded in the bundle |
| `exp` expired > 30 days ago | **Informational**, collapsed by default — almost always a fixture |
| `iss` pointing at an internal IdP hostname | feeds the internal-host detector |
| `kid` containing a path-like value | note for path traversal / key confusion |
| `HS256` + short token | note as an offline-cracking candidate (do **not** crack it — that is exploitation) |

FP gate: require both segments to base64url-decode to valid JSON **and** the header to contain a plausible `alg`. That alone removes most `eyJ`-prefixed non-JWTs. Then suppress long-expired tokens by default.

---

### 7. Vulnerable/outdated library fingerprinting — **BUILD on the retire.js dataset, with honest severity**

**Verdict: differentiator on Caido (nothing has it), table stakes vs Burp (the Retire.js extension exists). Complexity M, FP risk LOW–MEDIUM.**

Dataset verified directly:
- `RetireJS/retire.js`, **Apache-2.0**, 4,161 stars, **auto-updated daily** — the three most recent commits touching `repository/jsrepository-v2.json` are `2026-08-20`, `2026-08-08`, `2026-08-07`, all automated advisory syncs.
- **76 libraries, 723 vulnerabilities.** Includes `react`, `vue`, `angularjs`, `@angular/core`, `lodash`, `axios`, `bootstrap`, `handlebars`, `DOMPurify`, `jquery` + plugins.
- Extractor methods and their counts across the dataset: `filecontent` (71 libs), `uri` (59), `func` (44), `filename` (42), `hashes` (29), `ast` (28), `filecontentreplace` (4).

Version is captured by a `§§version§§` placeholder inside each pattern. Crucially, several patterns are **written to survive minification** — e.g. for jQuery:
```
[^a-z.]jquery:[ ]?"(§§version§§)"
=\"(§§version§§)\",.{50,300}(.)\.fn=(\2)\.prototype=\{jquery:
```

**Honest limitations — state these rather than overselling:**
- `func` extractors (44 libraries) evaluate expressions like `(window.jQuery||window.$).fn.jquery` **against a live DOM**. Unavailable in the QuickJS backend. Roughly 40% of the dataset's strongest signal is off the table.
- `filecontent` works well on standalone vendor files (`/js/jquery.min.js`, CDN copies). Inside a webpack chunk, terser strips banner comments, so recall drops materially. Do not claim bundle-wide coverage.
- `hashes` (29 libraries) are exact-file hashes — high precision, near-zero recall against any hashed/bundled asset.
- **`ast` extractors (28 libraries) become viable if DefMiner already has a parse tree** — a real synergy with the AST endpoint pass, and a genuine edge over a regex-only implementation.

**Severity discipline (this is a signal-quality decision, not a data decision):** "this bundle contains jQuery 3.4.1, which has CVE-XXXX (prototype pollution)" is **informational** unless reachability is shown. Reporting it as High is how tools train operators to ignore them. Emit `Informational` with the CVE/GHSA IDs, CWE, and the retire.js `info` links attached, let the operator escalate. The 723 vulnerability entries already carry `severity`, `cwe`, `identifiers.CVE`, `identifiers.githubID`, and `info[]` — pass them straight through, do not invent a severity.

### 8. Dependency confusion — **NPM ONLY. Reject PyPI / Maven / Go outright.**

**Verdict: build NPM with tiered confidence. Explicitly refuse other ecosystems. Complexity M, FP risk HIGH if naive.**

**Why other ecosystems are a category error:** DefMiner reads *browser JavaScript bundles*. Python, Java, Ruby and Go package names do not appear there in any reliable form. Extracting an identifier from a webpack chunk and querying PyPI produces pure noise — every English word is a plausible PyPI package name. The only route to non-JS manifests is a leaked lockfile or a sourcemap-reconstructed monorepo, and in both cases the operator has the actual file and better tools. Adding registries multiplies network calls and FP surface for near-zero yield. **This is an anti-feature; it is listed again below.**

**NPM detection quality is where the win is.** Published research puts the naive-detection FP baseline around **80%**, reduced to ~28% by better classification (ConfuGuard, 2025). JSMiner's implementation sits near the naive end and it is its single loudest noise source. Concrete tiers:

| Tier | Signal | Confidence | Reasoning |
|---|---|---|---|
| **A — report as candidate** | Scoped package `@org/pkg` where **the org itself 404s** on `npmjs.com/org/<org>` | High | Registering an unclaimed org is a real, repeatable path. JSMiner already does this (`getOrgNameFromScopedDependency`) and it is its best check — keep and elevate. |
| **B — report as candidate** | Version string is not valid npm semver (`file:`, `link:`, `git+ssh://`, `workspace:`, an internal registry URL) | Medium | Strong internal-package indicator. JSMiner reports these as Information; correct call. |
| **C — report, clearly hedged** | Unscoped name, `registry.npmjs.org/<name>` returns 404 | Medium-Low | The dominant FP source. Names may be **unpublished/deleted and permanently blocked from re-registration** — a 404 does *not* imply registrable. Never label this "Dependency Confusion (High)" as JSMiner does; label it "unresolved package — verify registrability". |
| **D — suppress by default** | Name harvested from a `/node_modules/<pkg>/` **path string** | Low | JSMiner's "Approach 2". These are overwhelmingly transitive *public* dependencies whose paths leaked into a sourcemap or a comment. A 404 here is usually a truncated/mangled name, not an internal package. JS-Analyzer's equivalent regex extraction has the same weakness. |

Additional FP-killers worth building: strip well-known scopes (`@types`, `@babel`, `@angular`, `@nestjs`, `@aws-sdk`, …) before querying; batch registry lookups and cache aggressively (PROJECT.md already puts npm lookups ON by default — that is a lot of outbound requests to npmjs.com per bundle); handle `429` distinctly from `404` (a rate-limited lookup is `unknown`, not "doesn't exist" — the same tri-state discipline as secret validation).

---

### 9. Sourcemap reconstruction quality — **BUILD. Highest value-per-effort in the tool.**

**Verdict: table stakes in name, differentiator in execution. Complexity M.** Nothing on Caido extracts source today.

Discovery surface (JS-Analyzer covers 4 of these; JSMiner covers 2):
- Inline `//# sourceMappingURL=data:application/json;base64,...` (passive)
- CSS variant `/*# sourceMappingURL=... */`
- External `//# sourceMappingURL=foo.map` — **follow the declared name, which is frequently not `<file>.js.map`**
- `SourceMap:` / `X-SourceMap` **response headers** — missed by every tool surveyed
- Blind `.map` sibling probing (active) — JSMiner's `ActiveSourceMapper` appends `.map` and checks for `200` + body containing `sources` and `sourcesContent`

**Four quality dimensions that separate a real implementation from a toy:**

**(a) Path traversal safety — a real vulnerability, not a nicety.** The `sources` array is attacker-controlled: `webpack:///../../../../../.ssh/authorized_keys` is a legal entry. JSMiner **does** defend, in `FileUtils.secureFile`: it builds the path under a fake root, calls `Path.normalize()`, then requires `trustedFile.getCanonicalPath().startsWith(destinationDir.getCanonicalPath())` and refuses otherwise. **QuickJS/`llrt/fs` has no canonical-path API** — DefMiner must implement segment normalisation and prefix containment by hand, and must also handle Windows drive prefixes, UNC paths, `%2e%2e`-style encodings, and symlink-ish `sources` values. Treat this as a security-reviewed component with its own tests. Getting it wrong means a malicious target writes files anywhere the Caido process can.

**(b) `sourcesContent: null` is still a finding.** Many production maps ship `sources` without `sourcesContent`. JSMiner's `SourceMapper` indexes `getSourcesContent()[i]` in lockstep with `getSources()[i]` and throws on any mismatch, silently losing the whole map (`catch (Exception e)` → one log line). But the bare `sources[]` list still leaks the **internal repository layout, internal package names, developer usernames in absolute paths, and monorepo structure**. Report it as its own informational finding, and never let a missing-content map abort processing.

**(c) Separate first-party from vendor.** A single React map yields thousands of `node_modules/**` entries. Partition `webpack://`/`webpack:///` namespaces and bucket `src/`-style first-party paths separately from vendor. Without this the operator opens a folder of 4,000 files and closes it.

**(d) Re-run every detector over the reconstructed source.** This is the point. Original source contains comments, real identifier names, `process.env.X || "<hardcoded-fallback>"` patterns, TODOs, and commented-out staging URLs — none of which survive minification. **This makes sourcemap reconstruction a dependency of high-quality secret and endpoint detection, not a peer feature.** It should be scheduled before, not after, the detector-tuning work.

---

### 10. Cross-deploy bundle diffing — **BUILD, P2. Diff findings, never text.**

**Verdict: differentiator. Complexity M, FP risk MEDIUM.**

Demand is proven — `robre/jsmon` (cron + fetch + diff + Telegram) exists precisely for this, and the pitch is exactly right: *new endpoints mean new features, new features mean less battle-tested code*. Nobody does it **in-proxy**, where the operator is already browsing the target.

**The critical design decision: the unit of diff is the extracted finding set, not the file.** Text-diffing two minified bundles produces garbage — every terser run reshuffles identifiers, and the filename hash changes on every deploy. Diff instead:

- endpoints added / removed
- chunk IDs added / removed (pairs beautifully with chunk enumeration — a new lazy chunk in a deploy is a *very* strong signal)
- npm package names added / removed
- secrets added / rotated
- library versions changed (feeds the retire.js detector — "they upgraded jQuery" or "they downgraded")

**Prerequisites (these are why it is P2, not P1):**
- **Stable asset identity across deploys.** `main.a1b2c3.js` → `main.<hash>.js`. Normalise content hashes out of the path; handle Next's `/_next/static/<buildId>/` where the *whole directory* changes. Getting this wrong produces false "everything is new" churn on every visit — the FP mode.
- Persistence across sessions (`sdk.meta.db()`), keyed per project.
- The asset inventory and finding store must already exist.

Presentation: "Deploy changed — 3 new endpoints, 1 new chunk, 0 new secrets" as a single collapsible finding, not 40 separate rows.

---

### 11. Internal host / private IP discovery — **BUILD, but gate it hard or it is pure noise**

**Verdict: table stakes, complexity S, FP risk HIGH without gating / LOW with.**

Real signal:
- RFC1918 literals (`10.x`, `172.16–31.x`, `192.168.x`) appearing as **string literals**
- Internal TLDs: `.internal`, `.local`, `.corp`, `.lan`, `.intranet`, `.test`
- Kubernetes service DNS: `*.svc.cluster.local`, `*.svc`
- Cloud metadata: `169.254.169.254`, `metadata.google.internal`
- Hostnames on non-standard ports, internal registry/artifact hosts, staging/QA hostnames on the target's own domain

Noise, all of which JS-Analyzer's `sensitiveDataPatterns` (`Internal IP (10.x.x.x)`, `Localhost`, `IPv6 Localhost`) will emit on essentially every modern bundle:
- `127.0.0.1` / `localhost:3000` / `localhost:8080` — webpack HMR, react-refresh, vite client, dev-server fallbacks. **Present in almost every bundle ever shipped.**
- `0.0.0.0`, `192.168.1.1` in networking/router libraries
- Version strings that parse as IPs (`10.0.0.1`)
- Sourcemap `sources` paths and license headers
- `169.254.x.x` link-local in WebRTC ICE code

Gates that make it credible: require a string-literal AST node (not a numeric token); suppress loopback unless the port is unusual (i.e. not 3000/8080/5173/4200/1234); suppress matches inside code guarded by `process.env.NODE_ENV !== "production"` or `__DEV__`; de-duplicate aggressively per host, not per occurrence; **cap emitted rows per asset** so one bundle can never produce 200 findings.

---

## Anti-Features (Deliberately Do Not Build)

| Anti-Feature | Why Requested | Why Problematic | Alternative |
|---|---|---|---|
| **Standalone "high-entropy string" detector** | "It finds secrets no pattern knows about" | **The single largest noise generator in this domain.** JS-Analyzer ships `/["'\`]([A-Za-z0-9+/=_-]{20,})["'\`]/g` + Shannon ≥ 3.5 as a default-on detector. In a real bundle that matches: base64 sprites and inlined fonts, CSS-in-JS class hashes, webpack module/chunk hashes, i18n message keys, UUIDs, SRI integrity hashes, source-map VLQ segments, inlined WASM, and minified identifier tables. Nearly 100% FP. | Entropy is a **per-detector modifier, never a rule**. Gitleaks does exactly this: `entropy` is a field on a keyword-anchored rule (Stripe `2`, generic-api-key `3.5`), never a rule on its own. If a standalone mode is offered at all, it is opt-in, off by default, and clearly labelled as a manual sweep. |
| **Flat DOM XSS sink/source listing** | "DOM XSS is high impact" | JS-Analyzer's 27 patterns include `location.hash`, `location.search`, `document.referrer`, `.innerHTML =`, `.src =`. A React bundle emits hundreds of hits with zero dataflow evidence. Literature: static DOM-XSS analysis is *"easily fooled by minification, bundling or obfuscation"* and has *"high false positive rates"*. **And `domloggerpp-caido` (47 stars) already owns this niche on Caido with runtime hooking**, which sees actual tainted values. | Ship **only** the postMessage-handler-without-origin-check verdict (bounded, 0–3 findings/app) and `.postMessage(x, "*")` send sites. Document DOMLogger++ as the complement for everything else. |
| **Prototype-pollution "findings" from static patterns** | "Prototype pollution is hot" | JS-Analyzer emits `__proto__ access` and `.constructor.prototype` at `medium`. Every lodash, immer, deepmerge, and object-path bundle contains these — including the *defensive* checks that exist to prevent pollution. | Do not emit. If ever revisited, require a sink-reaching assignment from a parsed source, not a substring. |
| **Reporting public-by-design client keys as "Secrets"** | The regex matches; it looks like a key | Firebase web `apiKey` (`AIza…`) is **public by design** — Google's own docs say so; authorisation is Security Rules + App Check. Stripe `pk_live_` is publishable. Segment/Mixpanel/Amplitude write keys, Sentry DSNs, Algolia *search-only* keys and Google Maps browser keys are all meant to ship in the bundle. Emitting them as "Secret" is how a findings panel becomes background noise. JS-Analyzer rates `Stripe Publishable Key` `medium`; jssecrets rates it `Medium`. Both wrong. | A **separate, low-severity "Public client key — check restrictions"** class, collapsed by default, that names the *actual* actionable check per provider: Maps key → is it unrestricted, and does the GCP project have billable AI APIs enabled (a real 2026 escalation — unrestricted Maps-era keys now authenticate to Gemini); Algolia → is it an admin key mislabelled; Firebase → are Security Rules open / is App Check off. Note jsluice's own precedent: it rates `gcpKey` `SeverityLow` but `firebase` `SeverityHigh` based on what the finding actually implies. |
| **Chasing 800+ detectors** | "TruffleHog has 800" | That count serves git-repo scanning across all languages. A browser bundle's realistic key population is ~50 providers. Past that: near-zero marginal yield, growing FP tail, growing maintenance. **And TruffleHog is AGPL-3.0 — its patterns cannot be copied into a permissive Caido plugin anyway.** | ~40–60 high-precision detectors sourced from gitleaks (MIT) and nuclei-templates (MIT), each with keyword prefilter + tuned entropy + allowlist. Ship a custom-detector interface so operators add their own (jssecrets and TruffleHog both prove the demand). |
| **Dependency confusion beyond NPM (PyPI / Maven / Go / RubyGems)** | "More ecosystems = more coverage" | Category error. Non-JS package names do not appear reliably in browser bundles. Every English word is a plausible PyPI name → pure noise, plus N× the outbound registry traffic. | NPM only, tiered by confidence (Tiers A–D above). If a real `package.json` or lockfile is recovered from a sourcemap, that is a distinct, clearly-labelled path — not a bundle heuristic. |
| **`eval()`-ing the webpack runtime to resolve chunks** | It is by far the easiest way to get exact URLs | Executes attacker-controlled code from the target **inside the plugin backend**, which in QuickJS has filesystem and `caido:http` access. A malicious or compromised target gets code execution in the operator's proxy. Also violates the Caido Developer Policy's spirit around undisclosed behaviour. | Symbolically interpret the concatenation expression from the AST: string literals + `__webpack_require__.p` + chunkId + hash-map lookup. Slower to write, safe to run. |
| **Full text diff of minified bundles** | "Show me what changed" | Terser reshuffles identifiers and the filename hash changes on every deploy — the diff is 100% churn. | Diff the extracted finding sets (endpoints, chunk IDs, packages, secrets, library versions). |
| **Secret validation ON by default** | It is the highest-signal feature | Transmits a live third-party credential from the operator's IP, is logged by the provider, and increasingly triggers the **key owner's** alerting — burning the finding before the report is filed. Some `keyhacks`-style checks have side effects (the Slack-webhook check *posts a message into the target's channel*). | Built, OFF by default, per-provider toggles, read-only endpoints only, cached, rate-limited, and explicitly disclosed in the store listing. Already PROJECT.md's decision — this research reinforces it. |
| **Auto-registering dependency-confusion candidate packages** | "Prove exploitability" | Publishing to a public registry to claim a name is an active supply-chain action with legal and ethical exposure, and it is irreversible. | Report the candidate and the exact verification step. Exploitation is out of scope by design (PROJECT.md). |
| **Endpoint wordlist brute-forcing / directory fuzzing off discovered paths** | "You already found `/api/v1/`, go find the rest" | That is ffuf's and the `caido-community/scanner` plugin's job. Duplicating it makes DefMiner active-noisy and blurs its identity. | Export discovered endpoints as a wordlist / OpenAPI-ish collection (js-recon's `--openapi` output is the precedent) and hand off. |
| **Scanning every proxied response** | "More coverage" | Blows the intercept-path budget on HTML, images and API JSON. | Gate on content-type + extension + **scope** + size cap (jssecrets caps at 2 MB; adopt a configurable cap with a documented default). |
| **WASM decompilation / minified-reversal without sourcemaps** | "Complete the picture" | Enormous scope, marginal return. Already PROJECT.md Out of Scope — research confirms no competitor attempts it either. | Detect and inventory `.wasm` assets so the operator knows they exist; stop there. |
| **Notifications / cloud sync / telemetry** | JSMon does Telegram alerts | Violates PROJECT.md's local-only constraint and the Caido Developer Policy's undisclosed-external-calls rule. | In-app findings + export. Let the operator's own pipeline handle notification. |

---

## Feature Dependencies

```
[Asset ingestion pipeline: type/scope/size gate, body-hash dedupe, budget]
    |
    +--requires--> nothing (foundation; everything else sits on it)
    |
    +--> [Regex detector engine: keyword prefilter -> pattern -> entropy -> allowlist]
    |        |
    |        +--> [Provider secret detectors] --enhances--> [JWT decode+judge]
    |        +--> [Subdomains (needs PSL)]
    |        +--> [Cloud storage URLs]
    |        +--> [Internal hosts / private IPs]
    |        +--> [Endpoint extraction: regex hot path]
    |        |
    |        +--requires--> [Findings store + dedupeKey + workspace table]
    |
    +--> [Sourcemap discovery + SAFE extraction]
             |
             +--requires--> [path-traversal-safe writer]   <-- security-critical
             +--feeds-----> [Detector engine re-run over reconstructed source]  *** big FP/recall win
             +--enhances--> [Dependency confusion]  (real package.json beats bundle heuristics)
             +--enhances--> [Library fingerprinting] (unminified banners restore recall)

[AST pass (background queue, budgeted, regex fallback)]
    +--requires--> [Asset ingestion pipeline]
    +--> [Endpoint extraction -> replayable request (method/headers/params)]
    +--> [postMessage handler + origin-check verdict]
    +--> [GraphQL operation / persisted-query extraction]
    +--> [Webpack runtime SYMBOLIC evaluation]  --conflicts--> [eval()-based resolution]  (BANNED)
    +--enhances--> [retire.js `ast` extractors, 28 of 76 libraries]

[Chunk graph enumeration]
    +--requires--> [Asset ingestion pipeline] + [active fetch budget + scope gate]
    +--requires--> [AST pass] for Tier-4 generic webpack; Tiers 1-3 need only regex
    +--feeds back--> [Asset ingestion pipeline]   *** recursive: fetched chunks re-enter the pipeline

[Secret validation (verified/unverified/unknown)]
    +--requires--> [Provider secret detectors] (needs a provider identity to know which API to call)
    +--requires--> [tri-state result model + verification cache + rate limiter]

[Dependency confusion (NPM)]  --requires--> [npm registry client + cache + 429-aware tri-state]

[Library fingerprinting]  --requires--> [retire.js dataset bundling + refresh + semver range compare]

[Cross-deploy diffing]
    +--requires--> [persistent finding store (sdk.meta.db)]
    +--requires--> [asset identity normalisation (strip content hashes / Next buildId)]
    +--requires--> ALL detectors stable  (diffing an unstable detector = permanent false churn)
```

### Dependency Notes

- **Sourcemap extraction must precede detector tuning.** Reconstructed source is a fundamentally richer input (comments, real identifiers, `process.env.X || "fallback"`). Tuning detectors against minified-only input and then adding sourcemaps means re-tuning.
- **Chunk enumeration is recursive into the ingestion pipeline.** Fetched chunks must re-enter the full analyzer path, which means the pipeline needs loop protection and a global budget before enumeration ships.
- **Validation requires provider identity, so it cannot precede provider detectors.** A generic entropy hit has no API to validate against — another reason the standalone entropy detector is a dead end.
- **Diffing requires every detector to be stable.** If detector output churns between versions, every deploy diff shows phantom changes. Diffing must come after the FP-rate release gate, not before.
- **Symbolic webpack evaluation conflicts with `eval()`-based resolution.** They are mutually exclusive by policy; the safe path is strictly harder and must be budgeted as such.
- **AST pass conflicts with the intercept hot path.** It can never run synchronously on `onInterceptResponse`. The queue/budget/fallback architecture is a prerequisite, not an optimisation.

---

## MVP Definition

### Launch With (v1) — "credible, and measurably quieter than the incumbent"

- [ ] **Asset ingestion pipeline** — content-type/extension gate, scope gate, size cap, body-hash dedupe, background budget. *Everything depends on it, and it is the hardest constraint in the project.*
- [ ] **Detector engine** — keyword prefilter (single automaton) → provider pattern → per-detector entropy floor → allowlist/stopwords. *The gitleaks rule shape; this is the architecture that produces the FP win.*
- [ ] **~40 provider secret detectors** from MIT/Apache sources. *Not 800. Not one generic regex.*
- [ ] **Public-client-key class, separate and low-severity.** *The cheapest large FP reduction available — and no competitor does it.*
- [ ] **JWT decode-and-judge.** *Complexity S, immediately differentiated.*
- [ ] **Subdomains with a real PSL.** *Fixes a demonstrable JSMiner correctness bug.*
- [ ] **Cloud storage URLs, 2026 provider list, emitting bucket names.** *R2/Supabase/Wasabi/Vercel Blob are verified absent from both competitors.*
- [ ] **Internal hosts / private IPs, hard-gated with per-asset caps.**
- [ ] **Endpoint extraction, regex hot path, jsluice-style gating** (`MaybeURL` heuristic, scheme suppression, `www.w3.org` blocklist, context-richness ordering).
- [ ] **Sourcemap discovery + path-traversal-safe extraction + first-party/vendor split + detector re-run over recovered source.** *Highest value-per-effort; nothing on Caido has it.*
- [ ] **Static file dumping.**
- [ ] **Native Caido Findings (deduped) + workspace inventory + filterable table + JSON/CSV export.**
- [ ] **FP corpus + a published false-positive rate.** *Release gate per Core Value. No competitor publishes one.*

### Add After Validation (v1.x)

- [ ] **Chunk graph enumeration**, Tiers 1–3 first (Next `_buildManifest`, Vite `__vite__mapDeps`, Nuxt) — *trigger: ingestion pipeline proven stable under budget, since enumeration feeds back into it recursively.*
- [ ] **AST background pass** → replayable-request endpoint extraction — *trigger: a parser is verified to run inside QuickJS on a 5 MB bundle within budget.*
- [ ] **Dependency confusion (NPM), tiered A–D** — *trigger: registry client + caching + 429 tri-state exist.*
- [ ] **Library fingerprinting on the retire.js dataset** — *trigger: dataset bundling + refresh strategy decided.*
- [ ] **Secret validation, OFF by default, tri-state** — *trigger: provider detectors stable and a verification cache + rate limiter exist.*
- [ ] **GraphQL operation + persisted-query extraction** — *trigger: AST pass shipped.*
- [ ] **Chunk enumeration Tier 4** (generic webpack, symbolic) — *trigger: AST pass shipped.*

### Future Consideration (v2+)

- [ ] **Cross-deploy finding diffing** — defer: needs persistence, asset-identity normalisation, *and* detector stability. Diffing unstable detectors manufactures noise.
- [ ] **postMessage handler origin-check verdict** — defer: valuable but narrow, and DOMLogger++ covers the adjacent need. Ship once the AST pass is proven.
- [ ] **Reconstructed-source browser with tree view + in-app search** — defer: disk dump covers the need at v1.
- [ ] **Custom user-defined detectors** — defer: both jssecrets and TruffleHog show demand, but shipping it before the built-in corpus is tuned invites users to recreate the noise problem.
- [ ] **Endpoint export as OpenAPI collection** — defer: nice hand-off to ffuf/Bruno (js-recon precedent), not core.

---

## Feature Prioritization Matrix

| Feature | User Value | Impl. Cost | FP Risk | Priority |
|---|---|---|---|---|
| Asset ingestion pipeline (gate/budget/dedupe) | HIGH | MEDIUM | — | **P1** |
| Detector engine (keyword→pattern→entropy→allowlist) | HIGH | MEDIUM | reduces | **P1** |
| ~40 provider secret detectors | HIGH | MEDIUM | LOW | **P1** |
| Sourcemap discovery + safe extraction + re-scan | HIGH | MEDIUM | — | **P1** |
| Public-client-key separation | MEDIUM | LOW | reduces | **P1** |
| Subdomains (PSL-correct) | MEDIUM | LOW | MEDIUM | **P1** |
| Cloud storage URLs (2026 list, bucket names) | MEDIUM | LOW | LOW | **P1** |
| JWT decode-and-judge | MEDIUM | LOW | LOW | **P1** |
| Endpoint extraction (regex, gated) | HIGH | LOW | HIGH→LOW w/ gates | **P1** |
| Internal hosts / private IPs (gated) | MEDIUM | LOW | HIGH→LOW w/ gates | **P1** |
| Findings + workspace + export | HIGH | MEDIUM | — | **P1** |
| Measured FP rate on a corpus | HIGH | MEDIUM | — | **P1** |
| Static file dumping | MEDIUM | LOW | — | **P1** |
| Chunk enumeration Tiers 1–3 (Next/Vite/Nuxt) | HIGH | LOW–MED | LOW | **P2** |
| AST pass → replayable requests | HIGH | HIGH | LOW | **P2** |
| Dependency confusion (NPM, tiered) | MEDIUM | MEDIUM | HIGH | **P2** |
| Library fingerprinting (retire.js) | MEDIUM | MEDIUM | LOW–MED | **P2** |
| Secret validation (tri-state, off by default) | HIGH | MEDIUM | eliminates | **P2** |
| GraphQL operation/persisted-query extraction | MEDIUM | MEDIUM | LOW | **P2** |
| Chunk enumeration Tier 4 (generic webpack) | HIGH | HIGH | LOW | **P2** |
| Cross-deploy finding diffing | MEDIUM | MEDIUM | MEDIUM | **P3** |
| postMessage origin-check verdict | MEDIUM | MEDIUM | MEDIUM | **P3** |
| Reconstructed-source browser UI | MEDIUM | MEDIUM | — | **P3** |
| Custom user detectors | MEDIUM | LOW | HIGH (user-caused) | **P3** |

---

## Competitor Feature Analysis

| Feature | JSMiner (Burp, dead 2023) | JS-Analyzer (Caido, stale 2026-03) | TruffleHog / Gitleaks | jsluice | **DefMiner plan** |
|---|---|---|---|---|---|
| Secret detection | 1 generic regex (`SECRETS_REGEX`), FP list = 3 words + len>4 | 44 regexes, `isLikelyFalsePositive` = 4 heuristics | 800 types / 222 rules, keyword prefilter, Aho-Corasick FP wordlists, per-rule entropy + allowlists | AST `(string)` node matchers, sibling-key context | **~40–60 detectors, gitleaks rule shape, AST-gated to string literals, public-key class separated** |
| Confidence model | Shannon entropy ≥ 3.5 on one group | fixed per-pattern label + entropy tier | verified / unverified / unknown + entropy filter + wordlists | severity escalates on sibling context | **Provider pattern + per-detector entropy + allowlist + sibling context + optional live verification** |
| Standalone entropy rule | no | **yes (major noise)** | no — entropy is a rule *field* | no | **No. Modifier only.** |
| Endpoints | 5 regexes (`.get(` etc.) | 5 regexes incl. a very loose relative-path rule | n/a | AST matchers, `EXPR` folding, method+headers from `fetch` init, `MaybeURL` gate | **Regex hot path + AST pass emitting replayable requests** |
| Sourcemaps | inline + active `.map`, writes files, **path-traversal guarded** | detects + lists `sources[]`, **no extraction** | n/a | n/a | **All discovery surfaces incl. `SourceMap:` headers, safe extraction, first-party split, detector re-run** |
| Chunk discovery | none | bundler **fingerprinting** mislabelled as discovery | n/a | n/a | **Real `chunkId → URL` resolution, tiered, symbolic (never `eval`), fetched chunks re-enter pipeline** |
| Dependency confusion | npm-verified; scoped-org 404 = High; `node_modules/` path harvest = High (noisy) | regex only, **never verified** | n/a | n/a | **NPM only, 4 confidence tiers, `node_modules/` path harvest suppressed by default, 429≠404** |
| Vulnerable libraries | none | none | n/a | n/a | **retire.js dataset (Apache-2.0, daily updates), informational severity, `ast` extractors via the AST pass** |
| Validation | dep-confusion only | none | full active verification, cached, tri-state | none | **Tri-state, per-provider toggles, read-only endpoints, OFF by default** |
| DOM sinks | none | 27 flat patterns (noise) | n/a | n/a | **Refused. postMessage origin verdict only. Defer to DOMLogger++.** |
| JWT | none | regex → "JWT Token, medium" | detector exists | n/a | **Decode + judge (`alg:none`, `exp`, `iss`, `kid`)** |
| Diffing | none | none | n/a | n/a | **Finding-set diff across deploys (P3)** |
| Beautify before scan | no | **yes** (`js-beautify` 1.15.4) | n/a | n/a | Evaluate — improves context lines, costs CPU on the hot path. Background-only if adopted. |
| Scope gating | no | **yes** (`inScopeOnly`) | n/a | n/a | **Yes, on by default** |
| Size cap | no | no | n/a | n/a | **Yes** (jssecrets uses 2 MB; make it configurable) |

---

## Sources

**Primary — source read directly**
- `PortSwigger/js-miner` local clone: `Constants.java`, `Secrets.java`, `SubDomains.java`, `DependencyConfusion.java`, `ActiveSourceMapper.java`, `SourceMapper.java`, `FileUtils.java`, `Utilities.java`, `ScannerBuilder.java` — last release 2023-07-20
- `caido-community/JS-Analyzer` (cloned, HEAD `8551df7`, 2026-03-10): all 10 analyzers, `patterns/*.ts`, `autoScanService.ts`, `runPassiveScan.ts`, `constants.ts` — https://github.com/caido-community/JS-Analyzer
- `BishopFox/jsluice` (cloned, MIT): `secret-matchers.go`, `secret-aws.go`, `secret-gcp.go`, `url-matchers.go`, `maybeurl.go` — https://github.com/BishopFox/jsluice
- `gitleaks/gitleaks` `config/gitleaks.toml` (MIT): 222 rules, 221 with `keywords`, 130 with `entropy`, 13 `rules.allowlists` — https://github.com/gitleaks/gitleaks
- `RetireJS/retire.js` `repository/jsrepository-v2.json` (Apache-2.0): 76 libraries, 723 vulnerabilities, extractor-method census, daily auto-update commits verified via GitHub API — https://github.com/RetireJS/retire.js
- `projectdiscovery/nuclei-templates` (MIT): `file/keys/` (107 entries), `http/exposures/tokens/` provider dirs, `stripe-api-key.yaml` — https://github.com/projectdiscovery/nuclei-templates

**Detector architecture**
- TruffleHog `pkg/detectors/detectors.go` — `Detector` interface, `Result` struct, `Versioner`/`EndpointCustomizer`/`MaxSecretSizeProvider` — https://github.com/trufflesecurity/trufflehog
- TruffleHog `pkg/detectors/falsepositives.go` — `fp_words.txt`/`fp_badlist.txt`/`fp_programmingbooks.txt`/`fp_uuids.txt`, Aho-Corasick trie, `IsKnownFalsePositive()`, `FilterResultsWithEntropy()`
- TruffleHog `pkg/detectors/stripe/stripe.go` — keyword `k_live`, regex `[rs]k_live_[a-zA-Z0-9]{20,247}`, verify via `GET /v1/charges`, `200` **or** `403` = verified
- TruffleHog custom-detector YAML (`successRanges` / `rotatedRanges`) via Context7 `/trufflesecurity/trufflehog` — https://github.com/trufflesecurity/trufflehog/blob/main/pkg/custom_detectors/CUSTOM_DETECTORS.md
- License verification via GitHub API: TruffleHog **AGPL-3.0**, Gitleaks **MIT**, jsluice **MIT**, SecretFinder **GPL-3.0**, retire.js **Apache-2.0**, nuclei-templates **MIT**, acorn **MIT**

**Competitive landscape (Caido)**
- `kevin-mizu/domloggerpp-caido` (47★) — runtime JS-sink hooking via browser extension + webhook into Caido — https://github.com/kevin-mizu/domloggerpp-caido
- `diegoespindola/jssecrets-caido-plugin` (2026-08-14) — 14 patterns, 2 MB cap, custom-pattern editor — https://github.com/diegoespindola/jssecrets-caido-plugin
- `rust-memo/caido-js-secret-hunter`, `F2u0a0d3/JSLogger`, `vitorfhc/caido-rpc-mapper` — GitHub topic `caido-plugin`, sorted by update date

**Techniques**
- `xia0maiiii/webpack-dl` — JSONP push-trick + 3-strategy static chunk-map extraction (`__webpack_require__.u` / `.p`, hash-map anchoring, `jsonpScriptSrc`) — https://github.com/xia0maiiii/webpack-dl
- js-recon `lazyload` / `strings` modules, `--openapi` export — https://js-recon.io/docs/guides/next_js/fuzzing_endpoints
- `rarecoil/unwebpack-sourcemap` + Sentry "Abusing Exposed Sourcemaps" — `sourcesContent` recovery, path-traversal risk — https://github.com/rarecoil/unwebpack-sourcemap
- `robre/jsmon` — JS change monitoring + diff notification — https://github.com/robre/jsmon
- `streaak/keyhacks` — ~80 services' validation calls (no license; reimplement from provider docs) — https://github.com/streaak/keyhacks
- Clairvoyance / graphw00f — GraphQL schema recovery via field suggestions when introspection is disabled — https://www.intigriti.com/researchers/blog/hacking-tools/five-easy-ways-to-hack-graphql-targets

**FP / noise evidence**
- Mozilla Attack & Defense, "Finding and Fixing DOM-based XSS with Static Analysis" — static analysis *"easily fooled by minification, bundling or obfuscation"* — https://blog.mozilla.org/attack-and-defense/2021/11/03/finding-and-fixing-dom-based-xss-with-static-analysis/
- NDSS'18 "Riding out DOMsday" — static DOM-XSS detection has high FP rates — https://mahmoods01.github.io/files/ndss18-dom-xss.pdf
- ConfuGuard (2025) — naive dependency-confusion detection ~80% FP, reduced to ~28% — via TypoSmart/ConfuGuard coverage
- Firebase docs — web `apiKey` is public by design — https://firebase.google.com/docs/projects/api-keys
- Truffle Security, "Google API Keys Weren't Secrets. But then Gemini Changed the Rules" — ~3,000 public Maps-era keys now authenticate to Gemini — https://trufflesecurity.com/blog/google-api-keys-werent-secrets-but-then-gemini-changed-the-rules
- QuantumSec — bug bounty FP rates of 30–50% in well-scoped programs — https://www.quantumsec.es/en/resources/false-positives-in-bug-bounty/

---
*Feature research for: offensive-security JavaScript / static-asset mining (Caido plugin)*
*Researched: 2026-08-20*
