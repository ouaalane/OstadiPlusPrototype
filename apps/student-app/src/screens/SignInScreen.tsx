/**
 * Sign-in — the prototype's "auth".
 *
 * There is no account system: the demo dataset already contains the students
 * the teacher manages, so the student simply picks their own name (exactly
 * what an invited pupil would see after opening their invite link).
 *
 * This screen is also where a fresh device pulls the teacher's latest data by
 * pasting the sync payload copied from the dashboard.
 */

import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Card, Pill, PrimaryButton } from '../components/ui';
import { useStore } from '../store/StudentStore';
import { colors, fonts, radius, rtl, spacing } from '../theme';

export default function SignInScreen() {
  const { state, signIn, importPayload, resetDemo } = useStore();
  const [syncOpen, setSyncOpen] = useState(false);
  const [payload, setPayload] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState(false);

  const students = useMemo(() => {
    return state.students.map((student) => {
      const enrollments = state.enrollments.filter((e) => e.studentId === student.id);
      const active = enrollments.filter((e) => e.status === 'active').length;
      const pending = enrollments.filter((e) => e.status === 'pending').length;
      return { student, active, pending };
    });
  }, [state.students, state.enrollments]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Image source={require('../../assets/logo.png')} style={styles.logo} />
          <AppText size={24} weight="bold" tone="ink">
            OstadiPlus
          </AppText>
          <AppText size={14} tone="muted">
            تطبيق التلاميذ · مركز الأطلس للدروس
          </AppText>
        </View>

        <AppText size={16} weight="bold" tone="ink" style={styles.sectionTitle}>
          اختر حسابك للدخول
        </AppText>
        <AppText size={13} tone="muted" style={{ marginBottom: spacing.md }}>
          اختر اسمك لتظهر لك دوراتك وتقدّمك. تغيير الحساب متاح لاحقاً من «ملفي».
        </AppText>

        <View style={{ gap: spacing.sm }}>
          {students.map(({ student, active, pending }, index) => (
            <Pressable
              key={student.id}
              onPress={() => signIn(student.id)}
              style={({ pressed }) => [styles.studentRow, pressed && { opacity: 0.7 }]}
            >
              <View style={styles.mono}>
                <AppText size={15} weight="bold" tone="white">
                  {student.monogram}
                </AppText>
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <AppText size={15} weight="semibold" tone="ink">
                  {student.fullName}
                </AppText>
                <AppText size={12} tone="muted">
                  {student.level}
                  {active > 0 ? ` · ${active} دورة نشطة` : ' · بلا وصول نشط'}
                </AppText>
              </View>
              {active > 0 ? (
                <Pill label="جاهز" tone="success" dot />
              ) : pending > 0 ? (
                <Pill label="معلّ" tone="warning" dot />
              ) : (
                <Pill label="بلا دورة" tone="neutral" />
              )}
              <AppText size={12} tone="faint">
                دخول ›
              </AppText>
            </Pressable>
          ))}
        </View>

        <View style={styles.footer}>
          <Pressable onPress={() => setSyncOpen((open) => !open)} hitSlop={8}>
            <AppText size={13.5} weight="semibold" tone="brand">
              {syncOpen ? 'إخفاء المزامنة' : 'مزامنة بيانات الأستاذ؟'}
            </AppText>
          </Pressable>

          {syncOpen ? (
            <Card style={{ marginTop: spacing.md, gap: spacing.md }}>
              <AppText size={13} tone="muted" style={{ lineHeight: 20 }}>
                انسخ «رمز المزامنة» من لوحة الأستاذ (الإعدادات) والصقه هنا لتحصل على نفس
                الدورات والإعلانات، حتى بعد أن ينشر الأستاذ درساً جديداً.
              </AppText>
              <TextInput
                style={styles.input}
                multiline
                value={payload}
                onChangeText={(text) => {
                  setPayload(text);
                  setError(null);
                }}
                placeholder="OSTADI1:…"
                placeholderTextColor={colors.faint}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {error ? (
                <AppText size={12.5} weight="semibold" tone="danger">
                  {error}
                </AppText>
              ) : null}
              <View style={rtl.row}>
                <PrimaryButton
                  label={imported ? 'تمت المزامنة ✓' : busy ? 'جارٍ المزامنة…' : 'لصق ومزامنة'}
                  onPress={async () => {
                    if (!payload.trim()) {
                      setError('الصق رمز المزامنة أولاً.');
                      return;
                    }
                    try {
                      setBusy(true);
                      await importPayload(payload);
                      setImported(true);
                      setError(null);
                    } catch {
                      setError('الرمز غير صالح — تأكد من نسخه كاملاً.');
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
              </View>
            </Card>
          ) : null}

          <Pressable onPress={resetDemo} hitSlop={8} style={{ marginTop: spacing.lg }}>
            <AppText size={12.5} tone="faint">
              إعادة تعيين بيانات العرض
            </AppText>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl },
  header: { alignItems: 'center', gap: 6, marginBottom: spacing.xxl },
  logo: { width: 76, height: 76, borderRadius: 18, marginBottom: spacing.sm },
  sectionTitle: { marginBottom: 4 },
  studentRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
  },
  mono: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    minHeight: 92,
    borderWidth: 1.2,
    borderColor: colors.line,
    borderRadius: radius.sm + 2,
    padding: spacing.md,
    textAlignVertical: 'top',
    writingDirection: 'rtl',
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.ink,
    backgroundColor: colors.surfaceAlt,
  },
  footer: { marginTop: spacing.xxl, alignItems: 'center' },
});
