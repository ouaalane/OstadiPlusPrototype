import { useMemo, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Clock3,
  Megaphone,
  Plus,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  activeStudentCount,
  allLessons,
  courseDurationSec,
  countLessons,
  formatDate,
  relativeTime,
} from '@ostadiplus/shared';
import {
  Avatar,
  CourseCover,
  EmptyState,
  PageHeader,
  Pill,
  StatCard,
} from '@/components/ui';
import { useStore } from '@/store/DemoStore';

const ACTIVITY_ICON = {
  course: BookOpen,
  lesson: BookOpen,
  student: Users,
  announcement: Megaphone,
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
      <PageHeader
        title={`${greeting}، ${state.teacher.name}`}
        description={`${today} · ${state.teacher.centerName}، ${state.teacher.centerCity}`}
        actions={
          <>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => navigate('/announcements?action=new')}
            >
              <Megaphone size={17} />
              إعلان جديد
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate('/courses?action=new')}
            >
              <Plus size={17} />
              إنشاء دورة
            </button>
          </>
        }
      />

      {/* Metrics */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="دورات منشورة"
          value={published.length}
          hint={`من أصل ${state.courses.length} دورات`}
          icon={<BookOpen size={20} />}
        />
        <StatCard
          label="تلاميذ نشطون"
          value={activeStudents}
          hint={
            pending > 0
              ? `${pending} طلب في انتظار التفعيل`
              : 'كل الطلبات معالَجة'
          }
          tone="success"
          icon={<Users size={20} />}
        />
        <StatCard
          label="دروس متاحة"
          value={lessonCount}
          hint="فيديو ومستندات داخل الدورات المنشورة"
          tone="accent"
          icon={<Clock3 size={20} />}
        />
      </section>

      {/* Shortcuts */}
      <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <ShortcutCard
          icon={<Plus size={18} />}
          title="إنشاء دورة"
          hint="ابدأ بعنوان وفصول"
          onClick={() => navigate('/courses?action=new')}
        />
        <ShortcutCard
          icon={<UserPlus size={18} />}
          title="تفعيل طالب"
          hint="امنح تلميذاً وصولاً"
          onClick={() => navigate('/students?action=new')}
        />
        <ShortcutCard
          icon={<Megaphone size={18} />}
          title="نشر إعلان"
          hint="يصل لتطبيق التلاميذ"
          onClick={() => navigate('/announcements?action=new')}
        />
        <ShortcutCard
          icon={<BookOpen size={18} />}
          title="إدارة المحتوى"
          hint="فصول ودروس وملفات"
          onClick={() => navigate('/courses')}
        />
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
              description="أنشئ أول دورة وأضف فصولها ودروسها لتبدأ في نشرها لتلاميذك."
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
                {state.activity.slice(0, 7).map((event) => {
                  const Icon = ACTIVITY_ICON[event.kind];
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

          <div className="card mt-4 flex items-center gap-3 p-4">
            <Avatar label={state.teacher.monogram} size={44} seed={2} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-ink">
                {state.teacher.name}
              </div>
              <div className="truncate text-xs text-muted">
                {state.teacher.subject} · {state.teacher.level}
              </div>
            </div>
            <Link to="/settings" className="btn btn-ghost btn-sm">
              تعديل
            </Link>
          </div>
        </section>
      </div>

      <p className="mt-6 text-center text-xs text-faint">
        آخر تحديث: {formatDate(new Date().toISOString())}
      </p>
    </>
  );
}

function ShortcutCard({
  icon,
  title,
  hint,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="card group flex items-center gap-3 px-4 py-3.5 text-start transition-shadow hover:shadow-raised"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-dark transition-colors group-hover:bg-brand group-hover:text-white">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold text-ink">{title}</span>
        <span className="block truncate text-xs text-muted">{hint}</span>
      </span>
    </button>
  );
}
