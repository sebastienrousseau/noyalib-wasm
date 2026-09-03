# JavaScript API reference

The complete JavaScript / TypeScript surface that
`noyalib-wasm` exposes after a `wasm-pack build`. Two surfaces:
the **simple API** (functional, `parse` / `stringify` / `merge`)
and the **document API** (`WasmDocument`, lossless edits with
byte-faithful round-trip).

For build tool / bundler integration see
[`bundling.md`](./bundling.md).

## Install

```sh
npm install noyalib-wasm
```

The package ships ESM, CJS, and `web` targets in one bundle;
modern bundlers pick the right one automatically.

## Simple API

### `parse(yaml: string): unknown`

Parse YAML to a plain JS object / array / scalar. Throws on parse
error.

```ts
import { parse } from "noyalib-wasm";

const cfg = parse(`
name: noyalib
port: 8080
features: [a, b, c]
`);
// cfg.name === "noyalib"
// cfg.port === 8080
// cfg.features === ["a", "b", "c"]
```

### `stringify(value: unknown): string`

Serialise a JS value back to a YAML string. The output is
canonical noyalib YAML — block style for non-leaf collections,
auto-quoted scalars where ambiguity would otherwise surface.
Throws if the value contains JS-specific shapes the YAML data
model doesn't support (functions, symbols).

```ts
import { stringify } from "noyalib-wasm";

const yaml = stringify({ name: "noyalib", port: 8080 });
// "name: noyalib\nport: 8080\n"
```

### `validateJson(yaml: string): boolean`

Returns `true` if the YAML parses successfully and contains only
JSON-compatible values (no tags, no anchors, no non-string
mapping keys). Used for "is this YAML safe to round-trip through
`JSON.stringify`?" checks.

### `getPath(yaml: string, path: string): unknown | null`

Fetch a single value from a YAML string by dotted path. Returns
`null` if the path doesn't exist.

```ts
import { getPath } from "noyalib-wasm";

const host = getPath(yamlString, "server.host");
const firstItem = getPath(yamlString, "items[0].name");
```

### `merge(base: string, override: string): string`

Deep-merge two YAML documents — the override values win, but
both documents' comments and structure are preserved where
possible.

```ts
import { merge } from "noyalib-wasm";

const merged = merge(
  "name: app\nport: 8080\n",
  "port: 9090\nworkers: 4\n"
);
// "name: app\nport: 9090\nworkers: 4\n"
```

## Document API

### `class WasmDocument`

A YAML document with byte-faithful source preservation and
path-targeted edits. The class wraps `noyalib::cst::Document`
from the Rust core, so `to_string()` after no edits returns the
input bytes exactly. Edits rewrite only the touched span.

#### `new WasmDocument(yaml: string): WasmDocument`

Parse a YAML string into a Document. Throws on parse error.

```ts
import { WasmDocument } from "noyalib-wasm";

const doc = new WasmDocument(`
# Production config
server:
  host: api.example.com  # public-facing
  port: 8080
`);
```

#### `doc.toString(): string`

Re-emit the document as a string. **Byte-identical to the input
if no edits were made** — including comments, whitespace, and
trailing newlines.

#### `doc.get(path: string): unknown | null`

Read the parsed value at a dotted path. Returns `null` if the
path doesn't exist.

```ts
const port = doc.get("server.port");        // 8080
const host = doc.get("server.host");        // "api.example.com"
const missing = doc.get("server.missing");  // null
```

#### `doc.getSource(path: string): string | null`

Read the **raw source slice** for the value at a dotted path —
no re-quoting, no canonicalisation. Useful when you need to know
exactly what the user typed.

```ts
const raw = doc.getSource("server.host");
// "api.example.com" (the bytes from the source, including any quoting)
```

#### `doc.spanAt(path: string): { start: number; end: number } | null`

Return the byte range `[start, end)` of the value at a dotted
path within the source string. Useful for editor integrations
that need to highlight the value the cursor is over.

```ts
const span = doc.spanAt("server.host");
// { start: 38, end: 53 }
```

#### `doc.set(path: string, fragment: string): void`

Set the value at a dotted path using a **YAML fragment string**.
The fragment must parse as valid YAML in the target position;
the document is left unchanged on parse error.

```ts
doc.set("server.port", "9090");
doc.set("server.host", '"new-api.example.com"');
doc.set("features", "[parse, emit, validate]");
```

After `doc.toString()`, only the bytes for the changed value
have moved — comments, blank lines, indent style, sibling
entries are byte-identical.

#### `doc.setValue(path: string, value: unknown): void`

Set the value at a dotted path using a **JS object**. Internally
serialises the JS value through `noyalib::Value` and applies the
result. Equivalent to `doc.set(path, stringify(value))` but
slightly more direct.

```ts
doc.setValue("server", {
  host: "api.example.com",
  port: 9090,
  tls: { enabled: true }
});
```

#### `doc.replaceSpan(start: number, end: number, replacement: string): void`

Replace the bytes in `[start, end)` with `replacement`. The
lower-level escape hatch — used when you have a span from
`spanAt` and want to do something the structured API doesn't
cover. The replacement is not validated for parseability; you
get what you write.

#### `doc.commentsAt(path: string): { before: string[]; inline: string | null }`

Read the YAML comments associated with the node at `path`.
Returns the leading-comments array (the `# ...` lines
immediately above the node) and the trailing inline comment
(the `# ...` on the same line as the value), if any. This is
the demo that motivates the entire CST architecture — comments
survive the round-trip and are queryable.

```ts
const { before, inline } = doc.commentsAt("server.host");
// before: ["# public-facing"]  (depending on layout)
// inline: " public-facing"     (if there's a same-line comment)
```

## TypeScript types

The package ships full `.d.ts` declarations generated from the
wasm-bindgen surface. Editor autocompletion works out of the box
in any TypeScript project.

```ts
import type { WasmDocument } from "noyalib-wasm";

function bumpVersion(yamlSource: string, newVersion: string): string {
  const doc: WasmDocument = new WasmDocument(yamlSource);
  doc.set("version", newVersion);
  return doc.toString();
}
```

## Errors

All functions that can fail throw a JS `Error` with a `.message`
matching the Rust error's `Display` output (e.g.
`"YAML parse error at line 3, column 7: …"`). The
`noyalib::Error` variant taxonomy from
[the core errors reference](../../noyalib/doc/errors.md) is
preserved in the message; structured access to the variant kind
is not currently exposed (file an issue if you need it).

## When to use which API

| Use case | API |
|---|---|
| Parse YAML → JS object → done | `parse()` |
| JS object → YAML string | `stringify()` |
| Quick value lookup, no edit | `getPath(yaml, path)` |
| Merge two configs | `merge(base, override)` |
| Edit a value, preserve comments / formatting | `WasmDocument.set` |
| Cursor-aware editor integration | `WasmDocument.spanAt` + `replaceSpan` |
| Surface comments to the user | `WasmDocument.commentsAt` |
| Round-trip with byte-faithfulness | `new WasmDocument(s).toString()` (no edits → identity) |

## Related

- [Bundling](./bundling.md) — Vite, Webpack, esbuild, Next.js
  integration
- [Crate README](../README.md) — install + crate-level overview
- [`crates/noyalib-wasm/examples/`](../examples/) — runnable JS
  examples (browser + Node)
