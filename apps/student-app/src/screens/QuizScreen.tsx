/**
 * Quiz lesson — take the teacher's multiple-choice quiz.
 *
 * Three phases: an intro card (count + estimated time), one question per
 * screen with a progress bar, then a result screen with the correct/missed/
 * time stats, an inline per-question breakdown, retry and «next lecture».
 *
 * Bilingual: strings are authored inline per language, layout flips RTL↔LTR.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { allLessons, type QuizQuestion } from '@ostadiplus/shared';

import { useI18n } from '../i18n/useI18n';
import { useLayout } from '../i18n/layout';
import {
  AppText,
  Card,
  Eyebrow,
  IconButton,
  OptionRow,
  Pill,
  PrimaryButton,
  ProgressBar,
  StatStrip,
  TopBar,
  type OptionState,
} from '../components/ui';
import { lessonRoute } from '../lib/lesson';
import { useStore } from '../store/StudentStore';
import { colors, radius, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Phase = 'intro' | 'running' | 'result';

function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function QuizScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'Quiz'>>();
  const { state, markCompleted, progressOf, recordQuizResult } = useStore();
  const { lang, t, dir } = useI18n();
  const l = useLayout(lang);
  const rtl = dir === 'rtl';

  const found = useMemo(() => {
    for (const course of state.courses) {
      const lesson = allLessons(course).find((x) => x.id === params.lessonId);
      if (lesson) return { course, lesson };
    }
    return null;
  }, [state.courses, params.lessonId]);

  /** questionId → selected option ids (a question may allow several). */
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [phase, setPhase] = useState<Phase>('intro');
  const [index, setIndex] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    const limit = found?.lesson.timeLimitSec ?? 0;
    if (phase !== 'running' || !startedAt || !limit || !found) return;
    const lesson = found.lesson;
    const tick = () => {
      const left = Math.max(0, Math.ceil((startedAt + limit * 1000 - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        const qs = lesson.questions ?? [];
        const correct = qs.filter(q => (answers[q.id] ?? []).length === q.correctIds.length && q.correctIds.every(id => (answers[q.id] ?? []).includes(id))).length;
        setElapsedSec(limit); setPhase('result'); markCompleted(lesson.id); recordQuizResult(lesson.id, correct, qs.length, limit);
      }
    };
    tick(); const interval = setInterval(tick, 500); return () => clearInterval(interval);
  }, [phase, startedAt, found, answers, markCompleted, recordQuizResult]);

  if (!found) return null;
  const { course, lesson } = found;
  const questions = lesson.questions ?? [];
  const alreadyDone = progressOf(lesson.id)?.completed ?? false;

  /** Estimated reading time — derived from the question count (~30 s each). */
  const estimatedMin = Math.max(1, Math.round(questions.length * 0.5));

  const lessons = allLessons(course).filter((x) => x.published);
  const nextLesson = lessons[lessons.indexOf(lesson) + 1];

  const answeredCount = questions.filter((q) => (answers[q.id]?.length ?? 0) > 0).length;
  const allAnswered = questions.length > 0 && answeredCount === questions.length;

  const correctCount = questions.filter((q) => {
    const selected = answers[q.id] ?? [];
    return selected.length === q.correctIds.length && q.correctIds.every((id) => selected.includes(id));
  }).length;
  const missedCount = questions.length - correctCount;

  const toggleAnswer = (question: QuizQuestion, optionId: string) => {
    if (phase === 'result') return;
    setAnswers((prev) => {
      const selected = prev[question.id] ?? [];
      const next = selected.includes(optionId)
        ? selected.filter((id) => id !== optionId)
        : [...selected, optionId];
      return { ...prev, [question.id]: next };
    });
  };

  const optionState = (question: QuizQuestion, optionId: string): OptionState => {
    if (phase !== 'result') {
      return (answers[question.id] ?? []).includes(optionId) ? 'picked' : 'idle';
    }
    if (question.correctIds.includes(optionId)) return 'correct';
    return (answers[question.id] ?? []).includes(optionId) ? 'wrong' : 'idle';
  };

  const start = () => {
    setRemaining(lesson.timeLimitSec ?? 0);
    setStartedAt(Date.now());
    setElapsedSec(0);
    setIndex(0);
    setPhase('running');
  };

  const finish = () => {
    if (startedAt) setElapsedSec(Math.round((Date.now() - startedAt) / 1000));
    setShowBreakdown(false);
    setPhase('result');
    markCompleted(lesson.id);
    recordQuizResult(lesson.id, correctCount, questions.length, startedAt ? Math.round((Date.now() - startedAt) / 1000) : 0);
  };

  const retry = () => {
    setAnswers({});
    setShowBreakdown(false);
    setIndex(0);
    setRemaining(lesson.timeLimitSec ?? 0);
    setStartedAt(Date.now());
    setElapsedSec(0);
    setPhase('running');
  };

  /* ---------------- intro ---------------- */
  if (phase === 'intro') {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <TopBar title={lesson.title} onBack={() => navigation.goBack()} backLabel={t('back')} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.introHero}>
            <View style={styles.introCircle} importantForAccessibility="no">
              <Ionicons name="help-circle-outline" size={38} color={colors.brand} />
            </View>
            {alreadyDone ? <Pill label={rtl ? 'مكتمل ✓' : 'terminé ✓'} tone="success" dot /> : null}
          </View>

          <AppText size={24} weight="bold" tone="ink" style={{ textAlign: 'center' }}>
            {lesson.title}
          </AppText>
          <AppText size={14.5} tone="muted" style={styles.introBody}>
            {lesson.description ?? course.summary}
          </AppText>

          <View style={[l.row, styles.introStats]}>
            <View style={styles.introStat}>
              <Ionicons name="list-outline" size={17} color={colors.brand} />
              <AppText size={14} weight="bold" tone="ink">
                {questions.length}
              </AppText>
              <AppText size={11.5} tone="muted">
                {rtl ? 'أسئلة' : 'questions'}
              </AppText>
            </View>
            <View style={styles.introStat}>
              <Ionicons name="time-outline" size={17} color={colors.brand} />
              <AppText size={14} weight="bold" tone="ink">
                {lesson.timeLimitSec ? formatClock(lesson.timeLimitSec) : `~${estimatedMin} ${rtl ? 'د' : 'min'}`}
              </AppText>
              <AppText size={11.5} tone="muted">
                {lesson.timeLimitSec ? (rtl ? 'الوقت المحدد' : 'temps limité') : (rtl ? 'الوقت المتوقع' : 'durée estimée')}
              </AppText>
            </View>
          </View>

          {questions.length === 0 ? (
            <AppText size={14} tone="muted" style={{ textAlign: 'center', marginTop: spacing.lg }}>
              {rtl ? 'لا أسئلة في هذا الاختبار بعد.' : 'Aucune question dans ce quiz pour le moment.'}
            </AppText>
          ) : (
            <PrimaryButton
              label={rtl ? 'ابدأ الاختبار' : 'Commencer le quiz'}
              onPress={start}
              style={{ marginTop: spacing.xl }}
            />
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  /* ---------------- result ---------------- */
  if (phase === 'result') {
    const perfect = missedCount === 0;
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={[styles.resultBar, l.row]}>
          <IconButton
            icon="close"
            variant="surface"
            size={40}
            label={rtl ? 'إغلاق' : 'Fermer'}
            onPress={() => navigation.goBack()}
          />
          <View style={{ flex: 1 }} />
          <IconButton
            icon="ellipsis-horizontal"
            variant="surface"
            size={40}
            label={rtl ? 'المزيد' : 'Plus'}
            onPress={() =>
              Alert.alert(
                rtl ? 'نتيجتك' : 'Votre résultat',
                `${correctCount}/${questions.length} — ${formatClock(elapsedSec)}`,
              )
            }
          />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* ---- hero ---- */}
          <View style={styles.resultHero} importantForAccessibility="no">
            <View
              style={[
                styles.resultCircle,
                { backgroundColor: perfect ? colors.successSoft : colors.brandSoft },
              ]}
            >
              <Ionicons
                name={perfect ? 'checkmark-circle' : 'ribbon-outline'}
                size={44}
                color={perfect ? colors.success : colors.brand}
              />
            </View>
          </View>

          <AppText size={24} weight="bold" tone="ink" style={{ textAlign: 'center' }}>
            {perfect
              ? rtl
                ? 'أحسنت!'
                : 'Bravo !'
              : rtl
                ? 'انتهى الاختبار'
                : 'Quiz terminé'}
          </AppText>
          <AppText size={14.5} tone="muted" style={styles.introBody}>
            {perfect
              ? rtl
                ? 'جميع الإجابات صحيحة.'
                : 'Toutes les réponses sont correctes.'
              : correctCount >= questions.length / 2
                ? rtl
                  ? 'جيد — راجع الإجابات الخاطئة.'
                  : 'Bien — relisez les réponses erronées.'
                : rtl
                  ? 'راجع الدرس ثم أعد المحاولة.'
                  : 'Reprenez le cours puis réessayez.'}
          </AppText>

          <View style={{ marginTop: spacing.xl }}>
            <StatStrip
              items={[
                { value: `${correctCount}`, label: rtl ? 'صحيحة' : 'Correctes' },
                { value: `${missedCount}`, label: rtl ? 'خاطئة' : 'Manquées' },
                { value: formatClock(elapsedSec), label: rtl ? 'الوقت' : 'Temps' },
              ]}
            />
          </View>

          {nextLesson ? (
            <PrimaryButton
              label={rtl ? 'الدرس التالي' : 'Passer à la leçon suivante'}
              icon={rtl ? 'arrow-back' : 'arrow-forward'}
              onPress={() => navigation.replace(lessonRoute(nextLesson.kind), { lessonId: nextLesson.id })}
              style={{ marginTop: spacing.xl }}
            />
          ) : (
            <PrimaryButton
              label={rtl ? 'تم ✓' : 'Terminé ✓'}
              onPress={() => navigation.goBack()}
              style={{ marginTop: spacing.xl }}
            />
          )}

          <Pressable
            onPress={() => setShowBreakdown((v) => !v)}
            hitSlop={8}
            style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityState={{ expanded: showBreakdown }}
            accessibilityLabel={rtl ? 'تفصيل النتائج' : 'Détail des réponses'}
          >
            <AppText size={14} weight="semibold" tone="brand">
              {rtl ? 'تفصيل النتائج' : 'Détail des réponses'}
            </AppText>
            <Ionicons
              name={showBreakdown ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.brand}
              importantForAccessibility="no"
            />
          </Pressable>

          {showBreakdown ? (
            <View style={{ gap: spacing.md, marginTop: spacing.md }}>
              {questions.map((question, qi) => (
                <Card key={question.id} style={{ gap: spacing.md }}>
                  <Eyebrow>{rtl ? `سؤال ${qi + 1}` : `Question ${qi + 1}`}</Eyebrow>
                  <AppText size={15} weight="semibold" tone="ink">
                    {question.prompt}
                  </AppText>
                  <View style={{ gap: spacing.sm }}>
                    {question.options.map((option) => (
                      <OptionRow
                        key={option.id}
                        label={option.text}
                        state={optionState(question, option.id)}
                        multi={question.correctIds.length > 1}
                        disabled
                        onPress={() => undefined}
                      />
                    ))}
                  </View>
                </Card>
              ))}
            </View>
          ) : null}

          <PrimaryButton
            label={rtl ? 'إعادة المحاولة' : 'Réessayer'}
            variant="outline"
            onPress={retry}
            style={{ marginTop: spacing.xl }}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  /* ---------------- running ---------------- */
  const question = questions[index];
  const selected = question ? (answers[question.id] ?? []) : [];
  const multi = (question?.correctIds.length ?? 0) > 1;
  const isLast = index === questions.length - 1;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TopBar
        title={lesson.title}
        onBack={() => navigation.goBack()}
        backLabel={t('back')}
        right={
          <IconButton
            icon="close"
            variant="plain"
            size={34}
            label={rtl ? 'إغلاق' : 'Fermer'}
            onPress={() => navigation.goBack()}
          />
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.progressHead}>
          <ProgressBar value={((index + 1) / questions.length) * 100} height={6} />
          <View style={[l.rowBetween, { marginTop: spacing.sm }]}>
            <AppText size={12.5} tone="muted">
              {rtl
                ? `السؤال ${index + 1} من ${questions.length}`
                : `Question ${index + 1} sur ${questions.length}`}
            </AppText>
            <AppText size={12.5} tone="muted">
              {lesson.timeLimitSec ? formatClock(phase === 'running' ? remaining : lesson.timeLimitSec) : `~${estimatedMin} ${rtl ? 'د' : 'min'}`}
            </AppText>
          </View>
        </View>

        <AppText size={20} weight="bold" tone="ink" style={{ marginTop: spacing.lg, lineHeight: 27 }}>
          {question?.prompt}
        </AppText>
        {multi ? (
          <AppText size={12.5} tone="muted" style={{ marginTop: spacing.sm }}>
            {rtl ? 'اختر كل الإجابات الصحيحة.' : 'Sélectionnez toutes les réponses correctes.'}
          </AppText>
        ) : null}

        <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
          {question?.options.map((option) => (
            <OptionRow
              key={option.id}
              label={option.text}
              state={optionState(question, option.id)}
              multi={multi}
              onPress={() => toggleAnswer(question, option.id)}
            />
          ))}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={[l.row, styles.bottomRow]}>
          {index > 0 ? (
            <PrimaryButton
              label={rtl ? 'السابق' : 'Précédent'}
              variant="outline"
              leadingIcon={rtl ? 'chevron-forward' : 'chevron-back'}
              onPress={() => setIndex((i) => Math.max(0, i - 1))}
              style={{ flex: 1 }}
            />
          ) : null}
          <PrimaryButton
            label={
              isLast
                ? rtl
                  ? 'إنهاء الاختبار'
                  : 'Terminer le quiz'
                : rtl
                  ? 'التالي'
                  : 'Continuer'
            }
            icon={isLast ? undefined : rtl ? 'arrow-back' : 'arrow-forward'}
            disabled={selected.length === 0}
            onPress={() => {
              if (isLast) finish();
              else setIndex((i) => i + 1);
            }}
            style={{ flex: 1.4 }}
          />
        </View>
        {!allAnswered && isLast ? (
          <AppText size={11.5} tone="faint" style={{ textAlign: 'center' }}>
            {rtl ? 'أجب عن كل الأسئلة أولاً.' : 'Répondez à toutes les questions.'}
          </AppText>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },

  introHero: { alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl },
  introCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introBody: { textAlign: 'center', lineHeight: 22, marginTop: spacing.md },
  introStats: { gap: spacing.md, marginTop: spacing.xl },
  introStat: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
  },

  progressHead: { marginTop: spacing.md },

  resultBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  resultHero: { alignItems: 'center', marginBottom: spacing.lg },
  resultCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.xl,
  },

  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  bottomRow: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
});
