/**
 * VideoWatermark — moving ownership overlay for protected lessons.
 *
 * Renders ONE short 12-char code issued by the watermark API (plus an
 * optional smaller second copy of the same code at another random spot) as
 * dim white text with a soft shadow. While the video plays the overlay
 * fades between random positions every 8-15 s — never the dead centre and
 * never over the bottom controls/subtitles. It fades out and unmounts
 * entirely while the video is paused, and a watchdog re-asserts/re-places
 * it if the animation state is ever lost (app backgrounded mid-fade, timers
 * cleared, etc.).
 *
 * Security notes — read before extending:
 *  - The overlay text is a traceability code ONLY: no names, e-mails, phone
 *    numbers, tokens, student codes or course titles. The code → (student,
 *    course, video, session, device, date) mapping lives server-side in the
 *    `video_watermarks` table (see `apps/api`).
 *  - `pointerEvents="none"` + `importantForAccessibility="no-hide-descendants"`:
 *    the overlay can never be tapped, dragged or block the player controls.
 *  - This is a deterrent and an investigative aid, NOT copy protection.
 *    The copy-control layer is `expo-screen-capture` (FLAG_SECURE on
 *    Android, capture detection on iOS) — see VideoScreen.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, type LayoutChangeEvent } from 'react-native';

import { AppText } from './ui';
import {
  WATERMARK_FADE_IN_MS,
  WATERMARK_FADE_OUT_MS,
  WATERMARK_HIDE_FADE_MS,
  WATERMARK_OPACITY,
  WATERMARK_SECONDARY_OPACITY,
  WATERMARK_WATCHDOG_MS,
  isWatermarkCode,
  nextWatermarkSlotIndex,
  nextWatermarkSlotIndexInOtherRow,
  randomInt,
  randomMoveDelay,
  watermarkSlots,
  watermarkSlotColumn,
  watermarkSlotRow,
  type WatermarkSize,
} from '../lib/watermark';

interface VideoWatermarkProps {
  /** 12-char traceability code issued by the watermark API. */
  code: string;
  /** Whether playback is running — the overlay is hidden when it is not. */
  playing: boolean;
  /** Bumped by the screen when an external screen capture is detected. */
  nonce?: number;
}

/** What the effect-driven engine exposes to the watchdog / capture probe. */
interface WatermarkEngine {
  /** Fade out, land on a new random position, fade back in. */
  move: () => void;
  /** Recover from a wedged overlay (frozen fade, lost timer, …). */
  watchdog: () => void;
}

/** Keeps a stale slot index usable (random pick when out of range). */
function clampIndex(value: number, count: number): number {
  return value >= 0 && value < count ? value : randomInt(0, count);
}

