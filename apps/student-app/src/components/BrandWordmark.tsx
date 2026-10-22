import React from 'react';
import { Image } from 'react-native';
import { brand, type Lang } from '@ostadiplus/shared';
import { originalTextLeading } from '../theme';

/** Original outlined Latin lettering, including the small raised “plus”. */
export default function BrandWordmark({ size, lang }: { size: number; lang: Lang }) {
  // Keep the previous heading's line box; only replace its brand artwork.
  const height = size * (lang === 'fr' ? originalTextLeading.latin : originalTextLeading.arabic);
  return (
    <Image
      source={require('../../assets/brand/logo-fr-mulberry.png')}
      accessibilityLabel={brand.name}
      accessibilityRole="image"
      resizeMode="contain"
      style={{ width: '100%', height }}
    />
  );
}
