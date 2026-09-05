<!-- SPDX-FileCopyrightText: 2026 Noyalib -->
<!-- SPDX-License-Identifier: MIT OR Apache-2.0 -->

# Governance

`noyalib-wasm` is one of the six crates of the noyalib family and is governed
with the core. The family-wide model, roles, decision process, and the
path to a broader maintainer team are described once, in the core's
[`GOVERNANCE.md`](https://github.com/sebastienrousseau/noyalib/blob/main/GOVERNANCE.md);
this file records only what is specific to this repository.

## Maintainers

The lead maintainer of the core,
[Sebastien Rousseau](https://github.com/sebastienrousseau), holds merge
rights and the release key here as well. Maintainers are bound by the
same review and CI gates as every contributor.

## Decisions that bind this repository

- **Strict lockstep** (core ADR-0005). This crate releases at the same
  `=0.0.X` as `noyalib` and pins it exactly. A release of the core is
  not complete until this crate ships the matching version, and this
  crate never ships a version the core has not.
- **Architecture decisions** that affect the family are recorded as ADRs
  in the core repository under `docs/adr/`. A decision that only
  concerns this crate is recorded in its `CHANGELOG.md` entry and, when
  it will be questioned later, in a `docs/` note here.
- **Breaking changes** follow the core's stability guarantees: a change
  to what this crate produces is breaking even when no signature moves.

## How changes land

Pull requests against `main`, signed commits, CI green, one review by
a maintainer. Release branches are named `feat/vX.Y.Z` and carry the
version from creation; the tag is cut only when
`scripts/verify-release-versions.sh` passes on every version-bearing
file.
