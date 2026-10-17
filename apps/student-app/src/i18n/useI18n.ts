/**
 * Student app — i18n hook.
 *
 * Reads `lang` from StudentStore and returns translation utilities.
 * All components should use this instead of hard-coding Arabic strings.
 */
import { useCallback } from 'react';
import { t, dir, type Lang, type Dir, type TranslationKey } from '@ostadiplus/shared';
import { useStore } from '../store/StudentStore';

export interface I18nValue {
  lang: Lang;
  dir: Dir;
  t: (key: TranslationKey) => string;
  setLang: (lang: Lang) => void;
}

export function useI18n(): I18nValue {
  const { lang, setLang } = useStore();
  const translate = useCallback((key: TranslationKey) => t(key, lang), [lang]);
  return {
    lang,
    dir: dir(lang),
    t: translate,
    setLang,
  };
}
