<!-- SPDX-FileCopyrightText: 2026 Noyalib -->
<!-- SPDX-License-Identifier: MIT OR Apache-2.0 -->

# Executed runtime contract

The shared consumer probe exercises 34 checks against actual exports:
all seven advertised entry points, object/null and tag projection, numeric
boundaries, shared references, cycles, UTF-8 spans, refused edits and recovery.
It is shared by the command-line runtime adapter and browser consumer.

## Local executed matrix, 2026-11-11

| Target | Runtime | Executed result |
|---|---|---|
| nodejs | Node 24.22.2 | 34 shared checks pass |
| nodejs | Bun 1.4.4 | 34 shared checks pass |
| deno | Deno 2.9.8 | 34 shared checks pass with package-only file-read permission |
| no-modules | Chromium 158 | 55 combined browser checks pass |
| bundler | Chromium 158 | Shared contract plus installed-package and resource checks |
| web | Chromium | Generated-module consumer; final-source CI is a separate receipt |

These local executions use macOS arm64. Other engines and operating systems
need their own receipts; generated output alone does not prove execution.
The CI definitions repeat the contract for the pinned runtimes on Linux.

## Value and mutation boundaries

Mappings become plain JavaScript objects and YAML null becomes JS null.
`parseJson` removes tags recursively; it does not validate the JSON schema.
NaN and infinity remain JS non-finite numbers. `validateJson` refuses them.

Integer conversion to JS numbers refuses magnitudes beyond
`Number.MAX_SAFE_INTEGER`. This avoids silent rounding. A document's raw
source can still be retained and edited without converting such a value
into a JavaScript number.

`spanAt` and `replaceSpan` use UTF-8 byte offsets. Do not use JavaScript
UTF-16 string indices as byte offsets. Replacements inside a multibyte
character are refused and leave the source unchanged. Cyclic JS values and
malformed replacement fragments are also refused without poisoning the
instance. Shared references that are not cycles remain accepted within
existing depth and element budgets. Explicitly release owned documents.

## Reproduce

```sh
node scripts/check-runtime-contract.mjs pkg-node/noyalib_wasm.js
bun scripts/check-runtime-contract.mjs pkg-node/noyalib_wasm.js
deno run --no-config --allow-read=pkg-deno scripts/check-runtime-contract.mjs pkg-deno/noyalib_wasm.js
node scripts/check-browser-consumer.mjs pkg-no-modules /path/to/chrome --no-modules
```

Build each package with `wasm-pack build --release --target TARGET
--out-dir DIRECTORY -- --locked`. The installed bundler consumer also checks
TypeScript and package contents. Root-family candidate receipts supply the
unpublished core source identity; local overrides do not prove registry
resolution.
