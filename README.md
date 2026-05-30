<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

<p align="center">
  <img src="https://cloudcdn.pro/noyalib/v1/logos/noyalib.svg" alt="Noyalib logo" width="128" />
</p>

<h1 align="center">noyalib-wasm</h1>

<p align="center">
  <strong><code>wasm-bindgen</code> wrapper around noyalib —
  pure-Rust YAML 1.2, zero <code>unsafe</code>, ~338 KB after
  LTO. Runs in browsers, Node, Cloudflare Workers, Deno, and
  any other WASM-capable host.</strong>
</p>

<p align="center">
  <a href="https://github.com/sebastienrousseau/noyalib/actions"><img src="https://img.shields.io/github/actions/workflow/status/sebastienrousseau/noyalib/ci.yml?style=for-the-badge&logo=github" alt="Build" /></a>
  <a href="https://www.npmjs.com/package/@noyalib/noyalib-wasm"><img src="https://img.shields.io/npm/v/@noyalib/noyalib-wasm?style=for-the-badge&color=fc8d62&logo=npm" alt="npm" /></a>
  <a href="https://docs.rs/noyalib-wasm"><img src="https://img.shields.io/badge/docs.rs-noyalib--wasm-66c2a5?style=for-the-badge&labelColor=555555&logo=docs.rs" alt="Docs.rs" /></a>
  <a href="https://bundlephobia.com/package/@noyalib/noyalib-wasm"><img src="https://img.shields.io/bundlephobia/minzip/@noyalib/noyalib-wasm?style=for-the-badge&color=informational" alt="Bundle size" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/sebastienrousseau/noyalib"><img src="https://img.shields.io/ossf-scorecard/github.com/sebastienrousseau/noyalib?style=for-the-badge&label=OpenSSF%20Scorecard&logo=openssf" alt="OpenSSF Scorecard" /></a>
</p>

---

## Contents

