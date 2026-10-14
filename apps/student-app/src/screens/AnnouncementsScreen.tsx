/**
 * Announcements — everything the teacher published, newest first.
 */

import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { relativeTime } from '@ostadiplus/shared';

import { AppText, Card, EmptyState, Pill } from '../components/ui';
import { useStore } from '../store/StudentStore';
import { colors, radius, rtl, spacing } from '../theme';

export default function AnnouncementsScreen() {
  const { state, myCourses } = useStore();

  const items = state.announcements.filter(
    (a) => !a.courseId || myCourses.some((c) => c.id === a.courseId),
  );

  const labelFor = (courseId: string | null) =>
    courseId ? state.courses.find((c) => c.id === courseId)?.title ?? 'دورة' : 'جميع التلاميذ';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText size={22} weight="bold" tone="ink">
          الإعلانات
        </AppText>
        <AppText size={13} tone="muted" style={{ marginBottom: spacing.lg }}>
          من الأستاذ مباشرة
        </AppText>

        {items.length === 0 ? (
          <EmptyState
            title="لا إعلانات"
            description="حين ينشر الأستاذ إعلاناً (موعد حصة، واجب، تسجيل جديد) سيظهر هنا فوراً."
          />
        ) : (
          <View style={{ gap: spacing.md }}>
            {items.map((item) => (
              <Card key={item.id} style={{ gap: spacing.sm }}>
                <View style={rtl.rowBetween}>
                  <View style={[rtl.row, { flex: 1, gap: spacing.sm }]}>
                    <View style={styles.icon}>
                      <Ionicons name="megaphone" size={15} color={colors.brandDark} />
                    </View>
                    <AppText size={15} weight="bold" tone="ink" style={{ flex: 1 }}>
                      {item.title}
                    </AppText>
                  </View>
                </View>

                <AppText size={13.5} tone="body" style={{ lineHeight: 22 }}>
                  {item.body}
                </AppText>

                <View style={rtl.rowBetween}>
                  <Pill label={labelFor(item.courseId)} tone="info" />
                  <AppText size={11.5} tone="faint">
                    {relativeTime(item.publishedAt)}
                  </AppText>
                </View>
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
  icon: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
