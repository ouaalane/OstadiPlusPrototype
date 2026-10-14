/**
 * Brand splash — visible while fonts load and the stored dataset is read.
 * The native splash is held open by App.tsx until this screen can render.
 */

import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '../components/ui';
import { colors, spacing } from '../theme';

export default function SplashScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.center}>
        <Image source={require('../../assets/logo.png')} style={styles.logo} />
        <AppText size={26} weight="bold" tone="ink">
          OstadiPlus
        </AppText>
        <AppText size={14} tone="muted">
          تعلّم بمنهجية الأطلس
        </AppText>
      </View>
      <AppText size={11.5} tone="faint" style={styles.footer}>
        مركز الأطلس للدروس · الدار البيضاء
      </AppText>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  logo: { width: 96, height: 96, borderRadius: 22, marginBottom: spacing.md },
  footer: { textAlign: 'center', paddingBottom: spacing.lg },
});
