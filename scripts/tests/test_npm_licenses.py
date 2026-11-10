#!/usr/bin/env python3
# SPDX-FileCopyrightText: 2026 Noyalib
# SPDX-License-Identifier: MIT OR Apache-2.0

"""Require source-identical licenses in the actual npm tarball allowlist."""

import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]


class PackageLicenses(unittest.TestCase):
    def test_preparation_preserves_files_and_bundles_both_exact_licenses(self):
        with tempfile.TemporaryDirectory() as scratch:
            package = Path(scratch)
            (package / 'package.json').write_text(json.dumps({
                'name': 'noyalib-license-fixture', 'version': '0.0.0',
                'files': ['entry.js'], 'license': 'MIT OR Apache-2.0'}))
            (package / 'entry.js').write_text('export const example = 1;\n')
            for _ in range(2):
                subprocess.run(['python3', str(ROOT / 'scripts/prepare-npm-package.py'),
                                str(package)], check=True, capture_output=True)
            metadata = json.loads((package / 'package.json').read_text())
            self.assertEqual(metadata['files'], ['entry.js', 'LICENSE-MIT', 'LICENSE-APACHE'])
            for name in ['LICENSE-MIT', 'LICENSE-APACHE']:
                self.assertEqual((package / name).read_bytes(), (ROOT / name).read_bytes())
            run = subprocess.run(['npm', 'pack', '--dry-run', '--ignore-scripts', '--json',
                                  '--cache', str(package / 'cache')], cwd=package,
                                 check=True, capture_output=True, text=True)
            result = json.loads(run.stdout)
            first = result[0] if isinstance(result, list) else next(iter(result.values()))
            packed = {item['path'] for item in first['files']}
            self.assertTrue({'entry.js', 'LICENSE-MIT', 'LICENSE-APACHE'} <= packed)


    def test_gate_rejects_missing_or_modified_license_text(self):
        for defect in ['missing', 'modified']:
            with self.subTest(defect=defect), tempfile.TemporaryDirectory() as scratch:
                package = Path(scratch)
                names = ['noyalib_wasm.js', 'noyalib_wasm_bg.wasm', 'noyalib_wasm.d.ts']
                (package / 'package.json').write_text(json.dumps({
                    'name': 'noyalib-license-fixture', 'version': '0.0.0',
                    'main': names[0], 'files': names, 'license': 'MIT OR Apache-2.0'}))
                for name in names:
                    (package / name).write_text('fixture\n')
                subprocess.run(['python3', str(ROOT / 'scripts/prepare-npm-package.py'),
                                str(package)], check=True, capture_output=True)
                if defect == 'missing':
                    (package / 'LICENSE-MIT').unlink()
                else:
                    (package / 'LICENSE-APACHE').write_text('wrong text\n')
                run = subprocess.run(['bash', str(ROOT / 'scripts/check-npm-package.sh'),
                                      str(package)], capture_output=True, text=True,
                                     env={**os.environ, 'npm_config_cache': str(package / 'cache')})
                self.assertNotEqual(run.returncode, 0, run.stdout + run.stderr)


if __name__ == '__main__':
    unittest.main()
