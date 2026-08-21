// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2026 Noyalib. All rights reserved.

//! The pure-Rust half of the WASM bindings.
//!
//! These functions run in a browser or a Worker on YAML the page did not
//! write — a pasted config, a fetched manifest, a user upload. In a WASM
//! sandbox a panic aborts the module instance, so the invariant is the
//! same as everywhere else on a trust boundary: return, do not abort.
//!
//! `core` is fuzzed rather than the `wasm_bindgen` shells because the
//! shells are JsValue conversion and cannot be driven without a JS
//! runtime; the logic under them is all here.

#![no_main]

use libfuzzer_sys::fuzz_target;
// Aliased: a bare `core` import shadows Rust's own `core` crate,
// which makes `std::str::from_utf8` resolve to the wrong thing.
use noyalib_wasm::core as wasm_core;

fuzz_target!(|data: &[u8]| {
    let Ok(yaml) = std::str::from_utf8(data) else {
        return;
    };
    let _ = wasm_core::parse_yaml_to_value(yaml);
    let _ = wasm_core::yaml_round_trip(yaml);
    let _ = wasm_core::validate_yaml_json(yaml);
    // Merging a document with itself exercises the merge path without
    // needing a second input, and is the shape a "defaults + overrides"
    // caller actually hits.
    let _ = wasm_core::merge_yaml(yaml, yaml);
});
