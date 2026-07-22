// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2026 Noyalib. All rights reserved.

// noyalib-wasm — the path, span and merge API.
//
// `cst-edit.js` shows the headline feature (edit a value, keep the
// comments). This example covers the rest of the exported surface, which
// is what you reach for when building tooling rather than just rewriting
// a scalar:
//
//   getPath(yaml, path)        one-shot read, no Document needed
//   merge(base, override)      layered config (defaults + environment)
//   doc.get(path)              read a parsed value
//   doc.getSource(path)        read the *original bytes* — quoting intact
//   doc.spanAt(path)           byte offsets, for editors and linters
//   doc.replaceSpan(a, b, txt) surgical edit by offset
//   doc.setValue(path, value)  typed set (JS value, not a YAML fragment)
//   doc.commentsAt(path)       comments attached to a node
//
// Run from the workspace root:
//   wasm-pack build --release --target nodejs crates/noyalib-wasm
//   node crates/noyalib-wasm/examples/paths-and-spans.js

"use strict";

const { WasmDocument, getPath, merge } = require("../pkg/noyalib_wasm.js");

const source = `\
# Service defaults — reviewed 2026-Q3
service:
  name: "api-gateway"     # quoted deliberately
  replicas: 3
  hosts:
    - a.internal
    - b.internal
`;

const rule = (t) => console.log(`\n── ${t} ──`);

// ── one-shot reads, no Document instance ────────────────────────────
rule("getPath — read without building a Document");
console.log("  service.name     =", JSON.stringify(getPath(source, "service.name")));
console.log("  service.replicas =", getPath(source, "service.replicas"));
console.log("  service.hosts[1] =", JSON.stringify(getPath(source, "service.hosts[1]")));
// A path that is not present resolves to null rather than throwing, so
// you can probe optional config without try/catch.
console.log("  service.missing  =", getPath(source, "service.missing"));

// ── layered configuration ───────────────────────────────────────────
rule("merge — defaults + environment overlay");
const overrides = "service:\n  replicas: 10\n  tier: production\n";
const merged = merge(source, overrides);
console.log(merged.split("\n").map((l) => `  | ${l}`).join("\n"));

// ── document-oriented reads ─────────────────────────────────────────
const doc = new WasmDocument(source);

rule("get vs getSource — parsed value vs original bytes");
// `get` gives you the decoded value; `getSource` gives the exact source
// slice, so you can tell `"api-gateway"` (quoted) from api-gateway.
console.log("  get('service.name')       =", JSON.stringify(doc.get("service.name")));
console.log("  getSource('service.name') =", JSON.stringify(doc.getSource("service.name")));

rule("spanAt — byte offsets for editor tooling");
const span = doc.spanAt("service.replicas");
console.log("  span:", JSON.stringify(span));
if (span && typeof span.start === "number") {
    console.log("  bytes at span:", JSON.stringify(source.slice(span.start, span.end)));
}

rule("commentsAt — comments attached to a node");
console.log("  service.name ->", JSON.stringify(doc.commentsAt("service.name")));
console.log("  service      ->", JSON.stringify(doc.commentsAt("service")));

// ── writes ──────────────────────────────────────────────────────────
rule("setValue — typed set from a JS value");
doc.setValue("service.replicas", 25);
console.log("  replicas now:", doc.get("service.replicas"));

rule("replaceSpan — surgical edit by byte offset");
// Offsets are the escape hatch when a path cannot express the edit —
// e.g. rewriting part of a scalar, or a formatter reflowing a region.
const nameSpan = doc.spanAt("service.name");
if (nameSpan && typeof nameSpan.start === "number") {
    doc.replaceSpan(nameSpan.start, nameSpan.end, '"api-edge"');
}

rule("result — comments and layout intact");
console.log(doc.toString().split("\n").map((l) => `  | ${l}`).join("\n"));

// The header comment and the inline `# quoted deliberately` must both
// still be present: every edit above touched only its own span.
const out = doc.toString();
for (const needle of ["# Service defaults", "# quoted deliberately"]) {
    if (!out.includes(needle)) {
        throw new Error(`lossless guarantee broken: lost ${needle}`);
    }
}
console.log("\n  ✓ every comment survived all four edits");
