/**
 * Create account — the Stitch 3-step sign-up (spec 3.5) with the level-select
 * step (spec «اختيار المستوى الدراسي») folded in as step 2, so every
 * educational level is covered: ابتدائي، إعدادي، تأهيلي، باك حر، جامعي.
 *
 *   1. معلوماتك الشخصية — name, email, phone (+212), password
 *   2. مسارك الدراسي     — choose a level + track + city
 *   3. تأكيد            — summary, terms checkbox, «إنشاء الحساب»
 *
 * No backend: creating the account signs the student into the demo dataset.
 */

import React, { useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, AuthAppBar, LabeledField, PrimaryButton, Stepper } from '../components/ui';
import { useI18n } from '../i18n/useI18n';
import { useLayout } from '../i18n/layout';
import { useStore } from '../store/StudentStore';
import { colors, radius, spacing } from '../theme';

/** Bilingual label — Arabic stays byte-for-byte, French is the LTR variant. */
interface Bi {
  ar: string;
  fr: string;
}

interface LevelOption {
  id: string;
  title: Bi;
  sub: Bi;
  icon: keyof typeof Ionicons.glyphMap;
}

/** Every educational level the platform supports (Stitch level-select). */
const LEVELS: LevelOption[] = [
  {
    id: 'primary',
    title: { ar: 'ابتدائي', fr: 'Primaire' },
    sub: { ar: 'Primaire · من الأول إلى السادس ابتدائي', fr: 'Primaire · de la 1re à la 6e année' },
    icon: 'happy-outline',
  },
  {
    id: 'college',
    title: { ar: 'ثانوي إعدادي', fr: 'Collège' },
    sub: { ar: 'Collège · السنة 1، 2 و 3 إعدادي', fr: 'Collège · 1re, 2e et 3e année' },
    icon: 'book-outline',
  },
  {
    id: 'bac',
    title: { ar: 'ثانوي تأهيلي (BAC)', fr: 'Lycée (BAC)' },
    sub: { ar: 'Lycée · جذع مشترك، 1ère BAC، 2ème BAC', fr: 'Lycée · tronc commun, 1re BAC, 2e BAC' },
    icon: 'school-outline',
  },
  {
    id: 'free',
    title: { ar: 'باك حر (Candidats Libres)', fr: 'Bac libre (Candidats Libres)' },
    sub: { ar: 'مترشحون أحرار · جميع الشعب والمسالك', fr: 'Candidats libres · toutes les filières' },
    icon: 'person-add-outline',
  },
  {
    id: 'uni',
    title: { ar: 'جامعي وتكوين مهني', fr: 'Universitaire et formation professionnelle' },
    sub: { ar: 'EST, FST, BTS, CPGE, Facultés & OFPPT', fr: 'EST, FST, BTS, CPGE, Facultés & OFPPT' },
    icon: 'business-outline',
  },
];

const CITIES = [
  'الدار البيضاء (Casablanca)',
  'الرباط / Rabat',
  'مراكش / Marrakech',
  'فاس / Fès',
  'طنجة / Tanger',
  'أكادير / Agadir',
  'وجدة / Oujda',
];

/** French labels for the city chips — the stored `city` value stays canonical. */
const CITY_FR: Record<string, string> = {
  'الدار البيضاء (Casablanca)': 'Casablanca',
  'الرباط / Rabat': 'Rabat',
  'مراكش / Marrakech': 'Marrakech',
  'فاس / Fès': 'Fès',
  'طنجة / Tanger': 'Tanger',
  'أكادير / Agadir': 'Agadir',
  'وجدة / Oujda': 'Oujda',
};

const DUMMY_NAME = 'التلميذ الجديد';
const DUMMY_NAME_FR = 'Nouvel élève';

