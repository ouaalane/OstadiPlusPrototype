import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { Student } from '@ostadiplus/shared';

import BrandWordmark from './BrandWordmark';
import StudentQr from './StudentQr';
import { AppText, Card, PrimaryButton } from './ui';
import { useI18n } from '../i18n/useI18n';
import { colors, radius, spacing } from '../theme';

export default function PendingEnrollment({ student, onShowCard }: {
  student: Student;
  onShowCard: () => void;
}) {
  const { lang } = useI18n();
  const rtl = lang === 'ar';
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <BrandWordmark size={30} lang={lang} />
        <View style={styles.intro}>
          <AppText size={23} weight="bold" style={styles.center}>
            {rtl ? `مرحباً ${student.fullName} 👋` : `Bienvenue ${student.fullName} 👋`}
          </AppText>
          <AppText size={14.5} tone="muted" style={styles.center}>
            {rtl
              ? 'توجّه إلى مركزك وأظهر هذا الرمز للإدارة لتفعيل دروسك.'
              : 'Rendez-vous à votre centre et présentez ce code à l’accueil pour activer vos cours.'}
          </AppText>
        </View>
        <Card style={styles.card}>
          <Ionicons name="qr-code-outline" size={24} color={colors.brand} />
          <AppText size={16} weight="bold">{rtl ? 'رمزك الشخصي' : 'Votre code personnel'}</AppText>
          <View style={styles.qr}><StudentQr code={student.studentCode} cellSize={8} /></View>
          <AppText size={17} weight="bold" lang="fr">{student.studentCode}</AppText>
          <AppText size={13} tone="muted" style={styles.center}>
            {rtl ? 'دروسك غادي تبان هنا من بعد التفعيل.' : 'Vos cours apparaîtront ici après activation.'}
          </AppText>
          <PrimaryButton label={rtl ? 'عرض بطاقتي' : 'Afficher ma carte'} variant="soft" onPress={onShowCard} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.xl },
  intro: { gap: spacing.sm, maxWidth: 440 },
  center: { textAlign: 'center' },
  card: { width: '100%', maxWidth: 440, alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  qr: { backgroundColor: colors.white, padding: spacing.md, borderRadius: radius.md },
});
