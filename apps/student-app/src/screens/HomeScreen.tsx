/**
 * Home — the student dashboard.
 *
 * Date + greeting header with a notification bell and the student's avatar,
 * the search entry, the «reprendre» card, «Mes cours» with an active counter,
 * the subjects rail, the latest lessons and an access-needed state when the
 * student has no active enrollment.
 *
 * Fully bilingual: strings come from the shared dictionary and the layout
 * flips between RTL (Arabic) and LTR (French) via useLayout(lang).
 */

import React, { useMemo, useRef, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import {
  allLessons,
  courseProgress,
  courseTeacher,
  continueLearning,
  lessonProgress,
  relativeTime,
  type Course,
  type Lesson,
} from '@ostadiplus/shared';

import { useI18n } from '../i18n/useI18n';
import { useLayout } from '../i18n/layout';
import {
  AppText,
  Card,
  CourseCover,
  EmptyState,
  Eyebrow,
  IconButton,
  LessonGlyph,
  MetricChip,
  Pill,
  PlayGlyph,
  PrimaryButton,
  ProgressBar,
  SearchBar,
  SectionHead,
  SubjectTile,
  Thumb,
} from '../components/ui';
import { resolvePoster } from '../media/lookup';
import { lessonMetaText, lessonRoute } from '../lib/lesson';
import { useStore } from '../store/StudentStore';
import { colors, radius, shadow, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';
import { useScrollToTopOnTabPress } from '../navigation/useScrollToTopOnTabPress';

/** A lesson paired with the course it belongs to (for cover + navigation). */
interface LessonEntry {
  lesson: Lesson;
  course: Course;
}

/* Weekday + month names, spelled out locally (Hermes has no full Intl). */
const WEEKDAYS = {
  ar: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
  fr: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
};
const MONTHS = {
  ar: [
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
  ],
  fr: [
    'janvier',
    'février',
    'mars',
    'avril',
    'mai',
    'juin',
    'juillet',
    'août',
    'septembre',
    'octobre',
    'novembre',
    'décembre',
  ],
};

/** «lundi 14 avril» / «الاثنين 14 أبريل» — derived from the device clock. */
function formatToday(lang: 'ar' | 'fr'): string {
  const now = new Date();
  return `${WEEKDAYS[lang][now.getDay()]} ${now.getDate()} ${MONTHS[lang][now.getMonth()]}`;
}

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { state, me, myCourses, myNotifications, markNotificationRead } = useStore();
  const { lang, t, dir } = useI18n();
  const l = useLayout(lang);
  const rtl = dir === 'rtl';
  const scrollRef = useRef<ScrollView>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  useScrollToTopOnTabPress(scrollRef);

  const continueItem = useMemo(
    () => (me ? continueLearning(state, me.id) : null),
    [state, me],
  );

  // Unique subjects across the student's accessible courses.
  const subjects = useMemo(() => {
    const seen: string[] = [];
    for (const course of myCourses) {
      if (!seen.includes(course.subject)) seen.push(course.subject);
    }
    return seen;
  }, [myCourses]);

  // Course rows with their real progress.
  const courseCards = useMemo(
    () =>
      myCourses.map((course) => ({
        course,
        progress: me ? courseProgress(state, me.id, course) : null,
      })),
    [myCourses, me, state],
  );

  // Latest published lessons across the student's courses.
  const latestLessons = useMemo<LessonEntry[]>(() => {
    const out: LessonEntry[] = [];
    for (const course of myCourses) {
      for (const lesson of allLessons(course)) {
        if (lesson.published) out.push({ lesson, course });
      }
    }
    return out.slice(0, 4);
  }, [myCourses]);

  // Real progress metrics derived from tracked lesson progress.
  const metrics = useMemo(() => {
    if (!me) return { completed: 0, minutes: 0, courses: myCourses.length };
    let completed = 0;
    let seconds = 0;
    for (const course of myCourses) {
      for (const lesson of allLessons(course)) {
        const p = lessonProgress(state, me.id, lesson.id);
        if (p?.completed) completed += 1;
        seconds += p?.positionSec ?? 0;
      }
    }
    return { completed, minutes: Math.round(seconds / 60), courses: myCourses.length };
  }, [state, me, myCourses]);

  const hasActiveAccess = myCourses.length > 0;
  const unreadCount = myNotifications.filter((n) => !n.read).length;

  return (
    <View style={styles.root}>
      {/* ---- white header ---- */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={[styles.headerTop, l.rowTop]}>
          <View style={{ flexShrink: 1, gap: 1 }}>
            <Eyebrow>{formatToday(lang)}</Eyebrow>
            <View style={l.row}>
              <AppText size={13} tone="muted">
                {t('welcome_user')} 👋
              </AppText>
            </View>
            <AppText size={21} weight="bold" tone="ink" numberOfLines={1}>
              {me?.fullName ?? ''}
            </AppText>
            <AppText size={12.5} tone="muted" numberOfLines={1}>
              {[me?.level, state.teacher?.centerName].filter(Boolean).join(' · ')}
            </AppText>
          </View>

          <View style={l.row}>
            <View>
              <IconButton
                icon="notifications-outline"
                variant="surface"
                size={40}
                label={rtl ? 'الإشعارات' : 'Notifications'}
                onPress={() => setNotifOpen(true)}
              />
              {unreadCount > 0 ? <View style={styles.bellDot} /> : null}
            </View>
            <View style={styles.avatar}>
              <Image
                source={require('../assets/student-avatar.jpg')}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </View>
          </View>
        </View>

        {/* Quick metrics */}
        <View style={[l.row, styles.metricRow]}>
          <MetricChip
            icon="checkmark-done-outline"
            value={`${metrics.completed}`}
            label={rtl ? 'درس مكتمل' : 'Terminées'}
          />
          <MetricChip
            icon="play-circle-outline"
            value={`${metrics.minutes} ${rtl ? 'د' : 'min'}`}
            label={rtl ? 'مشاهدة' : 'Regardé'}
          />
          <MetricChip
            icon="library-outline"
            value={`${metrics.courses}`}
            label={rtl ? 'دورة' : 'Cours'}
          />
        </View>
      </SafeAreaView>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
        {/* Search */}
        <SearchBar
          placeholder={
            rtl ? 'ابحث عن درس، مادة، أو أستاذ…' : 'Rechercher un cours, une matière…'
          }
          onPress={() => navigation.navigate('Tabs', { screen: 'Courses' })}
        />

        {/* ---- pick up where you left off ---- */}
        {continueItem ? (
          <>
            <SectionHead eyebrow={rtl ? 'أكمل من حيث توقفت' : 'Reprendre où vous étiez'} />
            <Pressable
              onPress={() =>
                navigation.navigate('CourseDetail', { courseId: continueItem.course.id })
              }
              style={({ pressed }) => pressed && { opacity: 0.94 }}
              accessibilityRole="button"
              accessibilityLabel={continueItem.lesson.title}
            >
              <Card flush>
                <CourseCover cover={continueItem.course.cover} subject={continueItem.course.subject} height={126}>
                  <View style={l.rowBetween}>
                    <View style={{ flexShrink: 1 }}>
                      <AppText size={15.5} weight="bold" tone="white" numberOfLines={2}>
                        {continueItem.lesson.title}
                      </AppText>
                      <AppText size={12} tone="white" style={{ opacity: 0.85 }} numberOfLines={1}>
                        {continueItem.course.title}
                      </AppText>
                    </View>
                    <LessonGlyph kind={continueItem.lesson.kind} size={38} />
                  </View>
                </CourseCover>
                <View style={styles.continueBody}>
                  <View style={l.rowBetween}>
                    <AppText size={12.5} tone="muted">
                      {lessonMetaText(continueItem.lesson, lang) ?? ''}
                    </AppText>
                    <AppText size={12.5} weight="semibold" tone="ink">
                      {continueItem.percent}% {rtl ? 'مكتمل' : 'terminé'}
                    </AppText>
                  </View>
                  <ProgressBar value={continueItem.percent} />
                  <View style={l.rowBetween}>
                    <AppText size={13.5} weight="semibold" tone="brand">
                      {continueItem.lesson.kind === 'video' && continueItem.positionSec > 5
                        ? rtl
                          ? 'تابع المشاهدة'
                          : 'Reprendre'
                        : rtl
                          ? 'ابدأ الدرس'
                          : 'Commencer la leçon'}
                    </AppText>
                    <Ionicons
                      name={rtl ? 'arrow-back' : 'arrow-forward'}
                      size={16}
                      color={colors.brand}
                    />
                  </View>
                </View>
              </Card>
            </Pressable>
          </>
        ) : null}

        {/* ---- your courses ---- */}
        {courseCards.length > 0 ? (
          <>
            <SectionHead
              eyebrow={rtl ? 'دوراتي' : 'Mes cours'}
              counter={`${courseCards.length} ${rtl ? 'نشطة' : 'actifs'}`}
            />
            <View style={{ gap: spacing.md }}>
              {courseCards.map(({ course, progress }) => (
                <Pressable
                  key={course.id}
                  onPress={() => navigation.navigate('CourseDetail', { courseId: course.id })}
                  style={({ pressed }) => pressed && { opacity: 0.94 }}
                  accessibilityRole="button"
                  accessibilityLabel={course.title}
                >
                  <Card flush>
                    <View style={[styles.courseRow, l.row]}>
                      <Thumb cover={course.cover} width={96} height={72} radiusValue={radius.sm} overlay>
                        <View style={styles.thumbPlay}>
                          <PlayGlyph size={26} />
                        </View>
                      </Thumb>
                      <View style={{ flex: 1, gap: 4 }}>
                        <AppText size={15} weight="bold" tone="ink" numberOfLines={2}>
                          {course.title}
                        </AppText>
                        <AppText size={12} tone="muted" numberOfLines={1}>
                          {course.subject} · {courseTeacher(state, course).name}
                        </AppText>
                        <View style={l.row}>
                          <View style={{ flex: 1 }}>
                            <ProgressBar
                              value={progress?.percent ?? 0}
                              height={6}
                              tone={progress?.percent === 100 ? 'success' : 'brand'}
                            />
                          </View>
                          <AppText size={11.5} weight="semibold" tone="muted">
                            {progress?.percent ?? 0}%
                          </AppText>
                        </View>
                      </View>
                    </View>
                    <View style={[l.rowBetween, styles.courseFooter]}>
                      <AppText size={13} weight="semibold" tone="brand">
                        {rtl ? 'متابعة الدورة' : 'Continuer le cours'}
                      </AppText>
                      <Ionicons
                        name={rtl ? 'arrow-back' : 'arrow-forward'}
                        size={15}
                        color={colors.brand}
                      />
                    </View>
                  </Card>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {/* Subjects rail */}
        {subjects.length > 0 ? (
          <>
            <SectionHead
              eyebrow={rtl ? 'موادي' : 'Mes matières'}
              action={rtl ? 'الكل' : 'Tout'}
              onAction={() => navigation.navigate('Tabs', { screen: 'Courses' })}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rail}
            >
              {subjects.map((subject) => (
                <SubjectTile
                  key={subject}
                  subject={subject}
                  onPress={() => navigation.navigate('Tabs', { screen: 'Courses' })}
                />
              ))}
            </ScrollView>
          </>
        ) : null}

        {/* Latest lessons */}
        {latestLessons.length > 0 ? (
          <>
            <SectionHead
              eyebrow={rtl ? 'أحدث الدروس' : 'Dernières leçons'}
              action={rtl ? 'الكل' : 'Tout'}
              onAction={() => navigation.navigate('Tabs', { screen: 'Courses' })}
            />
            <View style={{ gap: spacing.md }}>
              {latestLessons.map(({ lesson, course }) => {
                const p = me ? lessonProgress(state, me.id, lesson.id) : undefined;
                const percent =
                  p && lesson.durationSec > 0
                    ? Math.min(100, Math.round((p.positionSec / lesson.durationSec) * 100))
                    : p?.completed
                      ? 100
                      : undefined;
                return (
                  <Pressable
                    key={lesson.id}
                    onPress={() =>
                      navigation.navigate(lessonRoute(lesson.kind), { lessonId: lesson.id })
                    }
                    style={({ pressed }) => pressed && { opacity: 0.94 }}
                    accessibilityRole="button"
                    accessibilityLabel={lesson.title}
                  >
                    <Card flush>
                      <View style={[styles.courseRow, l.row]}>
                        <Thumb
                          cover={course.cover}
                          poster={lesson.kind === 'video' ? resolvePoster(lesson.file) : undefined}
                          width={104}
                          height={68}
                          radiusValue={radius.sm}
                          overlay
                        >
                          <View style={styles.thumbPlay}>
                            <LessonGlyph kind={lesson.kind} size={26} />
                          </View>
                        </Thumb>
                        <View style={{ flex: 1, gap: 4 }}>
                          <AppText size={14.5} weight="semibold" tone="ink" numberOfLines={2}>
                            {lesson.title}
                          </AppText>
                          <View style={l.row}>
                            <AppText size={11.5} tone="muted">
                              {courseTeacher(state, course).name}
                            </AppText>
                            <Pill
                              label={
                                lessonMetaText(lesson, lang) ?? (rtl ? 'نص' : 'texte')
                              }
                              tone="neutral"
                            />
                          </View>
                          {percent !== undefined ? (
                            <ProgressBar value={percent} height={5} />
                          ) : null}
                        </View>
                      </View>
                    </Card>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        {/* ---- access-needed state (no active subscription) ---- */}
        {!hasActiveAccess && me ? (
          <View style={styles.emptyStateWrap}>
            <EmptyState
              icon="lock-closed-outline"
              title={rtl ? 'لا يوجد وصول نشط' : 'Aucun accès actif'}
              description={
                rtl
                  ? 'طلب وصولك قيد المعالجة أو لم يُفعَّل بعد. تواصل مع مركزك لتفعيل الدروس.'
                  : "Votre demande d'accès est en cours ou n'est pas encore activée. Contactez votre centre."
              }
              action={
                <PrimaryButton
                  label={rtl ? 'بطاقة الطالب' : 'Ma carte étudiante'}
                  variant="soft"
                  onPress={() => navigation.navigate('StudentCard')}
                />
              }
            />
          </View>
        ) : null}
      </ScrollView>

      {/* ---- notifications sheet ---- */}
      <Modal
        visible={notifOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setNotifOpen(false)}
      >
        <Pressable style={styles.scrim} onPress={() => setNotifOpen(false)} accessible={false}>
          <Pressable style={styles.sheet} onPress={() => undefined} accessible={false}>
            <View style={styles.grabber} />
            <View style={[l.rowBetween, styles.sheetHead]}>
              <AppText size={17} weight="bold" tone="ink">
                {rtl ? 'الإشعارات' : 'Notifications'}
              </AppText>
              <IconButton
                icon="close"
                variant="plain"
                size={34}
                label={rtl ? 'إغلاق' : 'Fermer'}
                onPress={() => setNotifOpen(false)}
              />
            </View>

            {myNotifications.length === 0 ? (
              <AppText size={14} tone="muted" style={styles.sheetEmpty}>
                {rtl ? 'لا توجد إشعارات بعد.' : 'Aucune notification pour le moment.'}
              </AppText>
            ) : (
              <ScrollView style={{ maxHeight: 380 }}>
                {myNotifications.map((n) => (
                  <Pressable
                    key={n.id}
                    onPress={() => markNotificationRead(n.id)}
                    accessibilityRole="button"
                    accessibilityLabel={n.payload.centerName ?? n.payload.courseTitle ?? ''}
                    style={({ pressed }) => [styles.notifRow, l.row, pressed && { opacity: 0.75 }]}
                  >
                    <View style={styles.notifIcon} importantForAccessibility="no">
                      <Ionicons
                        name={n.kind === 'access-granted' ? 'checkmark-circle-outline' : 'business-outline'}
                        size={18}
                        color={colors.brand}
                      />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <AppText size={14} weight="semibold" tone="ink" numberOfLines={2}>
                        {n.kind === 'access-granted'
                          ? rtl
                            ? `تم تفعيل وصولك إلى «${n.payload.courseTitle ?? ''}»`
                            : `Accès activé : « ${n.payload.courseTitle ?? ''} »`
                          : rtl
                            ? `طلب انضمام من «${n.payload.centerName ?? ''}»`
                            : `Demande d'adhésion de « ${n.payload.centerName ?? ''} »`}
                      </AppText>
                      <AppText size={12} tone="muted">
                        {relativeTime(n.createdAt, lang)}
                      </AppText>
                    </View>
                    {!n.read ? <View style={styles.notifDot} /> : null}
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  headerSafe: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.line,
  },
  bellDot: {
    position: 'absolute',
    top: 6,
    end: 7,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  metricRow: { gap: spacing.sm, marginTop: spacing.lg },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.xs,
  },
  continueBody: { padding: spacing.lg, gap: spacing.md },
  courseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  thumbPlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  courseFooter: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    gap: spacing.sm,
  },
  rail: { gap: spacing.sm, paddingVertical: spacing.xs, paddingHorizontal: 2 },
  emptyStateWrap: { margin: spacing.lg },
  scrim: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.md,
    ...shadow.overlay,
  },
  grabber: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.line,
  },
  sheetHead: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  sheetEmpty: { paddingHorizontal: spacing.xl, paddingVertical: spacing.xl, textAlign: 'center' },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  notifIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.brandSofter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand },
});
