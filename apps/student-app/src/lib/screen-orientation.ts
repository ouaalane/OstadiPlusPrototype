import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

type OrientationClient = typeof import('expo-screen-orientation');

// Older binaries may lack this module. Avoid its eager native import there
// and in browser previews so opening the app remains safe.
const available = Platform.OS !== 'web' &&
  requireOptionalNativeModule('ExpoScreenOrientation') !== null;
const orientation: OrientationClient | null = available
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ? require('expo-screen-orientation')
  : null;

const videoScopes = new Set<symbol>();
let pending = Promise.resolve();

function applyOrientation() {
  if (!orientation) return;
  // Serialize native calls and use the latest focus state. A slow lock must
  // not leave the next screen in landscape after the video closes.
  pending = pending.then(() => orientation.lockAsync(videoScopes.size
    ? orientation.OrientationLock.DEFAULT
    : orientation.OrientationLock.PORTRAIT_UP)).catch((error: unknown) => {
    console.warn('[orientation] could not update screen orientation', error);
  });
}

export function initializeAppOrientation() {
  applyOrientation();
}

export function acquireVideoRotation() {
  const scope = Symbol('video');
  videoScopes.add(scope);
  applyOrientation();
  return () => {
    if (videoScopes.delete(scope)) applyOrientation();
  };
}
