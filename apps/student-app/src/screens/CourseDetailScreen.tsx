/**
 * Course detail — chapters → lessons, with the access banner that explains
 * why a lesson cannot be opened (pending / suspended / unpublished).
 */

import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import {
  allLessons,
  courseDurationSec,
  courseProgress,
  formatDuration,
  type Lesson,
} from '@ostadiplus/shared';

import { AppText, Card, CourseCover, Pill, PrimaryButton, ProgressBar } from '../components/ui';
import { useStore } from '../store/StudentStore';
import { colors, radius, rtl, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

export default function CourseDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'CourseDetail'>>();
  const { state, me, statusOf, progressOf } = useStore();

  const course = state.courses.find((c) => c.id === params.courseId);

  const chapters = useMemo(
    () =>
      course
        ? course.chapters.map((chapter) => ({
            ...chapter,
            lessons: chapter.lessons.filter((l) => l.published),
          }))
        : [],
    [course],
  );

  if (!course) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.content}>
          <AppText size={15} tone="muted">
            هذه الدورة لم تعد متاحة.
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  const status = statusOf(course.id);
  const accessible = status === 'active' && course.status === 'published';
  const progress = me ? courseProgress(state, me.id, course) : null;
  const minutes = Math.round(courseDurationSec(course) / 60);
  const publishedCount = allLessons(course).filter((l) => l.published).length;

  const openLesson = (lesson: Lesson) => {
    if (!accessible) return;
    navigation.navigate(lesson.kind === 'video' ? 'Video' : 'Pdf', { lessonId: lesson.id });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <CourseCover cover={course.cover} subject={course.subject} height={132}>
          <AppText size={19} weight="bold" tone="white">
            {course.title}
          </AppText>
        </CourseCover>

        <View style={[rtl.row, { marginTop: spacing.md, gap: spacing.sm }]}>
          <Pill
            label={accessible ? 'متاحة لك' : status === 'pending' ? 'بانتظار التفعيل' : 'وصول موقوف'}
            tone={accessible ? 'success' : status === 'pending' ? 'warning' : 'danger'}
            dot
          />
          <AppText size={12} tone="muted">
            {publishedCount} درس · {minutes} دقيقة
          </AppText>
        </View>

        <AppText size={13} tone="body" style={{ marginTop: spacing.sm, lineHeight: 21 }}>
          {course.summary}
        </AppText>

        {progress ? (
          <Card style={{ marginTop: spacing.lg, gap: spacing.sm }}>
            <View style={rtl.rowBetween}>
              <AppText size={13.5} weight="semibold" tone="ink">
                تقدّمك
              </AppText>
              <AppText size={13} weight="bold" tone="brand">
                {progress.percent}%
              </AppText>
            </View>
            <ProgressBar value={progress.percent} />
            <AppText size={11.5} tone="muted">
              {progress.completed} من {progress.total} دروس مكتملة
            </AppText>
          </Card>
        ) : null}

        {!accessible ? (
          <Card style={[styles.notice, { marginTop: spacing.lg }]}>
            <AppText size={14} weight="bold" tone={status === 'pending' ? 'ink' : 'danger'}>
              {status === 'pending' ? 'الوصول قيد المراجعة' : 'الوصول موقوف'}
            </AppText>
            <AppText size={12.5} tone="muted" style={{ lineHeight: 20 }}>
              {status === 'pending'
                ? 'سجّلت في هذه الدورة، ويفعّل الأستاذ وصولك من لوحة التحكم. بمجرد التفعيل تظهر لك الدروس مباشرة.'
                : 'أوقف الأستاذ وصولك إلى هذه الدورة. تواصل مع المركز لاستعادة الوصول.'}
            </AppText>
          </Card>
        ) : null}

        <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
          {chapters.map((chapter, ci) => (
            <Card key={chapter.id} style={{ padding: 0, overflow: 'hidden' }}>
              <View style={styles.chapterHeader}>
                <View style={styles.chapterIndex}>
                  <AppText size={12} weight="bold" tone="brand">
                    {ci + 1}
                  </AppText>
                </View>
                <AppText size={14.5} weight="bold" tone="ink" style={{ flex: 1 }}>
                  {chapter.title}
                </AppText>
                <AppText size={11.5} tone="muted">
                  {chapter.lessons.length} دروس
                </AppText>
              </View>

              {chapter.lessons.length === 0 ? (
                <AppText size={12.5} tone="muted" style={{ padding: spacing.lg }}>
                  لا دروس في هذا الفصل بعد.
                </AppText>
              ) : (
                chapter.lessons.map((lesson, li) => {
                  const p = progressOf(lesson.id);
                  return (
                    <Pressable
                      key={lesson.id}
                      onPress={() => openLesson(lesson)}
                      disabled={!accessible}
                      style={({ pressed }) => [styles.lessonRow, pressed && accessible && { backgroundColor: colors.brandSofter }]}
                    >
                      <View
                        style={[
                          styles.lessonIcon,
                          {
                            backgroundColor:
                              lesson.kind === 'video' ? colors.brandSoft : colors.dangerSoft,
                          },
                        ]}
                      >
                        <Ionicons
                          name={lesson.kind === 'video' ? 'play' : 'document-text'}
                          size={15}
                          color={lesson.kind === 'video' ? colors.brandDark : colors.danger}
                        />
                      </View>

                      <View style={{ flex: 1, gap: 3 }}>
                        <AppText size={14} weight="semibold" tone={accessible ? 'ink' : 'faint'}>
                          {li + 1}. {lesson.title}
                        </AppText>
                        <AppText size={11.5} tone="muted">
                          {lesson.kind === 'video'
                            ? formatDuration(lesson.durationSec)
                            : `${lesson.pages} صفحات`}
                          {p?.completed ? ' · مكتمل ✓' : p && p.positionSec > 5 ? ' · قيد المشاهدة' : ''}
                        </AppText>
                      </View>

                      {p?.completed ? (
                        <Pill label="✓" tone="success" />
                      ) : (
                        <Ionicons
                          name="chevron-back"
                          size={18}
                          color={accessible ? colors.faint : colors.lineStrong}
                        />
                      )}
                    </Pressable>
                  );
                })
              )}
            </Card>
          ))}
        </View>

        {!accessible && status === 'pending' ? (
          <PrimaryButton
            label="تحديث حالة الوصول"
            variant="outline"
            style={{ marginTop: spacing.lg }}
            onPress={() => navigation.goBack()}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  chapterHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.surfaceAlt,
  },
  chapterIndex: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  lessonIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notice: { gap: 6 },
});
