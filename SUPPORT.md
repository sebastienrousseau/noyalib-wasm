<!-- SPDX-FileCopyrightText: 2026 Noyalib -->
<!-- SPDX-License-Identifier: MIT OR Apache-2.0 -->

# Support

Thanks for using `noyalib-wasm`. Here is where to go for each kind of help.

## Questions and how-to

- **[Discussions](https://github.com/sebastienrousseau/noyalib/discussions)**
  are shared by the whole noyalib family. Usage questions, design ideas,
  and show-and-tell go there; answers stay searchable for others.
- **Docs**: [`README.md`](README.md) and
  - [`docs/bundling.md`](docs/bundling.md)
  - [`docs/js-api.md`](docs/js-api.md)
  plus the core library's [User Manual](https://sebastienrousseau.github.io/noyalib/manual/).

## Bugs

Open an issue in this repository with the **Bug report** form. A
minimal, self-contained reproduction (the smallest YAML plus the exact
call or command) is the single most useful thing you can include.
If the behaviour comes from the core parser or serialiser, the issue
belongs in [noyalib](https://github.com/sebastienrousseau/noyalib/issues);
when in doubt, file it here and it will be moved.

## Feature requests

Use the **Feature request** form. For anything touching the public
surface, float it in Discussions or the issue first so the rationale
and alternatives are captured before code is written.

## Security vulnerabilities

**Do not** open a public issue. Follow the private disclosure process
in [`SECURITY.md`](SECURITY.md).

## Versions and compatibility

- `noyalib-wasm` releases in lockstep with the core: every version pins
  `noyalib` at the identical `=0.0.X`, so the two always move together.
  Under Cargo's SemVer rules a `0.x` patch may carry breaking changes;
  pin a specific version and read [`CHANGELOG.md`](CHANGELOG.md) before
  upgrading.
- Minimum supported Rust version: **1.86**, enforced in CI.

## Response expectations

The family is maintained by a small team (currently one person) on a
best-effort basis. There is no paid support tier or response-time SLA.
Clear, reproducible reports get triaged fastest. Please be patient and
kind; see the [Code of Conduct](CODE_OF_CONDUCT.md).
