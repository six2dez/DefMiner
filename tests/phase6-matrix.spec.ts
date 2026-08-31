import { existsSync, readFileSync } from "node:fs";
import { userInfo } from "node:os";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

// THE PHASE 6 DEPLOYMENT-MATRIX GATE — DEPLOY-01's evidence, kept honest.
//
// This file exercises no deployment. `scripts/phase6/matrix.sh` does, one leg at
// a time, because nothing inside the QuickJS runtime can observe a container
// boundary: "does this plugin work when the server's disk is not the operator's"
// is an external-harness question and has no answer derivable by reading code.
//
// FAIL, NEVER SKIP, and name the remedy in every message. That is the doctrine
// `tests/go-no-go.spec.ts` set and `tests/phase1-load.spec.ts` carries; an absent
// or unreadable artifact must fail here rather than pass vacuously.
//
// WHY THE VERSION CONSTANT BELOW IS THE MATRIX'S OWN (D-21).
// `tests/phase1-load.spec.ts`, `tests/phase1-runtime.spec.ts`, `tests/schema.spec.ts`,
// `tests/phase1-compat.spec.ts` and `tests/go-no-go.spec.ts` all pin "0.57.1".
// That is not drift and it is not a value to reuse: it is a deliberate
// fail-closed tripwire over artifacts whose numbers were MEASURED on 0.57.1, and
// re-running those harnesses on a newer build must fail loudly rather than
// silently rebaseline a threshold. Reusing it here would make every leg fail by
// design; editing it would contaminate the tripwire. The matrix declares its own
// and touches neither.
//
// THE THREE THINGS THIS GATE EXISTS TO CATCH, all of which look like a pass:
//
//   1. A `not_run` leg carrying assertion RESULTS it never produced. Checked as
//      TWO assertions — a reason AND all-null assertions — because either alone
//      admits the other half (D-23).
//   2. The no-volume leg reporting data PRESENT after its restart, which is what
//      `docker restart` produces: it preserves the writable layer, so the
//      assertion meant to prove ABSENCE passes having proven nothing (Pitfall 8).
//   3. Four green legs read as four independent confirmations. On one machine the
//      desktop and command-line legs SHARE A FILESYSTEM, which is the exact
//      property DEPLOY-02 and DEPLOY-03 exist because of, so only the container
//      legs test it. `shares_filesystem_with` and the verdict's
//      `remote_filesystem_property` are what make that limit readable.
//
// AND WHY THIS ARTIFACT DOES NOT LIVE IN THE PHASE 0 RESULTS DIRECTORY
// (Pitfall 7, T-06-53). Phase 0's directory holds the threshold artifacts every
// later phase budgets against. A Phase 6 measurement written beside them — even a
// correct one — makes the boundary between "measured on the build the thresholds
// belong to" and "measured on today's build" unreadable.

const RESULT =
  ".planning/phases/06-retroactive-scan-deployment-reality/results/matrix-result.json";
const SCHEMA =
  ".planning/phases/06-retroactive-scan-deployment-reality/results/matrix-result.schema.json";
const EXPECTED_CAIDO_VERSION = "0.58.2";
const REMEASURE = "re-run `bash scripts/phase6/matrix.sh`";
const STATUSES = ["pass", "fail", "inconclusive", "not_run"];

// THE DECLARED ORDER, and the gate asserts the ORDER and not merely the set. A
// leg that is dropped and re-appended looks identical to a leg that ran, unless
// position is checked: the native legs run first because they are the cheap ones
// that fail fast, and the no-volume leg runs last because it is the one whose
// result the whole requirement turns on.
const DECLARED_LEGS = [
  "local-desktop",
  "remote-cli",
  "docker-volume",
  "docker-no-volume",
];
const NO_VOLUME_LEG = "docker-no-volume";
const ASSERTION_KEYS = [
  "install_and_compatible",
  "migrations_and_tables",
  "artifact_and_observation",
  "restart_data_presence",
];

/* eslint-disable @typescript-eslint/no-explicit-any --
   The artifact is plain recorded JSON written by a shell script, with no shipped
   type. A parallel interface here would be a second hand-maintained copy of that
   shape, and the gate would then be checking the copy. */

function loadJson(path: string): any {
  const raw = readFileSync(path, "utf8");
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`${path} is not valid JSON: ${(err as Error).message}`);
  }
}

const d = existsSync(RESULT) ? loadJson(RESULT) : null;

/** Every string anywhere in the artifact, with its path. */
function strings(
  value: unknown,
  path = "$",
  out: Array<{ path: string; value: string }> = [],
): Array<{ path: string; value: string }> {
  if (typeof value === "string") out.push({ path, value });
  else if (Array.isArray(value)) {
    value.forEach((v, i) => strings(v, `${path}[${i}]`, out));
  } else if (value !== null && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      strings(v, `${path}.${k}`, out);
    }
  }
  return out;
}

