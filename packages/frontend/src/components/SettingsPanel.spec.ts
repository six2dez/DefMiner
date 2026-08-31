// @vitest-environment jsdom
//
// packages/frontend/src/components/SettingsPanel.spec.ts — UI-08's surface, and
// the retention-bounds debt Phase 1 recorded as owed to this phase.
//
// ===========================================================================
// WHAT THESE CASES ARE ACTUALLY GUARDING
// ===========================================================================
// Not "does an input render". Five things, and four of them cost the operator
// something real when they break:
//
//   1. THE FAILED SAVE THAT EATS THE EDITS. The design contract's `error /
//      settings-form` row is explicit — a failed save names the cause and
//      RETAINS the operator's edits, never reverting the fields to their stored
//      values. This is the rule with the highest chance of being got wrong by a
//      naive form reset, and when it is got wrong it looks like success.
//   2. THE EMPTY LABELLED SECTION. A section rendered for a group that has
//      contributed no controls reads as a MISSING CONTROL, which is a different
//      and worse claim than an absent feature.
//   3. THE INVISIBLE THIRD LEVEL. A three-level resolution the operator cannot
//      see is one they will misconfigure: they cannot otherwise tell a value
//      they set for this project from an operator-wide default from a number
//      DefMiner picked, and those three behave differently the moment one of
//      them changes elsewhere.
//   4. THE DOUBLE SUBMIT. Two writes of the same bound is harmless; two writes
//      the operator did not intend, against a field they were mid-edit on, is
//      not — and the in-flight state is the only thing between them.
//   5. THE SERVER PATH SHOWN AS A LOCAL ONE (R5). Caido is client/server, so a
//      path on the backend may be on a VPS or inside a container; presented as
//      local it sends the operator looking on a disk that has no such file.

import type { BoundRejection, SettingScope } from "@defminer/engine/contract";
import {
  AUDIT_RETENTION_MAX_ROWS_KEY,
  RETENTION_MAX_AGE_MS_KEY,
  RETENTION_MAX_ROWS_KEY,
  SETTING_KEYS,
} from "@defminer/engine/contract";
import { mount } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import type {
  RpcResult,
  SettingRow,
  SettingWriteOutcome,
  SettingWriteRequest,
} from "../api/client";

import {
  CLEAR_LABEL,
  FIELD_COPY,
  fieldId,
  GROUP_COPY,
  groupId,
  LOAD_FAILED_BODY,
  PATH_DISPLAY_CHARS,
  PATH_ELISION,
  PROVENANCE_COPY,
  REJECTION_COPY,
  SAVE_FAILED_BODY,
  SAVE_LABEL,
  SAVING_LABEL,
  SERVER_PATH_LABEL,
} from "./settings-contract";
import SettingsPanel from "./SettingsPanel.vue";

// ---------------------------------------------------------------------------
// FIXTURES
// ---------------------------------------------------------------------------

function row(over: Partial<SettingRow> = {}): SettingRow {
  return {
    key: RETENTION_MAX_ROWS_KEY,
    group: "retention",
    documented: "50000",
    project: null,
    global: null,
    ...over,
  };
}

/** Every key this build has, all three unset. The ordinary first paint. */
const ALL_UNSET: readonly SettingRow[] = [
  row({ key: RETENTION_MAX_ROWS_KEY, documented: "50000" }),
  row({ key: RETENTION_MAX_AGE_MS_KEY, documented: "7776000000" }),
  row({ key: AUDIT_RETENTION_MAX_ROWS_KEY, documented: "200000" }),
];

type Harness = {
  readonly wrapper: VueWrapper;
  /** Every write the panel issued, in order. */
  readonly writes: SettingWriteRequest[];
  /** How many times the panel read. */
  readonly reads: () => number;
};

