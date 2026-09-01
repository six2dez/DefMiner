// DefMiner Phase 6 plan 06-11 — the push-down superset ORACLE.
//
// Its own manifest id (`defminer-pushdown-superset`), distinct from every Phase 0
// probe and from `defminer-phase6-o07`, so it can never collide with them or with
// the long-lived recorder.
//
// THE ONE QUESTION: for a given HTTPQL clause, what does CAIDO'S OWN EVALUATOR
// say about each stored (request, response) pair?
//
// WHY THIS HAS TO BE A PLUGIN AT ALL. `sdk.requests.matches(filter, request,
// response)` is a plugin-runtime method. It does not exist in node, and faking it
// would mean inventing an HTTPQL engine — at which point the suite would be a test
// of the fake. D-06 is a claim about Caido's matching semantics, so only Caido can
// answer it.
//
// ===========================================================================
// THIS FILE RECORDS. IT DOES NOT DECIDE.
// ===========================================================================
// There is NO media-type list here, NO suffix test, and no notion of what should
// have matched. This is a transcript of one evaluator's answers. Every judgement —
// the superset implication, the non-vacuity negative, the coverage of the corpus —
// happens in `tests/phase6-pushdown.spec.ts`, against the SHIPPED `isScriptish`
// imported from `packages/backend/src/hooks/admit.ts`.
//
// That separation is the whole design and it is worth stating plainly: a probe
// that starts deciding is a second copy of the kind axis wearing a different
// filename, and a proof in which both halves are copies of each other proves
// nothing. The two halves run in two runtimes on purpose, and they are joined by
// FIXTURE IDENTITY in the harness, never by shared logic.
//
// THE CLAUSE IS ECHOED BACK OUT, unmodified, in the returned record. The artifact
// then carries the exact bytes that were evaluated rather than a claim about them,
// and the gate asserts those bytes byte-identical to the shipped `SCAN_KIND_CLAUSE`.
// Without that echo the split-runtime proof has nothing tying it to the constant
// that ships.
//
// NOTHING HERE RECORDS BODY CONTENT. Ids, URLs, status codes, one header per
// response and one boolean. `eval` and `new Function` appear nowhere.
//
// Plain ESM, no `caido:` imports — the SDK arrives as the `init` argument.

const PAGE_SIZE = 50;
const MAX_PAGES = 20;

function headerOf(headers, name) {
  // Header names are case-insensitive on the getter, but `getHeaders()` returns a
  // plain record, so BOTH spellings are checked rather than assuming which one
  // Caido normalises to — the production recorder found both shapes in the field.
  // Lifted in shape from probe/phase6-o07.
  const lower = name.toLowerCase();
  const upper = name.replace(/(^|-)([a-z])/g, (_m, p, c) => p + c.toUpperCase());
  const v = headers[lower] !== undefined ? headers[lower] : headers[upper];
  if (v === undefined || v === null) return null;
  return Array.isArray(v) ? v.join(", ") : String(v);
}

/**
 * Walk the stored traffic once and record Caido's verdict per pair.
 *
 * ONE CAPTURE PASS, NOT ONE ROUND TRIP PER CASE. `matches()` is synchronous and
 * in-process, so the corpus is proxied through the instance ONCE and every
 * fixture's verdict is read here without touching the network again. That is the
 * O-03 finding that made this proof cheap enough to be a gate rather than a spike.
 *
 * THE WALK IS UNFILTERED, and deliberately so. Filtering the walk BY the clause
 * under test would make "the clause did not match" and "the pair was never
 * stored" indistinguishable — the exact confound `probe/phase6-o07` records for
 * its own query leg. The walk is ordered descending on the request id (a unique
 * integer, unlike `created_at`, which ties) and the caller joins by request path.
 *
 * @param clause - The HTTPQL clause, arriving as a plain string. Args cross the
 * plugin-function route DOUBLE-ENCODED (the `jargs` shape) and the route
 * JSON-decodes each element once, so what lands here is already the clause text
 * and must NOT be parsed again.
 */
async function evaluate(sdk, clause) {
  const filter = String(clause === undefined || clause === null ? "" : clause);
  if (filter === "") {
    return { clause: "", rows: [], count: 0, error: "empty clause" };
  }
  const rows = [];
  let after = null;
  let pages = 0;
  let hasNext = false;
  try {
    while (pages < MAX_PAGES) {
      let q = sdk.requests.query().descending("req", "id").first(PAGE_SIZE);
      if (after !== null) q = q.after(after);
      const page = await q.execute();
      pages += 1;
      const items = page.items || [];
      for (const it of items) {
        const row = {
          request_id: String(it.request.getId()),
          request_url: String(it.request.getUrl()),
          has_response: it.response !== undefined && it.response !== null,
          response_status: null,
          response_content_type: null,
          clause_matched: null,
        };
        try {
          if (it.response) {
            row.response_status = it.response.getCode();
            row.response_content_type = headerOf(it.response.getHeaders(), "content-type");
            // THE ORACLE. One synchronous call into Caido's own evaluator, on the
            // exact bytes of the clause the caller handed in.
            row.clause_matched = sdk.requests.matches(filter, it.request, it.response);
          } else {
            row.clause_matched = sdk.requests.matches(filter, it.request);
          }
        } catch (e) {
          // A THROW IS A RESULT. `matches()` on an invalid clause is itself an
          // answer, and a probe that died here would leave the caller unable to
          // tell "the clause did not match" from "the probe fell over".
          row.error = String(e).slice(0, 300);
        }
        rows.push(row);
        if (it.cursor !== undefined && it.cursor !== null) after = it.cursor;
      }
      hasNext = !!(page.pageInfo && page.pageInfo.hasNextPage);
      if (!hasNext || items.length === 0) break;
    }
  } catch (e) {
    return { clause: filter, rows: rows, count: rows.length, error: String(e).slice(0, 300) };
  }
  return {
    clause: filter,
    rows: rows,
    count: rows.length,
    pages: pages,
    has_next_page: hasNext,
  };
}

export function init(sdk) {
  sdk.console.log("[pushdown-superset] init");
  // ONE exported function. There is nothing else this probe is for, and a second
  // entry point would be a place for a decision to grow.
  sdk.api.register("evaluate", evaluate);
  sdk.console.log("[pushdown-superset] ready");
}
