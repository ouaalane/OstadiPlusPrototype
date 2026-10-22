import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { AppText, AuthAppBar, Card, LabeledField, PrimaryButton, SelectField } from '../components/ui';
import { useStore } from '../store/StudentStore';
import { useI18n } from '../i18n/useI18n';
import { LEVELS } from '../lib/education-levels';
import { changeLocalPassword, hasLocalPassword } from '../lib/local-password';
import { latinDigits, profileErrors, type ProfileDetails } from '../lib/profile-details';
import { colors, spacing } from '../theme';

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const { me, state, myCourses, updateProfile } = useStore();
  const { lang } = useI18n();
  const rtl = lang === 'ar';
  const [fullName, setName] = useState(me?.fullName ?? '');
  const [email, setEmail] = useState(me?.email ?? '');
  const [phone, setPhone] = useState(me?.phone ?? '');
  const [age, setAge] = useState(me?.age?.toString() ?? '');
  const [level, setLevel] = useState(me?.level ?? '');
  const [studentType, setStudentType] = useState(me?.studentType ?? 'moutamadris');
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState('');

  useEffect(() => {
    if (!me?.id) return;
    let cancelled = false;
    hasLocalPassword(me.id).then(value => { if (!cancelled) setHasPassword(value); }).catch(() => {
      if (!cancelled) setBanner(lang === 'ar' ? 'تعذّر تحميل معلومات الحساب. افتح الصفحة من جديد.' : 'Chargement impossible. Rouvrez cette page.');
    });
    return () => { cancelled = true; };
  }, [me?.id, lang]);

  const levelOptions = LEVELS.map(item => ({ value: item.title[lang], label: item.title[lang] }));
  if (level && !levelOptions.some(item => item.value === level)) levelOptions.unshift({ value: level, label: level });
  const messages: Record<string, string> = {
    name: rtl ? 'أدخل اسمك الكامل.' : 'Entrez votre nom complet.',
    email: rtl ? 'أدخل بريداً إلكترونياً صالحاً.' : 'Entrez une adresse e-mail valide.',
    duplicate: rtl ? 'هذا البريد مرتبط بحساب آخر.' : 'Cette adresse appartient à un autre compte.',
    phone: rtl ? 'أدخل رقم هاتف صالحاً.' : 'Entrez un numéro de téléphone valide.',
    age: rtl ? 'أدخل عمراً بين 1 و120 سنة.' : 'Entrez un âge entier entre 1 et 120 ans.',
    level: rtl ? 'اختر المستوى الدراسي.' : 'Choisissez votre niveau scolaire.',
  };
  const selectLabels = {
    placeholder: rtl ? 'اختر' : 'Choisir', searchPlaceholder: rtl ? 'بحث' : 'Rechercher',
    emptyText: rtl ? 'لا توجد نتائج' : 'Aucun résultat', clearLabel: rtl ? 'مسح البحث' : 'Effacer la recherche',
    closeLabel: rtl ? 'إغلاق' : 'Fermer',
  };

  const save = async () => {
    if (!me || saving || hasPassword === null) return;
    const details: ProfileDetails = { fullName, email, phone, level, studentType, age: age.trim() ? Number(latinDigits(age)) : undefined };
    const validation = profileErrors(details, state.students, me.id);
    const next = Object.fromEntries(Object.entries(validation).map(([field, code]) => [field, messages[code]]));
    const changingPassword = Boolean(currentPassword || newPassword || confirmation);
    if (changingPassword) {
      if (hasPassword && !currentPassword) next.currentPassword = rtl ? 'أدخل كلمة السر الحالية.' : 'Entrez le mot de passe actuel.';
      if (newPassword.length < 8) next.newPassword = rtl ? 'استعمل 8 أحرف على الأقل.' : 'Utilisez au moins 8 caractères.';
      if (newPassword !== confirmation) next.confirmation = rtl ? 'كلمتا السر غير متطابقتين.' : 'Les mots de passe ne correspondent pas.';
    }
    setErrors(next); setBanner('');
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      if (changingPassword && !await changeLocalPassword(me.id, currentPassword, newPassword)) {
        setErrors({ currentPassword: rtl ? 'كلمة السر الحالية غير صحيحة.' : 'Le mot de passe actuel est incorrect.' });
        return;
      }
      if (!updateProfile(details)) {
        setBanner(rtl ? 'تعذّر حفظ المعلومات. راجع الحقول وحاول من جديد.' : 'Vérifiez les champs et réessayez.');
        return;
      }
      navigation.goBack();
    } catch (error) {
      setBanner(error instanceof Error && error.message === 'PASSWORD_BUILD_REQUIRED'
        ? (rtl ? 'حدّث نسخة التطبيق لتغيير كلمة السر.' : 'Mettez à jour l’application pour modifier le mot de passe.')
        : (rtl ? 'تعذّر الحفظ. حاول مرة أخرى.' : 'Enregistrement impossible. Réessayez.'));
    } finally { setSaving(false); }
  };

  if (!me) return null;
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <AuthAppBar title={rtl ? 'تعديل الملف الشخصي' : 'Modifier mon profil'} onBack={() => { if (!saving) navigation.goBack(); }} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {banner ? <AppText tone="danger" accessibilityRole="alert">{banner}</AppText> : null}
          <View pointerEvents={saving ? 'none' : 'auto'} style={styles.fields}>
            <Card style={styles.fields}>
              <AppText size={18} weight="bold">{rtl ? 'معلوماتي الشخصية' : 'Mes informations personnelles'}</AppText>
              <LabeledField label={rtl ? 'الاسم الكامل' : 'Nom complet'} value={fullName} onChangeText={setName} icon="person-outline" autoComplete="name" error={errors.fullName} required />
              <LabeledField label={rtl ? 'البريد الإلكتروني' : 'Adresse e-mail'} value={email} onChangeText={setEmail} icon="mail-outline" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} error={errors.email} required />
              <LabeledField label={rtl ? 'رقم الهاتف' : 'Numéro de téléphone'} value={phone} onChangeText={setPhone} icon="call-outline" keyboardType="phone-pad" autoComplete="tel" error={errors.phone} />
              <LabeledField label={rtl ? 'العمر (اختياري)' : 'Âge (facultatif)'} value={age} onChangeText={setAge} icon="calendar-outline" keyboardType="number-pad" maxLength={3} error={errors.age} />
              <SelectField {...selectLabels} label={rtl ? 'المستوى الدراسي' : 'Niveau scolaire'} sheetTitle={rtl ? 'المستوى الدراسي' : 'Niveau scolaire'} icon="school-outline" value={level || null} options={levelOptions} onSelect={setLevel} error={errors.level} required />
              <SelectField {...selectLabels} label={rtl ? 'نوع التلميذ' : 'Statut scolaire'} sheetTitle={rtl ? 'نوع التلميذ' : 'Statut scolaire'} value={studentType}
                options={[{ value: 'moutamadris', label: rtl ? 'متمدرس' : 'Scolarisé' }, { value: 'bac-libre', label: rtl ? 'باك حر' : 'Bac libre' }]}
                onSelect={value => setStudentType(value as 'bac-libre' | 'moutamadris')} />
              <AppText size={12.5} tone="muted">{rtl ? 'المركز' : 'Centre'}: {myCourses.length ? `${state.teacher.centerName} · ${state.teacher.centerCity}` : (rtl ? 'لم يتم الربط بمركز بعد' : 'Aucun centre pour le moment')}</AppText>
              <AppText size={12.5} tone="muted">{rtl ? 'رمز الطالب' : 'Code étudiant'}: {me.studentCode}</AppText>
            </Card>
            <Card style={styles.fields}>
              <AppText size={18} weight="bold">{rtl ? 'تغيير كلمة السر' : 'Changer le mot de passe'}</AppText>
              <AppText size={13} tone="muted">{rtl ? 'اترك هذه الخانات فارغة للاحتفاظ بكلمة السر الحالية.' : 'Laissez ces champs vides pour conserver votre mot de passe.'}</AppText>
              {hasPassword ? <LabeledField label={rtl ? 'كلمة السر الحالية' : 'Mot de passe actuel'} value={currentPassword} onChangeText={setCurrent} secureTextEntry autoCapitalize="none" autoComplete="current-password" error={errors.currentPassword} /> : null}
              {hasPassword === false ? <AppText size={12.5} tone="muted">{rtl ? 'لم تُحدّد كلمة سر لهذا الحساب بعد. يمكنك تعيينها الآن.' : 'Aucun mot de passe défini pour ce compte. Vous pouvez en choisir un maintenant.'}</AppText> : null}
              <LabeledField label={rtl ? 'كلمة السر الجديدة' : 'Nouveau mot de passe'} value={newPassword} onChangeText={setNew} secureTextEntry autoCapitalize="none" autoComplete="new-password" error={errors.newPassword} />
              <LabeledField label={rtl ? 'تأكيد كلمة السر' : 'Confirmer le mot de passe'} value={confirmation} onChangeText={setConfirmation} secureTextEntry autoCapitalize="none" autoComplete="new-password" error={errors.confirmation} />
            </Card>
          </View>
          <PrimaryButton label={rtl ? 'حفظ التعديلات' : 'Enregistrer les modifications'} onPress={save} busy={saving} disabled={hasPassword === null} />
          <PrimaryButton label={rtl ? 'إلغاء' : 'Annuler'} variant="soft" disabled={saving} onPress={() => navigation.goBack()} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas }, flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg },
  fields: { gap: spacing.lg },
});
