/**
 * Teacher dashboard — i18n hook.
 *
 * Reads `lang` from DemoStore and returns translation utilities.
 */
import { useCallback } from 'react';
import { t, dir, type Lang, type Dir, type TranslationKey } from '@ostadiplus/shared';
import { useStore } from '../store/DemoStore';

export interface I18nValue {
  lang: Lang;
  dir: Dir;
  t: (key: TranslationKey) => string;
  setLang: (lang: Lang) => void;
}

export function useI18n(): I18nValue {
  const { state, dispatch } = useStore();
  const lang = state.lang ?? 'fr';
  const translate = useCallback((key: TranslationKey) => t(key, lang), [lang]);
  const setLang = useCallback(
    (l: Lang) => dispatch({ type: 'setLang', lang: l }),
    [dispatch],
  );
  return {
    lang,
    dir: dir(lang),
    t: translate,
    setLang,
  };
}
