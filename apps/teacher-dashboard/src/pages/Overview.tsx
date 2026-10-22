import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Clock3, Plus, Users } from 'lucide-react';
import {
  activeStudentCount,
  allLessons,
  courseDurationSec,
  countLessons,
  relativeTime,
  isQuestionAnswered,
} from '@ostadiplus/shared';
import { CourseCover, EmptyState, Pill, StatCard } from '@/components/ui';
import { useStore } from '@/store/DemoStore';

const ACTIVITY_ICON = {
  course: BookOpen,
  lesson: BookOpen,
  student: Users,
} as const;

export default function Overview() {
  const { state } = useStore();
  const navigate = useNavigate();

  const published = useMemo(
    () => state.courses.filter((c) => c.status === 'published'),
    [state.courses],
  );

  const lessonCount = useMemo(
    () =>
      published.reduce(
        (sum, course) => sum + allLessons(course).filter((l) => l.published).length,
        0,
      ),
    [published],
  );

  const activeStudents = useMemo(() => activeStudentCount(state), [state]);
  const pending = state.enrollments.filter((e) => e.status === 'pending').length;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'صباح الخير' : hour < 18 ? 'طاب يومك' : 'مساء الخير';

  const today = new Intl.DateTimeFormat('ar-MA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  const recentCourses = state.courses
    .slice()
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
    .slice(0, 4);

  return (
    <>
      <section className="mb-6 grid gap-5 rounded-3xl border border-line bg-white p-6 sm:p-8 lg:grid-cols-[1fr_auto]">
        <div><p className="text-xs font-semibold text-muted">{today}</p><p className="mt-3 text-xs font-bold text-brand">إدارة التعلّم · oustadi plus</p><h1 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">{greeting}، {state.teacher.name}</h1><p className="mt-3 max-w-xl text-sm text-muted">محتوى منظّم، تواصل أقرب، وتقدّم واضح. كل ما يحتاجه تلاميذك من مكان واحد.</p><p className="mt-2 text-xs text-muted">{state.teacher.centerName} · {state.teacher.centerCity}</p></div>
        <div className="flex flex-col justify-center gap-3"><button className="btn btn-primary" onClick={()=>navigate('/courses?action=new')}><Plus size={17}/>إنشاء دورة جديدة</button><Link className="btn btn-outline" to="/sync">مزامنة مع تطبيق التلميذ</Link></div>
      </section>

      {/* Metrics */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="دورات منشورة"
          value={published.length}
          hint={`من أصل ${state.courses.length}`}
          icon={<BookOpen size={20} />}
        />
        <StatCard
          label="تلاميذ نشطون"
          value={activeStudents}
          hint={pending > 0 ? `${pending} بانتظار التفعيل` : undefined}
          tone="success"
          icon={<Users size={20} />}
        />
        <StatCard
          label="دروس متاحة"
          value={lessonCount}
          tone="accent"
          icon={<Clock3 size={20} />}
        />
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-3" aria-label="مهام اليوم">
        {[{to:'/questions',label:'أسئلة بانتظار جواب',count:(state.questions??[]).filter(q=>!isQuestionAnswered(q)).length},{to:'/students',label:'طلبات وصول بانتظار التفعيل',count:pending},{to:'/courses',label:'دورات قيد التحضير',count:state.courses.filter(c=>c.status==='draft').length}].map(item=><Link key={item.to} to={item.to} className="card flex items-center justify-between gap-3 p-4 transition-shadow hover:shadow-raised"><span className="text-sm font-semibold">{item.label}</span><span className="num flex h-9 min-w-9 items-center justify-center rounded-xl bg-accent-soft px-2 font-bold text-brand">{item.count}</span></Link>)}
      </section>
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-5">
        {/* Courses */}
        <section className="lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold">دوراتك</h2>
            <Link
              to="/courses"
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:text-brand-dark"
            >
              عرض الكل
              <ArrowLeft size={15} />
            </Link>
          </div>

          {recentCourses.length === 0 ? (
            <EmptyState
              icon={<BookOpen size={24} />}
              title="لا توجد دورات بعد"
              description="أنشئ أول دورة لتبدأ في نشرها لتلاميذك."
              action={
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => navigate('/courses?action=new')}
                >
                  <Plus size={17} />
                  إنشاء دورة
                </button>
              }
            />
          ) : (
            <ul className="space-y-3">
              {recentCourses.map((course) => (
                <li key={course.id}>
                  <Link
                    to={`/courses/${course.id}`}
                    className="card group flex items-stretch gap-0 overflow-hidden p-0 transition-shadow hover:shadow-raised"
                  >
                    <CourseCover
                      cover={course.cover}
                      subject={course.subject}
                      className="w-24 shrink-0 sm:w-28"
                    >
                      <span className="num text-lg font-bold text-white">
                        {countLessons(course)}
                      </span>
                    </CourseCover>
                    <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="truncate text-[15px] font-bold leading-snug">
                          {course.title}
                        </h3>
                        <Pill
                          tone={course.status === 'published' ? 'success' : 'warning'}
                          dot
                        >
                          {course.status === 'published' ? 'منشورة' : 'مسودة'}
                        </Pill>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                        <span>{course.level}</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock3 size={13} />
                          <span className="num">
                            {Math.round(courseDurationSec(course) / 60)}
                          </span>
                          دقيقة
                        </span>
                        <span className="num">
                          {activeStudentCount(state, course.id)}
                        </span>
                        تلميذ
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Activity */}
        <section className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold">آخر النشاط</h2>
          </div>
          <div className="card p-4">
            {state.activity.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">
                لا توجد نشاطات بعد.
              </p>
            ) : (
              <ol className="relative space-y-4">
                {state.activity
                  .slice(0, 7)
                  .map((event) => {
                    const Icon =
                      ACTIVITY_ICON[event.kind as keyof typeof ACTIVITY_ICON] ?? BookOpen;
                    return (
                    <li key={event.id} className="flex gap-3">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-softer text-brand">
                        <Icon size={15} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] leading-relaxed text-body">
                          {event.text}
                        </p>
                        <span className="text-xs text-faint">
                          {relativeTime(event.at)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
