/**
 * Sign-in — the prototype's "auth".
 *
 * There is no account system: the demo dataset already contains the students
 * the teacher manages, so the student simply picks their own name (exactly
 * what an invited pupil would see after opening their invite link).
 *
 * This screen is also where a fresh device pulls the teacher's latest data by
 * pasting the sync payload copied from the dashboard.
 *
 * Bilingual: strings from the shared dictionary, layout flips RTL↔LTR.
 */

import React, { useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Card, Pill, PrimaryButton } from '../components/ui';
import { useI18n } from '../i18n/useI18n';
import { useLayout } from '../i18n/layout';
import { useStore } from '../store/StudentStore';
import { colors, familyFor, radius, shadow, spacing } from '../theme';

export default function SignInScreen() {
  const { state, signIn, importPayload, resetDemo } = useStore();
  const { lang, dir, t } = useI18n();
  const l = useLayout(lang);
  const rtl = lang === 'ar';
  const [syncOpen, setSyncOpen] = useState(false);
  const [payload, setPayload] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState(false);

  const students = useMemo(() => {
    return state.students.map((student) => {
      const enrollments = state.enrollments.filter((e) => e.studentId === student.id);
      const active = enrollments.filter((e) => e.status === 'active').length;
      const pending = enrollments.filter((e) => e.status === 'pending').length;
      return { student, active, pending };
    });
  }, [state.students, state.enrollments]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Image source={require('../../assets/logo.png')} style={styles.logo} />
          <AppText size={24} weight="bold" tone="ink">
            OstadiPlus
          </AppText>
          <AppText size={13} tone="muted" style={styles.subtitle}>
            {dir === 'rtl' ? 'تطبيق التلاميذ · مركز الأطلس للدروس' : 'Application élèves · Centre Atlas'}
          </AppText>
        </View>

        <AppText size={17} weight="bold" tone="ink" style={styles.sectionTitle}>
          {dir === 'rtl' ? 'اختر حسابك للدخول' : 'Choisissez votre compte'}
        </AppText>
        <AppText size={14.5} tone="body" style={styles.sectionSub}>
          {dir === 'rtl'
            ? 'اختر اسمك لتظهر لك دوراتك وتقدّمك. تغيير الحساب متاح لاحقاً من «ملفي».'
            : 'Choisissez votre nom pour voir vos cours et votre progression. Le compte peut être changé plus tard depuis « Mon profil ».'}
        </AppText>

        <View style={{ gap: spacing.sm }}>
          {students.map(({ student, active, pending }, index) => {
            const statusText =
              active > 0
                ? dir === 'rtl'
                  ? `، ${active} دورة نشطة`
                  : `, ${active} cours actif${active > 1 ? 's' : ''}`
                : pending > 0
                  ? dir === 'rtl'
                    ? '، بلا وصول نشط'
                    : ', sans accès actif'
                  : dir === 'rtl'
                    ? '، بلا دورة'
                    : ', sans cours';
            return (
              <Pressable
                key={student.id}
                onPress={() => signIn(student.id)}
                style={({ pressed }) => [l.row, styles.studentCard, pressed && { opacity: 0.7 }]}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`${rtl ? 'الدخول كـ' : 'Se connecter en tant que'} ${student.fullName} — ${student.level}${statusText}`}
                accessibilityHint={rtl ? 'يدخل إلى هذا الحساب' : 'Ouvre ce compte'}
              >
                <LinearGradient
                  colors={[colors.brand, colors.brandDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.mono}
                >
                  <AppText size={15} weight="bold" tone="white">
                    {student.monogram}
                  </AppText>
                </LinearGradient>
                <View style={{ flex: 1, gap: 3 }}>
                  <AppText size={15} weight="semibold" tone="ink">
                    {student.fullName}
                  </AppText>
                  <AppText size={12.5} tone="muted">
                    {student.level}
                    {active > 0 || pending > 0 ? statusText : rtl ? ' · بلا دورة' : ' · sans cours'}
                  </AppText>
                </View>
                {active > 0 ? (
                  <Pill label={dir === 'rtl' ? 'جاهز' : 'Prêt'} tone="success" dot />
                ) : pending > 0 ? (
                  <Pill label={dir === 'rtl' ? 'معلّ' : 'En attente'} tone="warning" dot />
                ) : (
                  <Pill label={dir === 'rtl' ? 'بلا دورة' : 'Sans cours'} tone="neutral" />
                )}
                <AppText size={12.5} tone="faint">
                  {dir === 'rtl' ? 'دخول ›' : 'Entrer ›'}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.footer}>
          <Pressable
            onPress={() => setSyncOpen((open) => !open)}
            hitSlop={8}
            style={({ pressed }) => pressed && { opacity: 0.6 }}
            accessibilityRole="button"
            accessibilityState={{ expanded: syncOpen }}
            accessibilityLabel={syncOpen ? t('back') : rtl ? 'مزامنة بيانات الأستاذ' : 'Synchroniser les données du professeur'}
          >
            <AppText size={13.5} weight="semibold" tone="brand">
              {syncOpen ? dir === 'rtl' ? 'إخفاء المزامنة' : 'Masquer la synchronisation' : dir === 'rtl' ? 'مزامنة بيانات الأستاذ؟' : 'Synchroniser les données du professeur ?'}
            </AppText>
          </Pressable>

          {syncOpen ? (
            <Card style={styles.syncCard}>
              <AppText size={13.5} tone="body" style={{ lineHeight: 22 }}>
                {dir === 'rtl'
                  ? 'انسخ «رمز المزامنة» من لوحة الأستاذ (الإعدادات) والصقه هنا لتحصل على نفس الدورات، حتى بعد أن ينشر الأستاذ درساً جديداً.'
                  : 'Copiez le « code de synchronisation » du tableau de bord (paramètres) et collez-le ici pour obtenir les mêmes cours, même après la publication d\'une nouvelle leçon par le professeur.'}
              </AppText>
              <TextInput
                style={[styles.input, l.fieldInput, { fontFamily: familyFor(lang, 'regular') }]}
                multiline
                value={payload}
                onChangeText={(text) => {
                  setPayload(text);
                  setError(null);
                  setImported(false);
                }}
                placeholder="OSTADI1:…"
                placeholderTextColor={colors.faint}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel={rtl ? 'رمز المزامنة' : 'Code de synchronisation'}
                accessibilityHint={
                  rtl
                    ? 'الصق الرمز المنسوخ من لوحة الأستاذ'
                    : "Collez le code copié depuis l'espace enseignant"
                }
              />
              {error ? (
                <AppText
                  size={12.5}
                  weight="semibold"
                  tone="danger"
                  accessibilityLiveRegion="polite"
                  accessibilityRole="alert"
                >
                  {error}
                </AppText>
              ) : null}
              <PrimaryButton
                style={{ marginTop: spacing.sm }}
                label={
                  imported
                    ? dir === 'rtl'
                      ? 'تمت المزامنة ✓'
                      : 'Synchronisé ✓'
                    : busy
                      ? dir === 'rtl'
                        ? 'جارٍ المزامنة…'
                        : 'Synchronisation en cours…'
                      : dir === 'rtl'
                        ? 'لصق ومزامنة'
                        : 'Coller et synchroniser'
                }
                busy={busy}
                disabled={busy || imported}
                onPress={async () => {
                  if (!payload.trim()) {
                    setError(dir === 'rtl' ? 'الصق رمز المزامنة أولاً.' : 'Collez le code de synchronisation d\'abord.');
                    return;
                  }
                  try {
                    setBusy(true);
                    await importPayload(payload);
                    setImported(true);
                    setError(null);
                  } catch {
                    setError(dir === 'rtl' ? 'الرمز غير صالح — تأكد من نسخه كاملاً.' : 'Code invalide — vérifiez qu\'il est copié en entier.');
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </Card>
          ) : null}

          <Pressable
            onPress={() =>
              Alert.alert(
                dir === 'rtl' ? 'إعادة تعيين بيانات العرض' : 'Réinitialiser les données de démo',
                dir === 'rtl'
                  ? 'سيُمسح تقدّمك وتعود بيانات العرض الأصلية. هل تريد المتابعة؟'
                  : 'Votre progression sera effacée et les données de démo restaurées. Voulez-vous continuer ?',
                [
                  { text: dir === 'rtl' ? 'إلغاء' : 'Annuler', style: 'cancel' },
                  {
                    text: dir === 'rtl' ? 'إعادة التعيين' : 'Réinitialiser',
                    style: 'destructive',
                    onPress: resetDemo,
                  },
                ],
              )
            }
            hitSlop={8}
            style={({ pressed }) => ({ marginTop: spacing.lg, opacity: pressed ? 0.6 : 1 })}
            accessibilityRole="button"
            accessibilityLabel={dir === 'rtl' ? 'إعادة تعيين بيانات العرض' : 'Réinitialiser les données de démo'}
          >
            <AppText size={12.5} tone="faint" style={styles.resetLink}>
              {dir === 'rtl' ? 'إعادة تعيين بيانات العرض' : 'Réinitialiser les données de démo'}
            </AppText>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl + spacing.xxl },
  header: { alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xxxl },
  logo: { width: 76, height: 76, borderRadius: 18, marginBottom: spacing.sm },
  subtitle: { textAlign: 'center' as const },
  sectionTitle: { marginBottom: spacing.xs },
  sectionSub: { marginBottom: spacing.md, lineHeight: 22 },
  studentCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.card,
  },
  mono: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    minHeight: 92,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: spacing.md,
    textAlignVertical: 'top',
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.surfaceAlt,
  },
  syncCard: { gap: spacing.md },
  resetLink: { textAlign: 'center' as const },
  footer: { marginTop: spacing.xxxl, alignItems: 'center' },
});
