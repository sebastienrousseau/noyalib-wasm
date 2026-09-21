<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

# Benchmarks

Build the Node target and run the JavaScript harness so the measurement includes
the actual JavaScript-to-WebAssembly boundary:

```bash
wasm-pack build --release --target nodejs
node benches/bench.js
```

Record the CPU, operating system, runtime version, Rust version, commit, input
size, bundle mode, and command. Measure raw and compressed bundle sizes from the
same generated package. CI verifies that the harness and targets work, but does
not enforce shared-runner timing thresholds.
