const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(name) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib', name + '.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(code, { exports, require: name => load(name.replace('./', '')) });
  return exports;
}
const { registrationErrors } = load('student-registration');
const { readLibraryPreferences } = load('library-preferences');
const details = { fullName: 'New Learner', email: 'new@example.ma', phone: '', level: 'BAC', studentType: 'moutamadris', password: 'strong123' };
test('signup rejects malformed and already registered email addresses before creating identity', () => {
  assert.equal(Object.keys(registrationErrors(details, [])).length, 0);
  assert.equal(registrationErrors({ ...details, email: 'not-an-email' }, []).email, 'email');
  assert.equal(registrationErrors({ ...details, email: ' IMAN@example.ma ' }, [{ id: 'st-iman', email: 'iman@example.ma' }]).email, 'duplicate');
});
test('signup accepts optional phone but rejects malformed phone and passwords shorter than the profile policy', () => {
  assert.equal(registrationErrors({ ...details, phone: '+212 abc' }, []).phone, 'phone');
  assert.equal(registrationErrors({ ...details, password: '1234567' }, []).password, 'password');
  assert.equal(Object.keys(registrationErrors({ ...details, phone: '+212 ٦١٢٣٤٥٦٧٨' }, [])).length, 0);
});
test('legacy library choices migrate only to the last signed-in student', () => {
  const all = readLibraryPreferences(null, JSON.stringify({ archived: ['a'], favorites: ['b'] }), 'st-iman');
  assert.equal(all['st-iman'].favorites[0], 'b');
  assert.equal(all['st-yassine'], undefined);
  assert.equal(Object.keys(readLibraryPreferences(null, '{"favorites":["a"]}', '')).length, 0);
});
test('scoped preferences survive reload with independent favorites and archives; stale legacy values stay ignored', () => {
  const all = readLibraryPreferences(JSON.stringify({ one: { archived: ['a'], favorites: ['b', 'b', 17] }, two: { favorites: ['c'] } }), '{"favorites":["wrong"]}', 'two');
  assert.equal(all.one.favorites.length, 1);
  assert.equal(all.one.archived[0], 'a');
  assert.equal(all.two.favorites[0], 'c');
  assert.equal(all.two.archived.length, 0);
});
