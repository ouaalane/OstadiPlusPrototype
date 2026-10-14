/**
 * Profile — who is signed in, their access status, and the demo-data tools
 * (sync payload import, account switch, reset).
 */

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { relativeTime } from '@ostadiplus/shared';

import { AppText, Card, Pill, PrimaryButton } from '../components/ui';
import { bundledAssetCount } from '../media/lookup';
import { useStore } from '../store/StudentStore';
import { colors, fonts, radius, rtl, spacing } from '../theme';

const STATUS_META = {
  active: { text: 'نشطة', tone: 'success' as const },
  pending: { text: 'بانتظار التفعيل', tone: 'warning' as const },
  suspended: { text: 'موقوفة', tone: 'danger' as const },
  none: { text: 'غير مشترك', tone: 'neutral' as const },
};

export default function ProfileScreen() {
  const { state, me, signOut, importPayload, resetDemo, lastSyncedAt } = useStore();
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState('');
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (!me) return null;

  const enrollments = state.enrollments.filter((e) => e.studentId === me.id);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.identity}>
          <View style={styles.mono}>
            <AppText size={20} weight="bold" tone="white">
              {me.monogram}
            </AppText>
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <AppText size={18} weight="bold" tone="ink">
              {me.fullName}
            </AppText>
            <AppText size={12.5} tone="muted">
              {me.level} · {state.teacher.centerName}
            </AppText>
            <AppText size={12.5} tone="muted">
              {me.phone}
            </AppText>
          </View>
        </Card>

        <AppText size={16} weight="bold" tone="ink" style={styles.sectionTitle}>
          اشتراكاتي
        </AppText>

        {enrollments.length === 0 ? (
          <Card>
            <AppText size={13.5} tone="muted">
              لا اشتراكات في حسابك بعد — تواصل مع الأستاذ لتفعيل وصولك.
            </AppText>
          </Card>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {enrollments.map((enrollment) => {
              const course = state.courses.find((c) => c.id === enrollment.courseId);
              if (!course) return null;
              const meta = STATUS_META[enrollment.status];
              return (
                <Card key={enrollment.id} style={rtl.rowBetween}>
                  <View style={{ flex: 1, gap: 3 }}>
                    <AppText size={14} weight="semibold" tone="ink" numberOfLines={1}>
                      {course.title}
                    </AppText>
                    <AppText size={11.5} tone="muted">
                      {enrollment.status === 'active'
                        ? `مفعّلة منذ ${relativeTime(enrollment.authorizedAt)}`
                        : 'بانتظار قرار الأستاذ'}
                    </AppText>
                  </View>
                  <Pill label={meta.text} tone={meta.tone} dot />
                </Card>
              );
            })}
          </View>
        )}

        <AppText size={16} weight="bold" tone="ink" style={styles.sectionTitle}>
          بيانات العرض
        </AppText>

        <Card style={{ gap: spacing.md }}>
          <Pressable onPress={() => setOpen((value) => !value)} hitSlop={8} style={rtl.rowBetween}>
            <View style={[rtl.row, { flex: 1, gap: spacing.sm }]}>
              <Ionicons name="sync" size={16} color={colors.brand} />
              <AppText size={14} weight="semibold" tone="ink">
                مزامنة مع لوحة الأستاذ
              </AppText>
            </View>
            <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.faint} />
          </Pressable>

          {lastSyncedAt ? (
            <AppText size={11.5} tone="success">
              آخر مزامنة: {relativeTime(lastSyncedAt)}
            </AppText>
          ) : null}

          {open ? (
            <>
              <AppText size={12.5} tone="muted" style={{ lineHeight: 20 }}>
                الصق هنا رمز المزامنة الذي نسخه الأستاذ من الإعدادات، لتحصل على أحدث دوراته
                وإعلاناته.
              </AppText>
              <TextInput
                style={styles.input}
                multiline
                value={payload}
                onChangeText={(text) => {
                  setPayload(text);
                  setMessage(null);
                }}
                placeholder="OSTADI1:…"
                placeholderTextColor={colors.faint}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {message ? (
                <AppText
                  size={12.5}
                  weight="semibold"
                  tone={message.tone === 'ok' ? 'brand' : 'danger'}
                >
                  {message.text}
                </AppText>
              ) : null}
              <PrimaryButton
                label={busy ? 'جارٍ المزامنة…' : 'لصق ومزامنة'}
                onPress={async () => {
                  try {
                    setBusy(true);
                    await importPayload(payload);
                    setMessage({ tone: 'ok', text: 'تمت المزامنة مع بيانات الأستاذ ✓' });
                  } catch {
                    setMessage({ tone: 'error', text: 'الرمز غير صالح — تأكد من نسخه كاملاً.' });
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </>
          ) : null}

          <View style={styles.divider} />

          <PrimaryButton label="تغيير الحساب" variant="outline" compact onPress={signOut} />
          <PrimaryButton
            label="إعادة تعيين بيانات العرض"
            variant="danger"
            compact
            onPress={resetDemo}
          />

          <AppText size={11} tone="faint" style={{ textAlign: 'center' }}>
            OstadiPlus · نسخة العرض · {bundledAssetCount()} وسائط مدمجة داخل التطبيق
          </AppText>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  identity: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.md },
  mono: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { marginTop: spacing.xl, marginBottom: spacing.sm },
  divider: { height: 1, backgroundColor: colors.line },
  input: {
    minHeight: 84,
    // a full sync payload is ~4.8 KB — without a cap the multiline field
    // grows past the button (and the screen); scroll inside instead.
    maxHeight: 132,
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
});
