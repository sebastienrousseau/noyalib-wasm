<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

# JavaScript YAML comparison

| Project | YAML 1.2 | Preserves untouched source | Browser-ready | JSON Schema |
| :--- | :---: | :---: | :---: | :---: |
| `noyalib-wasm` | Yes | Yes, through `WasmDocument` | Yes | No |
| `js-yaml` | Configurable | No | Yes | No |
| Native `noyalib` | Yes | Yes | Requires a Rust host | Optional feature |

`noyalib-wasm` prioritizes one parser across browser and native noyalib tools,
plus lossless editing from JavaScript. A JavaScript-only parser can be smaller
when that consistency and source preservation are unnecessary. Validate package
size and runtime support against the current upstream releases before choosing.
