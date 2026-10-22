import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform } from 'react-native';
import { PlatformPressable } from '@react-navigation/elements';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { colors } from '../theme';

export function useReducedTabMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then(value => { if (active) setReduced(value); })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { active = false; subscription.remove(); };
  }, []);
  return reduced;
}

/** Keep React Navigation's links, accessibility, long press and press timing.
 * Feedback never delays navigation or changes the tab's layout. */
export default function AnimatedTabButton({
  style, onPressIn, onPressOut, reducedMotion, ...props
}: BottomTabBarButtonProps & { reducedMotion: boolean }) {
  const [scale] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (reducedMotion) { scale.stopAnimation(); scale.setValue(1); }
    return () => scale.stopAnimation();
  }, [scale, reducedMotion]);

  const animate = (pressed: boolean) => {
    scale.stopAnimation();
    if (reducedMotion) { scale.setValue(1); return; }
    Animated.timing(scale, {
      toValue: pressed ? 0.95 : 1,
      duration: pressed ? 80 : 150,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };
  return (
    <PlatformPressable
      {...props}
      pressColor={colors.transparent}
      pressOpacity={1}
      style={[style, { transform: [{ scale }] }]}
      onPressIn={event => { animate(true); onPressIn?.(event); }}
      onPressOut={event => { animate(false); onPressOut?.(event); }}
    />
  );
}
