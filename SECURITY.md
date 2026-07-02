# Security Policy

## Supported Versions

| Version | Supported |
|:--------|:---------:|
| 0.0.x   | Yes       |

`noyalib-wasm` follows the [ADR-0005 strict-lockstep versioning
contract](https://github.com/sebastienrousseau/noyalib/blob/main/doc/adr/0005-workspace-split.md).
Every release of this satellite is coordinated with a release of
the parent `noyalib` crate at the same version, published from
[`sebastienrousseau/noyalib`](https://github.com/sebastienrousseau/noyalib).

## Reporting a Vulnerability

Report security vulnerabilities by emailing **sebastian.rousseau@gmail.com**.

Do not open a public issue for security reports.

Include:

- A description of the vulnerability.
- Steps to reproduce.
- Affected versions.
- Any suggested fix (optional).

Expect an initial response within 48 hours. A fix or mitigation
plan will follow within 7 days of confirmation.

Vulnerabilities affecting the underlying `noyalib` YAML engine
should be reported through the same channel; the coordinated
patch will land in both repositories simultaneously.

## Security Design

`noyalib-wasm` inherits every security invariant from the parent
`noyalib` crate:

- `#![forbid(unsafe_code)]` on the Rust side. The one unavoidable
  `unsafe` surface is `wasm-bindgen`'s auto-generated JS bridge,
  which is audited by the wasm-bindgen upstream and not written
  by this crate.
- No C dependencies, no FFI calls outside the wasm-bindgen bridge.
- Every parser DoS guard from `noyalib`'s
  [Parser Hardening section](https://github.com/sebastienrousseau/noyalib/blob/main/SECURITY.md#parser-hardening)
  applies here transparently — this crate calls into the
  library, so `max_depth`, `max_document_length`,
  `max_alias_expansions`, `max_mapping_keys`, and
  `max_sequence_length` all propagate. Untrusted input consumed
  from a browser context should still be routed through
  `ParserConfig::strict()`.

## Supply Chain

- Rust dependencies audited (`cargo-deny` in CI): license
  validation, RustSec advisory checks, source verification.
- All GitHub Actions SHA-pinned. CI itself is composed from
  `sebastienrousseau/noyalib`'s shared reusable workflows,
  pinned by SHA; a hardening pass in the parent repo reaches
  this satellite within 48 hours via Dependabot per the
  [ADR-0005 propagation SLA](https://github.com/sebastienrousseau/noyalib/blob/main/scripts/shared-workflow-propagation-monitor.sh).
- `Cargo.lock` committed for deterministic builds.

## Build Provenance & Artefact Signing

`noyalib-wasm` releases follow the same signing posture as the
parent `noyalib` releases:

1. SLSA Level 3 build provenance via
   `actions/attest-build-provenance`.
2. Keyless sigstore signing (Fulcio + Rekor) on every published
   crate / npm bundle.
3. Software bill of materials (SBOM) attached to each GitHub
   Release.

## Commit Integrity

Every commit on `main` must be signed. CI rejects unsigned pull
request commits via the shared
`shared-verify-signatures.yml` workflow from `noyalib`.
