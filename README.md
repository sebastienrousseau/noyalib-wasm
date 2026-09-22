<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

<p align="center">
  <img src="https://cloudcdn.pro/noyalib/v1/logos/noyalib.svg" alt="noyalib-wasm logo" width="128" />
</p>

<h1 align="center">noyalib-wasm</h1>

<p align="center">
  Browser and JavaScript bindings for YAML 1.2 parsing and lossless editing.
</p>

<p align="center">
  <a href="https://github.com/sebastienrousseau/noyalib-wasm/actions"><img src="https://img.shields.io/github/actions/workflow/status/sebastienrousseau/noyalib-wasm/ci.yml?style=for-the-badge&logo=github" alt="Build" /></a>
  <a href="https://www.npmjs.com/package/@sebastienrousseau/noyalib-wasm"><img src="https://img.shields.io/npm/v/@sebastienrousseau/noyalib-wasm?style=for-the-badge&color=fc8d62&logo=npm" alt="Registry" /></a>
  <a href="https://docs.rs/noyalib-wasm"><img src="https://img.shields.io/badge/docs.rs-noyalib--wasm-66c2a5?style=for-the-badge&labelColor=555555&logo=docs.rs" alt="Docs" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/sebastienrousseau/noyalib-wasm"><img src="https://img.shields.io/ossf-scorecard/github.com/sebastienrousseau/noyalib-wasm?style=for-the-badge&label=OpenSSF%20Scorecard&logo=openssf" alt="OpenSSF Scorecard" /></a>
  <a href="LICENSE-APACHE"><img src="https://img.shields.io/badge/license-Apache--2.0%20OR%20MIT-blue.svg?style=for-the-badge" alt="License: Apache-2.0 OR MIT" /></a>
  <a href="https://github.com/sebastienrousseau/noyalib-wasm/blob/main/docs/POLICIES.md"><img src="https://img.shields.io/badge/MSRV-1.86.0-93450a.svg?style=for-the-badge&logo=rust" alt="MSRV 1.86.0" /></a>
</p>

---

## Contents

**Getting started**

