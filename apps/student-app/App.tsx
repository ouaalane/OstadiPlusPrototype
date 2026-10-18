import { useEffect } from 'react';
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

import RootNavigator from './src/navigation/RootNavigator';
import { StudentStoreProvider } from './src/store/StudentStore';

/* Keep the native splash up until the app fonts are ready. */
SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function App() {
  const [fontsLoaded] = useFonts({
    IBMPlexArabic_400Regular: IBMPlexSansArabic_400Regular,
    IBMPlexArabic_500Medium: IBMPlexSansArabic_500Medium,
    IBMPlexArabic_600SemiBold: IBMPlexSansArabic_600SemiBold,
    IBMPlexArabic_700Bold: IBMPlexSansArabic_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsLoaded]);

  /* The native splash can be dismissed before the JS tree has anything to draw
     — in development the fonts alone stream in over Metro for a few seconds.
     Painting the launch background while they load keeps that gap the same
     colour as the splash instead of leaving the bare window showing. */
  if (!fontsLoaded) return <View style={styles.launch} />;

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
  launch: { flex: 1, backgroundColor: '#F3F9FD' },
});
