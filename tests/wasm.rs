// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2026 Noyalib. All rights reserved.

use noyalib_wasm::*;
use wasm_bindgen_test::*;

#[wasm_bindgen_test]
fn test_wasm_document_parse_to_string() {
    let yaml = "name: noyalib\nversion: 1\n";
    let doc = WasmDocument::new(yaml).unwrap();
    assert_eq!(doc.to_string(), yaml);
}

#[wasm_bindgen_test]
fn test_wasm_document_get() {
    let yaml = "name: noyalib\nversion: 1\n";
    let doc = WasmDocument::new(yaml).unwrap();
    let name = doc.get("name").unwrap();
    assert_eq!(name.as_string().unwrap(), "noyalib");
}

#[wasm_bindgen_test]
fn test_wasm_document_get_source() {
    let yaml = "name: noyalib # comment\nversion: 1\n";
    let doc = WasmDocument::new(yaml).unwrap();
    let name_source = doc.get_source("name");
    assert_eq!(name_source.as_string().unwrap(), "noyalib");
}

#[wasm_bindgen_test]
fn test_wasm_document_set() {
    let yaml = "name: noyalib\nversion: 1\n";
    let mut doc = WasmDocument::new(yaml).unwrap();
    doc.set("version", "2").unwrap();
    assert_eq!(doc.to_string(), "name: noyalib\nversion: 2\n");
}

#[wasm_bindgen_test]
fn test_wasm_document_replace_span() {
    let yaml = "name: noyalib\nversion: 1\n";
    let mut doc = WasmDocument::new(yaml).unwrap();
    // Replace "noyalib" with "fast-yaml"
    // "name: ".len() = 6
    doc.replace_span(6, 13, "fast-yaml").unwrap();
    assert_eq!(doc.to_string(), "name: fast-yaml\nversion: 1\n");
}
