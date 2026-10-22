import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
import type { ProtectionClient } from './capture-protection-controller';

type CaptureNative = {
  preventScreenCapture(): Promise<void>;
  enableAppSwitcherProtection?: (intensity: number) => Promise<void>;
  addListener: (name: string, listener: () => void) => { remove(): void };
};
type ProtectionNative = {
  ensureProtection(): Promise<{ captured: boolean; windowId?: string }>;
  addListener: (
    name: string,
    listener: (event: { captured: boolean }) => void,
  ) => { remove(): void };
};
/** SDK 57 bridge methods audited against installed Swift/Kotlin source.
 * Reattach the iOS secure canvas when its key window changes; avoid repeated
 * observer registration on ordinary resumes. Android flags are idempotent. */
export function createNativeProtectionClient(): ProtectionClient | null {
  if (Platform.OS === 'web') return null;
  const native = requireOptionalNativeModule<ProtectionNative>(
    'OustadiCaptureProtection',
  );
  const capture =
    requireOptionalNativeModule<CaptureNative>('ExpoScreenCapture');
  if (!native || !capture?.preventScreenCapture) return null;
  let switcherEnabled = false;
  let protectedWindowId: string | undefined;
  return {
    async ensureProtection() {
      // Android applies FLAG_SECURE + an app-wide audio-capture opt-out.
      // iOS reads its capture state; Expo installs the secure canvas/blocker.
      const initial = await native.ensureProtection();
      // iOS can briefly have no attached key window on cold start. Retry while
      // the root boundary keeps all app content covered.
      if (
        Platform.OS !== 'ios' ||
        !protectedWindowId ||
        protectedWindowId !== initial.windowId
      ) {
        for (let attempt = 0; ; attempt++) {
          try {
            await capture.preventScreenCapture();
            break;
          } catch (error) {
            if (attempt >= 3) throw error;
            await new Promise((resolve) =>
              setTimeout(resolve, 150 * (attempt + 1)),
            );
          }
        }
        const attached = await native.ensureProtection();
        protectedWindowId = attached.windowId;
      }
      if (Platform.OS === 'ios' && !switcherEnabled) {
        if (!capture.enableAppSwitcherProtection)
          throw new Error('Native privacy overlay unavailable');
        await capture.enableAppSwitcherProtection(1);
        switcherEnabled = true;
      }
      return native.ensureProtection();
    },
    subscribe(listener) {
      if (Platform.OS !== 'ios') return () => {};
      const subscription = native.addListener('captureChanged', (event) =>
        listener(event.captured),
      );
      return () => subscription.remove();
    },
  };
}
/** Detection is auxiliary, never the blocker. Avoid requesting gallery access
 * just for screenshot events on older Android releases. */
export function subscribeScreenshotAttempt(listener: () => void): {
  remove(): void;
} {
  if (
    Platform.OS === 'web' ||
    (Platform.OS === 'android' && Number(Platform.Version) < 34)
  )
    return { remove() {} };
  try {
    return (
      requireOptionalNativeModule<CaptureNative>(
        'ExpoScreenCapture',
      )?.addListener('onScreenshot', listener) ?? { remove() {} }
    );
  } catch {
    return { remove() {} };
  }
}
