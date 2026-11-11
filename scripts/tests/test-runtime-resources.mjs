// SPDX-FileCopyrightText: 2026 Noyalib
// SPDX-License-Identifier: MIT OR Apache-2.0

import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {resolve, dirname} from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const script = resolve(root, 'scripts/check-runtime-resources.mjs');
const directory = process.env.NOYALIB_WASM_NODE_PKG || resolve(root, 'pkg-node');
const run = mode => {
  const child = spawnSync(process.execPath, ['--expose-gc', script, directory, mode],
    {encoding: 'utf8', timeout: 60000});
  assert.ifError(child.error);
  assert.equal(child.signal, null, child.stderr);
  assert.ok(child.stdout.trim(), child.stderr);
  return {code: child.status, report: JSON.parse(child.stdout)};
};

test('fixed parse/edit/free work stays inside the linear-memory budget', () => {
  const result = run('normal');
  assert.equal(result.code, 0);
  assert.equal(result.report.status, 'passed');
  assert.equal(result.report.windows.length, 6);
  assert.equal(result.report.latency.samples.length, 384);
});

test('retaining real WASM documents breaches the same memory budget', () => {
  const result = run('leak');
  assert.equal(result.code, 1);
  assert.equal(result.report.status, 'failed');
  assert.ok(result.report.growth_bytes > result.report.allowance_bytes);
});


test('retaining parsed JS values breaches the JavaScript heap budget', () => {
  const result = run('js-leak');
  assert.equal(result.code, 1);
  assert.equal(result.report.status, 'failed');
  assert.ok(result.report.js_heap_growth_bytes > result.report.js_heap_allowance_bytes);
});


test('missing heap samples fail instead of becoming zero growth', () => {
  const result = run('lost-metrics');
  assert.equal(result.code, 1);
  assert.equal(result.report.status, 'failed');
  assert.equal(result.report.peak_js_heap_bytes, null);
  assert.equal(result.report.js_heap_growth_bytes, null);
});
