/**
 * Tab convention (mobile-design skill, navigation.md): tapping the
 * already-active tab jumps that tab's content back to the top.
 *
 * `tabPress` fires for every press of a tab — including presses that merely
 * *switch* to the tab. We only scroll when the tab is already focused, so
 * switching tabs never destroys the remembered scroll position.
 */

import { useEffect, type RefObject } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

type Scrollable = {
  scrollToOffset?: (opts: { y: number; animated?: boolean }) => void;
  scrollTo?: (opts: { y: number; animated?: boolean }) => void;
};

export function useScrollToTopOnTabPress<T extends Scrollable>(ref: RefObject<T | null>) {
  // Typed as the tab navigator's navigation object so `tabPress` exists on
  // the event map — that is what a screen inside a tab actually receives.
  const navigation =
    useNavigation<BottomTabNavigationProp<Record<string, object | undefined>>>();

  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', () => {
      if (!navigation.isFocused()) return;
      requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        if (el.scrollToOffset) el.scrollToOffset({ y: 0, animated: true });
        else if (el.scrollTo) el.scrollTo({ y: 0, animated: true });
      });
    });
    return unsubscribe;
  }, [navigation, ref]);
}
