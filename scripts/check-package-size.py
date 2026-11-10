#!/usr/bin/env python3
# SPDX-FileCopyrightText: 2026 Noyalib
# SPDX-License-Identifier: MIT OR Apache-2.0

"""Gate optimized published WASM bytes against the measured release budget."""

import argparse
import gzip
import hashlib
import json
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('wasm', type=Path)
    args = parser.parse_args()
    budget = json.loads((Path(__file__).resolve().parents[1] / 'docs/package-size-budget.json').read_text())
    module = args.wasm.read_bytes()
    if not module.startswith(b'\0asm\x01\0\0\0'):
        parser.error('expected a WebAssembly module')
    raw = len(module)
    packed = len(gzip.compress(module, compresslevel=9, mtime=0))
    passed = raw <= budget['raw_limit_bytes'] and packed <= budget['gzip_level_9_limit_bytes']
    print(json.dumps({'artifact': args.wasm.name, 'raw_bytes': raw, 'gzip_level_9_bytes': packed,
                      'sha256': hashlib.sha256(module).hexdigest(), 'status': 'passed' if passed else 'failed',
                      'raw_limit_bytes': budget['raw_limit_bytes'],
                      'gzip_level_9_limit_bytes': budget['gzip_level_9_limit_bytes']}, indent=2))
    return 0 if passed else 1


if __name__ == '__main__':
    raise SystemExit(main())
