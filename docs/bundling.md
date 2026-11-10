<!-- SPDX-FileCopyrightText: 2026 Noyalib -->
<!-- SPDX-License-Identifier: MIT OR Apache-2.0 -->

# Packaging and loading noyalib-wasm

The published package is `@sebastienrousseau/noyalib-wasm`. Release CI builds
one **bundler** target. Its ESM entry imports the generated `.wasm` and bridge
module and exports named functions and `WasmDocument`. The installed package
has no `exports` map, no default `init` function and no `web` or `nodejs`
subpaths. Source-built targets are separate outputs, not automatically
selected variants inside the published package.

## Published bundler target

```sh
npm install @sebastienrousseau/noyalib-wasm
```

```js
import { parse, WasmDocument } from "@sebastienrousseau/noyalib-wasm";

const value = parse("port: 8080\n");
const document = new WasmDocument("port: 8080\n");
try {
  document.set("port", "9090");
  console.log(value, document.toString());
} finally {
  document.free();
}
```

Your bundler must load WebAssembly ESM imports. Check its current WASM
configuration and run the generated application in its target runtime;
a successful JavaScript bundle alone does not prove initialization works.
This document does not claim tested support for every framework or CDN.

## Source-built browser target

From this repository:

```sh
wasm-pack build --release --target web --out-dir pkg-web
```

```js
import init, { parse } from "./pkg-web/noyalib_wasm.js";

await init();
console.log(parse("port: 8080\n"));
```

Serve the generated files over HTTP with the `.wasm` file available beside
its JS loader. The `init` function belongs to this web-target output, not
the published bundler package. Do not import a nonexistent package `/web`
subpath.

## Source-built Node target

```sh
wasm-pack build --release --target nodejs --out-dir pkg-node
```

```js
const { parse } = require("./pkg-node/noyalib_wasm.js");
console.log(parse("port: 8080\n"));
```

The generated Node target is CommonJS and initializes synchronously.
It is separate from the published ESM bundler output. Node support for
loading that published output directly depends on the Node version's
WebAssembly module support and must be tested explicitly.

## TypeScript, sizes and other runtimes

The package includes generated `noyalib_wasm.d.ts`. Compile consumers
against that installed declaration file; do not invent default exports or
subpaths. WASM spans are UTF-8 byte offsets, not JS UTF-16 string indices.

Measure raw/compressed module bytes, initialization, calls and memory from
the actual generated output using [BENCHMARKS.md](BENCHMARKS.md). No fixed
bundle-size or tree-shaking guarantee is made. Deno, Bun, Workers and
framework-specific recipes remain unverified until their consumer checks
are retained with exact runtime/tool versions.

## Consumer verification

CI executes a generated web loader in headless Chromium and installs a
local bundler tarball into a fresh npm project. The latter checks both
license texts, compiles a strict TypeScript consumer, and executes parse
and edit calls through the installed module. Node 24.22.2 was verified
locally; its direct WebAssembly import still reports an experimental
feature warning. This does not establish support for every Node release.
