// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2026 Noyalib. All rights reserved.

//! Path lookups against a document, where both halves are untrusted.
//!
//! A caller typically supplies the YAML *and* the path, and the path is
//! often built from user input (`items[3].name`). Splitting the fuzzer's
//! bytes gives both a chance to be hostile at once — a malformed path
//! against a malformed document is the combination least likely to be
//! covered by hand-written tests.

#![no_main]

use libfuzzer_sys::fuzz_target;
// Aliased: a bare `core` import shadows Rust's own `core` crate,
// which makes `std::str::from_utf8` resolve to the wrong thing.
use noyalib_wasm::core as wasm_core;

fuzz_target!(|data: &[u8]| {
    let Ok(s) = std::str::from_utf8(data) else {
        return;
    };
    let (yaml, path) = match s.split_once('\0') {
        Some((y, p)) => (y, p),
        None => (s, "a.b[0]"),
    };
    let _ = wasm_core::yaml_get_path(yaml, path);
});
