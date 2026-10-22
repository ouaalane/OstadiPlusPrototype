/**
 * Login — email (or phone) + password, then a 6-digit verification code.
 *
 * App bar with a back button, a soft brand medallion, H1 + subtitle, the
 * identifier/password fields, «Mot de passe oublié ?», the primary submit and
 * «Vous n'avez pas de compte ? Créez un nouveau compte», plus a trust caption.
 *
 * There is no backend: the identifier/password are validated locally and the
 * code step signs the student into the demo dataset (the first account with an
 * active enrollment), exactly like an invited pupil.
 *
 * Bilingual: strings are authored inline per language, layout flips RTL↔LTR.
 */

import React, { useMemo, useRef, useState } from 'react';
import type { TextInput } from 'react-native';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, AuthAppBar, LabeledField, PrimaryButton } from '../components/ui';
import { useI18n } from '../i18n/useI18n';
import { useLayout } from '../i18n/layout';
import { useStore } from '../store/StudentStore';
import { colors, radius, spacing } from '../theme';

export default function LoginScreen({
  onBack,
  onSignup,
  onCodeSent,
}: {
  onBack: () => void;
  onSignup: () => void;
  /** Email + resolved demo account id are handed to the 6-digit code step. */
  onCodeSent: (email: string, studentId?: string) => void;
}) {
  const { state } = useStore();
  const { lang, dir } = useI18n();
  const l = useLayout(lang);
  const rtl = dir === 'rtl';
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [banner, setBanner] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);

  /** First student with an active enrollment (the "signed-in" demo user). */
  const targetId = useMemo(() => {
    const active = state.students.find((s) =>
      state.enrollments.some((e) => e.studentId === s.id && e.status === 'active'),
    );
    return (active ?? state.students[0])?.id;
  }, [state.students, state.enrollments]);

  const submit = () => {
    if (busy) return;
    const next: typeof errors = {};
    if (!identifier.trim())
      next.identifier = rtl ? 'أدخل بريدك الإلكتروني أو رقم هاتفك.' : 'Entrez votre email ou votre numéro de téléphone.';
    if (!password) next.password = rtl ? 'أدخل كلمة السر.' : 'Entrez votre mot de passe.';
    setErrors(next);
    // Field-level problems stay next to their fields — no redundant banner.
    if (Object.keys(next).length > 0) return;
    setBanner(null);
    setBusy(true);
    // No backend — validate locally, then send a (demo) verification code.
    setTimeout(() => {
      setBusy(false);
      if (targetId) onCodeSent(identifier.trim(), targetId);
      else
        setBanner(
          rtl
            ? 'لا يوجد حساب نشط مرتبط بهذا البريد. أنشئ حساباً جديداً أو تواصل مع مركزك.'
            : 'Aucun compte actif lié à cet email. Créez un nouveau compte ou contactez votre centre.',
        );
    }, 450);
  };

  const forgotAlertTitle = rtl ? 'استرجاع كلمة السر' : 'Récupérer le mot de passe';
  const forgotAlertBody = rtl
    ? 'كلمة السر تُسلَّم من طرف مركزك. تواصل مع الأستاذ أو إدارة المركز لإعادة تعيينها.'
    : 'Le mot de passe est délivré par votre centre. Contactez votre professeur ou la direction du centre pour le réinitialiser.';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <AuthAppBar onBack={onBack} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* ---- decorative medallion ---- */}
          <View style={styles.medallion} importantForAccessibility="no">
            <Ionicons name="shield-checkmark-outline" size={32} color={colors.brand} />
          </View>

          <AppText size={26} weight="bold" tone="ink" style={styles.heading}>
            {rtl ? 'تسجيل الدخول' : 'Connexion'}
          </AppText>
          <AppText size={14.5} tone="muted" style={[styles.subtitle, { marginBottom: spacing.xl }]}>
            {rtl
              ? 'أدخل بريدك الإلكتروني أو رقم هاتفك لمتابعة دروسك وتحضير البكالوريا.'
              : 'Entrez votre adresse e-mail ou votre numéro de téléphone pour suivre vos cours et préparer le baccalauréat.'}
          </AppText>

          {banner ? (
            <View
              style={[l.rowBetween, styles.banner]}
              accessibilityLiveRegion="polite"
              accessibilityRole="alert"
            >
              <Ionicons name="alert-circle" size={18} color={colors.danger} importantForAccessibility="no" />
              <AppText size={13} weight="semibold" tone="danger" style={styles.bannerText}>
                {banner}
              </AppText>
            </View>
          ) : null}

          <View style={{ gap: spacing.lg }}>
            <LabeledField
              required
              label={rtl ? 'البريد الإلكتروني أو رقم الهاتف' : 'Adresse e-mail ou numéro de téléphone'}
              icon="at-outline"
              value={identifier}
              onChangeText={(t) => {
                setIdentifier(t);
                setErrors((e) => ({ ...e, identifier: undefined }));
                setBanner(null);
              }}
              placeholder={rtl ? 'name@example.com' : 'nom@exemple.com'}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => passwordRef.current?.focus()}
              autoFocus
              error={errors.identifier}
            />

            <LabeledField
              required
              inputRef={passwordRef}
              label={rtl ? 'كلمة السر' : 'Mot de passe'}
              icon="lock-closed-outline"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setErrors((e) => ({ ...e, password: undefined }));
                setBanner(null);
              }}
              placeholder="••••••••"
              secureTextEntry={secure}
              autoComplete="current-password"
              returnKeyType="go"
              submitBehavior="blurAndSubmit"
              onSubmitEditing={submit}
              error={errors.password}
              accessibilityHint={
                rtl ? 'اضغط إظهار لعرض كلمة السر' : 'Appuyez sur Afficher pour voir le mot de passe'
              }
              trailing={
                <Pressable
                  onPress={() => setSecure((s) => !s)}
                  hitSlop={10}
                  style={({ pressed }) => pressed && { opacity: 0.6 }}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={
                    secure
                      ? rtl
                        ? 'إظهار كلمة السر'
                        : 'Afficher le mot de passe'
                      : rtl
                        ? 'إخفاء كلمة السر'
                        : 'Masquer le mot de passe'
                  }
                >
                  <Ionicons
                    name={secure ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color={colors.muted}
                    importantForAccessibility="no"
                  />
                </Pressable>
              }
            />
          </View>

          <Pressable
            hitSlop={8}
            style={({ pressed }) => [styles.forgot, pressed && { opacity: 0.6 }]}
            onPress={() => Alert.alert(forgotAlertTitle, forgotAlertBody)}
            accessible
            accessibilityRole="button"
            accessibilityLabel={rtl ? 'نسيت كلمة السر' : 'Mot de passe oublié'}
          >
            <AppText size={13.5} weight="semibold" tone="brand">
              {rtl ? 'نسيت كلمة السر؟' : 'Mot de passe oublié ?'}
            </AppText>
          </Pressable>

          <PrimaryButton
            label={
              busy
                ? rtl
                  ? 'جارٍ الدخول…'
                  : 'Connexion en cours…'
                : rtl
                  ? 'تسجيل الدخول'
                  : 'Se connecter'
            }
            onPress={submit}
            disabled={busy}
            busy={busy}
            style={{ marginTop: spacing.xl }}
          />

          <Pressable
            onPress={onSignup}
            hitSlop={8}
            style={({ pressed }) => [styles.switch, pressed && { opacity: 0.6 }]}
            accessible
            accessibilityRole="link"
            accessibilityLabel={rtl ? 'إنشاء حساب جديد' : 'Créer un nouveau compte'}
          >
            <AppText size={14} tone="muted">
              {rtl ? 'ليس لديك حساب؟' : "Vous n'avez pas de compte ?"}
            </AppText>
            <AppText size={14} weight="bold" tone="brand">
              {rtl ? 'أنشئ حساباً جديداً' : 'Créez un nouveau compte'}
            </AppText>
          </Pressable>

          <View style={[l.row, styles.trust]}>
            <Ionicons name="checkmark-circle" size={15} color={colors.success} />
            <AppText size={12} tone="muted" style={styles.trustText}>
              {rtl
                ? 'منصة تعليمية معتمدة لجميع المستويات الدراسية'
                : 'Plateforme éducative agréée pour tous les niveaux scolaires'}
            </AppText>
          </View>
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
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  bannerText: { flex: 1, lineHeight: 19 },
  forgot: { alignSelf: 'flex-start', marginTop: spacing.md },
  switch: { marginTop: spacing.xl, gap: 2, alignItems: 'center' },
  trust: {
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.xl,
  },
  trustText: { textAlign: 'center', flexShrink: 1 },
});
