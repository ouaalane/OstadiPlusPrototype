import { register } from 'node:module';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
register('../apps/api/src/resolve.mjs', import.meta.url);
const { createDemoState, createStudentCode, repairStudentCodes } = await import('@ostadiplus/shared');
const { createWatermarkApi } = await import('../apps/api/src/server.mjs');
const seed = createDemoState();
assert.equal(new Set(seed.students.map(s => s.studentCode)).size, seed.students.length);
const generated = [...seed.students];
for (let i = 0; i < 2000; i++) generated.push({ studentCode: createStudentCode('registration-' + i, generated) });
assert.equal(new Set(generated.map(s => s.studentCode)).size, generated.length);
assert.equal(createStudentCode('same', []), createStudentCode('same', []));
assert.notEqual(createStudentCode('same', [{ studentCode: createStudentCode('same', []).toLowerCase() }]), createStudentCode('same', []));
const legacy = [seed.students[0], { ...seed.students[1], studentCode: seed.students[0].studentCode }, seed.students[2]];
const original = JSON.stringify(legacy);
const repaired = repairStudentCodes(legacy);
assert.equal(JSON.stringify(legacy), original);
assert.equal(repaired[0], legacy[0]);
assert.equal(repaired[2], legacy[2]);
assert.notEqual(repaired[1].studentCode, legacy[1].studentCode);
assert.equal(repaired[1].id, legacy[1].id);
assert.deepEqual(repairStudentCodes(repaired), repaired);
console.log('ok - 2,000 new codes, seed uniqueness, collision retry, first-owner preservation and idempotent immutable repair');
const dir = await mkdtemp(join(tmpdir(), 'oustadi-code-migration-'));
let api;
try {
  seed.students = legacy;
  await writeFile(join(dir, 'demo-state.json'), JSON.stringify(seed));
  api = createWatermarkApi({ demoDirectory: dir, dbPath: join(dir, 'ledger.db'), logger: { log() {}, error() {} } });
  await new Promise(resolve => api.server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${api.server.address().port}`;
  const state = await (await fetch(base + '/api/demo/state')).json();
  assert.deepEqual(state.students, repaired);
  assert.deepEqual(state.enrollments, seed.enrollments);
  assert.deepEqual(state.progress, seed.progress);
  const response = await fetch(base + '/api/demo/student', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ student: { ...repaired[0], id: 'new-colliding-student' } }),
  });
  assert.equal(response.status, 200);
  const registered = await response.json();
  assert.equal(new Set(registered.students.map(s => s.studentCode)).size, registered.students.length);
  assert.equal(registered.students.find(s => s.id === repaired[0].id).studentCode, repaired[0].studentCode);
  assert.notEqual(registered.students.find(s => s.id === 'new-colliding-student').studentCode, repaired[0].studentCode);
  await api.close(); api = null;
  api = createWatermarkApi({ demoDirectory: dir, dbPath: join(dir, 'ledger.db'), logger: { log() {}, error() {} } });
  await new Promise(resolve => api.server.listen(0, '127.0.0.1', resolve));
  const restarted = await (await fetch(`http://127.0.0.1:${api.server.address().port}/api/demo/state`)).json();
  assert.deepEqual(restarted.students, registered.students);
  console.log('ok - persisted legacy migration, cross-device collision handling and durable restart preserve identity/enrollments/progress');
} finally { if (api) await api.close(); await rm(dir, { recursive: true, force: true }); }
