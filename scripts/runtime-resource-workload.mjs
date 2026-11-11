// SPDX-FileCopyrightText: 2026 Noyalib
// SPDX-License-Identifier: MIT OR Apache-2.0

// Shared by Node and browser measurements; no platform-specific imports.
export const fixture = 'port: 8080\n' + Array.from({length: 64}, (_, i) =>
  `key_${i}: ${'abcdefgh'.repeat(16)}\n`).join('');
export const memoryAllowance = 2 * 65536;
export const jsHeapAllowance = 512 * 1024;

export function measureRuntimeResources(api, memory, {injectLeak = false, injectJsLeak = false, collect = () => {}, operationsPerWindow = 64} = {}) {
  if (!(memory instanceof WebAssembly.Memory)) throw Error('WASM linear memory is unavailable');
  const retained = [];
  const retainedValues = [];
  const durations = [];
  const windows = [];
  const exercise = (leak, jsLeak = false) => {
    const document = new api.WasmDocument(fixture);
    try {
      document.setValue('port', 9090);
      if (document.get('port') !== 9090) throw Error('edit did not reach the document');
      const before = document.toString();
      let refused = false;
      try { document.set('port', '['); } catch { refused = true; }
      if (!refused || document.toString() !== before) throw Error('failed edit changed source');
      const parsed = api.parse(before);
      const roundtrip = api.stringify(parsed);
      if (jsLeak) retainedValues.push(parsed);
      if (api.getPath(roundtrip, 'port') !== 9090) throw Error('value round trip changed port');
    } finally {
      if (leak) retained.push(document); else document.free();
    }
  };
  try {
    for (let i = 0; i < 64; i++) exercise(false);
    const baselineHost = collect();
    const baselineHeap = baselineHost?.js_heap_bytes ?? null;
    const baseline = memory.buffer.byteLength;
    for (let window = 0; window < 6; window++) {
      for (let i = 0; i < operationsPerWindow; i++) {
        const start = performance.now();
        exercise(injectLeak, injectJsLeak);
        durations.push(performance.now() - start);
      }
      const host = collect();
      windows.push({window, operations: (window + 1) * operationsPerWindow,
        linear_bytes: memory.buffer.byteLength, js_heap_bytes: host?.js_heap_bytes ?? null,
        rss_after_collection_bytes: host?.rss_bytes ?? null});
    }
    const peak = Math.max(baseline, ...windows.map(row => row.linear_bytes));
    const heapMeasured = Number.isFinite(baselineHeap)
      && windows.every(row => Number.isFinite(row.js_heap_bytes));
    const peakHeap = heapMeasured
      ? Math.max(baselineHeap, ...windows.map(row => row.js_heap_bytes)) : null;
    const ordered = [...durations].sort((a, b) => a - b);
    return {status: peak - baseline <= memoryAllowance
      && heapMeasured && peakHeap - baselineHeap <= jsHeapAllowance ? 'passed' : 'failed',
      measured_utc: new Date().toISOString(),
      warmup_operations: 64, measured_operations: durations.length,
      baseline_linear_bytes: baseline, peak_linear_bytes: peak,
      baseline_js_heap_bytes: baselineHeap, peak_js_heap_bytes: peakHeap,
      js_heap_growth_bytes: peakHeap === null ? null : peakHeap - baselineHeap,
      js_heap_allowance_bytes: jsHeapAllowance,
      growth_bytes: peak - baseline, allowance_bytes: memoryAllowance, windows,
      latency: {unit: 'milliseconds', sample_kind: 'individual operation',
        p50: ordered[Math.floor(ordered.length * 0.5)],
        p95: ordered[Math.ceil(ordered.length * 0.95) - 1], samples: durations}};
  } finally {
    for (const document of retained) document.free();
    retainedValues.length = 0;
  }
}
