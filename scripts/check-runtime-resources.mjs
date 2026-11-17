// SPDX-FileCopyrightText: 2026 Noyalib
// SPDX-License-Identifier: MIT OR Apache-2.0

import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname, resolve, join} from 'node:path';
import {loadavg, cpus} from 'node:os';
import {fixture, measureRuntimeResources} from './runtime-resource-workload.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const directory = resolve(process.argv[2] || join(root, 'pkg-node'));
const mode = process.argv[3] || 'normal';
if (!['normal', 'leak', 'js-leak', 'lost-metrics'].includes(mode)) throw Error('mode must be normal, leak, js-leak or lost-metrics');
// Capture the real instance at synchronous wrapper initialization. Keep the
// generated package and its public exports unchanged, including release builds.
const originalInstance = WebAssembly.Instance;
let memory;
let api;
try {
  WebAssembly.Instance = new Proxy(originalInstance, {construct(target, args, newTarget) {
    const instance = Reflect.construct(target, args, newTarget);
    memory = instance.exports.memory;
    return instance;
  }});
  api = createRequire(import.meta.url)(join(directory, 'noyalib_wasm.js'));
} finally { WebAssembly.Instance = originalInstance; }
const bytes = await readFile(join(directory, 'noyalib_wasm_bg.wasm'));
let collections = 0;
const measurement = measureRuntimeResources(api, memory,
  {injectLeak: mode === 'leak', injectJsLeak: mode === 'js-leak', collect: () => {
    if (typeof globalThis.gc !== 'function') throw Error('run Node with --expose-gc for heap measurements');
    globalThis.gc();
    const usage = process.memoryUsage();
    if (mode === 'lost-metrics' && collections++ > 0) return undefined;
    return {js_heap_bytes: usage.heapUsed, rss_bytes: usage.rss};
  }});
const result = {mode, runtime: process.version,
  host_load_average: loadavg(), logical_cpus: cpus().length,
  timing_scope: 'Local observation; concurrent host work is not controlled. No latency gate.',
  platform: process.platform, arch: process.arch,
  source: execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim(),
  dirty: Boolean(execFileSync('git', ['status', '--porcelain'], {cwd: root, encoding: 'utf8'}).trim()),
  source_inputs_clean: !execFileSync('git', ['status', '--porcelain', '--', 'src', 'scripts', 'Cargo.toml', 'Cargo.lock'], {cwd: root, encoding: 'utf8'}).trim(),
  lockfile_sha256: createHash('sha256').update(await readFile(join(root, 'Cargo.lock'))).digest('hex'),
  workload_sha256: createHash('sha256').update(await readFile(new URL('./runtime-resource-workload.mjs', import.meta.url))).digest('hex'),
  module_sha256: createHash('sha256').update(bytes).digest('hex'),
  fixture_sha256: createHash('sha256').update(fixture).digest('hex'),
  fixture_bytes: Buffer.byteLength(fixture), ...measurement};
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.status === 'passed' ? 0 : 1;
