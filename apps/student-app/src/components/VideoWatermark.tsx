/**
 * VideoWatermark — dynamic, moving ownership overlay for protected lessons.
 *
 * Renders a compact translucent pill (`UST-XXXXX · crs-…`) over the video
 * surface. The pill glides between random positions at randomised intervals
 * (see `src/lib/watermark.ts` for the tunable constants) so that a screen
 * recording of the lesson stays traceable to the student account and course
 * it was captured from.
 *
 * Security notes — read before extending:
 *  - Identifiers ONLY: the opaque `studentCode` (the app's student-card code)
 *    and the canonical course id. Never names, phones, e-mails or tokens.
 *  - The identity comes from the authenticated store (`useStore().me`); the
 *    player screen refuses to mount the watermark (or play) without a valid,
 *    actively enrolled session, so a forged lessonId cannot borrow another
 *    student's identity.
 *  - `pointerEvents="none"` + `importantForAccessibility="no"`: the pill can
 *    never be tapped, dragged or block the player controls underneath it.
 *  - This is a deterrent and an investigative aid, NOT copy protection. It
 *    does not stop screen recording, screenshots or camera capture; it makes
 *    leaked recordings easier to attribute. Server-side playback logging is
 *    the recommended complement once a real backend exists.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

import { AppText } from './ui';
import {
  WATERMARK_TRANSITION_MS,
  nextWatermarkSlotIndex,
  randomMoveDelay,
  randomInt,
  watermarkSlots,
  watermarkText,
  type WatermarkSize,
} from '../lib/watermark';

interface VideoWatermarkProps {
  /** Opaque student display code (e.g. `UST-7F3K2`) from the auth store. */
  studentCode: string;
  /** Canonical course id (e.g. `crs-math-2bac`) of the lesson being played. */
  courseCode: string;
  /** Whether playback is running — movement only happens while it is. */
  playing: boolean;
}

export default function VideoWatermark({
  studentCode,
  courseCode,
  playing,
}: VideoWatermarkProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const slotIndex = useRef(-1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [container, setContainer] = useState<WatermarkSize | null>(null);
  const [pill, setPill] = useState<WatermarkSize | null>(null);

  const slots = useMemo(
    () => (container && pill ? watermarkSlots(container, pill) : null),
    [container, pill],
  );

  /* Place (or re-place after a resize / fullscreen toggle) the pill at its
     current slot, instantly, and fade it in once it is actually on screen. */
  useEffect(() => {
    if (!slots || slots.length === 0) return;
    if (slotIndex.current < 0 || slotIndex.current >= slots.length) {
      slotIndex.current = randomInt(0, slots.length);
    }
    const { x, y } = slots[slotIndex.current];
    translateX.setValue(x);
    translateY.setValue(y);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [slots, translateX, translateY, opacity]);

  /* Movement loop: a self-rescheduling timer with a randomised delay, alive
     only while playback runs (so pause / playToEnd / unmount leave no
     timers behind) and only while there is somewhere else to go. */
  useEffect(() => {
    if (!playing || !slots || slots.length < 2) return;
    let cancelled = false;

    const schedule = () => {
      timer.current = setTimeout(() => {
        if (cancelled) return;
        slotIndex.current = nextWatermarkSlotIndex(slots.length, slotIndex.current);
        const { x, y } = slots[slotIndex.current];
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: x,
            duration: WATERMARK_TRANSITION_MS,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: y,
            duration: WATERMARK_TRANSITION_MS,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
        schedule();
      }, randomMoveDelay());
    };

    schedule();
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };
  }, [playing, slots, translateX, translateY]);

  /* Belt-and-braces cleanup on unmount (rapid lesson switches remount the
     whole player, so nothing may survive the old instance). */
  useEffect(
    () => () => {
      translateX.stopAnimation();
      translateY.stopAnimation();
      opacity.stopAnimation();
    },
    [translateX, translateY, opacity],
  );

  return (
    <Animated.View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      onLayout={(e) =>
        setContainer({
          width: e.nativeEvent.layout.width,
          height: e.nativeEvent.layout.height,
        })
      }
      testID="video-watermark"
    >
      <Animated.View
        style={[
          styles.pill,
          { opacity, transform: [{ translateX }, { translateY }] },
        ]}
        onLayout={(e) =>
          setPill({
            width: e.nativeEvent.layout.width,
            height: e.nativeEvent.layout.height,
          })
        }
      >
        <AppText
          lang="fr"
          size={10.5}
          weight="semibold"
          tone="white"
          numberOfLines={1}
          style={styles.text}
        >
          {watermarkText(studentCode, courseCode)}
        </AppText>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    top: 0,
    left: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    /** Subtle scrim + hairline border keep the text readable over both very
        bright and very dark scenes without stealing attention. */
    backgroundColor: 'rgba(11,18,32,0.38)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  text: {
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
