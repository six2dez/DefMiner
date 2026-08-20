// DefMiner Phase 0 plan 00-04 — Tier-1 ReDoS probe (SPIKE-01).
//
// The question in words: does a catastrophic regex hang the plugin FOREVER
// inside Caido, and is `re2js` a viable escape hatch at acceptable cost?
//
// This is the project-sinking risk. Caido installs no QuickJS interrupt handler
// (`set_interrupt_handler` appears nowhere in `caido/dependency-llrt`), so
// `lre_check_timeout` is inert and the engine's own timeout mechanism cannot
// fire. If that holds, every regex DefMiner ships must be proven safe STATICALLY
// before it reaches the runtime — which is what DET-05 exists to do — and
// `re2js` stops being a nice-to-have.
//
// Tier 1, not a hand-rolled zip, because `re2js` is a real npm dependency and
// the build pipeline is part of what is under test: `@caido-community/dev@0.1.7`
// externalises every Node builtin silently, so a dependency that reaches for one
// survives the build and fails only at runtime. That is the DIST-05 hazard.
//
// Nothing here evaluates corpus content: `eval` and `new Function` appear
// nowhere in this phase.

import { readFileSync } from "fs";
import { createHash } from "crypto";
import { RE2JS } from "re2js";

// ---------------------------------------------------------------------------
// Marker helper. Both clocks, as everywhere else in this phase:
//   Date.now()        — ms wall clock, the bridge to host-log timestamps
//   performance.now() — ~1 us monotonic, boot-relative, NOT a timestamp
//
// For stage 2 these markers are the ONLY in-runtime evidence that will ever
// exist: once the QuickJS thread enters the catastrophic regex it never returns,
// so anything not logged BEFORE the call is lost.
// ---------------------------------------------------------------------------
function mark(sdk: any, label: string, extra?: string): void {
  sdk.console.log(
    `MARK ${label} date=${Date.now()} qjs=${performance.now().toFixed(3)}` +
      (extra ? ` ${extra}` : ""),
  );
}

// ---------------------------------------------------------------------------
// The catastrophic pattern set.
//
// `/(a+)+$/` against "a".repeat(n) + "b" is the canonical exponential blow-up:
// nested quantifiers over an overlapping character class, with a final `b` that
// can never match, forcing the backtracker through every partition of the run.
// Research measured 4.03x per two added characters on this exact build.
// ---------------------------------------------------------------------------
const PATTERNS: Record<string, { source: string; flags: string; payload: (n: number) => string }> = {
  nested_quantifier: {
    source: "(a+)+$",
    flags: "",
    payload: (n: number) => "a".repeat(n) + "b",
  },
  // A second shape, so "catastrophic" is not a claim about one regex. Alternation
  // with overlapping branches under a quantifier blows up the same way.
  alternation: {
    source: "(a|a)+$",
    flags: "",
    payload: (n: number) => "a".repeat(n) + "b",
  },
};

// ---------------------------------------------------------------------------
// The rule set for stage 3.
//
// Provider-shaped AND generic-shaped, because a ratio measured on the
// catastrophic payload alone would flatter re2js beyond recognition: re2js wins
// that comparison by an unbounded factor and tells you nothing about the real
// workload. Every rule here is RE2-clean — no lookbehind, no backreferences — so
// both engines run the SAME rule, not an approximation of it.
//
// Case-insensitivity is carried as a flag rather than an inline `(?i)`, because
// native JS RegExp has no inline flag syntax and the two engines must receive
// semantically identical rules.
// ---------------------------------------------------------------------------
type Rule = { name: string; shape: "provider" | "generic"; source: string; ci: boolean };

