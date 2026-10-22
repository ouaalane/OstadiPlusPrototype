const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/screen-orientation.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
function load(platform = 'android', available = true, lockAsync = async () => {}) {
  const exports = {}, warnings = [];
  let imports = 0;
  vm.runInNewContext(code, { exports, console: { warn: (...args) => warnings.push(args) }, require(name) {
    if (name === 'expo') return { requireOptionalNativeModule: () => available ? {} : null };
    if (name === 'react-native') return { Platform: { OS: platform } };
    if (name === 'expo-screen-orientation') {
      imports++;
      assert.ok(available && platform !== 'web', 'unavailable native module must never be evaluated');
      return { OrientationLock: { DEFAULT: 0, PORTRAIT_UP: 3 }, lockAsync };
    }
    throw new Error(`Unexpected import: ${name}`);
  } });
  return { api: exports, warnings, imports };
}
const flush = () => new Promise(resolve => setImmediate(resolve));
for (const platform of ['android', 'ios']) {
  test(`${platform}: portrait app, automatic video rotation, portrait on exit`, async () => {
    const locks = [], { api } = load(platform, true, async lock => locks.push(lock));
    api.initializeAppOrientation(); await flush();
    const release = api.acquireVideoRotation(); await flush();
    release(); release(); await flush();
    assert.deepEqual(locks, [3, 0, 3]);
  });
}
test('overlapping video screens retain rotation until the last screen leaves', async () => {
  const locks = [], { api } = load('android', true, async lock => locks.push(lock));
  const first = api.acquireVideoRotation(); await flush();
  const second = api.acquireVideoRotation(); first(); await flush();
  assert.ok(locks.every(lock => lock === 0));
  second(); await flush(); assert.equal(locks.at(-1), 3);
});
test('a delayed lock cannot leave the app in landscape after blur', async () => {
  const locks = []; let finish;
  const { api } = load('android', true, lock => {
    locks.push(lock);
    return locks.length === 1 ? new Promise(resolve => { finish = resolve; }) : Promise.resolve();
  });
  const release = api.acquireVideoRotation(); await flush();
  release(); finish(); await flush();
  assert.deepEqual(locks, [0, 3]);
});
for (const [platform, available] of [['web', true], ['android', false], ['ios', false]]) {
  test(`${platform}, native available=${available}: no eager native import or crash`, async () => {
    const { api, imports } = load(platform, available);
    api.initializeAppOrientation(); api.acquireVideoRotation()(); await flush();
    assert.equal(imports, 0);
  });
}
test('native failure is handled and a later portrait restore still runs', async () => {
  const locks = [], { api, warnings } = load('ios', true, async lock => {
    locks.push(lock); if (locks.length === 1) throw new Error('unsupported orientation');
  });
  const release = api.acquireVideoRotation(); await flush(); release(); await flush();
  assert.equal(warnings.length, 1); assert.deepEqual(locks, [0, 3]);
});
