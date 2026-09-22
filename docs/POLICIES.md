<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

# Engineering policies

## Version and dependency policy

`noyalib-wasm` releases in strict lockstep with `noyalib`. Version 0.0.52 pins
the core at exactly `=0.0.52`. Release work uses `feat/v0.0.52`; each subsequent
iteration increments exactly 0.0.1.

## Minimum Rust version

The minimum supported Rust version is 1.86.0, declared in the manifest and
verified by CI. A floor increase is a breaking-axis change and requires a
changelog entry.

## Compatibility

Exported JavaScript names, argument and return shapes, error behaviour, npm
package layout, and lossless edit guarantees are public. Generated wasm-bindgen
output is never edited directly. During `0.0.x`, the patch component is the
breaking axis.

Family-wide policies live in the core
[`POLICIES.md`](https://github.com/sebastienrousseau/noyalib/blob/main/docs/POLICIES.md).
