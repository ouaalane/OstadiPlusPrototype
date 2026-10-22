import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  ActivityIndicator,
  AppState,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { createCaptureProtectionController } from '../lib/capture-protection-controller';
import { createNativeProtectionClient } from '../lib/capture-protection';
import { colors } from '../theme';

const CaptureContext = createContext({ blocked: false });
export const useCaptureProtection = () => useContext(CaptureContext);

export default function CaptureProtectionBoundary({
  children,
}: {
  children: ReactNode;
}) {
  const [controller] = useState(() =>
    createCaptureProtectionController(
      Platform.OS,
      createNativeProtectionClient,
      (AppState.currentState ?? 'active') === 'active',
    ),
  );
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  useEffect(() => {
    void controller.start();
    const subscription = AppState.addEventListener('change', (value) => {
      void controller.setActive(value === 'active');
    });
    return () => {
      subscription.remove();
      controller.stop();
    };
  }, [controller]);
  const web = state.phase === 'unsupported';
  const ready = state.phase === 'protected' || web;
  const blocked = !web && (!ready || !state.foreground || state.captured);
  const unavailable = state.phase === 'unavailable';
  const failed = state.phase === 'error' || unavailable;
  return (
    <CaptureContext.Provider value={{ blocked }}>
      <View style={styles.root}>
        {ready ? (
          <View
            style={styles.root}
            pointerEvents={blocked ? 'none' : 'auto'}
            importantForAccessibility={blocked ? 'no-hide-descendants' : 'auto'}
            accessibilityElementsHidden={blocked}
          >
            {children}
          </View>
        ) : null}
        {blocked ? (
          <View
            style={styles.cover}
            accessibilityViewIsModal
            testID="capture-protection-cover"
          >
            {state.phase === 'checking' ? (
              <ActivityIndicator color={colors.white} />
            ) : null}
            <Text style={styles.title}>
              {failed
                ? 'تعذّر تفعيل حماية المحتوى'
                : state.captured
                  ? 'أوقف تسجيل أو مشاركة الشاشة للمتابعة'
                  : 'oustadi plus'}
            </Text>
            {failed ? (
              <>
                <Text style={styles.message}>
                  {unavailable
                    ? 'خاصك النسخة الجديدة ديال التطبيق. Expo Go والنسخ القديمة ما فيهمش وحدة الحماية المطلوبة.\nInstallez la nouvelle version native pour continuer.'
                    : 'المحتوى محجوب حتى تتفعّل الحماية. عاود المحاولة.\nProtection indisponible. Réessayez.'}
                </Text>
                <Pressable
                  style={styles.retry}
                  onPress={() => {
                    void controller.retry();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="إعادة المحاولة — Réessayer"
                >
                  <Text style={styles.retryText}>
                    إعادة المحاولة · Réessayer
                  </Text>
                </Pressable>
              </>
            ) : null}
          </View>
        ) : null}
      </View>
    </CaptureContext.Provider>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  cover: {
    ...StyleSheet.absoluteFill,
    zIndex: 10000,
    elevation: 10000,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 18,
  },
  title: {
    color: colors.white,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
  },
  message: {
    color: colors.white,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 23,
  },
  retry: {
    padding: 14,
    borderWidth: 1,
    borderColor: colors.white,
    borderRadius: 12,
  },
  retryText: { color: colors.white, textAlign: 'center', fontSize: 14 },
});
