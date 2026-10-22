export interface LibraryPrefs {
  archived: string[];
  favorites: string[];
}
export type StudentLibraryPrefs = Record<string, LibraryPrefs>;
export const EMPTY_LIBRARY_PREFS: LibraryPrefs = { archived: [], favorites: [] };

function clean(value: unknown): LibraryPrefs {
  const prefs = value as Partial<LibraryPrefs> | null;
  const ids = (items: unknown) => Array.isArray(items)
    ? [...new Set(items.filter((id): id is string => typeof id === 'string'))]
    : [];
  return { archived: ids(prefs?.archived), favorites: ids(prefs?.favorites) };
}

/** Keep legacy choices for the last stored account, never for every account. */
export function readLibraryPreferences(
  raw: string | null,
  legacy: string | null,
  owner: string,
): StudentLibraryPrefs {
  if (raw !== null) {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).map(([id, prefs]) => [id, clean(prefs)]));
  }
  return legacy && owner ? { [owner]: clean(JSON.parse(legacy)) } : {};
}
