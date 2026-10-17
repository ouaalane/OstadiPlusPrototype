/**
 * Document lesson — the teacher's PDF, shown page by page (spec Screen 8).
 *
 * The pages are rasterised at build time (`npm run media:sync`) and bundled
 * with the app, which keeps the reader deterministic and fully offline.
 *
 * Bilingual: strings from the shared dictionary, layout flips RTL↔LTR.
 */

import React, { useRef, useState } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { allLessons } from '@ostadiplus/shared';

import { useI18n } from '../i18n/useI18n';
import { useLayout } from '../i18n/layout';
import { AppText, Pill, PrimaryButton, TopBar } from '../components/ui';
import { lessonRoute } from '../lib/lesson';
import { resolveLessonMedia } from '../media/lookup';
import { useStore } from '../store/StudentStore';
import { colors, radius, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

export default function PdfScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'Pdf'>>();
  const { state, progressOf, markCompleted } = useStore();
  const { lang, t } = useI18n();
  const l = useLayout(lang);
  const rtl = lang === 'ar';
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
            {rtl ? 'تعذّر تحميل المستند في هذا الجهاز.' : 'Impossible de charger le document sur cet appareil.'}
          </AppText>
          <PrimaryButton
            label={rtl ? 'رجوع' : 'Retour'}
            variant="soft"
            onPress={() => navigation.goBack()}
          />
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
    navigation.replace(lessonRoute(next.kind), { lessonId: next.id });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBarWrap}>
        <TopBar
          onBack={() => navigation.goBack()}
          backLabel={t('back')}
          title={lesson.title}
          bordered={false}
        />
        <AppText size={11.5} tone="muted" style={styles.pageCaption}>
          {rtl ? `صفحة ${page + 1} من ${pages.length}` : `Page ${page + 1} sur ${pages.length}`}
        </AppText>
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
        <View style={[l.rowBetween]}>
          <Pill label={rtl ? `${pages.length} صفحة` : `${pages.length} pages`} tone="neutral" />
          {completed ? <Pill label={rtl ? 'مكتمل ✓' : 'Terminé ✓'} tone="success" dot /> : null}
        </View>
        <PrimaryButton
          label={
            completed
              ? rtl
                ? 'أنهيت هذا المستند ✓'
                : 'Document terminé ✓'
              : rtl
                ? 'تمت قراءة المستند'
                : 'Document lu'
          }
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
  topBarWrap: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingBottom: spacing.sm,
  },
  pageCaption: { textAlign: 'center', paddingHorizontal: spacing.lg },
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
    backgroundColor: colors.canvas,
  },
});
