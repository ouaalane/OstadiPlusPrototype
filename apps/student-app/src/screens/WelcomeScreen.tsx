/**
 * Welcome / auth choice — the app entry screen after onboarding.
 *
 * Top: language switch, logo tile, wordmark, tagline and subject streams.
 * Bottom: title, subtitle, primary «Se connecter», secondary «S'inscrire»,
 * a guest «Continuer en invité» link and the terms footer.
 *
 * Bilingual: strings from the shared dictionary, layout flips RTL↔LTR.
 */

import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, PrimaryButton } from '../components/ui';
import { useI18n } from '../i18n/useI18n';
import { useLayout } from '../i18n/layout';
import { colors, radius, shadow, spacing } from '../theme';

const STREAMS: { fr: string; ar: string }[] = [
  { fr: 'Sciences expérimentales', ar: 'علوم تجريبية' },
  { fr: 'Sciences mathématiques', ar: 'علوم رياضية' },
  { fr: 'Lettres et économie', ar: 'آداب واقتصاد' },
];

export default function WelcomeScreen({
  onLogin,
  onSignup,
  onGuest,
}: {
  onLogin: () => void;
  onSignup: () => void;
  onGuest: () => void;
}) {
  const { lang, dir, setLang } = useI18n();
  const l = useLayout(lang);
  const rtl = dir === 'rtl';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ---- language switch ---- */}
        <View style={[l.rowBetween, styles.topRow]}>
          <View />
          <Pressable
            onPress={() => setLang(lang === 'ar' ? 'fr' : 'ar')}
            hitSlop={8}
            style={({ pressed }) => [styles.langPill, pressed && { opacity: 0.7 }]}
            accessible
            accessibilityRole="button"
            accessibilityLabel={rtl ? 'التبديل إلى الفرنسية' : 'Passer en arabe'}
          >
            <Ionicons name="language-outline" size={15} color={colors.brand} />
            <AppText size={13} weight="semibold" tone="brand">
              {lang === 'ar' ? 'Français' : 'العربية'}
            </AppText>
          </Pressable>
        </View>

        {/* ---- brand hero ---- */}
        <View style={styles.hero}>
          <LinearGradient
            colors={[colors.brand, colors.brandDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoTile}
          >
            <Image source={require('../../assets/logo.png')} style={styles.logo} />
          </LinearGradient>

          <AppText size={27} weight="bold" tone="ink" style={{ textAlign: 'center' }}>
            {rtl ? 'أستاذي بلوس' : 'oustadi plus'}
          </AppText>
          <AppText
            size={11}
            weight="bold"
            tone="faint"
            style={{ textAlign: 'center' }}
          >
            {rtl ? 'الدرس كيكمل' : 'Le cours continue.'}
          </AppText>

          <View style={[l.row, styles.streamRow]}>
            {STREAMS.map((s) => (
              <View key={s.fr} style={styles.streamPill}>
                <AppText size={11.5} weight="medium" tone="brand">
                  {rtl ? s.ar : s.fr}
                </AppText>
              </View>
            ))}
          </View>
        </View>

        {/* ---- copy + actions ---- */}
        <View style={styles.sheet}>
          <AppText size={24} weight="bold" tone="ink" style={{ textAlign: 'center' }}>
            {rtl ? 'مرحباً بك في أستاذي بلوس' : 'Bienvenue sur oustadi plus'}
          </AppText>
          <AppText size={14.5} tone="muted" style={styles.subtitle}>
            {rtl
              ? 'سجّل الدخول لمتابعة دروسك وتحضير البكالوريا.'
              : 'Connectez-vous pour suivre vos cours et préparer le baccalauréat.'}
          </AppText>

          <View style={{ width: '100%', gap: spacing.sm, marginTop: spacing.xl }}>
            <PrimaryButton
              label={rtl ? 'تسجيل الدخول' : 'Se connecter'}
              onPress={onLogin}
              icon={rtl ? 'arrow-back' : 'arrow-forward'}
            />
            <PrimaryButton
              label={rtl ? 'إنشاء حساب' : "S'inscrire"}
              variant="outline"
              onPress={onSignup}
            />
          </View>

          <Pressable
            onPress={onGuest}
            hitSlop={8}
            style={({ pressed }) => ({ marginTop: spacing.xl, opacity: pressed ? 0.6 : 1 })}
            accessible
            accessibilityRole="link"
            accessibilityLabel={rtl ? 'المتابعة كزائر' : 'Continuer en invité'}
          >
            <AppText size={13.5} weight="semibold" tone="brand" style={{ textAlign: 'center' }}>
              {rtl ? 'المتابعة كزائر' : 'Continuer en invité'}
            </AppText>
          </Pressable>

          <View style={[l.row, styles.terms]}>
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.faint} />
            <AppText size={11.5} tone="faint" style={[styles.termsText, { lineHeight: 17 }]}>
              {rtl
                ? 'بإنشائك حساباً فأنت توافق على الشروط والأحكام وسياسة الخصوصية.'
                : "En créant un compte, vous acceptez nos Conditions d'utilisation et notre Politique de confidentialité."}
            </AppText>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { flexGrow: 1, paddingBottom: spacing.xl },
  topRow: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.brandSofter,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  logoTile: {
    width: 88,
    height: 88,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    ...shadow.raised,
  },
  logo: { width: 58, height: 58, borderRadius: 16 },
  streamRow: {
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.sm,
  },
  streamPill: {
    backgroundColor: colors.brandSofter,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  sheet: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  subtitle: { textAlign: 'center', lineHeight: 22 },
  terms: {
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.xl,
  },
  termsText: { textAlign: 'center', flexShrink: 1 },
});
