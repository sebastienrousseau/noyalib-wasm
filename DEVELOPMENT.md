<!-- SPDX-FileCopyrightText: 2026 Noyalib -->
<!-- SPDX-License-Identifier: MIT OR Apache-2.0 -->

# Developing noyalib-wasm

noyalib-wasm is a satellite of the [noyalib](https://github.com/sebastienrousseau/noyalib)
ecosystem: six crates that release in lockstep at the same `=0.0.X`
(ADR-0005), with this crate pinning the core exactly. The full
developer guide — toolchain versions, CI-gate reproduction, testing
philosophy, release mechanics — lives in the core repository's
[DEVELOPMENT.md](https://github.com/sebastienrousseau/noyalib/blob/main/DEVELOPMENT.md);
this file covers only what is specific here.

## Quick start

```bash
git clone https://github.com/sebastienrousseau/noyalib-wasm
cd noyalib-wasm
cargo test
```

MSRV is **Rust 1.86.0**, identical across the family and CI-enforced.

## Developing against an unpublished core

Between lockstep releases the `=0.0.X` pin can point at a core
version crates.io does not have yet. Develop against a local checkout:

```bash
cargo test --config 'patch.crates-io.noyalib.path="../noyalib/crates/noyalib"'
```

## CI

`.github/workflows/ci.yml` consumes the core repository's
`shared-*.yml` workflows, pinned by SHA. Every gate reproduces
locally with the commands in the core DEVELOPMENT.md; the
version-bearing files are checked by
`scripts/verify-release-versions.sh vX.Y.Z`.

## House rules

- CI green in the same session that turned it red.
- Signed commits; releases are signed tags.
- Version bumps are strictly +0.0.1, in lockstep with the family.
