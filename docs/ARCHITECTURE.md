<!-- SPDX-FileCopyrightText: 2026 Noyalib -->
<!-- SPDX-License-Identifier: MIT OR Apache-2.0 -->

# Architecture

`noyalib-wasm` is a thin `wasm-bindgen` shell over the noyalib library.
The design rule is that everything which can fail in a non-trivial way
lives in pure Rust and is reachable from `cargo test` on the native
target; the JavaScript-facing layer only converts values.

## Two layers

- **`src/core.rs`** holds the logic. Every function takes `&str` or
  native Rust types and returns `Result<T, noyalib::Error>`:
  `parse_yaml_to_value`, `value_to_yaml`, `yaml_round_trip`,
  `validate_yaml_json`, `yaml_get_path`, `merge_yaml`, and the
  `Document` helpers `document_span_at`, `document_get_value`,
  `document_get_source`, and `document_comments_at`. Native unit tests
  pattern-match on the error variants here without any `wasm-bindgen`
  type in scope.
- **`src/lib.rs`** exports the JavaScript surface with `#[wasm_bindgen]`:
  the free functions `parse`, `stringify`, `validateJson`, `getPath`, and
  `merge`, plus `WasmDocument`, the lossless editing handle wrapping
  `noyalib::cst::Document` (`new`, `to_string`, `replace_span`, `get`,
  `get_source`, `span_at`, `set_value`, `set`, `comments_at`). Each
  method is a `JsValue` conversion around one `core` function and
  maps `noyalib::Error` to `JsError`.

## Data flow

JavaScript string in, `core` function, `serde_wasm_bindgen` conversion
out. Values cross the boundary as plain JavaScript objects; documents
stay on the Rust side behind `WasmDocument` so edits keep every
untouched byte, which is the point of the CST.

## Build

`wasm-pack` builds the bundle; the optional `wasm-opt` Cargo feature
enables a build-script post-pass that re-runs Binaryen's `wasm-opt`
on the produced `.wasm`. It pulls in no Rust dependencies and is off
by default so development builds stay fast. The README's bundle-size
section records the measured sizes.

## Testing

`cargo test` covers `core` natively; the `wasm-test` CI job runs the
binding layer under `wasm-bindgen-test`. Two libFuzzer targets in
`fuzz/` exercise `core` with arbitrary input, and CI replays the seed
corpus on every push.

## Lockstep

The crate pins `noyalib` at the identical `=0.0.X` and releases with
it (core ADR-0005). There is no behaviour of its own to version; a
change in the core's parser or emitter is visible here unchanged.
