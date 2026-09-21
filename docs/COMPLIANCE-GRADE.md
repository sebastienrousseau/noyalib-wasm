<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

# Repository standard compliance grade

Assessment date: 2026-09-20. Source rubric:
`/Users/seb/Code/REPO-STANDARD.md`. This is a conservative static assessment of
checked-in evidence, not a substitute for successful CI runs.

## Result

**13/24 signals (54%). README template: pass. Strict candidate tier: L1.**

| Category | Signals | Summary |
| :--- | :---: | :--- |
| Identity and README | 2/3 | Canonical structure passes; complete L3 install verification is open |
| Documentation | 2/3 | Manual, architecture, and JavaScript API docs present |
| Build and install UX | 1/3 | Cargo and wasm-pack build paths present |
| Releases and binaries | 2/3 | Registry automation present; complete L3 evidence remains open |
| Packaging | 1/3 | npm distribution present; wider tracking and reproducibility are open |
| CI quality gates | 2/3 | Matrix and coverage signals present |
| Supply chain | 2/3 | Foundation controls present; advisory-audit detection remains open |
| Community | 1/3 | Foundation governance present; L2 template and docs-lint signals are open |

The cumulative tier remains L1. Priority work is CI-verified install snippets,
explicit advisory audit, distribution tracking, reproducible WASM artifacts,
and audit-visible community templates and markdown lint enforcement.
