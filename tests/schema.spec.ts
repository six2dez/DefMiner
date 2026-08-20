import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const RESULTS = ".planning/phases/00-runtime-reality-check/results";
const EXPECTED_CAIDO_VERSION = "0.57.1";

function loadJson(path: string): any {
  const raw = readFileSync(path, "utf8");
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`${path} is not valid JSON: ${(err as Error).message}`);
  }
}

function resultFiles(): string[] {
  if (!existsSync(RESULTS)) return [];
  return readdirSync(RESULTS)
    .filter((f) => /^SPIKE-\d\d\.json$/.test(f))
    .sort()
    .map((f) => join(RESULTS, f));
}

function ajv() {
  const a = new Ajv2020({ allErrors: true, strict: false });
  addFormats(a as any);
  return a;
}

describe("spike result schema", () => {
  const schemaPath = join(RESULTS, "spike-result.schema.json");

  it("the schema itself compiles", () => {
    expect(existsSync(schemaPath), `${schemaPath} missing`).toBe(true);
    expect(() => ajv().compile(loadJson(schemaPath))).not.toThrow();
  });

  const files = resultFiles();

  it("at least one result file exists", () => {
    // Phase 0's deliverable IS the result files. An empty results directory
    // means the gate is measuring nothing, which must fail rather than pass
    // vacuously.
    expect(files.length, `no SPIKE-NN.json under ${RESULTS}`).toBeGreaterThan(0);
  });

  it.each(files)("%s validates against spike-result.schema.json", (file) => {
    const validate = ajv().compile(loadJson(schemaPath));
    const data = loadJson(file);
    const ok = validate(data);
    if (!ok) {
      throw new Error(
        `${file} failed schema validation:\n` +
          (validate.errors ?? [])
            .map((e) => `  ${e.instancePath || "/"} ${e.message}`)
            .join("\n"),
      );
    }
    expect(ok).toBe(true);
  });
});

describe("binary version consistency (threat T-00-18)", () => {
  const files = resultFiles();

  it.each(files)(
    "%s was measured against Caido " + EXPECTED_CAIDO_VERSION,
    (file) => {
      const data = loadJson(file);
      // Two separate assertions on purpose. The first catches a result recorded
      // against the stale 0.55.3 that owns PATH on this machine. The second
      // catches a result whose own expectation was quietly moved to match
      // whatever it happened to measure.
      expect(
        data.binary?.reported_version,
        `${file}: reported_version is not ${EXPECTED_CAIDO_VERSION}`,
      ).toBe(EXPECTED_CAIDO_VERSION);
      expect(
        data.binary?.expected_version,
        `${file}: expected_version does not match reported_version`,
      ).toBe(data.binary?.reported_version);
    },
  );
});

describe("go/no-go schema", () => {
  const schemaPath = join(RESULTS, "go-no-go.schema.json");
  const aggregate = join(RESULTS, "go-no-go.json");

  it("the schema itself compiles", () => {
    expect(existsSync(schemaPath), `${schemaPath} missing`).toBe(true);
    expect(() => ajv().compile(loadJson(schemaPath))).not.toThrow();
  });

  it("go-no-go.json validates when present (plan 00-04 writes it)", () => {
    if (!existsSync(aggregate)) return;
    const validate = ajv().compile(loadJson(schemaPath));
    const ok = validate(loadJson(aggregate));
    if (!ok) {
      throw new Error(
        `${aggregate} failed schema validation:\n` +
          (validate.errors ?? [])
            .map((e) => `  ${e.instancePath || "/"} ${e.message}`)
            .join("\n"),
      );
    }
    expect(ok).toBe(true);
  });
});
