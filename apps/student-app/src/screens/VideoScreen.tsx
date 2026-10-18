/**
 * Video lesson — the lesson player.
 *
 * Custom overlay (back, mute, fullscreen, big play/pause, time labels and a
 * seekable scrubber), the meta block, the Save / Download action chips, the
 * Overview · Chapters · Resources tabs, and the sticky Prev / «Complete &
 * next» bar.
 *
 * Playback is gated by the student's enrollment (published course + active,
 * non-expired subscription). Every playback start asks the watermark API
 * for a fresh traceability code (server-side generation only, see apps/api)
 * which `VideoWatermark` renders as a moving overlay; the platform's
 * screen-capture protection is engaged while this screen is open. Fullscreen
 * is rendered in-app so the watermark and the custom controls remain visible
 * and functional there too.
 *
 * Bilingual: strings are authored inline per language, layout flips RTL↔LTR.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, BackHandler, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { addScreenshotListener, usePreventScreenCapture } from 'expo-screen-capture';

import {
  allLessons,
  courseProgress,
  courseTeacher,
  formatDuration,
  formatSize,
  relativeTime,
  type Lesson,
} from '@ostadiplus/shared';

import { useI18n } from '../i18n/useI18n';
import { useLayout } from '../i18n/layout';
import {
  ActionChip,
  AppText,
  Badge,
  Card,
  Eyebrow,
  IconButton,
  NoticeCard,
  Pill,
  PrimaryButton,
  ProgressBar,
} from '../components/ui';
import { lessonMetaText, lessonRoute } from '../lib/lesson';
import VideoWatermark from '../components/VideoWatermark';
import { requestPlaybackGrant, type PlaybackGrant } from '../lib/watermark-api';
import { resolveLessonMedia } from '../media/lookup';
import { useStore } from '../store/StudentStore';
import { colors, radius, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type TabKey = 'about' | 'chapters' | 'files';

const TABS: { key: TabKey; labelAr: string; labelFr: string }[] = [
  { key: 'about', labelAr: 'نظرة عامة', labelFr: 'Aperçu' },
  { key: 'chapters', labelAr: 'الفصول', labelFr: 'Chapitres' },
  { key: 'files', labelAr: 'الملفات', labelFr: 'Ressources' },
];

const MONTHS_FR = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
];
const MONTHS_AR = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'ماي',
  'يونيو',
  'يوليوز',
  'غشت',
  'شتنبر',
  'أكتوبر',
  'نونبر',
  'دجنبر',
];

export default function VideoScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'Video'>>();
  const {
    state,
    me,
    statusOf,
    progressOf,
    saveProgress,
    markCompleted,
    myDownloads,
    downloadLesson,
    deleteDownload,
    downloadStatusFor,
  } = useStore();
  const { lang, t, dir } = useI18n();
  const l = useLayout(lang);
  const rtl = dir === 'rtl';
  const [tab, setTab] = useState<TabKey>('about');
  const [bookmarked, setBookmarked] = useState(false);

  const found = useMemo(() => {
    for (const course of state.courses) {
      const lesson = allLessons(course).find((x) => x.id === params.lessonId);
      if (lesson) return { course, lesson };
    }
    return null;
  }, [state.courses, params.lessonId]);

  /**
   * Playback authorization — reuses the exact enrollment rules the rest of
   * the app enforces (published course + active, non-expired subscription).
   * The route only carries a `lessonId`, so this check is what stops a
   * hand-crafted id from playing a course the signed-in student cannot
   * access, and it guarantees the watermark identity belongs to a student
   * who is genuinely entitled to the lesson.
   */
  const courseAuthorized = useMemo(() => {
    if (!found || !me) return false;
    if (found.course.status !== 'published') return false;
    return statusOf(found.course.id) === 'active';
  }, [found, me, statusOf]);

  const saved = progressOf(params.lessonId);
  const resumeAt = useRef(saved?.positionSec ?? 0);

  const media = found
    ? resolveLessonMedia(
        found.lesson.file,
        found.lesson.kind as 'video' | 'pdf',
        found.lesson.durationSec,
      )
    : { kind: 'missing' as const };

  const [playing, setPlaying] = useState(true);
  const [position, setPosition] = useState(resumeAt.current);
  const [duration, setDuration] = useState(found?.lesson.durationSec ?? 0);
  const [muted, setMuted] = useState(false);
  const [barWidth, setBarWidth] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  /**
   * In-app fullscreen: the video, its custom controls and the ownership
   * watermark all stay inside the React Native view tree. The platform's
   * native fullscreen surface lives outside it — no JS overlay can be drawn
   * over it — which would silently drop the watermark from fullscreen
   * recordings. Android's hardware back exits fullscreen before it leaves
   * the lesson.
   */
  useEffect(() => {
    if (!fullscreen) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setFullscreen(false);
      return true;
    });
    return () => sub.remove();
  }, [fullscreen]);

  /**
   * Screen-capture protection + detection. While this screen is mounted the
   * platform blocks screen capture (FLAG_SECURE on Android; recording
   * protection + a screenshot callback on iOS — no extra permissions on
   * Android 14+). A detected capture re-randomises the watermark position.
   */
  usePreventScreenCapture('lesson-player');
  const [captureNonce, setCaptureNonce] = useState(0);
  useEffect(() => {
    const subscription = addScreenshotListener(() => {
      console.log('[watermark] screen capture detected — re-randomising the overlay');
      setCaptureNonce((n) => n + 1);
    });
    return () => subscription.remove();
  }, []);

  /**
   * Playback grant — every playback start asks the watermark API for a
   * fresh traceability code (server-side generation only, see apps/api).
   * The code is the only thing the overlay renders; the server keeps the
   * code → student / course / video / session mapping for leak tracing.
   */
  const [grant, setGrant] = useState<PlaybackGrant | null>(null);
  useEffect(() => {
    setGrant(null);
    if (!found || !courseAuthorized || !me) return;
    const target = found;
    let cancelled = false;
    void (async () => {
      try {
        const issued = await requestPlaybackGrant({
          studentId: me.id,
          courseId: target.course.id,
          videoId: target.lesson.id,
        });
        if (!cancelled) setGrant(issued);
      } catch (error) {
        console.log(`[watermark] no playback grant issued: ${String(error)}`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [found, courseAuthorized, me]);

  const player = useVideoPlayer(
    // Never hand the player a source the current session is not entitled to.
    media.kind === 'video' && courseAuthorized ? media.source : null,
    (p) => {
      p.timeUpdateEventInterval = 1;
      if (resumeAt.current > 3) p.currentTime = resumeAt.current;
      p.play();
    },
  );

  /** Persist progress + mirror playback state into the custom overlay. */
  useEffect(() => {
    const timeSub = player.addListener('timeUpdate', (payload) => {
      const current = payload?.currentTime ?? 0;
      setPosition(current);
      if (current > 1) saveProgress(params.lessonId, Math.floor(current));
    });
    const endSub = player.addListener('playToEnd', () => {
      markCompleted(params.lessonId);
    });
    const playSub = player.addListener('playingChange', (payload) => {
      setPlaying(payload.isPlaying);
    });
    const loadSub = player.addListener('sourceLoad', (payload) => {
      if (payload.duration > 0) setDuration(payload.duration);
    });
    const muteSub = player.addListener('mutedChange', (payload) => {
      setMuted(payload.muted);
    });
    return () => {
      timeSub.remove();
      endSub.remove();
      playSub.remove();
      loadSub.remove();
      muteSub.remove();
    };
  }, [player, params.lessonId, saveProgress, markCompleted]);

  if (!found || media.kind !== 'video' || !courseAuthorized) {
    const unauthorized = !!found && media.kind === 'video' && !courseAuthorized;
    return (
      <SafeAreaView style={styles.safeMissing} edges={['top']}>
        <View style={styles.missing}>
          <AppText size={15} tone="muted" style={{ textAlign: 'center' }}>
            {unauthorized
              ? rtl
                ? 'لا تملك إذناً لمشاهدة هذا الدرس.'
                : "Vous n'avez pas l'autorisation de regarder cette leçon."
              : rtl
                ? 'تعذّر تحميل الفيديو في هذا الجهاز.'
                : 'Impossible de charger la vidéo sur cet appareil.'}
          </AppText>
          <PrimaryButton
            label={rtl ? 'رجوع' : 'Retour'}
            variant="soft"
            onPress={() => navigation.goBack()}
          />
        </View>
      </SafeAreaView>
    );
  }

  const { course, lesson } = found;
  const lessons = allLessons(course).filter((x) => x.published);
  const index = lessons.findIndex((x) => x.id === lesson.id);
  const prev = index > 0 ? lessons[index - 1] : undefined;
  const next = lessons[index + 1];
  const completed = progressOf(lesson.id)?.completed ?? false;
  const progress = me ? courseProgress(state, me.id, course) : null;
  const courseFiles = lessons.filter((x) => x.kind === 'pdf');

  const downloadStatus = downloadStatusFor(lesson.id);
  const downloadRecord = myDownloads.find((d) => d.lessonId === lesson.id);
  const isDownloaded = downloadStatus === 'complete';

  const updatedAt = new Date(course.updatedAt);
  const updatedLabel = `${updatedAt.getFullYear()} ${
    rtl ? MONTHS_AR[updatedAt.getMonth()] : MONTHS_FR[updatedAt.getMonth()]
  }`;

  const openLesson = (target: Lesson) => {
    navigation.replace(lessonRoute(target.kind), { lessonId: target.id });
  };

  const togglePlay = () => {
    if (playing) player.pause();
    else player.play();
  };

  const seekTo = (ratio: number) => {
    if (duration <= 0) return;
    const clamped = Math.max(0, Math.min(1, ratio));
    player.currentTime = clamped * duration;
    setPosition(clamped * duration);
  };

  const onDownloadChip = () => {
    if (isDownloaded) {
      Alert.alert(
        rtl ? 'حذف الملف المحمّل' : 'Supprimer le fichier téléchargé',
        rtl
          ? 'سيُحذف هذا الدرس من التخزين المحلي.'
          : 'Cette leçon sera retirée du stockage local.',
        [
          { text: rtl ? 'إلغاء' : 'Annuler', style: 'cancel' },
          {
            text: rtl ? 'حذف' : 'Supprimer',
            style: 'destructive',
            onPress: () => {
              void deleteDownload(lesson.id);
            },
          },
        ],
      );
      return;
    }
    if (downloadStatus === 'downloading') return;
    void downloadLesson(lesson.id);
  };

  const completeAndNext = () => {
    markCompleted(lesson.id);
    if (next) openLesson(next);
    else navigation.goBack();
  };

  /**
   * The video surface + custom overlay + ownership watermark, as one block.
   * Rendered either inline in the scroll view or lifted into the in-app
   * fullscreen overlay — a single definition keeps both presentations
   * identical (same player, same controls, same watermark).
   */
  const videoBlock = (
    <View style={fullscreen ? styles.videoWrapFullscreen : styles.videoWrap}>
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            nativeControls={false}
            fullscreenOptions={{ enable: false }}
          />

          {/* tap surface toggles playback */}
          <Pressable
            onPress={togglePlay}
            style={StyleSheet.absoluteFill}
            accessibilityRole="button"
            accessibilityLabel={
              playing
                ? rtl
                  ? 'إيقاف مؤقت'
                  : 'Pause'
                : rtl
                  ? 'تشغيل'
                  : 'Lecture'
            }
          />

          <SafeAreaView edges={['top']} style={styles.overlay} pointerEvents="box-none">
            <View style={[styles.overlayTop, l.row]} pointerEvents="box-none">
              <IconButton
                icon={rtl ? 'chevron-forward' : 'chevron-back'}
                variant="onPhoto"
                size={38}
                label={t('back')}
                onPress={() => {
                  if (fullscreen) setFullscreen(false);
                  else navigation.goBack();
                }}
              />
              <View style={{ flex: 1 }} />
              {isDownloaded ? (
                <Badge
                  label={rtl ? 'محفوظ للاستعمال دون اتصال' : 'Disponible hors connexion'}
                  tone="dark"
                />
              ) : null}
              <IconButton
                icon={muted ? 'volume-mute' : 'volume-high'}
                variant="onPhoto"
                size={38}
                label={muted ? (rtl ? 'إلغاء الكتم' : 'Activer le son') : rtl ? 'كتم الصوت' : 'Couper le son'}
                onPress={() => {
                  player.muted = !muted;
                }}
              />
              {fullscreen ? (
                <IconButton
                  icon="contract"
                  variant="onPhoto"
                  size={38}
                  label={rtl ? 'إنهاء ملء الشاشة' : 'Quitter le plein écran'}
                  onPress={() => setFullscreen(false)}
                />
              ) : (
                <IconButton
                  icon="expand"
                  variant="onPhoto"
                  size={38}
                  label={rtl ? 'ملء الشاشة' : 'Plein écran'}
                  onPress={() => setFullscreen(true)}
                />
              )}
            </View>

            <View style={{ flex: 1 }} pointerEvents="none" />

            <Pressable
              onPress={togglePlay}
              style={styles.bigPlay}
              accessibilityRole="button"
              accessibilityLabel={
                playing ? (rtl ? 'إيقاف مؤقت' : 'Pause') : rtl ? 'تشغيل' : 'Lecture'
              }
            >
              <Ionicons
                name={playing ? 'pause' : 'play'}
                size={26}
                color={colors.white}
                style={playing ? undefined : { marginLeft: 3 }}
                importantForAccessibility="no"
              />
            </Pressable>

            <View style={{ flex: 1 }} pointerEvents="none" />

            <View style={[styles.overlayBottom, l.row]}>
              <AppText size={11.5} weight="medium" tone="white">
                {formatDuration(position)}
              </AppText>
              <Pressable
                style={styles.scrubTrack}
                onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
                onPress={(e) => {
                  if (barWidth <= 0) return;
                  const x = e.nativeEvent.locationX;
                  seekTo(rtl ? 1 - x / barWidth : x / barWidth);
                }}
                accessibilityRole="adjustable"
                accessibilityLabel={rtl ? 'شريط التقدم' : 'Barre de progression'}
              >
                <View style={styles.scrubBg} />
                <View
                  style={[
                    styles.scrubFill,
                    {
                      width: `${duration > 0 ? Math.min(100, (position / duration) * 100) : 0}%`,
                    },
                  ]}
                />
              </Pressable>
              <AppText size={11.5} weight="medium" tone="white">
                {formatDuration(duration || lesson.durationSec)}
              </AppText>
            </View>
          </SafeAreaView>

          {/* Moving ownership watermark — the server-issued traceability
              code, drawn above the video and controls but
              pointerEvents="none", so it can never block them. */}
          {grant ? (
            <VideoWatermark
              key={grant.code}
              code={grant.code}
              playing={playing}
              nonce={captureNonce}
            />
          ) : null}
    </View>
  );

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ---- video + custom overlay ---- */}
        {fullscreen ? <View style={styles.videoWrap} /> : videoBlock}

        <View style={styles.body}>
          {/* ---- meta ---- */}
          <View style={[l.rowBetween, { gap: spacing.sm }]}>
            <Pill label={course.level} tone="brand" />
            {completed ? <Pill label={rtl ? 'مكتمل ✓' : 'terminé ✓'} tone="success" dot /> : null}
          </View>

          <AppText size={18} weight="bold" tone="ink" style={{ marginTop: spacing.md }}>
            {lesson.title}
          </AppText>
          <AppText size={13} tone="muted" style={{ marginTop: 3 }}>
            {rtl ? 'الأستاذ ' : 'Professeur '}
            {courseTeacher(state, course).name}
          </AppText>
          <AppText size={11.5} tone="faint" style={{ marginTop: 3 }}>
            {rtl
              ? `درس ${index + 1} من ${lessons.length} · ${formatDuration(lesson.durationSec)}`
              : `Leçon ${index + 1} sur ${lessons.length} · ${formatDuration(lesson.durationSec)}`}
            {` · ${formatSize(lesson.sizeMb)}`}
            {resumeAt.current > 5 && !completed
              ? rtl
                ? ` · توقفت عند ${formatDuration(resumeAt.current)}`
                : ` · Arrêté à ${formatDuration(resumeAt.current)}`
              : ''}
          </AppText>
          {downloadRecord ? (
            <AppText size={11.5} tone="faint" style={{ marginTop: 3 }}>
              {rtl ? 'تم الحفظ ' : 'Enregistré '}
              {relativeTime(downloadRecord.downloadedAt, lang)}
            </AppText>
          ) : null}
          <AppText size={11.5} tone="faint" style={{ marginTop: 3 }}>
            {rtl ? 'آخر تحديث ' : 'Mis à jour '}
            {updatedLabel}
          </AppText>

          {/* ---- action chips ---- */}
          <View style={[l.row, styles.chipRow]}>
            <ActionChip
              icon={bookmarked ? 'bookmark' : 'bookmark-outline'}
              label={rtl ? 'حفظ' : 'Enregistrer'}
              active={bookmarked}
              onPress={() => setBookmarked((b) => !b)}
            />
            <ActionChip
              icon={isDownloaded ? 'checkmark-circle' : 'download-outline'}
              label={
                isDownloaded
                  ? rtl
                    ? 'محمّل'
                    : 'Téléchargé'
                  : downloadStatus === 'downloading'
                    ? rtl
                      ? `جارٍ التحميل ${Math.round(downloadRecord?.progress ?? 0)}%`
                      : `Téléchargement ${Math.round(downloadRecord?.progress ?? 0)}%`
                    : rtl
                      ? 'تحميل'
                      : 'Télécharger'
              }
              active={isDownloaded}
              onPress={onDownloadChip}
            />
          </View>

          {isDownloaded ? (
            <NoticeCard
              icon="cloud-offline-outline"
              title={rtl ? 'متاح دون اتصال. ' : 'Disponible hors connexion. '}
              body={
                rtl
                  ? 'يمكنك مشاهدة الفيديو دون اتصال، لكن الملفات المرافقة والأسئلة تحتاج إلى اتصال بالإنترنت.'
                  : "Vous pouvez regarder la vidéo sans connexion, mais les fichiers joints et les questions nécessitent Internet."
              }
            />
          ) : null}

          {/* ---- tabs ---- */}
          <View style={[l.row, styles.tabRow]}>
            {TABS.map((item) => {
              const active = tab === item.key;
              const label = rtl ? item.labelAr : item.labelFr;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setTab(item.key)}
                  style={({ pressed }) => [styles.tabItem, pressed && { opacity: 0.7 }]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={label}
                >
                  <AppText
                    size={13.5}
                    weight={active ? 'bold' : 'semibold'}
                    tone={active ? 'brand' : 'muted'}
                  >
                    {label}
                  </AppText>
                  <View style={[styles.tabUnderline, active && { backgroundColor: colors.brand }]} />
                </Pressable>
              );
            })}
          </View>

          {/* ---- tab content ---- */}
          {tab === 'about' ? (
            <View style={styles.panel}>
              <AppText size={13.5} tone="body" style={{ lineHeight: 22 }}>
                {lesson.description ?? course.summary}
              </AppText>
              <AppText size={11.5} tone="faint" style={{ marginTop: spacing.md, lineHeight: 18 }}>
                {rtl
                  ? 'يُحفظ موضع توقفك تلقائياً، وستجد المكان نفسه حين تعود إلى الدرس.'
                  : 'Votre position de lecture est sauvegardée automatiquement, vous la retrouverez en revenant à la leçon.'}
              </AppText>
            </View>
          ) : null}

          {tab === 'chapters' ? (
            <View style={{ gap: spacing.xl, marginTop: spacing.md }}>
              {course.semesters.map((semester) => (
                <View key={semester.id} style={{ gap: spacing.md }}>
                  <View style={[l.row, { alignItems: 'center', gap: spacing.xs }]}>
                    <Ionicons name="layers-outline" size={14} color={colors.brand} />
                    <AppText size={13} weight="bold" tone="brand">
                      {semester.title}
                    </AppText>
                  </View>

                  {semester.chapters.map((chapter) => (
                    <View key={chapter.id} style={{ gap: spacing.sm }}>
                      <Eyebrow>{chapter.title}</Eyebrow>
                      <Card flush>
                        {chapter.lessons.map((item) => {
                          const isCurrent = item.id === lesson.id;
                          const isDone = progressOf(item.id)?.completed ?? false;
                          const locked = !item.published;
                          return (
                            <Pressable
                              key={item.id}
                              disabled={locked}
                              onPress={() => openLesson(item)}
                              style={({ pressed }) => [
                                styles.chapterRow,
                                l.row,
                                pressed && !locked && { backgroundColor: colors.brandSofter },
                              ]}
                              accessibilityRole="button"
                              accessibilityLabel={`${item.title} — ${
                                lessonMetaText(item, lang) ?? ''
                              }${isCurrent ? '، يُشاهَد الآن' : isDone ? '، مكتمل' : ''}${
                                locked ? '، مقفل' : ''
                              }`}
                              accessibilityHint={locked ? 'الدرس غير منشور بعد' : 'يفتح الدرس'}
                            >
                              <View
                                style={[
                                  styles.chapterStatus,
                                  isCurrent && { backgroundColor: colors.brand },
                                ]}
                              >
                                <Ionicons
                                  name={
                                    locked
                                      ? 'lock-closed'
                                      : isDone
                                        ? 'checkmark'
                                        : isCurrent
                                          ? 'play'
                                          : 'ellipse-outline'
                                  }
                                  size={13}
                                  color={
                                    isCurrent
                                      ? colors.white
                                      : isDone
                                        ? colors.success
                                        : colors.faint
                                  }
                                  importantForAccessibility="no"
                                />
                              </View>
                              <View style={{ flex: 1, gap: 2 }}>
                                <AppText
                                  size={13.5}
                                  weight={isCurrent ? 'bold' : 'medium'}
                                  tone={locked ? 'faint' : 'ink'}
                                  numberOfLines={2}
                                >
                                  {item.title}
                                </AppText>
                              </View>
                              {isCurrent ? <Badge label={rtl ? 'الآن' : 'MAINT.'} /> : null}
                              {!isCurrent ? (
                                <AppText
                                  size={11.5}
                                  tone={locked ? 'faint' : 'muted'}
                                  style={{ marginTop: 2 }}
                                >
                                  {lessonMetaText(item, lang) ?? ''}
                                </AppText>
                              ) : null}
                            </Pressable>
                          );
                        })}
                      </Card>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          ) : null}

          {tab === 'files' ? (
            <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
              {courseFiles.length === 0 ? (
                <AppText
                  size={13}
                  tone="muted"
                  style={{ textAlign: 'center', paddingVertical: spacing.lg }}
                >
                  {rtl
                    ? 'لا ملفات مرافقة في هذا الدرس.'
                    : 'Aucun fichier joint à cette leçon.'}
                </AppText>
              ) : (
                courseFiles.map((file) => (
                  <Pressable
                    key={file.id}
                    onPress={() => openLesson(file)}
                    style={({ pressed }) => [styles.fileRow, l.row, pressed && { opacity: 0.75 }]}
                    accessibilityRole="button"
                    accessibilityLabel={`ملف ${file.title}، ${file.pages} صفحة، ${formatSize(file.sizeMb)}`}
                    accessibilityHint="يفتح الملف"
                  >
                    <View style={styles.fileIcon} importantForAccessibility="no">
                      <Ionicons name="document-text" size={16} color={colors.brand} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <AppText size={13.5} weight="medium" tone="ink" numberOfLines={2}>
                        {file.title}
                      </AppText>
                      <AppText size={11} tone="faint">
                        {file.pages} {rtl ? 'صفحة' : 'pages'} · {formatSize(file.sizeMb)}
                      </AppText>
                    </View>
                    <Ionicons
                      name={rtl ? 'chevron-back' : 'chevron-forward'}
                      size={17}
                      color={colors.faint}
                      importantForAccessibility="no"
                    />
                  </Pressable>
                ))
              )}
            </View>
          ) : null}

          {/* ---- course progress ---- */}
          <View style={styles.progressFooter}>
            <View style={l.row}>
              <Ionicons name="trophy" size={16} color={colors.accent} />
              <AppText size={13} weight="bold" tone="ink">
                {rtl
                  ? `تقدم الدورة: ${progress?.percent ?? 0}% مكتمل`
                  : `Progression du cours : ${progress?.percent ?? 0}% terminé`}
              </AppText>
            </View>
            <ProgressBar value={progress?.percent ?? 0} tone="success" />
          </View>
        </View>
      </ScrollView>

      {/* ---- sticky prev / complete & next ---- */}
      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        <View style={[l.row, styles.bottomRow]}>
          {prev ? (
            <PrimaryButton
              label={rtl ? 'السابق' : 'Précédent'}
              variant="outline"
              compact
              leadingIcon={rtl ? 'chevron-forward' : 'chevron-back'}
              onPress={() => openLesson(prev)}
              style={{ flex: 1 }}
            />
          ) : null}
          <PrimaryButton
            label={next ? (rtl ? 'إكمال والتالي' : 'Terminer & suivant') : rtl ? 'إكمال الدرس' : 'Terminer la leçon'}
            compact
            icon={next ? (rtl ? 'arrow-back' : 'arrow-forward') : undefined}
            onPress={completeAndNext}
            style={{ flex: 1.4 }}
          />
        </View>
      </SafeAreaView>

      {/* In-app fullscreen presentation — the same block, drawn over the
          whole screen so the watermark stays visible in fullscreen. */}
      {fullscreen ? videoBlock : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  safeMissing: { flex: 1, backgroundColor: colors.canvas },
  scroll: { paddingBottom: spacing.xxl },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.canvas,
  },

  videoWrap: { width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.black },
  /** In-app fullscreen: the same block, lifted over the whole screen. */
  videoWrapFullscreen: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    backgroundColor: colors.black,
  },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  overlayTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bigPlay: {
    alignSelf: 'center',
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(11,18,32,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  scrubTrack: { flex: 1, justifyContent: 'center', height: 22 },
  scrubBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  scrubFill: {
    position: 'absolute',
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.brand,
  },

  body: {
    backgroundColor: colors.canvas,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  chipRow: { gap: spacing.sm, marginTop: spacing.lg, flexWrap: 'wrap' },

  tabRow: {
    gap: spacing.xl,
    marginTop: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  tabItem: { gap: 8, alignItems: 'center' },
  tabUnderline: { height: 2.5, width: '100%', borderRadius: 2, backgroundColor: 'transparent' },

  panel: { marginTop: spacing.md },

  chapterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  chapterStatus: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  fileIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.brandSofter,
    alignItems: 'center',
    justifyContent: 'center',
  },

  progressFooter: {
    marginTop: spacing.xl,
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },

  bottomBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  bottomRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
