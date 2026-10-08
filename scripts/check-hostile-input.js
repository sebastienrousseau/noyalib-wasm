// SPDX-FileCopyrightText: 2026 Noyalib
// SPDX-License-Identifier: MIT OR Apache-2.0
//
// Hostile input must fail with a JavaScript Error and leave the instance
// usable. On WebAssembly a stack overflow traps the instance, and every
// later call into it traps too, so each check is followed by a plain
// parse.
//
//   wasm-pack build --dev --target nodejs --out-dir pkg-node
//   node scripts/check-hostile-input.js pkg-node
//
// Exits 1 when any check fails.
"use strict";

const path = require("path");
const w = require(path.resolve(process.argv[2] || "pkg-node", "noyalib_wasm.js"));

const deepObject = (n) => { let v = 1; for (let i = 0; i < n; i++) v = { k: v }; return v; };
const deepArray = (n) => { let v = 1; for (let i = 0; i < n; i++) v = [v]; return v; };
const deepMap = (n) => { let v = 1; for (let i = 0; i < n; i++) v = new Map([["k", v]]); return v; };
const cyclic = () => { const o = {}; o.self = o; return o; };
const flow = (n) => "[".repeat(n) + "]".repeat(n);

let failures = 0;

function expect(name, wantError, fn) {
  let outcome;
  try {
    fn();
    outcome = wantError ? "FAIL (accepted)" : "ok";
  } catch (e) {
    const trapped = e instanceof WebAssembly.RuntimeError;
    const why = `${e.constructor.name}: ${String(e.message).slice(0, 70)}`;
    outcome = !wantError || trapped ? `FAIL (${why})` : `ok (${why})`;
  }
  let alive = "instance usable";
  try {
    w.parse("z: 2");
  } catch (e) {
    alive = `INSTANCE DEAD (${e.constructor.name})`;
    outcome = "FAIL";
  }
  if (!outcome.startsWith("ok")) failures++;
  console.log(`${outcome.startsWith("ok") ? "ok  " : "FAIL"} ${name}: ${outcome}; ${alive}`);
  if (alive !== "instance usable") {
    console.log("stopping: the instance trapped, later checks would only repeat it");
    process.exit(1);
  }
}

expect("stringify 128-deep object", false, () => w.stringify(deepObject(128)));
expect("stringify 129-deep object", true, () => w.stringify(deepObject(129)));
expect("stringify 20000-deep array", true, () => w.stringify(deepArray(20000)));
expect("stringify 20000-deep Map", true, () => w.stringify(deepMap(20000)));
expect("stringify cyclic object", true, () => w.stringify(cyclic()));
expect("setValue 20000-deep object", true, () => new w.WasmDocument("a: 1\n").setValue("a", deepObject(20000)));
expect("setValue cyclic object", true, () => new w.WasmDocument("a: 1\n").setValue("a", cyclic()));
expect("set 100000-deep flow fragment", true, () => new w.WasmDocument("a: 1\n").set("a", flow(100000)));
expect("replaceSpan 100000-deep flow", true, () => new w.WasmDocument("a: 1\n").replaceSpan(3, 4, flow(100000)));
expect("replaceSpan turning a comment into 100000-deep flow", true, () =>
  new w.WasmDocument(`a: #${flow(100000)}\n`).replaceSpan(3, 4, " "));
expect("set ordinary fragment", false, () => new w.WasmDocument("a: 1\n").set("a", "[1, [2, 3]]"));

console.log(failures === 0 ? "all hostile-input checks passed" : `${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
