// SPDX-FileCopyrightText: 2026 Noyalib
// SPDX-License-Identifier: MIT OR Apache-2.0

// Execute generated web-target exports in a fresh headless Chromium profile.
// Usage: node scripts/check-browser-consumer.mjs pkg-web /path/to/chrome
// Add --bundler for a web bundle whose WASM module is initialized on import.
import assert from 'node:assert/strict';
import { trackBrowserShutdown } from './browser-shutdown.mjs';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join, extname, sep } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const packageRoot = resolve(process.argv[2] || 'pkg-web');
const browser = process.argv[3] || process.env.CHROME_BIN || 'google-chrome';
const classicTarget = process.argv.includes('--no-modules');
const sourceTarget = !process.argv.includes('--bundler');
const resourceMode = process.argv.includes('--resources');
const injectLeak = process.argv.includes('--inject-leak');
const injectJsLeak = process.argv.includes('--inject-js-leak');
const profile = await mkdtemp(join(tmpdir(), 'noyalib-browser-check-'));
const page = `<!doctype html><meta charset="utf-8"><body>${classicTarget ? '<script src="/noyalib_wasm.js"></script>' : ''}<script type="module">
let resources;
try {
  const w = ${classicTarget ? 'wasm_bindgen' : "await import('/noyalib_wasm.js')"};
  if (${classicTarget}) await w();
  else if (${sourceTarget}) await w.default();
  let checks = 0;
  function check(value, message) { if (!value) throw Error(message); checks++; }
  for (const name of ['parse', 'parseJson', 'stringify', 'validateJson', 'getPath', 'merge', 'WasmDocument']) {
    check(typeof w[name] === 'function', 'missing export ' + name);
  }
  const value = w.parse('name: browser\\nmissing: null\\n');
  check(value.name === 'browser' && value.missing === null, 'JS value/null shape');
  check(w.getPath('a: 2\\n', 'a') === 2, 'getPath');
  const projection = w.parseJson('a: !!str 1\\nb: !local [!!int 2]\\nc: ~\\n');
  check(projection.a === '1' && projection.b[0] === 2 && projection.c === null, 'JSON tag projection');
  check(w.validateJson('a: 1\\n') === true, 'JSON compatibility');
  check(w.parse(w.stringify({port: 8080})).port === 8080, 'stringify round trip');
  check(w.parse(w.merge('a: 1\\n', 'b: 2\\n')).b === 2, 'merge');
  const source = '# keep\\nname: 🚀\\nport: 8080 # inline\\n';
  const doc = new w.WasmDocument(source);
  try {
    check(doc.toString() === source, 'lossless construction');
    check(doc.getSource('name') === '🚀', 'raw Unicode source');
    const span = doc.spanAt('name');
    const raw = new TextDecoder().decode(new TextEncoder().encode(source).slice(span.start, span.end));
    check(raw === '🚀', 'UTF-8 byte spans');
    doc.set('port', '9090');
    check(doc.get('port') === 9090 && doc.toString().includes('# inline'), 'targeted edit/comments');
    const before = doc.toString();
    let refused = false;
    try { doc.set('port', '['); } catch (error) { refused = error instanceof Error; }
    check(refused && doc.toString() === before, 'failed edit leaves bytes unchanged');
    let accessed = false;
    const tooWide = new Array(1000001);
    Object.defineProperty(tooWide, '0', {get() { accessed = true; return 1; }});
    refused = false;
    try { w.stringify(tooWide); } catch (error) { refused = error instanceof Error; }
    check(refused && !accessed, 'oversized array rejected before expansion');
    const cycle = {}; cycle.self = cycle;
    refused = false;
    try { doc.setValue('port', cycle); } catch (error) { refused = error instanceof Error; }
    check(refused && doc.toString() === before, 'cycle rejection is atomic');
    check(w.parse('still: usable\\n').still === 'usable', 'instance survives refusals');
  } finally { doc.free(); }
  const {checkRuntimeContract} = await import('/__runtime-contract-workload.mjs');
  checks += checkRuntimeContract(w);
  if (${resourceMode}) {
    const {measureRuntimeResources} = await import('/__runtime-resource-workload.mjs');
    resources = measureRuntimeResources(w, w.__resourceMemory,
      {injectLeak: ${injectLeak}, injectJsLeak: ${injectJsLeak}, operationsPerWindow: 128,
        collect: () => {
          if (typeof globalThis.gc !== 'function' || !performance.memory)
            throw Error('browser heap measurements are unavailable');
          globalThis.gc();
          return {js_heap_bytes: performance.memory.usedJSHeapSize};
        }});
    check(resources.status === 'passed', 'linear-memory growth budget');
  }
  document.body.dataset.result = JSON.stringify({status: 'passed', checks,
    browser: navigator.userAgent, runtime_resources: resources});
} catch (error) {
  document.body.dataset.result = JSON.stringify({status: 'failed', error: String(error.stack || error), runtime_resources: resources});
}
</script>`;
const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (pathname === '/') {
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.end(page);
      return;
    }
    if (pathname === '/__runtime-contract-workload.mjs') {
      response.setHeader('Content-Type', 'text/javascript');
      response.end(await readFile(new URL('./runtime-contract-workload.mjs', import.meta.url)));
      return;
    }
    if (resourceMode && pathname === '/__runtime-resource-workload.mjs') {
      response.setHeader('Content-Type', 'text/javascript');
      response.end(await readFile(new URL('./runtime-resource-workload.mjs', import.meta.url)));
      return;
    }
    const file = resolve(packageRoot, '.' + decodeURIComponent(pathname));
    if (!file.startsWith(packageRoot + sep)) { response.writeHead(403).end(); return; }
    response.setHeader('Content-Type', extname(file) === '.wasm' ? 'application/wasm' : 'text/javascript');
    response.end(await readFile(file));
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/`;
let child;
let stopBrowser;
let socket;
let stderr = '';
let stdout = '';
try {
  child = spawn(browser, ['--headless', '--disable-gpu', '--remote-debugging-port=0',
    '--remote-debugging-address=127.0.0.1', `--user-data-dir=${profile}`,
    ...(resourceMode ? ['--js-flags=--expose-gc', '--enable-precise-memory-info'] : []), 'about:blank'],
    {detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe']});
  stopBrowser = trackBrowserShutdown(child, 3000, {processGroup: process.platform !== 'win32'});
  let spawnError;
  child.on('error', error => { spawnError = error; });
  child.stderr.on('data', data => { stderr = (stderr + data).slice(-65536); });
  child.stdout.on('data', data => { stdout = (stdout + data).slice(-65536); });
  let port;
  for (let attempt = 0; attempt < 150; attempt++) {
    if (spawnError) throw spawnError;
    try { port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; break; }
    catch { await delay(100); }
  }
  assert(port, 'browser did not expose its isolated debugging port');
  const target = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(base)}`, {method: 'PUT'}).then(r => r.json());
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let nextId = 0;
  const pending = new Map();
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    const item = pending.get(message.id);
    if (item) { pending.delete(message.id); clearTimeout(item.timer); message.error ? item.reject(Error(JSON.stringify(message.error))) : item.resolve(message.result); }
  };
  const evaluate = expression => new Promise((resolve, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => { pending.delete(id); reject(Error('browser evaluation timed out')); }, 5000);
    pending.set(id, {resolve, reject, timer});
    socket.send(JSON.stringify({id, method: 'Runtime.evaluate', params: {expression, returnByValue: true}}));
  });
  let result;
  for (let attempt = 0; attempt < 150; attempt++) {
    const value = await evaluate('document.body && document.body.dataset.result');
    if (value.result?.value) { result = JSON.parse(value.result.value); break; }
    await delay(100);
  }
  assert(result, 'browser consumer did not finish');
  console.log(JSON.stringify(result, null, 2));
  assert.equal(result.status, 'passed', result.error);
} catch (error) {
  console.error(JSON.stringify({browser, profile,
    exitCode: child?.exitCode, signalCode: child?.signalCode, stdout, stderr}, null, 2));
  throw error;
} finally {
  socket?.close();
  try {
    await stopBrowser?.();
  } finally {
    await new Promise(resolve => server.close(resolve));
    // Chromium descendants can finish profile writes after the main process.
    // Retry transient ENOTEMPTY; persistent cleanup failures still fail the gate.
    await rm(profile, {recursive: true, force: true, maxRetries: 5, retryDelay: 100});
  }
}
