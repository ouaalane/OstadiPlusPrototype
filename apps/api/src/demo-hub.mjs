/** Local, opt-in prototype hub. No production authentication or cloud storage. */
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
  statSync,
} from 'node:fs';
import { writeFile, unlink } from 'node:fs/promises';
import { join, dirname, extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import {
  createDemoState,
  allLessons,
  isEnrollmentExpired,
} from '@ostadiplus/shared';

const require = createRequire(import.meta.url);
const MIME = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};
const keyBy = (items, key) =>
  new Map((items ?? []).map((item) => [key(item), item]));
const union = (a, b, key = (item) => item.id) => [
  ...keyBy([...(a ?? []), ...(b ?? [])], key).values(),
];
function questions(a, b) {
  const map = keyBy(a, (q) => q.id);
  for (const q of b ?? []) {
    const old = map.get(q.id);
    map.set(q.id, old ? { ...old, replies: union(old.replies, q.replies) } : q);
  }
  return [...map.values()];
}
async function readBody(req, limit) {
  if (Number(req.headers['content-length'] ?? 0) > limit)
    throw Object.assign(new Error('body-too-large'), { status: 413 });
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit)
      throw Object.assign(new Error('body-too-large'), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}
export function createDemoHub(directory) {
  mkdirSync(directory, { recursive: true });
  const uploads = join(directory, 'uploads');
  mkdirSync(uploads, { recursive: true });
  const statePath = join(directory, 'demo-state.json');
  let state = existsSync(statePath)
    ? JSON.parse(readFileSync(statePath, 'utf8'))
    : createDemoState();
  function persist(next) {
    const tmp = statePath + '.tmp';
    writeFileSync(tmp, JSON.stringify(next));
    renameSync(tmp, statePath);
    state = next;
  }
  const valid = (s) =>
    s?.version === createDemoState().version &&
    Array.isArray(s.courses) &&
    s.courses.every(
      (c) => typeof c.id === 'string' && Array.isArray(c.semesters),
    ) &&
    Array.isArray(s.students) &&
    Array.isArray(s.enrollments) &&
    s.progress &&
    typeof s.progress === 'object' &&
    !Array.isArray(s.progress);
  function teacherUpdate(incoming) {
    if (!valid(incoming))
      throw Object.assign(new Error('invalid-state'), { status: 400 });
    const old = state;
    const students = union(incoming.students, old.students);
    const memberships = union(old.memberships, incoming.memberships).map(
      (m) => {
        const current = old.memberships.find((v) => v.id === m.id);
        return m.status === 'requested' &&
          current &&
          current.status !== 'requested'
          ? current
          : m;
      },
    );
    const next = {
      ...incoming,
      students,
      memberships,
      progress: { ...incoming.progress, ...old.progress },
      questions: questions(old.questions, incoming.questions),
      quizAttempts: union(incoming.quizAttempts, old.quizAttempts),
      activeStudentId: '',
    };
    next.notifications = union(old.notifications, incoming.notifications).map(
      (n) => ({
        ...n,
        read: n.read || old.notifications.some((o) => o.id === n.id && o.read),
      }),
    );
    for (const course of next.courses) {
      const before = old.courses.find((c) => c.id === course.id);
      const oldPublished = new Set(
        before
          ? allLessons(before)
              .filter((l) => l.published)
              .map((l) => l.id)
          : [],
      );
      for (const enrollment of next.enrollments.filter(
        (e) =>
          e.courseId === course.id &&
          e.status === 'active' &&
          !isEnrollmentExpired(e),
      )) {
        const newlyActive = !old.enrollments.some(
          (e) =>
            e.studentId === enrollment.studentId &&
            e.courseId === course.id &&
            e.status === 'active' &&
            !isEnrollmentExpired(e),
        );
        if (newlyActive)
          next.notifications.push({
            id: randomUUID(),
            studentId: enrollment.studentId,
            kind: 'access-granted',
            createdAt: new Date().toISOString(),
            read: false,
            payload: { courseId: course.id, courseTitle: course.title },
          });
        if (course.status === 'published')
          for (const lesson of allLessons(course).filter(
            (l) => l.published && !oldPublished.has(l.id),
          ))
            next.notifications.push({
              id: randomUUID(),
              studentId: enrollment.studentId,
              kind: 'new-lesson',
              createdAt: new Date().toISOString(),
              read: false,
              payload: {
                courseId: course.id,
                lessonId: lesson.id,
                lessonKind: lesson.kind,
                lessonTitle: lesson.title,
                courseTitle: course.title,
                teacherName: next.teacher.name,
              },
            });
      }
    }
    persist(next);
    return next;
  }
  function studentUpdate(body) {
    const s = body.student;
    if (
      !s ||
      typeof s.id !== 'string' ||
      !/^[-\w.]{1,64}$/.test(s.id) ||
      typeof s.fullName !== 'string' ||
      typeof s.studentCode !== 'string'
    )
      throw Object.assign(new Error('invalid-student'), { status: 400 });
    if (
      [
        'questions',
        'progress',
        'quizAttempts',
        'memberships',
        'readNotifications',
      ].some((key) => body[key] !== undefined && !Array.isArray(body[key]))
    )
      throw Object.assign(new Error('invalid-student-data'), { status: 400 });
    const old = state.students.find((v) => v.id === s.id);
    const safe = {
      ...(old ?? s),
      id: s.id,
      fullName: s.fullName,
      phone: s.phone ?? '',
      email: s.email ?? '',
      age: s.age,
      level: s.level ?? '',
      studentType: s.studentType ?? 'moutamadris',
      profilePhoto: s.profilePhoto,
      monogram: s.monogram ?? '',
      studentCode: old?.studentCode ?? s.studentCode,
    };
    const allowed = (lessonId) =>
      state.courses.some(
        (c) =>
          c.status === 'published' &&
          allLessons(c).some((l) => l.id === lessonId && l.published) &&
          state.enrollments.some(
            (e) =>
              e.studentId === s.id &&
              e.courseId === c.id &&
              e.status === 'active' &&
              !isEnrollmentExpired(e),
          ),
      );
    const ownQuestions = (body.questions ?? [])
      .filter(
        (q) =>
          typeof q.id === 'string' &&
          typeof q.body === 'string' &&
          q.body.trim() &&
          Array.isArray(q.replies) &&
          q.studentId === s.id &&
          state.courses.some(
            (c) =>
              c.id === q.courseId &&
              state.enrollments.some(
                (e) =>
                  e.studentId === s.id &&
                  e.courseId === c.id &&
                  e.status === 'active' &&
                  !isEnrollmentExpired(e),
              ),
          ),
      )
      .map((q) => ({
        ...q,
        replies: (q.replies ?? []).filter(
          (r) => r.authorRole === 'student' && r.authorId === s.id,
        ),
      }));
    const progress = (body.progress ?? []).filter(
      (p) =>
        typeof p.lessonId === 'string' &&
        typeof p.completed === 'boolean' &&
        typeof p.updatedAt === 'string' &&
        allowed(p.lessonId) &&
        Number.isFinite(p.positionSec) &&
        p.positionSec >= 0,
    );
    const quizAttempts = (body.quizAttempts ?? []).filter(
      (a) =>
        typeof a.id === 'string' &&
        a.studentId === s.id &&
        allowed(a.lessonId) &&
        Number.isInteger(a.correct) &&
        Number.isInteger(a.total) &&
        a.total > 0 &&
        a.correct >= 0 &&
        a.correct <= a.total &&
        Number.isFinite(a.elapsedSec) &&
        a.elapsedSec >= 0 &&
        typeof a.submittedAt === 'string',
    );
    const requests = (body.memberships ?? []).filter(
      (m) =>
        m.studentId === s.id &&
        typeof m.id === 'string' &&
        m.status === 'requested' &&
        state.centers.some((c) => c.id === m.centerId) &&
        !state.memberships.some(
          (existing) =>
            existing.studentId === s.id && existing.centerId === m.centerId,
        ),
    );
    const memberships = union(state.memberships, requests).map((m) => {
      const response = (body.memberships ?? []).find(
        (v) => v.id === m.id && v.studentId === s.id,
      );
      return m.studentId === s.id &&
        m.status === 'requested' &&
        response &&
        ['active', 'rejected'].includes(response.status)
        ? {
            ...m,
            status: response.status,
            respondedAt: new Date().toISOString(),
          }
        : m;
    });
    const readIds = new Set(body.readNotifications ?? []);
    const notifications = state.notifications.map((n) =>
      n.studentId === s.id && readIds.has(n.id) ? { ...n, read: true } : n,
    );
    persist({
      ...state,
      students: union(state.students, [safe]),
      memberships,
      notifications,
      questions: questions(state.questions, ownQuestions),
      progress: {
        ...state.progress,
        [s.id]: union(state.progress[s.id], progress, (p) => p.lessonId),
      },
      quizAttempts: union(state.quizAttempts, quizAttempts),
    });
    return state;
  }
  async function handle(req, res, url) {
    if (!url.pathname.startsWith('/api/demo/')) return false;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-File-Name');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return true;
    }
    try {
      if (url.pathname === '/api/demo/state') {
        if (req.method === 'GET') json(res, 200, state);
        else if (req.method === 'POST')
          json(
            res,
            200,
            teacherUpdate(
              JSON.parse((await readBody(req, 8 * 1024 * 1024)).toString()),
            ),
          );
        else json(res, 405, { error: 'method-not-allowed' });
      } else if (url.pathname === '/api/demo/student' && req.method === 'POST')
        json(
          res,
          200,
          studentUpdate(
            JSON.parse((await readBody(req, 8 * 1024 * 1024)).toString()),
          ),
        );
      else if (url.pathname === '/api/demo/upload' && req.method === 'POST') {
        const original = String(req.headers['x-file-name'] ?? '');
        const extension = extname(original).toLowerCase();
        if (!MIME[extension])
          throw Object.assign(new Error('unsupported-media'), { status: 415 });
        const bytes = await readBody(req, 100 * 1024 * 1024);
        if (!bytes.length)
          throw Object.assign(new Error('empty-file'), { status: 400 });
        const file = randomUUID() + extension;
        const temp = join(uploads, file + '.tmp');
        try {
          await writeFile(temp, bytes);
          renameSync(temp, join(uploads, file));
        } catch (error) {
          await unlink(temp).catch(() => {});
          throw error;
        }
        json(res, 201, {
          file: `/api/demo/media/${file}`,
          name: original,
          sizeMb: bytes.length / 1048576,
        });
      } else if (url.pathname.startsWith('/api/demo/media/')) {
        const file = url.pathname.slice('/api/demo/media/'.length);
        if (!/^[a-f0-9-]{36}\.[a-z0-9]+$/.test(file) || !MIME[extname(file)])
          throw Object.assign(new Error('not-found'), { status: 404 });
        const path = join(uploads, file);
        if (!existsSync(path))
          throw Object.assign(new Error('not-found'), { status: 404 });
        const size = statSync(path).size;
        const range = req.headers.range;
        const headers = {
          'Content-Type': MIME[extname(file)],
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'private, max-age=3600',
        };
        if (range) {
          const match = /^bytes=(\d*)-(\d*)$/.exec(range);
          let start = match?.[1] ? Number(match[1]) : 0;
          let end = match?.[2] ? Number(match[2]) : size - 1;
          if (match && !match[1] && match[2]) {
            start = Math.max(0, size - Number(match[2]));
            end = size - 1;
          }
          end = Math.min(end, size - 1);
          if (!match || start >= size || start > end) {
            res.writeHead(416, { 'Content-Range': `bytes */${size}` });
            res.end();
            return true;
          }
          res.writeHead(206, {
            ...headers,
            'Content-Length': end - start + 1,
            'Content-Range': `bytes ${start}-${end}/${size}`,
          });
          createReadStream(path, { start, end }).pipe(res);
        } else {
          res.writeHead(200, { ...headers, 'Content-Length': size });
          createReadStream(path).pipe(res);
        }
      } else if (url.pathname.startsWith('/api/demo/pdfjs/')) {
        const file = url.pathname.split('/').pop();
        if (!['pdf.mjs', 'pdf.worker.mjs'].includes(file))
          throw Object.assign(new Error('not-found'), { status: 404 });
        const path = join(
          dirname(require.resolve('pdfjs-dist/package.json')),
          'legacy/build',
          file,
        );
        res.writeHead(200, { 'Content-Type': 'text/javascript' });
        createReadStream(path).pipe(res);
      } else if (url.pathname === '/api/demo/pdf-viewer') {
        const file = url.searchParams.get('file') ?? '';
        if (!/^\/api\/demo\/media\/[a-f0-9-]{36}\.pdf$/.test(file))
          throw Object.assign(new Error('invalid-file'), { status: 400 });
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(pdfViewer(file));
      } else json(res, 404, { error: 'not-found' });
    } catch (error) {
      if (!res.headersSent)
        json(res, error.status ?? 400, {
          error: error.message ?? 'invalid-request',
        });
      else res.end();
    }
    return true;
  }
  return {
    handle,
    get state() {
      return state;
    },
  };
}
function pdfViewer(file) {
  return `<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#F1E9F4;font-family:system-ui;color:#291E2B}header{position:sticky;top:0;padding:10px;background:white;display:flex;justify-content:center;gap:20px;z-index:2}button{padding:8px 18px;background:#68234F;color:white;border:0;border-radius:8px}canvas{display:block;margin:12px auto;max-width:none;box-shadow:0 1px 6px #291e2b22}#pages{overflow:auto}</style><header><button id="less" aria-label="Zoom out">−</button><span id="zoom">100%</span><button id="more" aria-label="Zoom in">+</button></header><main id="pages"></main><p id="error"></p><script type="module">import * as pdfjs from '/api/demo/pdfjs/pdf.mjs';pdfjs.GlobalWorkerOptions.workerSrc='/api/demo/pdfjs/pdf.worker.mjs';let scale=1,revision=0;const doc=await pdfjs.getDocument({url:${JSON.stringify(file)}}).promise.catch(e=>{document.querySelector('#error').textContent=e.message;throw e});async function render(){const current=++revision;const pages=document.querySelector('#pages');pages.replaceChildren();document.querySelector('#zoom').textContent=Math.round(scale*100)+'%';for(let n=1;n<=doc.numPages;n++){if(current!==revision)return;const page=await doc.getPage(n);const base=page.getViewport({scale:1});const view=page.getViewport({scale:(innerWidth-24)/base.width*scale});const canvas=document.createElement('canvas');canvas.width=view.width*devicePixelRatio;canvas.height=view.height*devicePixelRatio;canvas.style.width=view.width+'px';canvas.style.height=view.height+'px';pages.append(canvas);await page.render({canvasContext:canvas.getContext('2d'),viewport:view,transform:[devicePixelRatio,0,0,devicePixelRatio,0,0]}).promise;}}document.querySelector('#less').onclick=()=>{scale=Math.max(1,scale-.25);render()};document.querySelector('#more').onclick=()=>{scale=Math.min(4,scale+.25);render()};render();</script></html>`;
}
