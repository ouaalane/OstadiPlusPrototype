/**
 * LessonPlayer — the production video surface for a lesson.
 *
 * Design goals (why this is a separate component):
 *  - Playback state (position, duration, playing, buffering) lives HERE, so a
 *    half-second time update re-renders the player only. The old screen
 *    re-rendered the whole lesson page (chapters, tabs, store selectors) on
 *    every tick, which is exactly the kind of UI-thread pressure that makes
 *    video controls and the surface stutter.
 *  - The `VideoView` mounts once per lesson, even when the player switches
 *    between inline and in-app fullscreen. Moving a video view between two
 *    places in the React tree tears down its native surface and produces
 *    black/flickering frames; here only the wrapper style changes.
 *  - The parent keys this component by lesson id, so every lesson gets a
 *    fresh player, a fresh resume position and fresh refs (the old screen
 *    reused stale resume refs when navigating with `replace`).
 *  - Android renders through a SurfaceView: it is the only surface type that
 *    reliably produces H.264 frames on the emulators and low-end devices this
 *    app targets. A TextureView rendered a black picture even though the
 *    decoder reported frames, so it is deliberately not used here.
 *
 * Controls: back, previous lesson, rewind 10 s, play/pause, forward 10 s,
 * next lesson, mute, fullscreen, and a draggable scrubber. Chrome hides after
 * four idle seconds of playback; tapping the picture reveals it without pausing.
 * The scrubber is
 * RTL-aware: in Arabic the timeline starts on the right, so the fill is
 * anchored right and taps/drags are mirrored. Playback pauses when the screen
 * loses focus or the app goes to the background; a video that has ended
 * restarts from zero on the next play.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { VideoPlayerStatus } from 'expo-video';
import { formatDuration } from '@ostadiplus/shared';

import { AppText, IconButton } from './ui';
import VideoWatermark from './VideoWatermark';
import { usePlayerControls } from './usePlayerControls';
import { useI18n } from '../i18n/useI18n';
import { colors, overlays, spacing } from '../theme';

type IconName = keyof typeof Ionicons.glyphMap;

/** Stable across renders — the video view is a PureComponent. */
const FULLSCREEN_OPTIONS = { enable: false } as const;

/**
 * SurfaceView (the platform default) is used here: it is the configuration
 * verified on both the emulator and hardware devices. TextureView rendered a
 * black picture with the goldfish decoder in this project even while the
 * timeline advanced. The watermark and custom controls are drawn above the
 * surface; the view is never moved or remounted while playing.
 */
const SURFACE_TYPE = Platform.OS === 'android' ? ('surfaceView' as const) : undefined;

const SKIP_SEC = 10;

const MemoWatermark = React.memo(VideoWatermark);

export interface LessonPlayerProps {
  lessonId: string;
  /** Bundled video asset (the numeric `require()` result). */
  source: number | { uri: string };
  poster?: import('react-native').ImageSourcePropType;
  title: string;
  /** Manifest duration, used before the decoder reports the real one. */
  expectedDuration: number;
  /** Saved position for this lesson (seconds). */
  resumeAt: number;
  /** Server-issued traceability code, or null while the grant is loading. */
  code: string | null;
  /** Bumped by the screen when a screen capture is detected. */
  captureNonce: number;
  fullscreen: boolean;
  hasPrev: boolean;
  hasNext: boolean;
  onBack: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToggleFullscreen: () => void;
  onProgress: (lessonId: string, positionSec: number) => void;
  onCompleted: (lessonId: string) => void;
}

