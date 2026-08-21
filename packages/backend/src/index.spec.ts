// packages/backend/src/index.spec.ts — init()'s error containment (COMPAT-01).
//
// The file's own header says the catch exists because "an init failure that is
// not caught here is completely invisible" — HANDLER_ERROR_SURFACED is
// "neither", so Caido writes down neither a throw nor a rejection from plugin
// code. Four statements used to sit OUTSIDE that catch: `checkCompat(sdk)`, the
// version read, and the two `api.register` calls on the refusal path.
//
// Every one of them can throw against a real SDK. `checkCompat` walks `sdk` with
// property access, so a throwing accessor or a revoked proxy escapes; and
// `api.register` rejects a duplicate name, which is precisely what a re-init or
// a hot reload produces. The result was a plugin with no hook, no RPC and no log
// line — the obscure failure COMPAT-01 exists to forbid.
//
// These cases drive the real `init()`. They assert it RESOLVES and that the
// failure is written down somewhere an operator can reach it.

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { makeFakeSdk } from "../test/fixtures/fake-sdk";

import { resetPassiveForTest } from "./hooks/passive";
import { resetConsumerForTest } from "./ingest/consumer";
import { resetLifecycleForTest } from "./lifecycle";
import { resetDbHandleForTest } from "./store/db";
import { resetTelemetryForTest } from "./telemetry";

import { init } from "./index";

beforeEach(() => {
  resetLifecycleForTest();
  resetPassiveForTest();
  resetConsumerForTest();
  resetDbHandleForTest();
  resetTelemetryForTest();
});

afterEach(() => {
  resetLifecycleForTest();
  resetPassiveForTest();
  resetConsumerForTest();
  resetDbHandleForTest();
});

describe("init() contains every failure it can have", () => {
  it("survives a throwing sdk.runtime accessor — the shape checkCompat walks", async () => {
    const registered: Record<string, (...a: unknown[]) => unknown> = {};
    const logs: string[] = [];
    const sdk = makeFakeSdk({
      log: (msg: string) => logs.push(msg),
      register: (name: string, fn: unknown) => {
        registered[name] = fn as (...a: unknown[]) => unknown;
      },
    });
    // A revoked proxy, a lazily-resolved property, an SDK mid-teardown: all of
    // them present as an accessor that throws.
    Object.defineProperty(sdk, "runtime", {
      get(): never {
        throw new Error("sdk.runtime is not available on this build");
      },
    });

    await expect(init(sdk)).resolves.toBeUndefined();

    expect(
      logs.join("\n"),
      "init() failed and logged NOTHING. Caido surfaces neither a throw nor a " +
        "rejection from plugin code, so a failure outside the catch leaves no " +
        "trace of any kind.",
    ).toContain("init failed");
    expect(
      registered.getStatus,
      "no RPC was registered, so the operator has no way to ask what happened.",
    ).toBeTypeOf("function");
    const st = registered.getStatus() as Record<string, unknown>;
    expect(st.compatible).toBe(false);
    expect(String(st.reason)).toContain("init failed");
    // No hook on a build that could not even be checked.
    expect(sdk.calls.interceptResponseHandlers.length).toBe(0);
  });

  it("survives api.register throwing on the REFUSAL path", async () => {
    // The refusal path registers two RPCs. A duplicate name — what a re-init or
    // a hot reload produces — rejects, and that rejection used to escape init()
    // from outside the catch.
    const logs: string[] = [];
    const sdk = makeFakeSdk({
      // Below MIN_CAIDO, so init() takes the refusal path.
      version: "0.1.0",
      log: (msg: string) => logs.push(msg),
      register: (): never => {
        throw new Error("an api with this name is already registered");
      },
    });

    await expect(init(sdk)).resolves.toBeUndefined();
    expect(logs.join("\n")).toContain("INCOMPATIBLE");
    expect(sdk.calls.interceptResponseHandlers.length).toBe(0);
  });

  it("still refuses NORMALLY when nothing throws — the guard is not swallowed", async () => {
    // Non-vacuity: widening the try must not have turned the version guard into
    // a catch-all that reports "init failed" for an ordinary refusal.
    const registered: Record<string, (...a: unknown[]) => unknown> = {};
    const sdk = makeFakeSdk({
      version: "0.1.0",
      register: (name: string, fn: unknown) => {
        registered[name] = fn as (...a: unknown[]) => unknown;
      },
    });

    await init(sdk);

    const st = registered.getStatus() as Record<string, unknown>;
    expect(st.compatible).toBe(false);
    expect(String(st.reason)).toContain("requires Caido");
    expect(String(st.reason)).not.toContain("init failed");
    expect(registered.getCompat).toBeTypeOf("function");
  });
});
