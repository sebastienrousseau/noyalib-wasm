// SPDX-FileCopyrightText: 2026 Noyalib
// SPDX-License-Identifier: MIT OR Apache-2.0

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { trackBrowserShutdown } from '../browser-shutdown.mjs';

test('shutdown waits for inherited streams and descendant profile writes',
  {skip: process.platform === 'win32'}, async () => {
  const profile = await mkdtemp(join(tmpdir(), 'noyalib-shutdown-test-'));
  const marker = join(profile, 'flushed');
  const descendant = `
    const fs = require('node:fs');
    process.stdout.write('ready\\n');
    setTimeout(() => { fs.writeFileSync(process.argv[1], 'done'); }, 300);
  `;
  const parent = `
    const {spawn} = require('node:child_process');
    process.on('SIGTERM', () => process.exit(0));
    const child = spawn(process.execPath, ['-e', process.argv[1], process.argv[2]],
      {stdio: ['ignore', 'pipe', 'inherit']});
    child.stdout.once('data', () => process.stdout.write('ready\\n'));
    setInterval(() => {}, 1000);
  `;
  const child = spawn(process.execPath, ['-e', parent, descendant, marker],
    {stdio: ['ignore', 'pipe', 'pipe']});
  const closed = once(child, 'close');
  const stop = trackBrowserShutdown(child);
  try {
    await once(child.stdout, 'data');
    await stop();
    assert.equal(await readFile(marker, 'utf8'), 'done');
  } finally {
    child.kill('SIGKILL');
    await closed;
    await rm(profile, {recursive: true, force: true});
  }
});

test('shutdown kills an unresponsive process and can be called again',
  {skip: process.platform === 'win32'}, async () => {
  const child = spawn(process.execPath, ['-e', `
    process.on('SIGTERM', () => {});
    process.stdout.write('ready\\n');
    setInterval(() => {}, 1000);
  `], {stdio: ['ignore', 'pipe', 'pipe']});
  const closed = once(child, 'close');
  const stop = trackBrowserShutdown(child, 100);
  try {
    await once(child.stdout, 'data');
    await stop();
    assert.equal(child.signalCode, 'SIGKILL');
    await stop();
  } finally {
    child.kill('SIGKILL');
    await closed;
  }
});


test('private process-group cleanup closes descendants after the parent exits',
  {skip: process.platform === 'win32'}, async () => {
  const parent = `
    const {spawn} = require('node:child_process');
    spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'],
      {stdio: ['ignore', 'ignore', 'inherit']});
    setTimeout(() => process.exit(0), 50);
  `;
  const child = spawn(process.execPath, ['-e', parent],
    {detached: true, stdio: ['ignore', 'ignore', 'pipe']});
  const closed = once(child, 'close');
  const stop = trackBrowserShutdown(child, 100, {processGroup: true});
  try {
    await once(child, 'exit');
    await stop();
    await closed;
    await stop();
  } finally {
    try { process.kill(-child.pid, 'SIGKILL'); }
    catch (error) { if (error.code !== 'ESRCH') throw error; }
    await closed;
  }
});
