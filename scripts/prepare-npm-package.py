#!/usr/bin/env python3
# SPDX-FileCopyrightText: 2026 Noyalib
# SPDX-License-Identifier: MIT OR Apache-2.0

"""Include both declared license texts in a generated wasm-pack npm package."""

import json
from pathlib import Path
import shutil
import sys

root = Path(__file__).resolve().parents[1]
package = Path(sys.argv[1] if len(sys.argv) > 1 else 'pkg').resolve()
metadata = package / 'package.json'
data = json.loads(metadata.read_text())
files = list(data['files'])
for name in ['LICENSE-MIT', 'LICENSE-APACHE']:
    shutil.copyfile(root / name, package / name)
    if name not in files:
        files.append(name)
data['files'] = files
metadata.write_text(json.dumps(data, indent=2) + '\n')
print('npm package includes the declared MIT and Apache license texts')
