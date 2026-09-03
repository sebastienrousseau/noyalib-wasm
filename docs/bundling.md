# Bundling noyalib-wasm

Wiring `noyalib-wasm` into the major JavaScript bundler / framework
toolchains. Each section is a known-working setup; copy the
relevant snippet, install the package, ship.

For the JavaScript API surface itself see [`js-api.md`](./js-api.md).

## Quick reference

| Toolchain | Default just works? | Special config? |
|---|---|---|
| Vite (`@vitejs/plugin-react`, etc.) | yes | top-level await + `vite-plugin-wasm` |
| Webpack 5 | yes | `experiments.asyncWebAssembly` |
| esbuild | yes | `--loader:.wasm=binary` |
| Rollup | yes | `@rollup/plugin-wasm` |
| Next.js (App Router 13+) | yes | enable WASM in `next.config.js` |
| Remix | yes | uses Vite under the hood |
| SvelteKit | yes | uses Vite under the hood |
| Astro | yes | uses Vite under the hood |
| Node.js (raw) | yes | dynamic import or `--experimental-wasm-modules` |
| Deno | yes | `await import` |
| Bun | yes | native WASM support |
| Cloudflare Workers | yes | binding via `wrangler.toml` |
| Browser ESM via CDN | yes | Skypack / esm.sh |

## Vite

`vite.config.ts`:

```ts
import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

export default defineConfig({
  plugins: [wasm(), topLevelAwait()],
});
```

Then in your code:

```ts
import init, { WasmDocument } from "noyalib-wasm";

await init();
const doc = new WasmDocument("name: noyalib\n");
```

## Webpack 5

`webpack.config.js`:

```js
module.exports = {
  experiments: {
    asyncWebAssembly: true,
  },
};
```

If you're targeting older browsers and need the synchronous
loader, switch to `syncWebAssembly: true` and import via the
`web` target build (specify `?init` query when using the package).

## esbuild

`build.mjs`:

```js
import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  outfile: "dist/bundle.js",
  format: "esm",
  loader: { ".wasm": "binary" },
});
```

## Rollup

`rollup.config.js`:

```js
import wasm from "@rollup/plugin-wasm";
import resolve from "@rollup/plugin-node-resolve";

export default {
  input: "src/index.ts",
  output: { file: "dist/bundle.js", format: "esm" },
  plugins: [
    resolve(),
    wasm({ targetEnv: "auto-inline" }),
  ],
};
```

## Next.js (App Router)

`next.config.js`:

```js
/** @type {import('next').NextConfig} */
module.exports = {
  webpack: (config, { isServer }) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };
    return config;
  },
};
```

Then in a server component or route handler:

```ts
// app/api/parse/route.ts
import { NextResponse } from "next/server";
import init, { parse } from "noyalib-wasm";

let ready: Promise<void> | null = null;
function ensureInit() {
  if (!ready) ready = init().then(() => undefined);
  return ready;
}

export async function POST(req: Request) {
  await ensureInit();
  const yaml = await req.text();
  return NextResponse.json(parse(yaml));
}
```

## Node.js (raw, no bundler)

```js
// ESM: works in Node 20+ with --experimental-wasm-modules
import init, { parse } from "noyalib-wasm";
await init();

console.log(parse("name: noyalib\nport: 8080\n"));
```

For CommonJS, use the `nodejs` target build:

```js
const { parse } = require("noyalib-wasm/nodejs");
console.log(parse("name: noyalib\n"));
```

## Deno

```ts
import init, { WasmDocument } from "npm:noyalib-wasm";
await init();
const doc = new WasmDocument("name: noyalib\n");
console.log(doc.toString());
```

## Bun

```ts
import init, { parse } from "noyalib-wasm";
await init();
console.log(parse("port: 8080\n"));
```

Bun's native WASM loader picks up the package without config.

## Cloudflare Workers

`wrangler.toml`:

```toml
name = "yaml-edge"
main = "src/index.ts"
compatibility_date = "2026-05-06"

# noyalib-wasm bundles its own .wasm asset; wrangler picks it up.
```

`src/index.ts`:

```ts
import init, { parse } from "noyalib-wasm/web";

let ready: Promise<void> | null = null;

export default {
  async fetch(req: Request): Promise<Response> {
    if (!ready) ready = init();
    await ready;
    const yaml = await req.text();
    return Response.json(parse(yaml));
  },
};
```

## Browser ESM via CDN (no bundler)

```html
<script type="module">
  import init, { parse } from "https://esm.sh/noyalib-wasm";
  await init();
  console.log(parse("name: noyalib\n"));
</script>
```

Or via Skypack:

```html
<script type="module">
  import init, { parse } from "https://cdn.skypack.dev/noyalib-wasm";
  await init();
  console.log(parse("port: 8080\n"));
</script>
```

## Build target variants

`wasm-pack build` produces three target variants; the package
ships all three behind one entry point:

| Target | Use when |
|---|---|
| `bundler` (default) | Vite, Webpack, Rollup, esbuild — the bundler handles the WASM |
| `web` | Direct browser `<script type="module">` use |
| `nodejs` | Node.js without ESM (`require()`) |

Modern bundlers and runtimes pick the right variant via the
package's `exports` field. Only override (`noyalib-wasm/web`,
`noyalib-wasm/nodejs`) if the auto-detection fails for your
toolchain.

## Bundle size

The compiled `.wasm` blob is roughly **180 KB** uncompressed,
**~70 KB** brotli-compressed. The `wasm-opt` pass (enabled in the
release profile) shaves another ~5–10%. Tree-shaking does not
apply to WASM — the whole module loads even if you only use
`parse()`.

For size-sensitive deployments:

- Pre-warm `init()` on page load so the WASM cost is paid once
  and reused
- Self-host the `.wasm` file from your CDN with `Cache-Control:
  immutable, max-age=31536000` headers
- Don't try to dynamic-import per-call — the per-call overhead
  swamps the actual parse cost

## Initialisation pattern

The package's default export is an `init()` function. Call it
once before the first API call; subsequent calls to `init()` are
no-ops.

```ts
import init, { parse, stringify } from "noyalib-wasm";

// Pattern 1: top-level await (works in Vite, Bun, modern Node)
await init();

// Pattern 2: lazy initialise once
let ready: Promise<void> | null = null;
async function ensure() {
  if (!ready) ready = init();
  await ready;
}

await ensure();
parse("name: noyalib\n");
```

## Troubleshooting

### "WebAssembly module is not initialised"

You forgot to `await init()` before the first API call. Add it.

### "Cannot find module 'noyalib-wasm/web'"

Some bundlers don't honour the package's `exports` field. Either
upgrade the bundler, or import the entry point directly
(`noyalib-wasm/dist/web/noyalib_wasm.js`).

### Bundle includes the WASM blob inline (huge bundle)

Some bundlers default to inlining `.wasm` as base64. Configure
the bundler to emit it as a separate asset and serve from a
static path. See the per-bundler sections above.

### Bundle has a `node:` import error in the browser

You're probably importing from `noyalib-wasm/nodejs`. Switch to
the default export or `noyalib-wasm/web`.

### TypeScript can't find the types

The package ships `.d.ts` files in the same directory as the
JS bundle. If your TypeScript can't find them, ensure
`"moduleResolution": "bundler"` (or `"node16"` / `"nodenext"`)
in `tsconfig.json`.

## Related

- [JS API reference](./js-api.md) — what the package exports
- [Crate README](../README.md) — install + crate-level overview
- [`crates/noyalib-wasm/examples/`](../examples/) — runnable
  browser + Node demos
