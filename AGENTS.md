<!-- SPDX-FileCopyrightText: 2026 Noyalib -->
<!-- SPDX-License-Identifier: MIT OR Apache-2.0 -->

# Working on noyalib-wasm with an AI agent

The invariants a contribution must respect, whether typed by a human
or generated with an assistant. `DEVELOPMENT.md` covers the how; this
file covers the rules that are easy for an agent to violate. The core
repository's `AGENTS.md` applies to the family; this one adds what is
specific to a satellite.

## Versioning and lockstep

- This crate releases at the identical `=0.0.X` as `noyalib`, in
  strict lockstep (core ADR-0005), and increments strictly by +0.0.1.
  Never propose a 0.1.0 or 1.0 jump, and never release ahead of the
  core.
- The `noyalib` dependency is an **exact** pin. A release branch
  (`feat/vX.Y.Z`) carries the new version and pin from creation.
- Until the core publishes, the pin cannot resolve from crates.io. The
  branch may carry a `[patch.crates-io]` git source pointing at the
  core's release branch. **Remove it before tagging**:
  `scripts/verify-release-versions.sh` refuses to pass while it is
  present, and cargo-deny is red on the branch for the same reason.
  After removal: `cargo update -p noyalib`, then
  `cargo vet regenerate exemptions` and `cargo vet --locked`.
- At most two version branches exist at once: the release in flight
  and one future branch. Commit or stash everything before any branch
  switch.

## Quality gates

- CI must be green in the same session that turned it red.
- Every behaviour change lands with its test in the same commit.
- Run the local battery before pushing: `cargo fmt --all -- --check`
  (this repo pins rustfmt defaults in `.rustfmt.toml`; a global
  rustfmt config must not leak in), clippy with warnings denied, the
  test suite, `cargo deny check`, `cargo vet --locked`, `reuse lint`,
  codespell, markdownlint.
- Every version-bearing file moves with the version. The gate script is
  the authority; README install snippets are not yet gate-checked here,
  so grep for the previous version after a bump.

## Style

- Conventional commits; commits and tags are signed.
- No generated-with footers, co-author trailers, or session links in
  commits, PRs, or issues.
- No em dashes in drafted prose; public comments are short.
- Claims in docs must be verifiable: a channel, artefact, or number is
  documented only once it exists.

## Off-limits without explicit maintainer direction

- Force pushes, history rewrites, tag deletion or re-tagging.
- Publishing to any registry.
- Changing MSRV, feature flags, or the public surface.
