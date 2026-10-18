/**
 * A navigation ref that code outside the navigator can use.
 *
 * Notification taps arrive outside React's tree (and sometimes before the
 * navigator has mounted), so they need a way to push a screen once the app is
 * up. `RootNavigator` hands this ref to its `NavigationContainer`.
 */

import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();