- [Install](#install) — npm-compatible package managers and source builds
- [Requirements](#requirements) — toolchain floor, runtimes
- [Quick Start](#quick-start) — parse, inspect, and edit YAML

**The noyalib-wasm ecosystem**

- [The noyalib-wasm ecosystem](#the-noyalib-wasm-ecosystem) — bindings and companion tools

**Library reference**

- [Capabilities at a glance](#capabilities-at-a-glance) — the current surface by theme
- [Ecosystem comparison](#ecosystem-comparison) — short matrix; full table at [`docs/COMPARISON.md`](docs/COMPARISON.md)
- [Benchmarks](#benchmarks) — harness and bundle measurements; full table at [`docs/BENCHMARKS.md`](docs/BENCHMARKS.md)
- [Features](#features) — JavaScript exports
- [Configuration](#configuration) — wasm-pack targets and build modes
- [Examples](#examples) — browser and Node examples

**Operational**

- [When not to use noyalib-wasm](#when-not-to-use-noyalib-wasm) — limitations
- [Development](#development) — make targets, WASM tests, CI
- [Security](#security) — guarantees and compliance
- [Documentation](#documentation) — all reference docs
- [Stability guarantees](#stability-guarantees) — JavaScript API, SemVer, and toolchain discipline
- [License](#license)

---

## Install

### As a JavaScript library

```bash
npm install @sebastienrousseau/noyalib-wasm@0.0.50
```

`pnpm add` and `yarn add` work with the same package. To build from source:

```bash
wasm-pack build --release --target bundler
```

## Requirements

- Rust **1.86.0 or newer** and `wasm-pack` when building from source.
- A WebAssembly-capable browser, Node.js, Deno, Bun, or edge runtime.
- The crate pins `noyalib` at exactly `=0.0.50` under the lockstep contract.

| Surface | Minimum | Enforcement |
| :--- | :---: | :--- |
| Rust crate | Rust 1.86.0 | manifest and MSRV CI |
| JavaScript package | WebAssembly runtime | Node and browser CI |

## Quick Start

```js
import init, { parse, getPath, WasmDocument } from "@sebastienrousseau/noyalib-wasm";

await init();

const value = parse("host: api.example.com\nport: 8080\n");
const port = getPath("port: 8080\n", "port");

const document = new WasmDocument("# service\nport: 8080\n");
document.set("port", "9090");
console.log(document.toString());
```

## The noyalib-wasm ecosystem

| Component | Purpose |
| :--- | :--- |
| `noyalib-wasm` | JavaScript and WebAssembly API |
| [`noyalib`](https://github.com/sebastienrousseau/noyalib) | Rust parser and lossless CST engine |
| [`noya-cli`](https://github.com/sebastienrousseau/noya-cli) | Native command-line formatting and validation |
| npm package | Provenance-attested browser and runtime distribution |

## Capabilities at a glance

| Area | Capability | Status |
| :--- | :--- | :--- |
| Data model | `parse` and `stringify` | Stable |
| Indexed access | `getPath` and `merge` | Stable |
| Validation | JSON-compatible YAML check | Stable |
| Lossless CST | `WasmDocument` reads and surgical edits | Stable |
| Targets | bundler, web, nodejs, deno, and no-modules | Supported |

## Ecosystem comparison

| Project | YAML 1.2 | Preserves untouched source | Browser-ready |
| :--- | :---: | :---: | :---: |
| **noyalib-wasm** | Yes | Yes, through `WasmDocument` | Yes |
| `js-yaml` | Configurable | No | Yes |
| Native `noyalib` | Yes | Yes | Requires a Rust host |

See [`docs/COMPARISON.md`](docs/COMPARISON.md) for scope and caveats.

## Benchmarks

The repository measures calls across the real JavaScript-to-WASM boundary and
tracks release bundle size. Measurements are descriptive, not CI pass/fail
thresholds.

```bash
wasm-pack build --release --target nodejs
node benches/bench.js
```

See [`docs/BENCHMARKS.md`](docs/BENCHMARKS.md) for the recorded method.

## Features

- `parse`, `stringify`, `validateJson`, `getPath`, and `merge` free functions.
- `WasmDocument` lossless reads, source spans, comments, and surgical edits.
- JavaScript-native values through `serde-wasm-bindgen`.
- npm provenance and release supply-chain metadata.
- Browser, server, edge, and no-module build targets.

## Configuration

| Command | Target |
| :--- | :--- |
| `wasm-pack build --target bundler` | Vite, Webpack, Rollup, and esbuild |
| `wasm-pack build --target web` | Native browser ES modules |
| `wasm-pack build --target nodejs` | Node.js CommonJS |
| `wasm-pack build --target deno` | Deno-native module |
| `wasm-pack build --target no-modules` | Global browser binding |

The release profile leaves `wasm-opt` to the packaging pipeline so one build
step owns the final artifact transformation.

## Examples

- [`node-stringify.js`](examples/node-stringify.js): parse and stringify.
- [`cst-edit.js`](examples/cst-edit.js): comment-preserving edit.
- [`paths-and-spans.js`](examples/paths-and-spans.js): indexed access and spans.
- [`browser/index.html`](examples/browser/index.html): browser editor.

## When not to use noyalib-wasm

- Use a smaller JavaScript-only parser when comments and source-preserving edits
  do not matter.
- Use native `noyalib` for streaming or memory-sensitive server workloads.
- `validateJson` checks JSON round-trip compatibility; it is not a JSON Schema
  validator. Use `noyavalidate` or the core schema feature for that purpose.

The [detailed README reference](docs/README-REFERENCE.md) retains API tables,
bundle detail, target notes, and provenance commands.

## Development

```bash
make
make test
make clippy
make fmt
wasm-pack test --node
```

CI checks native and WebAssembly builds, Node integration, rustdoc, dependency
policy, the shared YAML suite, and package provenance. See
[`DEVELOPMENT.md`](DEVELOPMENT.md).

## Security

Report vulnerabilities through [`SECURITY.md`](SECURITY.md). The Rust crate
forbids `unsafe` code and treats YAML and JavaScript values as untrusted input.
Published npm artifacts carry provenance linking them to the release workflow.

## Documentation

- [User Manual](https://sebastienrousseau.github.io/noyalib-wasm/manual/)
- [Rust API reference](https://docs.rs/noyalib-wasm)
- [JavaScript API](docs/js-api.md)
- [Bundling guide](docs/bundling.md)
- [Developer documentation](DEVELOPMENT.md)
- [Engineering policies](docs/POLICIES.md)
- [Compliance grade](docs/COMPLIANCE-GRADE.md)
- [Detailed README reference](docs/README-REFERENCE.md)

## Stability guarantees

- During `0.0.x`, the patch component is the breaking-change axis.
- Exported JavaScript names, argument shapes, and return shapes are public API.
- Untouched bytes remain stable when using the lossless `WasmDocument` surface.
- The MSRV may rise only on the breaking axis with a changelog explanation.

## License

Licensed under either [Apache License 2.0](LICENSE-APACHE) or
[MIT](LICENSE-MIT), at your option.
