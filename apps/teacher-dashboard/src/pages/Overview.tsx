import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpLeft,
  BookOpen,
  Check,
  ChevronLeft,
  CircleHelp,
  Clock3,
  FileText,
  Film,
  ListChecks,
  MessageCircle,
  Plus,
  Upload,
  Users,
} from 'lucide-react';
import {
  activeStudentCount,
  allLessons,
  countLessons,
  isQuestionAnswered,
  relativeTime,
} from '@ostadiplus/shared';
import { CourseCover } from '@/components/ui';
import { useStore } from '@/store/DemoStore';

export default function Overview() {
  const { state } = useStore();
  const published = state.courses.filter((c) => c.status === 'published');
  const lessons = state.courses.flatMap((c) => allLessons(c));
  const questions = (state.questions ?? []).filter(
    (q) => !isQuestionAnswered(q),
  );
  const pending = state.enrollments.filter(
    (e) => e.status === 'pending' || e.status === 'requested',
  );
  const recent = [...state.courses]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 4);
  const metrics = [
    {
      label: 'الدورات المنشورة',
      value: published.length,
      detail: `${state.courses.length} دورات في مساحتك`,
      icon: BookOpen,
    },
    {
      label: 'التلاميذ النشطون',
      value: activeStudentCount(state),
      detail: 'باشتراك مفعّل',
      icon: Users,
    },
    {
      label: 'الدروس المنشورة',
      value: lessons.filter((l) => l.published).length,
      detail: `من أصل ${lessons.length} درس`,
      icon: Film,
    },
    {
      label: 'محاولات الاختبار',
      value: (state.quizAttempts ?? []).length,
      detail: 'نتائج مزامنة من التطبيق',
      icon: ListChecks,
    },
  ];
  const kinds = [
    { kind: 'video', label: 'فيديوهات', icon: Film },
    { kind: 'pdf', label: 'ملفات PDF', icon: FileText },
    { kind: 'quiz', label: 'اختبارات', icon: ListChecks },
    { kind: 'text', label: 'دروس مكتوبة', icon: BookOpen },
  ];
  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="section-kicker">فضاء الأستاذ</p>
          <h1 className="workspace-title">
            مرحباً، {state.teacher.name.replace(/^أ\.\s*/, '')}
            <span className="text-brand">.</span>
          </h1>
          <p className="workspace-subtitle">
            هذه مساحتك لصناعة الدروس، ومتابعة التلاميذ، وتطوير تجربة تعلّمهم.
          </p>
        </div>
        <Link to="/courses?action=new" className="btn btn-primary">
          <Plus size={16} />
          إنشاء دورة
        </Link>
      </div>
      <section
        className="workspace-panel mb-7 grid grid-cols-2 lg:grid-cols-4"
        aria-label="إحصائيات مساحة العمل"
      >
        {metrics.map((m) => (
          <div key={m.label} className="workspace-metric">
            <div className="mb-4 flex items-center justify-between gap-2 text-muted">
              <span className="text-[11px]">{m.label}</span>
              <m.icon size={16} strokeWidth={1.5} />
            </div>
            <p className="metric-number num">{m.value}</p>
            <p className="mt-2 text-[10px] text-muted">{m.detail}</p>
          </div>
        ))}
      </section>
      <section className="creation-strip mb-8" aria-label="إضافة محتوى تعليمي">
        <div className="flex-1">
          <span className="mb-2 inline-flex rounded-md bg-white/70 px-2 py-1 text-[9px] font-bold text-brand">
            ابدأ من فكرة
          </span>
          <h2 className="text-xl font-bold">درس جديد. فرصة جديدة للتعلّم.</h2>
          <p className="mt-2 text-[11px] leading-6 text-muted">
            ارفع شرحك، أرفق ملخّصاً، أو حضّر اختباراً. كل المحتوى في مكان واحد.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/library?action=upload" className="btn btn-outline">
            <Upload size={16} />
            رفع محتوى
          </Link>
          <Link to="/quizzes?action=new" className="btn btn-outline">
            <ListChecks size={16} />
            إنشاء اختبار
          </Link>
        </div>
        <div className="creation-decoration" aria-hidden="true">
          <BookOpen size={100} strokeWidth={0.65} />
          <span>+</span>
        </div>
      </section>
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="workspace-panel min-w-0">
          <header className="panel-heading">
            <div>
              <h2>دوراتك، قيد التطوير</h2>
              <p className="mt-1 text-[10px] text-muted">
                واصل من آخر تحديث للمحتوى
              </p>
            </div>
            <Link
              className="flex items-center gap-2 text-[11px] font-bold text-brand"
              to="/courses"
            >
              كل الدورات
              <ArrowLeft size={14} />
            </Link>
          </header>
          <div className="overflow-x-auto">
            <table className="workspace-table min-w-[540px]">
              <thead>
                <tr>
                  <th>الدورة</th>
                  <th>المحتوى</th>
                  <th>الحالة</th>
                  <th>
                    <span className="sr-only">فتح الدورة</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {recent.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link
                        to={`/courses/${c.id}`}
                        className="flex items-center gap-3"
                      >
                        <CourseCover
                          cover={c.cover}
                          subject={c.subject}
                          compact
                          className="h-12 w-14 shrink-0 rounded-lg"
                        />
                        <span className="min-w-0">
                          <span className="table-course-title block max-w-64 truncate font-bold">
                            {c.title}
                          </span>
                          <span className="mt-1 block text-[10px] text-muted">
                            {c.level}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td>
                      <span className="num">{countLessons(c)}</span> درس
                      <p className="mt-1 text-[9px] text-muted">
                        {relativeTime(c.updatedAt)}
                      </p>
                    </td>
                    <td>
                      <span
                        className={`status-label ${c.status === 'draft' ? 'is-draft' : ''}`}
                      >
                        {c.status === 'published' ? 'منشورة' : 'مسودة'}
                      </span>
                    </td>
                    <td>
                      <Link
                        to={`/courses/${c.id}`}
                        className="flex size-8 items-center justify-center rounded-lg border border-line hover:bg-surface-alt"
                        aria-label={`إدارة ${c.title}`}
                      >
                        <ArrowUpLeft size={15} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!recent.length ? (
              <div className="p-10 text-center text-sm text-muted">
                أنشئ أول دورة، وابدأ بإضافة دروسك.
              </div>
            ) : null}
          </div>
        </section>
        <aside className="workspace-panel">
          <header className="panel-heading">
            <h2>بانتظارك اليوم</h2>
            <span className="num rounded-md bg-brand-soft px-2 py-1 text-[10px] text-brand">
              {questions.length + pending.length}
            </span>
          </header>
          <div className="p-5">
            <Link
              to="/questions"
              className="flex items-center gap-3 border-b border-line pb-5"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <MessageCircle size={19} />
              </span>
              <span className="flex-1">
                <span className="block text-xs font-bold">
                  أسئلة تحتاج جوابك
                </span>
                <span className="mt-1 block text-[10px] text-muted">
                  {questions.length
                    ? `${questions.length} أسئلة من تلاميذك`
                    : 'أجبت على كل الأسئلة'}
                </span>
              </span>
              <ChevronLeft size={15} />
            </Link>
            <Link to="/students" className="flex items-center gap-3 py-5">
              <span className="flex size-10 items-center justify-center rounded-xl bg-accent/40 text-brand">
                <Users size={19} />
              </span>
              <span className="flex-1">
                <span className="block text-xs font-bold">طلبات التفعيل</span>
                <span className="mt-1 block text-[10px] text-muted">
                  {pending.length
                    ? `${pending.length} طلبات قيد المراجعة`
                    : 'لا طلبات جديدة'}
                </span>
              </span>
              <ChevronLeft size={15} />
            </Link>
            <Link
              to="/sync"
              className="mt-1 flex items-start gap-2 rounded-lg border border-line bg-surface-alt/40 p-3 text-[10px] leading-6 text-muted"
            >
              <CircleHelp size={15} className="mt-1 shrink-0" />
              <span>
                بعد حفظ التعديلات، انشرها من صفحة المزامنة لتصل إلى تطبيق
                التلميذ.
              </span>
            </Link>
          </div>
        </aside>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="workspace-panel">
          <header className="panel-heading">
            <h2>مكتبة متنوّعة، تعلّم متكامل</h2>
            <Link to="/library" className="text-[11px] text-brand">
              إدارة المحتوى
              <ArrowUpLeft size={13} className="ms-1 inline" />
            </Link>
          </header>
          <div className="grid grid-cols-2 gap-5 p-6 sm:grid-cols-4">
            {kinds.map((k) => {
              const count = lessons.filter((l) => l.kind === k.kind).length;
              return (
                <Link
                  to={
                    k.kind === 'quiz' ? '/quizzes' : `/library?kind=${k.kind}`
                  }
                  key={k.kind}
                  className="rounded-lg p-2 hover:bg-surface-alt"
                >
                  <k.icon
                    size={21}
                    strokeWidth={1.4}
                    className="mb-3 text-brand"
                  />
                  <span className="num text-2xl">{count}</span>
                  <p className="mt-1 text-[10px] text-muted">{k.label}</p>
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-brand-soft">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{
                        width: `${lessons.length ? (count / lessons.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
        <section className="workspace-panel">
          <header className="panel-heading">
            <h2>آخر النشاط</h2>
            <Clock3 size={15} className="text-muted" />
          </header>
          <ol className="space-y-4 p-5">
            {state.activity.slice(0, 3).map((e) => (
              <li key={e.id} className="flex gap-3">
                <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <Check size={10} />
                </span>
                <div>
                  <p className="line-clamp-2 text-[10px] leading-6">{e.text}</p>
                  <span className="text-[9px] text-muted">
                    {relativeTime(e.at)}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}
