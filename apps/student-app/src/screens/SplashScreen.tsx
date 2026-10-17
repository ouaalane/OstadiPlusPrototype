/**
 * Brand splash — the Stitch splash (spec Screen 1): full-screen gradient,
 * white logo tile, wordmark «أوستادي بلس» / Ustadi Plus, a loading caption
 * and a thin white progress line. Held onscreen by App.tsx while fonts load
 * and the stored dataset is read.
 *
 * Bilingual app name from the shared dictionary.
 */

import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Eyebrow } from '../components/ui';
import { useI18n } from '../i18n/useI18n';
import { useLayout } from '../i18n/layout';
import { colors, shadow, spacing } from '../theme';

export default function SplashScreen() {
  const { lang } = useI18n();
  const rtl = lang === 'ar';
  const l = useLayout(lang);

  return (
    <LinearGradient
      colors={[colors.brand, colors.brandDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.root}
    >
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <View style={styles.logoTile}>
            <Image source={require('../../assets/logo.png')} style={styles.logo} />
          </View>
          <AppText size={28} weight="bold" tone="white" style={[l.text, styles.wordmark]}>
            Ustadi Plus
          </AppText>
          <Eyebrow tone="white" style={styles.caption}>
            OSTADI PLUS
          </Eyebrow>
        </View>

        <View style={styles.footer}>
          <AppText size={13} tone="white" style={{ opacity: 0.85 }}>
            {rtl ? 'جاري التحقق من الجلسة…' : 'Vérification de la session…'}
          </AppText>
          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
          </View>
          <AppText size={11.5} tone="white" style={{ opacity: 0.6 }}>
            {rtl ? 'المملكة المغربية • 2025' : 'Royaume du Maroc • 2025'}
          </AppText>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  logoTile: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadow.overlay,
  },
  logo: { width: 66, height: 66, borderRadius: 18 },
  wordmark: { textAlign: 'center' as const },
  caption: { textAlign: 'center' as const, opacity: 0.75 },
  footer: { alignItems: 'center', gap: spacing.md, paddingBottom: spacing.lg },
  progressTrack: {
    width: 120,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.glassSoft,
    overflow: 'hidden',
  },
  progressFill: { width: '55%', height: '100%', backgroundColor: colors.white },
});
