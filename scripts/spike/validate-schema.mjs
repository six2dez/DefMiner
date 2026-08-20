// scripts/spike/validate-schema.mjs — validate JSON documents against a schema.
//
//   node scripts/spike/validate-schema.mjs <schema.json> <instance.json>...
//
// Exits 0 when every instance validates, 1 otherwise, printing the failing
// path and message per error.
//
// This exists so scripts/spike/aggregate.py can validate every contributing
// result BEFORE folding it into go-no-go.json, using the SAME validator the
// vitest gate uses. Python has no JSON Schema library on this machine and
// installing one would bypass the Phase 0 package-legitimacy gate for no
// benefit: ajv is already an approved dependency, and a hand-rolled subset
// validator would silently disagree with the gate on exactly the constructs
// nobody thought to reimplement.
import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const [schemaPath, ...instances] = process.argv.slice(2);
if (!schemaPath || instances.length === 0) {
  console.error("usage: validate-schema.mjs <schema.json> <instance.json>...");
  process.exit(2);
}

const load = (p) => JSON.parse(readFileSync(p, "utf8"));

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(load(schemaPath));

let failed = 0;
for (const path of instances) {
  let data;
  try {
    data = load(path);
  } catch (err) {
    console.error(`${path}: not valid JSON: ${err.message}`);
    failed++;
    continue;
  }
  if (!validate(data)) {
    failed++;
    for (const e of validate.errors ?? []) {
      console.error(`${path}: ${e.instancePath || "/"} ${e.message}`);
    }
  }
}

process.exit(failed === 0 ? 0 : 1);
