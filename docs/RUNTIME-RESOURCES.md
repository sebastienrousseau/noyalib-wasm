<!-- SPDX-FileCopyrightText: 2026 Noyalib -->
<!-- SPDX-License-Identifier: MIT OR Apache-2.0 -->

# Runtime resource checks

The resource harness runs real optimized exports through Node and an
installed npm tarball bundled for Chromium. It checks a fixed 64-key
fixture through parse, stringify, document construction, successful edits,
failed edits and explicit document release. Generated packages and public
exports are unchanged by the measurement adapter.

After 64 warm-up operations, six measured windows must stay within:

| Resource | Growth allowance after warm-up |
|---|---:|
| WASM linear memory | 131,072 bytes, two memory pages |
| JavaScript heap after forced collection | 524,288 bytes |

Node measures 384 operations; Chromium measures 768. The longer browser
workload makes retained parsed values exceed the same heap allowance even
when its engine shares string storage. All samples must exist and be finite.
Missing heap samples produce a failed result and unknown growth, not zero.
WASM memory never shrinks, so its buffer size retains the high-water mark.
These are scenario bounds, not a claim that arbitrary input fits those sizes.

The fault checks retain actual `WasmDocument` instances or actual parsed
JavaScript values. Both faults must breach the same gate that accepts
normal work. Cleanup releases the retained documents after measurement.
A separate fault drops heap samples to check evidence integrity.

## Run locally

```sh
wasm-pack build --release --target nodejs --out-dir pkg-node -- --locked
node --test scripts/tests/test-runtime-resources.mjs
node --expose-gc scripts/check-runtime-resources.mjs pkg-node normal
```

The browser checks need the prepared bundler package, TypeScript fixture
dependencies and a Chromium executable:

```sh
wasm-pack build --release --target bundler --scope sebastienrousseau -- --locked
python3 scripts/prepare-npm-package.py pkg
npm ci --ignore-scripts --prefix tests/typescript
CHROME_BIN=/path/to/chrome node --test scripts/tests/test-browser-resources.mjs
node scripts/check-installed-consumer.mjs pkg /path/to/chrome --resources
```

The browser measurement uses an isolated profile with explicit garbage
collection and precise heap information enabled. The test bundle observes
its actual WASM memory through a diagnostic export in the consumer entry;
the installed package's exports are untouched. Node captures the real
instance during synchronous wrapper initialization and restores the
constructor immediately. On POSIX, Chromium uses a private process group
so cleanup reaches descendants even if the browser parent exits first.
A successful measurement is credited only when the consumer process also
exits successfully.

JSON reports retain individual-operation p50/p95 times, source and module
identity where available, and every memory window. Node also records host
load and RSS after collection. Timing observations under concurrent host
work are labelled accordingly and do not establish a latency gate.
Registry artifacts and additional engines need separate acceptance runs.