export default function VideoWatermark({ code, playing, nonce = 0 }: VideoWatermarkProps) {
  const primaryOpacity = useRef(new Animated.Value(0)).current;
  const secondaryOpacity = useRef(new Animated.Value(0)).current;
  const primaryX = useRef(new Animated.Value(0)).current;
  const primaryY = useRef(new Animated.Value(0)).current;
  const secondaryX = useRef(new Animated.Value(0)).current;
  const secondaryY = useRef(new Animated.Value(0)).current;

  const primarySlot = useRef(-1);
  const secondarySlot = useRef(-1);
  const moveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Where the fade state machine currently is; the watchdog reads this. */
  const phase = useRef<{ kind: 'idle' | 'fading'; at: number }>({ kind: 'idle', at: Date.now() });
  const engine = useRef<WatermarkEngine | null>(null);

  const [hidden, setHidden] = useState(false);
  const [container, setContainer] = useState<WatermarkSize | null>(null);
  const [primarySize, setPrimarySize] = useState<WatermarkSize | null>(null);
  const [secondarySize, setSecondarySize] = useState<WatermarkSize | null>(null);

  const primarySlots = useMemo(
    () => (container && primarySize ? watermarkSlots(container, primarySize) : null),
    [container, primarySize],
  );
  const secondarySlots = useMemo(
    () => (container && secondarySize ? watermarkSlots(container, secondarySize) : null),
    [container, secondarySize],
  );

  /* ------------------------------------------------------------------ */
  /* Movement engine — alive only while playing + visible.               */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (!playing || hidden || !primarySlots || primarySlots.length === 0) return;

    let cancelled = false;
    const primaryList = primarySlots;
    const secondaryList = secondarySlots ?? primarySlots;

    const applyPositions = () => {
      const p = primaryList[clampIndex(primarySlot.current, primaryList.length)];
      const s = secondaryList[clampIndex(secondarySlot.current, secondaryList.length)];
      primaryX.setValue(p.x);
      primaryY.setValue(p.y);
      secondaryX.setValue(s.x);
      secondaryY.setValue(s.y);
    };

    const schedule = () => {
      if (cancelled) return;
      if (moveTimer.current) clearTimeout(moveTimer.current);
      moveTimer.current = setTimeout(() => {
        moveTimer.current = null;
        move();
      }, randomMoveDelay());
    };

    const fadeIn = () => {
      phase.current = { kind: 'fading', at: Date.now() };
      Animated.parallel([
        Animated.timing(primaryOpacity, {
          toValue: WATERMARK_OPACITY,
          duration: WATERMARK_FADE_IN_MS,
          useNativeDriver: true,
        }),
        Animated.timing(secondaryOpacity, {
          toValue: WATERMARK_SECONDARY_OPACITY,
          duration: WATERMARK_FADE_IN_MS,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (cancelled) return;
        phase.current = { kind: 'idle', at: Date.now() };
        schedule();
      });
    };

    const move = () => {
      if (cancelled) return;
      // A move can be requested at any time (normal schedule or a detected
      // capture): drop the pending timer so there is exactly one move in
      // flight, then fade to a fresh position.
      if (moveTimer.current) {
        clearTimeout(moveTimer.current);
        moveTimer.current = null;
      }
      phase.current = { kind: 'fading', at: Date.now() };
      Animated.parallel([
        Animated.timing(primaryOpacity, {
          toValue: 0,
          duration: WATERMARK_FADE_OUT_MS,
          useNativeDriver: true,
        }),
        Animated.timing(secondaryOpacity, {
          toValue: 0,
          duration: WATERMARK_FADE_OUT_MS,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (cancelled || !finished) return;
        // Land on a fresh spot (never the same one twice in a row) and put
        // the second copy somewhere clearly different from the first.
        primarySlot.current = nextWatermarkSlotIndex(primaryList.length, primarySlot.current);
        secondarySlot.current = nextWatermarkSlotIndexInOtherRow(
          secondaryList.length,
          primarySlot.current,
        );
        applyPositions();
        fadeIn();
      });
    };

    const watchdog = () => {
      if (cancelled) return;
      const now = Date.now();
      const wedged =
        (phase.current.kind === 'fading' && now - phase.current.at > WATERMARK_WATCHDOG_MS) ||
        (phase.current.kind === 'idle' && !moveTimer.current);
      if (!wedged) return;
      console.log('[watermark] watchdog re-asserted the overlay');
      primaryOpacity.stopAnimation();
      secondaryOpacity.stopAnimation();
      if (moveTimer.current) {
        clearTimeout(moveTimer.current);
        moveTimer.current = null;
      }
      primarySlot.current = nextWatermarkSlotIndex(primaryList.length, primarySlot.current);
      secondarySlot.current = nextWatermarkSlotIndexInOtherRow(
        secondaryList.length,
        primarySlot.current,
      );
      applyPositions();
      fadeIn();
    };

    // Initial placement: a random slot per copy, then fade in once measured.
    if (primarySlot.current < 0 || primarySlot.current >= primaryList.length) {
      primarySlot.current = randomInt(0, primaryList.length);
    }
    if (
      secondarySlot.current < 0 ||
      secondarySlot.current >= secondaryList.length ||
      secondarySlot.current === primarySlot.current ||
      watermarkSlotRow(secondarySlot.current) === watermarkSlotRow(primarySlot.current) ||
      watermarkSlotColumn(secondarySlot.current) === watermarkSlotColumn(primarySlot.current)
    ) {
      secondarySlot.current = nextWatermarkSlotIndexInOtherRow(
        secondaryList.length,
        primarySlot.current,
      );
    }
    applyPositions();
    fadeIn();

    engine.current = { move, watchdog };

    return () => {
      cancelled = true;
      engine.current = null;
      if (moveTimer.current) {
        clearTimeout(moveTimer.current);
        moveTimer.current = null;
      }
      primaryOpacity.stopAnimation();
      secondaryOpacity.stopAnimation();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Animated values are stable refs.
  }, [playing, hidden, primarySlots, secondarySlots]);

  /* ------------------------------------------------------------------ */
  /* Hidden only while paused/closed: fade out, then unmount entirely.   */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (playing) {
      setHidden((wasHidden) => (wasHidden ? false : wasHidden));
      return;
    }
    if (moveTimer.current) {
      clearTimeout(moveTimer.current);
      moveTimer.current = null;
    }
    const fadeOut = Animated.parallel([
      Animated.timing(primaryOpacity, {
        toValue: 0,
        duration: WATERMARK_HIDE_FADE_MS,
        useNativeDriver: true,
      }),
      Animated.timing(secondaryOpacity, {
        toValue: 0,
        duration: WATERMARK_HIDE_FADE_MS,
        useNativeDriver: true,
      }),
    ]);
    fadeOut.start(({ finished }) => {
      // A resume can stop this animation halfway; only a completed fade-out
      // should unmount the overlay (otherwise play→pause races leave it gone).
      if (finished) setHidden(true);
    });
    return () => fadeOut.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Animated values are stable refs.
  }, [playing]);

  /* ------------------------------------------------------------------ */
  /* Watchdog + capture probe hooks.                                     */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (!playing || hidden) return;
    const id = setInterval(() => engine.current?.watchdog(), WATERMARK_WATCHDOG_MS);
    return () => clearInterval(id);
  }, [playing, hidden]);

  useEffect(() => {
    if (nonce <= 0) return;
    engine.current?.move();
  }, [nonce]);

  /* Never render anything that is not a well-formed server code. */
  const valid = isWatermarkCode(code);
  const warned = useRef(false);
  useEffect(() => {
    if (!valid && !warned.current) {
      warned.current = true;
      console.log('[watermark] malformed code — overlay not rendered');
    }
  }, [valid]);

  if (!valid || hidden) return null;

  const measureContainer = (event: LayoutChangeEvent) =>
    setContainer({
      width: event.nativeEvent.layout.width,
      height: event.nativeEvent.layout.height,
    });
  const measurePrimary = (event: LayoutChangeEvent) =>
    setPrimarySize({
      width: event.nativeEvent.layout.width,
      height: event.nativeEvent.layout.height,
    });
  const measureSecondary = (event: LayoutChangeEvent) =>
    setSecondarySize({
      width: event.nativeEvent.layout.width,
      height: event.nativeEvent.layout.height,
    });

  return (
    <Animated.View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      onLayout={measureContainer}
      testID="video-watermark"
    >
      <Animated.View
        onLayout={measurePrimary}
        testID="video-watermark-primary"
        style={[
          styles.copy,
          { opacity: primaryOpacity, transform: [{ translateX: primaryX }, { translateY: primaryY }] },
        ]}
      >
        <AppText lang="fr" size={11} weight="semibold" tone="white" numberOfLines={1} style={styles.text}>
          {code}
        </AppText>
      </Animated.View>

      <Animated.View
        onLayout={measureSecondary}
        testID="video-watermark-secondary"
        style={[
          styles.copy,
          {
            opacity: secondaryOpacity,
            transform: [{ translateX: secondaryX }, { translateY: secondaryY }],
          },
        ]}
      >
        <AppText lang="fr" size={9} weight="medium" tone="white" numberOfLines={1} style={styles.text}>
          {code}
        </AppText>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  copy: {
    position: 'absolute',
    top: 0,
    left: 0,
    paddingHorizontal: 2,
    paddingVertical: 3,
  },
  /** Light text + soft shadow reads on both dark and bright scenes at the
      low overall opacity the component applies. */
  text: {
    letterSpacing: 1.2,
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
