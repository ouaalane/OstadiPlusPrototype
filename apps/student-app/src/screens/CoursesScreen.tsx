/**
 * «دوراتي» — every course the student is subscribed to, with its progress and
 * its access status (a course stays visible while the teacher reviews it).
 */

import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { allLessons, courseDurationSec, courseProgress, formatDuration } from '@ostadiplus/shared';

import { AppText, Card, CourseCover, EmptyState, Pill, ProgressBar } from '../components/ui';
import { useStore } from '../store/StudentStore';
import { colors, rtl, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

const STATUS_LABEL = {
  active: { text: 'نشطة', tone: 'success' as const },
  pending: { text: 'بانتظار التفعيل', tone: 'warning' as const },
  suspended: { text: 'وصول موقوف', tone: 'danger' as const },
  none: { text: 'غير مشترك', tone: 'neutral' as const },
};

export default function CoursesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { state, me, myCourses, statusOf } = useStore();

  /* Courses the teacher publishes but this student is not enrolled in yet. */
  const discoverable = useMemo(
    () => state.courses.filter((c) => c.status === 'published' && statusOf(c.id) === 'none'),
    [state.courses, statusOf],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText size={22} weight="bold" tone="ink">
          دوراتي
        </AppText>
        <AppText size={13} tone="muted" style={{ marginBottom: spacing.lg }}>
          {myCourses.length > 0
            ? `${myCourses.length} دورة في حسابك`
            : 'لم يُفعّل وصولك إلى أي دورة بعد'}
        </AppText>

        {myCourses.length === 0 ? (
          <EmptyState
            title="لا دورات في حسابك"
            description="دورات المركز تُفعَّل من طرف الأستاذ بعد التسجيل. إذا سجّلت مؤخراً، انتظر تفعيل الوصول ثم أعد فتح التطبيق."
          />
        ) : (
          <View style={{ gap: spacing.md }}>
            {myCourses.map((course) => {
              const progress = me ? courseProgress(state, me.id, course) : null;
              const status = statusOf(course.id);
              const meta = STATUS_LABEL[status];
              const minutes = Math.round(courseDurationSec(course) / 60);
              return (
                <Pressable
                  key={course.id}
                  onPress={() => navigation.navigate('CourseDetail', { courseId: course.id })}
                >
                  <Card style={{ padding: 0, overflow: 'hidden' }}>
                    <CourseCover cover={course.cover} subject={course.subject} height={88}>
                      <View style={rtl.rowBetween}>
                        <Pill label={meta.text} tone={meta.tone} dot />
                        <AppText size={11.5} tone="white" style={{ opacity: 0.9 }}>
                          {allLessons(course).length} درس · {minutes} دقيقة
                        </AppText>
                      </View>
                    </CourseCover>
                    <View style={{ padding: spacing.md, gap: 7 }}>
                      <AppText size={15.5} weight="bold" tone="ink">
                        {course.title}
                      </AppText>
                      <AppText size={12} tone="muted">
                        {course.level}
                      </AppText>
                      {progress ? (
                        <>
                          <ProgressBar value={progress.percent} />
                          <AppText size={11.5} tone="muted">
                            {progress.percent}% · {progress.completed}/{progress.total} دروس
                          </AppText>
                        </>
                      ) : null}
                    </View>
                  </Card>
                </Pressable>
              );
            })}
          </View>
        )}

        {discoverable.length > 0 ? (
          <>
            <AppText size={16} weight="bold" tone="ink" style={{ marginTop: spacing.xxl }}>
              دورات المركز المتاحة
            </AppText>
            <AppText size={12.5} tone="muted" style={{ marginBottom: spacing.md }}>
              هذه دورات منشورة لا تظهر في حسابك بعد — اطلب الأستاذ تفعيل وصولك.
            </AppText>
            <View style={{ gap: spacing.sm }}>
              {discoverable.map((course) => (
                <Card key={course.id} style={rtl.rowBetween}>
                  <View style={{ flex: 1, gap: 3 }}>
                    <AppText size={14} weight="semibold" tone="ink" numberOfLines={1}>
                      {course.title}
                    </AppText>
                    <AppText size={11.5} tone="muted">
                      {course.subject} · {formatDuration(courseDurationSec(course))}
                    </AppText>
                  </View>
                  <Pill label="غير مشترك" tone="neutral" />
                </Card>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
});
