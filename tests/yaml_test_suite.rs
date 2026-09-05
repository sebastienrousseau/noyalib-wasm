//! Official yaml-test-suite conformance for this crate's entry point.
//!
//! The core passes all 406 cases vendored at
//! `crates/noyalib/tests/yaml-test-suite`; this test drives the same
//! cases through THIS crate so its surface cannot drift from the
//! core. The suite directory comes from `NOYALIB_SUITE_DIR` (set by
//! the family's shared `yaml-test-suite` workflow); locally it falls
//! back to a sibling core checkout; without either it skips (the
//! shared workflow always sets the variable, so the gate cannot skip).

#![allow(clippy::unwrap_used, clippy::expect_used)]

use std::path::PathBuf;

struct Case {
    id: String,
    yaml: String,
    json: Option<String>,
    fail: bool,
}

/// Mirrors the core's `decode_test_suite_markers` (tests/official_suite.rs).
fn decode_markers(input: &str) -> String {
    let mut out = String::new();
    let mut chars = input.chars().peekable();
    while let Some(c) = chars.next() {
        match c {
            '␣' => out.push(' '),
            '⇥' => out.push('\t'),
            '↵' => {
                out.push('\n');
                if chars.peek() == Some(&'\n') {
                    let _ = chars.next();
                }
            }
            '↓' => out.push('\r'),
            '⇔' => out.push('\u{feff}'),
            '∎' => {
                while let Some(&next) = chars.peek() {
                    let _ = chars.next();
                    if next == '\n' {
                        break;
                    }
                }
            }
            '—' => {
                let mut count = 1;
                while chars.peek() == Some(&'—') {
                    let _ = chars.next();
                    count += 1;
                }
                if chars.peek() == Some(&'»') {
                    let _ = chars.next();
                    out.push('\t');
                } else {
                    out.extend(std::iter::repeat_n('—', count));
                }
            }
            '»' => out.push('\t'),
            other => out.push(other),
        }
    }
    out
}

fn suite_dir() -> Option<PathBuf> {
    if let Ok(dir) = std::env::var("NOYALIB_SUITE_DIR") {
        return Some(PathBuf::from(dir));
    }
    let sibling = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../noyalib/crates/noyalib/tests/yaml-test-suite");
    if sibling.is_dir() {
        return Some(sibling);
    }
    // Only the family's shared `yaml-test-suite` workflow provides the
    // suite; every other CI job (test matrix, coverage, MSRV) runs the
    // whole test binary without it and must not fail here. The gate
    // itself cannot skip: when NOYALIB_SUITE_DIR is set, `load_cases`
    // panics on a missing or short suite.
    eprintln!("yaml-test-suite: no suite directory found, skipping (set NOYALIB_SUITE_DIR)");
    None
}

fn load_cases(dir: &PathBuf) -> Vec<Case> {
    let mut cases = Vec::new();
    let mut files: Vec<PathBuf> = std::fs::read_dir(dir)
        .expect("suite directory")
        .map(|e| e.unwrap().path())
        .filter(|p| p.extension().is_some_and(|e| e == "yaml"))
        .collect();
    files.sort();
    for path in files {
        let stem = path.file_stem().unwrap().to_str().unwrap().to_string();
        let text = std::fs::read_to_string(&path).unwrap();
        let docs = noyalib::load_all_as::<noyalib::Value>(&text).expect("suite wrapper parses");
        let mut n = 0;
        for doc in docs {
            let Some(items) = doc.as_sequence() else {
                continue;
            };
            for item in items {
                let Some(m) = item.as_mapping() else { continue };
                let Some(yaml) = m.get("yaml").and_then(|v| v.as_str()) else {
                    continue;
                };
                let id = if n == 0 {
                    stem.clone()
                } else {
                    format!("{stem}:{n}")
                };
                n += 1;
                cases.push(Case {
                    id,
                    yaml: decode_markers(yaml),
                    json: m.get("json").and_then(|v| v.as_str()).map(str::to_string),
                    fail: m.get("fail").and_then(|v| v.as_bool()).unwrap_or(false),
                });
            }
        }
    }
    assert!(
        cases.len() >= 400,
        "expected the full suite, found {} cases",
        cases.len()
    );
    cases
}

/// Expected JSON documents of a case (the suite stores a JSON stream).
#[allow(dead_code)]
fn expected_docs(case: &Case) -> Option<Vec<serde_json::Value>> {
    let text = case.json.as_deref()?;
    let docs: Vec<serde_json::Value> = serde_json::Deserializer::from_str(text)
        .into_iter::<serde_json::Value>()
        .map(|d| d.unwrap_or(serde_json::Value::Null))
        .collect();
    Some(docs)
}

/// Structural equality that ignores key order and integer/float spelling.
#[allow(dead_code)]
fn json_eq(a: &serde_json::Value, b: &serde_json::Value) -> bool {
    use serde_json::Value as J;
    match (a, b) {
        (J::Number(x), J::Number(y)) => match (x.as_f64(), y.as_f64()) {
            (Some(p), Some(q)) => (p - q).abs() <= f64::EPSILON * p.abs().max(q.abs()).max(1.0),
            _ => x == y,
        },
        (J::Array(x), J::Array(y)) => {
            x.len() == y.len() && x.iter().zip(y).all(|(p, q)| json_eq(p, q))
        }
        (J::Object(x), J::Object(y)) => {
            x.len() == y.len()
                && x.iter()
                    .all(|(k, v)| y.get(k).is_some_and(|w| json_eq(v, w)))
        }
        _ => a == b,
    }
}

#[allow(dead_code)]
fn to_json(v: &noyalib::Value) -> serde_json::Value {
    serde_json::to_value(v.clone().untag()).expect("Value serialises to JSON")
}

#[test]
fn json_model_agrees_with_the_suite_on_every_single_document_case() {
    let Some(dir) = suite_dir() else { return };
    let cases = load_cases(&dir);
    let (mut passed, mut multi) = (0usize, 0usize);
    let mut failures = Vec::new();
    for case in &cases {
        let expected = expected_docs(case);
        let is_multi = expected.as_ref().is_some_and(|d| d.len() != 1);
        match noyalib_wasm::core::parse_yaml_to_json_model(&case.yaml) {
            Ok(_) if case.fail => failures.push(format!("{}: accepted invalid input", case.id)),
            Ok(_) if is_multi => multi += 1,
            Ok(v) => match expected.as_deref().and_then(<[_]>::first) {
                Some(exp) if !json_eq(&serde_json::to_value(&v).unwrap(), exp) => {
                    failures.push(format!(
                        "{}: {} != {exp}",
                        case.id,
                        serde_json::to_value(&v).unwrap()
                    ));
                }
                _ => passed += 1,
            },
            Err(_) if case.fail => passed += 1,
            Err(e) if is_multi || e.to_string().contains("more than one document") => multi += 1,
            Err(e) => failures.push(format!("{}: {e}", case.id)),
        }
    }
    eprintln!(
        "yaml-test-suite (wasm json model): {passed} passed, {} failed, {multi} multi-document (parse() is single-document)",
        failures.len()
    );
    assert!(failures.is_empty(), "{failures:#?}");
}
