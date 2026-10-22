import { useEffect, useRef, useState } from 'react';
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
  const { state } = useStore();
  const unanswered = (state.questions ?? []).filter(
    (q) => !isQuestionAnswered(q),
  ).length;
  return (
    <div className="sidebar-content flex h-full flex-col">
      <div className="sidebar-brand flex items-center justify-between">
        <Link to="/" onClick={close} aria-label="oustadi plus — نظرة عامة">
          <Wordmark size={38} tone="light" />
        </Link>
        <button
          className="btn btn-icon btn-ghost lg:hidden"
          onClick={close}
          aria-label="إغلاق القائمة"
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
          <span className="block text-[11px] text-muted">مساحة الأستاذ</span>
        </span>
        <Settings size={14} className="text-muted" aria-hidden="true" />
      </Link>
      <nav
        className="sidebar-navigation flex-1 space-y-6 overflow-y-auto"
        aria-label="التنقل الرئيسي"
      >
        {groups.map((g) => (
          <div key={g.label}>
            <p className="sidebar-group-label">{g.label}</p>
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
                  <span className="flex-1">{item.label}</span>
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
            <span className="block text-[11px] text-muted">حساب الأستاذ</span>
          </span>
          <Settings size={16} className="text-muted" />
        </Link>
      </div>
    </div>
  );
}
function WorkspaceSearch() {
  const { state } = useStore();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
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
            detail: 'دورة · ' + c.level,
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
    <div ref={root} className="relative w-full max-w-md">
      <Search
        size={17}
        className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted"
      />
      <input
        aria-label="البحث في الدورات والدروس"
        placeholder="ابحث عن دورة أو درس…"
        className="workspace-search"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
        }}
      />
      {open && needle ? (
        <div
          className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-line bg-white p-2 shadow-raised"
          aria-label="نتائج البحث"
        >
          {results.length ? (
            results.map((r) => (
              <Link
                key={r.to}
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
                    {r.title}
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
              ما لقيناش نتائج. جرّب كلمة أخرى.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
export function AppShell() {
  const [drawer, setDrawer] = useState(false);
  const location = useLocation();
  const contentRef = useRef<HTMLElement>(null);
  useEffect(() => {
    setDrawer(false);
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
      )?.label ?? 'مساحة العمل';
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
        الانتقال إلى المحتوى
      </a>
      <aside className="workspace-sidebar hidden lg:block">
        <Sidebar close={() => setDrawer(false)} />
      </aside>
      {drawer ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="إغلاق القائمة"
            className="absolute inset-0 bg-ink/40"
            onClick={() => setDrawer(false)}
          />
          <aside
            ref={contentRef}
            id="workspace-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="قائمة التنقل"
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
            aria-label="فتح القائمة"
            aria-expanded={drawer}
            aria-controls={drawer ? 'workspace-drawer' : undefined}
          >
            <Menu size={20} />
          </button>
          <div className="topbar-location hidden shrink-0 sm:flex">
            <span className="topbar-eyebrow">مساحة الأستاذ</span>
            <div className="flex items-center gap-2">
              <Link to="/" className="text-muted">
                مساحة العمل
              </Link>
              <ChevronLeft size={13} aria-hidden="true" />
              <span className="font-bold text-ink">{title}</span>
            </div>
          </div>
          <div className="flex-1" />
          <WorkspaceSearch />
          <Link
            className="relative flex size-9 shrink-0 items-center justify-center rounded-lg border border-line hover:bg-surface-alt"
            to="/questions"
            aria-label="فتح أسئلة التلاميذ"
          >
            <MessageCircle size={17} />
          </Link>
          <Link to="/sync" className="btn btn-soft hidden sm:inline-flex">
            نشر التحديثات
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
          <span>مساحة للتعلّم، وأثر يدوم.</span>
        </footer>
      </div>
      <ToastHost />
    </div>
  );
}
