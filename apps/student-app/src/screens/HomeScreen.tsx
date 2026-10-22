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
  type CourseProgress,
  type Lesson,
  type NotificationKind,
} from '@ostadiplus/shared';

import { useI18n } from '../i18n/useI18n';
import { useLayout } from '../i18n/layout';
import {
  AppText,
  Card,
  CourseCover,
  IconButton,
  LessonGlyph,
  PlayGlyph,
  ProgressBar,
  SearchBar,
  SectionHead,
  SubjectTile,
  Thumb,
} from '../components/ui';
import { resolvePoster } from '../media/lookup';
import { lessonKindOf, lessonMetaText, lessonRoute } from '../lib/lesson';
import { useStore } from '../store/StudentStore';
import PendingEnrollment from '../components/PendingEnrollment';
import BrandWordmark from '../components/BrandWordmark';
import { colors, radius, shadow, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';
import { useScrollToTopOnTabPress } from '../navigation/useScrollToTopOnTabPress';

/** A lesson paired with the course it belongs to (for cover + navigation). */
interface LessonEntry {
  lesson: Lesson;
  course: Course;
}

/** Glyph for each kind of notification row. */
const NOTIF_ICONS: Record<NotificationKind, keyof typeof Ionicons.glyphMap> = {
  'new-lesson': 'megaphone-outline',
  'access-granted': 'checkmark-circle-outline',
  'center-request': 'business-outline',
};

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

/** Header-only compact metrics keep labels readable on narrow phones. */
function HeaderMetric({ icon, value, label }: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
}) {
  const { lang } = useI18n();
  const l = useLayout(lang);
  return (
    <View style={styles.headerMetric}>
      <View style={[l.row, styles.metricValueRow]}>
        <Ionicons name={icon} size={15} color={colors.brand} importantForAccessibility="no" />
        <AppText size={14} weight="bold" tone="brand" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{value}</AppText>
      </View>
      <AppText size={10.5} tone="muted" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{label}</AppText>
    </View>
  );
}

/**
 * A latest-lesson card: the full-width 16:9 cover sits on top — play glyph
 * centred, length in the bottom-right, subject chip in the top-left — with the
 * title (two lines max) directly under it.
 */
function LessonCard({
  lesson,
  course,
  onPress,
}: {
  lesson: Lesson;
  course: Course;
  onPress: () => void;
}) {
  const { state } = useStore();
  const { lang, dir } = useI18n();
  const rtl = dir === 'rtl';
  const teacher = courseTeacher(state, course);
  const poster = lesson.kind === 'video' ? resolvePoster(lesson.file, lesson.thumbnailUrl) : undefined;
  const meta = lessonMetaText(lesson, lang);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => pressed && { opacity: 0.94 }}
      accessibilityRole="button"
      accessibilityLabel={
        rtl
          ? `درس ${lesson.title}، ${teacher.name}${meta ? `، ${meta}` : ''}`
          : `Leçon ${lesson.title}, ${teacher.name}${meta ? `, ${meta}` : ''}`
      }
      accessibilityHint={rtl ? 'يفتح الدرس' : 'Ouvre la leçon'}
    >
      <Card flush>
        <Thumb cover={course.cover} poster={poster} aspectRatio={16 / 9} radiusValue={0} overlay>
          <View style={styles.cardPlay} pointerEvents="none" importantForAccessibility="no">
            <LessonGlyph kind={lesson.kind} size={56} />
          </View>
          {meta ? (
            <View style={styles.cardMeta} pointerEvents="none" importantForAccessibility="no">
              <AppText size={11.5} weight="semibold" tone="white">
                {meta}
              </AppText>
            </View>
          ) : null}
          <View style={styles.cardTag} pointerEvents="none" importantForAccessibility="no">
            <AppText size={11.5} weight="medium" tone="white">
              {course.subject}
            </AppText>
          </View>
        </Thumb>
        <View style={styles.cardBody}>
          <AppText size={15} weight="semibold" tone="ink" numberOfLines={2}>
            {lesson.title}
          </AppText>
        </View>
      </Card>
    </Pressable>
  );
}

