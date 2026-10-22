const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, imports = {}, timers = {}) {
  const code = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, '../src/lib', file), 'utf8'),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    },
  ).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    console: { warn() {} },
    setTimeout,
    clearTimeout,
    ...timers,
    require(name) {
      if (name in imports) return imports[name];
      throw new Error(name);
    },
  });
  return exports;
}
const { createCaptureProtectionController: create } = load(
  'capture-protection-controller.ts',
);
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
};
const flush = () => new Promise((resolve) => setImmediate(resolve));
function fixture(ensure = async () => ({ captured: false }), platform = 'ios') {
  let listener,
    removes = 0,
    calls = 0;
  const client = {
    ensureProtection: () => {
      calls++;
      return ensure();
    },
    subscribe(callback) {
      listener = callback;
      return () => {
        removes++;
      };
    },
  };
  const controller = create(platform, () => client);
  return {
    controller,
    emit: (value) => listener(value),
    get calls() {
      return calls;
    },
    get removes() {
      return removes;
    },
  };
}
test('content remains covered until native prevention acknowledges success', async () => {
  const request = deferred(),
    f = fixture(() => request.promise);
  const running = f.controller.start();
  await flush();
  assert.equal(f.controller.getSnapshot().phase, 'checking');
  assert.equal(f.controller.getSnapshot().foreground, false);
  request.resolve({ captured: false });
  await running;
  assert.equal(f.controller.getSnapshot().phase, 'protected');
  assert.equal(f.controller.getSnapshot().foreground, true);
});
test('missing module/old binary fails closed; web never loads native modules', async () => {
  const native = create('android', () => null);
  await native.start();
  assert.equal(native.getSnapshot().phase, 'unavailable');
  const web = create('web', () => {
    throw new Error('must not run');
  });
  await web.start();
  assert.equal(web.getSnapshot().phase, 'unsupported');
});
test('failure keeps content covered; explicit retry can recover', async () => {
  let fail = true;
  const f = fixture(async () => {
    if (fail) throw new Error('not attached');
    return { captured: false };
  });
  await f.controller.start();
  assert.equal(f.controller.getSnapshot().phase, 'error');
  assert.equal(f.controller.getSnapshot().foreground, false);
  fail = false;
  await f.controller.retry();
  assert.equal(f.controller.getSnapshot().phase, 'protected');
});
test('recording already active at startup is blocked; later capture events hide/unhide content', async () => {
  const f = fixture(async () => ({ captured: true }));
  await f.controller.start();
  assert.equal(f.controller.getSnapshot().captured, true);
  f.emit(false);
  assert.equal(f.controller.getSnapshot().captured, false);
  f.emit(true);
  assert.equal(f.controller.getSnapshot().captured, true);
});
test('a capture event arriving during initialization is not overwritten by a stale snapshot', async () => {
  const request = deferred(),
    f = fixture(() => request.promise);
  const running = f.controller.start();
  await flush();
  f.emit(true);
  request.resolve({ captured: false });
  await running;
  assert.equal(f.controller.getSnapshot().captured, true);
});
test('backgrounding during startup never exposes content on late completion', async () => {
  const request = deferred(),
    f = fixture(() => request.promise);
  const running = f.controller.start();
  await flush();
  await f.controller.setActive(false);
  request.resolve({ captured: false });
  await running;
  assert.equal(f.controller.getSnapshot().foreground, false);
  await f.controller.setActive(true);
  assert.equal(f.controller.getSnapshot().foreground, true);
  assert.equal(f.calls, 2);
});
test('rapid foreground changes serialize native protection and discard obsolete results', async () => {
  const request = deferred();
  let count = 0;
  const f = fixture(() =>
    ++count === 1 ? request.promise : Promise.resolve({ captured: true }),
  );
  const start = f.controller.start();
  await flush();
  await f.controller.setActive(false);
  const resume = f.controller.setActive(true);
  request.resolve({ captured: false });
  await Promise.all([start, resume]);
  assert.equal(f.controller.getSnapshot().captured, true);
  assert.equal(f.calls, 2);
});
test('unmount removes listeners and ignores pending completion, without releasing native protection', async () => {
  const request = deferred(),
    f = fixture(() => request.promise);
  const start = f.controller.start();
  await flush();
  f.controller.stop();
  request.resolve({ captured: false });
  await start;
  assert.equal(f.removes, 1);
  assert.equal(f.controller.getSnapshot().foreground, false);
});
function bridge(platform = 'ios', available = true) {
  const calls = [],
    listeners = [];
  let fails = 0;
  let windowId = 'main-window';
  const capture = {
    async preventScreenCapture() {
      calls.push('block');
      if (fails-- > 0) throw new Error('window not attached');
    },
    async enableAppSwitcherProtection(value) {
      calls.push(['privacy', value]);
    },
    addListener(name, listener) {
      listeners.push([name, listener]);
      return {
        remove() {
          calls.push('remove');
        },
      };
    },
  };
  const native = {
    async ensureProtection() {
      calls.push('native');
      return { captured: false, windowId };
    },
    addListener: capture.addListener,
  };
  const api = load(
    'capture-protection.ts',
    {
      expo: {
        requireOptionalNativeModule: (name) =>
          available ? (name === 'ExpoScreenCapture' ? capture : native) : null,
      },
      'react-native': { Platform: { OS: platform, Version: 34 } },
    },
    {
      setTimeout: (callback) => {
        callback();
        return 1;
      },
    },
  );
  return {
    api,
    calls,
    listeners,
    setWindow: (value) => {
      windowId = value;
    },
    fail: (count) => {
      fails = count;
    },
  };
}
test('iOS keeps its secure canvas across resumes without duplicate observers or blur', async () => {
  const f = bridge(),
    client = f.api.createNativeProtectionClient();
  await client.ensureProtection();
  await client.ensureProtection();
  assert.equal(f.calls.filter((x) => x === 'block').length, 1);
  assert.equal(f.calls.filter((x) => Array.isArray(x)).length, 1);
  const remove = client.subscribe(() => {});
  remove();
  assert.equal(f.calls.at(-1), 'remove');
});
test('iOS installs protection again when the key window changes', async () => {
  const f = bridge();
  const client = f.api.createNativeProtectionClient();
  await client.ensureProtection();
  f.setWindow('new-window');
  await client.ensureProtection();
  assert.equal(f.calls.filter((x) => x === 'block').length, 2);
});
test('key-window attachment failures retry while unavailable bridge is handled without eager import', async () => {
  const f = bridge();
  f.fail(2);
  await f.api.createNativeProtectionClient().ensureProtection();
  assert.equal(f.calls.filter((x) => x === 'block').length, 3);
  assert.equal(
    bridge('android', false).api.createNativeProtectionClient(),
    null,
  );
  assert.equal(bridge('web').api.createNativeProtectionClient(), null);
});
test('exhausted retries reject rather than claiming protection', async () => {
  const f = bridge();
  f.fail(10);
  await assert.rejects(f.api.createNativeProtectionClient().ensureProtection());
  assert.equal(f.calls.filter((x) => x === 'block').length, 4);
});
const { secureMainActivity } = require('../plugins/withCaptureProtection');
for (const language of ['kt', 'java'])
  test(`${language}: startup FLAG_SECURE precedes React onCreate and plugin is idempotent`, () => {
    const code =
      language === 'kt'
        ? 'override fun onCreate(savedInstanceState: Bundle?) {\n    super.onCreate(null)\n}'
        : 'protected void onCreate(Bundle savedInstanceState) {\n    super.onCreate(savedInstanceState);\n}';
    const result = secureMainActivity(code, language);
    assert.ok(result.indexOf('FLAG_SECURE') < result.indexOf('super.onCreate'));
    assert.equal(secureMainActivity(result, language), result);
  });
test('unexpected native template fails the build instead of silently skipping protection', () =>
  assert.throws(() => secureMainActivity('class Broken {}', 'kt')));
