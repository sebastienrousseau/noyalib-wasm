// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2026 Noyalib. All rights reserved.

use noyalib_wasm::*;
use wasm_bindgen::JsValue;
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

// ── Remaining WasmDocument methods ───────────────────────────────────

#[wasm_bindgen_test]
fn test_new_rejects_invalid_yaml() {
    // The constructor surfaces a parse failure as a JsError.
    assert!(WasmDocument::new("a: [unterminated\n").is_err());
}

#[wasm_bindgen_test]
fn test_get_missing_path_is_null() {
    let doc = WasmDocument::new("name: noyalib\n").unwrap();
    assert!(doc.get("nope").unwrap().is_null());
}

#[wasm_bindgen_test]
fn test_get_source_missing_path_is_null() {
    let doc = WasmDocument::new("name: noyalib\n").unwrap();
    assert!(doc.get_source("nope").is_null());
}

#[wasm_bindgen_test]
fn test_span_at_returns_range_and_null() {
    let doc = WasmDocument::new("name: noyalib\n").unwrap();
    // Present path → a `{ start, end }` object (non-null).
    assert!(!doc.span_at("name").unwrap().is_null());
    // Missing path → null.
    assert!(doc.span_at("missing").unwrap().is_null());
}

#[wasm_bindgen_test]
fn test_set_value_via_js_value() {
    // Build the replacement JsValue by round-tripping through `parse`
    // (avoids depending on serde_wasm_bindgen directly in the test).
    let mut doc = WasmDocument::new("version: 1\n").unwrap();
    let two = parse("2").unwrap();
    doc.set_value("version", two).unwrap();
    assert_eq!(doc.get("version").unwrap().as_f64(), Some(2.0));
}

#[wasm_bindgen_test]
fn test_comments_at_returns_before_and_inline() {
    let yaml = "# leading\nport: 8080 # inline\n";
    let doc = WasmDocument::new(yaml).unwrap();
    // The bundle is a JS object; non-null is the contract we assert
    // here (shape detail is covered natively in the core tests).
    assert!(!doc.comments_at("port").unwrap().is_null());
}

// ── Free functions (legacy / simple API) ─────────────────────────────

#[wasm_bindgen_test]
fn test_parse_then_stringify_round_trips() {
    let value = parse("name: noyalib\nport: 8080\n").unwrap();
    assert!(!value.is_null());
    let back = stringify(value).unwrap();
    // Structure survives the Value round-trip (comments do not, by
    // design — this is the lossy JS-object path).
    assert!(back.contains("name: noyalib"));
    assert!(back.contains("port: 8080"));
}

#[wasm_bindgen_test]
fn test_stringify_null_value() {
    // `serde_wasm_bindgen` maps JS null/undefined onto Value::Null, so
    // stringify succeeds and emits the YAML null token.
    let out = stringify(wasm_bindgen::JsValue::NULL).unwrap();
    assert!(out.contains("null"), "got: {out:?}");
}

#[wasm_bindgen_test]
fn test_validate_json_true_and_error() {
    assert!(validate_json("a: 1\nb: two\n").unwrap());
    // Unparseable input surfaces an error rather than `false`.
    assert!(validate_json("a: [unterminated\n").is_err());
}

#[wasm_bindgen_test]
fn test_get_path_present_and_missing() {
    let present = get_path("server:\n  port: 8080\n", "server.port").unwrap();
    assert_eq!(present.as_f64(), Some(8080.0));
    let missing = get_path("server:\n  port: 8080\n", "server.host").unwrap();
    assert!(missing.is_null());
}

#[wasm_bindgen_test]
fn test_get_path_invalid_yaml_errors() {
    assert!(get_path("a: [unterminated\n", "a").is_err());
}

#[wasm_bindgen_test]
fn test_merge_overlays_documents() {
    let merged = merge("a: 1\nb: 2\n", "b: 20\nc: 30\n").unwrap();
    // Override wins on `b`; new key `c` is added; `a` is preserved.
    assert!(merged.contains("b: 20"));
    assert!(merged.contains("c: 30"));
    assert!(merged.contains("a: 1"));
}

#[wasm_bindgen_test]
fn test_merge_invalid_input_errors() {
    assert!(merge("a: [bad\n", "b: 2\n").is_err());
}

#[wasm_bindgen_test]
fn parse_keeps_null_values_as_null() {
    // `undefined` would make JSON.stringify drop the key; `null` survives.
    let v = parse("a: ~\nb: null\nc: 1\n").unwrap();
    for key in ["a", "b"] {
        let got = js_sys::Reflect::get(&v, &JsValue::from_str(key)).unwrap();
        assert!(got.is_null(), "{key} must be JS null, got {got:?}");
    }
    let json = js_sys::JSON::stringify(&v).unwrap();
    assert_eq!(String::from(json), r#"{"a":null,"b":null,"c":1}"#);
}

#[wasm_bindgen_test]
fn parse_json_strips_tags_and_keeps_nulls() {
    let v = parse_json("a: !!str 1\nb: !local [!!int 2]\nc: ~\n").unwrap();
    let json = js_sys::JSON::stringify(&v).unwrap();
    assert_eq!(String::from(json), r#"{"a":"1","b":[2],"c":null}"#);
}
