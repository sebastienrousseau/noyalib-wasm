// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2026 Noyalib. All rights reserved.

// noyalib-wasm — lossless CST edit. The Document API mutates a
// single byte span and leaves the surrounding text (including
// comments + whitespace) untouched.
//
// Run from the workspace root:
//   wasm-pack build --release --target nodejs crates/noyalib-wasm
//   node crates/noyalib-wasm/examples/cst-edit.js

"use strict";

const { WasmDocument } = require("../pkg/noyalib_wasm.js");

const source = `\
# Production server config — keep these comments aligned with
# the staging copy at infra/staging.yaml.
server:
  host: api.example.com   # public endpoint
  port: 8080              # bind to the loopback in dev
`;

// The class is exported as `WasmDocument` and is constructed, not
// parsed via a static — `new WasmDocument(src)`.
const doc = new WasmDocument(source);
doc.set("server.port", "9090");

console.log("── before ──");
console.log(source);
console.log("── after ──");
console.log(doc.toString());

// Notice both `# public endpoint` and `# bind to the loopback`
// are preserved verbatim. The only byte that changed is the
// scalar `8080` → `9090`.
