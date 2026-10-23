import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import React, { useState } from 'react';
import NotificationInbox from './NotificationInbox';
import { useStore } from '../store/StudentStore';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { Student } from '@ostadiplus/shared';

import BrandWordmark from './BrandWordmark';
import StudentQr from './StudentQr';
import { AppText, Card, PrimaryButton } from './ui';
import { useI18n } from '../i18n/useI18n';
import { colors, radius, spacing } from '../theme';

export default function PendingEnrollment({
  student,
  onShowCard,
}: {
  student: Student;
  onShowCard: () => void;
}) {
  const { lang } = useI18n();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [inboxOpen, setInboxOpen] = useState(false);
  const { myNotifications, myMemberships, state } = useStore();
  const joined = myMemberships
    .filter((m) => m.status === 'active')
    .map((m) => state.centers.find((c) => c.id === m.centerId)?.name)
    .filter(Boolean)
    .join(lang === 'ar' ? '، ' : ', ');
  const unread = myNotifications.filter((n) => !n.read).length;
  const rtl = lang === 'ar';
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <BrandWordmark size={30} lang={lang} />
        <PrimaryButton
          variant="soft"
          label={
            (rtl ? 'الإشعارات' : 'Notifications') +
            (unread ? ` (${unread})` : '')
          }
          onPress={() => setInboxOpen(true)}
        />
        {student.profilePhoto ? (
          <Image
            source={{ uri: student.profilePhoto }}
            style={styles.avatar}
            accessibilityLabel={student.fullName}
          />
        ) : null}
        <View style={styles.intro}>
          <AppText size={23} weight="bold" style={styles.center}>
            {rtl
              ? `مرحباً ${student.fullName} 👋`
              : `Bienvenue ${student.fullName} 👋`}
          </AppText>
          <AppText size={14.5} tone="muted" style={styles.center}>
            {joined
              ? rtl
                ? `حسابك مرتبط بـ ${joined}. الإدارة تقدر دابا تفعّل اشتراكك في الدروس.`
                : `Votre compte est lié à ${joined}. L’accueil peut maintenant activer vos cours.`
              : rtl
                ? 'توجّه إلى مركزك وأظهر هذا الرمز للإدارة لتفعيل دروسك.'
                : 'Rendez-vous à votre centre et présentez ce code à l’accueil pour activer vos cours.'}
          </AppText>
        </View>
        <Card style={styles.card}>
          <Ionicons name="qr-code-outline" size={24} color={colors.brand} />
          <AppText size={16} weight="bold">
            {rtl ? 'رمزك الشخصي' : 'Votre code personnel'}
          </AppText>
          <View style={styles.qr}>
            <StudentQr code={student.studentCode} cellSize={8} />
          </View>
          <AppText size={17} weight="bold" lang="fr">
            {student.studentCode}
          </AppText>
          <AppText size={13} tone="muted" style={styles.center}>
            {joined
              ? rtl
                ? 'دروسك غادي تبان هنا من بعد تفعيل الاشتراك.'
                : 'Vos cours apparaîtront ici après activation de l’abonnement.'
              : rtl
                ? 'منين توصلك دعوة المركز، افتح الإشعارات واقبلها. دروسك غادي تبان من بعد تفعيل الاشتراك.'
                : 'Acceptez l’invitation du centre dans vos notifications. Vos cours apparaîtront après activation de l’abonnement.'}
          </AppText>
          <PrimaryButton
            label={rtl ? 'عرض بطاقتي' : 'Afficher ma carte'}
            variant="soft"
            onPress={onShowCard}
          />
          <PrimaryButton
            label={
              rtl
                ? 'إعداد الاتصال بالمركز'
                : 'Configurer la connexion au centre'
            }
            variant="ghost"
            onPress={() => navigation.navigate('Sync')}
          />
        </Card>
      </ScrollView>
      <NotificationInbox open={inboxOpen} onClose={() => setInboxOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.xl,
  },
  intro: { gap: spacing.sm, maxWidth: 440 },
  center: { textAlign: 'center' },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  card: {
    width: '100%',
    maxWidth: 440,
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  qr: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: radius.md,
  },
});
