import { register } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
register('../apps/api/src/resolve.mjs', import.meta.url);
const { createWatermarkApi } = await import('../apps/api/src/server.mjs');
const { membershipForNotification } = await import('@ostadiplus/shared');
const directory = await mkdtemp(join(tmpdir(), 'oustadi-invitations-'));
let api,
  endpoint,
  count = 0;
const done = (name) => {
  count++;
  console.log('ok - ' + name);
};
async function start() {
  api = createWatermarkApi({
    demoDirectory: directory,
    logger: { log() {}, error() {} },
  });
  await new Promise((r) => api.server.listen(0, '127.0.0.1', r));
  endpoint = 'http://127.0.0.1:' + api.server.address().port;
}
async function call(path, body, status = 200) {
  const res = await fetch(
    endpoint + '/api/demo/' + path,
    body === undefined
      ? {}
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
  );
  assert.equal(res.status, status, await res.clone().text());
  return res.json();
}
try {
  const old = {
    id: 'old',
    studentId: 'student',
    centerId: 'centre',
    requestedAt: '2026-01-01T00:00:00.000Z',
    status: 'rejected',
  };
  const current = {
    ...old,
    id: 'new',
    requestedAt: '2026-01-02T00:00:00.000Z',
    status: 'requested',
  };
  const legacy = {
    id: 'notice',
    kind: 'center-request',
    studentId: 'student',
    read: false,
    createdAt: '2026-01-01T00:00:00.005Z',
    payload: { centerId: 'centre' },
  };
  assert.equal(membershipForNotification([old, current], legacy)?.id, 'old');
  assert.equal(
    membershipForNotification([old, current], {
      ...legacy,
      createdAt: '2026-01-02T00:00:00.005Z',
    })?.id,
    'new',
  );
  assert.equal(
    membershipForNotification([old, current], {
      ...legacy,
      studentId: 'someone-else',
    }),
    undefined,
  );
  assert.equal(
    membershipForNotification([old, current], {
      ...legacy,
      payload: { centerId: 'centre', membershipId: 'new' },
    })?.id,
    'new',
  );
  done(
    'old notifications resolve their original invitation and never inherit a later reinvitation',
  );
  await start();
  const initial = await call('state');
  const centerId = initial.centers[0].id;
  const student = {
    ...initial.students[0],
    id: 'st-invitation-test',
    studentCode: 'UST-ZZ991',
    fullName: 'Invitation Test',
    email: 'invite@example.ma',
    phone: '0612345678',
  };
  await call('connections/student', { student });
  let center = await call('connections?centerId=' + centerId);
  assert.ok(!center.students.some((s) => s.id === student.id));
  let lookup = await call('connections/lookup', {
    studentCode: '  ust-zz991 ',
    centerId,
  });
  assert.equal(lookup.student.id, student.id);
  assert.equal(lookup.student.email, '');
  assert.equal(lookup.student.phone, '');
  done(
    'new student registers automatically and code lookup reveals only an identity preview before consent',
  );
  await call('connections/invite', {
    centerId,
    studentCode: student.studentCode,
  });
  await call('connections/invite', {
    centerId,
    studentCode: student.studentCode,
  });
  let inbox = await call('connections?studentId=' + student.id);
  assert.equal(inbox.memberships.length, 1);
  assert.equal(inbox.notifications.length, 1);
  const first = inbox.memberships[0],
    notification = inbox.notifications[0];
  assert.equal(notification.payload.membershipId, first.id);
  assert.equal(first.status, 'requested');
  center = await call('connections?centerId=' + centerId);
  assert.equal(center.students.find((s) => s.id === student.id).phone, '');
  done(
    'duplicate sends produce one pending invitation and one targeted notification',
  );
  await call(
    'connections/respond',
    { studentId: initial.students[0].id, membershipId: first.id, accept: true },
    404,
  );
  await call(
    'connections/respond',
    { studentId: student.id, membershipId: first.id, accept: 'yes' },
    400,
  );
  await call('connections/invite', { centerId, studentCode: 'INVALID' }, 404);
  done(
    'another student cannot answer the invitation and invalid requests are rejected',
  );
  await call('connections/respond', {
    studentId: student.id,
    membershipId: first.id,
    accept: false,
  });
  center = await call('connections?centerId=' + centerId);
  assert.ok(!center.students.some((s) => s.id === student.id));
  await call(
    'connections/respond',
    { studentId: student.id, membershipId: first.id, accept: true },
    409,
  );
  done(
    'declining does not add the student to the centre or permit a later contradictory answer',
  );
  await call('connections/invite', {
    centerId,
    studentCode: student.studentCode,
  });
  inbox = await call('connections?studentId=' + student.id);
  const second = inbox.memberships.find((m) => m.status === 'requested');
  assert.notEqual(second.id, first.id);
  // Another centre invitation must remain pending and unread.
  const snapshot = await call('state');
  const secondCenter = {
    ...initial.centers[0],
    id: 'ctr-second-test',
    name: 'Second centre',
    inviteCode: 'SECOND',
  };
  snapshot.centers.push(secondCenter);
  await call('state', snapshot);
  await call('connections/invite', {
    centerId: secondCenter.id,
    studentCode: student.studentCode,
  });
  inbox = await call('connections/respond', {
    studentId: student.id,
    membershipId: second.id,
    accept: true,
  });
  assert.equal(
    inbox.memberships.find((m) => m.id === second.id).status,
    'active',
  );
  assert.equal(
    inbox.notifications.find((n) => n.payload.membershipId === second.id).read,
    true,
  );
  assert.equal(
    inbox.notifications.find((n) => n.payload.centerId === secondCenter.id)
      .read,
    false,
  );
  center = await call('connections?centerId=' + centerId);
  assert.equal(
    center.students.find((s) => s.id === student.id).phone,
    student.phone,
  );
  assert.equal(
    center.students.find((s) => s.id === student.id).email,
    student.email,
  );
  assert.ok(
    !(await call('state')).enrollments.some((e) => e.studentId === student.id),
  );
  done(
    'accepting reveals the full profile without granting courses or answering another centre’s invitation',
  );
  await call('connections/respond', {
    studentId: student.id,
    membershipId: second.id,
    accept: true,
  });
  const stale = snapshot;
  await call('state', stale);
  assert.equal(
    (await call('connections?studentId=' + student.id)).memberships.find(
      (m) => m.id === second.id,
    ).status,
    'active',
  );
  await api.close();
  await start();
  assert.equal(
    (await call('connections?studentId=' + student.id)).memberships.find(
      (m) => m.id === second.id,
    ).status,
    'active',
  );
  done(
    'acceptance is idempotent, survives a stale teacher publish and persists after server restart',
  );
  console.log(`PASS ${count} centre invitation API checks`);
} finally {
  await api?.close();
  await rm(directory, { recursive: true, force: true });
}
