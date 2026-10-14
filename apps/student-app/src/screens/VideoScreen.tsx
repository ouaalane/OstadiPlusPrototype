/**
 * Video lesson — bundled MP4 playback (expo-video) with resume position,
 * automatic progress saving and a «next lesson» hand-off.
 *
 * The demo videos ship inside the app bundle, so the screen works offline.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';

import { allLessons, formatDuration, type Lesson } from '@ostadiplus/shared';

import { AppText, Card, Pill, PrimaryButton } from '../components/ui';
import { resolveLessonMedia } from '../media/lookup';
import { useStore } from '../store/StudentStore';
import { colors, radius, rtl, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

export default function VideoScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'Video'>>();
  const { state, progressOf, saveProgress, markCompleted } = useStore();

  const found = useMemo(() => {
    for (const course of state.courses) {
      const lesson = allLessons(course).find((l) => l.id === params.lessonId);
      if (lesson) return { course, lesson };
    }
    return null;
  }, [state.courses, params.lessonId]);

  const saved = progressOf(params.lessonId);
  const resumeAt = useRef(saved?.positionSec ?? 0);

  const media = found
    ? resolveLessonMedia(found.lesson.file, found.lesson.kind, found.lesson.durationSec)
    : { kind: 'missing' as const };

  const player = useVideoPlayer(
    media.kind === 'video' ? media.source : null,
    (p) => {
      p.timeUpdateEventInterval = 1;
      if (resumeAt.current > 3) p.currentTime = resumeAt.current;
      p.play();
    },
  );

  useEffect(() => {
    const timeSub = player.addListener('timeUpdate', (payload) => {
      const position = payload?.currentTime ?? 0;
      if (position > 1) saveProgress(params.lessonId, Math.floor(position));
    });
    const endSub = player.addListener('playToEnd', () => {
      markCompleted(params.lessonId);
    });
    return () => {
      timeSub.remove();
      endSub.remove();
    };
  }, [player, params.lessonId, saveProgress, markCompleted]);

  if (!found || media.kind !== 'video') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.missing}>
          <AppText size={15} tone="muted">
            تعذّر تحميل الفيديو في هذا الجهاز.
          </AppText>
          <PrimaryButton label="رجوع" variant="soft" onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  const { course, lesson } = found;
  const lessons = allLessons(course).filter((l) => l.published);
  const index = lessons.findIndex((l) => l.id === lesson.id);
  const next = lessons[index + 1];
  const completed = progressOf(lesson.id)?.completed ?? false;

  const openLesson = (target: Lesson) => {
    if (target.kind === 'video') {
      navigation.replace('Video', { lessonId: target.id });
    } else {
      navigation.replace('Pdf', { lessonId: target.id });
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={rtl.row}>
          <Ionicons name="chevron-forward" size={22} color={colors.white} />
          <AppText size={14} weight="semibold" tone="white">
            رجوع
          </AppText>
        </Pressable>
        <AppText size={12.5} tone="white" style={{ opacity: 0.8 }} numberOfLines={1}>
          {course.title}
        </AppText>
      </View>

      <VideoView
        player={player}
        style={styles.video}
        contentFit="contain"
        nativeControls
        allowsFullscreen
      />

      <ScrollView contentContainerStyle={styles.body}>
        <View style={rtl.rowBetween}>
          <AppText size={18} weight="bold" tone="ink" style={{ flex: 1 }}>
            {lesson.title}
          </AppText>
          {completed ? <Pill label="مكتمل ✓" tone="success" dot /> : null}
        </View>

        <AppText size={12.5} tone="muted" style={{ marginTop: 4 }}>
          درس {index + 1} من {lessons.length} · {formatDuration(lesson.durationSec)}
          {resumeAt.current > 5 && !completed
            ? ` · توقفت عند ${formatDuration(resumeAt.current)}`
            : ''}
        </AppText>

        <Card style={{ marginTop: spacing.lg, gap: spacing.md }}>
          <PrimaryButton
            label={completed ? 'إعادة تعليم الدرس كمكتمل' : 'تعليم الدرس كمكتمل'}
            variant={completed ? 'outline' : 'primary'}
            onPress={() => {
              markCompleted(lesson.id);
              if (next) openLesson(next);
              else navigation.goBack();
            }}
          />
          {next ? (
            <PrimaryButton
              label={`الدرس التالي: ${next.title}`}
              variant="soft"
              compact
              onPress={() => openLesson(next)}
            />
          ) : (
            <AppText size={12.5} tone="muted" style={{ textAlign: 'center' }}>
              هذا آخر درس في الدورة — أحسنت!
            </AppText>
          )}
        </Card>

        <AppText size={11.5} tone="faint" style={{ marginTop: spacing.lg, lineHeight: 18 }}>
          يُحفظ موضع توقفك تلقائياً، وستجد المكان نفسه حين تعود إلى الدرس.
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink },
  topBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.black,
  },
  body: {
    flex: 1,
    backgroundColor: colors.canvas,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
});
