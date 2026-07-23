// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2026 Noyalib. All rights reserved.

// noyalib-wasm — throughput measured where it actually runs.
//
// Why this is JavaScript and not a Criterion bench: every exported
// function is a `#[wasm_bindgen]` shim. Calling the underlying Rust on a
// native target would measure the Rust and skip the two things that
// dominate wasm cost in practice — the JS↔wasm boundary crossing and
// serde-wasm-bindgen converting values into JS objects. A native number
// would look great and tell you nothing about your page.
//
// So: build for Node, call across the real boundary, and report ops/sec
// alongside a `JSON.parse` baseline so the numbers have a reference
// point people already have intuition for.
//
// Run from the workspace root:
//   wasm-pack build --release --target nodejs crates/noyalib-wasm
//   node crates/noyalib-wasm/benches/bench.js

"use strict";

const { parse, stringify, getPath, merge, WasmDocument } = require("../pkg/noyalib_wasm.js");

// ── fixtures ────────────────────────────────────────────────────────
const SMALL = "host: api.example.com\nport: 8080\ndebug: false\n";

const MEDIUM = (() => {
    const services = [];
    for (let i = 0; i < 50; i++) {
        services.push(
            `  svc-${i}:\n    image: registry/svc-${i}:1.0.0\n` +
                `    replicas: ${i % 5}\n    port: ${8000 + i}\n`,
        );
    }
    return `# generated fixture\nversion: "3.9"\nservices:\n${services.join("")}`;
})();

const MEDIUM_JSON = JSON.stringify(parse(MEDIUM));

// ── harness ─────────────────────────────────────────────────────────
// Fixed-duration sampling rather than a fixed iteration count: short
// operations get enough samples to be meaningful, slow ones do not stall
// the run. Not a statistical package — no outlier rejection, no
// confidence intervals. For rigorous numbers use the Rust benches in the
// core crate; this exists to catch order-of-magnitude regressions and to
// let a caller size their own workload.
const MIN_MS = 400;

function bench(label, fn) {
    // Warm up so wasm instantiation and JIT tiering are not in the sample.
    for (let i = 0; i < 50; i++) fn();

    let ops = 0;
    const t0 = process.hrtime.bigint();
    let elapsedMs = 0;
    do {
        for (let i = 0; i < 100; i++) fn();
        ops += 100;
        elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6;
    } while (elapsedMs < MIN_MS);

    const opsPerSec = (ops / elapsedMs) * 1000;
    const usPerOp = (elapsedMs * 1000) / ops;
    console.log(
        `  ${label.padEnd(38)} ${fmt(opsPerSec).padStart(12)} ops/s   ${usPerOp.toFixed(2).padStart(9)} µs/op`,
    );
    return opsPerSec;
}

function fmt(n) {
    if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
    return n.toFixed(0);
}

// ── runs ────────────────────────────────────────────────────────────
console.log("noyalib-wasm benchmarks (Node, release wasm)\n");
console.log(`node ${process.version} · small fixture ${SMALL.length} B · medium ${MEDIUM.length} B\n`);

console.log("parse — YAML text to JS value");
bench("parse (small, 3 keys)", () => parse(SMALL));
const yamlMedium = bench("parse (medium, 50 services)", () => parse(MEDIUM));
const jsonMedium = bench("JSON.parse (same data, baseline)", () => JSON.parse(MEDIUM_JSON));
console.log(
    `  -> JSON.parse is ${(jsonMedium / yamlMedium).toFixed(1)}x faster on equivalent data;\n` +
        "     that gap is the price of comments, anchors and lossless spans.",
);

console.log("\nstringify — JS value back to YAML");
const smallValue = parse(SMALL);
const mediumValue = parse(MEDIUM);
bench("stringify (small)", () => stringify(smallValue));
bench("stringify (medium)", () => stringify(mediumValue));

console.log("\npath reads");
bench("getPath (one-shot, medium)", () => getPath(MEDIUM, "services.svc-25.port"));
const doc = new WasmDocument(MEDIUM);
bench("doc.get (reused Document)", () => doc.get("services.svc-25.port"));
console.log(
    "  -> getPath re-parses on every call; build a Document once when\n" +
        "     reading repeatedly from the same source.",
);

console.log("\nlossless editing");
bench("new WasmDocument (medium)", () => {
    const d = new WasmDocument(MEDIUM);
    d.free();
});
bench("setValue on a live Document", () => doc.setValue("services.svc-25.replicas", 7));

console.log("\nmerge");
const overlay = "services:\n  svc-1:\n    replicas: 9\n";
bench("merge (medium + small overlay)", () => merge(MEDIUM, overlay));

console.log("\nDone. Numbers are order-of-magnitude guidance, not a");
console.log("statistically rigorous benchmark — see the core crate's");
console.log("Criterion suite for that.");
