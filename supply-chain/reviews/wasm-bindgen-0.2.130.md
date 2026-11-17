<!-- SPDX-FileCopyrightText: 2026 Noyalib -->
<!-- SPDX-License-Identifier: MIT OR Apache-2.0 -->

# WASM binding delta review, 2026-11-11

Dependabot [#123](https://github.com/sebastienrousseau/noyalib-wasm/pull/123)
updates the test harness and its exact runtime binding family. Both tracked
Cargo locks resolve wasm-bindgen 0.2.130 and js-sys 0.3.107.

Cargo verified the registry archive checksums below. The published crate
archives identify upstream commit `c93b8ae848d4d9e6beaeaf9516e18a7cadd818a2`.
Every changed Rust file was inventoried; runtime ABI and macro changes were
reviewed as source deltas. Four packages have byte-identical Rust sources.
No changed build scripts, shell scripts or JavaScript assets were found.

| Crate | Delta | Registry SHA-256 |
|---|---|---|
| wasm-bindgen | 0.2.129 to 0.2.130 | `a0181c14ddd6c7b8b0b0132a5f1ea2f32be0d893cd3ea97b6e3b28886b8a3d1c` |
| wasm-bindgen-macro | 0.2.129 to 0.2.130 | `6e931a02a39abdbf66966fc35902b5ed58344750a70885bed4ebb3d8eaf28ed9` |
| wasm-bindgen-macro-support | 0.2.129 to 0.2.130 | `2ca4b54280e455bd831e33a6b8e734baf432fe63fbc35c42ac14ce67a043a53a` |
| wasm-bindgen-shared | 0.2.129 to 0.2.130 | `3b1f9c3798725016c6ee5f2f57869ec0831e8bbc0ab0310a86e787e97f41389e` |
| wasm-bindgen-futures | 0.4.79 to 0.4.80 | `5e14e0327cb5368ad60ccb22d04a9827a693c95a926d8d125e9fa39e0baec501` |
| wasm-bindgen-test | 0.3.79 to 0.3.80 | `5b4913c0ade07e01ab574b20d2741538f070efa12cb7a1a1e2d5df6ea41cf522` |
| wasm-bindgen-test-macro | 0.3.79 to 0.3.80 | `238071aa4c5b268e57d21018621a2e2403c29dd11c55dbdf790ed47fdb9241c0` |
| wasm-bindgen-test-shared | 0.2.129 to 0.2.130 | `9ab365ce29ba0232367502b2894556ae77a9c214d33dbf453fdba7f586905918` |
| js-sys | 0.3.106 to 0.3.107 | `8dc09d2154098bbf4ef54eab6b117a3c24cbbffe94046b16ee6d6d4510584d3a` |

## Review scope

- **wasm-bindgen**: Reviewed lifetime-preserving ErasableGeneric representations, fallible argument conversion and reverse cleanup, Rc ownership and borrow helpers, fixed externref slots, nullable ABI sentinels and encoded sequence ownership. No changed build scripts. Node and Rust 1.89 wasm32 checks passed.
- **wasm-bindgen-macro**: Rust sources are byte-identical; manifest advances the exact macro-support pin. No changed executable assets.
- **wasm-bindgen-macro-support**: Reviewed argument cleanup before JS throws, deferred async rejection, nullable and sequence code generation, module-qualified descriptor symbols, attribute conflict handling and lifetime bounds. No new dependencies or changed build scripts.
- **wasm-bindgen-shared**: Reviewed schema 0.2.130, module path encoding and FNV descriptor hash, sequence-mode and nullable tags. Requires matching CLI; no ambient capabilities.
- **wasm-bindgen-futures**: Rust sources are byte-identical; exact wasm-bindgen and js-sys pins advance together. No changed executable assets.
- **wasm-bindgen-test**: Reviewed removal of async-trait in favor of async trait methods and an impl Routine parameter. Test runtime behavior exercised by 31 passing Node tests.
- **wasm-bindgen-test-macro**: Rust sources are byte-identical; only release metadata and exact dependency pins change. No changed executable assets.
- **wasm-bindgen-test-shared**: Rust sources are byte-identical; only release metadata changes. No changed executable assets.
- **js-sys**: Reviewed JS declarations, generic Promise rejection typing and futures propagation, target-width JSPI tokens and atomics indices, nullable returns, and Temporal changes gated behind temporal plus unstable cfg. No new default feature or changed build script. Node and Rust 1.89 wasm32 checks passed.

The dependency floor remains Rust 1.81. The project remains on Rust 1.89.
The new Temporal feature is opt-in and also requires the existing unstable
cfg. The existing `unsafe-eval` default is unchanged. `async-trait` and
`once_cell` leave this binding graph. No exemption or publisher trust was
expanded to accept the update.

## Validation and limits

The 31 wasm-bindgen Node tests pass, including the UTF-8 root-edit regression.
Rust 1.89 checks the actual `wasm32-unknown-unknown` library successfully.
The local MSRV run selected the installed macOS 26.5 SDK because the old
linker could not parse the newer 27.2 SDK stub format.

The shared schema changes from 0.2.128 to 0.2.130. Generated packages must
use the matching wasm-bindgen CLI; wasm-pack selected that version in the
Node test. The optimized bundler package passes actual npm installation, TypeScript
7.0.2, Node 24.22.2 and Chromium execution. Its WASM module is 615,695 raw
bytes and 213,419 bytes with gzip level 9, within the unchanged limits of
628,759 and 219,025 bytes. This is a source delta review, not an independent audit
or a proof of every optional upstream API.
