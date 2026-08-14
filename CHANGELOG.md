<!-- SPDX-FileCopyrightText: 2026 Noyalib -->
<!-- SPDX-License-Identifier: MIT OR Apache-2.0 -->

# Changelog

All notable changes to `noyalib-wasm` are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
and versions in lockstep with the
[`noyalib`](https://github.com/sebastienrousseau/noyalib) core crate —
see that repository's `CHANGELOG.md` for the release-wide notes.

## [Unreleased]

## [v0.0.22] - 2026-08-13

Lockstep release with `noyalib` 0.0.22. No behaviour change in the JS
bindings — see the core's `CHANGELOG.md` for what 0.0.22 carries
(CRLF-aware CST splices, #261). Documents edited through this package now
keep their own line-ending convention, which is the change most visible to
browser and Node callers on Windows-authored YAML.

**On the version jump.** The published sequence for this crate goes
`0.0.18 → 0.0.22`. `0.0.19` was prepared on a release branch but never
tagged or published; `0.0.20` and `0.0.21` were core-only releases that
the satellites did not follow. Lockstep resumes here.

### Changed

- `noyalib` dependency pin `=0.0.18` → `=0.0.22`.
- Crate version → 0.0.22.

### Security

- Dropped the stale `RUSTSEC-2026-0173` ignore from `deny.toml`.
  `cargo-deny` reported it as `advisory-not-detected`: `proc-macro-error2`
  is not in this crate's graph on any platform, because it reaches
  `noyalib` only through the optional `validator` feature, which this
  crate does not enable. A stale ignore is not inert — it would have
  silently swallowed the advisory if a `validator`-enabled path were added
  later.

  Unlike the other satellites there was no `cargo-vet` exemption for
  `noyalib` to move here; this crate carries none.

---

## Earlier releases

This file starts at `v0.0.22`. `noyalib-wasm` split out of the `noyalib`
monorepo at **v0.0.12** ([ADR-0005](https://github.com/sebastienrousseau/noyalib/blob/main/doc/adr/0005-workspace-split.md))
and released `v0.0.12` through `v0.0.18` without a crate-local changelog.
Those releases are documented in:

- the core's [`CHANGELOG.md`](https://github.com/sebastienrousseau/noyalib/blob/main/CHANGELOG.md),
  which carries the release-wide notes for every lockstep version, and
- this repository's [releases](https://github.com/sebastienrousseau/noyalib-wasm/releases)
  and tags.

They are deliberately not backfilled here rather than reconstructed after
the fact.
