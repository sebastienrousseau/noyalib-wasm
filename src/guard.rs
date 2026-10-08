// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2026 Noyalib. All rights reserved.

//! Bounds on what reaches the YAML engine through the bindings.
//!
//! Two inputs recurse without a limit further down, and on WebAssembly a
//! stack overflow is not a catchable error: it traps the instance, and
//! every later call into it traps too until the module is
//! re-instantiated.
//!
//! - **JavaScript values** passed to `stringify` and `setValue` are
//!   converted by `serde_wasm_bindgen`, which follows nested arrays,
//!   objects and maps as deep as they go and never returns on a cycle.
//!   [`check_shape`] walks the value first, with a depth limit of
//!   [`MAX_DEPTH`] (cycles are reported as such when they hit it) and a
//!   visit budget of [`MAX_NODES`] for shared references.
//! - **YAML text** given to `set` and `replaceSpan` is re-parsed into a
//!   CST subtree without the document's depth limit. [`check_text`]
//!   parses the text with the depth-limited loader first and refuses it
//!   when it is nested deeper than the loader allows.

use core::fmt;

/// Deepest nesting of arrays, objects and maps accepted from JavaScript;
/// the same limit the YAML parser applies to documents by default.
pub(crate) const MAX_DEPTH: usize = 128;

/// Most values visited in one conversion. A value reached through several
/// references is visited once per reference, as the converter would. Four
/// times the parser's default node budget, so anything the parser would
/// load still converts.
pub(crate) const MAX_NODES: usize = 1_000_000;

/// Why a JavaScript value was refused.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum ShapeError {
    /// The value contains itself.
    Cyclic,
    /// Nested deeper than [`MAX_DEPTH`].
    TooDeep,
    /// More than [`MAX_NODES`] values to convert.
    TooLarge,
}

impl fmt::Display for ShapeError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Cyclic => f.write_str("value is cyclic: it contains itself"),
            Self::TooDeep => write!(f, "value is nested deeper than {MAX_DEPTH} levels"),
            Self::TooLarge => write!(f, "value has more than {MAX_NODES} elements"),
        }
    }
}

/// A value the converter descends into: arrays, objects and maps have
/// children, everything else is a leaf. Implemented for handle types, so
/// `Clone` is a reference copy. The `JsValue` implementation lives with
/// the bindings in `lib.rs`.
pub(crate) trait Node: Sized + Clone {
    /// `Some(children)` for a container, `None` for a leaf.
    fn children(&self) -> Option<Vec<Self>>;
    /// Whether `self` and `other` are the same container.
    fn same(&self, other: &Self) -> bool;
}

/// Walk `root` the way the converter will and refuse it when it is
/// cyclic, deeper than [`MAX_DEPTH`] or larger than [`MAX_NODES`].
pub(crate) fn check_shape<N: Node>(root: &N) -> Result<(), ShapeError> {
    let mut ancestors: Vec<N> = Vec::new();
    let mut budget = MAX_NODES;
    visit(root, &mut ancestors, &mut budget)
}

fn visit<N: Node>(node: &N, ancestors: &mut Vec<N>, budget: &mut usize) -> Result<(), ShapeError> {
    *budget = budget.checked_sub(1).ok_or(ShapeError::TooLarge)?;
    let Some(children) = node.children() else {
        return Ok(());
    };
    if ancestors.len() >= MAX_DEPTH {
        // A cycle never bottoms out, so it always ends up here; only then
        // is it worth comparing against the ancestors.
        return Err(if ancestors.iter().any(|a| a.same(node)) {
            ShapeError::Cyclic
        } else {
            ShapeError::TooDeep
        });
    }
    ancestors.push(node.clone());
    let result = children
        .iter()
        .try_for_each(|c| visit(c, ancestors, budget));
    let _ = ancestors.pop();
    result
}

/// Refuse YAML `text` that is nested deeper than the parser's default
/// limit, before the CST edit path re-parses it without one.
///
/// Text the depth-limited loader accepts is fine. Text it refuses for
/// depth is refused. Text it refuses for another reason may still reach
/// the CST re-parse, so it is held to [`lexical_nesting_bound`], an
/// over-estimate that cannot be fooled by quoting.
///
/// # Errors
///
/// A message for the caller when the text is refused.
pub(crate) fn check_text(text: &str) -> Result<(), String> {
    match noyalib::from_str::<noyalib::Value>(text) {
        Ok(_) => Ok(()),
        Err(e) if is_depth_error(&e) => Err(e.to_string()),
        Err(e) if lexical_nesting_bound(text) > MAX_DEPTH => Err(format!(
            "fragment may nest deeper than {MAX_DEPTH} levels and does not parse on its own: {e}"
        )),
        Err(_) => Ok(()),
    }
}

fn is_depth_error(e: &noyalib::Error) -> bool {
    matches!(e, noyalib::Error::RecursionLimitExceeded { .. })
        || e.to_string().contains("recursion limit")
}

/// An upper bound on how deeply `text` can nest, from its characters
/// alone.
///
/// Every `[` and `{` counts and no bracket is ever subtracted, because a
/// closing bracket may sit inside a quoted scalar and telling quotes from
/// apostrophes takes a full scanner. Block nesting is bounded per line by
/// the open indentation levels plus the compact `- `, `? ` and `: `
/// indicators on that line.
pub(crate) fn lexical_nesting_bound(text: &str) -> usize {
    let flow = text.bytes().filter(|b| matches!(b, b'[' | b'{')).count();
    flow.saturating_add(block_nesting_bound(text))
}

