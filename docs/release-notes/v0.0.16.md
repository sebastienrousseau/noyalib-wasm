<!-- SPDX-FileCopyrightText: 2026 Noyalib -->
<!-- SPDX-License-Identifier: MIT OR Apache-2.0 -->

# noyalib-wasm v0.0.16 Release Notes

Lockstep release with `noyalib` v0.0.16 (ADR-0005 strict-lockstep: the
WASM bindings publish `=X.Y.Z` pinned to the core). No change to the JS
API surface (`WasmDocument`, `parse`, `stringify`, `validateJson`,
`getPath`, `merge`).

## What changed

- **`noyalib` pin `=0.0.15` → `=0.0.16`** and the crate version bumped
  in lockstep.
- **MSRV raised 1.85.0 → 1.86.0**, matching the single lockstep floor
  adopted in v0.0.16.
- **Release workflow** publish steps made idempotent for clean re-runs.

## Engineering / CI (post-release, no user-facing change)

- Signed-history enforcement, upstream audit imports, and a
  `dependabot-vet` auto-refresh workflow.
- **The `wasm-bindgen-test` suite now runs in CI** (`wasm-pack test
  --node`) — previously the JS binding surface had a test harness but no
  gate. The suite was expanded from 5 to 18 tests, covering every export
  (`WasmDocument::{new, toString, get, getSource, spanAt, setValue, set,
  replaceSpan, commentsAt}` and the free functions `parse`, `stringify`,
  `validateJson`, `getPath`, `merge`) plus their error paths.
- New CI gates: the wasm-test gate above, a coverage gate on the
  pure-Rust core (`src/core.rs`, ~100 %; the `#[wasm_bindgen]` FFI layer
  is gated by wasm-test instead), an MSRV gate, CodeQL, and OpenSSF
  Scorecard.

## What did not change

- The JS/TS API surface and the published npm package shape.
- `#![forbid(unsafe_code)]` — intact.
- WASM bundle size characteristics.

## Upgrading

```bash
npm install @sebastienrousseau/noyalib-wasm@0.0.16
```
