import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './ui';
import { useI18n } from '../i18n/useI18n';
import { pickProfilePhoto } from '../lib/profile-photo';
import { colors } from '../theme';

export default function ProfilePhotoButton({ photo, monogram, fallback, onChange }: {
  photo?: string;
  monogram?: string;
  fallback?: ImageSourcePropType;
  onChange: (photo: string) => void;
}) {
  const { lang } = useI18n();
  const rtl = lang === 'ar';
  const [busy, setBusy] = useState(false);
  const choose = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const selected = await pickProfilePhoto();
      if (selected) onChange(selected);
    } catch (error) {
      const needsBuild = error instanceof Error && error.message === 'PROFILE_PHOTO_BUILD_REQUIRED';
      Alert.alert(rtl ? 'الصورة الشخصية' : 'Photo de profil', needsBuild
        ? (rtl ? 'حدّث نسخة التطبيق لاختيار صورة.' : 'Mettez à jour l’application pour choisir une photo.')
        : (rtl ? 'تعذّر اختيار الصورة. جرّب مرة أخرى من ألبوم الصور.' : 'Impossible de choisir cette photo. Réessayez depuis votre galerie.'));
    } finally { setBusy(false); }
  };
  const source = photo ? { uri: photo } : fallback;
  return (
    <Pressable onPress={choose} disabled={busy} style={styles.avatar} accessibilityRole="button"
      accessibilityLabel={photo ? (rtl ? 'تغيير الصورة الشخصية' : 'Modifier la photo de profil') : (rtl ? 'إضافة صورة شخصية' : 'Ajouter une photo de profil')}
      accessibilityState={{ disabled: busy, busy }}>
      {source ? <Image source={source} style={styles.photo} resizeMode="cover" />
        : monogram ? <AppText size={25} weight="bold" tone="brand">{monogram}</AppText>
          : <Ionicons name="person-outline" size={30} color={colors.brand} />}
      <View style={styles.badge}>
        {busy ? <ActivityIndicator size="small" color={colors.brand} /> : <Ionicons name="camera" size={12} color={colors.white} />}
      </View>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  photo: { width: '100%', height: '100%', borderRadius: 38 },
  badge: { position: 'absolute', bottom: -2, start: -2, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
});
