// SPDX-FileCopyrightText: 2026 Noyalib
// SPDX-License-Identifier: MIT OR Apache-2.0

import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {resolve, dirname} from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const browser = process.env.CHROME_BIN;
const run = (leak, jsLeak = false) => {
  assert.ok(browser, 'CHROME_BIN must name the tested browser');
  const args = [resolve(root, 'scripts/check-installed-consumer.mjs'), resolve(root, 'pkg'),
    browser, '--resources', ...(leak ? ['--inject-leak'] : []), ...(jsLeak ? ['--inject-js-leak'] : [])];
  const child = spawnSync(process.execPath, args, {encoding: 'utf8', timeout: 120000});
  assert.ifError(child.error);
  assert.equal(child.signal, null, child.stderr);
  return child;
};

test('installed browser bundle bounds repeated parse/edit/free memory', () => {
  const child = run(false);
  assert.equal(child.status, 0, child.stderr);
  const result = JSON.parse(child.stdout);
  assert.equal(result.bundle.runtime_resources.status, 'passed');
  assert.equal(result.bundle.runtime_resources.latency.samples.length, 768);
});

test('the same browser budget rejects retained real documents', () => {
  const child = run(true);
  assert.equal(child.status, 1, child.stderr);
  const result = JSON.parse(child.stdout);
  assert.equal(result.status, 'failed');
  assert.match(result.error, /linear-memory growth budget/);
  assert.ok(result.runtime_resources.growth_bytes > result.runtime_resources.allowance_bytes);
});


test('the browser heap budget rejects retained parsed JS values', () => {
  const child = run(false, true);
  assert.equal(child.status, 1, child.stderr);
  const result = JSON.parse(child.stdout);
  assert.equal(result.status, 'failed');
  assert.ok(result.runtime_resources.js_heap_growth_bytes > result.runtime_resources.js_heap_allowance_bytes);
});
