#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2026 Noyalib
# SPDX-License-Identifier: MIT OR Apache-2.0
#
# Verify the README's JavaScript examples against the real bindings.
#
# WHY THIS EXISTS, AND WHY IT IS NOT THE CORE SCRIPT
#
# noyalib's harness compiles every rust block in its README. This repo's
# README has no rust blocks - it documents a JavaScript API, so its
# examples are JS. Porting the core script here would find nothing, pass
# trivially, and show a green tick for a check that never ran.
#
# Two things rot in a bindings README, and both are checked:
#
#   1. Syntax. A copy-pasted block that does not parse wastes a user's
#      afternoon. Each block is run through node --check as an ES module.
#
#   2. The import list. Every name imported from this package must
#      actually be exported by it. wasm-bindgen renames snake_case Rust
#      to camelCase JS, so get_path becomes getPath - the check converts
#      back before looking, rather than assuming the doc is right.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 1

README=${1:-README.md}
[ -f "$README" ] || { echo "no $README"; exit 1; }
command -v node >/dev/null || { echo "  node not installed - cannot verify"; exit 1; }

tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
fail=0; n=0

awk -v out="$tmp" '
  /^```(js|ts|javascript|typescript)/ {
    if ($0 !~ /ignore/) { i++; f=sprintf("%s/b%03d.mjs", out, i); inblk=1 }
    next
  }
  /^```/ { inblk=0; f=""; next }
  inblk && f != "" { print >> f }
' "$README"

for f in "$tmp"/*.mjs; do
  [ -e "$f" ] || continue
  n=$((n + 1))
  if ! node --check "$f" >/dev/null 2>&1; then
    echo "  [FAIL] a js block in $README is not valid JavaScript:"
    node --check "$f" 2>&1 | head -4 | sed 's/^/        /'
    fail=1
  fi
done

# Names this crate actually exports, in the camelCase wasm-bindgen emits.
exports=$(grep -oE "pub fn [a-z_][a-zA-Z0-9_]*|pub struct [A-Za-z][A-Za-z0-9]*" src/lib.rs \
  | sed -E "s/pub (fn|struct) //" \
  | awk '{ n=$0; gsub(/_([a-z])/, " &", n); print $0 }' | sort -u)
camel() { printf "%s" "$1" | awk '{ n=tolower($0); r=""; up=0; for(i=1;i<=length(n);i++){c=substr(n,i,1); if(c=="_"){up=1} else { r = r (up ? toupper(c) : c); up=0 } } print r }'; }

imported=$(grep -A20 "^import .*{" "$README" | sed -n "/{/,/}/p" | grep -oE "^\s+[A-Za-z][A-Za-z0-9]*," | tr -d " ," | sort -u)
for name in $imported; do
  found=0
  for e in $exports; do
    [ "$(camel "$e")" = "$name" ] && found=1 && break
    [ "$e" = "$name" ] && found=1 && break
  done
  if [ "$found" -eq 0 ]; then
    echo "  [FAIL] $README imports '$name', which this crate does not export"
    fail=1
  fi
done

if [ "$fail" -ne 0 ]; then
  echo "-- README JavaScript does not match the bindings --"
  exit 1
fi
if [ "$n" -eq 0 ]; then
  echo "  [FAIL] no js blocks found - this check would be vacuous"
  exit 1
fi
echo "-- All $n README js block(s) parse, and every import resolves --"