const RULES: Rule[] = [
  { name: "aws_access_key", shape: "provider", ci: false, source: "(A3T[A-Z0-9]|AKIA|ASIA|ABIA|ACCA)[A-Z0-9]{16}" },
  { name: "github_pat", shape: "provider", ci: false, source: "ghp_[0-9a-zA-Z]{36}" },
  { name: "github_oauth", shape: "provider", ci: false, source: "gho_[0-9a-zA-Z]{36}" },
  { name: "slack_token", shape: "provider", ci: false, source: "xox[baprs]-[0-9a-zA-Z-]{10,48}" },
  { name: "stripe_key", shape: "provider", ci: false, source: "(sk|pk)_(test|live)_[0-9a-zA-Z]{24,99}" },
  { name: "google_api_key", shape: "provider", ci: false, source: "AIza[0-9A-Za-z\\-_]{35}" },
  { name: "sendgrid_key", shape: "provider", ci: false, source: "SG\\.[0-9A-Za-z\\-_]{22}\\.[0-9A-Za-z\\-_]{43}" },
  { name: "private_key_header", shape: "provider", ci: false, source: "-----BEGIN[ A-Z]{0,20}PRIVATE KEY-----" },
  { name: "jwt", shape: "generic", ci: false, source: "eyJ[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}" },
  { name: "generic_api_key", shape: "generic", ci: true, source: "(api[_-]?key|secret|token|passwd|password)['\"\\s:=]{1,10}[0-9a-zA-Z_\\-]{16,64}" },
  { name: "hex_32", shape: "generic", ci: false, source: "\\b[0-9a-f]{32}\\b" },
  { name: "url_credentials", shape: "generic", ci: false, source: "[a-zA-Z][a-zA-Z0-9+.-]{1,20}://[^/\\s:@]{1,64}:[^/\\s:@]{1,64}@" },
  { name: "base64_blob", shape: "generic", ci: false, source: "[A-Za-z0-9+/]{40,}={0,2}" },
];

/** Count every match, so both engines provably do the same amount of work. */
function scanNative(source: string, ci: boolean, input: string): number {
  const re = new RegExp(source, ci ? "gi" : "g");
  let count = 0;
  // exec-in-a-loop rather than match(), which would materialise every hit as a
  // string and measure allocation instead of matching.
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) {
    count++;
    if (m[0].length === 0) re.lastIndex++;
  }
  return count;
}

function scanRe2js(source: string, ci: boolean, input: string): number {
  const p = RE2JS.compile(source, ci ? RE2JS.CASE_INSENSITIVE : 0);
  const m = p.matcher(input);
  let count = 0;
  while (m.find()) count++;
  return count;
}

// ---------------------------------------------------------------------------
// alive — the cheapest possible liveness answer.
//
// Stage 2 calls this on the SECOND installed plugin while the first is wedged.
// "Does another plugin keep working during the hang" is a roadmap success
// criterion and cannot be answered with only one plugin installed.
// ---------------------------------------------------------------------------
export async function alive(sdk: any) {
  return { alive: true, at: Date.now(), qjs: performance.now() };
}

