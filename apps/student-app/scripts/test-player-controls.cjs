const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
const code = ts.transpileModule(
  fs.readFileSync(
    path.join(__dirname, '../src/components/usePlayerControls.ts'),
    'utf8',
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  },
).outputText;

// Execute the production hook with deterministic hook slots and a virtual clock.
// Assertions exercise public interactions; no timer or visibility logic is duplicated.
function mount(overrides = {}) {
  let props = {
    playing: true,
    loading: false,
    dragging: false,
    hasError: false,
    fullscreen: false,
    ...overrides,
  };
  const slots = [],
    timers = new Map();
  let cursor = 0,
    clock = 0,
    sequence = 0,
    output,
    dirty = false;
  const effects = [];
  const same = (a, b) =>
    a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { value: initial };
      return [
        slots[index].value,
        (next) => {
          const value =
            typeof next === 'function' ? next(slots[index].value) : next;
          if (!Object.is(value, slots[index].value)) {
            slots[index].value = value;
            dirty = true;
          }
        },
      ];
    },
    useCallback(callback, deps) {
      const index = cursor++;
      if (!same(slots[index]?.deps, deps)) slots[index] = { callback, deps };
      return slots[index].callback;
    },
    useEffect(effect, deps) {
      const index = cursor++;
      if (!same(slots[index]?.deps, deps))
        effects.push(() => {
          slots[index]?.cleanup?.();
          slots[index] = { deps, cleanup: effect() };
        });
    },
  };
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: (name) => {
      assert.equal(name, 'react');
      return react;
    },
    setTimeout: (callback, delay) => {
      const id = ++sequence;
      timers.set(id, { at: clock + delay, callback });
      return id;
    },
    clearTimeout: (id) => timers.delete(id),
  });
  function render() {
    do {
      dirty = false;
      cursor = 0;
      output = exports.usePlayerControls(props);
      effects.splice(0).forEach((effect) => effect());
    } while (dirty);
  }
  render();
  return {
    get visible() {
      return output.controlsVisible;
    },
    get pendingTimers() {
      return timers.size;
    },
    tap() {
      output.toggleControls();
      render();
    },
    interact() {
      output.revealControls();
      render();
    },
    update(patch) {
      props = { ...props, ...patch };
      render();
    },
    advance(ms) {
      const end = clock + ms;
      while (true) {
        const next = [...timers]
          .filter(([, t]) => t.at <= end)
          .sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        clock = next[1].at;
        timers.delete(next[0]);
        next[1].callback();
        render();
      }
      clock = end;
    },
    unmount() {
      slots.forEach((slot) => slot.cleanup?.());
    },
  };
}

test('portrait playback hides after four idle seconds, tap reveals and hides again', () => {
  const player = mount();
  assert.equal(player.visible, true);
  player.advance(3999);
  assert.equal(player.visible, true);
  player.advance(1);
  assert.equal(player.visible, false);
  player.tap();
  assert.equal(player.visible, true);
  player.advance(4000);
  assert.equal(player.visible, false);
});
test('a surface tap can dismiss visible controls without changing playback', () => {
  const player = mount();
  player.tap();
  assert.equal(player.visible, false);
  player.tap();
  assert.equal(player.visible, true);
});
test('control interactions restart the entire idle window without accumulating timers', () => {
  const player = mount();
  player.advance(3500);
  player.interact();
  assert.equal(player.pendingTimers, 1);
  player.advance(3500);
  assert.equal(player.visible, true);
  player.advance(500);
  assert.equal(player.visible, false);
});
for (const [key, value, idleValue] of [
  ['playing', false, true],
  ['loading', true, false],
  ['dragging', true, false],
  ['hasError', true, false],
]) {
  test(`${key}: controls stay available until playback can safely hide them`, () => {
    const player = mount();
    player.advance(4000);
    assert.equal(player.visible, false);
    player.update({ [key]: value });
    assert.equal(player.visible, true);
    player.tap();
    player.advance(15000);
    assert.equal(player.visible, true);
    assert.equal(player.pendingTimers, 0);
    player.update({ [key]: idleValue });
    player.advance(3999);
    assert.equal(player.visible, true);
    player.advance(1);
    assert.equal(player.visible, false);
  });
}
test('rotation restarts visible timeout; already hidden controls stay hidden in fullscreen', () => {
  const player = mount();
  player.advance(3500);
  player.update({ fullscreen: true });
  player.advance(3500);
  assert.equal(player.visible, true);
  player.advance(500);
  assert.equal(player.visible, false);
  player.update({ fullscreen: false });
  assert.equal(player.visible, false);
  player.tap();
  player.advance(4000);
  assert.equal(player.visible, false);
});
test('unmount cancels outstanding idle callback', () => {
  const player = mount();
  assert.equal(player.pendingTimers, 1);
  player.unmount();
  assert.equal(player.pendingTimers, 0);
});
