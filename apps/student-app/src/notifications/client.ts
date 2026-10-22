import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

/**
 * SDK 57's notifications entry point eagerly loads an Android FCM module that
 * Expo Go does not contain. Never evaluate that entry point in Android Expo Go.
 * Web has no native notification service either. Development/production builds
 * and iOS keep the real notification implementation.
 */
export const Notifications: typeof import('expo-notifications') | null =
  Platform.OS === 'web' || (Platform.OS === 'android' && isRunningInExpoGo())
    ? null
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Static imports evaluate the missing native module before the guard.
    : require('expo-notifications');
