import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_600SemiBold,
  IBMPlexSansArabic_700Bold,
} from '@expo-google-fonts/ibm-plex-sans-arabic';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

import { colors } from './src/theme';

import RootNavigator from './src/navigation/RootNavigator';
import { StudentStoreProvider } from './src/store/StudentStore';

/* Keep the native splash up until the app fonts are ready. */
SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    NotoSansArabic_Brand: require('./assets/fonts/NotoSansArabic-Brand.ttf'),
    BricolageGrotesque_Bold: require('./assets/fonts/BricolageGrotesque-Bold.ttf'),
    IBMPlexArabic_400Regular: IBMPlexSansArabic_400Regular,
    IBMPlexArabic_500Medium: IBMPlexSansArabic_500Medium,
    IBMPlexArabic_600SemiBold: IBMPlexSansArabic_600SemiBold,
    IBMPlexArabic_700Bold: IBMPlexSansArabic_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  /* A font asset can fail or stall (offline dev server, corrupted cache).
     Never let that trap the app on a blank launch screen: fall back to the
     system face after a short wait. */
  const [fontWaitElapsed, setFontWaitElapsed] = useState(false);
  const fontsReady = fontsLoaded || Boolean(fontError) || fontWaitElapsed;

  useEffect(() => {
    const timer = setTimeout(() => setFontWaitElapsed(true), 6000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (fontError) {
      console.warn('[fonts] failed to load; using system fallback', fontError);
    }
  }, [fontError]);

  useEffect(() => {
    if (fontsReady) SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsReady]);

  /* The native splash can be dismissed before the JS tree has anything to draw
     — in development the fonts alone stream in over Metro for a few seconds.
     Painting the launch background while they load keeps that gap the same
     colour as the splash instead of leaving the bare window showing. */
  if (!fontsReady) return <View style={styles.launch} />;

  return (
    <SafeAreaProvider>
      <StudentStoreProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </StudentStoreProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  launch: { flex: 1, backgroundColor: colors.canvas },
});
