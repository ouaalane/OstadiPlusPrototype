/**
 * Course detail — hero, instructor, stats, resume CTA, progress, about, then
 * the chapters → lessons list, with the access banner that explains why a
 * lesson cannot be opened (pending / suspended / unpublished).
 *
 * Bilingual: strings are authored inline per language, layout flips RTL↔LTR.
 */

import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
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
  type Lesson,
} from '@ostadiplus/shared';

import { useI18n } from '../i18n/useI18n';
import { useLayout } from '../i18n/layout';
import {
  AppText,
  Avatar,
  Card,
  Eyebrow,
  IconButton,
  NoticeCard,
  Pill,
  PrimaryButton,
  ProgressBar,
  TopBar,
} from '../components/ui';
import { LESSON_ICONS, lessonMetaText, lessonRoute, lessonTint } from '../lib/lesson';
import { coverAssets } from '../assets/covers';
import { teacherPhotosFor } from '../assets/teacher-photos';
import { useStore } from '../store/StudentStore';
import { colors, radius, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

/** Minutes label helper — «3h 20m» / «3 س 20 د». */
function durationLabel(seconds: number, rtl: boolean): string {
  const total = Math.round(seconds / 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h <= 0) return `${m} ${rtl ? 'دقيقة' : 'min'}`;
  if (m === 0) return `${h} ${rtl ? 'ساعة' : 'h'}`;
  return rtl ? `${h} س ${m} د` : `${h}h ${m}m`;
}

export default function CourseDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'CourseDetail'>>();
  const { state, me, statusOf, progressOf } = useStore();
  const { lang, t, dir } = useI18n();
  const l = useLayout(lang);
  const rtl = dir === 'rtl';
  const [bookmarked, setBookmarked] = useState(false);
  const [openChapter, setOpenChapter] = useState<string | null>(null);

  const course = state.courses.find((c) => c.id === params.courseId);

  /** Published lessons only, grouped semester → topic. */
  const semesters = useMemo(
    () =>
      course
        ? course.semesters.map((semester) => ({
            ...semester,
            chapters: semester.chapters.map((chapter) => ({
              ...chapter,
              lessons: chapter.lessons.filter((les) => les.published),
            })),
          }))
        : [],
    [course],
  );

  /** Flat list of the topics, in program order. */
  const chapters = useMemo(
    () => semesters.flatMap((semester) => semester.chapters),
    [semesters],
  );

  const progress = useMemo(
    () => (course && me ? courseProgress(state, me.id, course) : null),
    [course, me, state],
  );

  /** Default-open the section that holds the next lesson. */
  const initialChapter = useMemo(() => {
    if (!course || !progress) return chapters[0]?.id ?? null;
    const found = chapters.find((c) => c.lessons.some((les) => les.id === progress.nextLessonId));
    return found?.id ?? chapters[0]?.id ?? null;
  }, [course, chapters, progress]);

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
  const durationSec = courseDurationSec(course);
  const minutes = Math.round(durationSec / 60);
  const lessons = allLessons(course).filter((les) => les.published);
  const publishedCount = lessons.length;
  const openId = openChapter ?? initialChapter;

  /** 1-based index of the lesson the student should resume. */
  const resumeIndex = progress?.nextLessonId
    ? Math.max(1, lessons.findIndex((les) => les.id === progress.nextLessonId) + 1)
    : 1;
  const resumeLesson = lessons.find((les) => les.id === progress?.nextLessonId) ?? lessons[0];

  /** The prof who owns this course (fallback: the platform teacher). */
  const instructor = courseTeacher(state, course);

  const openLesson = (lesson: Lesson) => {
    if (!accessible) return;
    navigation.navigate(lessonRoute(lesson.kind), { lessonId: lesson.id });
  };

  /**
   * Art for the header: the professor's own photo when they have one, so the
   * course reads as their space, otherwise the course's cover palette entry.
   */
  const photos = teacherPhotosFor(instructor.photo);
  const heroSource = photos?.hero ?? coverAssets[course.cover];

  return (
    <View style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ---- hero ---- */}
        <View style={styles.hero}>
          {heroSource ? (
            <Image source={heroSource} style={styles.heroArt} resizeMode="cover" />
          ) : (
            <LinearGradient
              colors={['#3D82FF', '#0546C8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroArt}
            />
          )}
          <LinearGradient
            colors={['rgba(11,18,32,0.45)', 'rgba(11,18,32,0.70)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.heroArt}
          />

          <SafeAreaView edges={['top']}>
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
                icon={bookmarked ? 'bookmark' : 'bookmark-outline'}
                variant="onPhoto"
                size={38}
                label={
                  bookmarked
                    ? rtl
                      ? 'إزالة الدورة من المحفوظات'
                      : 'Retirer le cours des favoris'
                    : rtl
                      ? 'حفظ الدورة'
                      : 'Ajouter le cours aux favoris'
                }
                onPress={() => setBookmarked((b) => !b)}
              />
            </View>

            <View style={styles.heroBody}>
              <AppText
                size={11}
                weight="bold"
                tone="white"
                style={{ letterSpacing: 0.9, textTransform: 'uppercase', opacity: 0.9 }}
              >
                {course.subject} · {course.level}
              </AppText>
              <AppText size={24} weight="bold" tone="white" numberOfLines={3}>
                {course.title}
              </AppText>
              <View style={l.row}>
                <Pill
                  label={
                    accessible
                      ? rtl
                        ? 'متاحة لك'
                        : 'Disponible pour vous'
                      : status === 'pending'
                        ? rtl
                          ? 'بانتظار التفعيل'
                          : "En attente d'activation"
                        : rtl
                          ? 'وصول موقوف'
                          : 'Accès suspendu'
                  }
                  tone={accessible ? 'success' : status === 'pending' ? 'warning' : 'danger'}
                  dot
                />
                <Pill
                  label={`${publishedCount} ${rtl ? 'درس' : 'leçons'}`}
                  tone="neutral"
                />
                {durationSec > 0 ? (
                  <Pill label={durationLabel(durationSec, rtl)} tone="neutral" />
                ) : null}
              </View>
            </View>
          </SafeAreaView>
        </View>

        <View style={styles.body}>
          {/* ---- instructor ---- */}
          <View style={[l.row, styles.instructor]}>
            <Avatar
              monogram={instructor.monogram}
              size={44}
              tone="brand"
              square
              photo={photos?.avatar}
            />
            <View style={{ flex: 1, gap: 1 }}>
              <AppText size={14.5} weight="semibold" tone="ink" numberOfLines={1}>
                {instructor.name}
              </AppText>
              <AppText size={12.5} tone="muted" numberOfLines={1}>
                {instructor.subject}
                {state.teacher.centerName ? ` · ${state.teacher.centerName}` : ''}
              </AppText>
            </View>
          </View>

          {/* ---- stats ---- */}
          <View style={[l.row, styles.statsRow]}>
            <View style={styles.statBox}>
              <Ionicons name="play-circle-outline" size={17} color={colors.brand} />
              <View>
                <AppText size={15} weight="bold" tone="ink">
                  {publishedCount}
                </AppText>
                <AppText size={11} tone="muted">
                  {rtl ? 'دروس' : 'leçons'}
                </AppText>
              </View>
            </View>
            {durationSec > 0 ? (
              <View style={styles.statBox}>
                <Ionicons name="time-outline" size={17} color={colors.brand} />
                <View>
                  <AppText size={15} weight="bold" tone="ink">
                    {minutes}
                  </AppText>
                  <AppText size={11} tone="muted">
                    {rtl ? 'دقيقة' : 'minutes'}
                  </AppText>
                </View>
              </View>
            ) : null}
          </View>

          {/* ---- resume CTA ---- */}
          {accessible && resumeLesson ? (
            <PrimaryButton
              label={
                progress && progress.percent > 0
                  ? `${rtl ? 'متابعة' : 'Continuer'} · ${rtl ? 'الدرس' : 'Leçon'} ${resumeIndex}`
                  : rtl
                    ? 'ابدأ الدورة'
                    : 'Commencer le cours'
              }
              leadingIcon="play"
              onPress={() => openLesson(resumeLesson)}
            />
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

          {/* ---- progress ---- */}
          {progress ? (
            <Card style={styles.progressCard}>
              <View style={l.rowBetween}>
                <Eyebrow>{rtl ? 'تقدّمك' : 'Votre progression'}</Eyebrow>
                <AppText size={14} weight="bold" tone="brand">
                  {progress.percent}%
                </AppText>
              </View>
              <ProgressBar value={progress.percent} />
              <AppText size={12} tone="muted">
                {progress.completed} {rtl ? 'من' : 'sur'} {progress.total}{' '}
                {rtl ? 'دروس مكتملة' : 'leçons terminées'}
              </AppText>
            </Card>
          ) : null}

          {/* ---- about ---- */}
          <View style={styles.about}>
            <Eyebrow>{rtl ? 'عن هذه الدورة' : 'À propos de ce cours'}</Eyebrow>
            <AppText size={14.5} tone="body" style={{ lineHeight: 23 }}>
              {course.summary}
            </AppText>
          </View>

          {/* ---- program: semesters → topics → lessons ---- */}
          <View style={{ marginTop: spacing.xl, gap: spacing.xxl }}>
            {semesters.map((semester, si) => {
              const semesterLessons = semester.chapters.flatMap((c) => c.lessons);
              const semesterSeconds = semesterLessons.reduce((sum, x) => sum + x.durationSec, 0);
              const semesterDone = semesterLessons.filter((les) => progressOf(les.id)?.completed).length;
              /** Topics already listed by the previous semesters. */
              const offset = semesters
                .slice(0, si)
                .reduce((sum, s) => sum + s.chapters.length, 0);
              return (
                <View key={semester.id} style={{ gap: spacing.md }}>
                  <View style={[styles.semesterHead, l.rowBetween]}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <AppText size={16.5} weight="bold" tone="ink">
                        {semester.title}
                      </AppText>
                      <AppText size={11.5} tone="muted">
                        {semester.chapters.length} {rtl ? 'فصول' : 'chapitres'} ·{' '}
                        {semesterLessons.length} {rtl ? 'دروس' : 'leçons'}
                        {semesterSeconds > 0 ? ` · ${durationLabel(semesterSeconds, rtl)}` : ''}
                      </AppText>
                    </View>
                    {semesterLessons.length > 0 ? (
                      <Pill
                        label={`${semesterDone}/${semesterLessons.length}`}
                        tone={semesterDone === semesterLessons.length ? 'success' : 'neutral'}
                      />
                    ) : null}
                  </View>

                  {semester.chapters.map((chapter, ciLocal) => {
                    const ci = offset + ciLocal;
                    const isOpen = openId === chapter.id;
                    const chapterSeconds = chapter.lessons.reduce((sum, x) => sum + x.durationSec, 0);
                    return (
                      <Card key={chapter.id} flush>
                        <Pressable
                          onPress={() => setOpenChapter(isOpen ? '' : chapter.id)}
                          accessibilityRole="button"
                          accessibilityState={{ expanded: isOpen }}
                          accessibilityLabel={`${semester.title} — ${chapter.title}`}
                          style={({ pressed }) => [
                            styles.chapterHeader,
                            l.row,
                            pressed && { opacity: 0.85 },
                          ]}
                        >
                          <View style={styles.chapterIndex} importantForAccessibility="no">
                            <AppText size={12} weight="bold" tone="brand">
                              {ci + 1}
                            </AppText>
                          </View>
                          <View style={{ flex: 1, gap: 2 }}>
                            <AppText size={14.5} weight="bold" tone="ink" numberOfLines={2}>
                              {chapter.title}
                            </AppText>
                            <AppText size={11.5} tone="muted">
                              {chapter.lessons.length} {rtl ? 'دروس' : 'leçons'}
                              {chapterSeconds > 0 ? ` · ${durationLabel(chapterSeconds, rtl)}` : ''}
                            </AppText>
                          </View>
                          <Ionicons
                            name={isOpen ? 'chevron-up' : 'chevron-down'}
                            size={18}
                            color={colors.faint}
                            importantForAccessibility="no"
                          />
                        </Pressable>

                        {isOpen ? (
                          chapter.lessons.length === 0 ? (
                            <View style={[styles.emptyRow, l.row]}>
                              <Ionicons name="documents-outline" size={18} color={colors.faint} />
                              <AppText size={12.5} tone="muted" style={{ flex: 1 }}>
                                {rtl
                                  ? 'لا دروس في هذا الفصل بعد.'
                                  : 'Aucune leçon dans ce chapitre pour le moment.'}
                              </AppText>
                            </View>
                          ) : (
                            chapter.lessons.map((lesson, li) => {
                              const p = progressOf(lesson.id);
                              const tint = lessonTint(lesson.kind);
                              const meta = lessonMetaText(lesson, lang);
                              return (
                                <Pressable
                                  key={lesson.id}
                                  onPress={() => openLesson(lesson)}
                                  disabled={!accessible}
                                  style={({ pressed }) => [
                                    styles.lessonRow,
                                    l.row,
                                    pressed && accessible && { backgroundColor: colors.brandSofter },
                                  ]}
                                  accessibilityRole="button"
                                  accessibilityLabel={`الدرس ${li + 1}: ${lesson.title} — ${
                                    meta ?? ''
                                  }${
                                    p?.completed
                                      ? '، مكتمل'
                                      : p && p.positionSec > 5
                                        ? '، قيد المشاهدة'
                                        : ''
                                  }${accessible ? '' : '، مقفل بانتظار التفعيل'}`}
                                  accessibilityHint={
                                    accessible ? 'يفتح الدرس' : 'الدرس مقفل — انتظر تفعيل الوصول'
                                  }
                                >
                                  <View style={[styles.lessonIcon, { backgroundColor: tint.soft }]}>
                                    <Ionicons
                                      name={LESSON_ICONS[lesson.kind]}
                                      size={15}
                                      color={tint.dark}
                                    />
                                  </View>

                                  <View style={{ flex: 1, gap: 3 }}>
                                    <AppText
                                      size={14}
                                      weight="semibold"
                                      tone={accessible ? 'ink' : 'faint'}
                                      numberOfLines={2}
                                    >
                                      {li + 1}. {lesson.title}
                                    </AppText>
                                    <AppText size={11.5} tone="muted">
                                      {meta ?? (rtl ? 'نص' : 'texte')}
                                      {p?.completed
                                        ? ` · ${rtl ? 'مكتمل ✓' : 'terminé ✓'}`
                                        : p && p.positionSec > 5
                                          ? ` · ${rtl ? 'قيد المشاهدة' : 'en cours'}`
                                          : ''}
                                    </AppText>
                                  </View>

                                  {p?.completed ? (
                                    <Pill label="✓" tone="success" />
                                  ) : (
                                    <Ionicons
                                      name={rtl ? 'chevron-back' : 'chevron-forward'}
                                      size={18}
                                      color={accessible ? colors.faint : colors.lineStrong}
                                      importantForAccessibility="no"
                                    />
                                  )}
                                </Pressable>
                              );
                            })
                          )
                        ) : null}
                      </Card>
                    );
                  })}
                </View>
              );
            })}
          </View>

          {!accessible && status === 'pending' ? (
            <PrimaryButton
              label={rtl ? 'تحديث حالة الوصول' : "Actualiser l'accès"}
              variant="outline"
              style={{ marginTop: spacing.lg }}
              onPress={() => navigation.goBack()}
            />
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  scroll: { paddingBottom: spacing.xxl * 2 },
  missingWrap: { padding: spacing.lg },
  /* `overflow: hidden` keeps the header art inside the header — without it the
     cover bleeds down the body, behind the cards. */
  hero: { backgroundColor: '#0B1B2A', overflow: 'hidden' },
  /*
   * Absolute art layer that fills the header. Explicit percentages rather than
   * `StyleSheet.absoluteFill`: an `Image` given only insets resolves to its own
   * intrinsic pixel size instead, painting a magnified slice of the artwork far
   * outside the header.
   */
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
  body: { padding: spacing.lg, gap: spacing.lg },
  instructor: { gap: spacing.md },
  statsRow: { gap: spacing.md },
  statBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  progressCard: { gap: spacing.md, backgroundColor: colors.surfaceAlt, borderColor: 'transparent' },
  about: { gap: spacing.sm },
  semesterHead: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.xs,
    borderBottomWidth: 2,
    borderBottomColor: colors.brandSoft,
  },
  chapterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  chapterIndex: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  lessonIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
