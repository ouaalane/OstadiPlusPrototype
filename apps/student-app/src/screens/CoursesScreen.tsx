/**
 * «الدروس» — the Stitch lessons screen.
 *
 * Header (title + academic year), functional filter chips
 * (الكل / دروس / ملفات), then one card per course (header row with title,
 * progress and status → CourseDetail) listing its lessons as flush rows:
 * a rounded thumbnail with a play glyph and duration, title, teacher and a
 * bookmark toggle.
 */

import React, { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  allLessons,
  courseDurationSec,
  courseProgress,
  courseTeacher,
  formatDuration,
  lessonProgress,
  type Course,
  type Lesson,
} from '@ostadiplus/shared';

import {
  AppText,
  Card,
  EmptyState,
  IconButton,
  LessonGlyph,
  Pill,
  ProgressBar,
  Thumb,
} from '../components/ui';
import { lessonMetaText, lessonRoute } from '../lib/lesson';
import { resolvePoster } from '../media/lookup';
import { useI18n } from '../i18n/useI18n';
import { useLayout } from '../i18n/layout';
import { useStore } from '../store/StudentStore';
import { colors, radius, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';
import { useScrollToTopOnTabPress } from '../navigation/useScrollToTopOnTabPress';

type FilterKey = 'all' | 'video' | 'doc' | 'quiz';

/** Which chip a lesson belongs to. */
function matchesFilter(lesson: Lesson, filter: FilterKey): boolean {
  if (filter === 'all') return true;
  if (filter === 'video') return lesson.kind === 'video';
  if (filter === 'doc') return lesson.kind === 'pdf' || lesson.kind === 'text';
  return lesson.kind === 'quiz';
}

/** Status pill copy + tone per enrolment status. */
const STATUS_LABEL = {
  active: { ar: 'نشطة', fr: 'Disponible', tone: 'success' as const },
  pending: { ar: 'بانتظار التفعيل', fr: "En attente d'activation", tone: 'warning' as const },
  suspended: { ar: 'وصول موقوف', fr: 'Accès suspendu', tone: 'danger' as const },
  none: { ar: 'غير مشترك', fr: 'Non inscrit', tone: 'neutral' as const },
};

export default function CoursesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { state, me, myCourses, statusOf } = useStore();
  const { lang, t } = useI18n();
  const rtl = lang === 'ar';
  const l = useLayout(lang);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [bookmarked, setBookmarked] = useState<Record<string, boolean>>({});
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTopOnTabPress(scrollRef);

  /* Courses the teacher publishes but this student is not enrolled in yet. */
  const discoverable = useMemo(
    () => state.courses.filter((c) => c.status === 'published' && statusOf(c.id) === 'none'),
    [state.courses, statusOf],
  );

  /** Real counts across every enrolled course (drives the filter chips). */
  const counts = useMemo(() => {
    let video = 0;
    let doc = 0;
    let quiz = 0;
    for (const course of myCourses) {
      for (const lesson of allLessons(course)) {
        if (lesson.kind === 'video') video += 1;
        else if (lesson.kind === 'quiz') quiz += 1;
        else doc += 1;
      }
    }
    return { all: video + doc + quiz, video, doc, quiz };
  }, [myCourses]);

  const chips: { key: FilterKey; label: string; labelFr: string; count: number }[] = [
    { key: 'all', label: 'الكل', labelFr: 'Tout', count: counts.all },
    { key: 'video', label: 'دروس', labelFr: 'Leçons', count: counts.video },
    { key: 'doc', label: 'مراجعات', labelFr: 'Révisions', count: counts.doc },
    { key: 'quiz', label: 'اختبارات', labelFr: 'Examens', count: counts.quiz },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ---- header ---- */}
      <View style={[l.row, styles.header]}>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText size={24} weight="bold" tone="ink">
            {t('courses')}
          </AppText>
          <AppText size={12.5} tone="muted">
            {rtl ? 'باكالوريا المغرب 2025' : 'Baccalauréat Maroc 2025'}
          </AppText>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ---- filter chips ---- */}
        <View style={l.chipRow}>
          {chips.map((chip) => {
            const active = filter === chip.key;
            const label = rtl ? chip.label : chip.labelFr;
            return (
              <Pressable
                key={chip.key}
                onPress={() => setFilter(chip.key)}
                style={({ pressed }) => [
                  styles.chip,
                  active && styles.chipActive,
                  pressed && !active && { opacity: 0.7 },
                ]}
                accessible
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${label} (${chip.count})`}
              >
                <AppText size={13} weight={active ? 'bold' : 'semibold'} tone={active ? 'white' : 'body'}>
                  {label} ({chip.count})
                </AppText>
              </Pressable>
            );
          })}
        </View>

        {myCourses.length === 0 ? (
          <EmptyState
            title={rtl ? 'لا دورات في حسابك' : 'Aucun cours dans votre compte'}
            description={
              rtl
                ? 'دورات المركز تُفعَّل من طرف الأستاذ بعد التسجيل. إذا سجّلت مؤخراً، انتظر تفعيل الوصول ثم أعد فتح التطبيق.'
                : "Les cours du centre sont activés par votre professeur après l'inscription. Si vous venez de vous inscrire, attendez l'activation puis rouvrez l'application."
            }
          />
        ) : (
          <View style={{ gap: spacing.lg }}>
            {myCourses.map((course) => {
              const lessons = allLessons(course).filter((lesson) =>
                matchesFilter(lesson, filter),
              );
              if (lessons.length === 0) return null;

              const progress = me ? courseProgress(state, me.id, course) : null;
              const status = statusOf(course.id);
              const meta =
                STATUS_LABEL[status as keyof typeof STATUS_LABEL] ?? STATUS_LABEL.none;
              const minutes = Math.round(courseDurationSec(course) / 60);

              return (
                <Card key={course.id} flush>
                  {/* chapter header → CourseDetail */}
                  <Pressable
                    onPress={() => navigation.navigate('CourseDetail', { courseId: course.id })}
                    style={({ pressed }) => [
                      l.row,
                      styles.chapterHead,
                      pressed && { opacity: 0.75 },
                    ]}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel={
                      rtl
                        ? `${course.title} — ${lessons.length} درس${minutes > 0 ? `، ${minutes} دقيقة` : ''}${progress ? `، ${progress.percent} بالمئة مكتمل` : ''}`
                        : `${course.title} — ${lessons.length} leçons${minutes > 0 ? `, ${minutes} min` : ''}${progress ? `, ${progress.percent} % terminé` : ''}`
                    }
                    accessibilityHint={rtl ? 'يفتح صفحة الدورة' : 'Ouvre la page du cours'}
                  >
                    <View style={{ flex: 1, gap: 4 }}>
                      <AppText size={16} weight="bold" tone="ink" numberOfLines={1}>
                        {course.title}
                      </AppText>
                      {/* Duration only when the course carries timed media. */}
                      <AppText size={11.5} tone="muted">
                        {course.level} · {lessons.length} {rtl ? 'درس' : 'leçons'}
                        {minutes > 0 ? ` · ${minutes} ${rtl ? 'دقيقة' : 'min'}` : ''}
                      </AppText>
                      {progress ? (
                        <View style={{ marginTop: spacing.xs }}>
                          <ProgressBar value={progress.percent} />
                        </View>
                      ) : null}
                    </View>
                    <Pill label={rtl ? meta.ar : meta.fr} tone={meta.tone} dot />
                    <Ionicons
                      name={lang === 'ar' ? 'chevron-back' : 'chevron-forward'}
                      size={20}
                      color={colors.faint}
                    />
                  </Pressable>

                  {/* lesson rows */}
                  {lessons.map((lesson, index) => (
                    <LessonRow
                      key={lesson.id}
                      first={index === 0}
                      course={course}
                      lesson={lesson}
                      bookmarked={!!bookmarked[lesson.id]}
                      onBookmark={() =>
                        setBookmarked((b) => ({ ...b, [lesson.id]: !b[lesson.id] }))
                      }
                      onPress={() =>
                        navigation.navigate(lessonRoute(lesson.kind), {
                          lessonId: lesson.id,
                        })
                      }
                    />
                  ))}
                </Card>
              );
            })}
          </View>
        )}

        {discoverable.length > 0 ? (
          <View style={{ marginTop: spacing.xxl, gap: spacing.sm }}>
            <AppText size={16} weight="bold" tone="ink">
              {rtl ? 'دورات المركز المتاحة' : 'Cours du centre disponibles'}
            </AppText>
            <AppText size={12.5} tone="muted">
              {rtl
                ? 'هذه دورات منشورة لا تظهر في حسابك بعد — اطلب الأستاذ تفعيل وصولك.'
                : "Ces cours sont publiés mais n'apparaissent pas encore dans votre compte — demandez à votre professeur d'activer votre accès."}
            </AppText>
            <Card flush>
              {discoverable.map((course, index) => (
                <View
                  key={course.id}
                  style={[l.row, styles.discoverRow, index > 0 && styles.rowDivider]}
                >
                  <View style={{ flex: 1, gap: 3 }}>
                    <AppText size={14} weight="semibold" tone="ink" numberOfLines={1}>
                      {course.title}
                    </AppText>
                    <AppText size={11.5} tone="muted">
                      {course.subject}
                      {courseDurationSec(course) > 0
                        ? ` · ${formatDuration(courseDurationSec(course))}`
                        : ''}
                    </AppText>
                  </View>
                  <Pill label={rtl ? 'غير مشترك' : 'Non inscrit'} tone="neutral" />
                </View>
              ))}
            </Card>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Flush lesson row: rounded thumbnail (play + duration) + meta. */
function LessonRow({
  first,
  course,
  lesson,
  bookmarked,
  onBookmark,
  onPress,
}: {
  first: boolean;
  course: Course;
  lesson: Lesson;
  bookmarked: boolean;
  onBookmark: () => void;
  onPress: () => void;
}) {
  const { lang } = useI18n();
  const rtl = lang === 'ar';
  const l = useLayout(lang);
  const { state, me } = useStore();
  const posterSource =
    lesson.kind === 'video' ? resolvePoster(lesson.file) : undefined;
  const progress = me ? lessonProgress(state, me.id, lesson.id) : null;
  const teacher = courseTeacher(state, course);
  const meta = lessonMetaText(lesson, lang);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        l.row,
        styles.lessonRow,
        !first && styles.rowDivider,
        pressed && { opacity: 0.75 },
      ]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={
        rtl
          ? `درس ${lesson.title}، الأستاذ ${teacher.name}${meta ? `، ${meta}` : ''}${progress?.completed ? '، مكتمل' : ''}${bookmarked ? '، محفوظ' : ''}`
          : `Leçon ${lesson.title}, professeur ${teacher.name}${meta ? `, ${meta}` : ''}${progress?.completed ? ', terminée' : ''}${bookmarked ? ', enregistrée' : ''}`
      }
      accessibilityHint={rtl ? 'يفتح الدرس' : 'Ouvre la leçon'}
      accessibilityActions={[
        {
          name: 'bookmark',
          label: bookmarked
            ? rtl
              ? 'إزالة من المحفوظات'
              : 'Retirer des favoris'
            : rtl
              ? 'إضافة إلى المحفوظات'
              : 'Ajouter aux favoris',
        },
      ]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'bookmark') onBookmark();
      }}
    >
      <Thumb
        cover={course.cover}
        poster={posterSource}
        width={104}
        height={68}
        radiusValue={radius.sm}
        overlay
      >
        <View style={styles.thumbPlay} pointerEvents="none">
          <LessonGlyph kind={lesson.kind} size={30} />
        </View>
        {meta ? (
          <View style={styles.durationPill}>
            <AppText size={11} weight="bold" tone="white">
              {meta}
            </AppText>
          </View>
        ) : null}
        {progress?.completed ? (
          <View style={styles.doneBadge}>
            <Ionicons name="checkmark" size={11} color={colors.white} />
          </View>
        ) : null}
      </Thumb>

      <View style={{ flex: 1, gap: 3 }}>
        <AppText size={14} weight="semibold" tone="ink" numberOfLines={2}>
          {lesson.title}
        </AppText>
        <AppText size={11.5} tone="muted" numberOfLines={1}>
          {rtl ? 'الشرح بواسطة:' : 'Professeur :'} {teacher.name}
        </AppText>
        <AppText size={11} tone="faint">
          {course.level}
        </AppText>
      </View>

      <IconButton
        icon={bookmarked ? 'bookmark' : 'bookmark-outline'}
        variant="plain"
        size={40}
        onPress={onBookmark}
        label={
          bookmarked
            ? rtl
              ? 'إزالة من المحفوظات'
              : 'Retirer des favoris'
            : rtl
              ? 'إضافة إلى المحفوظات'
              : 'Ajouter aux favoris'
        }
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  header: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  content: { padding: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.xxl * 2, gap: spacing.lg },

  chipRow: { gap: spacing.sm },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },

  chapterHead: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },

  rowDivider: { borderTopWidth: 1, borderTopColor: colors.line },

  lessonRow: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  thumbPlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationPill: {
    position: 'absolute',
    bottom: 5,
    start: 5,
    backgroundColor: colors.scrim,
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  doneBadge: {
    position: 'absolute',
    top: 5,
    end: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },

  discoverRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
