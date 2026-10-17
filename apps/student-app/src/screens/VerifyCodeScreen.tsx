/**
 * Verify — the 6-digit code step of the login flow.
 *
 * Six code boxes, a real countdown («Code expires in 04:32») and a resend
 * affordance that restarts the countdown. There is no backend, so the code is
 * never generated or transmitted: submitting any six digits completes the
 * sign-in into the demo dataset.
 *
 * Bilingual: strings are authored inline per language, layout flips RTL↔LTR.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, AuthAppBar, CodeInput, PrimaryButton } from '../components/ui';
import { useI18n } from '../i18n/useI18n';
import { colors, spacing } from '../theme';
import { useStore } from '../store/StudentStore';

/** Code lifetime in seconds. */
const CODE_TTL = 300;

function formatRemaining(seconds: number): string {
  const safe = Math.max(0, seconds);
  const mm = String(Math.floor(safe / 60)).padStart(2, '0');
  const ss = String(safe % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export default function VerifyCodeScreen({
  email,
  studentId,
  onBack,
}: {
  email: string;
  studentId?: string;
  onBack: () => void;
}) {
  const { state, signIn } = useStore();
  const { dir } = useI18n();
  const rtl = dir === 'rtl';

  const [code, setCode] = useState('');
  const [remaining, setRemaining] = useState(CODE_TTL);
  const [sentAt, setSentAt] = useState(() => new Date().toISOString());
  const [busy, setBusy] = useState(false);
  const [resent, setResent] = useState(false);
  const mounted = useRef(true);

  /** Demo account to sign in: the one resolved during login, else the first active. */
  const targetId = useMemo(() => {
    if (studentId) return studentId;
    const active = state.students.find((s) =>
      state.enrollments.some((e) => e.studentId === s.id && e.status === 'active'),
    );
    return (active ?? state.students[0])?.id;
  }, [studentId, state.students, state.enrollments]);

  /** Real countdown — resets whenever a new code is "sent". */
  useEffect(() => {
    setRemaining(CODE_TTL);
    const id = setInterval(() => {
      setRemaining((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [sentAt]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const expired = remaining === 0;
  const ready = code.length === 6 && !expired && !busy;

  const verify = () => {
    if (!ready) return;
    setBusy(true);
    setTimeout(() => {
      if (!mounted.current) return;
      setBusy(false);
      if (targetId) signIn(targetId);
    }, 400);
  };

  const resend = () => {
    setCode('');
    setResent(true);
    setSentAt(new Date().toISOString());
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <AuthAppBar onBack={onBack} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.medallion} importantForAccessibility="no">
            <Ionicons name="mail-unread-outline" size={32} color={colors.brand} />
          </View>

          <AppText size={26} weight="bold" tone="ink" style={styles.heading}>
            {rtl ? 'تأكيد بريدك الإلكتروني' : 'Vérifiez votre e-mail'}
          </AppText>
          <AppText size={14.5} tone="muted" style={styles.subtitle}>
            {rtl ? 'أرسلنا رمزاً مكوّناً من 6 أرقام إلى ' : 'Nous avons envoyé un code à 6 chiffres à '}
            <AppText size={14.5} weight="semibold" tone="ink">
              {email || (rtl ? 'بريدك' : 'votre e-mail')}
            </AppText>
          </AppText>

          <View style={{ marginTop: spacing.xxl }}>
            <CodeInput
              value={code}
              onChange={(v) => {
                setCode(v);
                setResent(false);
              }}
              autoFocus
              accessibilityLabel={
                rtl ? 'رمز التحقق المكوّن من ستة أرقام' : 'Code de vérification à 6 chiffres'
              }
            />
          </View>

          <View style={styles.expiryRow}>
            <Ionicons
              name={expired ? 'alert-circle-outline' : 'time-outline'}
              size={15}
              color={expired ? colors.danger : colors.muted}
              importantForAccessibility="no"
            />
            <AppText size={12.5} tone={expired ? 'danger' : 'muted'} accessibilityLiveRegion="polite">
              {expired
                ? rtl
                  ? 'انتهت صلاحية الرمز. اطلب رمزاً جديداً.'
                  : 'Le code a expiré. Demandez-en un nouveau.'
                : rtl
                  ? `تنتهي صلاحية الرمز في ${formatRemaining(remaining)}`
                  : `Le code expire dans ${formatRemaining(remaining)}`}
            </AppText>
          </View>

          <PrimaryButton
            label={busy ? (rtl ? 'جارٍ التأكيد…' : 'Vérification…') : rtl ? 'تأكيد' : 'Vérifier'}
            onPress={verify}
            disabled={!ready}
            busy={busy}
            style={{ marginTop: spacing.xl }}
          />

          <Pressable
            onPress={resend}
            hitSlop={8}
            style={({ pressed }) => [styles.resend, pressed && { opacity: 0.6 }]}
            accessible
            accessibilityRole="button"
            accessibilityLabel={rtl ? 'إعادة إرسال الرمز' : 'Renvoyer le code'}
          >
            <AppText size={14} tone="muted">
              {resent
                ? rtl
                  ? 'تم إرسال رمز جديد.'
                  : 'Un nouveau code a été envoyé.'
                : rtl
                  ? 'لم تستلمه؟'
                  : "Vous ne l'avez pas reçu ?"}
            </AppText>
            {!resent ? (
              <AppText size={14} weight="bold" tone="brand">
                {rtl ? 'أعد إرسال الرمز' : 'Renvoyer le code'}
              </AppText>
            ) : null}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl },
  medallion: {
    alignSelf: 'center',
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  heading: { textAlign: 'center', marginBottom: spacing.sm },
  subtitle: { textAlign: 'center', lineHeight: 22 },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.lg,
  },
  resend: { marginTop: spacing.xl, alignItems: 'center', gap: 2 },
});
