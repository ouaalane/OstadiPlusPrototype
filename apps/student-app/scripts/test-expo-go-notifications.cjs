const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const sourceRoot = path.resolve(__dirname, '../src');
function evaluate(file, dependencies) {
  const code = ts.transpileModule(fs.readFileSync(path.join(sourceRoot, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require(name) {
      assert.ok(Object.hasOwn(dependencies, name), `Unexpected runtime import: ${name}`);
      return dependencies[name]();
    },
  }, { filename: file });
  return exports;
}

for (const [platform, expoGo, available] of [
  ['android', true, false],
  ['android', false, true],
  ['ios', true, true],
  ['ios', false, true],
  ['web', false, false],
]) {
  test(`${platform}, Expo Go=${expoGo}: native notifications ${available ? 'loaded' : 'never evaluated'}`, () => {
    let imports = 0;
    const native = {};
    const { Notifications } = evaluate('notifications/client.ts', {
      expo: () => ({ isRunningInExpoGo: () => expoGo }),
      'react-native': () => ({ Platform: { OS: platform } }),
      'expo-notifications': () => {
        imports++;
        if (!available) throw new Error("Cannot find native module 'ExpoTopicSubscriptionModule'");
        return native;
      },
    });
    assert.equal(imports, available ? 1 : 0);
    assert.equal(Notifications, available ? native : null);
  });
}

test('Expo Go lesson alerts neither request permissions nor deliver native alerts', async () => {
  const alerts = evaluate('notifications/lessonAlerts.ts', {
    '../theme': () => ({ colors: { brand: '#68234F' } }),
    'react-native': () => ({ Platform: { OS: 'android' } }),
    './client': () => ({ Notifications: null }),
  });
  assert.equal(await alerts.prepareLessonAlertsAsync(), false);
  await alerts.presentLessonAlertAsync({}, 'ar');
});

test('development build retains channel, permission and delivery behavior', async () => {
  const calls = [];
  const native = {
    AndroidImportance: { HIGH: 4 },
    setNotificationHandler: (handler) => calls.push(['handler', handler]),
    setNotificationChannelAsync: async (id, options) => calls.push(['channel', id, options]),
    getPermissionsAsync: async () => ({ granted: false }),
    requestPermissionsAsync: async () => { calls.push(['permission']); return { granted: true }; },
    scheduleNotificationAsync: async (notification) => calls.push(['delivery', notification]),
  };
  const alerts = evaluate('notifications/lessonAlerts.ts', {
    '../theme': () => ({ colors: { brand: '#68234F' } }),
    'react-native': () => ({ Platform: { OS: 'android' } }),
    './client': () => ({ Notifications: native }),
  });
  assert.equal(await alerts.prepareLessonAlertsAsync(), true);
  await alerts.presentLessonAlertAsync({
    lessonId: 'lesson-1', lessonKind: 'video', lessonTitle: 'Limits',
    courseId: 'course-1', courseTitle: 'Math', teacherName: 'Teacher', notificationId: 'notification-1',
  }, 'fr');
  assert.deepEqual(calls.map(call => call[0]), ['handler', 'channel', 'permission', 'delivery']);
  assert.equal(calls[1][1], 'lessons');
  assert.equal(calls[1][2].importance, 4);
  assert.equal(calls[3][1].content.data.lessonId, 'lesson-1');
  assert.equal(calls[3][1].content.data.notificationId, 'notification-1');
  assert.equal(calls[3][1].trigger.channelId, 'lessons');
});

test('no app source bypasses the guarded notifications client', () => {
  function visit(directory) {
    for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, item.name);
      if (item.isDirectory()) { visit(file); continue; }
      if (!/\.tsx?$/.test(file) || file.endsWith('/notifications/client.ts')) continue;
      const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
      function check(node) {
        if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
          if (node.moduleSpecifier?.text === 'expo-notifications') {
            assert.ok(node.isTypeOnly || node.importClause?.isTypeOnly, `Eager notification import in ${file}`);
          }
        }
        if (ts.isCallExpression(node) && ['require', 'import'].includes(node.expression.getText(source))) {
          assert.notEqual(node.arguments[0]?.text, 'expo-notifications', `Unguarded notification load in ${file}`);
        }
        ts.forEachChild(node, check);
      }
      check(source);
    }
  }
  visit(sourceRoot);
});
