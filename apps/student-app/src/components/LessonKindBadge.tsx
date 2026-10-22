import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LessonKind } from '@ostadiplus/shared';
import { useI18n } from '../i18n/useI18n';
import { useLayout } from '../i18n/layout';
import { LESSON_ICONS, lessonKindLabel, lessonTint } from '../lib/lesson';
import { colors, radius } from '../theme';
import { AppText } from './ui';

/** Same type vocabulary in the resume hero and every curriculum row. */
export default function LessonKindBadge({ kind, disabled = false }: { kind: LessonKind; disabled?: boolean }) {
  const { lang } = useI18n();
  const l = useLayout(lang);
  const tint = lessonTint(kind);
  const quiz = kind === 'quiz';
  return (
    <View
      testID={`lesson-kind-${kind}`}
      style={[
        styles.badge,
        l.row,
        { backgroundColor: quiz ? colors.brand : tint.soft, opacity: disabled ? 0.55 : 1 },
      ]}
    >
      <Ionicons name={LESSON_ICONS[kind]} size={12} color={quiz ? colors.white : tint.dark} importantForAccessibility="no" />
      <AppText size={11} weight="bold" style={{ color: quiz ? colors.white : tint.dark }}>
        {lessonKindLabel(kind, lang)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: radius.pill },
});
