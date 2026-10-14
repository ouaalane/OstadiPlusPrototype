/**
 * Home — one obvious next action («تابع التعلّم»), then the student's courses
 * and the newest announcements.
 */

import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  allLessons,
  continueLearning,
  courseProgress,
  formatDuration,
  relativeTime,
} from '@ostadiplus/shared';

import { AppText, Card, CourseCover, EmptyState, Pill, PrimaryButton, ProgressBar } from '../components/ui';
import { useStore } from '../store/StudentStore';
import { colors, radius, rtl, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { state, me, myCourses } = useStore();

  const continueItem = useMemo(
    () => (me ? continueLearning(state, me.id) : null),
    [state, me],
  );

  const announcements = state.announcements
    .filter((a) => !a.courseId || myCourses.some((c) => c.id === a.courseId))
    .slice(0, 2);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.greeting}>
          <AppText size={22} weight="bold" tone="ink">
            أهلاً {me?.fullName ?? ''}
          </AppText>
          <AppText size={13} tone="muted">
            {me?.level} · مركز الأطلس للدروس
          </AppText>
        </View>

        {continueItem ? (
          <Pressable
            onPress={() =>
              navigation.navigate('CourseDetail', { courseId: continueItem.course.id })
            }
          >
            <View style={styles.continueCard}>
              <View style={rtl.rowBetween}>
                <Pill label="تابع التعلّم" tone="brand" dot />
                <AppText size={12} tone="white" style={{ opacity: 0.85 }}>
                  {continueItem.percent}% مكتمل
                </AppText>
              </View>
              <AppText size={17} weight="bold" tone="white" style={{ marginTop: spacing.sm }}>
                {continueItem.lesson.title}
              </AppText>
              <AppText size={12.5} tone="white" style={{ opacity: 0.85 }}>
                {continueItem.course.title}
              </AppText>
              <View style={{ marginTop: spacing.md }}>
                <ProgressBar value={continueItem.percent} tone="success" />
              </View>
              <View style={[rtl.row, { marginTop: spacing.md, justifyContent: 'space-between' }]}>
                <PrimaryButton
                  label={
                    continueItem.positionSec > 5 ? 'متابعة الفيديو ↗' : 'ابدأ الدرس ↗'
                  }
                  variant="soft"
                  compact
                  onPress={() =>
                    navigation.navigate('Video', { lessonId: continueItem.lesson.id })
                  }
                />
                <AppText size={11.5} tone="white" style={{ opacity: 0.8 }}>
                  {formatDuration(continueItem.lesson.durationSec)}
                </AppText>
              </View>
            </View>
          </Pressable>
        ) : (
          <EmptyState
            title="لا توجد دروس نشطة بعد"
            description={
              me && myCourses.length === 0
                ? 'حسابك مسجّل لدى الأستاذ، وستظهر دوراتك هنا فور تفعيل الوصول.'
                : 'اختر دورتك الأولى من تبويب «دوراتي» لتبدأ.'
            }
            action={
              <PrimaryButton
                label="تصفح دوراتي"
                variant="soft"
                onPress={() => navigation.navigate('Tabs', { screen: 'Courses' })}
              />
            }
          />
        )}

        <View style={rtl.rowBetween}>
          <AppText size={16} weight="bold" tone="ink">
            دوراتي
          </AppText>
          <Pressable onPress={() => navigation.navigate('Tabs', { screen: 'Courses' })} hitSlop={8}>
            <AppText size={13} weight="semibold" tone="brand">
              عرض الكل
            </AppText>
          </Pressable>
        </View>

        {myCourses.length === 0 ? (
          <AppText size={13} tone="muted" style={{ marginTop: spacing.sm }}>
            لا دورات مفعّلة في حسابك حالياً.
          </AppText>
        ) : (
          <View style={{ gap: spacing.md, marginTop: spacing.md }}>
            {myCourses.slice(0, 3).map((course) => {
              const progress = me ? courseProgress(state, me.id, course) : null;
              return (
                <Pressable
                  key={course.id}
                  onPress={() => navigation.navigate('CourseDetail', { courseId: course.id })}
                >
                  <Card style={{ padding: 0, overflow: 'hidden' }}>
                    <CourseCover cover={course.cover} subject={course.subject} height={84}>
                      <View style={rtl.rowBetween}>
                        <Pill label="منشورة" tone="success" dot />
                        <AppText size={11.5} tone="white" style={{ opacity: 0.9 }}>
                          {allLessons(course).length} درس
                        </AppText>
                      </View>
                    </CourseCover>
                    <View style={{ padding: spacing.md, gap: 6 }}>
                      <AppText size={15} weight="bold" tone="ink" numberOfLines={1}>
                        {course.title}
                      </AppText>
                      {progress ? (
                        <>
                          <ProgressBar value={progress.percent} />
                          <AppText size={11.5} tone="muted">
                            {progress.completed} من {progress.total} دروس مكتملة
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

        <View style={[rtl.rowBetween, { marginTop: spacing.xxl }]}>
          <AppText size={16} weight="bold" tone="ink">
            آخر إعلانات
          </AppText>
          <Pressable
            onPress={() => navigation.navigate('Tabs', { screen: 'Announcements' })}
            hitSlop={8}
          >
            <AppText size={13} weight="semibold" tone="brand">
              عرض الكل
            </AppText>
          </Pressable>
        </View>

        {announcements.length === 0 ? (
          <AppText size={13} tone="muted" style={{ marginTop: spacing.sm }}>
            لا إعلانات حالياً.
          </AppText>
        ) : (
          <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
            {announcements.map((item) => (
              <Card key={item.id} style={{ gap: 6 }}>
                <View style={rtl.rowBetween}>
                  <AppText size={14.5} weight="bold" tone="ink" style={{ flex: 1 }}>
                    {item.title}
                  </AppText>
                  <AppText size={11} tone="faint">
                    {relativeTime(item.publishedAt)}
                  </AppText>
                </View>
                <AppText size={13} tone="body" numberOfLines={2} style={{ lineHeight: 20 }}>
                  {item.body}
                </AppText>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  greeting: { marginBottom: spacing.lg, gap: 4 },
  continueCard: {
    backgroundColor: colors.brand,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
});
