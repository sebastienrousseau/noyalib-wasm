<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

# `noyalib-wasm` examples

Browser + Node demos exercising the
[`@sebastienrousseau/noyalib-wasm`](https://www.npmjs.com/package/@sebastienrousseau/noyalib-wasm)
surface.

| Path | Target | What it shows |
|---|---|---|
| [`node-stringify.js`](node-stringify.js) | Node | `parse` + `stringify` round-trip. |
| [`cst-edit.js`](cst-edit.js) | Node | Lossless CST edit; comments + whitespace preserved. |
| [`paths-and-spans.js`](paths-and-spans.js) | Node | `getPath`, `merge`, `getSource`, `spanAt`, `replaceSpan`, `setValue`, `commentsAt`. |
| [`json-compat.js`](json-compat.js) | Node | `validateJson` — refuses documents that JSON cannot represent. |
| [`browser/index.html`](browser/index.html) | Browser | Live in-page YAML editor with a parsed-JSON pane. |

> **Note.** There is no JSON Schema validation in the wasm build — it
> ships no schema engine. `validateJson` only checks whether a document
> can survive a JSON round-trip. For JSON Schema 2020-12 use the
> `noyavalidate --schema` CLI or the `validate-schema` feature of the
> `noyalib` Rust crate.

## Benchmarks

[`../benches/bench.js`](../benches/bench.js) measures throughput across
the real JS↔wasm boundary — the only place the numbers mean anything:

```bash
wasm-pack build --release --target nodejs crates/noyalib-wasm
node crates/noyalib-wasm/benches/bench.js
```

## Build

```bash
# From the workspace root:
wasm-pack build --release --target nodejs crates/noyalib-wasm
node crates/noyalib-wasm/examples/cst-edit.js

# For the browser demo:
wasm-pack build --release --target web crates/noyalib-wasm
cd crates/noyalib-wasm/examples/browser
python3 -m http.server
# visit http://localhost:8000/
```

## License

Dual-licensed under Apache 2.0 or MIT, at your option.
