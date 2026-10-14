import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  BookOpen,
  LayoutDashboard,
  Megaphone,
  Menu,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { Wordmark } from './Logo';
import { Avatar, ToastHost } from './ui';
import { useStore } from '@/store/DemoStore';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
}

const NAV: NavItem[] = [
  { to: '/', label: 'نظرة عامة', icon: LayoutDashboard, end: true },
  { to: '/courses', label: 'الدورات', icon: BookOpen },
  { to: '/students', label: 'الطلاب', icon: Users },
  { to: '/announcements', label: 'الإعلانات', icon: Megaphone },
  { to: '/settings', label: 'الإعدادات', icon: Settings },
];

function navClass(isActive: boolean) {
  return [
    'group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[15px] font-semibold transition-colors',
    isActive
      ? 'bg-brand-soft text-brand-dark'
      : 'text-muted hover:bg-surface-alt hover:text-ink',
  ].join(' ');
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { state } = useStore();
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 py-5">
        <Wordmark size={34} subtitle="لوحة الأستاذ" />
      </div>

      <nav className="flex-1 space-y-1 px-3" aria-label="التنقل الرئيسي">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) => navClass(isActive)}
          >
            <item.icon size={19} strokeWidth={2} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-line p-3">
        <div className="flex items-center gap-3 rounded-xl bg-surface-alt px-3 py-3">
          <Avatar label={state.teacher.monogram} size={38} seed={2} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-ink">
              {state.teacher.name}
            </div>
            <div className="truncate text-xs text-muted">
              {state.teacher.centerName}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-[268px] border-e border-line bg-surface lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="إغلاق القائمة"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 animate-fade bg-[rgba(8,14,30,0.5)]"
          />
          <div className="animate-rise absolute inset-y-0 start-0 w-[280px] border-e border-line bg-surface">
            <button
              type="button"
              aria-label="إغلاق القائمة"
              onClick={() => setDrawerOpen(false)}
              className="btn btn-ghost btn-icon absolute end-2 top-3 z-10"
            >
              <X size={18} />
            </button>
            <SidebarContent onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      ) : null}

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur lg:hidden">
        <Wordmark size={28} />
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="فتح القائمة"
          className="btn btn-outline btn-icon"
        >
          <Menu size={18} />
        </button>
      </header>

      <main className="lg:ps-[268px]">
        <div className="mx-auto w-full max-w-[1200px] px-4 pb-28 pt-5 sm:px-6 lg:pb-12 lg:pt-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="التنقل السفلي"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <ul className="mx-auto flex max-w-lg">
          {NAV.map((item) => (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  [
                    'flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-semibold transition-colors',
                    isActive ? 'text-brand' : 'text-muted',
                  ].join(' ')
                }
              >
                <item.icon size={20} strokeWidth={2} />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <ToastHost />
    </div>
  );
}