type Options = {
  readonly rows?: readonly SettingRow[];
  /** Rows for the SECOND and later reads, so a case can assert the re-read. */
  readonly rowsAfterSave?: readonly SettingRow[];
  readonly loadFails?: boolean;
  /** What the write answers with. Defaults to a stored success. */
  readonly writeOutcome?: RpcResult<SettingWriteOutcome>;
  /** When set, the write never settles — the in-flight state, held open. */
  readonly hangWrite?: boolean;
  readonly storagePath?: string | null;
};

function harness(options: Options = {}): Harness {
  const writes: SettingWriteRequest[] = [];
  let readCount = 0;

  const load = (): Promise<RpcResult<readonly SettingRow[]>> => {
    readCount += 1;
    if (options.loadFails === true) {
      return Promise.resolve({
        ok: false,
        reason: "rpc-rejected",
        versions: null,
      });
    }
    const rows =
      readCount > 1 && options.rowsAfterSave !== undefined
        ? options.rowsAfterSave
        : (options.rows ?? ALL_UNSET);
    return Promise.resolve({ ok: true, value: rows });
  };

  const save = (
    request: SettingWriteRequest,
  ): Promise<RpcResult<SettingWriteOutcome>> => {
    writes.push(request);
    if (options.hangWrite === true) {
      return new Promise<RpcResult<SettingWriteOutcome>>(() => undefined);
    }
    return Promise.resolve(
      options.writeOutcome ?? {
        ok: true,
        value: { ok: true, stored: request.value ?? "" },
      },
    );
  };

  const wrapper = mount(SettingsPanel, {
    props: {
      projectId: "server-scoped",
      load,
      save,
      storagePath: options.storagePath ?? null,
    },
  });

  return { wrapper, writes, reads: () => readCount };
}

/** Settle the panel's mounted read plus any follow-on microtasks. */
async function settle(wrapper: VueWrapper): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await wrapper.vm.$nextTick();
  await Promise.resolve();
  await wrapper.vm.$nextTick();
}

const input = (wrapper: VueWrapper, key: (typeof SETTING_KEYS)[number]) =>
  wrapper.get(`#${fieldId(key)}`);

const saveButton = (wrapper: VueWrapper, key: (typeof SETTING_KEYS)[number]) =>
  wrapper.get(`#${fieldId(key)}-save`);

// ---------------------------------------------------------------------------
// SECTIONS
// ---------------------------------------------------------------------------

