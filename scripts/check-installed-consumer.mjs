// SPDX-FileCopyrightText: 2026 Noyalib
// SPDX-License-Identifier: MIT OR Apache-2.0

// Verify a real npm install of the local generated bundler tarball.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixture = join(root, 'tests/typescript');
const pkg = resolve(process.argv[2] || 'pkg');
const browser = process.argv[3];
const resources = process.argv.includes('--resources');
const injectLeak = process.argv.includes('--inject-leak');
const injectJsLeak = process.argv.includes('--inject-js-leak');
const scratch = await mkdtemp(join(tmpdir(), 'noyalib-installed-consumer-'));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const tsc = join(fixture, 'node_modules/.bin/tsc');
const env = { ...process.env, npm_config_cache: join(scratch, 'npm-cache') };
const run = (file, args) => execFileSync(file, args, { cwd: scratch, encoding: 'utf8', env, timeout: 120000 });
try {
  const metadata = JSON.parse(run(npm, ['pack', '--json', '--ignore-scripts', pkg]));
  const packed = Array.isArray(metadata) ? metadata[0] : Object.values(metadata)[0];
  const archive = join(scratch, packed.filename);
  const bytes = await readFile(archive);
  assert.equal(`sha512-${createHash('sha512').update(bytes).digest('base64')}`, packed.integrity);
  await writeFile(join(scratch, 'package.json'), '{"private":true,"type":"module"}\n');
  run(npm, ['install', '--offline', '--ignore-scripts', '--no-save', archive]);
  const installed = join(scratch, 'node_modules/@sebastienrousseau/noyalib-wasm');
  const declared = JSON.parse(await readFile(join(installed, 'package.json'), 'utf8'));
  assert.equal(declared.name, '@sebastienrousseau/noyalib-wasm');
  assert.equal(declared.version, packed.version);
  for (const license of ['LICENSE-MIT', 'LICENSE-APACHE']) {
    assert.deepEqual(await readFile(join(installed, license)), await readFile(join(root, license)));
  }
  await copyFile(join(fixture, 'consumer.ts'), join(scratch, 'consumer.ts'));
  run(tsc, ['--noEmit', '--strict', '--target', 'ES2022', '--module', 'ESNext',
    '--moduleResolution', 'Bundler', '--lib', 'ES2022,DOM,ESNext.Disposable', 'consumer.ts']);
  run(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import { parse, parseJson, WasmDocument } from '@sebastienrousseau/noyalib-wasm';
    assert.deepEqual(parse('a: 1\\nb: null\\n'), { a: 1, b: null });
    assert.deepEqual(parseJson('a: !demo [!!int 2]\\n'), { a: [2] });
    const doc = new WasmDocument('# keep\\nport: 8080\\n');
    try {
      doc.set('port', '9090');
      assert.equal(doc.toString(), '# keep\\nport: 9090\\n');
    } finally { doc.free(); }
  `]);
  let bundle;
  if (browser) {
    const webpack = createRequire(join(fixture, 'package.json'))('webpack');
    const entry = join(scratch, 'browser-entry.mjs');
    const bundled = join(scratch, 'bundle');
    const diagnosticExport = resources
      ? `export {memory as __resourceMemory} from ${JSON.stringify(join(installed, 'noyalib_wasm_bg.wasm'))};\n`
      : '';
    await writeFile(entry, "export * from '@sebastienrousseau/noyalib-wasm';\n" + diagnosticExport);
    const compiler = webpack({
      context: scratch, mode: 'production', target: 'web', entry, devtool: false,
      experiments: { asyncWebAssembly: true },
      output: { path: bundled, filename: 'noyalib_wasm.js', module: true, library: { type: 'module' } },
      optimization: { minimize: false },
    });
    await new Promise((resolve, reject) => compiler.run((error, stats) => {
      compiler.close(closeError => {
        const failure = error || closeError || (stats.hasErrors() && Error(stats.toString('errors-only')));
        if (failure) reject(failure); else resolve();
      });
    }));
    const script = join(root, 'scripts/check-browser-consumer.mjs');
    const browserArgs = [script, bundled, browser, '--bundler',
      ...(resources ? ['--resources'] : []), ...(injectLeak ? ['--inject-leak'] : []), ...(injectJsLeak ? ['--inject-js-leak'] : [])];
    let browserReport;
    try { browserReport = run(process.execPath, browserArgs); }
    catch (error) {
      if (error.stdout) process.stdout.write(error.stdout);
      throw error;
    }
    bundle = {webpack: webpack.version, ...JSON.parse(browserReport)};
  }
  console.log(JSON.stringify({ status: 'passed', version: declared.version, bundle,
    node: process.version, typescript: run(tsc, ['--version']).trim(),
    sha256: createHash('sha256').update(bytes).digest('hex'),
    files: packed.files.map(file => file.path) }, null, 2));
} finally {
  await rm(scratch, { recursive: true, force: true });
}
