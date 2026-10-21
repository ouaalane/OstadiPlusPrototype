import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Info,
  Search,
  X,
} from 'lucide-react';
import { coverGradients, palette } from '@ostadiplus/shared';
import { useStore } from '@/store/DemoStore';

/* ------------------------------------------------------------------ */
/* Avatar                                                              */
/* ------------------------------------------------------------------ */

const AVATAR_TONES = [
  [palette.gradientFrom, palette.gradientTo],
  [palette.gradientFrom, palette.gradientTo],
  [palette.gradientFrom, palette.gradientTo],
  [palette.gradientFrom, palette.gradientTo],
  [palette.gradientFrom, palette.gradientTo],
  [palette.gradientFrom, palette.gradientTo],
] as const;

export function Avatar({
  label,
  size = 40,
  seed = 0,
  square = false,
}: {
  label: string;
  size?: number;
  seed?: number;
  square?: boolean;
}) {
  const [from, to] = AVATAR_TONES[Math.abs(seed) % AVATAR_TONES.length];
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center font-bold text-white ${
        square ? 'rounded-md' : 'rounded-full'
      }`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(11, Math.round(size * 0.36)),
        backgroundImage: `linear-gradient(135deg, ${from}, ${to})`,
      }}
    >
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Pills                                                               */
/* ------------------------------------------------------------------ */

export type PillTone =
  | 'brand'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral'
  | 'info';

const PILL_STYLES: Record<PillTone, { bg: string; fg: string }> = {
  brand: { bg: 'var(--color-brand-soft)', fg: 'var(--color-brand-dark)' },
  success: { bg: 'var(--color-success-soft)', fg: 'var(--color-success)' },
  warning: { bg: 'var(--color-accent-soft)', fg: 'var(--color-brand)' },
  danger: { bg: 'var(--color-danger-soft)', fg: 'var(--color-danger)' },
  neutral: { bg: 'var(--color-surface-alt)', fg: 'var(--color-muted)' },
  info: { bg: 'var(--color-info-soft)', fg: 'var(--color-info)' },
};

export function Pill({
  tone = 'neutral',
  children,
  dot,
}: {
  tone?: PillTone;
  children: ReactNode;
  dot?: boolean;
}) {
  const style = PILL_STYLES[tone];
  return (
    <span className="pill" style={{ background: style.bg, color: style.fg }}>
      {dot ? (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: style.fg }}
        />
      ) : null}
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Progress                                                            */
/* ------------------------------------------------------------------ */

export function ProgressBar({
  value,
  tone = 'brand',
  height = 8,
}: {
  value: number;
  tone?: 'brand' | 'success' | 'accent';
  height?: number;
}) {
  const color =
    tone === 'success'
      ? palette.success
      : tone === 'accent'
        ? palette.accent
        : palette.brand;
  return (
    <div
      className="w-full overflow-hidden rounded-full bg-surface-alt"
      style={{ height }}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Course cover                                                        */
/* ------------------------------------------------------------------ */

export function CourseCover({
  cover,
  subject,
  className = '',
  children,
}: {
  cover: string;
  subject: string;
  className?: string;
  children?: ReactNode;
}) {
  const [from, to] = coverGradients[cover] ?? coverGradients.blue;
  // Real rendered cover art; the flat gradient stays behind as a fallback
  // while the image loads (and for any cover key without art).
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      <img
        src={`/media/covers/${cover}.jpg`}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
        onError={(e) => {
          // If the art is missing, hide the <img> and keep the gradient.
          e.currentTarget.style.display = 'none';
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(41,30,43,0.04) 0%, rgba(41,30,43,0.34) 100%)',
        }}
      />
      <div className="relative flex h-full flex-col justify-between p-4">
        <span className="pill bg-white/20 text-white backdrop-blur-sm">
          {subject}
        </span>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-softer text-brand">
        {icon}
      </span>
      <h3 className="text-lg">{title}</h3>
      <p className="max-w-sm text-sm text-muted">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Modal                                                               */
/* ------------------------------------------------------------------ */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => {
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        'input, textarea, select, button, [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus();
    }, 30);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      window.clearTimeout(timer);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const width =
    size === 'sm' ? 'max-w-md' : size === 'lg' ? 'max-w-3xl' : 'max-w-xl';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="إغلاق"
        onClick={onClose}
        className="absolute inset-0 animate-fade bg-[rgba(41,30,43,0.55)]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className={`card animate-rise relative flex max-h-[92vh] w-full flex-col overflow-hidden sm:rounded-2xl ${width}`}
        style={{ boxShadow: 'var(--shadow-overlay)' }}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="text-lg leading-snug">{title}</h2>
            {description ? (
              <p id={descId} className="mt-1 text-sm text-muted">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className="btn btn-ghost btn-icon shrink-0"
          >
            <X size={18} />
          </button>
        </header>
        <div className="scrollbar-slim flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {children}
        </div>
        {footer ? (
          <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-line bg-surface-alt/60 px-5 py-4 sm:px-6">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Toasts                                                              */
/* ------------------------------------------------------------------ */

export function ToastHost() {
  const { toasts, dismissToast } = useStore();
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((toast) => {
        const tone =
          toast.tone === 'error'
            ? { bg: 'var(--color-danger-soft)', fg: 'var(--color-danger)' }
            : toast.tone === 'info'
              ? { bg: 'var(--color-info-soft)', fg: 'var(--color-info)' }
              : { bg: 'var(--color-success-soft)', fg: 'var(--color-success)' };
        const Icon =
          toast.tone === 'error' ? AlertCircle : toast.tone === 'info' ? Info : CheckCircle2;
        return (
          <button
            key={toast.id}
            type="button"
            onClick={() => dismissToast(toast.id)}
            className="card animate-toast pointer-events-auto flex w-full max-w-md items-center gap-3 px-4 py-3 text-start"
            style={{ background: tone.bg, borderColor: 'transparent' }}
          >
            <Icon size={18} style={{ color: tone.fg }} />
            <span className="flex-1 text-sm font-semibold text-ink">
              {toast.message}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Misc helpers                                                        */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Toggle                                                              */
/* ------------------------------------------------------------------ */

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors"
      style={{ background: checked ? 'var(--color-brand)' : 'var(--color-line-strong)' }}
    >
      <span
        className="inline-block h-5 w-5 rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? 'translateX(-20px)' : 'translateX(0)' }}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Confirm dialog                                                      */
/* ------------------------------------------------------------------ */

export function Confirm({
  open,
  title,
  message,
  confirmLabel = 'تأكيد',
  tone = 'danger',
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  tone?: 'danger' | 'brand';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onCancel}>
            تراجع
          </button>
          <button
            type="button"
            className={`btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-body">{message}</p>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Page header                                                         */
/* ------------------------------------------------------------------ */

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Field({
  label: labelText,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="label">{labelText}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs font-semibold text-danger">
          {error}
        </span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Data Table — modern card-style table (sort, search, select, pages)  */
/* ------------------------------------------------------------------ */

export interface DataTableColumn<T> {
  /** Unique key for this column. */
  key: string;
  /** Header label. */
  header: string;
  /** Cell renderer. */
  render: (row: T, index: number) => ReactNode;
  /** Optional value extractor for sorting + searching. */
  sortValue?: (row: T) => string | number;
  /** Text alignment (default: start). */
  align?: 'start' | 'center' | 'end';
  /** CSS width, e.g. '180px' or '20%'. */
  width?: string;
  /** Hide on small screens (below md). */
  hideOnMobile?: boolean;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  /** Big card heading (like «Team Members»). */
  title?: string;
  /** Small line under the heading — description or selection counter. */
  description?: string;
  /** Placeholder text for the search input (hides the box when omitted). */
  searchPlaceholder?: string;
  /** Controlled search value — leave undefined to manage it internally. */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  /** Right-side toolbar buttons (Filter, dark «+ Add …» button…). */
  toolbar?: ReactNode;
  /** Enable the leading checkbox column + "N selected" counter. */
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  /** Rendered inside the table body when there are no rows. */
  emptyState?: ReactNode;
  /** Page size options (default: [10, 25, 50]). */
  pageSizeOptions?: number[];
  /** Compact row height. */
  compact?: boolean;
  /** Tint rows where this returns true (e.g. expired). */
  highlightRow?: (row: T) => boolean;
}

export function DataTable<T>({
  columns,
  rows,
  getRowId,
  title,
  description,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  toolbar,
  selectedIds,
  onSelectionChange,
  emptyState,
  pageSizeOptions = [10, 25, 50],
  compact = false,
  highlightRow,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(pageSizeOptions[0] ?? 10);
  const [internalSearch, setInternalSearch] = useState('');

  const query = searchValue ?? internalSearch;
  const setQuery = onSearchChange ?? setInternalSearch;
  const selectable = selectedIds !== undefined && onSelectionChange !== undefined;

  /* --- filtering --- */
  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const needle = query.toLowerCase();
    return rows.filter((row) =>
      columns.some((col) => {
        const val = col.sortValue?.(row);
        if (val == null) return false;
        return String(val).toLowerCase().includes(needle);
      }),
    );
  }, [rows, columns, query]);

  /* --- sorting --- */
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return filtered;
    return [...filtered].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv), 'ar');
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir, columns]);

  /* --- pagination --- */
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const paginated = sorted.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const toggleSort = useCallback((key: string) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  }, [sortKey]);

  /* --- selection helpers --- */
  const pageIds = paginated.map(getRowId);
  const allPageSelected = selectable && pageIds.length > 0 && pageIds.every((id) => selectedIds!.has(id));

  const toggleSelectAll = () => {
    if (!selectable) return;
    const next = new Set(selectedIds);
    if (allPageSelected) pageIds.forEach((id) => next.delete(id));
    else pageIds.forEach((id) => next.add(id));
    onSelectionChange!(next);
  };

  const toggleSelectRow = (id: string) => {
    if (!selectable) return;
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange!(next);
  };

  const py = compact ? 'py-2.5' : 'py-3.5';
  const selectedCount = selectable ? selectedIds.size : 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0px_2px_8px_rgba(41,30,43,0.05),0px_12px_32px_rgba(41,30,43,0.06)]">
      {/* ---- Card head: title + description ---- */}
      {title ? (
        <div className="px-6 pt-6">
          <h2 className="text-[22px] font-bold leading-tight text-ink sm:text-2xl">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
        </div>
      ) : null}

      {/* ---- Toolbar: counter | search + actions ---- */}
      {(searchPlaceholder || toolbar || selectable) && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 pb-4 pt-4">
          <div className="text-[13px] text-muted">
            {selectable && selectedCount > 0 ? (
              <span className="font-semibold text-ink">
                <span className="num">{selectedCount}</span> عنصر محدد
              </span>
            ) : (
              <span>
                <span className="num font-semibold text-ink">{sorted.length}</span> عنصر
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {searchPlaceholder ? (
              <div className="relative w-full sm:w-60">
                <Search
                  size={15}
                  className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-faint"
                />
                <input
                  type="search"
                  className="input h-9 rounded-xl ps-9 text-[13px]"
                  placeholder={searchPlaceholder}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(0);
                  }}
                  aria-label={searchPlaceholder}
                />
              </div>
            ) : null}
            {toolbar}
          </div>
        </div>
      )}

      {/* ---- Table ---- */}
      <div className="scrollbar-slim overflow-x-auto px-6 pb-2">
        <table className="w-full border-collapse text-sm" style={{ minWidth: 640 }}>
          <thead>
            <tr className="rounded-xl bg-surface-alt">
              {selectable ? (
                <th scope="col" className="w-10 px-3 py-3 text-start">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={toggleSelectAll}
                    aria-label="تحديد الكل"
                    className="h-4 w-4 cursor-pointer rounded border-line-strong accent-[var(--color-ink)]"
                  />
                </th>
              ) : null}
              {columns.map((col) => {
                const isSortable = !!col.sortValue;
                const active = sortKey === col.key;
                const alignClass =
                  col.align === 'center' ? 'text-center' : col.align === 'end' ? 'text-end' : 'text-start';
                return (
                  <th
                    key={col.key}
                    scope="col"
                    style={col.width ? { width: col.width } : undefined}
                    className={[
                      'px-3 py-3 first:ps-3 last:pe-3',
                      alignClass,
                      'text-[13px] font-semibold text-muted',
                      col.hideOnMobile ? 'hidden md:table-cell' : '',
                      isSortable ? 'cursor-pointer select-none transition-colors hover:text-ink' : '',
                    ].join(' ')}
                    onClick={isSortable ? () => toggleSort(col.key) : undefined}
                    aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    <span className={`inline-flex items-center gap-1.5 ${col.align === 'end' ? 'flex-row-reverse' : ''}`}>
                      {col.header}
                      {isSortable ? (
                        active ? (
                          sortDir === 'asc' ? (
                            <ArrowUp size={13} className="text-ink" />
                          ) : (
                            <ArrowDown size={13} className="text-ink" />
                          )
                        ) : (
                          <ArrowUpDown size={13} className="text-faint/60" />
                        )
                      ) : null}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-5 py-16 text-center"
                >
                  {emptyState ?? (
                    <div className="flex flex-col items-center gap-2 text-muted">
                      <Search size={28} className="text-faint" />
                      <p className="text-sm font-semibold">لا توجد نتائج</p>
                      <p className="text-xs">جرّب تعديل البحث أو التصفية.</p>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              paginated.map((row, idx) => {
                const id = getRowId(row);
                const isHighlighted = highlightRow?.(row) ?? false;
                const isSelected = selectable && selectedIds.has(id);
                return (
                  <tr
                    key={id}
                    className={[
                      'group border-b border-line/60 transition-colors last:border-b-0',
                      isSelected ? 'bg-brand-softer' : '',
                      isHighlighted && !isSelected ? 'bg-danger-soft/40' : '',
                      'hover:bg-surface-alt/70',
                    ].join(' ')}
                  >
                    {selectable ? (
                      <td className="w-10 px-3 py-3">
                        <input
                          type="checkbox"
                          checked={!!isSelected}
                          onChange={() => toggleSelectRow(id)}
                          aria-label={`تحديد ${id}`}
                          className="h-4 w-4 cursor-pointer rounded border-line-strong accent-[var(--color-ink)]"
                        />
                      </td>
                    ) : null}
                    {columns.map((col) => {
                      const alignClass =
                        col.align === 'center' ? 'text-center' : col.align === 'end' ? 'text-end' : 'text-start';
                      return (
                        <td
                          key={col.key}
                          className={`px-3 ${py} ${alignClass} ${col.hideOnMobile ? 'hidden md:table-cell' : ''}`}
                        >
                          {col.render(row, safePage * pageSize + idx)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ---- Footer: per-page selector | page buttons ---- */}
      {totalPages > 1 ? (
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 pb-5 pt-3">
        <div className="flex items-center gap-2 text-[13px] text-muted">
          <span>عرض</span>
          <select
            className="num rounded-lg border border-line bg-white px-2 py-1 text-[13px] font-semibold text-ink"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(0);
            }}
            aria-label="عدد العناصر في الصفحة"
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span>عناصر في الصفحة</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:bg-surface-alt disabled:opacity-40"
            disabled={safePage === 0}
            onClick={() => setPage(safePage - 1)}
            aria-label="الصفحة السابقة"
          >
            <ChevronRight size={15} />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i)
            .filter((i) => {
              if (totalPages <= 5) return true;
              if (i === 0 || i === totalPages - 1) return true;
              if (Math.abs(i - safePage) <= 1) return true;
              return false;
            })
            .reduce<(number | 'gap')[]>((acc, i, _, arr) => {
              if (arr.length > 0 && i - (arr[arr.length - 1] as number) > 1) acc.push('gap');
              acc.push(i);
              return acc;
            }, [])
            .map((item, i) =>
              item === 'gap' ? (
                <span key={`gap-${i}`} className="px-1 text-faint">
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPage(item as number)}
                  className={[
                    'num flex h-8 w-8 items-center justify-center rounded-lg text-[13px] font-semibold transition-colors',
                    item === safePage
                      ? 'bg-ink text-white'
                      : 'border border-line text-muted hover:bg-surface-alt hover:text-ink',
                  ].join(' ')}
                  aria-current={item === safePage ? 'page' : undefined}
                >
                  {item as number + 1}
                </button>
              ),
            )}

          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:bg-surface-alt disabled:opacity-40"
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage(safePage + 1)}
            aria-label="الصفحة التالية"
          >
            <ChevronLeft size={15} />
          </button>
        </div>
      </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Segmented control — filter tabs                                     */
/* ------------------------------------------------------------------ */

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly [T, string][];
  ariaLabel?: string;
}) {
  return (
    <div
      className="inline-flex flex-wrap gap-1 rounded-xl border border-line bg-surface-alt p-1"
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map(([key, label]) => {
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(key)}
            className={[
              'inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition-colors',
              active
                ? 'bg-white text-brand-dark shadow-sm'
                : 'text-muted hover:text-ink',
            ].join(' ')}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'brand',
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: ReactNode;
  tone?: 'brand' | 'success' | 'accent';
}) {
  const tones = {
    brand: { bg: 'var(--color-brand-soft)', fg: 'var(--color-brand-dark)' },
    success: { bg: 'var(--color-success-soft)', fg: 'var(--color-success)' },
    accent: { bg: 'var(--color-accent-soft)', fg: 'var(--color-brand)' },
  } as const;
  const toneStyle = tones[tone];
  return (
    <div className="card flex items-center gap-4 px-5 py-4">
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        style={{ background: toneStyle.bg, color: toneStyle.fg }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-xs font-semibold text-muted">{label}</div>
        <div className="num mt-0.5 text-2xl font-bold text-ink">{value}</div>
        {hint ? <div className="mt-0.5 text-xs text-faint">{hint}</div> : null}
      </div>
    </div>
  );
}
