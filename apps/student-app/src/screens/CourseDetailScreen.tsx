/**
 * Course detail — Udemy-style course page.
 *
 * Photo hero with the current session/lesson and a «Premiers pas» /
 * «Continuer» action, the course title and teacher, progress, then the
 * Sessions / Plus tabs. Sessions renders numbered lesson rows with per-lesson
 * download controls and section bulk downloads; Plus holds the about text,
 * native share, shared Q & R and the file library.
 *
 * Enrollment rules, resume logic, access notices and PDF behaviour are the
 * same as before — only the presentation changed.
 */

import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import {
  allLessons,
  courseDurationSec,
  courseProgress,
  courseTeacher,
  isQuestionAnswered,
  type Lesson,
} from '@ostadiplus/shared';

import { useI18n } from '../i18n/useI18n';
import { useLayout } from '../i18n/layout';
import {
  AppText,
  Avatar,
  Card,
  EmptyState,
  Eyebrow,
  IconButton,
  NoticeCard,
  Pill,
  PrimaryButton,
  ProgressBar,
  TopBar,
} from '../components/ui';
import {
  CurriculumRow,
  CurriculumSectionHeader,
  curriculumDuration,
  lessonsDuration,
} from '../components/Curriculum';
import { DownloadButton } from '../components/DownloadButton';
import { lessonRoute } from '../lib/lesson';
import { coverAssets } from '../assets/covers';
import { teacherPhotosFor } from '../assets/teacher-photos';
import { useStore, type DownloadStatus } from '../store/StudentStore';
import { colors, radius, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type PageTab = 'sessions' | 'plus';

export default function CourseDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'CourseDetail'>>();
  const {
    state,
    me,
    statusOf,
    progressOf,
    myDownloads,
    downloadLesson,
    cancelDownload,
    deleteDownload,
    deleteDownloads,
    downloadLessons,
    downloadStatusFor,
    isFavorite,
    toggleFavorite,
    questionsOfCourse,
  } = useStore();
  const { lang, t, dir } = useI18n();
  const l = useLayout(lang);
  const rtl = dir === 'rtl';
  const [tab, setTab] = useState<PageTab>('sessions');

  const course = state.courses.find((item) => item.id === params.courseId);

  /** Published lessons only, grouped semester → topic. */
  const semesters = useMemo(
    () =>
      course
        ? course.semesters.map((semester) => ({
            ...semester,
            chapters: semester.chapters.map((chapter) => ({
              ...chapter,
              lessons: chapter.lessons.filter((lesson) => lesson.published),
            })),
          }))
        : [],
    [course],
  );

  const chapters = useMemo(
    () => semesters.flatMap((semester) => semester.chapters),
    [semesters],
  );

  const progress = useMemo(
    () => (course && me ? courseProgress(state, me.id, course) : null),
    [course, me, state],
  );

  const questions = useMemo(
    () => (course ? questionsOfCourse(course.id) : []),
    [course, questionsOfCourse],
  );
  const unanswered = questions.filter((question) => !isQuestionAnswered(question));

  const downloadRecords = useMemo(
    () => new Map(myDownloads.map((record) => [record.lessonId, record])),
    [myDownloads],
  );

  /** Aggregate download state for the course / section bulk controls. */
  const bulkSummary = (list: Lesson[]): {
    status?: DownloadStatus;
    progress: number;
    complete: boolean;
    downloading: boolean;
  } => {
    const videos = list.filter((lesson) => lesson.kind === 'video' && !!lesson.file);
    if (videos.length === 0) return { progress: 0, complete: false, downloading: false };
    const statuses = videos.map((lesson) => downloadStatusFor(lesson.id));
    const complete = statuses.every((value) => value === 'complete');
    const downloading = statuses.some((value) => value === 'downloading');
    const progress = complete
      ? 100
      : Math.round(
          videos.reduce((sum, lesson) => {
            if (downloadStatusFor(lesson.id) === 'complete') return sum + 100;
            return sum + (downloadRecords.get(lesson.id)?.progress ?? 0);
          }, 0) / videos.length,
        );
    return {
      status: complete ? 'complete' : downloading ? 'downloading' : undefined,
      progress,
      complete,
      downloading,
    };
  };

  if (!course) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <TopBar title={t('course_details')} onBack={() => navigation.goBack()} />
        <View style={styles.missingWrap}>
          <AppText size={15} tone="muted">
            {rtl ? 'هذه الدورة لم تعد متاحة.' : "Ce cours n'est plus disponible."}
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  const status = statusOf(course.id);
  const accessible = status === 'active' && course.status === 'published';
  const lessons = allLessons(course).filter((lesson) => lesson.published);
  const publishedCount = lessons.length;
  const durationSec = courseDurationSec(course);
  const instructor = courseTeacher(state, course);
  const photos = teacherPhotosFor(instructor.photo);
  const heroSource = photos?.hero ?? coverAssets[course.cover];
  const favorite = isFavorite(course.id);

  const resumeLesson =
    lessons.find((lesson) => lesson.id === progress?.nextLessonId) ?? lessons[0];
  const resumeChapter = chapters.find((chapter) =>
    chapter.lessons.some((lesson) => lesson.id === resumeLesson?.id),
  );
  const resumeSemesterIndex = semesters.findIndex((semester) =>
    semester.chapters.some((chapter) => chapter.id === resumeChapter?.id),
  );
  const sessionNumber = resumeSemesterIndex >= 0 ? resumeSemesterIndex + 1 : 1;
  const started = !!progress && (progress.percent > 0 || progress.lastPositionSec > 0);

  const courseVideos = lessons.filter(
    (lesson) => lesson.kind === 'video' && !!lesson.file,
  );
  const courseSummary = bulkSummary(courseVideos);

  const openLesson = (lesson: Lesson) => {
    if (!accessible) return;
    navigation.navigate(lessonRoute(lesson.kind), { lessonId: lesson.id });
  };

  const performDownload = (lesson: Lesson) => {
    if (lesson.kind === 'pdf') {
      openLesson(lesson);
      return;
    }
    if (!accessible) return;
    const statusValue = downloadStatusFor(lesson.id);
    if (statusValue === 'downloading') {
      cancelDownload(lesson.id);
      return;
    }
    if (statusValue === 'complete') {
      Alert.alert(
        rtl ? 'حذف التنزيل' : 'Supprimer le téléchargement',
        rtl
          ? `سيُحذف « ${lesson.title} » من هذا الجهاز.`
          : `« ${lesson.title} » sera supprimé de cet appareil.`,
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
    void downloadLesson(lesson.id).then((result) => {
      if (result === 'error') {
        Alert.alert(
          rtl ? 'فشل التحميل' : 'Échec du téléchargement',
          rtl
            ? 'تعذّر تحميل الملف. تأكد من اتصالك بالإنترنت وحاول مجدداً.'
            : 'Impossible de télécharger le fichier. Vérifiez votre connexion Internet.',
        );
      }
    });
  };

  const downloadMany = async (list: Lesson[]) => {
    const ids = list
      .filter(
        (lesson) =>
          lesson.kind === 'video' &&
          !!lesson.file &&
          downloadStatusFor(lesson.id) !== 'complete' &&
          downloadStatusFor(lesson.id) !== 'downloading',
      )
      .map((lesson) => lesson.id);
    if (ids.length > 0) await downloadLessons(ids);
  };

  /** Complete → offer deletion, downloading → cancel, idle → start. */
  const bulkAction = (list: Lesson[], summary: ReturnType<typeof bulkSummary>) => {
    if (summary.complete) {
      const downloaded = list
        .filter((lesson) => lesson.kind === 'video')
        .map((lesson) => downloadRecords.get(lesson.id))
        .filter((record): record is NonNullable<typeof record> => !!record);
      if (downloaded.length === 0) return;
      Alert.alert(
        rtl ? 'حذف التنزيلات' : 'Supprimer les téléchargements',
        rtl
          ? `سيُحذف ${downloaded.length} ملف فيديو من هذا الجهاز.`
          : `${downloaded.length} vidéo${downloaded.length === 1 ? '' : 's'} ${
              downloaded.length === 1 ? 'sera supprimée' : 'seront supprimées'
            } de cet appareil.`,
        [
          { text: rtl ? 'إلغاء' : 'Annuler', style: 'cancel' },
          {
            text: rtl ? 'حذف' : 'Supprimer',
            style: 'destructive',
            onPress: () => {
              void deleteDownloads(downloaded.map((record) => record.lessonId));
            },
          },
        ],
      );
      return;
    }
    if (summary.downloading) {
      list.forEach((lesson) => {
        if (downloadStatusFor(lesson.id) === 'downloading') cancelDownload(lesson.id);
      });
      return;
    }
    void downloadMany(list);
  };

  const bulkLabel = (summary: ReturnType<typeof bulkSummary>, scope: 'course' | 'section') => {
    if (summary.complete) {
      return rtl ? 'حذف التنزيلات' : 'Supprimer les téléchargements';
    }
    if (summary.downloading) {
      return rtl ? 'إلغاء التنزيلات' : 'Annuler les téléchargements';
    }
    if (scope === 'course') {
      return rtl ? 'تحميل كل دروس الدورة' : 'Télécharger toutes les leçons';
    }
    return rtl ? 'تحميل دروس الفصل' : 'Télécharger la section';
  };

  const downloadLabelFor = (lesson: Lesson) => {
    if (lesson.kind === 'pdf') {
      return rtl ? 'فتح المستند المضمّن' : 'Ouvrir le document inclus';
    }
    const value = downloadStatusFor(lesson.id);
    if (value === 'complete') return rtl ? 'حذف التنزيل' : 'Supprimer le téléchargement';
    if (value === 'downloading') return rtl ? 'إلغاء التحميل' : 'Annuler le téléchargement';
    return rtl ? 'تحميل الدرس' : 'Télécharger la leçon';
  };

  const shareCourse = async () => {
    try {
      await Share.share({
        title: course.title,
        message: `${course.title} — ${instructor.name}\nOstadiPlus`,
      });
    } catch {
      /* user dismissed the share sheet */
    }
  };

  return (
    <View style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ---- photo hero ---- */}
        <View style={styles.hero}>
          {heroSource ? (
            <Image source={heroSource} style={styles.heroArt} resizeMode="cover" />
          ) : (
            <LinearGradient
              colors={[colors.brand, colors.brandDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroArt}
            />
          )}
          <LinearGradient
            colors={['rgba(41,30,43,0.18)', 'rgba(41,30,43,0.82)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.heroArt}
          />

          <SafeAreaView edges={['top']} style={styles.heroSafe}>
            <View style={[styles.heroBar, l.row]}>
              <IconButton
                icon={rtl ? 'chevron-forward' : 'chevron-back'}
                variant="onPhoto"
                size={38}
                label={t('back')}
                onPress={() => navigation.goBack()}
              />
              <View style={{ flex: 1 }} />
              <IconButton
                icon={favorite ? 'bookmark' : 'bookmark-outline'}
                variant="onPhoto"
                size={38}
                label={
                  favorite
                    ? rtl
                      ? 'إزالة الدورة من المفضلة'
                      : 'Retirer le cours des favoris'
                    : rtl
                      ? 'حفظ الدورة في المفضلة'
                      : 'Ajouter le cours aux favoris'
                }
                onPress={() => toggleFavorite(course.id)}
              />
            </View>

            <View style={{ flex: 1 }} />

            <View style={styles.heroBody}>
              <View style={styles.sessionPill}>
                <AppText
                  size={10.5}
                  weight="bold"
                  tone="white"
                  style={{ letterSpacing: 1.1, textTransform: 'uppercase' }}
                >
                  {rtl ? `الجلسة ${sessionNumber}` : `Session ${sessionNumber}`}
                </AppText>
              </View>

              <AppText size={24} weight="bold" tone="white" numberOfLines={3}>
                {resumeLesson?.title ?? course.title}
              </AppText>
              <AppText size={12.5} tone="white" style={{ opacity: 0.88 }} numberOfLines={2}>
                {course.title}
              </AppText>

              {accessible && resumeLesson ? (
                <PrimaryButton
                  label={
                    started ? (rtl ? 'متابعة' : 'Continuer') : rtl ? 'الخطوات الأولى' : 'Premiers pas'
                  }
                  leadingIcon="play"
                  variant="accent"
                  onPress={() => openLesson(resumeLesson)}
                  accessibilityLabel={
                    rtl ? `متابعة الدرس ${resumeLesson.title}` : `Continuer la leçon ${resumeLesson.title}`
                  }
                  style={styles.heroCta}
                />
              ) : (
                <Pill
                  label={
                    status === 'pending'
                      ? rtl
                        ? 'بانتظار التفعيل'
                        : "En attente d'activation"
                      : rtl
                        ? 'الوصول غير متاح'
                        : 'Accès indisponible'
                  }
                  tone={status === 'pending' ? 'warning' : 'danger'}
                  dot
                />
              )}
            </View>
          </SafeAreaView>
        </View>

        <View style={styles.body}>
          {/* ---- title + teacher ---- */}
          <View style={{ gap: spacing.sm }}>
            <AppText size={21} weight="bold" tone="ink" numberOfLines={3}>
              {course.title}
            </AppText>
            <View style={[l.row, { gap: spacing.md }]}>
              <Avatar
                monogram={instructor.monogram}
                size={40}
                tone="brand"
                square
                photo={photos?.avatar}
              />
              <View style={{ flex: 1, gap: 1 }}>
                <AppText size={13.5} weight="semibold" tone="ink" numberOfLines={1}>
                  {instructor.name}
                </AppText>
                <AppText size={11.5} tone="muted" numberOfLines={1}>
                  {instructor.subject}
                  {state.teacher.centerName ? ` · ${state.teacher.centerName}` : ''}
                </AppText>
              </View>
            </View>
          </View>

          <View style={[l.row, { flexWrap: 'wrap', gap: spacing.sm }]}>
            <Pill
              label={`${publishedCount} ${rtl ? 'درس' : publishedCount === 1 ? 'leçon' : 'leçons'}`}
              tone="neutral"
            />
            {durationSec > 0 ? (
              <Pill label={curriculumDuration(durationSec, rtl)} tone="neutral" />
            ) : null}
            <Pill label={course.level} tone="brand" />
          </View>

          {/* ---- progress ---- */}
          {progress ? (
            <View style={styles.progressBlock}>
              <View style={[l.rowBetween, { gap: spacing.sm }]}>
                <AppText size={12.5} weight="semibold" tone="ink">
                  {rtl ? 'تقدّمك' : 'Votre progression'}
                </AppText>
                <AppText size={12.5} weight="bold" tone="brand">
                  {progress.percent}%
                </AppText>
              </View>
              <ProgressBar value={progress.percent} height={6} />
              <AppText size={11.5} tone="muted">
                {progress.completed} {rtl ? 'من' : 'sur'} {progress.total}{' '}
                {rtl ? 'دروس مكتملة' : 'leçons terminées'}
              </AppText>
            </View>
          ) : null}

          {/* ---- access notice ---- */}
          {!accessible ? (
            <NoticeCard
              icon={status === 'pending' ? 'hourglass-outline' : 'lock-closed-outline'}
              tone={status === 'pending' ? 'warning' : 'danger'}
              title={
                status === 'pending'
                  ? rtl
                    ? 'الوصول قيد المراجعة. '
                    : "Accès en cours d'activation. "
                  : rtl
                    ? 'الوصول موقوف. '
                    : 'Accès suspendu. '
              }
              body={
                status === 'pending'
                  ? rtl
                    ? 'سجّلت في هذه الدورة، ويفعّل الأستاذ وصولك من لوحة التحكم. بمجرد التفعيل تظهر لك الدروس مباشرة.'
                    : "Vous vous êtes inscrit à ce cours, votre enseignant active votre accès depuis le tableau de bord. Une fois activé, les leçons s'affichent."
                  : rtl
                    ? 'أوقف الأستاذ وصولك إلى هذه الدورة. تواصل مع المركز لاستعادة الوصول.'
                    : 'Votre enseignant a suspendu votre accès à ce cours. Contactez le centre pour le rétablir.'
              }
            />
          ) : null}

          {/* ---- tabs ---- */}
          <View style={[styles.tabRow, l.rowBetween]}>
            <View style={[l.row, { gap: spacing.xl, flex: 1 }]}>
              {(
                [
                  ['sessions', rtl ? 'الجلسات' : 'Sessions'],
                  ['plus', rtl ? 'المزيد' : 'Plus'],
                ] as [PageTab, string][]
              ).map(([key, label]) => {
                const active = tab === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setTab(key)}
                    style={({ pressed }) => [styles.tab, pressed && { opacity: 0.7 }]}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={label}
                  >
                    <AppText size={14} weight={active ? 'bold' : 'semibold'} tone={active ? 'ink' : 'muted'}>
                      {label}
                    </AppText>
                    <View
                      style={[styles.tabUnderline, active && { backgroundColor: colors.ink }]}
                    />
                  </Pressable>
                );
              })}
            </View>

            {tab === 'sessions' ? (
              <DownloadButton
                status={courseSummary.status}
                progress={courseSummary.progress}
                label={bulkLabel(courseSummary, 'course')}
                disabled={!accessible || courseVideos.length === 0}
                idleIcon="cloud-download-outline"
                size={36}
                onPress={() => bulkAction(courseVideos, courseSummary)}
              />
            ) : null}
          </View>

          {/* ---- sessions ---- */}
          {tab === 'sessions' ? (
            chapters.length === 0 ? (
              <EmptyState
                icon="documents-outline"
                title={rtl ? 'لا دروس منشورة' : 'Aucune leçon publiée'}
                description={
                  rtl
                    ? 'سيظهر هنا برنامج الدورة بمجرد أن ينشر الأستاذ دروسه.'
                    : "Le programme apparaîtra dès que votre professeur publiera des leçons."
                }
              />
            ) : (
              <View style={{ gap: spacing.xl }}>
                {semesters.map((semester) => (
                  <View key={semester.id} style={{ gap: spacing.lg }}>
                    {semesters.length > 1 ? <Eyebrow>{semester.title}</Eyebrow> : null}

                    {semester.chapters.map((chapter) => {
                      const sectionVideos = chapter.lessons.filter(
                        (lesson) => lesson.kind === 'video' && !!lesson.file,
                      );
                      const sectionSummary = bulkSummary(sectionVideos);

                      return (
                        <View key={chapter.id} style={{ gap: spacing.sm }}>
                          <CurriculumSectionHeader
                            title={chapter.title}
                            lessonCount={chapter.lessons.length}
                            durationSec={lessonsDuration(chapter.lessons)}
                            onDownloadAll={
                              sectionVideos.length > 0
                                ? () => bulkAction(sectionVideos, sectionSummary)
                                : undefined
                            }
                            downloadAllLabel={bulkLabel(sectionSummary, 'section')}
                            downloadAllDisabled={!accessible}
                            downloadAllStatus={sectionSummary.status}
                            downloadAllProgress={sectionSummary.progress}
                          />

                          <Card flush>
                            {chapter.lessons.map((lesson, index) => {
                              const record = downloadRecords.get(lesson.id);
                              return (
                                <CurriculumRow
                                  key={lesson.id}
                                  lesson={lesson}
                                  number={index + 1}
                                  first={index === 0}
                                  current={
                                    lesson.id === progress?.nextLessonId &&
                                    (progress?.percent ?? 0) < 100
                                  }
                                  completed={!!progressOf(lesson.id)?.completed}
                                  accessible={accessible}
                                  status={downloadStatusFor(lesson.id)}
                                  progress={record?.progress ?? 0}
                                  onPress={() => openLesson(lesson)}
                                  onDownload={
                                    lesson.kind === 'video' || lesson.kind === 'pdf'
                                      ? () => performDownload(lesson)
                                      : undefined
                                  }
                                  downloadLabel={downloadLabelFor(lesson)}
                                  bundled={lesson.kind === 'pdf'}
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
            )
          ) : null}

          {/* ---- plus ---- */}
          {tab === 'plus' ? (
            <View style={{ gap: spacing.lg }}>
              <View style={{ gap: spacing.sm }}>
                <Eyebrow>{rtl ? 'عن هذه الدورة' : 'À propos de ce cours'}</Eyebrow>
                <AppText size={14} tone="body" style={{ lineHeight: 23 }}>
                  {course.summary}
                </AppText>
              </View>

              <Card flush>
                <ActionRow
                  icon="share-social-outline"
                  title={rtl ? 'شارك هذه الدورة' : 'Partager ce cours'}
                  subtitle={
                    rtl
                      ? 'أرسل الدورة إلى زملائك'
                      : 'Envoyez ce cours à vos camarades'
                  }
                  onPress={() => {
                    void shareCourse();
                  }}
                  first
                />

                <ActionRow
                  icon="chatbubbles-outline"
                  title={rtl ? 'الأسئلة والأجوبة' : 'Q & R'}
                  subtitle={
                    questions.length === 0
                      ? rtl
                        ? 'اطرح أول سؤال في الدورة'
                        : 'Posez la première question du cours'
                      : unanswered.length > 0
                        ? rtl
                          ? `${questions.length} أسئلة · ${unanswered.length} بانتظار الرد`
                          : `${questions.length} question${
                              questions.length === 1 ? '' : 's'
                            } · ${unanswered.length} sans réponse`
                        : rtl
                          ? `${questions.length} أسئلة · كلها تمت الإجابة عليها`
                          : `${questions.length} question${
                              questions.length === 1 ? '' : 's'
                            } · toutes répondues`
                  }
                  onPress={() => navigation.navigate('Qna', { courseId: course.id })}
                  trailing={
                    unanswered.length > 0 ? (
                      <Pill label={`${unanswered.length}`} tone="warning" dot />
                    ) : questions.length > 0 ? (
                      <Pill label="✓" tone="success" />
                    ) : null
                  }
                />

                <ActionRow
                  icon="folder-open-outline"
                  title={rtl ? 'المكتبة' : 'Bibliothèque'}
                  subtitle={
                    rtl
                      ? 'كل ملفات الدروس في مكان واحد'
                      : 'Tous les fichiers de cours au même endroit'
                  }
                  onPress={() => navigation.navigate('Library')}
                />
              </Card>
            </View>
          ) : null}

          {!accessible && status === 'pending' ? (
            <PrimaryButton
              label={rtl ? 'تحديث حالة الوصول' : "Actualiser l'accès"}
              variant="outline"
              style={{ marginTop: spacing.sm }}
              onPress={() => navigation.goBack()}
            />
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

/** Tappable row used by the Plus tab. */
function ActionRow({
  icon,
  title,
  subtitle,
  onPress,
  trailing,
  first,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  trailing?: React.ReactNode;
  first?: boolean;
}) {
  const { lang, dir } = useI18n();
  const l = useLayout(lang);
  const rtl = dir === 'rtl';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionRow,
        l.row,
        !first && styles.actionDivider,
        pressed && { backgroundColor: colors.brandSofter },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${title} — ${subtitle}`}
    >
      <View style={styles.actionIcon} importantForAccessibility="no">
        <Ionicons name={icon} size={19} color={colors.brand} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText size={14.5} weight="semibold" tone="ink">
          {title}
        </AppText>
        <AppText size={11.5} tone="muted" numberOfLines={2}>
          {subtitle}
        </AppText>
      </View>
      {trailing}
      <Ionicons
        name={rtl ? 'chevron-back' : 'chevron-forward'}
        size={18}
        color={colors.faint}
        importantForAccessibility="no"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  scroll: { paddingBottom: spacing.xxl * 2 },
  missingWrap: { padding: spacing.lg },
  hero: { minHeight: 420, backgroundColor: colors.ink, overflow: 'hidden' },
  heroSafe: { flex: 1, minHeight: 420 },
  /** Absolute art layer that fills the hero without resolving to intrinsic size. */
  heroArt: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  heroBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  heroBody: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  sessionPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.glassSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    marginBottom: 2,
  },
  heroCta: { marginTop: spacing.sm },
  body: { padding: spacing.lg, gap: spacing.lg },
  progressBlock: {
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  tabRow: {
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  tab: { gap: 8, paddingTop: spacing.sm },
  tabUnderline: {
    height: 2.5,
    width: '100%',
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  actionRow: {
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  actionDivider: { borderTopWidth: 1, borderTopColor: colors.line },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.brandSofter,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
