import messages from './messages.json';

export type DashboardLanguage = 'ar' | 'en' | 'fr';
export type DashboardDirection = 'rtl' | 'ltr';
const STORAGE_KEY = 'ostadiplus.dashboard.locale';
const supported = (value: unknown): value is DashboardLanguage =>
  value === 'ar' || value === 'en' || value === 'fr';
const readLanguage = (): DashboardLanguage => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return supported(stored) ? stored : 'ar';
  } catch {
    return 'ar';
  }
};
let language: DashboardLanguage = readLanguage();
const listeners = new Set<() => void>();
export const getLanguage = () => language;
export const getDirection = (): DashboardDirection =>
  language === 'ar' ? 'rtl' : 'ltr';
export const getLocale = () =>
  ({ ar: 'ar-MA', en: 'en-GB', fr: 'fr-MA' })[language];
const normalise = (value: string) => value.replace(/\s+/g, ' ').trim();
const dictionary: Record<string, { en: string; fr: string }> = messages;
const reverse = new Map<string, string>();
const patterns: { source: string; regex: RegExp; indexes: number[] }[] = [];
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
for (const [source, entry] of Object.entries(dictionary)) {
  for (const text of [source, entry.en, entry.fr]) {
    const key = normalise(text);
    if (!reverse.has(key)) reverse.set(key, source);
    if (/\{\d+\}/.test(key) && /[\p{L}]/u.test(key.replace(/\{\d+\}/g, ''))) {
      const indexes: number[] = [];
      let expression = '^',
        last = 0;
      for (const match of key.matchAll(/\{(\d+)\}/g)) {
        expression += escape(key.slice(last, match.index)) + '(.*?)';
        indexes.push(Number(match[1]));
        last = match.index! + match[0].length;
      }
      patterns.push({
        source,
        regex: new RegExp(expression + escape(key.slice(last)) + '$'),
        indexes,
      });
    }
  }
}
patterns.sort(
  (a, b) =>
    b.source.replace(/\{\d+\}/g, '').length -
    a.source.replace(/\{\d+\}/g, '').length,
);
/** Source-message translation. Values are interpolated as text, never HTML. */
export function translate(
  message: string | undefined | null,
  values: readonly unknown[] = [],
): string {
  if (message == null) return '';
  const key = normalise(message);
  let source = Object.hasOwn(dictionary, key) ? key : reverse.get(key);
  let parameters = values;
  if (!source) {
    for (const pattern of patterns) {
      const match = pattern.regex.exec(key);
      if (match) {
        source = pattern.source;
        const captured: unknown[] = [];
        pattern.indexes.forEach((index, i) => {
          captured[index] = match[i + 1];
        });
        parameters = captured;
        break;
      }
    }
  }
  if (!source) return message;
  // These generated messages contain another UI message, not user content.
  if (source === 'السؤال {0}: {1}')
    parameters = [parameters[0], translate(String(parameters[1] ?? ''))];
  if (source === '{0} «{1}» في دورة {2}')
    parameters = [
      translate(String(parameters[0] ?? '')),
      ...parameters.slice(1),
    ];
  const result = language === 'ar' ? source : dictionary[source][language];
  const prefix = message.match(/^\s*/)?.[0] ?? '';
  const suffix = message.match(/\s*$/)?.[0] ?? '';
  return (
    prefix +
    result.replace(/\{(\d+)\}/g, (token, index) =>
      parameters[Number(index)] == null
        ? token
        : String(parameters[Number(index)]),
    ) +
    suffix
  );
}
function applyDocumentLanguage() {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = language;
  document.documentElement.dir = getDirection();
  document.title =
    language === 'ar'
      ? 'Oustadi Plus — لوحة الأستاذ'
      : language === 'fr'
        ? 'Oustadi Plus — Espace enseignant'
        : 'Oustadi Plus — Teacher dashboard';
}
export function setLanguage(next: DashboardLanguage) {
  if (!supported(next) || next === language) return;
  language = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* In-memory switching still works. */
  }
  applyDocumentLanguage();
  listeners.forEach((listener) => listener());
}
export function subscribeLanguage(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
applyDocumentLanguage();
if (typeof window !== 'undefined')
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) {
      language = supported(event.newValue) ? event.newValue : 'ar';
      applyDocumentLanguage();
      listeners.forEach((listener) => listener());
    }
  });
export function relativeTime(iso: string): string {
  const difference = new Date(iso).getTime() - Date.now();
  const seconds = Math.round(difference / 1000);
  const absolute = Math.abs(seconds);
  const [value, unit] =
    absolute < 60
      ? [seconds, 'second']
      : absolute < 3600
        ? [Math.round(seconds / 60), 'minute']
        : absolute < 86400
          ? [Math.round(seconds / 3600), 'hour']
          : absolute < 2592000
            ? [Math.round(seconds / 86400), 'day']
            : absolute < 31536000
              ? [Math.round(seconds / 2592000), 'month']
              : [Math.round(seconds / 31536000), 'year'];
  return new Intl.RelativeTimeFormat(getLocale(), { numeric: 'auto' }).format(
    Number(value),
    unit as Intl.RelativeTimeFormatUnit,
  );
}
export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat(getLocale()).format(new Date(iso));
