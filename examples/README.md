<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

# `noyalib-wasm` examples

Browser + Node demos exercising the
[`@sebastienrousseau/noyalib-wasm`](https://www.npmjs.com/package/@sebastienrousseau/noyalib-wasm)
surface.

| Path | Target | What it shows |
|---|---|---|
| [`node-stringify.js`](node-stringify.js) | Node | `parse` + `stringify` round-trip. |
| [`cst-edit.js`](cst-edit.js) | Node | Lossless CST edit; comments + whitespace preserved. |
| [`schema-validate.js`](schema-validate.js) | Node | JSON Schema 2020-12 validation, good- and bad-doc cases. |
| [`browser/index.html`](browser/index.html) | Browser | Live in-page YAML editor with a parsed-JSON pane. |

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
