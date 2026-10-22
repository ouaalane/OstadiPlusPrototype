/**
 * Profile («حسابي») — the Stitch profile screen.
 *
 * White header with the title and the student identity, a row of real progress
 * stats (lessons completed, watch hours, active courses), the QR student-card
 * entry, then the Stitch menu list (معلوماتي الدراسية، اشتراكاتي، الملفات،
 * التنبيهات، اللغة، المساعدة، تسجيل الخروج) with the prototype's demo tools
 * (sync import, reset) folded in.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Notifications } from '../notifications/client';

import { brand, allLessons, lessonProgress, relativeTime, shortDate } from '@ostadiplus/shared';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppText, Card, Pill, PrimaryButton } from '../components/ui';
import { bundledAssetCount } from '../media/lookup';
import { useI18n } from '../i18n/useI18n';
import { useLayout } from '../i18n/layout';
import { useStore } from '../store/StudentStore';
import { colors, familyFor, radius, shadow, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';
import { useScrollToTopOnTabPress } from '../navigation/useScrollToTopOnTabPress';

/**
 * Screen-local bilingual copy. Menu labels come from the shared dictionary
 * (`t`); these are the handful of strings it does not carry yet.
 */
const pick = (lang: 'ar' | 'fr', ar: string, fr: string) => (lang === 'ar' ? ar : fr);

/** Pill tone per enrollment status — the label itself comes from the i18n dictionary. */
const STATUS_TONE = {
  active: 'success' as const,
  pending: 'warning' as const,
  suspended: 'danger' as const,
  none: 'neutral' as const,
};

/** Statuses an enrollment can actually hold (there is no "none" enrolment). */
type EnrollmentStatus = keyof typeof STATUS_TONE;

type MenuRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  danger?: boolean;
  expanded?: boolean;
  onPress?: () => void;
};