fn block_nesting_bound(text: &str) -> usize {
    let mut levels: Vec<usize> = Vec::new();
    let mut deepest = 0;
    for line in text.lines() {
        let body = line.trim_start_matches(' ');
        if body.is_empty() || body.starts_with('#') {
            continue;
        }
        let indent = line.len() - body.len();
        // A tab is not indentation; keep the open levels rather than
        // guess, which can only over-count.
        if !body.starts_with('\t') {
            while levels.last().is_some_and(|&top| top >= indent) {
                let _ = levels.pop();
            }
        }
        levels.push(indent);
        deepest = deepest.max(levels.len() + compact_indicators(body));
    }
    deepest
}

fn compact_indicators(body: &str) -> usize {
    body.as_bytes()
        .windows(2)
        .filter(|w| matches!(w[0], b'-' | b'?' | b':') && matches!(w[1], b' ' | b'\t'))
        .count()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::RefCell;
    use std::rc::Rc;

    /// A JavaScript-like value graph: leaves, and lists that can share
    /// or contain themselves.
    #[derive(Clone)]
    enum T {
        Leaf,
        List(Rc<RefCell<Vec<T>>>),
    }

    impl T {
        fn list(items: Vec<T>) -> T {
            T::List(Rc::new(RefCell::new(items)))
        }
    }

    impl Node for T {
        fn children(&self) -> Option<Vec<Self>> {
            match self {
                T::Leaf => None,
                T::List(items) => Some(items.borrow().clone()),
            }
        }
        fn same(&self, other: &Self) -> bool {
            matches!((self, other), (T::List(a), T::List(b)) if Rc::ptr_eq(a, b))
        }
    }

    fn nested(levels: usize) -> T {
        (0..levels).fold(T::Leaf, |inner, _| T::list(vec![inner]))
    }

    #[test]
    fn refusals_explain_themselves() {
        assert!(ShapeError::Cyclic.to_string().contains("cyclic"));
        assert!(ShapeError::TooDeep.to_string().contains("128"));
        assert!(ShapeError::TooLarge.to_string().contains("1000000"));
    }

    #[test]
    fn leaves_and_shallow_values_pass() {
        assert_eq!(check_shape(&T::Leaf), Ok(()));
        assert_eq!(
            check_shape(&T::list(vec![T::Leaf, T::list(vec![])])),
            Ok(())
        );
    }

    #[test]
    fn nesting_up_to_the_limit_passes_and_one_more_is_refused() {
        assert_eq!(check_shape(&nested(MAX_DEPTH)), Ok(()));
        assert_eq!(
            check_shape(&nested(MAX_DEPTH + 1)),
            Err(ShapeError::TooDeep)
        );
        assert_eq!(check_shape(&nested(1_000)), Err(ShapeError::TooDeep));
    }

    #[test]
    fn a_value_that_contains_itself_is_cyclic() {
        let root = T::list(vec![T::Leaf]);
        if let T::List(items) = &root {
            items.borrow_mut().push(root.clone());
        }
        assert_eq!(check_shape(&root), Err(ShapeError::Cyclic));
        // Cut the cycle so the test does not leak it.
        if let T::List(items) = &root {
            items.borrow_mut().clear();
        }
    }

    #[test]
    fn shared_references_are_counted_per_visit() {
        // Each level references the next twice: 2^40 visits if expanded.
        let mut v = T::Leaf;
        for _ in 0..40 {
            v = T::list(vec![v.clone(), v]);
        }
        assert_eq!(check_shape(&v), Err(ShapeError::TooLarge));
    }

    fn flow(n: usize) -> String {
        format!("{}{}", "[".repeat(n), "]".repeat(n))
    }

    #[test]
    fn text_within_the_depth_limit_passes() {
        assert_eq!(check_text("a: 1\n"), Ok(()));
        assert_eq!(check_text(&flow(MAX_DEPTH - 1)), Ok(()));
        assert_eq!(check_text("- - - x\n"), Ok(()));
    }

    #[test]
    fn deeply_nested_text_is_refused() {
        assert!(check_text(&flow(MAX_DEPTH + 1)).is_err());
        assert!(check_text(&flow(100_000)).is_err());
        let compact = format!("{}x\n", "- ".repeat(100_000));
        assert!(check_text(&compact).is_err());
    }

    #[test]
    fn deep_text_hidden_behind_an_early_syntax_error_is_refused() {
        // The loader stops at line 2 before it sees the brackets; the CST
        // re-parse would not.
        let text = format!("- a\nb: {}\n", flow(100_000));
        assert!(check_text(&text).is_err());
    }

    #[test]
    fn small_invalid_text_is_left_to_the_core_to_report() {
        assert_eq!(check_text("[unclosed"), Ok(()));
    }

    #[test]
    fn quoted_closing_brackets_do_not_lower_the_bound() {
        let n = 200;
        let text = format!("{}{}", "[\"]\", ".repeat(n), "]".repeat(n));
        assert!(lexical_nesting_bound(&text) >= n);
    }

    #[test]
    fn block_bound_counts_indentation_levels_and_compact_indicators() {
        let stair: String = (0..10).map(|i| format!("{}k:\n", " ".repeat(i))).collect();
        assert!(block_nesting_bound(&stair) >= 10);
        assert!(block_nesting_bound("- - - - x\n") >= 4);
        // Blank lines and comments open nothing.
        assert_eq!(
            block_nesting_bound("a: 1\n\n  # c\n\nb: 2\n"),
            block_nesting_bound("a: 1\nb: 2\n")
        );
    }
}