- [Install](#install) — npm, build from source
- [Quick Start](#quick-start) — parse, edit, validate
- [Why this approach?](#why-this-approach) — vs `js-yaml`
- [Surface](#surface) — exported APIs
- [Bundle size](#bundle-size) — what you ship to users
- [Targets](#targets) — every wasm-pack flavour
- [Provenance](#provenance) — npm + cosign
- [Examples](#examples) — Node + browser demos
- [When not to use noyalib-wasm](#when-not-to-use-noyalib-wasm)
- [Documentation](#documentation)
- [License](#license)

---

## Install

```sh
npm install @noyalib/noyalib-wasm
# or
pnpm add @noyalib/noyalib-wasm
# or
yarn add @noyalib/noyalib-wasm
```

Or build from source against any wasm-pack target:

```sh
git clone https://github.com/sebastienrousseau/noyalib
cd noyalib/crates/noyalib-wasm
wasm-pack build --release --target bundler
```

---

## Quick Start

```js
import init, {
  parse,
  stringify,
  validateJson,
  getPath,
  merge,
  WasmDocument,
} from "@noyalib/noyalib-wasm";

await init();          // load the WASM blob

// Plain parse / stringify — like js-yaml. Mappings come back as
// plain JS Objects (not `Map`), so dotted property access works.
const obj = parse("host: api.example.com\nport: 8080\n");
console.log(obj.host); // "api.example.com"
const yaml = stringify(obj);

// Indexed read without going through `parse`.
const port = getPath("host: api.example.com\nport: 8080\n", "port"); // 8080

// JSON-compatible YAML 1.2 schema check.
validateJson("a: 1\nb: [2, 3]\n"); // true

// Lossless CST edit — comments + indentation preserved.
const doc = new WasmDocument(source);
doc.set("server.port", "9090");
fs.writeFileSync("config.yaml", doc.toString());
```

---

## Why this approach?

[`js-yaml`](https://github.com/nodeca/js-yaml) is the de-facto
JS YAML parser, and it's good — but it makes two tradeoffs that
hurt for editor and tooling workloads:

1. **`js-yaml` discards comments by spec.** It implements the
   YAML data model, which excludes comments. Round-tripping a
   document through `parse` → `dump` strips every `#` line.
   noyalib's `Document` API runs through a lossless CST that
   reproduces the source byte-for-byte; only the surgically
   touched span changes on a `set`.

2. **`js-yaml` follows YAML 1.1 by default.** That's the
   "Norway problem": `country: NO` parses as `country: false`,
   silently rewriting the country code. noyalib defaults to
   YAML 1.2 strict semantics; only `true` / `false` are
   booleans.

### Custom YAML tags

`parse(yaml)` surfaces YAML tags as plain JS object keys:
`!Color '#ff8800'` deserialises into `{ "!Color": "#ff8800" }`.
This matches the serde-bridge convention every other
`serde-wasm-bindgen` consumer uses (the `Value::Tagged` variant
serialises as a single-entry map for cross-format interop).
Round-tripping via `stringify` does **not** restore the
YAML-tag prefix — the JS object's tag-as-key shape becomes a
quoted mapping key in the emitted YAML.

For editor / tooling workloads where the YAML-tag wire form
must survive a parse → emit cycle, use the `WasmDocument`
class instead. Its `set` / `setValue` are surgical edits
through the CST, so untouched tag prefixes round-trip
verbatim:

```js
const doc = new WasmDocument("color: !Color '#ff8800'\n");
doc.set("color", "!Color '#00aaff'");           // tag survives
console.log(doc.toString());                    // "color: !Color '#00aaff'\n"
```

Other differences worth knowing about:

- **JSON Schema 2020-12 validation built in.** Same engine as
  the `noyavalidate` CLI ships.
- **Pure-Rust, zero `unsafe`.** Every byte of the parser,
  scanner, formatter, and CST is checked at compile time by the
  workspace `#![forbid(unsafe_code)]` lint.
- **~338 KB bundle.** That's roughly the same size as `js-yaml`
  minified + gzipped, with the lossless-CST surface and YAML
  1.2 semantics baked in.

---

## Surface

All exports are camelCase, matching JS conventions.

### Free functions

| Export | What it does |
|---|---|
| `parse(yaml: string): any` | Parse a YAML document into a JS value. Mappings become plain Objects; sequences become Arrays; scalars become numbers / strings / booleans / null. Mirrors `js-yaml`'s `load`. |
| `stringify(value: any): string` | Serialise a JS value back to YAML. |
| `validateJson(yaml: string): boolean` | Validate that the document conforms to the YAML 1.2 JSON-compatible schema (only types JSON allows: null / bool / number / string / array / object). Returns `true` / `false`; structural JSON Schema 2020-12 validation is on the `noyavalidate` CLI roadmap. |
| `getPath(yaml: string, path: string): any` | Indexed read without going through `parse`. Dotted paths (`"server.host"`); returns `null` if missing. |
| `merge(base: string, override: string): string` | Deep-merge two YAML documents. Delegates to `noyalib::Value::merge`. |

### `WasmDocument` class — lossless CST

Construct with `new WasmDocument(yaml)`. Every method preserves
comments and formatting around untouched spans byte-faithfully.

| Method | What it does |
|---|---|
| `toString(): string` | Re-emit. Byte-identical to the parsed source if no edits were made. |
| `get(path: string): any` | Parsed value at a dotted path. Returns `null` if missing. |
| `getSource(path: string): string \| null` | Raw source fragment at a dotted path (no re-quoting / canonicalisation). |
| `set(path: string, fragment: string): void` | Surgically rewrite a value at a dotted path. The fragment is a YAML-shaped string (`"9090"`, `"[1,2,3]"`, …). |
| `setValue(path: string, value: any): void` | Same as `set` but accepts a JS value instead of a YAML fragment. |
| `spanAt(path: string): { start: number, end: number } \| null` | Byte range of the value at a dotted path. |
| `commentsAt(path: string): { before: string[], inline: string \| null }` | Comments associated with the node at a path. |
| `replaceSpan(start: number, end: number, replacement: string): void` | Primitive byte replacement. |

Every function is `async` only via `init()` — once the WASM
blob is loaded, individual calls are synchronous.

---

## Bundle size

| Build | Size (raw) | Size (gzip) |
|---|---|---|
| Default (`wasm-pack build --release --target bundler`) | ~338 KB | ~140 KB |
| `--features wasm-opt` (post-build pass) | ~280 KB | ~115 KB |

Tree-shaking-friendly — the `Document` API and the plain
`parse` / `stringify` API are independent modules; bundlers
drop whichever your code does not import.

For comparison: `js-yaml` 4.x lands around ~50 KB minified +
~12 KB gzipped, but does not provide lossless-CST or schema
validation.

---

## Targets

`wasm-pack build` supports every target wasm-bindgen does:

```sh
wasm-pack build --target bundler    # webpack, rollup, esbuild
wasm-pack build --target web        # native ES module via <script type="module">
wasm-pack build --target nodejs     # commonjs Node import
wasm-pack build --target deno       # Deno-native module
wasm-pack build --target no-modules # plain global, no module loader
```

Cloudflare Workers and edge runtimes generally consume the
`bundler` target via their packaging step.

---

## Provenance

Every release on npm carries an
[npm provenance attestation](https://docs.npmjs.com/generating-provenance-statements)
linking the published bundle to the GitHub Actions run that
produced it. Verify via:

```sh
npm view @noyalib/noyalib-wasm provenance
```

The underlying `.wasm` is also signed with cosign keyless
alongside every release; the verify command is identical to
the source crate's:

```sh
cosign verify-blob \
  --certificate-identity-regexp 'https://github.com/sebastienrousseau/noyalib/' \
  --certificate-oidc-issuer 'https://token.actions.githubusercontent.com' \
  --certificate noyalib_wasm_bg.wasm.pem \
  --signature   noyalib_wasm_bg.wasm.sig \
  noyalib_wasm_bg.wasm
```

Full cookbook: [`pkg/VERIFY.md`](https://github.com/sebastienrousseau/noyalib/blob/main/pkg/VERIFY.md).

---

## Examples

Browser + Node demos under
[`crates/noyalib-wasm/examples/`](examples/):

| Path | Target | What it shows |
|---|---|---|
| [`node-stringify.js`](examples/node-stringify.js) | Node | `parse` + `stringify` round-trip. |
| [`cst-edit.js`](examples/cst-edit.js) | Node | Lossless CST edit; comments + whitespace preserved. |
| [`schema-validate.js`](examples/schema-validate.js) | Node | JSON Schema 2020-12 validation, good and bad cases. |
| [`browser/index.html`](examples/browser/index.html) | Browser | Live in-page YAML editor with a parsed-JSON pane. |

```bash
# Node:
wasm-pack build --release --target nodejs crates/noyalib-wasm
node crates/noyalib-wasm/examples/cst-edit.js

# Browser:
wasm-pack build --release --target web crates/noyalib-wasm
cd crates/noyalib-wasm/examples/browser
python3 -m http.server     # or any static-file server
```

---

## When not to use noyalib-wasm

- **You only ever consume YAML in Node and don't care about
  comment-preserving edits or YAML 1.2 strictness.** `js-yaml`
  is smaller (~50 KB minified) and the de-facto standard;
  reach for it first.
- **You need a streaming parser for multi-GB documents.** The
  WASM bindings always read the full document into memory.
  For TB-scale streaming workloads, drive the noyalib library
  directly from a Rust process and pipe results out.

---

## Compatibility

**MSRV: Rust 1.85.0** stable. The `wasm-bindgen` 0.2 ecosystem
floors the toolchain at 1.85; the core `noyalib` library
itself stays at 1.75. CI verifies the floor on every PR via
the `Per-crate MSRV` workflow job. The bump policy lives in
[`doc/POLICIES.md`](https://github.com/sebastienrousseau/noyalib/blob/main/doc/POLICIES.md#1-msrv-minimum-supported-rust-version).

**Tier-1 WASM targets** (CI-verified each PR via
`wasm-pack test --node`): `wasm32-unknown-unknown` produced
under every `wasm-pack` mode — `bundler` (Webpack, Rollup,
esbuild, Vite), `web` (native ES module), `nodejs` (CJS),
`deno`, `no-modules`. Cloudflare Workers, Deno, and Bun
consume the `bundler` target.

---

## Documentation

- **Engineering policies** (MSRV, SemVer, security, performance, concurrency, platform support, feature flags):
  [`doc/POLICIES.md`](https://github.com/sebastienrousseau/noyalib/blob/main/doc/POLICIES.md)
- **Security policy**:
  [`SECURITY.md`](https://github.com/sebastienrousseau/noyalib/blob/main/SECURITY.md)
- **JS API reference**:
  [`doc/js-api.md`](https://github.com/sebastienrousseau/noyalib/blob/main/crates/noyalib-wasm/doc/js-api.md)
- **Bundling (Vite, Webpack, Next.js, Cloudflare Workers, Deno, Bun)**:
  [`doc/bundling.md`](https://github.com/sebastienrousseau/noyalib/blob/main/crates/noyalib-wasm/doc/bundling.md)
- **npm package**:
  <https://www.npmjs.com/package/@noyalib/noyalib-wasm>
- **API reference (rustdoc)**: <https://docs.rs/noyalib-wasm>
- **Workspace README**:
  <https://github.com/sebastienrousseau/noyalib#readme>

---

## License

Dual-licensed under [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0)
or [MIT](https://opensource.org/licenses/MIT), at your option.