// Two or more absolute path segments — `/a/b`. One segment (`/ace-small.js`) is
// a URL path template and carries nothing about this machine, which is why the
// pattern requires the SECOND separator rather than just a leading slash.
const ABSOLUTE_PATH = /(^|[\s"'(<=,;:])\/[A-Za-z0-9._+-]+\/[A-Za-z0-9._+-]/;
// The home-directory shapes, checked SEPARATELY and with no exemption at all —
// including over `binary.path`, the one field the absolute-path check exempts.
const HOME_PATH = /\/(?:Users|home)\/[^/\s"']+/;

// EXEMPT from the absolute-path check and from nothing else.
//
//   `binary.path`      — the repudiation control T-06-51 turns on. An artifact
//                        that does not name the binary it was produced by cannot
//                        be checked against the "two caido-cli binaries" hazard
//                        at all. Still subject to HOME_PATH above, which is what
//                        catches a run against the stale `$HOME/.caido` 0.55.3.
//   `binary.data_path` — a CONTAINER-INTERNAL path (`/home/caido/.local/share/caido`).
//                        It is a property of the published image, identical on
//                        every machine that pulls that digest, and says nothing
//                        about this host. It is NOT exempt from HOME_PATH; the
//                        image's own data dir lives under `/home/caido`, which is
//                        why that check carries a container-aware exemption of
//                        its own below rather than being weakened for everyone.
const isExempt = (p: string) =>
  /\.binary\.path$/.test(p) || /\.binary\.data_path$/.test(p);

// The ONE home-shaped string that is not about this machine: the image's own
// data directory, whose uid-999 `caido` user is a fact of the published image.
const CONTAINER_HOME = "/home/caido/";

function ajv() {
  const a = new Ajv2020({ allErrors: true, strict: false });
  addFormats(a);
  return a;
}

// ---------------------------------------------------------------------------
// Fixture skeletons. Hand-built, so the SCHEMA is tested by validation rather
// than by reading its `allOf` back — a conditional that is present but mis-wired
// reads identical to a correct one.
// ---------------------------------------------------------------------------

const nullAssertions = () =>
  Object.fromEntries(ASSERTION_KEYS.map((k) => [k, null]));
const passAssertions = () =>
  Object.fromEntries(ASSERTION_KEYS.map((k) => [k, true]));

const nativeBinary = () => ({
  kind: "native",
  path: "Caido.app/Contents/Resources/bin/caido-cli",
  expected_version: EXPECTED_CAIDO_VERSION,
  reported_version: EXPECTED_CAIDO_VERSION,
  sha256: "0".repeat(64),
});

const containerBinary = () => ({
  kind: "container",
  image: "caido/caido",
  tag: EXPECTED_CAIDO_VERSION,
  expected_version: EXPECTED_CAIDO_VERSION,
  reported_version: EXPECTED_CAIDO_VERSION,
  manifest_digest: `caido/caido@sha256:${"a".repeat(64)}`,
});

function legFixture(name: string, over: Record<string, unknown> = {}): any {
  const container = name.startsWith("docker-");
  return {
    leg: name,
    status: "pass",
    assertions: passAssertions(),
    binary: container ? containerBinary() : nativeBinary(),
    shares_filesystem_with: container
      ? null
      : DECLARED_LEGS.filter((l) => !l.startsWith("docker-") && l !== name),
    notes: "fixture",
    restart: {
      method:
        name === NO_VOLUME_LEG
          ? "container-stop-rm-run"
          : container
            ? "container-stop-start"
            : "process-sigkill-relaunch",
      expected_data_present: name !== NO_VOLUME_LEG,
      data_present: name !== NO_VOLUME_LEG,
    },
    ...over,
  };
}

function matrixFixture(legs: any[]): any {
  const notRun = legs.filter((l) => l.status === "not_run").length;
  const failed = legs.filter((l) => l.status === "fail").length;
  return {
    matrix: "DEPLOY-01",
    status: failed > 0 ? "fail" : "pass",
    recorded_at: "2026-09-01T00:00:00Z",
    expected_version: EXPECTED_CAIDO_VERSION,
    host: { os: "darwin", arch: "arm64" },
    legs,
    verdict: {
      answer: "fixture",
      legs_run: legs.length - notRun,
      legs_not_run: notRun,
      legs_failed: failed,
      partial: notRun > 0,
      remote_filesystem_property: "fixture",
    },
  };
}

/**
 * THE PARTIAL/FAILED DISTINCTION, as a function rather than as prose (D-23).
 *
 * A matrix with an unreachable leg is PARTIAL: the phase can still complete, and
 * DEPLOY-01's checkbox does not move on the strength of a leg that never ran. A
 * matrix with a leg that RAN and failed an assertion is FAILED. Collapsing the
 * two is exactly how an unreachable leg becomes a silent pass.
 */
/**
 * THE NO-VOLUME LEG'S OWN RULES, as ONE function used by BOTH the hand-built
 * fixtures and the live artifact.
 *
 * Written once deliberately. Two copies — one checking a fixture, one checking
 * the recorded run — is how a gate ends up proving that its fixtures are
 * well-formed while the artifact goes unchecked.
 *
 * Returns the list of violations; empty means the leg is honest.
 */
function noVolumeViolations(leg: any): string[] {
  const v: string[] = [];
  if (leg?.status === "not_run") return v;
  if (leg?.restart?.method !== "container-stop-rm-run") {
    v.push(
      `restart.method is ${JSON.stringify(leg?.restart?.method)}. ` +
        `\`docker restart\` and \`docker stop && docker start\` both PRESERVE ` +
        `the writable layer, where an unmounted container's Caido data lives — ` +
        `the image declares no VOLUME. The leg must stop, REMOVE and run ` +
        `(Pitfall 8, T-06-55).`,
    );
  }
  if (leg?.restart?.expected_data_present !== false) {
    v.push(
      `restart.expected_data_present is ` +
        `${JSON.stringify(leg?.restart?.expected_data_present)}. Every other leg ` +
        `expects data to survive; this one must expect the opposite.`,
    );
  }
  if (leg?.restart?.data_present !== false) {
    v.push(
      `restart.data_present is ${JSON.stringify(leg?.restart?.data_present)} ` +
        `after removing and re-creating the container. Data surviving means the ` +
        `leg restarted rather than removed, or mounted a path it did not intend ` +
        `to — either way the assertion meant to prove ABSENCE proved nothing.`,
    );
  }
  if (!/remov/i.test(String(leg?.notes ?? ""))) {
    v.push(
      `the notes do not record that the container was removed and re-created. ` +
        `The method field alone is a claim; the notes are where a reader checks ` +
        `what was actually done.`,
    );
  }
  return v;
}

function classifyMatrix(doc: any): "pass" | "partial" | "fail" {
  const legs: any[] = Array.isArray(doc?.legs) ? doc.legs : [];
  const ran = legs.filter((l) => l?.status !== "not_run");
  const broke = ran.filter(
    (l) =>
      l?.status === "fail" ||
      ASSERTION_KEYS.some((k) => l?.assertions?.[k] === false),
  );
  if (broke.length > 0) return "fail";
  return legs.some((l) => l?.status === "not_run") ? "partial" : "pass";
}

describe("the matrix result schema", () => {
  it("compiles", () => {
    expect(existsSync(SCHEMA), `${SCHEMA} missing`).toBe(true);
    expect(() => ajv().compile(loadJson(SCHEMA))).not.toThrow();
  });

  it("REQUIRES a reason on a not_run leg", () => {
    const validate = ajv().compile(loadJson(SCHEMA));
    const bare = legFixture("docker-volume", {
      status: "not_run",
      assertions: nullAssertions(),
      restart: undefined,
    });
    delete bare.restart;
    expect(
      validate(matrixFixture([bare])),
      `${SCHEMA}: a not_run leg WITHOUT a reason validated. The whole point of ` +
        `the state is that it carries why (D-23).`,
    ).toBe(false);
    expect(
      validate(
        matrixFixture([
          { ...bare, reason: "the Docker engine is not running" },
        ]),
      ),
      `${SCHEMA}: a not_run leg WITH a reason failed to validate: ` +
        JSON.stringify(validate.errors),
    ).toBe(true);
  });

  it("REFUSES a not_run leg that recorded an assertion result", () => {
    const validate = ajv().compile(loadJson(SCHEMA));
    const cheat = legFixture(NO_VOLUME_LEG, {
      status: "not_run",
      reason: "the Docker engine is not running",
      assertions: { ...nullAssertions(), install_and_compatible: true },
    });
    delete cheat.restart;
    expect(
      validate(matrixFixture([cheat])),
      `${SCHEMA}: a not_run leg carrying a NON-NULL assertion validated. That is ` +
        `the exact shape D-23 forbids — a leg that never executed reporting a ` +
        `result it never produced.`,
    ).toBe(false);
  });

  it("accepts BOTH binary variants and rejects an object mixing them", () => {
    const validate = ajv().compile(loadJson(SCHEMA));
    expect(
      validate(matrixFixture([legFixture("local-desktop")])),
      `${SCHEMA}: the native binary variant failed to validate: ` +
        JSON.stringify(validate.errors),
    ).toBe(true);
    expect(
      validate(matrixFixture([legFixture("docker-volume")])),
      `${SCHEMA}: the container binary variant failed to validate: ` +
        JSON.stringify(validate.errors),
    ).toBe(true);

    const mixed = legFixture("docker-volume", {
      binary: { ...containerBinary(), path: "/somewhere/caido-cli" },
    });
    expect(
      validate(matrixFixture([mixed])),
      `${SCHEMA}: a binary block mixing the native and container variants ` +
        `validated. The one-of is what stops a container leg being recorded as ` +
        `though it named a local file, which would make the digest unreadable.`,
    ).toBe(false);

    const halfNative = legFixture("local-desktop", {
      binary: {
        ...nativeBinary(),
        manifest_digest: `sha256:${"b".repeat(64)}`,
      },
    });
    expect(
      validate(matrixFixture([halfNative])),
      `${SCHEMA}: a native binary block carrying a manifest_digest validated.`,
    ).toBe(false);
  });

  it("REQUIRES shares_filesystem_with on every leg", () => {
    const validate = ajv().compile(loadJson(SCHEMA));
    const silent = legFixture("remote-cli");
    delete silent.shares_filesystem_with;
    expect(
      validate(matrixFixture([silent])),
      `${SCHEMA}: a leg with no shares_filesystem_with validated. The overclaim ` +
        `this field prevents is SILENT when the field is merely absent, which is ` +
        `why it is required rather than optional (T-06-52).`,
    ).toBe(false);
  });

  it("REQUIRES the verdict to name which legs carry the remote-filesystem property", () => {
    const validate = ajv().compile(loadJson(SCHEMA));
    const doc = matrixFixture([legFixture("local-desktop")]);
    delete doc.verdict.remote_filesystem_property;
    expect(
      validate(doc),
      `${SCHEMA}: a verdict with no remote_filesystem_property validated.`,
    ).toBe(false);
  });
});

describe("D-23's pass-through — a partial matrix is not a failed one", () => {
  it("reports PARTIAL for three passes and one not_run, and the schema admits it", () => {
    const legs = DECLARED_LEGS.map((name) => {
      if (name !== NO_VOLUME_LEG) return legFixture(name);
      const nr = legFixture(name, {
        status: "not_run",
        reason: "the Docker engine is not running on this host",
        assertions: nullAssertions(),
      });
      delete nr.restart;
      return nr;
    });
    const doc = matrixFixture(legs);
    const validate = ajv().compile(loadJson(SCHEMA));
    expect(
      validate(doc),
      `${SCHEMA}: a three-pass, one-not_run matrix failed to validate: ` +
        JSON.stringify(validate.errors),
    ).toBe(true);
    expect(
      classifyMatrix(doc),
      `A matrix with an unreachable leg must classify PARTIAL, never fail. The ` +
        `phase can still complete; DEPLOY-01's checkbox does not move on the ` +
        `strength of a leg that never executed (D-23).`,
    ).toBe("partial");
  });

  it("reports FAIL when a leg that RAN failed an assertion", () => {
    const legs = DECLARED_LEGS.map((name) =>
      name === "docker-volume"
        ? legFixture(name, {
            status: "fail",
            assertions: {
              ...passAssertions(),
              restart_data_presence: false,
            },
          })
        : legFixture(name),
    );
    expect(
      classifyMatrix(matrixFixture(legs)),
      `A leg that ran and failed an assertion is a FAILED matrix, not a partial ` +
        `one. Collapsing the two is how a real regression becomes "the matrix ` +
        `was incomplete anyway".`,
    ).toBe("fail");
  });

  it("reports FAIL for a false assertion even when the leg's own status says pass", () => {
    const legs = DECLARED_LEGS.map((name) =>
      name === NO_VOLUME_LEG
        ? legFixture(name, {
            assertions: {
              ...passAssertions(),
              artifact_and_observation: false,
            },
          })
        : legFixture(name),
    );
    expect(
      classifyMatrix(matrixFixture(legs)),
      `A leg whose status field says "pass" while one of its assertions is false ` +
        `is a contradiction, and the ASSERTION is the evidence. The status field ` +
        `is a summary and a summary can be wrong.`,
    ).toBe("fail");
  });

  it("accepts an honest no-volume leg — the checker is not vacuously strict", () => {
    const honest = legFixture(NO_VOLUME_LEG, {
      notes:
        "container stopped, REMOVED and re-created; second boot on an empty database",
    });
    expect(
      noVolumeViolations(honest),
      `The no-volume checker rejected a correctly-recorded leg. A checker that ` +
        `rejects everything catches nothing.`,
    ).toEqual([]);
  });

  it("rejects a no-volume leg that recorded data PRESENT after its restart", () => {
    // The reading `docker restart` produces: the writable layer survives, so the
    // assertion meant to prove ABSENCE passes having proven nothing.
    const cheat = legFixture(NO_VOLUME_LEG, {
      notes: "container removed and re-created",
      restart: {
        method: "container-stop-rm-run",
        expected_data_present: false,
        data_present: true,
      },
    });
    expect(
      noVolumeViolations(cheat).join(" | "),
      `A ${NO_VOLUME_LEG} leg recording data_present=true after its restart is ` +
        `the Pitfall 8 failure, and the checker must CATCH it: the image ` +
        `declares no VOLUME, so an unmounted container's data lives in the ` +
        `writable layer and MUST die with \`docker rm\`.`,
    ).toMatch(/data_present/);
  });

  it("rejects a no-volume leg whose restart was a container restart", () => {
    const cheat = legFixture(NO_VOLUME_LEG, {
      notes: "container removed and re-created",
      restart: {
        method: "container-stop-start",
        expected_data_present: false,
        data_present: false,
      },
    });
    expect(
      noVolumeViolations(cheat).join(" | "),
      `A ${NO_VOLUME_LEG} leg must restart by stop, REMOVE and run. A ` +
        `container-stop-start preserves the writable layer, so even a ` +
        `data_present=false reading taken from it would be an accident rather ` +
        `than evidence (T-06-55).`,
    ).toMatch(/restart\.method/);
  });

  it("rejects a no-volume leg whose notes do not say the container was removed", () => {
    const silent = legFixture(NO_VOLUME_LEG, { notes: "restarted the leg" });
    expect(
      noVolumeViolations(silent).join(" | "),
      `The method field is a claim. The notes are where a reader checks what was ` +
        `actually done, which is why both are required to agree.`,
    ).toMatch(/notes/);
  });
});

describe("the matrix artifact", () => {
  it("exists — DEPLOY-01 has no other evidence", () => {
    expect(existsSync(RESULT), `${RESULT} missing — ${REMEASURE}`).toBe(true);
  });

  it("parses", () => {
    expect(d, `${RESULT} did not parse — ${REMEASURE}`).not.toBeNull();
  });

  it("validates against its own schema", () => {
    const validate = ajv().compile(loadJson(SCHEMA));
    const ok = validate(d);
    if (!ok) {
      throw new Error(
        `${RESULT} failed schema validation — ${REMEASURE}:\n` +
          (validate.errors ?? [])
            .map((e) => `  ${e.instancePath || "/"} ${e.message}`)
            .join("\n"),
      );
    }
    expect(ok).toBe(true);
  });

  it("carries a terminal status", () => {
    expect(
      STATUSES,
      `${RESULT}: status "${d?.status}" is not one of ${STATUSES.join(", ")}.`,
    ).toContain(d?.status);
  });

  it("pins the matrix's OWN version, not Phase 1's tripwire", () => {
    expect(
      d?.expected_version,
      `${RESULT}: expected_version is ${JSON.stringify(d?.expected_version)}, ` +
        `not ${EXPECTED_CAIDO_VERSION}. If it reads 0.57.1 the matrix has been ` +
        `pointed at the Phase 1 tripwire constant, which pins the build the ` +
        `Phase 0 THRESHOLDS were measured on and would make every leg fail by ` +
        `design. ${REMEASURE}.`,
    ).toBe(EXPECTED_CAIDO_VERSION);
  });
});

describe("the declared legs", () => {
  it("are all present, in the declared order, with none omitted", () => {
    expect(
      (d?.legs ?? []).map((l: any) => l?.leg),
      `${RESULT}: the legs are not the four declared shapes in the declared ` +
        `order. A leg that cannot run KEEPS ITS SLOT as not_run with its reason — ` +
        `it is never reordered away and never dropped (D-23). ${REMEASURE}.`,
    ).toEqual(DECLARED_LEGS);
  });

  it.each(DECLARED_LEGS)(
    "%s names the build it ran, and that build is the matrix constant",
    (name: string) => {
      const leg = (d?.legs ?? []).find((l: any) => l?.leg === name);
      expect(leg, `${RESULT}: no record for leg ${name}.`).toBeTruthy();
      if (leg?.status === "not_run") return;
      expect(
        leg?.binary?.reported_version,
        `${RESULT}: leg ${name} recorded expected_version ` +
          `${JSON.stringify(leg?.binary?.expected_version)} against reported ` +
          `${JSON.stringify(leg?.binary?.reported_version)}. Do not edit the ` +
          `file — ${REMEASURE}.`,
      ).toBe(leg?.binary?.expected_version);
      expect(
        leg?.binary?.reported_version,
        `${RESULT}: leg ${name} reported ` +
          `${JSON.stringify(leg?.binary?.reported_version)}, not ` +
          `${EXPECTED_CAIDO_VERSION}. On a native leg the usual cause is bare ` +
          `\`caido-cli\` from PATH, a STALE 0.55.3 on this machine; on a ` +
          `container leg it is a tag that moved. ${REMEASURE}.`,
      ).toBe(EXPECTED_CAIDO_VERSION);
    },
  );

  it.each(DECLARED_LEGS)(
    "%s, if not_run, carries a reason AND every assertion null",
    (name: string) => {
      const leg = (d?.legs ?? []).find((l: any) => l?.leg === name);
      if (leg?.status !== "not_run") return;
      // TWO assertions, because either alone permits the other half: a reason
      // with results is a leg that reported what it never produced, and nulls
      // with no reason is a leg nobody can account for.
      expect(
        String(leg?.reason ?? "").trim(),
        `${RESULT}: leg ${name} is not_run with no reason. A leg that could not ` +
          `run is recorded with WHY, never as a bare state (D-23).`,
      ).toBeTruthy();
      expect(
        ASSERTION_KEYS.map((k) => [k, leg?.assertions?.[k]]).filter(
          ([, v]) => v !== null,
        ),
        `${RESULT}: leg ${name} is not_run but recorded assertion results. A ` +
          `leg that never executed cannot have produced them.`,
      ).toEqual([]);
    },
  );

  it.each(DECLARED_LEGS)("%s names its binary in the right variant", (name) => {
    const leg = (d?.legs ?? []).find((l: any) => l?.leg === name);
    const container = name.startsWith("docker-");
    expect(
      leg?.binary?.kind,
      `${RESULT}: leg ${name} recorded a ${JSON.stringify(leg?.binary?.kind)} ` +
        `binary block. A container leg's build is an image reference with a ` +
        `resolved manifest digest; a native leg's is a path with a file hash.`,
    ).toBe(container ? "container" : "native");
    if (leg?.status === "not_run") return;
    if (container) {
      expect(
        leg?.binary?.manifest_digest,
        `${RESULT}: leg ${name} recorded no resolved manifest digest. The tag is ` +
          `a moving reference; the digest is what tells a future reader exactly ` +
          `which image ran (T-06-SC).`,
      ).toMatch(/sha256:[0-9a-f]{64}$/);
    } else {
      expect(
        leg?.binary?.sha256,
        `${RESULT}: leg ${name} recorded no binary hash.`,
      ).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});

describe("the no-volume leg — the one the requirement turns on", () => {
  const leg = () =>
    (d?.legs ?? []).find((l: any) => l?.leg === NO_VOLUME_LEG) ?? null;

  it("removed and re-created the container rather than restarting it", () => {
    const l = leg();
    if (l?.status === "not_run") return;
    expect(
      l?.restart?.method,
      `${RESULT}: leg ${NO_VOLUME_LEG} restarted with ` +
        `${JSON.stringify(l?.restart?.method)}. \`docker restart\` and ` +
        `\`docker stop && docker start\` both PRESERVE the writable layer, where ` +
        `an unmounted container's Caido data lives — the image declares no ` +
        `VOLUME. The leg must stop, REMOVE and run (Pitfall 8, T-06-55).`,
    ).toBe("container-stop-rm-run");
    expect(
      /remov/i.test(String(l?.notes ?? "")),
      `${RESULT}: leg ${NO_VOLUME_LEG}'s notes do not record that the container ` +
        `was removed and re-created. The method field alone is a claim; the ` +
        `notes are where a reader checks what was actually done.`,
    ).toBe(true);
  });

  it("found the data ABSENT, and the plugin clean on an empty database", () => {
    const l = leg();
    if (l?.status === "not_run") return;
    expect(
      l?.restart?.expected_data_present,
      `${RESULT}: leg ${NO_VOLUME_LEG} expected data to be PRESENT after its ` +
        `restart. Every other leg does; this one must not.`,
    ).toBe(false);
    expect(
      l?.restart?.data_present,
      `${RESULT}: leg ${NO_VOLUME_LEG} found data ${JSON.stringify(l?.restart?.data_present)} ` +
        `after removing and re-creating the container. The image declares no ` +
        `VOLUME, so the data MUST die with the container. Data surviving means ` +
        `something mounted a path the leg did not intend to mount.`,
    ).toBe(false);
    expect(
      l?.restart?.startup_clean,
      `${RESULT}: leg ${NO_VOLUME_LEG} did not report a clean start on the empty ` +
        `database. Coming back clean on an empty database rather than ERRORING is ` +
        `the half of D-22's fourth assertion this leg exists for.`,
    ).toBe(true);
    expect(
      l?.restart?.artifacts_after,
      `${RESULT}: leg ${NO_VOLUME_LEG} found ` +
        `${JSON.stringify(l?.restart?.artifacts_after)} artifact rows on the ` +
        `second boot. A fresh container's database has zero.`,
    ).toBe(0);
  });
});

describe("the matrix does not overclaim what its legs prove", () => {
  it("records the shared filesystem between the two native legs", () => {
    const desktop = (d?.legs ?? []).find(
      (l: any) => l?.leg === "local-desktop",
    );
    const cli = (d?.legs ?? []).find((l: any) => l?.leg === "remote-cli");
    const ran = (l: any): boolean =>
      l !== undefined && l !== null && l.status !== "not_run";
    if (!ran(desktop) || !ran(cli)) return;
    // Either they name each other (both local, the honest case on one machine),
    // or the CLI leg genuinely ran against a remote host and carries null.
    const paired: boolean =
      (desktop?.shares_filesystem_with ?? []).includes("remote-cli") === true &&
      (cli?.shares_filesystem_with ?? []).includes("local-desktop") === true;
    const remote: boolean =
      cli?.shares_filesystem_with === null &&
      (desktop?.shares_filesystem_with ?? []).length === 0;
    expect(
      paired || remote,
      `${RESULT}: the two native legs neither name each other in ` +
        `shares_filesystem_with nor record the CLI leg as genuinely remote. On ` +
        `one machine they DO share a filesystem — which is the exact property ` +
        `DEPLOY-02 and DEPLOY-03 exist because of — and the artifact has to say ` +
        `so rather than let two local legs read as two independent confirmations.`,
    ).toBe(true);
  });

  it("records the container legs as not sharing a filesystem with anything", () => {
    for (const name of DECLARED_LEGS.filter((l) => l.startsWith("docker-"))) {
      const leg = (d?.legs ?? []).find((l: any) => l?.leg === name);
      expect(
        leg?.shares_filesystem_with,
        `${RESULT}: leg ${name} claims to share a filesystem with another leg. A ` +
          `container's disk is not the host's — that is the whole reason these ` +
          `two legs are the ones that carry the property.`,
      ).toBeNull();
    }
  });

  it("names the legs that carry the remote-filesystem property in the verdict", () => {
    const note = String(d?.verdict?.remote_filesystem_property ?? "");
    expect(
      note.trim(),
      `${RESULT}: the verdict does not say which legs carry the ` +
        `remote-filesystem property. ${REMEASURE}.`,
    ).toBeTruthy();
    expect(
      /docker|container/i.test(note),
      `${RESULT}: the verdict's remote_filesystem_property note does not name the ` +
        `container legs: ${JSON.stringify(note)}. They are the only two that ` +
        `exercise a server whose disk the operator cannot reach.`,
    ).toBe(true);
  });

  it("agrees with the partial/failed classification the gate derives", () => {
    const derived = classifyMatrix(d);
    expect(
      d?.verdict?.partial,
      `${RESULT}: verdict.partial is ${JSON.stringify(d?.verdict?.partial)} but ` +
        `the legs classify as "${derived}". The summary must not disagree with ` +
        `the evidence it summarises.`,
    ).toBe(derived === "partial");
    expect(
      derived,
      `${RESULT}: a leg that RAN failed an assertion. That is a failed matrix, ` +
        `not a partial one — read the leg records before ${REMEASURE}.`,
    ).not.toBe("fail");
  });

  it("counts its own legs correctly", () => {
    const legs: any[] = d?.legs ?? [];
    const notRun = legs.filter((l) => l?.status === "not_run").length;
    expect(
      d?.verdict?.legs_not_run,
      `${RESULT}: verdict.legs_not_run disagrees with the leg records.`,
    ).toBe(notRun);
    expect(
      d?.verdict?.legs_run,
      `${RESULT}: verdict.legs_run disagrees with the leg records.`,
    ).toBe(legs.length - notRun);
  });
});

describe("O-04 is recorded as an observation, whichever way it landed", () => {
  it("at least one leg that ran carries the cursor probe", () => {
    const legs: any[] = (d?.legs ?? []).filter(
      (l: any) => l?.status !== "not_run",
    );
    if (legs.length === 0) return;
    const probed = legs.filter((l) => l?.cursor_probe !== undefined);
    expect(
      probed.map((l) => l.leg),
      `${RESULT}: no leg that ran recorded a cursor probe. O-04 — is a Caido ` +
        `Cursor stable across a process restart? — has never been measured, and ` +
        `every leg already performs the restart it needs. The design does not ` +
        `depend on the answer (the durable position is the re-derivable ` +
        `last_request_id), which is exactly why a NEGATIVE result is worth ` +
        `recording rather than worth avoiding.`,
    ).not.toEqual([]);
  });

  it("a measured cursor probe carries an answer, and A1/A2 alongside it", () => {
    const measured = (d?.legs ?? []).filter(
      (l: any) => l?.cursor_probe?.measured === true,
    );
    if (measured.length === 0) return;
    for (const l of measured) {
      expect(
        typeof l.cursor_probe.resolved_after_restart,
        `${RESULT}: leg ${l.leg} measured the cursor probe but recorded no ` +
          `answer. A measured probe with a null answer is the shape "not ` +
          `measured" is for.`,
      ).toBe("boolean");
      expect(
        l.cursor_probe.id_is_decimal_integer,
        `${RESULT}: leg ${l.leg} did not confirm that request ids are decimal ` +
          `integer strings (assumption A1). Without it the row.id.lt:N resume ` +
          `boundary is not expressible as HTTPQL and the re-derivable position ` +
          `the design leans on does not exist.`,
      ).toBe(true);
      expect(
        l.cursor_probe.id_ordering_agrees,
        `${RESULT}: leg ${l.leg} did not confirm that row.id ordering agrees ` +
          `with descending("req","id") (assumption A2). Pages could overlap or ` +
          `skip.`,
      ).toBe(true);
    }
  });
});

describe("the matrix is non-vacuous", () => {
  it("at least one leg produced a real assertion result", () => {
    const live = (d?.legs ?? []).filter((l: any) =>
      ASSERTION_KEYS.some((k) => l?.assertions?.[k] !== null),
    );
    expect(
      live.map((l: any) => l.leg),
      `${RESULT}: every leg is all-null. An artifact of four not_run legs ` +
        `VALIDATES and proves nothing — it is a document that says the matrix ` +
        `did not run, and it must not be readable as a matrix that did. ` +
        `${REMEASURE}.`,
    ).not.toEqual([]);
  });
});

describe("the artifact carries nothing about this machine (T-06-54)", () => {
  it("records no absolute path outside the binary it names", () => {
    const leaked = strings(d).filter(
      (s) => !isExempt(s.path) && ABSOLUTE_PATH.test(s.value),
    );
    expect(
      leaked.map((s) => `${s.path} = ${s.value}`),
      `${RESULT} carries an absolute filesystem path. Every leg runs against an ` +
        `isolated data directory under a temporary path, and this file is ` +
        `COMMITTED — the data path, the repository root, the volume host ` +
        `directory and the run directory are all facts about the operator's ` +
        `machine and none of them is evidence.`,
    ).toEqual([]);
  });

  it("records no home-directory path outside the image's own data dir", () => {
    const leaked = strings(d).filter(
      (s) => HOME_PATH.test(s.value) && !s.value.startsWith(CONTAINER_HOME),
    );
    expect(
      leaked.map((s) => `${s.path} = ${s.value}`),
      `${RESULT} carries a home-directory path. \`binary.path\` is exempt from ` +
        `the generic absolute-path check and is NOT exempt from this one: a leg ` +
        `that ran against \`$HOME/.caido/caido-cli\` measured the stale 0.55.3, ` +
        `which is both a wrong measurement and an operator identifier. The one ` +
        `permitted shape is ${CONTAINER_HOME}… — the published image's own data ` +
        `directory, identical on every machine that pulls that digest.`,
    ).toEqual([]);
  });

  it("records no username", () => {
    let username = "";
    try {
      username = userInfo().username ?? "";
    } catch {
      username = "";
    }
    // A one- or two-character username would match half the English language and
    // turn this into a false-positive generator. Skipping the CHECK is not
    // skipping the TEST: the assertion below still runs, on an empty hit list.
    const hits =
      username.length >= 3
        ? strings(d).filter((s) => s.value.includes(username))
        : [];
    expect(
      hits.map((s) => s.path),
      `${RESULT} carries the running user's username.`,
    ).toEqual([]);
  });

  it("binds every leg to loopback, and never to the operator's port 8080", () => {
    for (const leg of d?.legs ?? []) {
      if (leg?.listen === null || leg?.listen === undefined) continue;
      expect(
        leg.listen,
        `${RESULT}: leg ${leg.leg} listens on ${leg.listen}.`,
      ).toMatch(/^127\.0\.0\.1:\d+$/);
      expect(
        leg.listen,
        `${RESULT}: leg ${leg.leg} bound port 8080 — the operator's LIVE Caido ` +
          `desktop instance, with real project data (T-06-50).`,
      ).not.toBe("127.0.0.1:8080");
    }
  });
});
