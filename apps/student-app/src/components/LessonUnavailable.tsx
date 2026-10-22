import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { AppText, PrimaryButton } from './ui';
import { useI18n } from '../i18n/useI18n';
import { colors, spacing } from '../theme';

export default function LessonUnavailable() {
  const { lang } = useI18n();
  const navigation = useNavigation();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <View testID="lesson-unavailable" style={{ flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg }}>
        <AppText style={{ textAlign: 'center' }}>
          {lang === 'ar'
            ? 'هذا الدرس غير متاح لحسابك حالياً. راجع اشتراكك مع المركز.'
            : 'Cette leçon n’est pas disponible pour votre compte. Vérifiez votre abonnement auprès du centre.'}
        </AppText>
        <PrimaryButton label={lang === 'ar' ? 'رجوع' : 'Retour'} onPress={() => navigation.goBack()} />
      </View>
    </SafeAreaView>
  );
}
