// SPDX-FileCopyrightText: 2026 Noyalib
// SPDX-License-Identifier: MIT OR Apache-2.0

import { getPath, merge, parse, parseJson, stringify, validateJson, WasmDocument } from "@sebastienrousseau/noyalib-wasm";

const yaml = "name: noyalib\nport: 8080\n";
const value: unknown = parse(yaml);
const projected: unknown = parseJson(yaml);
const emitted: string = stringify(value);
const valid: boolean = validateJson(emitted);
const field: unknown = getPath(emitted, "port");
const merged: string = merge(emitted, "port: 9090\n");
const document = new WasmDocument(merged);
try {
  document.set("port", "10000");
  document.setValue("name", "consumer");
  const source: string = document.toString();
  const span: unknown = document.spanAt("name");
  const comments: unknown = document.commentsAt("port");
  void [projected, valid, field, source, span, comments];
  // @ts-expect-error The generated binding requires a YAML fragment string.
  document.set("port", 10000);
} finally {
  document.free();
}
