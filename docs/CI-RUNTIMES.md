<!-- SPDX-FileCopyrightText: 2026 Noyalib -->
<!-- SPDX-License-Identifier: MIT OR Apache-2.0 -->

# Runtime installer inputs

The runtime matrix pins tested tool versions and immutable official action
commits. These are CI bootstrap tools, not runtime dependencies of the crate
or npm package.

| Installer source | Commit | Runtime input |
|---|---|---|
| [Deno](https://github.com/denoland/setup-deno/tree/22d081ff2d3a40755e97629de92e3bcbfa7cf2ed) | `22d081ff2d3a40755e97629de92e3bcbfa7cf2ed` | 2.9.8 |
| [Bun](https://github.com/oven-sh/setup-bun/tree/0c5077e51419868618aeaa5fe8019c62421857d6) | `0c5077e51419868618aeaa5fe8019c62421857d6` | 1.4.4 |

The first-party source review checked version resolution, official download
hosts, extraction, PATH changes, registry configuration and cache/post steps.
Exact versions avoid floating range selection. Deno's module cache is
disabled; Bun's action cache is disabled and no registry credentials are
provided. Bun receives no GitHub token. Empty registry inputs leave project
configuration unchanged. The candidate jobs retain read-only permissions
and refuse tracked source or lock changes after execution.

Binary installation still trusts the official release hosts and existing
tool-cache bootstrap. This review does not certify every bundled third-party
library or replace independent security review. Retain installer provenance
and resource/contract reports when the runtime matrix changes.
