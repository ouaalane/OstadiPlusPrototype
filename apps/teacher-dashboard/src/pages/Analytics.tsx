import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, CheckCircle2, Clock3, Users } from 'lucide-react';
import { accessibleCourses, allLessons } from '@ostadiplus/shared';
import { EmptyState, ProgressBar } from '@/components/ui';
import { useStore } from '@/store/DemoStore';
export default function Analytics() {
  const { state } = useStore();
  const [query, setQuery] = useState('');
  const attempts = state.quizAttempts ?? [];
  const rows = state.students.map((student) => {
    const courses = accessibleCourses(state, student.id);
    const ids = new Set(
      courses.flatMap((c) =>
        allLessons(c)
          .filter((l) => l.published)
          .map((l) => l.id),
      ),
    );
    const progress = (state.progress[student.id] ?? []).filter((p) =>
      ids.has(p.lessonId),
    );
    const completed = progress.filter((p) => p.completed).length;
    const own = attempts.filter((a) => a.studentId === student.id);
    return {
      student,
      courses: courses.length,
      total: ids.size,
      completed,
      percent: ids.size ? Math.round((completed / ids.size) * 100) : 0,
      minutes: Math.round(progress.reduce((n, p) => n + p.positionSec, 0) / 60),
      attempts: own.length,
      score: own.length
        ? Math.round(
            (own.reduce((n, a) => n + (a.total ? a.correct / a.total : 0), 0) /
              own.length) *
              100,
          )
        : null,
    };
  });
  const visible = rows.filter((r) =>
    `${r.student.fullName} ${r.student.studentCode} ${r.student.level}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  return (
    <>
      <div className="mb-8">
        <p className="section-kicker">من المحتوى إلى الأثر</p>
        <h1 className="workspace-title">التقدّم والنتائج</h1>
        <p className="workspace-subtitle">
          شوف فين وصل كل تلميذ، وتابع نتائج الاختبارات المزامنة من التطبيق.
        </p>
      </div>
      <section className="workspace-panel mb-6 grid grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: 'تلاميذ لديهم وصول',
            value: rows.filter((r) => r.courses > 0).length,
            icon: Users,
          },
          {
            label: 'دروس مكتملة',
            value: rows.reduce((n, r) => n + r.completed, 0),
            icon: CheckCircle2,
          },
          {
            label: 'مجموع مواضع المشاهدة (دقائق)',
            value: rows.reduce((n, r) => n + r.minutes, 0),
            icon: Clock3,
          },
          {
            label: 'محاولات الاختبار',
            value: attempts.length,
            icon: BarChart3,
          },
        ].map((m) => (
          <div key={m.label} className="workspace-metric">
            <div className="mb-4 flex items-center justify-between gap-2 text-muted">
              <span className="text-[10px]">{m.label}</span>
              <m.icon size={16} strokeWidth={1.5} />
            </div>
            <p className="metric-number">
              <span className="num">{m.value}</span>
            </p>
          </div>
        ))}
      </section>
      <section className="workspace-panel p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold">متابعة التلاميذ</h2>
          <input
            className="input max-w-sm"
            aria-label="البحث في النتائج"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="اسم التلميذ أو رمزه…"
          />
        </div>
        {visible.length ? (
          <div className="overflow-x-auto">
            <table
              className="workspace-table min-w-[650px]"
              aria-label="تقدّم التلاميذ ونتائجهم"
            >
              <thead>
                <tr>
                  {[
                    'التلميذ',
                    'الدورات',
                    'التقدّم',
                    'موضع المشاهدة',
                    'الاختبارات',
                    'متوسط النتيجة',
                  ].map((label) => (
                    <th
                      key={label}
                      scope="col"
                      className="px-4 py-3 text-start font-bold"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr
                    key={row.student.id}
                    className="border-b border-line last:border-0"
                  >
                    <td className="px-4 py-4">
                      <p className="font-bold">{row.student.fullName}</p>
                      <span className="num text-xs text-muted">
                        {row.student.studentCode}
                      </span>
                    </td>
                    <td className="px-4 py-4">{row.courses}</td>
                    <td className="min-w-40 px-4 py-4">
                      {row.total ? (
                        <>
                          <div className="mb-2 flex justify-between text-xs">
                            <span>
                              {row.completed} / {row.total}
                            </span>
                            <span>{row.percent}%</span>
                          </div>
                          <ProgressBar
                            value={row.percent}
                            height={6}
                            label={`تقدّم ${row.student.fullName}`}
                          />
                        </>
                      ) : (
                        <span className="text-xs text-muted">
                          لا دروس متاحة
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">{row.minutes} د</td>
                    <td className="px-4 py-4">{row.attempts}</td>
                    <td className="px-4 py-4">
                      {row.score === null ? (
                        <span className="text-xs text-muted">لم يحاول بعد</span>
                      ) : (
                        `${row.score}%`
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<BarChart3 size={24} />}
            title={query.trim() ? 'لا توجد نتائج مطابقة' : 'لا يوجد تلاميذ بعد'}
            description={
              query.trim()
                ? 'جرّب اسماً أو رمزاً آخر، أو امسح البحث لعرض الجميع.'
                : 'اربط التلاميذ بالمركز لمتابعة تقدّمهم ونتائجهم هنا.'
            }
            action={
              query.trim() ? (
                <button
                  className="btn btn-outline"
                  onClick={() => setQuery('')}
                >
                  مسح البحث
                </button>
              ) : (
                <Link to="/students" className="btn btn-outline">
                  إدارة التلاميذ
                </Link>
              )
            }
          />
        )}
      </section>
      <p className="mt-3 text-xs leading-6 text-muted">
        موضع المشاهدة هو آخر موضع مسجّل في الدروس المتاحة، وليس الوقت الفعلي
        الذي قضاه التلميذ في المشاهدة.
      </p>
      <section className="workspace-panel mt-5 p-5">
        <h2 className="mb-4 text-sm font-bold">آخر محاولات الاختبار</h2>
        {attempts.length ? (
          <ul className="divide-y divide-line">
            {[...attempts]
              .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
              .slice(0, 12)
              .map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap justify-between gap-3 py-3"
                >
                  <span>
                    {state.students.find((s) => s.id === a.studentId)
                      ?.fullName ?? a.studentId}{' '}
                    ·{' '}
                    {state.courses
                      .flatMap((c) => allLessons(c))
                      .find((l) => l.id === a.lessonId)?.title ?? a.lessonId}
                  </span>
                  <span className="flex flex-wrap items-center gap-3">
                    <time
                      dateTime={a.submittedAt}
                      className="text-xs text-muted"
                    >
                      {new Date(a.submittedAt).toLocaleDateString('ar-MA')}
                    </time>
                    <span className="num font-bold text-brand">
                      {a.correct}/{a.total} · {a.elapsedSec}s
                    </span>
                  </span>
                </li>
              ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">
            ستظهر النتائج بعد أن يحلّ التلميذ اختباراً ويزامن التطبيق.
          </p>
        )}
      </section>
    </>
  );
}