function MenuRow({ icon, label, value, danger, expanded, onPress }: MenuRowProps) {
  const tappable = !!onPress;
  const { dir, lang } = useI18n();
  const l = useLayout(lang);
  return (
    <Pressable
      onPress={onPress}
      disabled={!tappable}
      style={({ pressed }) => [styles.menuRow, l.row, tappable && pressed && { opacity: 0.6 }]}
      accessibilityRole={tappable ? 'button' : 'text'}
      accessibilityLabel={value ? `${label}${pick(lang, '، ', ', ')}${value}` : label}
      accessibilityState={{
        ...(tappable ? {} : { disabled: true }),
        ...(typeof expanded === 'boolean' ? { expanded } : {}),
      }}
    >
      <View
        style={[styles.menuIcon, danger && { backgroundColor: colors.dangerSoft }]}
        importantForAccessibility="no"
      >
        <Ionicons name={icon} size={18} color={danger ? colors.danger : colors.brand} />
      </View>
      <AppText size={14.5} weight="semibold" tone={danger ? 'danger' : 'ink'} style={{ flex: 1 }} importantForAccessibility="no">
        {label}
      </AppText>
      {value ? (
        <AppText size={12.5} tone="muted" importantForAccessibility="no">
          {value}
        </AppText>
      ) : null}
      {onPress || typeof expanded === 'boolean' ? (
        <Ionicons
          name={
            expanded ? 'chevron-up' : dir === 'rtl' ? 'chevron-back' : 'chevron-forward'
          }
          size={18}
          color={colors.faint}
          importantForAccessibility="no"
        />
      ) : null}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const {
    state,
    me,
    myCourses,
    lang,
    setLang,
    signOut,
    importPayload,
    resetDemo,
    lastSyncedAt,
  } = useStore();
  const { t } = useI18n();
  const l = useLayout(lang);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTopOnTabPress(scrollRef);

  // collapsible sections
  const [aboutOpen, setAboutOpen] = useState(false);
  const [subsOpen, setSubsOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);

  // toggle rows (visual)
  /* Not a visual toggle any more: this is the real device permission, read from
     the OS. The app cannot flip it itself, so tapping opens system settings. */
  const [notificationsOn, setNotificationsOn] = useState(Boolean(Notifications));
  useEffect(() => {
    if (!Notifications) return;
    let alive = true;
    Notifications.getPermissionsAsync()
      .then(({ granted }) => {
        if (alive) setNotificationsOn(granted);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  // sync payload tool
  const [payload, setPayload] = useState('');
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const enrollments = useMemo(
    () => state.enrollments.filter((e) => e.studentId === me?.id),
    [state.enrollments, me],
  );

  /** Real progress stats from the store (same math as Home). */
  const stats = useMemo(() => {
    if (!me) return { completed: 0, hours: 0, courses: 0 };
    let completed = 0;
    let seconds = 0;
    for (const course of myCourses) {
      for (const lesson of allLessons(course)) {
        const p = lessonProgress(state, me.id, lesson.id);
        if (p?.completed) completed += 1;
        seconds += p?.positionSec ?? 0;
      }
    }
    return { completed, hours: Math.round((seconds / 3600) * 10) / 10, courses: myCourses.length };
  }, [state, me, myCourses]);

  if (!me) return null;

  return (
    <View style={styles.root}>
      {/* ---- white header ---- */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <AppText size={24} weight="bold" tone="ink">
          {t('profile')}
        </AppText>

        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Image
              source={require('../assets/student-avatar.jpg')}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={12} color={colors.white} />
            </View>
          </View>
          <AppText size={19} weight="bold" tone="ink">
            {me.fullName}
          </AppText>
          <View style={[styles.levelChip, l.row]}>
            <Ionicons name="school-outline" size={13} color={colors.brand} />
            <AppText size={12.5} weight="semibold" tone="brand">
              {me.level}
            </AppText>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ---- stats (real progress) ---- */}
        <View style={[styles.statsRow, l.row]}>
          <StatCard
            icon="checkmark-done-outline"
            value={String(stats.completed)}
            label={pick(lang, 'دروس مكتملة', 'Terminées')}
          />
          <StatCard
            icon="time-outline"
            value={pick(lang, `${stats.hours} س`, `${stats.hours} h`)}
            label={pick(lang, 'ساعات المشاهدة', 'Regardé')}
          />
          <StatCard
            icon="library-outline"
            value={String(stats.courses)}
            label={pick(lang, 'دورات نشطة', 'Cours actifs')}
          />
        </View>

        {/* ---- QR student card entry ---- */}
        <Pressable
          onPress={() => navigation.navigate('StudentCard')}
          style={({ pressed }) => pressed && { opacity: 0.85 }}
          accessible
          accessibilityRole="button"
          accessibilityLabel={pick(lang, 'بطاقة الطالب الرقمية', 'Carte étudiant numérique')}
          accessibilityHint={pick(
            lang,
            'يفتح رمز QR لتفعيل مقرراتك مع الأستاذ',
            'Ouvre le code QR pour activer vos cours auprès de votre enseignant',
          )}
        >
          <Card style={[styles.qrEntry, l.row]}>
            <View style={styles.qrIcon}>
              <Ionicons name="qr-code-outline" size={20} color={colors.brand} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <AppText size={15} weight="bold" tone="ink">
                {t('student_card')}
              </AppText>
              <AppText size={12.5} tone="muted">
                {t('show_qr_instruction')}
              </AppText>
            </View>
            <Ionicons
              name={lang === 'ar' ? 'chevron-back' : 'chevron-forward'}
              size={20}
              color={colors.faint}
            />
          </Card>
        </Pressable>

        {/* ---- menu list ---- */}
        <View style={styles.menu}>
          <MenuRow
            icon="id-card-outline"
            label={t('my_profile')}
            expanded={aboutOpen}
            onPress={() => setAboutOpen((v) => !v)}
          />
          {aboutOpen ? (
            <View style={styles.menuPanel}>
              <InfoLine label={t('school_level')} value={me.level} />
              <InfoLine
                label={t('center_label')}
                value={`${state.teacher.centerName} · ${state.teacher.centerCity}`}
              />
              <InfoLine label={t('phone')} value={me.phone} />
            </View>
          ) : null}

          <View style={styles.menuDivider} />

          <MenuRow
            icon="ribbon-outline"
            label={t('my_subscription')}
            value={enrollments.length ? `${enrollments.length}` : undefined}
            expanded={subsOpen}
            onPress={() => setSubsOpen((v) => !v)}
          />
          {subsOpen ? (
            <View style={styles.menuPanel}>
              {enrollments.length === 0 ? (
                <AppText size={13} tone="muted">
                  {pick(
                    lang,
                    'لا اشتراكات في حسابك بعد — تواصل مع الأستاذ لتفعيل وصولك.',
                    'Aucun abonnement pour le moment — contactez votre professeur pour activer votre accès.',
                  )}
                </AppText>
              ) : (
                enrollments.map((enrollment) => {
                  const course = state.courses.find((c) => c.id === enrollment.courseId);
                  if (!course) return null;
                  const tone =
                    STATUS_TONE[enrollment.status as EnrollmentStatus] ?? STATUS_TONE.active;
                  return (
                    <View key={enrollment.id} style={[styles.subRow, l.row]}>
                      <View style={{ flex: 1, gap: 3 }}>
                        <AppText size={13.5} weight="semibold" tone="ink" numberOfLines={1}>
                          {course.title}
                        </AppText>
                        <AppText size={11.5} tone="muted">
                          {enrollment.status === 'active'
                            ? `${pick(lang, 'مفعّلة منذ', 'Activé depuis')} ${relativeTime(enrollment.authorizedAt, lang)}`
                            : pick(lang, 'بانتظار قرار الأستاذ', 'En attente du professeur')}
                        </AppText>
                        <AppText size={11} tone="muted">
                          {t('expires_on')} {shortDate(enrollment.expiresAt, lang === 'ar' ? 'ar-MA' : 'fr-FR')}
                        </AppText>
                      </View>
                      <Pill
                        label={
                          enrollment.status === 'active'
                            ? t('active_badge')
                            : enrollment.status === 'pending'
                              ? t('pending_badge')
                              : t('suspended_badge')
                        }
                        tone={tone}
                        dot
                      />
                    </View>
                  );
                })
              )}
            </View>
          ) : null}

          <View style={styles.menuDivider} />

          <MenuRow
            icon="play-circle-outline"
            label={t('my_learning')}
            value={`${myCourses.length}`}
            onPress={() => navigation.navigate('Tabs', { screen: 'Learning' })}
          />

          <View style={styles.menuDivider} />

          <MenuRow
            icon="notifications-outline"
            label={t('notifications')}
            value={pick(
              lang,
              notificationsOn ? 'مفعّلة' : 'موقوفة',
              notificationsOn ? 'Activées' : 'Désactivées',
            )}
            onPress={async () => {
              if (!Notifications) {
                Alert.alert(
                  pick(lang, 'الإشعارات غير متاحة', 'Notifications indisponibles'),
                  pick(
                    lang,
                    'يمكنك تجربة التطبيق هنا. إشعارات الهاتف تحتاج نسخة تطوير أو النسخة المثبتة من التطبيق.',
                    'Vous pouvez tester l’application ici. Les notifications nécessitent une version de développement ou l’application installée.',
                  ),
                );
                return;
              }
              if (notificationsOn) {
                /* Android keeps the switch in system settings. */
                await Linking.openSettings().catch(() => undefined);
                return;
              }
              const { granted } = await Notifications.requestPermissionsAsync().catch(() => ({
                granted: false,
              }));
              setNotificationsOn(granted);
              if (!granted) await Linking.openSettings().catch(() => undefined);
            }}
          />

          <View style={styles.menuDivider} />

          <MenuRow
            icon="language-outline"
            label={t('language')}
            value={lang === 'ar' ? 'العربية' : 'Français'}
            onPress={() => setLang(lang === 'ar' ? 'fr' : 'ar')}
          />

          <View style={styles.menuDivider} />

          <MenuRow
            icon="sync-outline"
            label={pick(lang, 'مزامنة مع لوحة الأستاذ', "Synchroniser avec l'espace enseignant")}
            expanded={syncOpen}
            onPress={() => setSyncOpen((v) => !v)}
          />
          {syncOpen ? (
            <View style={styles.menuPanel}>
              <AppText size={12.5} tone="muted" style={{ lineHeight: 20 }}>
                {pick(
                  lang,
                  'الصق هنا رمز المزامنة الذي نسخه الأستاذ من الإعدادات، لتحصل على أحدث دوراته ودروسه.',
                  "Collez ici le code de synchronisation copié par votre enseignant depuis les réglages pour recevoir ses derniers cours et leçons.",
                )}
              </AppText>
              <TextInput
          selectionColor={colors.brand}
          cursorColor={colors.brand}
                style={[
                  styles.input,
                  { fontFamily: familyFor(lang, 'regular') },
                  { writingDirection: lang === 'ar' ? 'rtl' : 'ltr' },
                ]}
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
                accessibilityLabel={pick(lang, 'رمز المزامنة', 'Code de synchronisation')}
                accessibilityHint={pick(
                  lang,
                  'الصق الرمز المنسوخ من لوحة الأستاذ',
                  "Collez le code copié depuis l'espace enseignant",
                )}
              />
              {message ? (
                <AppText
                  size={12.5}
                  weight="semibold"
                  tone={message.tone === 'ok' ? 'brand' : 'danger'}
                  accessibilityLiveRegion="polite"
                  accessibilityRole="alert"
                >
                  {message.text}
                </AppText>
              ) : null}
              {lastSyncedAt ? (
                <AppText size={11.5} tone="success">
                  {pick(lang, 'آخر مزامنة:', 'Dernière synchronisation :')}{' '}
                  {relativeTime(lastSyncedAt, lang)}
                </AppText>
              ) : null}
              <PrimaryButton
                label={pick(lang, busy ? 'جارٍ المزامنة…' : 'لصق ومزامنة', busy ? 'Synchronisation…' : 'Coller et synchroniser')}
                compact
                busy={busy}
                disabled={busy}
                onPress={async () => {
                  try {
                    setBusy(true);
                    await importPayload(payload);
                    setMessage({
                      tone: 'ok',
                      text: pick(
                        lang,
                        'تمت المزامنة مع بيانات الأستاذ ✓',
                        "Synchronisation avec les données de l'enseignant réussie ✓",
                      ),
                    });
                  } catch {
                    setMessage({
                      tone: 'error',
                      text: pick(
                        lang,
                        'الرمز غير صالح — تأكد من نسخه كاملاً.',
                        'Code invalide — vérifiez que vous l’avez copié en entier.',
                      ),
                    });
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </View>
          ) : null}

          <View style={styles.menuDivider} />

          <MenuRow
            icon="help-circle-outline"
            label={t('help_support')}
            onPress={() =>
              Alert.alert(
                pick(lang, 'المساعدة والدعم', 'Aide et support'),
                pick(
                  lang,
                  'تواصل مع إدارة مركزك أو الأستاذ مباشرة — بيانات التواصل موجودة في «معلوماتي الدراسية».',
                  "Contactez l'administration de votre centre ou votre enseignant — les coordonnées se trouvent dans « Mon profil ».",
                ),
              )
            }
          />
          <MenuRow icon="log-out-outline" label={t('logout')} danger onPress={signOut} />
        </View>

        {/* ---- demo tools ---- */}
        <Card style={styles.demoBox}>
          <PrimaryButton
            label={t('reset_demo')}
            variant="danger"
            compact
            onPress={() =>
              Alert.alert(
                pick(lang, 'إعادة تعيين بيانات العرض', 'Réinitialiser les données de démo'),
                pick(
                  lang,
                  'سيُمسح تقدّمك وتعود بيانات العرض الأصلية. هل تريد المتابعة؟',
                  'Votre progression sera effacée et les données de démo d’origine seront restaurées. Continuer ?',
                ),
                [
                  { text: pick(lang, 'إلغاء', 'Annuler'), style: 'cancel' },
                  {
                    text: pick(lang, 'إعادة التعيين', 'Réinitialiser'),
                    style: 'destructive',
                    onPress: resetDemo,
                  },
                ],
              )
            }
          />
          <AppText size={11} tone="faint" style={{ textAlign: 'center' }}>
            {pick(
              lang,
              `${brand.name} v2.4.0 • المغرب 🇲🇦 · ${bundledAssetCount()} وسائط مدمجة`,
              `${brand.name} v2.4.0 • Maroc 🇲🇦 · ${bundledAssetCount()} médias intégrés`,
            )}
          </AppText>
        </Card>
      </ScrollView>
    </View>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={17} color={colors.brand} />
      </View>
      <AppText size={17} weight="bold" tone="ink">
        {value}
      </AppText>
      <AppText size={11} tone="muted" style={{ textAlign: 'center' }}>
        {label}
      </AppText>
    </View>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  const { lang } = useI18n();
  const l = useLayout(lang);
  return (
    <View style={[styles.infoLine, l.row]}>
      <AppText size={12.5} tone="muted">
        {label}
      </AppText>
      <AppText size={13} weight="semibold" tone="ink" style={[{ flex: 1 }, l.text]}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    gap: spacing.lg,
  },
  identity: { alignItems: 'center', gap: 7, marginTop: spacing.sm },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    start: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelChip: {
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.brandSofter,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },

  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl * 2 },

  statsRow: { gap: spacing.sm },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.lg,
    ...shadow.card,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.brandSofter,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },

  qrEntry: {
    alignItems: 'center',
    gap: spacing.md,
  },
  qrIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.brandSofter,
    alignItems: 'center',
    justifyContent: 'center',
  },

  menu: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing.md,
    ...shadow.card,
  },
  menuRow: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md - 1,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.brandSofter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuDivider: { height: 1, backgroundColor: colors.line },
  menuPanel: { gap: spacing.sm, paddingBottom: spacing.md },
  subRow: {
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm + 2,
    padding: spacing.sm + 2,
  },
  infoLine: {
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },

  demoBox: { alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  input: {
    minHeight: 92,
    maxHeight: 132,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: spacing.md,
    textAlignVertical: 'top',
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.surfaceAlt,
  },
});