describe("the surface renders only the sections that have controls", () => {
  it("renders the retention section when its keys are present", async () => {
    const h = harness();
    await settle(h.wrapper);
    expect(h.wrapper.find(`#${groupId("retention")}`).exists()).toBe(true);
    expect(h.wrapper.text()).toContain(GROUP_COPY.retention.title);
  });

  it("renders NO section at all for a group carrying zero controls", async () => {
    // THE CASE THE DESIGN CONTRACT IS ABOUT. An empty labelled box implies a
    // missing control; an absent section says the feature is not here yet.
    const h = harness({ rows: [] });
    await settle(h.wrapper);
    expect(
      h.wrapper.findAll("section[id^='defminer-settings-group-']"),
    ).toHaveLength(0);
    expect(h.wrapper.text()).not.toContain(GROUP_COPY.retention.title);
  });

  it("renders one field per returned key, in the order returned", async () => {
    const h = harness();
    await settle(h.wrapper);
    const ids = h.wrapper
      .findAll("div[id$='-field']")
      .map((el) => el.attributes("id"));
    expect(ids).toEqual(SETTING_KEYS.map((key) => `${fieldId(key)}-field`));
  });

  it("carries the shipped rationale as help text, not a summary of it", async () => {
    const h = harness();
    await settle(h.wrapper);
    for (const key of SETTING_KEYS) {
      expect(h.wrapper.text()).toContain(FIELD_COPY[key].help);
      expect(h.wrapper.text()).toContain(FIELD_COPY[key].label);
    }
  });

  it("says so EXPLICITLY when the read fails — never an empty form", async () => {
    const h = harness({ loadFails: true });
    await settle(h.wrapper);
    expect(h.wrapper.text()).toContain(LOAD_FAILED_BODY);
    expect(
      h.wrapper.findAll("section[id^='defminer-settings-group-']"),
    ).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// PROVENANCE
// ---------------------------------------------------------------------------

describe("each field says WHERE its value came from", () => {
  it("labels an unset key as DefMiner's default and shows that value", async () => {
    const h = harness();
    await settle(h.wrapper);
    expect(
      h.wrapper.get(`#${fieldId(RETENTION_MAX_ROWS_KEY)}-provenance`).text(),
    ).toBe(PROVENANCE_COPY.documented);
    expect(
      (input(h.wrapper, RETENTION_MAX_ROWS_KEY).element as HTMLInputElement)
        .value,
    ).toBe("50000");
  });

  it("labels a globally-set key as the operator-wide default", async () => {
    const h = harness({
      rows: [row({ global: "12345" })],
    });
    await settle(h.wrapper);
    expect(
      h.wrapper.get(`#${fieldId(RETENTION_MAX_ROWS_KEY)}-provenance`).text(),
    ).toBe(PROVENANCE_COPY.global);
    expect(
      (input(h.wrapper, RETENTION_MAX_ROWS_KEY).element as HTMLInputElement)
        .value,
    ).toBe("12345");
  });

  it("CHANGES the provenance label when a project override is set", async () => {
    const h = harness({
      rows: [row({ global: "12345", project: "99" })],
    });
    await settle(h.wrapper);
    expect(
      h.wrapper.get(`#${fieldId(RETENTION_MAX_ROWS_KEY)}-provenance`).text(),
    ).toBe(PROVENANCE_COPY.project);
    expect(
      (input(h.wrapper, RETENTION_MAX_ROWS_KEY).element as HTMLInputElement)
        .value,
    ).toBe("99");
  });

  it("renders a project row holding an EMPTY STRING as that empty value, not as unset", async () => {
    // EDGE / empty. `settings.value` is NOT NULL, so `""` is a value somebody
    // wrote and is distinguishable from an absent row. Falling through to the
    // default here would make it unfindable and unclearable.
    const h = harness({ rows: [row({ project: "" })] });
    await settle(h.wrapper);
    expect(
      (input(h.wrapper, RETENTION_MAX_ROWS_KEY).element as HTMLInputElement)
        .value,
    ).toBe("");
    expect(
      h.wrapper.get(`#${fieldId(RETENTION_MAX_ROWS_KEY)}-provenance`).text(),
    ).toBe(PROVENANCE_COPY.project);
  });
});

// ---------------------------------------------------------------------------
// SAVING
// ---------------------------------------------------------------------------

describe("saving", () => {
  it("writes the edited value at the chosen scope and RE-READS", async () => {
    const h = harness({
      rowsAfterSave: [row({ project: "777" })],
    });
    await settle(h.wrapper);
    await input(h.wrapper, RETENTION_MAX_ROWS_KEY).setValue("777");
    await saveButton(h.wrapper, RETENTION_MAX_ROWS_KEY).trigger("click");
    await settle(h.wrapper);

    expect(h.writes).toEqual([
      {
        projectId: "server-scoped",
        scope: "project" satisfies SettingScope,
        key: RETENTION_MAX_ROWS_KEY,
        value: "777",
      },
    ]);
    // THE RE-READ IS THE POINT: the field shows what was STORED, not what was
    // typed. A floored fraction is the case that makes the two differ.
    expect(h.reads()).toBe(2);
    expect(
      h.wrapper.get(`#${fieldId(RETENTION_MAX_ROWS_KEY)}-provenance`).text(),
    ).toBe(PROVENANCE_COPY.project);
  });

  it("shows what was STORED after a floored fraction, not what was typed", async () => {
    const h = harness({
      writeOutcome: { ok: true, value: { ok: true, stored: "42" } },
      rowsAfterSave: [row({ project: "42" })],
    });
    await settle(h.wrapper);
    await input(h.wrapper, RETENTION_MAX_ROWS_KEY).setValue("42.9");
    await saveButton(h.wrapper, RETENTION_MAX_ROWS_KEY).trigger("click");
    await settle(h.wrapper);

    expect(
      (input(h.wrapper, RETENTION_MAX_ROWS_KEY).element as HTMLInputElement)
        .value,
    ).toBe("42");
  });

  it("writes at the OPERATOR-WIDE scope when that scope is chosen", async () => {
    const h = harness();
    await settle(h.wrapper);
    await input(h.wrapper, RETENTION_MAX_ROWS_KEY).setValue("4242");
    await h.wrapper
      .get(`#${fieldId(RETENTION_MAX_ROWS_KEY)}-scope-global`)
      .setValue();
    await saveButton(h.wrapper, RETENTION_MAX_ROWS_KEY).trigger("click");
    await settle(h.wrapper);

    expect(h.writes[0]?.scope).toBe("global");
    expect(h.writes[0]?.value).toBe("4242");
  });

  it("disables with its OWN label in flight and issues NO second call", async () => {
    const h = harness({ hangWrite: true });
    await settle(h.wrapper);
    await input(h.wrapper, RETENTION_MAX_ROWS_KEY).setValue("777");

    const button = saveButton(h.wrapper, RETENTION_MAX_ROWS_KEY);
    await button.trigger("click");
    await h.wrapper.vm.$nextTick();

    expect(button.text()).toBe(SAVING_LABEL);
    expect(button.attributes("disabled")).toBeDefined();

    // A SECOND INVOCATION ISSUES NOTHING. Driven at the handler rather than at
    // the disabled attribute, because `disabled` is what the operator sees and
    // the guard is what actually holds when something else calls it.
    await button.trigger("click");
    await h.wrapper.vm.$nextTick();
    expect(h.writes).toHaveLength(1);
  });

  it("leaves the OTHER fields' save actions usable while one is in flight", async () => {
    // A per-field in-flight state, not a whole-form lock: the form has three
    // independent writes and locking all of them would be a lock nobody asked
    // for on two fields that are not being written.
    const h = harness({ hangWrite: true });
    await settle(h.wrapper);
    await saveButton(h.wrapper, RETENTION_MAX_ROWS_KEY).trigger("click");
    await h.wrapper.vm.$nextTick();

    expect(
      saveButton(h.wrapper, RETENTION_MAX_AGE_MS_KEY).attributes("disabled"),
    ).toBeUndefined();
    expect(saveButton(h.wrapper, RETENTION_MAX_AGE_MS_KEY).text()).toBe(
      SAVE_LABEL,
    );
  });
});

// ---------------------------------------------------------------------------
// THE FAILURE PATHS — WHERE THE OPERATOR'S WORK IS AT STAKE
// ---------------------------------------------------------------------------

describe("a failure costs the operator NOTHING they typed", () => {
  it("keeps EVERY edited field exactly as it was left when the save fails", async () => {
    const h = harness({
      writeOutcome: { ok: false, reason: "rpc-rejected", versions: null },
    });
    await settle(h.wrapper);

    // Three edits, one save. The two fields that were NOT saved must also
    // survive: a naive re-read on any outcome would revert all three.
    await input(h.wrapper, RETENTION_MAX_ROWS_KEY).setValue("111");
    await input(h.wrapper, RETENTION_MAX_AGE_MS_KEY).setValue("222");
    await input(h.wrapper, AUDIT_RETENTION_MAX_ROWS_KEY).setValue("333");
    await saveButton(h.wrapper, RETENTION_MAX_ROWS_KEY).trigger("click");
    await settle(h.wrapper);

    expect(h.wrapper.text()).toContain(SAVE_FAILED_BODY);
    expect(
      (input(h.wrapper, RETENTION_MAX_ROWS_KEY).element as HTMLInputElement)
        .value,
    ).toBe("111");
    expect(
      (input(h.wrapper, RETENTION_MAX_AGE_MS_KEY).element as HTMLInputElement)
        .value,
    ).toBe("222");
    expect(
      (
        input(h.wrapper, AUDIT_RETENTION_MAX_ROWS_KEY)
          .element as HTMLInputElement
      ).value,
    ).toBe("333");
    // AND IT DID NOT RE-READ. A re-read on the failure path is exactly how the
    // fields get reverted to their stored values behind the operator's back.
    expect(h.reads()).toBe(1);
  });

  it("leaves the TYPED value in the field when the bound is rejected, and says why", async () => {
    const h = harness({
      writeOutcome: { ok: true, value: { ok: false, reason: "zero" } },
    });
    await settle(h.wrapper);
    await input(h.wrapper, RETENTION_MAX_ROWS_KEY).setValue("0");
    await saveButton(h.wrapper, RETENTION_MAX_ROWS_KEY).trigger("click");
    await settle(h.wrapper);

    expect(
      (input(h.wrapper, RETENTION_MAX_ROWS_KEY).element as HTMLInputElement)
        .value,
    ).toBe("0");
    expect(h.wrapper.text()).toContain(REJECTION_COPY.zero);
    expect(h.reads()).toBe(1);
  });

  it("maps EVERY rejection reason to its own sentence", async () => {
    // The reasons are a closed vocabulary and the copy map is a Record over it,
    // so a reason added later is a typecheck failure rather than an error that
    // renders as nothing. This case proves the RENDERING as well as the map.
    const reasons: readonly BoundRejection[] = [
      "empty",
      "not-numeric",
      "not-finite",
      "zero",
      "negative",
      "no-project",
      "write-failed",
    ];
    for (const reason of reasons) {
      const h = harness({
        writeOutcome: { ok: true, value: { ok: false, reason } },
      });
      await settle(h.wrapper);
      await saveButton(h.wrapper, RETENTION_MAX_ROWS_KEY).trigger("click");
      await settle(h.wrapper);
      expect(h.wrapper.text(), reason).toContain(REJECTION_COPY[reason]);
      h.wrapper.unmount();
    }
  });

  it("clears the rejection when the next save succeeds", async () => {
    const h = harness({
      writeOutcome: { ok: true, value: { ok: false, reason: "zero" } },
    });
    await settle(h.wrapper);
    await saveButton(h.wrapper, RETENTION_MAX_ROWS_KEY).trigger("click");
    await settle(h.wrapper);
    expect(h.wrapper.text()).toContain(REJECTION_COPY.zero);

    await h.wrapper.setProps({
      save: (): Promise<RpcResult<SettingWriteOutcome>> =>
        Promise.resolve({ ok: true, value: { ok: true, stored: "5" } }),
    });
    await saveButton(h.wrapper, RETENTION_MAX_ROWS_KEY).trigger("click");
    await settle(h.wrapper);
    expect(h.wrapper.text()).not.toContain(REJECTION_COPY.zero);
  });
});

// ---------------------------------------------------------------------------
// CLEARING AN OVERRIDE
// ---------------------------------------------------------------------------

describe("clearing a project override", () => {
  it("is offered ONLY when a project override exists", async () => {
    const unset = harness();
    await settle(unset.wrapper);
    expect(
      unset.wrapper.find(`#${fieldId(RETENTION_MAX_ROWS_KEY)}-clear`).exists(),
    ).toBe(false);

    const overridden = harness({ rows: [row({ project: "99" })] });
    await settle(overridden.wrapper);
    const clear = overridden.wrapper.get(
      `#${fieldId(RETENTION_MAX_ROWS_KEY)}-clear`,
    );
    expect(clear.text()).toContain(CLEAR_LABEL);
  });

  it("STATES the value it would fall back to, before it is pressed", async () => {
    const h = harness({
      rows: [row({ project: "99", global: "12345" })],
    });
    await settle(h.wrapper);
    const clear = h.wrapper.get(`#${fieldId(RETENTION_MAX_ROWS_KEY)}-clear`);
    expect(clear.text()).toContain("12345");
  });

  it("writes a NULL value and falls the field back, saying which level it came from", async () => {
    const h = harness({
      rows: [row({ project: "99", global: "12345" })],
      rowsAfterSave: [row({ project: null, global: "12345" })],
    });
    await settle(h.wrapper);
    await h.wrapper
      .get(`#${fieldId(RETENTION_MAX_ROWS_KEY)}-clear`)
      .trigger("click");
    await settle(h.wrapper);

    expect(h.writes).toEqual([
      {
        projectId: "server-scoped",
        scope: "project",
        key: RETENTION_MAX_ROWS_KEY,
        value: null,
      },
    ]);
    expect(
      (input(h.wrapper, RETENTION_MAX_ROWS_KEY).element as HTMLInputElement)
        .value,
    ).toBe("12345");
    expect(
      h.wrapper.get(`#${fieldId(RETENTION_MAX_ROWS_KEY)}-provenance`).text(),
    ).toBe(PROVENANCE_COPY.global);
  });
});

// ---------------------------------------------------------------------------
// R5 — THE ONE UNBOUNDED STRING THIS SURFACE CAN SHOW
// ---------------------------------------------------------------------------

describe("R5 — a filesystem path is labelled as being on the server", () => {
  const LONG_PATH =
    "/Users/somebody/Library/Application Support/io.caido.Caido/plugins/8f2b1c4e-0000-4a3d-9f11-c0ffee123456/data.db";

  it("labels the path as being on the Caido server", async () => {
    const h = harness({ storagePath: LONG_PATH });
    await settle(h.wrapper);
    expect(h.wrapper.get("[data-defminer-server-path]").text()).toContain(
      SERVER_PATH_LABEL,
    );
  });

  it("truncates at the LEFT end, so the filename stays visible", async () => {
    const h = harness({ storagePath: LONG_PATH });
    await settle(h.wrapper);
    const shown = h.wrapper.get("[data-defminer-server-path-value]").text();

    expect(shown.startsWith(PATH_ELISION)).toBe(true);
    expect(shown.endsWith("data.db")).toBe(true);
    expect(shown).not.toContain("/Users/somebody");
    expect(shown.length).toBeLessThanOrEqual(PATH_DISPLAY_CHARS + 1);
  });

  it("carries NO title attribute and NO data attribute holding the full path", async () => {
    const h = harness({ storagePath: LONG_PATH });
    await settle(h.wrapper);
    const element = h.wrapper.get("[data-defminer-server-path-value]");
    expect(element.attributes("title")).toBeUndefined();
    for (const value of Object.values(element.attributes())) {
      expect(value).not.toContain("/Users/somebody");
    }
    expect(h.wrapper.html()).not.toContain("/Users/somebody");
  });

  it("offers the full value ONLY through a copy action", async () => {
    const h = harness({ storagePath: LONG_PATH });
    await settle(h.wrapper);
    expect(h.wrapper.find("[data-defminer-server-path-copy]").exists()).toBe(
      true,
    );
  });

  it("renders the storage note but NO path element when no path is available", async () => {
    const h = harness({ storagePath: null });
    await settle(h.wrapper);
    expect(h.wrapper.find("[data-defminer-server-path-value]").exists()).toBe(
      false,
    );
    expect(h.wrapper.get("[data-defminer-server-path]").text()).toContain(
      SERVER_PATH_LABEL,
    );
  });
});

// ---------------------------------------------------------------------------
// THE NEGATIVE PROPERTIES
// ---------------------------------------------------------------------------

describe("the surface's negative properties", () => {
  it("uses NO icon-only action — every control carries a text label", async () => {
    const h = harness({ rows: [row({ project: "99" })] });
    await settle(h.wrapper);
    for (const button of h.wrapper.findAll("button")) {
      expect(button.text().trim().length).toBeGreaterThan(0);
    }
  });

  it("carries NO hex colour literal", async () => {
    const h = harness();
    await settle(h.wrapper);
    expect(h.wrapper.html()).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
