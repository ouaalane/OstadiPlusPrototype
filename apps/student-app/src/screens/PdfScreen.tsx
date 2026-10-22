/**
 * Document lesson — the teacher's PDF, shown page by page (spec Screen 8).
 *
 * The pages are rasterised at build time (`npm run media:sync`) and bundled
 * with the app, which keeps the reader deterministic and fully offline.
 *
 * Bilingual: strings from the shared dictionary, layout flips RTL↔LTR.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { allLessons } from '@ostadiplus/shared';

import { useI18n } from '../i18n/useI18n';
import { useLayout } from '../i18n/layout';
import { AppText, Pill, PrimaryButton, TopBar } from '../components/ui';
import VideoWatermark from '../components/VideoWatermark';
import { localFallbackCode } from '../lib/watermark';
import { requestDocumentGrant, WATERMARK_ALLOW_OFFLINE_FALLBACK, type PlaybackGrant } from '../lib/watermark-api';
import { lessonRoute } from '../lib/lesson';
import { resolveLessonMedia } from '../media/lookup';
import { useStore } from '../store/StudentStore';
import { colors, radius, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

export default function PdfScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'Pdf'>>();
  const { state, me, progressOf, markCompleted } = useStore();
  const focused = useIsFocused();
  const { lang, t } = useI18n();
  const l = useLayout(lang);
  const rtl = lang === 'ar';
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<number>>(null);
  const [page, setPage] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  const found = React.useMemo(() => {
    for (const course of state.courses) {
      const lesson = allLessons(course).find((l) => l.id === params.lessonId);
      if (lesson) return { course, lesson };
    }
    return null;
  }, [state.courses, params.lessonId]);

  const studentId = me?.id ?? '';
  const courseId = found?.course.id ?? '';
  const documentId = found?.lesson.id ?? '';
  const sessionKey = studentId && found?.lesson.kind === 'pdf'
    ? JSON.stringify([studentId, courseId, documentId])
    : '';
  // The standalone demo already permits unregistered offline codes. Show one
  // immediately while requesting the traceable server-issued document code.
  const provisionalCode = useMemo(
    () => sessionKey && WATERMARK_ALLOW_OFFLINE_FALLBACK ? localFallbackCode() : '',
    [sessionKey],
  );
  const [issued, setIssued] = useState<{ key: string; grant: PlaybackGrant } | null>(null);
  useEffect(() => {
    if (!sessionKey) return;
    let cancelled = false;
    void requestDocumentGrant({ studentId, courseId, documentId })
      .then((grant) => {
        if (!cancelled) {
          setIssued({
            key: sessionKey,
            grant: grant.source === 'offline' && provisionalCode
              ? { ...grant, code: provisionalCode }
              : grant,
          });
        }
      })
      .catch((error) => console.log(`[watermark] no document grant issued: ${String(error)}`));
    return () => { cancelled = true; };
  }, [sessionKey, studentId, courseId, documentId, provisionalCode]);
  const watermarkCode = issued?.key === sessionKey ? issued.grant.code : provisionalCode;

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

      <View
        style={styles.documentViewport}
        onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
      >
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
            <View style={{ width: pageWidth, height: viewportHeight, paddingHorizontal: spacing.lg }}>
              <Image
                source={item}
                style={[styles.page, { width: pageWidth, height: Math.max(0, viewportHeight - spacing.md * 2) }]}
                resizeMode="contain"
              />
            </View>
          )}
          style={{ flex: 1, backgroundColor: colors.surfaceAlt }}
        />
        <VideoWatermark code={watermarkCode} playing={focused} appearance="document" />
      </View>

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
  documentViewport: { flex: 1, backgroundColor: colors.surfaceAlt },
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
