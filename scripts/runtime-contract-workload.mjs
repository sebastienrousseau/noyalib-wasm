// SPDX-FileCopyrightText: 2026 Noyalib
// SPDX-License-Identifier: MIT OR Apache-2.0

function sameValue(actual, expected) {
  if (Object.is(actual, expected)) return true;
  if (!actual || !expected || typeof actual !== 'object' || typeof expected !== 'object') return false;
  if (Object.getPrototypeOf(actual) !== Object.getPrototypeOf(expected)) return false;
  const a = Object.keys(actual).sort(), b = Object.keys(expected).sort();
  return a.length === b.length && a.every((key, i) => key === b[i] && sameValue(actual[key], expected[key]));
}

export function checkRuntimeContract(api) {
  let checks = 0;
  const check = (value, message) => { if (!value) throw Error(message); checks++; };
  const equal = (actual, expected) => check(sameValue(actual, expected), 'unexpected contract value');
  const refused = operation => {
    let error;
    try { operation(); } catch (caught) { error = caught; }
    check(error instanceof Error, 'operation must refuse with an Error');
  };

  for (const name of ['parse', 'parseJson', 'stringify', 'validateJson', 'getPath', 'merge', 'WasmDocument'])
    check(typeof api[name] === 'function', 'missing export ' + name);
  equal(api.parse('name: runtime\nmissing: null\n'), {name: 'runtime', missing: null});
  equal(api.parseJson('a: !!str 1\nb: !local [!!int 2]\n'), {a: '1', b: [2]});
  equal(api.parse(api.stringify({port: 8080})), {port: 8080});
  equal(api.getPath('server:\n  port: 8080\n', 'server.port'), 8080);
  equal(api.getPath('port: 8080\n', 'missing'), null);
  equal(api.parse(api.merge('a: 1\n', 'b: 2\n')), {a: 1, b: 2});
  equal(api.validateJson('a: 1\n'), true);
  refused(() => api.parse('a: ['));
  refused(() => api.parse('1: a\n"1": b\n'));
  equal(api.parse('max: 9007199254740991\nmin: -9007199254740991\n'),
    {max: Number.MAX_SAFE_INTEGER, min: Number.MIN_SAFE_INTEGER});
  refused(() => api.parse('9007199254740993'));
  refused(() => api.parseJson('9007199254740993'));
  check(Number.isNaN(api.parse('.nan')), 'YAML NaN remains a JS NaN');
  refused(() => api.validateJson('value: .nan'));
  refused(() => api.validateJson('value: .inf'));
  const shared = {n: 1};
  equal(api.parse(api.stringify({left: shared, right: shared})), {left: {n: 1}, right: {n: 1}});
  const cycle = {}; cycle.self = cycle;
  refused(() => api.stringify(cycle));
  const source = '# keep\nname: 🚀\r\nport: 8080 # inline\r\n';
  const document = new api.WasmDocument(source);
  try {
    equal(document.toString(), source);
    equal(document.getSource('name'), '🚀');
    const span = document.spanAt('name');
    equal(new TextDecoder().decode(new TextEncoder().encode(source).slice(span.start, span.end)), '🚀');
    refused(() => document.replaceSpan(span.start + 1, span.end, 'x'));
    equal(document.toString(), source);
    document.set('port', '9090');
    equal(document.get('port'), 9090);
    const before = document.toString();
    refused(() => document.setValue('port', cycle));
    equal(document.toString(), before);
    check(before.includes('# inline'), 'edit preserves the comment');
  } finally { document.free(); }
  equal(api.parse('still: usable'), {still: 'usable'});
  return checks;
}
