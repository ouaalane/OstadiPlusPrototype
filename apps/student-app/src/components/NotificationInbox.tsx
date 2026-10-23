import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { relativeTime, membershipForNotification } from '@ostadiplus/shared';
import { AppText, IconButton, PrimaryButton } from './ui';
import { useStore } from '../store/StudentStore';
import { useI18n } from '../i18n/useI18n';
import { lessonKindOf, lessonRoute } from '../lib/lesson';
import type { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';

/** Shared by the course home and the waiting-for-enrolment screen. */
export default function NotificationInbox({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const {
    myNotifications,
    myMemberships,
    respondToMembership,
    markNotificationRead,
  } = useStore();
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<{ id: string; text: string } | null>(null);
  async function respond(id: string, accept: boolean) {
    if (busy) return;
    setBusy(id);
    setError(null);
    try {
      await respondToMembership(id, accept);
    } catch {
      setError({
        id,
        text: ar
          ? 'تعذّر إرسال الجواب. تحقق من الاتصال وحاول مجدداً.'
          : 'Réponse non envoyée. Vérifiez la connexion et réessayez.',
      });
    } finally {
      setBusy(null);
    }
  }
  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.scrim} onPress={onClose} accessible={false}>
        <Pressable
          style={styles.sheet}
          onPress={() => undefined}
          accessible={false}
          accessibilityViewIsModal
        >
          <View style={[styles.header, ar && { flexDirection: 'row-reverse' }]}>
            <AppText size={18} weight="bold">
              {ar ? 'الإشعارات' : 'Notifications'}
            </AppText>
            <IconButton
              icon="close"
              size={34}
              variant="plain"
              label={ar ? 'إغلاق' : 'Fermer'}
              onPress={onClose}
            />
          </View>
          <ScrollView style={{ maxHeight: 520 }}>
            {!myNotifications.length ? (
              <AppText tone="muted" style={styles.row}>
                {ar
                  ? 'لا توجد إشعارات بعد.'
                  : 'Aucune notification pour le moment.'}
              </AppText>
            ) : null}
            {myNotifications.map((n) => {
              const membership = membershipForNotification(myMemberships, n);
              const pending = membership?.status === 'requested';
              return (
                <View key={n.id} style={styles.row}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      markNotificationRead(n.id);
                      if (n.kind === 'new-lesson' && n.payload.lessonId) {
                        navigation.navigate(
                          lessonRoute(lessonKindOf(n.payload.lessonKind)),
                          { lessonId: n.payload.lessonId },
                        );
                        onClose();
                      }
                    }}
                    style={[
                      styles.summary,
                      ar && { flexDirection: 'row-reverse' },
                    ]}
                  >
                    <Ionicons
                      name={
                        n.kind === 'center-request'
                          ? 'business-outline'
                          : n.kind === 'new-lesson'
                            ? 'megaphone-outline'
                            : 'checkmark-circle-outline'
                      }
                      size={21}
                      color={colors.brand}
                    />
                    <View style={{ flex: 1, gap: 4 }}>
                      <AppText weight="semibold" size={14}>
                        {n.kind === 'center-request'
                          ? ar
                            ? `دعوة للانضمام إلى «${n.payload.centerName ?? ''}»`
                            : `Invitation à rejoindre « ${n.payload.centerName ?? ''} »`
                          : n.kind === 'new-lesson'
                            ? ar
                              ? `${n.payload.teacherName ?? ''} نشر درساً جديداً: ${n.payload.lessonTitle ?? ''}`
                              : `${n.payload.teacherName ?? ''} a publié : ${n.payload.lessonTitle ?? ''}`
                            : ar
                              ? `تم تفعيل وصولك إلى «${n.payload.courseTitle ?? ''}»`
                              : `Accès activé : « ${n.payload.courseTitle ?? ''} »`}
                      </AppText>
                      <AppText size={12} tone="muted">
                        {relativeTime(n.createdAt, lang)}
                      </AppText>
                    </View>
                    {!n.read ? <View style={styles.dot} /> : null}
                  </Pressable>
                  {pending && membership ? (
                    <View style={{ gap: spacing.sm }}>
                      <AppText size={13} tone="muted">
                        {ar
                          ? 'بقبول الدعوة، يقدر المركز يشوف معلوماتك ويسجّلك في الدروس. الاشتراك يتفعّل بشكل منفصل.'
                          : 'En acceptant, vous partagez votre profil avec le centre. L’accès aux cours est activé séparément.'}
                      </AppText>
                      <View
                        style={[
                          styles.actions,
                          ar && { flexDirection: 'row-reverse' },
                        ]}
                      >
                        <PrimaryButton
                          label={ar ? 'قبول الدعوة' : 'Accepter l’invitation'}
                          onPress={() => respond(membership.id, true)}
                          busy={busy === membership.id}
                          disabled={!!busy}
                        />
                        <PrimaryButton
                          label={ar ? 'رفض الدعوة' : 'Refuser'}
                          variant="soft"
                          onPress={() => respond(membership.id, false)}
                          disabled={!!busy}
                        />
                      </View>
                    </View>
                  ) : membership ? (
                    <AppText size={13} weight="semibold" tone="brand">
                      {membership.status === 'active'
                        ? ar
                          ? 'تم قبول الدعوة'
                          : 'Invitation acceptée'
                        : membership.status === 'rejected'
                          ? ar
                            ? 'تم رفض الدعوة'
                            : 'Invitation refusée'
                          : ar
                            ? 'الدعوة ملغاة'
                            : 'Invitation annulée'}
                    </AppText>
                  ) : null}
                  {error && pending && membership?.id === error.id ? (
                    <AppText accessibilityRole="alert" size={13}>
                      {error.text}
                    </AppText>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(41,30,43,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
  },
  row: {
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    gap: spacing.md,
  },
  summary: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.brand },
});
