// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2026 Noyalib. All rights reserved.

// noyalib-wasm — Node.js parse + stringify round-trip.
//
// Run from the workspace root:
//   wasm-pack build --release --target nodejs crates/noyalib-wasm
//   node crates/noyalib-wasm/examples/node-stringify.js

"use strict";

const { parse, stringify } = require(
    "../pkg/noyalib_wasm.js",   // wasm-pack output
);

const yaml = `\
host: api.example.com
port: 8080
features:
  - auth
  - api
`;

const obj = parse(yaml);
console.log("parsed:", obj);

const round = stringify(obj);
console.log("\nround-tripped:");
console.log(round);

// The result of stringify(parse(...)) is canonical YAML 1.2 —
// not byte-identical to the input (comments / exact whitespace
// drop on the data-binding round-trip), but semantically equal.
// Use `Document.parse` + `Document.toString` for byte-faithful
// edits — see cst-edit.js.