/**
 * A «Mes cours» card: the full-width 16:9 cover on top — play glyph centred,
 * subject chip in the top-left, lesson count in the bottom-right — then the
 * title/teacher, progress and the «Continuer le cours» action below.
 */
function CourseCard({
  course,
  progress,
  onPress,
}: {
  course: Course;
  progress: CourseProgress | null;
  onPress: () => void;
}) {
  const { state } = useStore();
  const { lang, dir } = useI18n();
  const l = useLayout(lang);
  const rtl = dir === 'rtl';
  const teacher = courseTeacher(state, course);
  const lessonCount = allLessons(course).length;
  const percent = progress?.percent ?? 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => pressed && { opacity: 0.94 }}
      accessibilityRole="button"
      accessibilityLabel={course.title}
    >
      <Card flush>
        <Thumb cover={course.cover} aspectRatio={16 / 9} radiusValue={0} overlay>
          <View style={styles.cardPlay} pointerEvents="none" importantForAccessibility="no">
            <PlayGlyph size={56} />
          </View>
          <View style={styles.cardMeta} pointerEvents="none" importantForAccessibility="no">
            <AppText size={11.5} weight="semibold" tone="white">
              {lessonCount} {rtl ? 'دروس' : 'leçons'}
            </AppText>
          </View>
          <View style={styles.cardTag} pointerEvents="none" importantForAccessibility="no">
            <AppText size={11.5} weight="medium" tone="white">
              {course.subject}
            </AppText>
          </View>
        </Thumb>
        <View style={styles.courseBody}>
          <AppText size={15} weight="bold" tone="ink" numberOfLines={2}>
            {course.title}
          </AppText>
          <AppText size={12} tone="muted" numberOfLines={1}>
            {course.subject} · {teacher.name}
          </AppText>
          <View style={l.row}>
            <View style={{ flex: 1 }}>
              <ProgressBar
                value={percent}
                height={6}
                tone={percent === 100 ? 'success' : 'brand'}
              />
            </View>
            <AppText size={11.5} weight="semibold" tone="muted">
              {percent}%
            </AppText>
          </View>
        </View>
        <View style={[l.rowBetween, styles.courseFooter]}>
          <AppText size={13} weight="semibold" tone="brand">
            {rtl ? 'متابعة الدورة' : 'Continuer le cours'}
          </AppText>
          <Ionicons name={rtl ? 'arrow-back' : 'arrow-forward'} size={15} color={colors.brand} />
        </View>
      </Card>
    </Pressable>
  );
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

  if (!hasActiveAccess && me) {
    return <PendingEnrollment student={me} onShowCard={() => navigation.navigate('StudentCard')} />;
  }

  return (
    <View style={styles.root}>
      {/* Brand masthead, then a personal welcome in the supplied lilac. */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={[styles.headerTop, l.rowBetween]}>
          <View style={styles.wordmark}>
            <BrandWordmark size={24} lang={lang} />
          </View>
          <View style={[styles.headerActions, l.row]}>
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
            <Pressable
              onPress={() => navigation.navigate('Tabs', { screen: 'Profile' })}
              accessibilityRole="button"
              accessibilityLabel={rtl ? 'الملف الشخصي' : 'Profil'}
              style={({ pressed }) => [styles.avatar, pressed && { opacity: 0.75 }]}
            >
              <Image
                source={me?.profilePhoto ? { uri: me.profilePhoto } : require('../assets/student-avatar.jpg')}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.welcomePanel}>
          <View style={[l.rowBetween, styles.welcomeTop]}>
            <View style={[l.row, styles.welcomeLabel]}>
              <View style={styles.welcomeDot} />
              <AppText size={12} weight="semibold" tone="brand">{t('welcome_user')}</AppText>
            </View>
            <AppText size={10.5} tone="muted" numberOfLines={1} style={styles.date}>{formatToday(lang)}</AppText>
          </View>
          <AppText size={24} weight="bold" tone="brand" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={l.text}>
            {me?.fullName ?? ''}
          </AppText>
          <View style={[l.row, styles.welcomeMeta]}>
            <Ionicons name="school-outline" size={14} color={colors.brand} importantForAccessibility="no" />
            <AppText size={11.5} tone="muted" numberOfLines={1} style={[styles.metaText, l.text]}>
              {[me?.level, state.teacher?.centerName].filter(Boolean).join(' · ')}
            </AppText>
          </View>
        </View>

        {/* Quick metrics */}
        <View style={[l.row, styles.metricRow]}>
          <HeaderMetric
            icon="checkmark-done-outline"
            value={`${metrics.completed}`}
            label={rtl ? 'درس مكتمل' : 'Terminées'}
          />
          <HeaderMetric
            icon="play-circle-outline"
            value={`${metrics.minutes} ${rtl ? 'د' : 'min'}`}
            label={rtl ? 'مشاهدة' : 'Regardé'}
          />
          <HeaderMetric
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
          onPress={() => navigation.navigate('Tabs', { screen: 'Search' })}
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
            <View style={{ gap: spacing.lg }}>
              {courseCards.map(({ course, progress }) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  progress={progress}
                  onPress={() => navigation.navigate('CourseDetail', { courseId: course.id })}
                />
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
              onAction={() => navigation.navigate('Tabs', { screen: 'Learning' })}
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
                  onPress={() => navigation.navigate('Tabs', { screen: 'Search' })}
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
              onAction={() => navigation.navigate('Tabs', { screen: 'Learning' })}
            />
            <View style={{ gap: spacing.lg }}>
              {latestLessons.map(({ lesson, course }) => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  course={course}
                  onPress={() =>
                    navigation.navigate(lessonRoute(lesson.kind), { lessonId: lesson.id })
                  }
                />
              ))}
            </View>
          </>
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
                    onPress={() => {
                      markNotificationRead(n.id);
                      /* A lesson alert is a shortcut to the lesson itself. */
                      if (n.kind === 'new-lesson' && n.payload.lessonId) {
                        navigation.navigate(
                          lessonRoute(lessonKindOf(n.payload.lessonKind)),
                          { lessonId: n.payload.lessonId },
                        );
                        setNotifOpen(false);
                      }
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={
                      n.payload.lessonTitle ?? n.payload.centerName ?? n.payload.courseTitle ?? ''
                    }
                    style={({ pressed }) => [styles.notifRow, l.row, pressed && { opacity: 0.75 }]}
                  >
                    <View style={styles.notifIcon} importantForAccessibility="no">
                      <Ionicons
                        name={NOTIF_ICONS[n.kind]}
                        size={18}
                        color={colors.brand}
                      />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <AppText size={14} weight="semibold" tone="ink" numberOfLines={2}>
                        {n.kind === 'new-lesson'
                          ? rtl
                            ? `${n.payload.teacherName ?? ''} نشر درساً جديداً: ${n.payload.lessonTitle ?? ''}`
                            : `${n.payload.teacherName ?? ''} a publié : ${n.payload.lessonTitle ?? ''}`
                          : n.kind === 'access-granted'
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  wordmark: { width: 150, maxWidth: '54%' },
  headerActions: { gap: spacing.sm, flexShrink: 0 },
  welcomePanel: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.brandSofter,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    gap: spacing.xs,
  },
  welcomeTop: { gap: spacing.sm },
  welcomeLabel: { gap: 6, flexShrink: 1 },
  welcomeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  date: { flexShrink: 1 },
  welcomeMeta: { gap: 6 },
  metaText: { flex: 1, minWidth: 0 },
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
  metricRow: { gap: spacing.sm, marginTop: spacing.md },
  headerMetric: {
    flex: 1, minWidth: 0, alignItems: 'center', gap: 2,
    paddingHorizontal: 6, paddingVertical: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line,
    borderRadius: radius.md, backgroundColor: colors.surface,
  },
  metricValueRow: { alignItems: 'center', justifyContent: 'center', gap: 6 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.xs,
  },
  continueBody: { padding: spacing.lg, gap: spacing.md },
  courseBody: { padding: spacing.md, gap: 6 },
  /** Centred play glyph over a full-width lesson cover. */
  cardPlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  /** Length / pages badge — bottom-right corner of the cover. */
  cardMeta: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.scrim,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  /** Subject chip — top-left corner of the cover. */
  cardTag: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.scrim,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cardBody: { padding: spacing.md },
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
