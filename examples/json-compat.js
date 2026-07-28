// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2026 Noyalib. All rights reserved.

// noyalib-wasm — `validateJson`: can this YAML survive a trip through
// JSON?
//
// YAML is a superset of JSON, so a document can hold values JSON cannot
// express. The one this check catches is **NaN / Infinity floats**:
// `JSON.stringify` silently turns them into `null`, so a config with
// `timeout: .inf` becomes `timeout: null` downstream with no error
// anywhere. `validateJson` refuses the document instead.
//
// Two things to know about the API shape:
//
//   1. It NEVER returns `false`. Incompatibility is reported by
//      *throwing*, and the return value is `true` on success. Write
//      `try/catch`, not `if (validateJson(x))`.
//   2. It is NOT JSON Schema validation — the wasm build ships no
//      schema engine. For JSON Schema 2020-12 use the
//      `noyavalidate --schema` CLI, or the `validate-schema` feature of
//      the `noyalib` Rust crate.
//
// Run from the workspace root:
//   wasm-pack build --release --target nodejs crates/noyalib-wasm
//   node crates/noyalib-wasm/examples/json-compat.js

"use strict";

const { validateJson, parse } = require("../pkg/noyalib_wasm.js");

/** Returns `null` on success, or the error message on rejection. */
function reject_reason(yaml) {
    try {
        validateJson(yaml);
        return null;
    } catch (e) {
        return e.message ?? String(e);
    }
}

function check(label, yaml) {
    const why = reject_reason(yaml);
    console.log(`  ${label.padEnd(34)} ${why === null ? "accepted ✓" : `rejected — ${why}`}`);
}

console.log("noyalib-wasm — validateJson (JSON round-trip safety)\n");

console.log("Accepted — these survive JSON unchanged:");
check("scalars + nesting", "host: api\nport: 8080\n");
check("sequences", "features:\n  - auth\n  - api\n");
check("null / bool / finite float", "a: null\nb: true\nc: 1.5\n");
check("empty document", "");

console.log("\nRejected — JSON cannot represent these:");
check("NaN float", "ratio: .nan\n");
check("positive infinity", "timeout: .inf\n");
check("negative infinity", "floor: -.inf\n");

console.log("\nAlso rejected — not valid YAML in the first place:");
check("unclosed flow sequence", "a: [1, 2\n");
check("inconsistent indentation", "a:\n  b: 1\n c: 2\n");

console.log("\nAccepted, but worth knowing:");
// JSON object keys must be strings. YAML allows any node as a key, and
// this check permits them — they are coerced to strings on conversion
// rather than rejected. If exact key fidelity matters, check yourself.
check("integer mapping key", "1: one\n");
check("sequence as mapping key", "[1, 2]: value\n");

console.log("\nPractical use — gate before JSON.stringify:");
for (const doc of ["service: api\nreplicas: 3\n", "service: api\nbackoff: .inf\n"]) {
    const why = reject_reason(doc);
    if (why === null) {
        console.log("   ok:", JSON.stringify(parse(doc)));
    } else {
        // Without this gate, `backoff` would reach the far side as
        // `null` and nothing would have warned you.
        console.log("   refused:", why);
    }
}
