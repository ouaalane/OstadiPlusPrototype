/** Dashboard-only locale: never changes the student app's synced language. */
import { useSyncExternalStore } from 'react';
import {
  getLanguage,
  getDirection,
  getLocale,
  setLanguage,
  subscribeLanguage,
  translate,
} from './locale';
export function useI18n() {
  const lang = useSyncExternalStore(
    subscribeLanguage,
    getLanguage,
    () => 'ar' as const,
  );
  return {
    lang,
    dir: getDirection(),
    locale: getLocale(),
    t: translate,
    setLang: setLanguage,
  };
}
