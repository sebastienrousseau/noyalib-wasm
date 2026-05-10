// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2026 Noyalib. All rights reserved.

// noyalib-wasm — JSON Schema 2020-12 validation in the browser
// or Node. Same engine as `noyavalidate --schema`; same error
// shape.
//
// Run:
//   wasm-pack build --release --target nodejs crates/noyalib-wasm
//   node crates/noyalib-wasm/examples/schema-validate.js

"use strict";

const { parse, validate_json } = require("../pkg/noyalib_wasm.js");

const schema = {
    type: "object",
    required: ["host", "port"],
    properties: {
        host: { type: "string" },
        port: { type: "integer", minimum: 1, maximum: 65535 },
    },
};

// Good doc.
const good = parse("host: api\nport: 8080\n");
console.log("good doc:", validate_json(good, schema)
    ? "valid ✓"
    : "invalid (unexpected)");

// Bad doc — port out of range.
const bad = parse("host: api\nport: 999999\n");
console.log("bad  doc:", validate_json(bad, schema)
    ? "valid (unexpected)"
    : "invalid ✓ (as expected)");
