// SPDX-FileCopyrightText: 2026 Noyalib
// SPDX-License-Identifier: MIT OR Apache-2.0

import assert from 'node:assert/strict';
import {checkRuntimeContract} from './runtime-contract-workload.mjs';
import {pathToFileURL} from 'node:url';
import {resolve, dirname, join} from 'node:path';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const args = typeof Deno === 'undefined' ? process.argv.slice(2) : Deno.args;
assert.ok(args[0], 'module path required');
const modulePath = resolve(args[0]);
const api = await import(pathToFileURL(modulePath).href);
const checks = checkRuntimeContract(api);
const runtime = typeof Deno !== 'undefined' ? {name: 'Deno', version: Deno.version.deno}
  : typeof Bun !== 'undefined' ? {name: 'Bun', version: Bun.version}
  : {name: 'Node', version: process.version};
const wasm = await readFile(join(dirname(modulePath), 'noyalib_wasm_bg.wasm'));
console.log(JSON.stringify({status: 'passed', measured_utc: new Date().toISOString(), runtime,
  checks, module_sha256: createHash('sha256').update(wasm).digest('hex')}, null, 2));
