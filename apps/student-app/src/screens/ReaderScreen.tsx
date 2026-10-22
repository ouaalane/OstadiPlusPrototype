/**
 * Text lesson — the teacher's written lesson (notes, summaries, exercises).
 *
 * The body is markdown-lite (`**bold**`, `*italic*`, `- ` lists, `> ` quotes)
 * rendered inline, and a single button marks the lesson complete.
 *
 * Bilingual: strings flip with the active language, layout flips RTL↔LTR.
 */

import React, { useMemo } from 'react';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { allLessons } from '@ostadiplus/shared';

import { useI18n } from '../i18n/useI18n';
import { useLayout } from '../i18n/layout';
import { AppText, Card, Pill, PrimaryButton, TopBar } from '../components/ui';
import { useStore } from '../store/StudentStore';
import LessonUnavailable from '../components/LessonUnavailable';
import { colors, radius, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

export default function ReaderScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'Reader'>>();
  const { state, markCompleted, progressOf, canAccessLesson } = useStore();
  const { lang, dir, t } = useI18n();
  const l = useLayout(lang);
  const rtl = dir === 'rtl';

  const found = useMemo(() => {
    for (const course of state.courses) {
      const lesson = allLessons(course).find((x) => x.id === params.lessonId);
      if (lesson) return { course, lesson };
    }
    return null;
  }, [state.courses, params.lessonId]);

  if (!found || !canAccessLesson(params.lessonId)) return <LessonUnavailable />;
  const { lesson } = found;
  const completed = progressOf(lesson.id)?.completed ?? false;
  const lines = (lesson.body ?? '').split('\n');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* ---- top bar ---- */}
      <TopBar
        onBack={() => navigation.goBack()}
        backLabel={t('back')}
        title={lesson.title}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {completed ? (
          <View style={{ marginBottom: spacing.md }}>
            <Pill label={rtl ? 'مكتمل ✓' : 'terminé ✓'} tone="success" dot />
          </View>
        ) : null}

        <Card>
          {lines.map((raw, index) => {
            const line = raw.trim();
            if (!line) return <View key={index} style={{ height: spacing.sm }} />;
            if (line.startsWith('- ')) {
              return (
                <View key={index} style={[l.rowTop, styles.bulletRow]}>
                  <View style={styles.bulletDot} />
                  <AppText size={15} tone="body" style={styles.bodyText}>
                    {renderInline(line.slice(2))}
                  </AppText>
                </View>
              );
            }
            if (line.startsWith('> ')) {
              return (
                <View key={index} style={styles.quote}>
                  <AppText size={14.5} tone="muted">
                    {renderInline(line.slice(2))}
                  </AppText>
                </View>
              );
            }
            return (
              <AppText key={index} size={15} tone="body" style={styles.bodyText}>
                {renderInline(line)}
              </AppText>
            );
          })}
          {!lesson.body?.trim() ? (
            <AppText size={14} tone="muted">
              {rtl ? 'لا يوجد نص في هذا الدرس.' : 'Aucun texte dans cette leçon.'}
            </AppText>
          ) : null}
        </Card>

        <PrimaryButton
          label={completed ? (rtl ? 'إنهاء الدرس' : 'Terminer la leçon') : rtl ? 'قرأت الدرس — تم ✓' : 'Lu — terminé ✓'}
          variant={completed ? 'soft' : 'primary'}
          onPress={() => {
            markCompleted(lesson.id);
            navigation.goBack();
          }}
          style={{ marginTop: spacing.lg }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

/** Renders **bold** and *italic* spans inside one paragraph. */
function renderInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <AppText key={index} size={15} weight="bold" tone="ink" style={{ writingDirection: 'auto' }}>
          {part.slice(2, -2)}
        </AppText>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <AppText key={index} size={15} tone="body" style={{ fontStyle: 'italic' }}>
          {part.slice(1, -1)}
        </AppText>
      );
    }
    return (
      <AppText key={index} size={15} tone="body">
        {part}
      </AppText>
    );
  });
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  bodyText: { lineHeight: 26, marginBottom: 4 },
  bulletRow: { alignItems: 'flex-start', gap: spacing.sm, marginBottom: 4 },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.brand,
    marginTop: 10,
  },
  quote: {
    borderStartWidth: 3,
    borderStartColor: colors.brand,
    backgroundColor: colors.brandSofter,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
});
