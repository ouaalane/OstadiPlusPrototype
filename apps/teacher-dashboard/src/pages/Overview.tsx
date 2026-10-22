import { useI18n } from '@/i18n/useI18n';
import { translate as t, relativeTime } from '@/i18n/locale';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpLeft,
  BookOpen,
  Check,
  ChevronLeft,
  Clock3,
  FileText,
  Film,
  ListChecks,
  MessageCircle,
  Plus,
  RefreshCw,
  Upload,
  Users,
} from 'lucide-react';
import {
  activeStudentCount,
  allLessons,
  countLessons,
  isQuestionAnswered,
} from '@ostadiplus/shared';
import { CourseCover, EmptyState } from '@/components/ui';
import { useStore } from '@/store/DemoStore';

export default function Overview() {
  useI18n();
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
      label: t('الدورات المنشورة'),
      value: published.length,
      detail: t('{0} دورات في مساحتك', [state.courses.length]),
      icon: BookOpen,
      to: '/courses',
    },
    {
      label: t('التلاميذ النشطون'),
      value: activeStudentCount(state),
      detail: t('باشتراك مفعّل'),
      icon: Users,
      to: '/students',
    },
    {
      label: t('الدروس المنشورة'),
      value: lessons.filter((l) => l.published).length,
      detail: t('من أصل {0} درس', [lessons.length]),
      icon: Film,
      to: '/library',
    },
    {
      label: t('محاولات الاختبار'),
      value: (state.quizAttempts ?? []).length,
      detail: t('نتائج مزامنة من التطبيق'),
      icon: ListChecks,
      to: '/analytics',
    },
  ];
  const actions = [
    {
      title: t('رفع محتوى'),
      description: t('أضف فيديو، ملخّص PDF أو درساً مكتوباً.'),
      icon: Upload,
      to: '/library?action=upload',
    },
    {
      title: t('إنشاء اختبار'),
      description: t('جهّز الأسئلة والمدة، وتابع نتائج التلاميذ.'),
      icon: ListChecks,
      to: '/quizzes?action=new',
    },
    {
      title: t('إدارة الاشتراكات'),
      description: t('فعّل الوصول وحدّد مدة الاشتراك لكل تلميذ.'),
      icon: Users,
      to: '/students',
    },
  ];
  const kinds = [
    { kind: 'video', label: t('فيديوهات'), icon: Film },
    { kind: 'pdf', label: t('ملفات PDF'), icon: FileText },
    { kind: 'quiz', label: t('اختبارات'), icon: ListChecks },
    { kind: 'text', label: t('دروس مكتوبة'), icon: BookOpen },
  ];
  return (
    <div className="overview-page">
      <header className="dashboard-heading">
        <div>
          <p className="section-kicker">{t('فضاء الأستاذ')}</p>
          <h1 className="workspace-title">
            {t('مرحباً، ')}
            {state.teacher.name.replace(/^أ\.\s*/, '')}
            <span className="text-brand">.</span>
          </h1>
          <p className="workspace-subtitle">
            {t('كل ما تحتاجه للتدريس، في مساحة واحدة.')}
          </p>
        </div>
        <Link to="/courses?action=new" className="btn btn-primary">
          <Plus size={18} aria-hidden="true" />
          {t('إنشاء دورة')}
        </Link>
      </header>

      <section
        className="overview-metrics"
        aria-label={t('إحصائيات مساحة العمل')}
      >
        {metrics.map((m) => (
          <Link key={m.label} to={m.to} className="overview-metric">
            <div className="metric-topline">
              <span className="metric-icon">
                <m.icon size={20} strokeWidth={1.7} aria-hidden="true" />
              </span>
              <ArrowUpLeft
                size={16}
                className="text-muted"
                aria-hidden="true"
              />
            </div>
            <p className="metric-number">
              <span className="num">{m.value}</span>
            </p>
            <h2>{m.label}</h2>
            <p className="metric-detail">{m.detail}</p>
          </Link>
        ))}
      </section>

      <section
        aria-labelledby="quick-actions-title"
        className="overview-actions-section"
      >
        <div className="overview-section-heading">
          <h2 id="quick-actions-title">{t('ماذا تريد أن تنجز؟')}</h2>
          <span>{t('من الفكرة إلى التعلّم')}</span>
        </div>
        <div className="overview-actions">
          {actions.map((a) => (
            <Link key={a.to} to={a.to} className="overview-action">
              <span className="action-icon">
                <a.icon size={21} strokeWidth={1.7} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="action-title">{a.title}</span>
                <span className="action-description">{a.description}</span>
              </span>
              <ChevronLeft
                size={18}
                className="text-brand"
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
      </section>

      <div className="overview-workspace">
        <div className="overview-primary">
          <section
            className="workspace-panel recent-courses"
            aria-labelledby="recent-courses-title"
          >
            <header className="panel-heading">
              <div>
                <h2 id="recent-courses-title">{t('واصل العمل على دوراتك')}</h2>
                <p className="panel-description">
                  {t('آخر الدورات التي حدّثتها في مساحتك')}
                </p>
              </div>
              <Link to="/courses" className="text-link">
                {t('كل الدورات ')}
                <ArrowLeft size={15} aria-hidden="true" />
              </Link>
            </header>
            {recent.length ? (
              <div className="recent-course-grid">
                {recent.map((c) => (
                  <article key={c.id} className="recent-course-card">
                    <Link
                      to={`/courses/${c.id}`}
                      className="recent-course-cover"
                      aria-label={t('فتح {0}', [c.title])}
                    >
                      <CourseCover
                        cover={c.cover}
                        subject={c.subject}
                        compact
                        className="h-full w-full"
                      />
                      <span className="recent-course-subject">{c.subject}</span>
                    </Link>
                    <div className="recent-course-body">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span
                          className="status-label"
                          data-draft={c.status === 'draft'}
                        >
                          {c.status === 'published' ? t('منشورة') : t('مسودة')}
                        </span>
                        <span className="course-updated">
                          <Clock3 size={13} aria-hidden="true" />
                          {relativeTime(c.updatedAt)}
                        </span>
                      </div>
                      <h3>
                        <Link to={`/courses/${c.id}`}>
                          <bdi>{c.title}</bdi>
                        </Link>
                      </h3>
                      <p className="course-level">{c.level}</p>
                      <div className="recent-course-footer">
                        <span>
                          <BookOpen size={15} aria-hidden="true" />
                          <span className="num">{countLessons(c)}</span>
                          {t(' درس')}
                        </span>
                        <Link
                          to={`/courses/${c.id}`}
                          className="text-link"
                          aria-label={t('إدارة {0}', [c.title])}
                        >
                          {t('إدارة الدورة')}{' '}
                          <ArrowUpLeft size={15} aria-hidden="true" />
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="p-6">
                <EmptyState
                  icon={<BookOpen size={26} />}
                  title={t('ابدأ بأول دورة')}
                  description={t('أضف دورتك، ثم رتّب الفصول والدروس.')}
                  action={
                    <Link to="/courses?action=new" className="btn btn-primary">
                      {t('إنشاء دورة')}
                    </Link>
                  }
                />
              </div>
            )}
          </section>

          <section
            className="workspace-panel"
            aria-labelledby="content-summary-title"
          >
            <header className="panel-heading">
              <div>
                <h2 id="content-summary-title">{t('محتواك التعليمي')}</h2>
                <p className="panel-description">
                  {t('توزيع المحتوى في جميع دوراتك')}
                </p>
              </div>
              <Link to="/library" className="text-link">
                {t('إدارة المحتوى ')}
                <ArrowLeft size={15} aria-hidden="true" />
              </Link>
            </header>
            <div className="content-summary">
              {kinds.map((k) => {
                const count = lessons.filter((l) => l.kind === k.kind).length;
                return (
                  <Link
                    key={k.kind}
                    to={
                      k.kind === 'quiz' ? '/quizzes' : `/library?kind=${k.kind}`
                    }
                    className="content-summary-row"
                  >
                    <span className="content-kind-icon">
                      <k.icon size={18} strokeWidth={1.7} aria-hidden="true" />
                    </span>
                    <span className="content-kind-label">{k.label}</span>
                    <span className="content-kind-track" aria-hidden="true">
                      <span
                        style={{
                          width: `${lessons.length ? (count / lessons.length) * 100 : 0}%`,
                        }}
                      />
                    </span>
                    <span className="num content-kind-count">{count}</span>
                    <ArrowUpLeft
                      size={14}
                      className="text-muted"
                      aria-hidden="true"
                    />
                  </Link>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="overview-secondary">
          <section
            className="workspace-panel attention-panel"
            aria-labelledby="attention-title"
          >
            <header className="panel-heading">
              <h2 id="attention-title">{t('يحتاج اهتمامك')}</h2>
              <span className="attention-count num">
                {questions.length + pending.length}
              </span>
            </header>
            <div className="attention-list">
              <Link to="/questions" className="attention-item">
                <span className="action-icon">
                  <MessageCircle size={20} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="action-title">{t('أسئلة التلاميذ')}</span>
                  <span className="action-description">
                    {questions.length
                      ? t('{0} أسئلة تنتظر جوابك', [questions.length])
                      : t('أجبت على كل الأسئلة')}
                  </span>
                </span>
                <ChevronLeft size={16} aria-hidden="true" />
              </Link>
              <Link to="/students" className="attention-item">
                <span className="action-icon">
                  <Users size={20} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="action-title">{t('طلبات التفعيل')}</span>
                  <span className="action-description">
                    {pending.length
                      ? t('{0} طلبات قيد المراجعة', [pending.length])
                      : t('لا طلبات جديدة')}
                  </span>
                </span>
                <ChevronLeft size={16} aria-hidden="true" />
              </Link>
            </div>
            <Link to="/sync" className="publish-reminder">
              <RefreshCw size={19} aria-hidden="true" />
              <span>
                <strong>{t('جاهز لتشارك جديدك؟')}</strong>
                <span>{t('انشر التحديثات لتصل إلى تطبيق التلميذ.')}</span>
              </span>
              <ArrowUpLeft size={16} aria-hidden="true" />
            </Link>
          </section>
          <section className="workspace-panel" aria-labelledby="activity-title">
            <header className="panel-heading">
              <h2 id="activity-title">{t('آخر النشاط')}</h2>
              <Clock3 size={17} className="text-muted" aria-hidden="true" />
            </header>
            <ol className="activity-timeline">
              {state.activity.slice(0, 4).map((e) => (
                <li key={e.id}>
                  <span className="activity-marker">
                    <Check size={12} aria-hidden="true" />
                  </span>
                  <div>
                    <p>{t(e.text)}</p>
                    <time>{relativeTime(e.at)}</time>
                  </div>
                </li>
              ))}
            </ol>
            {!state.activity.length ? (
              <p className="p-6 text-sm text-muted">
                {t('سيظهر نشاطك هنا عند إضافة المحتوى أو تحديثه.')}
              </p>
            ) : null}
          </section>
        </aside>
      </div>
    </div>
  );
}
