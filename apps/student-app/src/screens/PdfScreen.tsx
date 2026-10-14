/**
 * Document lesson — the teacher's PDF, shown page by page.
 *
 * The pages are rasterised at build time (`npm run media:sync`) and bundled
 * with the app, which keeps the reader deterministic and fully offline.
 */

import React, { useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { allLessons, type Lesson } from '@ostadiplus/shared';

import { AppText, Card, Pill, PrimaryButton } from '../components/ui';
import { resolveLessonMedia } from '../media/lookup';
import { useStore } from '../store/StudentStore';
import { colors, radius, rtl, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

export default function PdfScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'Pdf'>>();
  const { state, progressOf, markCompleted } = useStore();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<number>>(null);
  const [page, setPage] = useState(0);

  const found = React.useMemo(() => {
    for (const course of state.courses) {
      const lesson = allLessons(course).find((l) => l.id === params.lessonId);
      if (lesson) return { course, lesson };
    }
    return null;
  }, [state.courses, params.lessonId]);

  if (!found) return null;

  const media = resolveLessonMedia(found.lesson.file, 'pdf', 0);
  if (media.kind !== 'pages') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.missing}>
          <AppText size={15} tone="muted">
            تعذّر تحميل المستند في هذا الجهاز.
          </AppText>
          <PrimaryButton label="رجوع" variant="soft" onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  const { course, lesson } = found;
  const pages = media.pages;
  const completed = progressOf(lesson.id)?.completed ?? false;
  const lessons = allLessons(course).filter((l) => l.published);
  const next = lessons[lessons.findIndex((l) => l.id === lesson.id) + 1];

  const pageWidth = width - spacing.lg * 2;

  const openNext = () => {
    if (!next) return navigation.goBack();
    if (next.kind === 'video') navigation.replace('Video', { lessonId: next.id });
    else navigation.replace('Pdf', { lessonId: next.id });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={rtl.row}>
          <Ionicons name="chevron-forward" size={22} color={colors.ink} />
          <AppText size={14} weight="semibold" tone="ink">
            رجوع
          </AppText>
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <AppText size={13} weight="bold" tone="ink" numberOfLines={1}>
            {lesson.title}
          </AppText>
          <AppText size={11.5} tone="muted">
            صفحة {page + 1} من {pages.length}
          </AppText>
        </View>
        <View style={{ width: 56 }} />
      </View>

      <FlatList
        ref={listRef}
        data={pages}
        keyExtractor={(item, index) => `${lesson.id}-${index}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={0}
        onMomentumScrollEnd={(event) => {
          const nextIndex = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
          if (nextIndex >= 0 && nextIndex < pages.length) setPage(nextIndex);
        }}
        getItemLayout={(_, index) => ({
          length: pageWidth,
          offset: pageWidth * index,
          index,
        })}
        renderItem={({ item }) => (
          <View style={{ width: pageWidth, paddingHorizontal: spacing.lg }}>
            <Image source={item} style={[styles.page, { width: pageWidth }]} resizeMode="contain" />
          </View>
        )}
        style={{ flex: 1, backgroundColor: colors.surfaceAlt }}
      />

      <View style={styles.footer}>
        <View style={rtl.rowBetween}>
          <Pill label={`${pages.length} صفحات`} tone="neutral" />
          {completed ? <Pill label="مكتمل ✓" tone="success" dot /> : null}
        </View>
        <PrimaryButton
          label={completed ? 'أنهيت هذا المستند ✓' : 'تمت قراءة المستند'}
          variant={completed ? 'outline' : 'primary'}
          onPress={() => {
            markCompleted(lesson.id);
            if (next) openNext();
            else navigation.goBack();
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  topBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  page: {
    height: '100%',
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    marginVertical: spacing.md,
  },
  footer: {
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
});
