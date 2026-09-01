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

### Added

- **CycloneDX SBOM in the release pipeline** (mirrors the core
  repo). Releases now emit a machine-readable CycloneDX 1.5
  `SBOM.cdx.json` — attested (SLSA), sigstore-signed, optionally
  GPG-signed, and attached to the GitHub Release — alongside the
  human-readable `SBOM.txt`, which was never a machine-readable
  SBOM format.

### Fixed

- **A GPG-less release could not publish.** The release asset list
  relied on `nullglob` to drop the `.asc` entries when GPG signing
  is skipped, but `artifacts/SBOM.txt.asc` was a literal path —
  `nullglob` only removes unmatched *patterns* — so
  `gh release create` failed on the missing file for any fork
  without the signing key. The entries are spelled as real globs
  now (mirrors the core repo's fix).

## [v0.0.28] - 2026-08-23

Lockstep release with the `noyalib` core. No changes in this crate; the
version moves so the `=0.0.28` pin resolves.

The core ships two correctness fixes around implicit nulls — inserting
over one appended a duplicate key, and a `:` at end of input was not
read as a value indicator. See the core's `CHANGELOG.md` for detail.

## [v0.0.27] - 2026-08-21

Lockstep release with `noyalib` 0.0.27. No behaviour change in this
crate, but the core carries one worth reading: only a **plain** `<<`
scalar is a merge key now — a quoted `"<<"`, and an alias resolving to
the string `<<`, are ordinary keys. A document relying on either
spelling to merge will stop merging, silently. See the core's
`CHANGELOG.md` for that and for @mathstuf's alias-resolution fix.

### Changed

- `noyalib` dependency pin `=0.0.26` -> `=0.0.27`. This crate carries no
  `cargo-vet` exemption for `noyalib` and none for itself — it satisfies
  the core through a `[[trusted.noyalib]]` publisher entry, so what it
  needed was a refreshed `imports.lock` holding the publisher record for
  a version published minutes earlier.
- Crate version -> 0.0.27.
- Lockfile refreshed against the published core; only `noyalib` moved.

## [v0.0.26] - 2026-08-20

Lockstep release with `noyalib` 0.0.26. No behaviour change in this
crate — see the core's `CHANGELOG.md` for @zoosky's wrapped-flow fix
(#294 / #296): a flow member alone on its line now takes the line with
it, so removing from a collection wrapped one member per line no longer
leaves a whitespace-only line behind.

### Changed

- `noyalib` dependency pin `=0.0.25` -> `=0.0.26`. This crate carries no
  `cargo-vet` exemption for `noyalib`, so there was nothing to move.
- Crate version -> 0.0.26.
- Lockfile refreshed against the published core; only `noyalib` moved.

## [v0.0.25] - 2026-08-20

Lockstep release with `noyalib` 0.0.25. No behaviour change in this
crate — see the core's `CHANGELOG.md` for the four CST editor fixes
contributed by @zoosky (#283, #285, #288, #290), `remove` refusing an
alias-valued entry instead of silently doing nothing, and the
differential-fuzz invariant correction.

### Changed

- `noyalib` dependency pin `=0.0.24` -> `=0.0.25`. This crate carries no
  `cargo-vet` exemption for `noyalib`, so there was nothing to move.
- Crate version -> 0.0.25.
- Lockfile refreshed against the published core; only `noyalib` moved.

## [v0.0.24] - 2026-08-19

Lockstep release with `noyalib` 0.0.24. No behaviour change in this
crate — see the core's `CHANGELOG.md`: `remove` now takes a sole entry's
head comment with it (#280), plus a dependency consolidation.

### Changed

- `noyalib` dependency pin `=0.0.23` -> `=0.0.24`. This crate carries no
  `cargo-vet` exemption for `noyalib`, so there was nothing to move.
- Crate version -> 0.0.24.
- Lockfile refreshed against the published core; only `noyalib` moved.

### Fixed

- Release assets now include the detached `.asc` signatures. The signing
  step produced them and `upload-artifact` carried them, but the
  `gh release create` call named every asset explicitly and omitted
  them, so they never reached the release. noyalib v0.0.24 shipped
  without signatures for this reason; the list is now a `nullglob`
  array, so the entries disappear when signing is skipped rather than
  failing the release.

## [v0.0.23] - 2026-08-16

Lockstep release with `noyalib` 0.0.23. No behaviour change in this
crate — see the core's `CHANGELOG.md` for what 0.0.23 carries: `remove`
extended to flow members and sole entries (closing #221), and
`swap_items` / `move_item` exchanging whole entries so comments travel
with the item they document (#269).

### Changed

- `noyalib` dependency pin `=0.0.22` -> `=0.0.23`. This crate carries no
  `cargo-vet` exemption for `noyalib`, so there was nothing to move
  alongside it.
- Crate version -> 0.0.23.
- Lockfile refreshed against the published core. Only `noyalib` moved —
  no new transitive dependencies, and no broad `cargo update`.

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
