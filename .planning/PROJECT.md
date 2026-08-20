# DefMiner

## What This Is

A Caido plugin that mines JavaScript and other static assets for attack surface: secrets, subdomains, cloud storage URLs, API endpoints, dependency-confusion candidates, and reconstructed source code from sourcemaps. It is the spiritual successor to the Burp extension [JSMiner](https://github.com/PortSwigger/js-miner) — same problem, rebuilt on the Caido SDK with detection quality that is a generation better. It is for bug bounty hunters and pentesters who live in the proxy and want the JS on every target to give up everything it knows, automatically, as they browse.

## Core Value

**When a target's JavaScript contains something that expands the attack surface, DefMiner surfaces it — with a low enough false-positive rate that the operator actually reads every finding.**

Everything else is negotiable. A tool that finds more but drowns the operator in noise is worse than useless, because it trains them to ignore it. Signal quality is the product.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

<!-- Current scope. Building toward these. -->

**JSMiner parity (the floor, not the goal)**

- [ ] Passive secret/credential detection with confidence scoring
- [ ] Passive subdomain extraction, scoped to the target's root domain
- [ ] Passive cloud-storage URL detection (AWS, Azure, GCP, CloudFront, DigitalOcean, Oracle, Alibaba, Firebase, Rackspace, DreamHost)
- [ ] Dependency confusion detection, verified against the NPM registry
- [ ] Sourcemap reconstruction — inline base64 sourcemaps (passive) and `.map` discovery (active)
- [ ] Static file dumping to disk for offline tooling
- [ ] API endpoint extraction (GET/POST/PUT/DELETE/PATCH)

**The upgrades that justify building this**

- [ ] Provider-specific secret detectors (AWS, GCP, GitHub, Slack, Stripe, Twilio, SendGrid, OpenAI, …) instead of one generic regex, each with its own shape and confidence
- [ ] Multi-signal confidence scoring: entropy AND provider pattern AND surrounding code context AND a real false-positive corpus — not entropy alone
- [ ] Endpoint extraction via JavaScript AST parsing, not just regex — catches `fetch()`, axios, XHR, router definitions, and template-built URLs that regex cannot see
- [ ] Webpack/Vite chunk graph discovery — find lazy-loaded chunks the browser never requested
- [ ] GraphQL operation and schema extraction from bundles
- [ ] DOM XSS source/sink hints and `postMessage` handler discovery
- [ ] JWT detection with claim decoding (`alg`, `iss`, `exp`, audience)
- [ ] Hardcoded internal hosts, private IPs, and non-public infrastructure references
- [ ] Vulnerable/outdated JS library fingerprinting
- [ ] Secret validation against the issuing provider to mark keys LIVE vs revoked — **built but OFF by default**
- [ ] Re-scan diffing: tell the operator what changed in a bundle since the last deploy
- [ ] A dedicated workspace UI: JS asset inventory, filterable findings table, reconstructed-source viewer, JSON/CSV export
- [ ] Native Caido Findings for high-severity results, deduplicated

**Product quality (required for the store)**

- [ ] Published to the Caido Community Store, meeting the Developer Policy
- [ ] Test suite with a real corpus of JS bundles and a measured false-positive rate
- [ ] No telemetry, no obfuscation, LICENSE present, semver

### Out of Scope

- **Rewriting Caido's Scanner** — DefMiner analyses static assets. Active vulnerability scanning is the [scanner](https://github.com/caido-community/scanner) plugin's job; we do not duplicate it.
- **Exploitation** — DefMiner reports attack surface. Turning a found key into impact is the operator's call, deliberately. A tool that auto-exploits found credentials is a liability.
- **Non-JS deep analysis (WASM decompilation, sourcemap-less minified reversal)** — enormous scope, marginal return versus the core features. Revisit only if the core proves itself.
- **A hosted/cloud component** — everything runs local, inside Caido. No accounts, no backend service, nothing to trust.
- **Burp compatibility layer** — this is a Caido plugin. Portability would compromise the design.

## Context

**Why not just use JSMiner.** JSMiner is a Burp extension, and Caido has no equivalent. But porting it verbatim would be a waste — the original's detection is naive in ways that matter:

- `Constants.java:SECRETS_REGEX` is a *single* regex matching `secret|token|password|api_key|...` followed by a quoted value. No provider-specific patterns. Every AWS key, GitHub PAT, and Stripe key is found only if it happens to sit next to a variable named like a secret.
- False-positive filtering is a three-item list — `basic`, `bearer`, `token` (`Secrets.java:isNotFalsePositive`) — plus a length check of 4 characters.
- Endpoint extraction is `\.[$]?get\(['"`]?(.*?)['"`]?\)` and four siblings (`Constants.java`). This catches jQuery/axios `.get()` and nothing else. `fetch()`, `XMLHttpRequest`, route tables, and template-literal URLs are all invisible.
- Entropy is the only confidence signal, applied to a single regex group.
- Last commit: **2023-07-20** (`420c566`, "BApp Store release v1.16"). The project is effectively unmaintained.

That gap — not the port itself — is the reason this project is worth building.

**Caido SDK capabilities, verified against `developer.caido.io/llms-full.txt`:**

- `sdk.events.onInterceptResponse((sdk, request, response) => …)` is a real passive hook fired on every proxied response. This is the passive-scan idiom; no polling required.
- `sdk.findings.create({ title, description, reporter, request, dedupeKey })` with `sdk.findings.exists(dedupeKey)` gives native findings and deduplication.
- `sdk.requests.query().filter('<HTTPQL>').first(n).execute()` with cursor pagination enables retroactive scanning of already-captured traffic — the "select all in sitemap and dump" workflow.
- Backend plugins run in **QuickJS**, not Node. `caido:http` provides `fetch`; `llrt/fs` provides filesystem; `child_process.spawn` exists but `exec` does not and streams cannot `pipe()`. SQLite is available via `sdk.meta.db()`.
- Frontend is Vue 3 + PrimeVue, dark theme by default, sidebar pages registered via `sdk.navigation.addPage()`.

**Operator context.** The primary user is a bug bounty hunter running Caido against live targets. They browse an application, and JS analysis should happen silently in the background, producing findings they review later. They already run heavy recon tooling separately; DefMiner's job is the in-proxy, in-the-moment layer that recon pipelines miss.

## Constraints

- **Runtime**: Backend logic runs in QuickJS, not Node.js — no native modules, no worker threads, constrained CPU and memory. Every library considered for bundling (AST parsers, sourcemap decoders) must be verified to run there before it is designed in.
- **Performance**: Passive analysis fires on every proxied response, in the request path. Modern SPA bundles are routinely 2–10 MB of minified JS. Analysis must be budgeted and backgrounded so it can never stall the proxy — this is the single hardest engineering constraint in the project.
- **Tech stack**: TypeScript throughout, no `any`. Backend `@caido/sdk-backend`, frontend `@caido/sdk-frontend` + Vue 3 + PrimeVue, pnpm monorepo, scaffolded from `pnpm create @caido-community/plugin`.
- **Network**: Sourcemap `.map` guessing sends requests to the target; NPM registry lookups send package names to npmjs.com. Both are ON by default per operator decision. Secret validation sends the actual secret to a third party and is OFF by default.
- **Distribution**: Caido Developer Policy — no obfuscated code, no undisclosed telemetry, no undisclosed external service calls, LICENSE required, semver required.
- **Signal quality**: A measured false-positive rate on a real corpus is a release gate, not a nice-to-have. See Core Value.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Build on Caido rather than port JSMiner to Burp | Caido has no equivalent tool; JSMiner is unmaintained since 2023 and its detection is weak enough that a port would inherit its ceiling | — Pending |
| Hybrid regex + AST detection engine | Regex in the passive hot path keeps the proxy fast; a real AST parser in the background unlocks endpoints, DOM sinks, and postMessage that regex structurally cannot find | — Pending |
| Sourcemap guessing and NPM lookups ON by default | Operator decision — matches JSMiner behaviour and maximises findings out of the box. Both are disclosed and individually disableable | — Pending |
| Secret validation built but OFF by default | It is the highest-value detector *and* the only one that transmits a live secret to a third party and can alert the key's owner. Shipping it on by default would be a footgun | — Pending |
| Native Findings **and** a dedicated workspace page | Findings integrate with the operator's existing Caido flow; the workspace is needed for things Findings cannot express — asset inventory, reconstructed source browsing, cross-deploy diffs | — Pending |
| Target the Caido Community Store | Sets the quality bar (tests, docs, LICENSE, no telemetry) and is the only way this reaches the people who need it | — Pending |
| Cross-review every phase with Codex (gpt-5.6-sol, xhigh) | Independent adversarial review from a different model catches design and implementation flaws that self-review does not | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-08-20 after initialization*
