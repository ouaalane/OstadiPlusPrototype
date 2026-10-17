/**
 * Digital student card (QR) — the Stitch «بطاقة الطالب الرقمية» screen.
 *
 * Header with the brand + student identity, a white card holding a QR-style
 * code that encodes the student's unique ID (shown with a copy button), an
 * info note, «تحديث الحالة» / «مشاركة الرمز» actions, then a bottom nav.
 *
 * The code is rendered as a deterministic module matrix (three finder
 * patterns + ID-seeded data modules) since no QR-encoding library ships with
 * the prototype — visually identical to the Stitch design.
 */

import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';

import { AppText, Pill } from '../components/ui';
import { useI18n } from '../i18n/useI18n';
import { useLayout } from '../i18n/layout';
import { useStore } from '../store/StudentStore';
import { colors, radius, shadow, spacing } from '../theme';

const GRID = 21; // modules per side (QR v1 size)
const FINDER = 7;

/** Deterministic 0/1 matrix seeded from the student's unique ID. */
function buildMatrix(seedStr: string): number[][] {
  // xorshift PRNG seeded from the string
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rnd = () => {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5; h |= 0;
    return (h >>> 0) / 4294967296;
  };

  const m: number[][] = Array.from({ length: GRID }, () => Array(GRID).fill(0));

  const inFinder = (r: number, c: number) =>
    (r < FINDER && c < FINDER) ||
    (r < FINDER && c >= GRID - FINDER) ||
    (r >= GRID - FINDER && c < FINDER);

  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      if (inFinder(r, c)) continue;
      m[r][c] = rnd() > 0.5 ? 1 : 0;
    }
  }

  // Finder patterns (7x7 ring + 3x3 core) at three corners.
  const drawFinder = (r0: number, c0: number) => {
    for (let r = 0; r < FINDER; r++) {
      for (let c = 0; c < FINDER; c++) {
        const edge = r === 0 || r === FINDER - 1 || c === 0 || c === FINDER - 1;
        const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        m[r0 + r][c0 + c] = edge || core ? 1 : 0;
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(0, GRID - FINDER);
  drawFinder(GRID - FINDER, 0);

  // Timing patterns.
  for (let i = 8; i < GRID - 8; i++) {
    m[6][i] = i % 2 === 0 ? 1 : 0;
    m[i][6] = i % 2 === 0 ? 1 : 0;
  }
  return m;
}

export default function StudentCardScreen({ onBack }: { onBack: () => void }) {
  const { state, me } = useStore();
  const { lang } = useI18n();
  const l = useLayout(lang);
  const rtl = lang === 'ar';
  const [copied, setCopied] = useState(false);

  /** The real, opaque student code (UST-XXXXX) shown as QR and typed at the
   *  center desk. It is an identifier only — authorization is always verified
   *  by the store, never implied by possession of the code. */
  const studentCode = me?.studentCode ?? '';

  const matrix = useMemo(() => buildMatrix(studentCode), [studentCode]);
  const pending = !state.enrollments.some((e) => e.studentId === me?.id && e.status === 'active');

  const enrollment = state.enrollments.find((e) => e.studentId === me?.id);

  /** Real clipboard copy + a 2s «تم النسخ» confirmation. */
  const copyId = async () => {
    try {
      await Clipboard.setStringAsync(studentCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      Alert.alert(
        rtl ? 'تعذّر النسخ' : 'Copie impossible',
        rtl
          ? 'انسخ المعرف يدوياً من البطاقة.'
          : 'Copiez l’identifiant manuellement depuis la carte.',
      );
    }
  };

  return (
    <View style={styles.root}>
      {/* ---- brand gradient header strip ---- */}
      <LinearGradient
        colors={[colors.brand, colors.brandDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <SafeAreaView edges={['top']}>
          <View style={[l.row, styles.headerRow]}>
            <Pressable
              onPress={onBack}
              hitSlop={10}
              style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.6 }]}
              accessible
              accessibilityRole="button"
              accessibilityLabel={rtl ? 'رجوع' : 'Retour'}
            >
              <Ionicons
                name={rtl ? 'arrow-forward' : 'arrow-back'}
                size={20}
                color={colors.ink}
                importantForAccessibility="no"
              />
            </Pressable>
            <View style={{ flex: 1 }}>
              <AppText size={17} weight="bold" tone="white">
                {rtl ? 'بطاقة الطالب الرقمية' : 'Carte étudiant numérique'}
              </AppText>
              <AppText size={12} tone="white" style={{ opacity: 0.8 }}>
                {rtl ? 'دورة 2025' : 'Promotion 2025'}
              </AppText>
            </View>
            <View style={styles.headerBtn}>
              <Ionicons name="qr-code-outline" size={20} color={colors.ink} />
            </View>
          </View>

          {/* identity row */}
          <View style={[l.row, styles.identity]}>
            <View style={styles.avatar}>
              <AppText size={18} weight="bold" tone="white">
                {me?.monogram ?? (rtl ? '؟' : '?')}
              </AppText>
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <AppText size={16} weight="bold" tone="white">
                {me?.fullName ?? '—'}
              </AppText>
              <View style={[l.row, { gap: spacing.sm }]}>
                <AppText size={12.5} tone="white" style={{ opacity: 0.85 }}>
                  {me?.level ?? ''}
                </AppText>
                <Pill
                  label={
                    pending
                      ? rtl
                        ? 'في انتظار التفعيل'
                        : 'En attente d’activation'
                      : rtl
                        ? 'مفعّل'
                        : 'Activé'
                  }
                  tone={pending ? 'warning' : 'success'}
                  dot
                />
              </View>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* ---- QR card ---- */}
        <View style={styles.card}>
          <View style={[l.row, styles.cardHead]}>
            <Ionicons name="qr-code" size={20} color={colors.brand} />
            <AppText size={16} weight="bold" tone="ink">
              {rtl ? 'رمز الطالب' : 'Code étudiant'}
            </AppText>
          </View>

          <AppText size={13} tone="muted" style={{ textAlign: 'center', lineHeight: 21 }}>
            {rtl
              ? 'أظهر الرمز لأستاذك لتفعيل المقرر'
              : 'Présentez ce code à votre enseignant pour activer le cours'}
          </AppText>

          <LinearGradient
            colors={[colors.brand, colors.brandDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.qrFrame}
          >
            <View style={styles.qrInner}>
              <View style={styles.qrGrid}>
                {matrix.map((row, r) => (
                  <View key={r} style={styles.qrRow}>
                    {row.map((cell, c) => (
                      <View
                        key={c}
                        style={[
                          styles.qrCell,
                          { backgroundColor: cell ? colors.ink : 'transparent' },
                        ]}
                      />
                    ))}
                  </View>
                ))}
              </View>
            </View>
          </LinearGradient>

          <View style={[l.row, styles.idBox]}>
            <View style={{ flex: 1, gap: 3 }}>
              <AppText size={11.5} tone="muted">
                {rtl ? 'المعرف الفريد (Unique ID)' : 'Identifiant unique (Unique ID)'}
              </AppText>
              <AppText
                size={16}
                weight="bold"
                tone="ink"
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                style={{ letterSpacing: 0.5 }}
              >
                {studentCode}
              </AppText>
            </View>
            <Pressable
              onPress={copyId}
              style={({ pressed }) => [l.row, styles.copyBtn, pressed && { opacity: 0.65 }]}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={
                copied
                  ? rtl
                    ? 'تم نسخ المعرف الفريد'
                    : 'Identifiant unique copié'
                  : rtl
                    ? 'نسخ المعرف الفريد'
                    : 'Copier l’identifiant unique'
              }
              accessibilityLiveRegion="polite"
            >
              <Ionicons
                name={copied ? 'checkmark' : 'copy-outline'}
                size={18}
                color={colors.brand}
                importantForAccessibility="no"
              />
              <AppText size={12.5} weight="semibold" tone="brand" importantForAccessibility="no">
                {copied ? (rtl ? 'تم النسخ' : 'Copié') : rtl ? 'نسخ' : 'Copier'}
              </AppText>
            </Pressable>
          </View>
        </View>

        {/* ---- info note ---- */}
        <View style={[l.rowTop, styles.note]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.brand} />
          <AppText size={12.5} tone="body" style={{ flex: 1, lineHeight: 21 }}>
            {rtl
              ? 'سيتم فتح الفيديوهات والدروس فور مسح الرمز من طرف الأستاذ.'
              : 'Les vidéos et les leçons seront débloquées dès que votre enseignant aura scanné le code.'}
          </AppText>
        </View>

        {/* ---- actions ---- */}
        <View style={[l.row, styles.actions]}>
          <Pressable
            style={({ pressed }) => [l.row, styles.actionBtn, pressed && { opacity: 0.7 }]}
            onPress={() =>
              Alert.alert(
                rtl ? 'تحديث الحالة' : 'Mettre à jour le statut',
                pending
                  ? rtl
                    ? 'حالة الوصول: في انتظار التفعيل — يفعّلها الأستاذ فور مسح رمزك.'
                    : 'Statut d’accès : en attente d’activation — votre enseignant l’activera dès qu’il aura scanné votre code.'
                  : rtl
                    ? 'حالة الوصول: مفعّلة ✓ — آخر تحديث: الآن.'
                    : 'Statut d’accès : activé ✓ — dernière mise à jour : à l’instant.',
              )
            }
            accessibilityRole="button"
            accessibilityLabel={rtl ? 'تحديث حالة الوصول' : 'Actualiser le statut d’accès'}
          >
            <Ionicons name="sync-outline" size={19} color={colors.brand} importantForAccessibility="no" />
            <AppText size={13.5} weight="semibold" tone="ink" importantForAccessibility="no">
              {rtl ? 'تحديث الحالة' : 'Mettre à jour le statut'}
            </AppText>
          </Pressable>
          <Pressable
            style={({ pressed }) => [l.row, styles.actionBtn, pressed && { opacity: 0.7 }]}
            onPress={() =>
              Share.share({
                message: rtl
                  ? `بطاقة الطالب — أوستادي بلس\nالمعرف الفريد: ${studentCode}\nأظهر هذا الرمز للأستاذ لتفعيل الوصول إلى الدروس.`
                  : `Carte étudiant — Ostadi Plus\nIdentifiant unique : ${studentCode}\nPrésentez ce code à votre enseignant pour activer l’accès aux leçons.`,
              }).catch(() => {})
            }
            accessibilityRole="button"
            accessibilityLabel={rtl ? 'مشاركة رمز الطالب' : 'Partager le code étudiant'}
          >
            <Ionicons name="share-social-outline" size={19} color={colors.brand} importantForAccessibility="no" />
            <AppText size={13.5} weight="semibold" tone="ink" importantForAccessibility="no">
              {rtl ? 'مشاركة الرمز' : 'Partager le code'}
            </AppText>
          </Pressable>
        </View>

        {enrollment ? (
          <View style={styles.metaCard}>
            <View style={[l.row, styles.metaRow]}>
              <AppText size={12.5} tone="muted">
                {rtl ? 'المقرر' : 'Cours'}
              </AppText>
              <AppText size={13.5} weight="semibold" tone="ink" style={[{ flex: 1 }, l.text]}>
                {state.courses.find((c) => c.id === enrollment.courseId)?.title ?? '—'}
              </AppText>
            </View>
            <View style={styles.metaDivider} />
            <View style={[l.row, styles.metaRow]}>
              <AppText size={12.5} tone="muted">
                {rtl ? 'حالة الوصول' : 'Statut d’accès'}
              </AppText>
              <AppText
                size={13.5}
                weight="semibold"
                tone={
                  enrollment.status === 'active' ? 'success' : enrollment.status === 'pending' || enrollment.status === 'requested' ? 'brand' : 'body'
                }
                style={[{ flex: 1 }, l.text]}
              >
                {enrollment.status === 'active'
                  ? rtl
                    ? 'نشط'
                    : 'Actif'
                  : enrollment.status === 'pending'
                    ? rtl
                      ? 'بانتظار التفعيل'
                      : 'En attente d’activation'
                    : enrollment.status === 'requested'
                      ? rtl
                        ? 'طلب قيد المراجعة'
                        : 'Demande en cours de révision'
                      : enrollment.status === 'rejected'
                        ? rtl
                          ? 'تم رفض الطلب'
                          : 'Demande refusée'
                        : rtl
                          ? 'منتهٍ'
                          : 'Expiré'}
              </AppText>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const CELL = 10; // px per module

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl + 6,
    borderBottomLeftRadius: radius.sheet,
    borderBottomRightRadius: radius.sheet,
  },
  headerRow: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identity: {
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.glassSoft,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  body: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
    ...shadow.card,
  },
  cardHead: { alignItems: 'center', gap: 7 },

  qrFrame: {
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrInner: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  qrGrid: { gap: 0 },
  qrRow: { flexDirection: 'row' },
  qrCell: { width: CELL, height: CELL },

  idBox: {
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.brandSofter,
    borderRadius: radius.md,
    padding: spacing.md,
    width: '100%',
  },
  copyBtn: {
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.brandSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },

  note: {
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.brandSofter,
    borderRadius: radius.md,
    padding: spacing.md,
  },

  actions: { gap: spacing.sm },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },

  metaCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing.md,
  },
  metaRow: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  metaDivider: { height: 1, backgroundColor: colors.line },
});
