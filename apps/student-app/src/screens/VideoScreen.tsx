/**
 * Video lesson — the lesson page.
 *
 * The player itself lives in `LessonPlayer` (isolated playback state, one
 * mounted video surface across inline/fullscreen, poster/loading/error
 * states, draggable RTL-aware scrubber, ±10 s, previous/next lesson, pause on
 * blur/background). This screen owns the enrollment gate, the watermark
 * grant, screenshot-attempt feedback, the meta block, the Save / Q & R chips,
 * the Overview · Chapters · Resources tabs, and the sticky Prev /
 * «Complete & next» bar. Downloads live on the compact chapter rows only.
 *
 * Playback is gated by the student's enrollment (published course + active,
 * non-expired subscription). Every playback start asks the watermark API
 * for a fresh traceability code (server-side generation only, see apps/api)
 * which `LessonPlayer` renders as a moving overlay; the platform's
 * app-wide native capture protection is owned by CaptureProtectionBoundary,
 * including pause-on-capture on iOS. There is no emulator exemption.
 * Fullscreen
 * is rendered in-app (the player wrapper expands; the video view is never
 * remounted) so the watermark and custom controls remain visible there too.
 *
 * The player is pinned at the top of the screen and the lesson body scrolls
 * beneath it — standard behaviour for a course player and it keeps the video
 * surface layout stable.
 *
 * Bilingual: strings are authored inline per language, layout flips RTL↔LTR.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useVideoRotation } from '../hooks/useVideoRotation';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { subscribeScreenshotAttempt } from '../lib/capture-protection';

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
  Card,
  NoticeCard,
  Pill,
  PrimaryButton,
  ProgressBar,
} from '../components/ui';
import type { DownloadStatus } from '../store/StudentStore';
import {
  CurriculumRow,
  CurriculumSectionHeader,
  lessonsDuration,
} from '../components/Curriculum';
import { lessonRoute } from '../lib/lesson';
import LessonPlayer from '../components/LessonPlayer';
import {
  requestPlaybackGrant,
  WATERMARK_ALLOW_OFFLINE_FALLBACK,
  type PlaybackGrant,
} from '../lib/watermark-api';
import { localFallbackCode } from '../lib/watermark';
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
    downloadLessons,
    cancelDownload,
    deleteDownload,
    deleteDownloads,
    downloadStatusFor,
    downloadUriFor,
  } = useStore();
  const { lang, dir } = useI18n();
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

  const media = found
    ? resolveLessonMedia(
        found.lesson.file,
        found.lesson.kind as 'video' | 'pdf',
        found.lesson.durationSec,
        found.lesson.thumbnailUrl,
      )
    : { kind: 'missing' as const };

  const [fullscreen, setFullscreen] = useVideoRotation();
  const focused = useIsFocused();

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
  }, [fullscreen, setFullscreen]);

  const [captureNonce, setCaptureNonce] = useState(0);
  useEffect(() => {
    const subscription = subscribeScreenshotAttempt(() => {
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
  const studentId = courseAuthorized ? (me?.id ?? '') : '';
  const courseId = courseAuthorized ? (found?.course.id ?? '') : '';
  const videoId = courseAuthorized ? (found?.lesson.id ?? '') : '';
  const sessionKey =
    studentId && courseId && videoId
      ? JSON.stringify([studentId, courseId, videoId])
      : '';
  // Match the PDF demo: show a stable unregistered code immediately while
  // the registry request is pending. Never reuse another student's code.
  const provisionalCode = useMemo(
    () =>
      sessionKey && WATERMARK_ALLOW_OFFLINE_FALLBACK ? localFallbackCode() : '',
    [sessionKey],
  );
  const [issued, setIssued] = useState<{
    key: string;
    grant: PlaybackGrant;
  } | null>(null);
  useEffect(() => {
    if (!sessionKey) return;
    let cancelled = false;
    void requestPlaybackGrant({ studentId, courseId, videoId })
      .then((grant) => {
        if (!cancelled)
          setIssued({
            key: sessionKey,
            grant:
              grant.source === 'offline' && provisionalCode
                ? { ...grant, code: provisionalCode }
                : grant,
          });
      })
      .catch((error) =>
        console.log(`[watermark] no playback grant issued: ${String(error)}`),
      );
    return () => {
      cancelled = true;
    };
    // Enrollment/progress object updates must not restart this session.
  }, [sessionKey, studentId, courseId, videoId, provisionalCode]);
  const watermarkCode =
    issued?.key === sessionKey ? issued.grant.code : provisionalCode;

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

  const downloadRecord = myDownloads.find((d) => d.lessonId === lesson.id);
  const isDownloaded = downloadStatusFor(lesson.id) === 'complete';

  const updatedAt = new Date(course.updatedAt);
  const updatedLabel = `${updatedAt.getFullYear()} ${
    rtl ? MONTHS_AR[updatedAt.getMonth()] : MONTHS_FR[updatedAt.getMonth()]
  }`;

  const openLesson = (target: Lesson) => {
    navigation.replace(lessonRoute(target.kind), { lessonId: target.id });
  };

  const onPlayerBack = () => {
    if (fullscreen) setFullscreen(false);
    else navigation.goBack();
  };

  /** Per-row download action for the compact chapter list. */
  const onLessonDownload = (item: Lesson) => {
    if (item.kind === 'pdf') {
      openLesson(item);
      return;
    }
    if (!courseAuthorized) return;
    const status = downloadStatusFor(item.id);
    if (status === 'downloading') {
      cancelDownload(item.id);
      return;
    }
    if (status === 'complete') {
      Alert.alert(
        rtl ? 'حذف التنزيل' : 'Supprimer le téléchargement',
        rtl
          ? `سيُحذف « ${item.title} » من هذا الجهاز.`
          : `« ${item.title} » sera supprimé de cet appareil.`,
        [
          { text: rtl ? 'إلغاء' : 'Annuler', style: 'cancel' },
          {
            text: rtl ? 'حذف' : 'Supprimer',
            style: 'destructive',
            onPress: () => {
              void deleteDownload(item.id);
            },
          },
        ],
      );
      return;
    }
    void downloadLesson(item.id).then((result) => {
      if (result === 'error') {
        Alert.alert(
          rtl ? 'فشل التحميل' : 'Échec du téléchargement',
          rtl
            ? 'تعذّر تحميل الملف. تحقق من اتصالك وحاول مجدداً.'
            : 'Impossible de télécharger le fichier. Vérifiez votre connexion.',
        );
      }
    });
  };

  const downloadLabelFor = (item: Lesson) => {
    if (item.kind === 'pdf') {
      return rtl ? 'فتح المستند المضمّن' : 'Ouvrir le document inclus';
    }
    const status = downloadStatusFor(item.id);
    if (status === 'complete') return rtl ? 'حذف التنزيل' : 'Supprimer le téléchargement';
    if (status === 'downloading') return rtl ? 'إلغاء التحميل' : 'Annuler le téléchargement';
    return rtl ? 'تحميل الدرس' : 'Télécharger la leçon';
  };

  /** Aggregate state of a section's downloadable videos. */
  const bulkSummary = (items: Lesson[]): {
    status?: DownloadStatus;
    progress: number;
    complete: boolean;
    downloading: boolean;
  } => {
    const videos = items.filter((item) => item.kind === 'video' && !!item.file && item.allowDownload !== false);
    if (videos.length === 0) return { progress: 0, complete: false, downloading: false };
    const statuses = videos.map((item) => downloadStatusFor(item.id));
    const complete = statuses.every((value) => value === 'complete');
    const downloading = statuses.some((value) => value === 'downloading');
    const progress = complete
      ? 100
      : Math.round(
          videos.reduce((sum, item) => {
            if (downloadStatusFor(item.id) === 'complete') return sum + 100;
            return (
              sum +
              (myDownloads.find((download) => download.lessonId === item.id)?.progress ?? 0)
            );
          }, 0) / videos.length,
        );
    return {
      status: complete ? 'complete' : downloading ? 'downloading' : undefined,
      progress,
      complete,
      downloading,
    };
  };

  const sectionAction = (items: Lesson[], summary: ReturnType<typeof bulkSummary>) => {
    if (summary.complete) {
      const ids = items
        .filter((item) => item.kind === 'video')
        .map((item) => item.id);
      const records = myDownloads.filter((record) => ids.includes(record.lessonId));
      if (records.length === 0) return;
      Alert.alert(
        rtl ? 'حذف التنزيلات' : 'Supprimer les téléchargements',
        rtl
          ? `سيُحذف ${records.length} ملف فيديو من هذا الجهاز.`
          : `${records.length} vidéo${records.length === 1 ? '' : 's'} ${
              records.length === 1 ? 'sera supprimée' : 'seront supprimées'
            } de cet appareil.`,
        [
          { text: rtl ? 'إلغاء' : 'Annuler', style: 'cancel' },
          {
            text: rtl ? 'حذف' : 'Supprimer',
            style: 'destructive',
            onPress: () => {
              void deleteDownloads(records.map((record) => record.lessonId));
            },
          },
        ],
      );
      return;
    }
    if (summary.downloading) {
      items.forEach((item) => {
        if (downloadStatusFor(item.id) === 'downloading') cancelDownload(item.id);
      });
      return;
    }
    const ids = items
      .filter(
        (item) =>
          item.kind === 'video' && item.allowDownload !== false &&
          !!item.file &&
          downloadStatusFor(item.id) !== 'complete' &&
          downloadStatusFor(item.id) !== 'downloading',
      )
      .map((item) => item.id);
    if (ids.length > 0) void downloadLessons(ids);
  };

  const sectionLabel = (summary: ReturnType<typeof bulkSummary>) => {
    if (summary.complete) return rtl ? 'حذف التنزيلات' : 'Supprimer les téléchargements';
    if (summary.downloading) return rtl ? 'إلغاء التنزيلات' : 'Annuler les téléchargements';
    return rtl ? 'تحميل دروس الفصل' : 'Télécharger la section';
  };

  const completeAndNext = () => {
    markCompleted(lesson.id);
    if (next) openLesson(next);
    else navigation.goBack();
  };

  return (
    <View style={styles.root}>
      {focused ? <StatusBar hidden={fullscreen} style={fullscreen ? 'light' : 'dark'} /> : null}
      {/*
       * Pinned player. In fullscreen only this wrapper's style changes: the
       * LessonPlayer (and therefore the native video surface) stays mounted
       * at the same position in the tree, so playback never restarts or
       * flashes black. The screen behind it remains mounted to preserve the
       * lesson scroll position, but cannot receive touches.
       */}
      <View style={fullscreen ? styles.playerFullscreen : styles.playerSlot}>
        <LessonPlayer
          key={lesson.id}
          lessonId={lesson.id}
          source={downloadUriFor(lesson.id) ? {uri: downloadUriFor(lesson.id)!} : media.source}
          poster={media.poster}
          title={lesson.title}
          expectedDuration={lesson.durationSec}
          // A completed lesson always restarts from the beginning. Re-watching
          // one still saves a position, so the completed flag has to win here
          // or the next open resumes in the middle of a lesson already marked
          // as finished.
          resumeAt={completed ? 0 : progressOf(lesson.id)?.positionSec ?? 0}
          code={watermarkCode || null}
          captureNonce={captureNonce}
          fullscreen={fullscreen}
          hasPrev={!!prev}
          hasNext={!!next}
          onBack={onPlayerBack}
          onPrev={() => {
            if (prev) openLesson(prev);
          }}
          onNext={() => {
            if (next) openLesson(next);
          }}
          onToggleFullscreen={() => setFullscreen((value) => !value)}
          onProgress={saveProgress}
          onCompleted={markCompleted}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        pointerEvents={fullscreen ? 'none' : 'auto'}
      >
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
              icon="chatbubbles-outline"
              label={rtl ? 'الأسئلة' : 'Q & R'}
              onPress={() =>
                navigation.navigate('Qna', {
                  courseId: course.id,
                  lessonId: lesson.id,
                })
              }
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
                <View key={semester.id} style={{ gap: spacing.lg }}>
                  <View style={[l.row, { alignItems: 'center', gap: spacing.xs }]}>
                    <Ionicons name="layers-outline" size={14} color={colors.brand} />
                    <AppText size={13} weight="bold" tone="brand">
                      {semester.title}
                    </AppText>
                  </View>

                  {semester.chapters.map((chapter) => {
                    const sectionLessons = chapter.lessons.filter((item) => item.published);
                    const sectionSummary = bulkSummary(sectionLessons);

                    return (
                      <View key={chapter.id} style={{ gap: spacing.sm }}>
                        <CurriculumSectionHeader
                          title={chapter.title}
                          lessonCount={sectionLessons.length}
                          durationSec={lessonsDuration(sectionLessons)}
                          onDownloadAll={
                            sectionLessons.some(
                              (item) => item.kind === 'video' && !!item.file && item.allowDownload !== false,
                            )
                              ? () => sectionAction(sectionLessons, sectionSummary)
                              : undefined
                          }
                          downloadAllLabel={sectionLabel(sectionSummary)}
                          downloadAllDisabled={!courseAuthorized}
                          downloadAllStatus={sectionSummary.status}
                          downloadAllProgress={sectionSummary.progress}
                        />
                        <Card flush>
                          {chapter.lessons.map((item, index) => {
                            const isCurrent = item.id === lesson.id;
                            const isDone = progressOf(item.id)?.completed ?? false;
                            const locked = !item.published || !courseAuthorized;
                            const record = myDownloads.find(
                              (download) => download.lessonId === item.id,
                            );
                            return (
                              <CurriculumRow
                                key={item.id}
                                lesson={item}
                                number={index + 1}
                                first={index === 0}
                                current={isCurrent}
                                completed={isDone}
                                accessible={!locked}
                                status={downloadStatusFor(item.id)}
                                progress={record?.progress ?? 0}
                                onPress={() => openLesson(item)}
                                onDownload={
                                  (item.kind === 'video' || item.kind === 'pdf') && item.allowDownload !== false
                                    ? () => onLessonDownload(item)
                                    : undefined
                                }
                                downloadLabel={downloadLabelFor(item)}
                                bundled={item.kind === 'pdf'}
                              />
                            );
                          })}
                        </Card>
                      </View>
                    );
                  })}
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
      {!fullscreen ? (
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
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  safeMissing: { flex: 1, backgroundColor: colors.canvas },
  scrollView: { flex: 1 },
  scroll: { paddingBottom: spacing.xxl },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.canvas,
  },

  /** Inline player: pinned 16:9 above the scrollable lesson body. */
  playerSlot: { width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.black },
  /** In-app fullscreen: the SAME wrapper instance, only its style changes. */
  playerFullscreen: {
    ...StyleSheet.absoluteFill,
    zIndex: 10,
    elevation: 10,
    backgroundColor: colors.black,
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
  tabUnderline: { height: 2.5, width: '100%', borderRadius: 2, backgroundColor: colors.transparent },

  panel: { marginTop: spacing.md },

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
