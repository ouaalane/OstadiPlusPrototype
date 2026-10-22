import { useI18n } from '@/i18n/useI18n';
import { translate as t } from '@/i18n/locale';
import { useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpLeft,
  BookOpen,
  ChartNoAxesCombined,
  ChevronLeft,
  CircleHelp,
  Files,
  LayoutDashboard,
  ListChecks,
  Menu,
  MessageCircle,
  RefreshCw,
  Search,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { allLessons, isQuestionAnswered } from '@ostadiplus/shared';
import { Wordmark } from './Logo';
import { Avatar, ToastHost } from './ui';
import { useStore } from '@/store/DemoStore';

const groups = [
  {
    label: 'مساحة العمل',
    items: [
      { to: '/', label: 'نظرة عامة', icon: LayoutDashboard, end: true },
      { to: '/courses', label: 'الدورات', icon: BookOpen },
      { to: '/library', label: 'مكتبة المحتوى', icon: Files },
      { to: '/quizzes', label: 'الاختبارات', icon: ListChecks },
    ],
  },
  {
    label: 'التعلّم والتواصل',
    items: [
      { to: '/students', label: 'التلاميذ والاشتراكات', icon: Users },
      { to: '/questions', label: 'الأسئلة والأجوبة', icon: MessageCircle },
      {
        to: '/analytics',
        label: 'التقدّم والنتائج',
        icon: ChartNoAxesCombined,
      },
    ],
  },
  {
    label: 'إدارة المركز',
    items: [
      { to: '/reception', label: 'استقبال التلاميذ', icon: CircleHelp },
      { to: '/sync', label: 'النشر والمزامنة', icon: RefreshCw },
      { to: '/settings', label: 'الإعدادات', icon: Settings },
    ],
  },
];
function Sidebar({ close }: { close: () => void }) {
  useI18n();
  const { state } = useStore();
  const unanswered = (state.questions ?? []).filter(
    (q) => !isQuestionAnswered(q),
  ).length;
  return (
    <div className="sidebar-content flex h-full flex-col">
      <div className="sidebar-brand flex items-center justify-between">
        <Link to="/" onClick={close} aria-label={t('oustadi plus — نظرة عامة')}>
          <Wordmark size={38} tone="light" />
        </Link>
        <button
          className="btn btn-icon btn-ghost lg:hidden"
          onClick={close}
          aria-label={t('إغلاق القائمة')}
        >
          <X size={19} />
        </button>
      </div>
      <Link to="/settings" onClick={close} className="sidebar-workspace">
        <span className="sidebar-workspace-icon">
          <BookOpen size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-bold">
            {state.teacher.centerName}
          </span>
          <span className="block text-[11px] text-muted">
            {t('مساحة الأستاذ')}
          </span>
        </span>
        <Settings size={14} className="text-muted" aria-hidden="true" />
      </Link>
      <nav
        className="sidebar-navigation flex-1 space-y-6 overflow-y-auto"
        aria-label={t('التنقل الرئيسي')}
      >
        {groups.map((g) => (
          <div key={g.label}>
            <p className="sidebar-group-label">{t(g.label)}</p>
            <div className="space-y-1">
              {g.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={'end' in item && item.end}
                  onClick={close}
                  className={({ isActive }) =>
                    `side-link ${isActive ? 'is-active' : ''}`
                  }
                >
                  <item.icon size={18} strokeWidth={1.7} aria-hidden="true" />
                  <span className="flex-1">{t(item.label)}</span>
                  {item.to === '/questions' && unanswered > 0 ? (
                    <span className="num flex size-5 items-center justify-center rounded-md bg-brand-soft text-[10px] text-brand">
                      {unanswered}
                    </span>
                  ) : null}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="sidebar-account">
        <Link to="/settings" onClick={close} className="sidebar-account-link">
          <Avatar label={state.teacher.monogram} size={35} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-bold">
              {state.teacher.name}
            </span>
            <span className="block text-[11px] text-muted">
              {t('حساب الأستاذ')}
            </span>
          </span>
          <Settings size={16} className="text-muted" />
        </Link>
      </div>
    </div>
  );
}
function WorkspaceSearch() {
  useI18n();
  const { state } = useStore();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLFormElement>(null);
  const location = useLocation();
  const resultsId = useId();
  const statusId = useId();
  useEffect(() => {
    setOpen(false);
    setQuery('');
  }, [location.pathname, location.search]);
  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);
  const needle = query.trim().toLowerCase();
  const results = needle
    ? state.courses
        .flatMap((c) => [
          {
            title: c.title,
            detail: t('دورة · ') + c.level,
            to: `/courses/${c.id}`,
          },
          ...allLessons(c).map((l) => ({
            title: l.title,
            detail: c.title,
            to: `/courses/${c.id}?lesson=${l.id}`,
          })),
        ])
        .filter((r) => r.title.toLowerCase().includes(needle))
        .slice(0, 7)
    : [];
  return (
    <form
      ref={root}
      role="search"
      aria-label={t('البحث في مساحة العمل')}
      className="relative w-full max-w-md"
      onSubmit={(event) => {
        event.preventDefault();
        root.current
          ?.querySelector<HTMLAnchorElement>('[data-search-result]')
          ?.click();
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setOpen(false);
      }}
    >
      <Search
        size={17}
        className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted"
      />
      <input
        dir="auto"
        aria-label={t('البحث في الدورات والدروس')}
        placeholder={t('ابحث عن دورة أو درس…')}
        className="workspace-search"
        autoComplete="off"
        aria-controls={open && needle ? resultsId : undefined}
        aria-describedby={open && needle ? statusId : undefined}
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            setOpen(false);
          }
        }}
      />
      <span id={statusId} role="status" className="sr-only">
        {open && needle
          ? results.length
            ? t(
                '{0} نتائج. اضغط Enter لفتح أول نتيجة أو Tab لاستعراض النتائج.',
                [results.length],
              )
            : t('لا توجد نتائج مطابقة.')
          : ''}
      </span>
      {open && needle ? (
        <div
          id={resultsId}
          className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-line bg-white p-2 shadow-raised"
          aria-label={t('نتائج البحث')}
        >
          {results.length ? (
            results.map((r) => (
              <Link
                key={r.to}
                data-search-result
                to={r.to}
                onClick={() => {
                  setOpen(false);
                  setQuery('');
                }}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-surface-alt"
              >
                <Search size={15} className="shrink-0 text-muted" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold">
                    <bdi>{r.title}</bdi>
                  </span>
                  <span className="block truncate text-[11px] text-muted">
                    {r.detail}
                  </span>
                </span>
                <ArrowUpLeft size={14} />
              </Link>
            ))
          ) : (
            <p className="p-4 text-sm text-muted">
              {t('ما لقيناش نتائج. جرّب كلمة أخرى.')}
            </p>
          )}
        </div>
      ) : null}
    </form>
  );
}
export function AppShell() {
  const { lang, setLang } = useI18n();
  const [drawer, setDrawer] = useState(false);
  const location = useLocation();
  const contentRef = useRef<HTMLElement>(null);
  useEffect(() => {
    setDrawer(false);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);
  useEffect(() => {
    if (!drawer) return;
    const previous = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const first = contentRef.current?.querySelector<HTMLElement>('a,button');
    first?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawer(false);
      if (e.key === 'Tab') {
        const items =
          contentRef.current?.querySelectorAll<HTMLElement>('a,button');
        if (!items?.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', key);
      previous?.focus();
    };
  }, [drawer]);
  const title =
    groups
      .flatMap((g) => g.items)
      .find((i) =>
        i.to === '/'
          ? location.pathname === '/'
          : location.pathname.startsWith(i.to),
      )?.label ?? t('مساحة العمل');
  return (
    <div className="workspace-shell">
      <a
        href="#workspace-content"
        className="skip-link"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('workspace-content')?.focus();
        }}
      >
        {t('الانتقال إلى المحتوى')}
      </a>
      <aside className="workspace-sidebar hidden lg:block">
        <Sidebar close={() => setDrawer(false)} />
      </aside>
      {drawer ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label={t('إغلاق القائمة')}
            className="absolute inset-0 bg-ink/40"
            onClick={() => setDrawer(false)}
          />
          <aside
            ref={contentRef}
            id="workspace-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={t('قائمة التنقل')}
            className="sidebar-drawer absolute inset-y-0 start-0 w-[280px] shadow-overlay"
          >
            <Sidebar close={() => setDrawer(false)} />
          </aside>
        </div>
      ) : null}
      <div className="workspace-main">
        <header className="workspace-topbar">
          <button
            className="btn btn-icon btn-ghost lg:hidden"
            onClick={() => setDrawer(true)}
            aria-label={t('فتح القائمة')}
            aria-expanded={drawer}
            aria-controls={drawer ? 'workspace-drawer' : undefined}
          >
            <Menu size={20} />
          </button>
          <div className="topbar-location hidden shrink-0 xl:flex">
            <span className="topbar-eyebrow">{t('مساحة الأستاذ')}</span>
            <div className="flex items-center gap-2">
              <Link to="/" className="text-muted">
                {t('مساحة العمل')}
              </Link>
              <ChevronLeft size={13} aria-hidden="true" />
              <span className="font-bold text-ink">{t(title)}</span>
            </div>
          </div>
          <div className="flex-1" />
          <WorkspaceSearch />
          <select
            className="input dashboard-language"
            aria-label={t('اللغة')}
            value={lang}
            onChange={(event) =>
              setLang(event.target.value as 'ar' | 'en' | 'fr')
            }
          >
            <option value="ar" lang="ar">
              العربية
            </option>
            <option value="en" lang="en">
              English
            </option>
            <option value="fr" lang="fr">
              Français
            </option>
          </select>
          <Link
            className="relative flex size-9 shrink-0 items-center justify-center rounded-lg border border-line hover:bg-surface-alt"
            to="/questions"
            aria-label={t('فتح أسئلة التلاميذ')}
          >
            <MessageCircle size={17} />
          </Link>
          <Link to="/sync" className="btn btn-soft hidden sm:inline-flex">
            {t('نشر التحديثات')}
            <ArrowLeft size={15} />
          </Link>
        </header>
        <main
          id="workspace-content"
          tabIndex={-1}
          className={`workspace-content ${location.pathname.startsWith('/courses/') ? 'workspace-content-editor' : ''}`}
        >
          <Outlet />
        </main>
        <footer className="workspace-footer">
          <span dir="ltr">oustadi plus</span>
          <span>{t('مساحة للتعلّم، وأثر يدوم.')}</span>
        </footer>
      </div>
      <ToastHost />
    </div>
  );
}
