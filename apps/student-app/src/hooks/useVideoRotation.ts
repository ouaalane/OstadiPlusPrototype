import { useCallback, useState } from 'react';
import { Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { acquireVideoRotation } from '../lib/screen-orientation';

export function useVideoRotation() {
  const [fullscreen, setFullscreen] = useState(() => {
    const { width, height } = Dimensions.get('window');
    return width > height;
  });

  useFocusEffect(useCallback(() => {
    const release = acquireVideoRotation();
    const sync = ({ width, height }: { width: number; height: number }) => {
      setFullscreen(width > height);
    };
    sync(Dimensions.get('window'));
    const subscription = Dimensions.addEventListener('change', ({ window }) => sync(window));
    return () => {
      subscription.remove();
      release();
    };
  }, []));

  return [fullscreen, setFullscreen] as const;
}
