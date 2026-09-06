#!/usr/bin/env bash
# SPDX-License-Identifier: MIT OR Apache-2.0
# Copyright (c) 2026 Noyalib. All rights reserved.
# Refuse an npm package whose entry module imports a file the tarball
# leaves out. wasm-pack writes the `files` allow-list from what it knows
# about the target's layout; an old wasm-pack paired with a new
# wasm-bindgen dropped noyalib_wasm_bg.js from the 0.0.35 package.
set -euo pipefail
pkg=${1:-pkg}
cd "$pkg"
entry=$(node -e 'const p=require("./package.json");console.log(p.module||p.main)')
[ -f "$entry" ] || { echo "entry module $entry missing"; exit 1; }
packed=$(npm pack --dry-run --json 2>/dev/null | node -e 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));for(const f of d[0].files)console.log(f.path)')
rc=0
for imp in $(grep -oE 'from "\./[^"]+"' "$entry" | sed -E 's/from "\.\/([^"]+)"/\1/' | sort -u); do
  [ -f "$imp" ] || { echo "$entry imports $imp, which was not generated"; rc=1; continue; }
  grep -qx "$imp" <<<"$packed" || { echo "$entry imports $imp, which the tarball leaves out (files: $(node -e 'console.log(require("./package.json").files.join(" "))'))"; rc=1; }
done
for f in noyalib_wasm_bg.wasm noyalib_wasm.d.ts; do
  grep -qx "$f" <<<"$packed" || { echo "tarball leaves out $f"; rc=1; }
done
[ "$rc" = 0 ] && echo "package contents ok: $(wc -l <<<"$packed" | tr -d ' ') files"
exit "$rc"