/** Start at the saved position unless it is at the very end of the clip. */
function resumeStart(resumeAt: number, duration: number): number {
  if (!Number.isFinite(resumeAt) || resumeAt <= 3) return 0;
  if (Number.isFinite(duration) && duration > 0 && resumeAt >= duration - 5) return 0;
  return resumeAt;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function percent(value: number): `${number}%` {
  return `${clamp01(value) * 100}%` as `${number}%`;
}

/**
 * Thin wrapper whose only job is remounting the surface after a fatal player
 * error. The outer component is already keyed by lesson id, so `attempt`
 * resets naturally when the student moves to another lesson.
 */
export default function LessonPlayer(props: LessonPlayerProps) {
  const [attempt, setAttempt] = useState(0);
  return (
    <PlayerSurface
      key={attempt}
      {...props}
      onRetry={() => setAttempt((value) => value + 1)}
    />
  );
}

type PlayerSurfaceProps = LessonPlayerProps & { onRetry: () => void };

function PlayerSurface({
  lessonId,
  source,
  poster,
  title,
  expectedDuration,
  resumeAt,
  code,
  captureNonce,
  fullscreen,
  hasPrev,
  hasNext,
  onBack,
  onPrev,
  onNext,
  onToggleFullscreen,
  onProgress,
  onCompleted,
  onRetry,
}: PlayerSurfaceProps) {
  const { dir } = useI18n();
  const rtl = dir === 'rtl';

  const startAt = resumeStart(resumeAt, expectedDuration);

  const player = useVideoPlayer(source, (instance) => {
    // Half-second ticks keep the scrubber smooth without flooding JS.
    instance.timeUpdateEventInterval = 0.5;
    instance.staysActiveInBackground = false;
    instance.keepScreenOnWhilePlaying = true;
    if (startAt > 0) instance.currentTime = startAt;
  });

  /**
   * Give the native view a moment to attach its surface before starting
   * playback. Starting in the same turn as player creation races the surface
   * attach: the first frames can be decoded into a placeholder surface, after
   * which the visible surface stays on its initial frame (black on Android).
   */
  const autoStarted = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (autoStarted.current) return;
      const timer = setTimeout(() => {
        if (autoStarted.current) return;
        autoStarted.current = true;
        if (AppState.currentState !== 'active') return;
        if (startAt > 0) player.currentTime = startAt;
        player.play();
      }, 600);
      return () => clearTimeout(timer);
    }, [player, startAt]),
  );

  /**
   * `useVideoPlayer` releases its shared native object as soon as this
   * component unmounts. Focus/blur cleanups can run in the same unmount pass,
   * so pausing without this guard throws
   * "Cannot use shared object that was already released" and lands in a
   * RedBox when navigating back or to the next lesson.
   */
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const safePause = useCallback(() => {
    try {
      player.pause();
    } catch {
      // Native player already released (screen is unmounting).
    }
  }, [player]);

  const [playing, setPlaying] = useState(true);
  const [position, setPosition] = useState(startAt);
  const [duration, setDuration] = useState(expectedDuration > 0 ? expectedDuration : 0);
  const [status, setStatus] = useState<VideoPlayerStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [firstFrame, setFirstFrame] = useState(false);

  const [dragging, setDragging] = useState(false);
  const [dragRatio, setDragRatio] = useState(0);

  const positionRef = useRef(startAt);
  const durationRef = useRef(duration);
  durationRef.current = duration;
  const completedRef = useRef(false);
  const lastSavedRef = useRef(0);
  const draggingRef = useRef(false);
  const trackRef = useRef<View>(null);
  const barPageXRef = useRef<number | null>(null);
  const barWidthRef = useRef(0);

  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;
  const onCompletedRef = useRef(onCompleted);
  onCompletedRef.current = onCompleted;

  /** Persist at most every 5 s, plus immediately on pause/leave/error. */
  const saveNow = useCallback(
    (force = false) => {
      if (completedRef.current) return;
      const current = positionRef.current;
      if (!Number.isFinite(current) || current < 1) return;
      if (!force && Math.abs(current - lastSavedRef.current) < 5) return;
      lastSavedRef.current = current;
      onProgressRef.current(lessonId, Math.floor(current));
    },
    [lessonId],
  );

  useEffect(() => {
    const subscriptions = [
      player.addListener('timeUpdate', (payload) => {
        const current = payload.currentTime;
        positionRef.current = current;
        if (!draggingRef.current) setPosition(current);
        saveNow();
      }),
      player.addListener('playingChange', (payload) => {
        setPlaying(payload.isPlaying);
        if (!payload.isPlaying) saveNow(true);
      }),
      player.addListener('sourceLoad', (payload) => {
        if (payload.duration > 0) setDuration(payload.duration);
      }),
      player.addListener('statusChange', (payload) => {
        setStatus(payload.status);
        if (payload.status === 'error') {
          setPlaying(false);
          saveNow(true);
          console.log(`[player] playback error: ${payload.error?.message ?? 'unknown'}`);
          setError(
            rtl ? 'تعذّر تشغيل الفيديو على هذا الجهاز.' : 'Impossible de lire la vidéo sur cet appareil.',
          );
        } else if (payload.status === 'readyToPlay') {
          setError(null);
        }
      }),
      player.addListener('playToEnd', () => {
        completedRef.current = true;
        setPlaying(false);
        setPosition(durationRef.current);
        positionRef.current = durationRef.current;
        onCompletedRef.current(lessonId);
      }),
      player.addListener('mutedChange', (payload) => setMuted(payload.muted)),
    ];

    // Events may have fired before the listeners were attached.
    setPlaying(player.playing);
    setStatus(player.status);
    if (player.duration > 0) setDuration(player.duration);

    return () => {
      subscriptions.forEach((subscription) => subscription.remove());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `rtl` only picks an error string.
  }, [player, lessonId, saveNow]);

  /* Persist the last known position when the lesson/player unmounts. */
  useEffect(() => () => saveNow(true), [saveNow]);

  /* Leaving the screen (next lesson, back, tab switch) must stop the audio. */
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (mountedRef.current) safePause();
        saveNow(true);
      };
    }, [safePause, saveNow]),
  );

  /* Backgrounding the app also stops playback — no audio in the background. */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        safePause();
        saveNow(true);
      }
    });
    return () => subscription.remove();
  }, [safePause, saveNow]);

  const loading = (!firstFrame || status === 'loading') && !error;
  const { controlsVisible, revealControls, toggleControls } = usePlayerControls({
    playing,
    loading,
    dragging,
    hasError: !!error,
    fullscreen,
  });

  const togglePlay = useCallback(() => {
    revealControls();
    autoStarted.current = true;
    // The visible state can be one event tick ahead of the native player
    // (especially during the 600 ms surface-attach delay), so decide from the
    // player itself to avoid a tap that pauses an already-paused player.
    if (player.playing) {
      player.pause();
      return;
    }
    const total = durationRef.current || expectedDuration;
    // At the end the player is stopped: restart from the beginning instead
    // of silently doing nothing (a bug in the previous implementation).
    if (total > 0 && positionRef.current >= total - 0.5) {
      player.currentTime = 0;
      positionRef.current = 0;
      setPosition(0);
      completedRef.current = false;
    }
    player.play();
  }, [player, expectedDuration, revealControls]);

  const seekTo = useCallback(
    (seconds: number) => {
      revealControls();
      const total = durationRef.current || expectedDuration;
      const max = Math.max(0, total - 0.25);
      const target = Math.max(0, Math.min(seconds, max));
      player.currentTime = target;
      positionRef.current = target;
      setPosition(target);
      if (total <= 0 || target < total - 1) completedRef.current = false;
    },
    [player, expectedDuration, revealControls],
  );

  const seekBy = useCallback(
    (delta: number) => seekTo(positionRef.current + delta),
    [seekTo],
  );

  const handleFirstFrame = useCallback(() => setFirstFrame(true), []);

  const measureTrack = useCallback(() => {
    const node = trackRef.current;
    if (!node) return;
    node.measureInWindow((x, _y, width) => {
      barPageXRef.current = x;
      barWidthRef.current = width;
    });
  }, []);

  const ratioFromEvent = useCallback(
    (event: GestureResponderEvent) => {
      const width = barWidthRef.current;
      if (width <= 0) return 0;
      const { pageX, locationX } = event.nativeEvent;
      const base = barPageXRef.current;
      const local = base === null ? locationX : pageX - base;
      const ratio = clamp01(local / width);
      return rtl ? 1 - ratio : ratio;
    },
    [rtl],
  );

  const startScrub = useCallback(
    (event: GestureResponderEvent) => {
      draggingRef.current = true;
      setDragging(true);
      setDragRatio(ratioFromEvent(event));
    },
    [ratioFromEvent],
  );

  const moveScrub = useCallback(
    (event: GestureResponderEvent) => {
      if (!draggingRef.current) return;
      setDragRatio(ratioFromEvent(event));
    },
    [ratioFromEvent],
  );

  const commitScrub = useCallback(
    (event: GestureResponderEvent) => {
      if (!draggingRef.current) return;
      const ratio = ratioFromEvent(event);
      draggingRef.current = false;
      setDragging(false);
      seekTo(ratio * (durationRef.current || expectedDuration));
    },
    [ratioFromEvent, seekTo, expectedDuration],
  );

  const cancelScrub = useCallback(() => {
    draggingRef.current = false;
    setDragging(false);
  }, []);

  const total = duration || expectedDuration;
  const progressRatio = total > 0 ? clamp01(position / total) : 0;
  const shownRatio = dragging ? dragRatio : progressRatio;
  const shownSeconds = dragging ? dragRatio * total : position;
  const atEnd = total > 0 && position >= total - 0.5;

  const pauseLabel = rtl ? 'إيقاف مؤقت' : 'Pause';
  const playLabel = atEnd
    ? rtl
      ? 'إعادة من البداية'
      : 'Rejouer depuis le début'
    : rtl
      ? 'تشغيل'
      : 'Lecture';

  return (
    <View style={styles.root}>
      <VideoView
        player={player}
        style={styles.videoSurface}
        contentFit="contain"
        nativeControls={false}
        fullscreenOptions={FULLSCREEN_OPTIONS}
        surfaceType={SURFACE_TYPE}
        onFirstFrameRender={handleFirstFrame}
      />

      {/* Poster covers the black surface until the first decoded frame. */}
      {poster && !firstFrame ? (
        <Image source={poster} style={StyleSheet.absoluteFill} resizeMode="contain" />
      ) : null}

      {/* The whole chrome disappears; the video and watermark stay mounted. */}
      {controlsVisible ? (
        <>
          <LinearGradient
            pointerEvents="none"
            colors={[overlays.ink50, overlays.ink00]}
            style={styles.topScrim}
          />
          <LinearGradient
            pointerEvents="none"
            colors={[overlays.ink00, overlays.ink68]}
            style={styles.bottomScrim}
          />
        </>
      ) : null}

      <Pressable
        onPress={toggleControls}
        style={StyleSheet.absoluteFill}
        accessibilityRole="button"
        accessibilityLabel={
          controlsVisible
            ? rtl ? 'إخفاء أدوات التحكم' : 'Masquer les commandes'
            : rtl ? 'إظهار أدوات التحكم' : 'Afficher les commandes'
        }
      />

      {error ? (
        <View style={styles.errorLayer}>
          <Ionicons name="alert-circle" size={30} color={colors.white} />
          <AppText size={13.5} weight="medium" tone="white" style={styles.errorText}>
            {error}
          </AppText>
          <Pressable
            onPress={() => {
              saveNow(true);
              onRetry();
            }}
            style={({ pressed }) => [styles.retryButton, pressed && { opacity: 0.75 }]}
            accessibilityRole="button"
            accessibilityLabel={rtl ? 'إعادة المحاولة' : 'Réessayer'}
          >
            <Ionicons name="refresh" size={15} color={colors.white} importantForAccessibility="no" />
            <AppText size={12.5} weight="semibold" tone="white">
              {rtl ? 'إعادة المحاولة' : 'Réessayer'}
            </AppText>
          </Pressable>
        </View>
      ) : null}

      {controlsVisible ? (
        <SafeAreaView
          style={styles.overlay}
          pointerEvents="box-none"
          onTouchStart={revealControls}
          edges={fullscreen ? ['top', 'left', 'right', 'bottom'] : ['top']}
        >
          <View style={[styles.topBar, rtl ? styles.rowReverse : styles.row]} pointerEvents="box-none">
            <IconButton
              icon={rtl ? 'chevron-forward' : 'chevron-back'}
              variant="onPhoto"
              size={38}
              label={rtl ? 'رجوع' : 'Retour'}
              onPress={onBack}
            />
            <AppText
              size={13}
              weight="semibold"
              tone="white"
              numberOfLines={1}
              style={styles.title}
            >
              {title}
            </AppText>
            <IconButton
              icon={muted ? 'volume-mute' : 'volume-high'}
              variant="onPhoto"
              size={38}
              label={
                muted
                  ? rtl
                    ? 'إلغاء كتم الصوت'
                    : 'Activer le son'
                  : rtl
                    ? 'كتم الصوت'
                    : 'Couper le son'
              }
              onPress={() => {
                revealControls();
                player.muted = !muted;
              }}
            />
            <IconButton
              icon={fullscreen ? 'contract' : 'expand'}
              variant="onPhoto"
              size={38}
              label={
                fullscreen
                  ? rtl
                    ? 'إنهاء ملء الشاشة'
                    : 'Quitter le plein écran'
                  : rtl
                    ? 'ملء الشاشة'
                    : 'Plein écran'
              }
              onPress={() => {
                revealControls();
                onToggleFullscreen();
              }}
            />
          </View>

          {!error ? (
            <View style={styles.centerArea} pointerEvents="box-none">
              <View style={styles.centerRow} pointerEvents="box-none">
                <SeekButton
                  direction="back"
                  label={rtl ? 'الرجوع 10 ثوانٍ' : 'Reculer de 10 secondes'}
                  onPress={() => seekBy(-SKIP_SEC)}
                />
                <Pressable
                  onPress={togglePlay}
                  style={({ pressed }) => [styles.bigPlay, pressed && { opacity: 0.8 }]}
                  accessibilityRole="button"
                  accessibilityLabel={playing ? pauseLabel : playLabel}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Ionicons
                      name={playing ? 'pause' : 'play'}
                      size={28}
                      color={colors.white}
                      style={playing ? undefined : { marginLeft: 3 }}
                      importantForAccessibility="no"
                    />
                  )}
                </Pressable>
                <SeekButton
                  direction="forward"
                  label={rtl ? 'التقدم 10 ثوانٍ' : 'Avancer de 10 secondes'}
                  onPress={() => seekBy(SKIP_SEC)}
                />
              </View>
            </View>
          ) : (
            <View style={{ flex: 1 }} pointerEvents="none" />
          )}

          <View style={styles.bottomArea} pointerEvents="box-none">
            <View
              style={[styles.timeRow, rtl ? styles.rowReverse : styles.row]}
              pointerEvents="box-none"
            >
              <ControlButton
                icon="play-skip-back"
                label={rtl ? 'الدرس السابق' : 'Leçon précédente'}
                size={28}
                disabled={!hasPrev}
                onPress={hasPrev ? onPrev : undefined}
              />
              <AppText size={11.5} weight="medium" tone="white" style={styles.timeLabel}>
                {formatDuration(shownSeconds)}
              </AppText>
              <View
                ref={trackRef}
                style={styles.scrubTrack}
                onLayout={measureTrack}
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderGrant={startScrub}
                onResponderMove={moveScrub}
                onResponderRelease={commitScrub}
                onResponderTerminate={cancelScrub}
                onResponderTerminationRequest={() => false}
                accessibilityRole="adjustable"
                accessibilityLabel={rtl ? 'شريط التقدم' : 'Barre de progression'}
                accessibilityValue={{
                  min: 0,
                  max: Math.max(1, Math.round(total)),
                  now: Math.round(shownSeconds),
                  text: `${formatDuration(shownSeconds)} / ${formatDuration(total)}`,
                }}
                accessibilityActions={[
                  { name: 'increment', label: rtl ? '+10 ثوانٍ' : '+10 secondes' },
                  { name: 'decrement', label: rtl ? '-10 ثوانٍ' : '-10 secondes' },
                ]}
                onAccessibilityAction={(event) => {
                  if (event.nativeEvent.actionName === 'increment') seekBy(SKIP_SEC);
                  if (event.nativeEvent.actionName === 'decrement') seekBy(-SKIP_SEC);
                }}
              >
                <View style={styles.scrubBg} />
                <View
                  style={[
                    styles.scrubFill,
                    { width: percent(shownRatio) },
                    rtl ? styles.fillRtl : styles.fillLtr,
                  ]}
                />
                <View
                  style={[
                    styles.scrubThumb,
                    rtl
                      ? { right: percent(shownRatio), marginRight: -6 }
                      : { left: percent(shownRatio), marginLeft: -6 },
                  ]}
                />
              </View>
              <AppText size={11.5} weight="medium" tone="white" style={styles.timeLabel}>
                {formatDuration(total)}
              </AppText>
              <ControlButton
                icon="play-skip-forward"
                label={rtl ? 'الدرس التالي' : 'Leçon suivante'}
                size={28}
                disabled={!hasNext}
                onPress={hasNext ? onNext : undefined}
              />
            </View>
          </View>
        </SafeAreaView>
      ) : null}

      {code ? (
        <MemoWatermark
          code={code}
          playing={playing && !error}
          nonce={captureNonce}
        />
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Small control primitives                                            */
/* ------------------------------------------------------------------ */

function ControlButton({
  icon,
  label,
  onPress,
  disabled,
  size = 40,
}: {
  icon: IconName;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  size?: number;
}) {
  const off = !!disabled || !onPress;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: off }}
      style={({ pressed }) => [
        styles.controlButton,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity: off ? 0.35 : pressed ? 0.65 : 1,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={Math.round(size * 0.46)}
        color={colors.white}
        importantForAccessibility="no"
      />
    </Pressable>
  );
}

function SeekButton({
  direction,
  label,
  onPress,
}: {
  direction: 'back' | 'forward';
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.controlButton, styles.seekButton, pressed && { opacity: 0.65 }]}
    >
      <View style={styles.seekGlyph}>
        {direction === 'back' ? (
          <Ionicons name="play-back" size={17} color={colors.white} importantForAccessibility="no" />
        ) : null}
        <AppText lang="fr" size={9} weight="bold" tone="white" style={styles.seekNumber}>
          10
        </AppText>
        {direction === 'forward' ? (
          <Ionicons name="play-forward" size={17} color={colors.white} importantForAccessibility="no" />
        ) : null}
      </View>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Styles — colours match the rest of the app's dark video chrome.     */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.black },
  // Explicit dimensions also size the HTML video in browser previews; native
  // absolute positioning continues to fill the same inline/fullscreen slot.
  videoSurface: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowReverse: { flexDirection: 'row-reverse', alignItems: 'center' },

  topScrim: { position: 'absolute', top: 0, left: 0, right: 0, height: 88 },
  bottomScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 100 },

  overlay: { ...StyleSheet.absoluteFill, justifyContent: 'space-between' },

  topBar: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  title: {
    flex: 1,
    textShadowColor: overlays.ink60,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  centerArea: { flex: 1, justifyContent: 'center' },
  centerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  controlButton: {
    backgroundColor: overlays.ink42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seekButton: { width: 42, height: 42, borderRadius: 21 },
  seekGlyph: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  seekNumber: { letterSpacing: 0 },
  bigPlay: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: overlays.ink55,
    alignItems: 'center',
    justifyContent: 'center',
  },

  bottomArea: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  timeRow: { gap: spacing.sm },
  timeLabel: { minWidth: 36, textAlign: 'center' },
  scrubTrack: { flex: 1, height: 28, justifyContent: 'center' },
  scrubBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: overlays.white32,
  },
  scrubFill: {
    position: 'absolute',
    top: 12,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.brand,
  },
  fillLtr: { left: 0 },
  fillRtl: { right: 0 },
  scrubThumb: {
    position: 'absolute',
    top: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.brand,
  },

  errorLayer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: overlays.ink86,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  errorText: { textAlign: 'center' },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xs,
    backgroundColor: overlays.white18,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