export default function SignupScreen({
  onBack,
  onLogin,
}: {
  onBack: () => void;
  onLogin: () => void;
}) {
  const { state, signIn } = useStore();
  const { lang } = useI18n();
  const l = useLayout(lang);
  const rtl = lang === 'ar';
  const [step, setStep] = useState(1);

  // step 1
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);

  // step 2
  const [levelId, setLevelId] = useState('bac');
  const [city, setCity] = useState(CITIES[0]);

  // step 3
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // return-key focus chaining (step 1)
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const level = LEVELS.find((l) => l.id === levelId)!;

  /** City chips are stored with their canonical (Arabic-first) value; only the label flips. */
  const cityLabel = (value: string) => (rtl ? value : CITY_FR[value] ?? value);

  const strength = useMemo(() => {
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    if (!password) return { score: 0, label: '', color: colors.line };
    if (s <= 1) return { score: 1, label: rtl ? 'ضعيفة' : 'Faible', color: colors.danger };
    if (s <= 2) return { score: 2, label: rtl ? 'متوسطة' : 'Moyenne', color: colors.accent };
    return { score: 3, label: rtl ? 'قوية' : 'Fort', color: colors.success };
  }, [password, rtl]);

  /** First student with an active enrollment — the demo "signed-in" account. */
  const targetId = useMemo(() => {
    const active = state.students.find((s) =>
      state.enrollments.some((e) => e.studentId === s.id && e.status === 'active'),
    );
    return (active ?? state.students[0])?.id;
  }, [state.students, state.enrollments]);

  const next = () => {
    if (step === 1) {
      const e: Record<string, string> = {};
      if (!name.trim()) e.name = rtl ? 'أدخل اسمك الكامل.' : 'Entrez votre nom complet.';
      if (!email.trim()) e.email = rtl ? 'أدخل بريدك الإلكتروني.' : 'Entrez votre adresse e-mail.';
      if (!password) e.password = rtl ? 'أنشئ كلمة سر.' : 'Créez un mot de passe.';
      setErrors(e);
      if (Object.keys(e).length) return;
    }
    setErrors({});
    setStep((s) => Math.min(3, s + 1));
  };

  const finish = () => {
    if (!agreed) {
      setErrors({
        agreed: rtl
          ? 'يجب الموافقة على الشروط وسياسة الخصوصية.'
          : 'Vous devez accepter les conditions et la politique de confidentialité.',
      });
      return;
    }
    if (targetId) signIn(targetId);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <AuthAppBar
        title={rtl ? 'إنشاء حساب' : 'Créer un compte'}
        onBack={() => (step > 1 ? setStep(step - 1) : onBack())}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Stepper step={step} total={3} />

          {/* ---------------- STEP 1: about you ---------------- */}
          {step === 1 ? (
            <View style={{ gap: spacing.lg, marginTop: spacing.xl }}>
              <AppText size={17} weight="bold" tone="ink">
                {rtl ? 'معلوماتك الشخصية' : 'Vos informations personnelles'}
              </AppText>
              <LabeledField
                label={rtl ? 'الاسم الكامل' : 'Nom complet'}
                icon="person-outline"
                value={name}
                onChangeText={setName}
                placeholder={rtl ? 'مثال: يوسف الإدريسي' : 'Ex : Youssef El Idrissi'}
                autoComplete="name"
                textContentType="name"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => emailRef.current?.focus()}
                error={errors.name}
              />
              <LabeledField
                inputRef={emailRef}
                label={rtl ? 'البريد الإلكتروني' : 'Adresse e-mail'}
                icon="mail-outline"
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => phoneRef.current?.focus()}
                error={errors.email}
              />
              <LabeledField
                inputRef={phoneRef}
                label={rtl ? 'رقم هاتف التلميذ' : "Numéro de téléphone de l'élève"}
                icon="call-outline"
                prefix="+212"
                value={phone}
                onChangeText={setPhone}
                placeholder="6 12 34 56 78"
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
              <LabeledField
                inputRef={passwordRef}
                label={rtl ? 'كلمة السر' : 'Mot de passe'}
                icon="lock-closed-outline"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry={secure}
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="done"
                submitBehavior="blurAndSubmit"
                error={errors.password}
                accessibilityHint={
                  rtl
                    ? '8 أحرف على الأقل مع رقم وحرف خاص'
                    : 'Au moins 8 caractères avec un chiffre et un caractère spécial'
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
              {password ? (
                <View
                  style={{ gap: 6 }}
                  accessible
                  accessibilityLabel={
                    rtl
                      ? `قوة كلمة السر: ${strength.label}`
                      : `Force du mot de passe : ${strength.label}`
                  }
                >
                  <View style={styles.strengthTrack} importantForAccessibility="no">
                    <View
                      style={[
                        styles.strengthFill,
                        { width: `${(strength.score / 3) * 100}%`, backgroundColor: strength.color },
                      ]}
                    />
                  </View>
                  <AppText size={12} weight="semibold" style={{ color: strength.color }} importantForAccessibility="no">
                    {rtl ? `قوة كلمة السر: ${strength.label}` : `Force du mot de passe : ${strength.label}`}
                  </AppText>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* ---------------- STEP 2: level select ---------------- */}
          {step === 2 ? (
            <View style={{ gap: spacing.lg, marginTop: spacing.xl }}>
              <AppText size={17} weight="bold" tone="ink">
                {rtl ? 'مسارك الدراسي' : 'Votre parcours scolaire'}
              </AppText>
              <AppText size={13} tone="muted" style={{ lineHeight: 20 }}>
                {rtl
                  ? 'الموسم الدراسي 2024 / 2025 — اختر مستواك الدراسي لمواءمة المقررات.'
                  : 'Année scolaire 2024 / 2025 — choisissez votre niveau pour adapter les cours.'}
              </AppText>

              <AppText size={13.5} weight="semibold" tone="ink">
                {rtl ? 'الأسلاك التعليمية' : "Cycles d'enseignement"}
              </AppText>
              <View style={{ gap: spacing.sm }}>
                {LEVELS.map((lv) => {
                  const selected = lv.id === levelId;
                  return (
                    <Pressable
                      key={lv.id}
                      onPress={() => setLevelId(lv.id)}
                      style={({ pressed }) => [
                        l.row,
                        styles.levelRow,
                        selected && styles.levelRowActive,
                        pressed && !selected && { opacity: 0.75 },
                      ]}
                      accessible
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`${rtl ? lv.title.ar : lv.title.fr} — ${rtl ? lv.sub.ar : lv.sub.fr}`}
                    >
                      <View style={[styles.levelIcon, selected && { backgroundColor: colors.brand }]} importantForAccessibility="no">
                        <Ionicons
                          name={lv.icon}
                          size={22}
                          color={selected ? colors.white : colors.brand}
                        />
                      </View>
                      <View style={{ flex: 1, gap: 2 }} importantForAccessibility="no">
                        <AppText size={15} weight="bold" tone="ink">
                          {rtl ? lv.title.ar : lv.title.fr}
                        </AppText>
                        <AppText size={12} tone="muted">
                          {rtl ? lv.sub.ar : lv.sub.fr}
                        </AppText>
                      </View>
                      <Ionicons
                        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                        size={22}
                        color={selected ? colors.brand : colors.lineStrong}
                        importantForAccessibility="no"
                      />
                    </Pressable>
                  );
                })}
              </View>

              <AppText size={13.5} weight="semibold" tone="ink" style={{ marginTop: spacing.sm }}>
                {rtl ? 'المدينة (الأكاديمية الجهوية)' : 'Ville (Académie régionale)'}
              </AppText>
              <View style={[l.row, styles.cityWrap]}>
                {CITIES.map((c) => {
                  const selected = c === city;
                  return (
                    <Pressable
                      key={c}
                      onPress={() => setCity(c)}
                      style={({ pressed }) => [
                        styles.cityChip,
                        selected && styles.cityChipActive,
                        pressed && !selected && { opacity: 0.7 },
                      ]}
                      accessible
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      accessibilityLabel={cityLabel(c)}
                    >
                      <AppText
                        size={12.5}
                        weight={selected ? 'bold' : 'medium'}
                        tone={selected ? 'white' : 'body'}
                      >
                        {cityLabel(c)}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* ---------------- STEP 3: confirm ---------------- */}
          {step === 3 ? (
            <View style={{ gap: spacing.lg, marginTop: spacing.xl }}>
              <AppText size={17} weight="bold" tone="ink">
                {rtl ? 'تأكيد حسابك' : 'Confirmez votre compte'}
              </AppText>

              <View style={styles.summary}>
                <SummaryRow
                  label={rtl ? 'الاسم الكامل' : 'Nom complet'}
                  value={name || (rtl ? DUMMY_NAME : DUMMY_NAME_FR)}
                  onEdit={() => setStep(1)}
                />
                <SummaryRow
                  label={rtl ? 'البريد الإلكتروني' : 'Adresse e-mail'}
                  value={email || 'name@example.com'}
                  onEdit={() => setStep(1)}
                />
                {phone ? (
                  <SummaryRow
                    label={rtl ? 'الهاتف' : 'Téléphone'}
                    value={`+212 ${phone}`}
                    onEdit={() => setStep(1)}
                  />
                ) : null}
                <SummaryRow
                  label={rtl ? 'المستوى' : 'Niveau'}
                  value={rtl ? level.title.ar : level.title.fr}
                  onEdit={() => setStep(2)}
                />
                <SummaryRow
                  label={rtl ? 'المدينة' : 'Ville'}
                  value={cityLabel(city)}
                  last
                  onEdit={() => setStep(2)}
                />
              </View>

              <Pressable
                onPress={() => setAgreed((a) => !a)}
                style={({ pressed }) => [l.row, styles.agreeRow, pressed && { opacity: 0.7 }]}
                accessible
                accessibilityRole="checkbox"
                accessibilityState={{ checked: agreed }}
                accessibilityLabel={
                  rtl
                    ? 'أوافق على الشروط والأحكام وسياسة الخصوصية'
                    : "J'accepte les conditions générales et la politique de confidentialité"
                }
              >
                <Ionicons
                  name={agreed ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={agreed ? colors.brand : colors.lineStrong}
                  importantForAccessibility="no"
                />
                <AppText size={13.5} tone="body" style={{ flex: 1, lineHeight: 20 }} importantForAccessibility="no">
                  {rtl
                    ? 'أوافق على الشروط والأحكام وسياسة الخصوصية.'
                    : "J'accepte les conditions générales et la politique de confidentialité."}
                </AppText>
              </Pressable>
              {errors.agreed ? (
                <AppText
                  size={12.5}
                  weight="semibold"
                  tone="danger"
                  accessibilityLiveRegion="polite"
                  accessibilityRole="alert"
                >
                  {errors.agreed}
                </AppText>
              ) : null}
            </View>
          ) : null}

          {/* ---------------- bottom bar ---------------- */}
          <View style={[l.row, styles.bottomBar]}>
            {step > 1 ? (
              <Pressable
                onPress={() => setStep((s) => s - 1)}
                hitSlop={8}
                style={({ pressed }) => [l.row, styles.backLink, pressed && { opacity: 0.6 }]}
                accessible
                accessibilityRole="button"
                accessibilityLabel={rtl ? 'الخطوة السابقة' : 'Étape précédente'}
              >
                <Ionicons
                  name={rtl ? 'arrow-forward' : 'arrow-back'}
                  size={16}
                  color={colors.muted}
                  importantForAccessibility="no"
                />
                <AppText size={14} weight="semibold" tone="muted">
                  {rtl ? 'السابق' : 'Précédent'}
                </AppText>
              </Pressable>
            ) : (
              <View />
            )}

            {step < 3 ? (
              <PrimaryButton label={rtl ? 'التالي' : 'Suivant'} onPress={next} style={{ flex: 1 }} />
            ) : (
              <PrimaryButton
                label={rtl ? 'إنشاء الحساب' : 'Créer le compte'}
                onPress={finish}
                style={{ flex: 1 }}
              />
            )}
          </View>

          <Pressable
            onPress={onLogin}
            hitSlop={8}
            style={({ pressed }) => [l.row, styles.switch, pressed && { opacity: 0.6 }]}
            accessible
            accessibilityRole="link"
            accessibilityLabel={rtl ? 'تسجيل الدخول' : 'Se connecter'}
          >
            <AppText size={14} tone="muted">
              {rtl ? 'لديك حساب بالفعل؟' : 'Vous avez déjà un compte ?'}{' '}
            </AppText>
            <AppText size={14} weight="bold" tone="brand">
              {rtl ? 'تسجيل الدخول' : 'Se connecter'}
            </AppText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SummaryRow({
  label,
  value,
  last,
  onEdit,
}: {
  label: string;
  value: string;
  last?: boolean;
  /** The pencil promised editing — tapping the row returns to that step. */
  onEdit: () => void;
}) {
  const { lang } = useI18n();
  const l = useLayout(lang);
  const rtl = lang === 'ar';
  return (
    <Pressable
      onPress={onEdit}
      style={({ pressed }) => [
        l.row,
        styles.summaryRow,
        last && { borderBottomWidth: 0 },
        pressed && { opacity: 0.65 },
      ]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={rtl ? `تعديل ${label}: ${value}` : `Modifier ${label} : ${value}`}
    >
      <AppText size={13} tone="muted" importantForAccessibility="no">
        {label}
      </AppText>
      <AppText
        size={13.5}
        weight="semibold"
        tone="ink"
        style={{ flex: 1, textAlign: 'left' }}
        importantForAccessibility="no"
      >
        {value}
      </AppText>
      <Ionicons name="create-outline" size={16} color={colors.brand} importantForAccessibility="no" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl },

  strengthTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  strengthFill: { height: '100%', borderRadius: 3 },

  levelRow: {
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  levelRowActive: { borderColor: colors.brand, backgroundColor: colors.brandSofter },
  levelIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.brandSofter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityWrap: { flexWrap: 'wrap', gap: spacing.sm },
  cityChip: {
    borderRadius: radius.pill,
    borderWidth: 1.2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
  },
  cityChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },

  summary: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing.md,
  },
  summaryRow: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  agreeRow: {
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.brandSofter,
    borderRadius: radius.sm + 2,
    padding: spacing.md,
  },

  bottomBar: {
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  backLink: { alignItems: 'center', gap: 5, paddingVertical: 12 },
  switch: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
});