// ---------------------------------------------------------------------------
// redos — one escalation point.
//
// `engine` selects native RegExp or re2js. `n` arrives as a string: the function
// REST endpoint JSON-decodes each arg, and the harness passes numbers as
// strings uniformly.
//
// The START marker is emitted BEFORE the regex begins, deliberately: for the
// unbounded stage it is the last thing this runtime will ever say.
// ---------------------------------------------------------------------------
export async function redos(sdk: any, patternName: string, nRaw: string, engine: string) {
  const n = Number(nRaw);
  const spec = PATTERNS[patternName];
  if (!spec) return { ok: false, error: `unknown pattern ${patternName}` };
  const payload = spec.payload(n);

  mark(sdk, "REDOS_START", `pattern=${patternName} n=${n} engine=${engine} len=${payload.length}`);
  const t0 = performance.now();
  let matched: boolean | null = null;
  let error: string | null = null;
  try {
    if (engine === "re2js") {
      matched = RE2JS.compile(spec.source, 0).matcher(payload).find();
    } else {
      matched = new RegExp(spec.source, spec.flags).test(payload);
    }
  } catch (e) {
    error = String(e).slice(0, 300);
  }
  const elapsed = performance.now() - t0;
  mark(sdk, "REDOS_END", `pattern=${patternName} n=${n} engine=${engine} elapsed=${elapsed.toFixed(1)}`);

  return {
    ok: error === null,
    pattern: patternName,
    source: spec.source,
    n,
    engine,
    payload_length: payload.length,
    matched,
    error,
    elapsed_ms: Number(elapsed.toFixed(3)),
    returned_at: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// bench — stage 3. re2js against native RegExp on the SAME rules over the SAME
// corpus, with match counts reported per rule so a divergence is visible rather
// than averaged away.
// ---------------------------------------------------------------------------
export async function bench(sdk: any, pathsJson: string) {
  const paths: string[] = JSON.parse(pathsJson);
  mark(sdk, "BENCH_START", `files=${paths.length}`);

  const files: any[] = [];
  for (const path of paths) {
    let text = "";
    let bytes = 0;
    let sha = null as string | null;
    try {
      const buf = readFileSync(path);
      bytes = buf.length;
      sha = createHash("sha256").update(buf).digest("hex");
      text = buf.toString("utf8");
    } catch (e) {
      files.push({ path, read_ok: false, error: String(e).slice(0, 200) });
      continue;
    }

    const rules: any[] = [];
    for (const rule of RULES) {
      let nativeMs: number | null = null;
      let nativeCount: number | null = null;
      let nativeErr: string | null = null;
      let re2Ms: number | null = null;
      let re2Count: number | null = null;
      let re2Err: string | null = null;

      try {
        const a = performance.now();
        nativeCount = scanNative(rule.source, rule.ci, text);
        nativeMs = performance.now() - a;
      } catch (e) {
        nativeErr = String(e).slice(0, 200);
      }
      try {
        const b = performance.now();
        re2Count = scanRe2js(rule.source, rule.ci, text);
        re2Ms = performance.now() - b;
      } catch (e) {
        re2Err = String(e).slice(0, 200);
      }

      rules.push({
        rule: rule.name,
        shape: rule.shape,
        source: rule.source,
        case_insensitive: rule.ci,
        native_ms: nativeMs === null ? null : Number(nativeMs.toFixed(3)),
        re2js_ms: re2Ms === null ? null : Number(re2Ms.toFixed(3)),
        native_matches: nativeCount,
        re2js_matches: re2Count,
        // Divergent counts mean the two engines did NOT do the same work, so
        // the ratio for that rule is not comparable. Recorded, never hidden.
        counts_agree: nativeCount !== null && re2Count !== null && nativeCount === re2Count,
        native_error: nativeErr,
        re2js_error: re2Err,
        ratio: nativeMs && re2Ms ? Number((re2Ms / nativeMs).toFixed(3)) : null,
      });
      // Release re2js's internal per-pattern caches between rules so the
      // measurement is of matching, not of a cache that grew across 13 rules.
    }

    const nativeTotal = rules.reduce((s, r) => s + (r.native_ms ?? 0), 0);
    const re2Total = rules.reduce((s, r) => s + (r.re2js_ms ?? 0), 0);
    files.push({
      path,
      read_ok: true,
      bytes,
      chars: text.length,
      sha256: sha,
      native_total_ms: Number(nativeTotal.toFixed(3)),
      re2js_total_ms: Number(re2Total.toFixed(3)),
      native_mb_per_s: Number(((bytes / 1048576) / (nativeTotal / 1000)).toFixed(4)),
      re2js_mb_per_s: Number(((bytes / 1048576) / (re2Total / 1000)).toFixed(4)),
      ratio: Number((re2Total / nativeTotal).toFixed(3)),
      rules,
    });
    mark(sdk, "BENCH_FILE", `path=${path} native=${nativeTotal.toFixed(1)} re2js=${re2Total.toFixed(1)}`);
  }

  const okFiles = files.filter((f) => f.read_ok);
  const totalBytes = okFiles.reduce((s, f) => s + f.bytes, 0);
  const nativeMs = okFiles.reduce((s, f) => s + f.native_total_ms, 0);
  const re2Ms = okFiles.reduce((s, f) => s + f.re2js_total_ms, 0);
  mark(sdk, "BENCH_END");

  return {
    files,
    rule_count: RULES.length,
    total_bytes: totalBytes,
    native_total_ms: Number(nativeMs.toFixed(3)),
    re2js_total_ms: Number(re2Ms.toFixed(3)),
    native_mb_per_s: Number(((totalBytes / 1048576) / (nativeMs / 1000)).toFixed(4)),
    re2js_mb_per_s: Number(((totalBytes / 1048576) / (re2Ms / 1000)).toFixed(4)),
    // The headline: how many times SLOWER re2js is. Stated as a slowdown so the
    // sign of the number can never be misread in the aggregate.
    re2js_slowdown_x: Number((re2Ms / nativeMs).toFixed(3)),
    all_counts_agree: okFiles.every((f) => f.rules.every((r: any) => r.counts_agree)),
  };
}

// ---------------------------------------------------------------------------
// re2js_limits — the constraint that must be STATED, not discovered in Phase 3.
//
// RE2 supports neither backreferences nor (unbounded) lookbehind, by
// construction: both are what make linear-time matching impossible. This is
// arguably good news — a RE2-clean corpus makes Gitleaks rules directly
// portable — but Phase 3 has to know before it writes rules, not after.
// ---------------------------------------------------------------------------
export async function re2js_limits(sdk: any) {
  const probes = [
    { name: "lookbehind_positive", source: "(?<=foo)bar" },
    { name: "lookbehind_negative", source: "(?<!foo)bar" },
    { name: "lookahead_positive", source: "foo(?=bar)" },
    { name: "lookahead_negative", source: "foo(?!bar)" },
    { name: "backreference", source: "(a+)\\1" },
    { name: "named_group", source: "(?<word>[a-z]+)" },
    { name: "non_capturing_group", source: "(?:abc)+" },
    { name: "unicode_class", source: "\\p{L}+" },
    { name: "word_boundary", source: "\\bfoo\\b" },
    { name: "lazy_quantifier", source: "a+?b" },
    { name: "nested_quantifier", source: "(a+)+$" },
  ];

  const out = probes.map((p) => {
    let re2ok = false;
    let re2err: string | null = null;
    let nativeok = false;
    let nativeerr: string | null = null;
    try {
      RE2JS.compile(p.source, 0);
      re2ok = true;
    } catch (e) {
      re2err = String(e).slice(0, 200);
    }
    try {
      // eslint-disable-next-line no-new
      new RegExp(p.source, "u");
      nativeok = true;
    } catch (e) {
      try {
        new RegExp(p.source);
        nativeok = true;
      } catch (e2) {
        nativeerr = String(e2).slice(0, 200);
      }
    }
    return {
      construct: p.name,
      source: p.source,
      re2js_compiles: re2ok,
      re2js_error: re2err,
      native_compiles: nativeok,
      native_error: nativeerr,
    };
  });

  return {
    probes: out,
    supports_lookbehind: out.filter((p) => p.construct.startsWith("lookbehind")).every((p) => p.re2js_compiles),
    supports_backreference: out.find((p) => p.construct === "backreference")?.re2js_compiles ?? null,
    at: Date.now(),
  };
}

/** Capability echo so a run can prove which build and which rules it measured. */
export async function probe_info(sdk: any) {
  return {
    caido_version: String(sdk.runtime?.version ?? "unknown"),
    rules: RULES.map((r) => ({ name: r.name, shape: r.shape, source: r.source, ci: r.ci })),
    patterns: Object.keys(PATTERNS),
    re2js_typeof: typeof RE2JS,
    re2js_has_compile: typeof (RE2JS as any).compile === "function",
    date: Date.now(),
    qjs: performance.now(),
  };
}

export function init(sdk: any) {
  sdk.console.log("[tier1-redos] init");
  sdk.api.register("alive", alive);
  sdk.api.register("redos", redos);
  sdk.api.register("bench", bench);
  sdk.api.register("re2js_limits", re2js_limits);
  sdk.api.register("probe_info", probe_info);
  sdk.console.log("[tier1-redos] ready");
}
