// probe/phase6-matrix/backend/script.js — O-04, and the two assumptions the
// shipped resume position actually depends on.
//
// THE QUESTION IN WORDS: is a Caido `Cursor` stable across a process restart?
//
// WHY IT IS OPEN. `Cursor` is `string & { __cursor?: never }` — an opaque branded
// string whose lifetime is documented NOWHERE: neither the typings nor the
// published backend `requests` reference say anything about it. Under the rule
// that silence is not evidence in either direction, nobody is entitled to claim
// cursors are stable OR that they are unstable. Only a probe settles it, and the
// probe is four calls inside a restart the deployment matrix already performs.
//
// WHY A NEGATIVE ANSWER MOVES NOTHING. The shipped design does not wait on this.
// `scans.last_request_id` is the authoritative resume boundary: a decimal integer
// that survives anything, expressible as HTTPQL (`row.id.lt:N`) and therefore
// RE-DERIVABLE from the database alone. `scans.last_cursor` is an opportunistic
// fast path used within a single process lifetime, and `init()` NULLs it during
// the suspend sweep anyway — so a resume after restart always goes through
// `last_request_id` whatever this probe returns. A future reader must not mistake
// a negative result here for a defect. It is a measurement of the SDK, taken
// because the column exists to serve it and the answer was never recorded.
//
// A1 AND A2 ARE THE ASSERTIONS THAT WOULD ACTUALLY HURT. If `getId()` were not a
// decimal integer string, the `row.id.lt:N` boundary would not be expressible as
// HTTPQL at all; if `row.id` ordering disagreed with `descending("req","id")`,
// pages could overlap or skip. Both are one assertion each in this same probe,
// and both are checked here rather than assumed — they are the facts the design
// leans on, unlike O-04, which it merely offers a fast path for.
//
// THIS PROBE STORES NOTHING AND READS NO BODY. Every function returns ids,
// counts and booleans. The cursor VALUE is returned to the harness so it can be
// carried across the restart in the caller's shell, and the harness records only
// whether one was present — never the string itself, which is opaque internal
// state and has no business in a committed artifact.

/** A throw is a RESULT, not a crash. A probe that died here would leave the
 *  caller unable to tell "the cursor did not resolve" from "the probe fell
 *  over", and those are different answers to O-04. */
function failed(e) {
  return { ok: false, error: String(e).slice(0, 300) };
}

/**
 * The newest request, and its cursor. Called BEFORE the restart.
 *
 * `descending("req","id")` and not `created_at`: `id` is a unique integer and
 * `created_at` ties, so this is the same total order the shipped producer walks.
 */
async function cursorHead(sdk) {
  try {
    const page = await sdk.requests
      .query()
      .descending("req", "id")
      .first(1)
      .execute();
    const items = page.items || [];
    if (items.length === 0) {
      return { ok: true, count: 0, cursor: null, id: null };
    }
    const it = items[0];
    return {
      ok: true,
      count: items.length,
      // Returned to the HARNESS, which carries it across the restart in shell
      // state. It is never written into the result artifact.
      cursor: it.cursor === undefined || it.cursor === null ? null : String(it.cursor),
      id: String(it.request.getId()),
    };
  } catch (e) {
    return failed(e);
  }
}

/**
 * O-04's answer. Called AFTER the restart, with the cursor minted before it.
 *
 * `resolved` is TRUE when `execute()` returned a page without throwing. A page
 * of zero items still counts as resolved: the cursor pointed at the newest
 * request, so "nothing after it" is the CORRECT answer and is not the same
 * event as the cursor being rejected. Conflating the two would report a working
 * cursor as a dead one.
 */
async function cursorAfter(sdk, cursor) {
  const c = String(cursor || "");
  if (c === "") {
    return { ok: false, resolved: null, error: "no cursor supplied" };
  }
  try {
    const page = await sdk.requests
      .query()
      .descending("req", "id")
      .after(c)
      .first(1)
      .execute();
    const items = page.items || [];
    return {
      ok: true,
      resolved: true,
      count: items.length,
      id: items.length > 0 ? String(items[0].request.getId()) : null,
    };
  } catch (e) {
    // The cursor was REJECTED by a runtime that no longer recognises it. This is
    // O-04's negative answer and it is a result, not an error in the probe.
    return { ok: true, resolved: false, error: String(e).slice(0, 300) };
  }
}

/**
 * Assumptions A1 and A2, measured rather than assumed.
 *
 *   A1 — every `request.getId()` is a decimal integer string.
 *   A2 — the order `descending("req","id")` returns agrees with comparing those
 *        ids numerically, descending.
 *
 * A2 is checked on the SEQUENCE the SDK actually returned, not on a re-sort of
 * it: re-sorting and then comparing would compare the sort to itself.
 */
async function idOrder(sdk, limitStr) {
  const parsed = parseInt(String(limitStr || "20"), 10);
  const n = Number.isFinite(parsed) && parsed > 0 ? parsed : 20;
  try {
    const page = await sdk.requests
      .query()
      .descending("req", "id")
      .first(n)
      .execute();
    const ids = [];
    for (const it of page.items || []) ids.push(String(it.request.getId()));

    const decimal = ids.length > 0 && ids.every((s) => /^[0-9]+$/.test(s));
    let agrees = null;
    if (decimal && ids.length >= 2) {
      agrees = true;
      for (let i = 1; i < ids.length; i++) {
        // Number, not string. "9" > "10" is TRUE as strings, which would make a
        // string comparison here report agreement on exactly the boundary where
        // the row.id clause would go wrong.
        if (Number(ids[i - 1]) <= Number(ids[i])) {
          agrees = false;
          break;
        }
      }
    }
    return {
      ok: true,
      count: ids.length,
      // A single id cannot demonstrate an ORDER. `null` says so, rather than
      // reporting a vacuous true on a one-element list.
      id_is_decimal_integer: ids.length > 0 ? decimal : null,
      id_ordering_agrees: agrees,
      first_id: ids.length > 0 ? ids[0] : null,
      last_id: ids.length > 0 ? ids[ids.length - 1] : null,
    };
  } catch (e) {
    return failed(e);
  }
}

export function init(sdk) {
  sdk.console.log("[phase6-matrix] init");
  // Registered while `init` is still on the stack — probe/tier0-budgets measured
  // that a registration made after `init` returns is SILENTLY DROPPED. This file
  // has no imports to await, so the hazard cannot arise, and the ordering is
  // kept anyway because the next person to add an import here will not know that.
  sdk.api.register("cursorHead", cursorHead);
  sdk.api.register("cursorAfter", cursorAfter);
  sdk.api.register("idOrder", idOrder);
  sdk.console.log("[phase6-matrix] ready");
}
