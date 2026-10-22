const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/student-login.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const exportsObject = {};
vm.runInNewContext(code, { exports: exportsObject });
const { studentForLogin } = exportsObject;
const students = [
  { id: 'invited', email: 'invited@example.com', phone: '+212 612345678' },
  { id: 'new', email: 'new@example.com', phone: '+212 698765432' },
  { id: 'guest', email: '', phone: '' },
];
test('new account resolves its own identity, never the invited first student', () => {
  assert.equal(studentForLogin(students, 'new@example.com').id, 'new');
});
test('email matching trims whitespace and ignores case', () => {
  assert.equal(studentForLogin(students, '  NEW@EXAMPLE.COM ').id, 'new');
});
test('local, international and formatted Moroccan numbers resolve the same student', () => {
  for (const value of ['0698765432', '+212 698 765 432', '00212698765432']) {
    assert.equal(studentForLogin(students, value).id, 'new');
  }
});
test('unknown identifiers never fall back to the invited student', () => {
  for (const value of ['unknown@example.com', '0600000000', 'new', '212', '+']) {
    assert.equal(studentForLogin(students, value), undefined);
  }
});
test('empty identifiers cannot sign into a guest with empty contact details', () => {
  for (const value of ['', '  ']) assert.equal(studentForLogin(students, value), undefined);
});
test('signup phone prefix also matches when the learner includes the local zero', () => {
  assert.equal(studentForLogin([{ id: 'new', email: '', phone: '+212 0698765432' }], '0698765432').id, 'new');
});
test('existing invited account remains reachable using its own identifier', () => {
  assert.equal(studentForLogin(students, 'invited@example.com').id, 'invited');
  assert.equal(studentForLogin([], 'invited@example.com'), undefined);
});
