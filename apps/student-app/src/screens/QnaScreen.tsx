/**
 * Course Q & R («Q & R») — shared per-course question threads.
 *
 * Every enrolled student sees the same threads, questions can be attached to a
 * lesson, and teacher replies carry a visible badge. A composer pinned to the
 * bottom posts a new question through the store.
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import {
  courseTeacher,
  isQuestionAnswered,
  lessonTitleForQuestion,
  relativeTime,
  type QnaQuestion,
} from '@ostadiplus/shared';

import { AppText, Avatar, Card, EmptyState, Pill, TopBar } from '../components/ui';
import { useI18n } from '../i18n/useI18n';
import { useLayout } from '../i18n/layout';
import { useStore } from '../store/StudentStore';
import { colors, familyFor, radius, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type QnaFilter = 'all' | 'unanswered';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]).join('') || '?';
}

export default function QnaScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'Qna'>>();
  const {
    state,
    questionsOfCourse,
    askCourseQuestion,
    statusOf,
  } = useStore();
  const { lang, dir } = useI18n();
  const l = useLayout(lang);
  const rtl = dir === 'rtl';
  const scrollRef = useRef<ScrollView>(null);
  const [filter, setFilter] = useState<QnaFilter>('all');
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const course = state.courses.find((item) => item.id === params.courseId);
  const accessible = statusOf(params.courseId) === 'active' && course?.status === 'published';

  /*
   * Every thread of the course stays visible, even when the screen was opened
   * from a lesson: Q & R is shared with all enrolled students. `lessonId` only
   * pre-targets the composer so the new question is attached to that lesson.
   */
  const threads = useMemo(
    () => questionsOfCourse(params.courseId),
    [questionsOfCourse, params.courseId],
  );

  const unanswered = threads.filter((question) => !isQuestionAnswered(question));
  const visibleThreads = filter === 'unanswered' ? unanswered : threads;

  const lessonTitle = params.lessonId
    ? state.courses
        .flatMap((item) => item.semesters)
        .flatMap((semester) => semester.chapters)
        .flatMap((chapter) => chapter.lessons)
        .find((lesson) => lesson.id === params.lessonId)?.title ?? null
    : null;

  const send = () => {
    const body = draft.trim();
    if (!body) return;
    const ok = askCourseQuestion(params.courseId, body, params.lessonId);
    if (!ok) {
      setError(
        rtl
          ? 'تعذّر نشر سؤالك. تأكد من أن وصولك إلى الدورة نشط.'
          : "Impossible de publier votre question. Vérifiez que votre accès au cours est actif.",
      );
      return;
    }
    setDraft('');
    setError(null);
    setFilter('all');
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: true }));
  };

  if (!course) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <TopBar title={rtl ? 'الأسئلة والأجوبة' : 'Q & R'} onBack={() => navigation.goBack()} />
        <View style={styles.missing}>
          <AppText size={14} tone="muted">
            {rtl ? 'هذه الدورة لم تعد متاحة.' : "Ce cours n'est plus disponible."}
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  const instructor = courseTeacher(state, course);
  const canSend = accessible && draft.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      /* Android 15 draws edge-to-edge, so adjustResize no longer shrinks the
         window for the IME. Older Android versions already resize the window,
         so only apply the keyboard padding on iOS and Android 15+. */
      behavior={
        Platform.OS === 'ios' ||
        (Platform.OS === 'android' &&
          typeof Platform.Version === 'number' &&
          Platform.Version >= 35)
          ? 'padding'
          : undefined
      }
    >
      <SafeAreaView style={styles.root} edges={['top']}>
        <TopBar
          title={rtl ? 'الأسئلة والأجوبة' : 'Q & R'}
          backLabel={rtl ? 'رجوع' : 'Retour'}
          onBack={() => navigation.goBack()}
        />

        <View style={styles.courseHead}>
          <AppText size={16} weight="bold" tone="ink" numberOfLines={2}>
            {course.title}
          </AppText>
          <AppText size={12} tone="muted" numberOfLines={1}>
            {instructor.name}
            {lessonTitle ? ` · ${lessonTitle}` : ''}
          </AppText>
          <View style={[l.row, { gap: spacing.sm, marginTop: spacing.sm }]}>
            <Pill
              label={
                rtl
                  ? `${threads.length} سؤالاً`
                  : `${threads.length} question${threads.length === 1 ? '' : 's'}`
              }
              tone="neutral"
            />
            {unanswered.length > 0 ? (
              <Pill
                label={
                  rtl
                    ? `${unanswered.length} بانتظار الرد`
                    : `${unanswered.length} sans réponse`
                }
                tone="warning"
                dot
              />
            ) : (
              <Pill label={rtl ? 'كل الأسئلة تمت الإجابة عليها' : 'Toutes répondues'} tone="success" dot />
            )}
          </View>
        </View>

        {/* ---- filters ---- */}
        <View style={[styles.filterRow, l.row]}>
          {(
            [
              ['all', rtl ? 'الكل' : 'Tout', threads.length],
              ['unanswered', rtl ? 'بدون رد' : 'Sans réponse', unanswered.length],
            ] as [QnaFilter, string, number][]
          ).map(([key, label, count]) => {
            const active = filter === key;
            return (
              <Pressable
                key={key}
                onPress={() => setFilter(key)}
                style={({ pressed }) => [
                  styles.filterChip,
                  active && styles.filterChipActive,
                  pressed && !active && { opacity: 0.7 },
                ]}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${label} (${count})`}
              >
                <AppText size={12.5} weight={active ? 'bold' : 'semibold'} tone={active ? 'white' : 'body'}>
                  {label} ({count})
                </AppText>
              </Pressable>
            );
          })}
        </View>

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {visibleThreads.length === 0 ? (
            <EmptyState
              icon="chatbubbles-outline"
              title={
                filter === 'unanswered'
                  ? rtl
                    ? 'كل الأسئلة تمت الإجابة عليها'
                    : 'Toutes les questions ont une réponse'
                  : rtl
                    ? 'لا توجد أسئلة بعد'
                    : 'Aucune question pour le moment'
              }
              description={
                filter === 'unanswered'
                  ? rtl
                    ? 'لا توجد أسئلة بانتظار رد الأستاذ.'
                    : "Aucune question n'attend de réponse."
                  : rtl
                    ? 'اطرح سؤالك الأول وسيراه كل طلاب الدورة.'
                    : 'Posez la première question, tous les étudiants du cours la verront.'
              }
            />
          ) : (
            visibleThreads.map((question) => (
              <QuestionCard
                key={question.id}
                question={question}
                lessonTitle={lessonTitleForQuestion(state, question)}
              />
            ))
          )}
        </ScrollView>

        {/* ---- composer ---- */}
        <SafeAreaView edges={['bottom']} style={styles.composerSafe}>
          {!accessible ? (
            <View style={[styles.lockedNote, l.row]}>
              <Ionicons name="lock-closed-outline" size={15} color={colors.brand} />
              <AppText size={11.5} tone="muted" style={{ flex: 1 }}>
                {rtl
                  ? 'يمكنك قراءة الأسئلة، لكن نشر سؤال يتطلب وصولاً نشطاً إلى الدورة.'
                  : "Vous pouvez lire les questions, mais publier nécessite un accès actif au cours."}
              </AppText>
            </View>
          ) : null}

          <View style={[styles.composer, l.row]}>
            <TextInput
          selectionColor={colors.brand}
          cursorColor={colors.brand}
              value={draft}
              onChangeText={(value) => {
                setDraft(value);
                setError(null);
              }}
              editable={accessible}
              multiline
              maxLength={600}
              placeholder={
                lessonTitle
                  ? rtl
                    ? 'اطرح سؤالاً حول هذا الدرس…'
                    : 'Poser une question sur cette leçon…'
                  : rtl
                    ? 'اطرح سؤالاً…'
                    : 'Poser une question…'
              }
              placeholderTextColor={colors.faint}
              accessibilityLabel={rtl ? 'اكتب سؤالك' : 'Écrire votre question'}
              style={[
                styles.input,
                {
                  fontFamily: familyFor(lang, 'regular'),
                  textAlign: rtl ? 'right' : 'left',
                  writingDirection: rtl ? 'rtl' : 'ltr',
                },
              ]}
            />
            <Pressable
              onPress={send}
              disabled={!canSend}
              style={({ pressed }) => [
                styles.sendButton,
                !canSend && { opacity: 0.35 },
                pressed && canSend && { opacity: 0.75 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={rtl ? 'نشر السؤال' : 'Publier la question'}
              accessibilityState={{ disabled: !canSend }}
            >
              <Ionicons name="send" size={17} color={colors.white} />
            </Pressable>
          </View>
          {error ? (
            <AppText size={11.5} weight="semibold" tone="danger" accessibilityRole="alert">
              {error}
            </AppText>
          ) : null}
        </SafeAreaView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

function QuestionCard({
  question,
  lessonTitle,
}: {
  question: QnaQuestion;
  lessonTitle: string | null;
}) {
  const { lang, dir } = useI18n();
  const l = useLayout(lang);
  const rtl = dir === 'rtl';
  const answered = isQuestionAnswered(question);

  return (
    <Card style={styles.thread}>
      <View style={[styles.threadHead, l.row]}>
        <Avatar monogram={initials(question.authorName)} size={34} seed={question.authorName.length} />
        <View style={{ flex: 1, gap: 1 }}>
          <AppText size={13.5} weight="bold" tone="ink" numberOfLines={1}>
            {question.authorName}
          </AppText>
          <AppText size={11} tone="faint">
            {relativeTime(question.createdAt, lang)}
          </AppText>
        </View>
        <Pill
          label={answered ? (rtl ? 'تمت الإجابة' : 'Répondu') : rtl ? 'بانتظار الرد' : 'Sans réponse'}
          tone={answered ? 'success' : 'warning'}
          dot
        />
      </View>

      {lessonTitle ? (
        <View style={[l.row, { gap: 5 }]}>
          <Ionicons name="play-circle-outline" size={13} color={colors.brand} />
          <AppText size={11} tone="brand" numberOfLines={1} style={{ flex: 1 }}>
            {lessonTitle}
          </AppText>
        </View>
      ) : null}

      <AppText lang="ar" size={14} tone="body" style={styles.body}>
        {question.body}
      </AppText>

      {question.replies.length > 0 ? (
        <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
          {question.replies.map((reply) => {
            const teacher = reply.authorRole === 'teacher';
            return (
              <View
                key={reply.id}
                style={[styles.reply, teacher ? styles.replyTeacher : styles.replyStudent]}
              >
                <View style={[l.row, { gap: spacing.sm }]}>
                  <Ionicons
                    name={teacher ? 'shield-checkmark' : 'person-circle-outline'}
                    size={15}
                    color={teacher ? colors.brand : colors.muted}
                  />
                  <AppText size={12.5} weight="bold" tone={teacher ? 'brand' : 'ink'} style={{ flex: 1 }}>
                    {reply.authorName}
                  </AppText>
                  {teacher ? (
                    <Pill label={rtl ? 'الأستاذ' : 'Professeur'} tone="brand" />
                  ) : null}
                  <AppText size={10.5} tone="faint">
                    {relativeTime(reply.createdAt, lang)}
                  </AppText>
                </View>
                <AppText lang="ar" size={13} tone="body" style={{ lineHeight: 21 }}>
                  {reply.body}
                </AppText>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={[styles.waiting, l.row]}>
          <Ionicons name="time-outline" size={14} color={colors.brand} />
          <AppText size={11.5} tone="muted" style={{ flex: 1 }}>
            {rtl
              ? 'لم يجب الأستاذ على هذا السؤال بعد.'
              : "L'enseignant n'a pas encore répondu à cette question."}
          </AppText>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  missing: { padding: spacing.lg },
  courseHead: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: 3,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  filterRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  filterChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  filterChipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  list: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  thread: { gap: spacing.sm, backgroundColor: colors.surface },
  threadHead: { gap: spacing.sm, alignItems: 'center' },
  body: { lineHeight: 22, marginTop: 2 },
  reply: { borderRadius: radius.md, padding: spacing.md, gap: 5 },
  replyTeacher: { backgroundColor: colors.brandSofter, borderWidth: 1, borderColor: colors.brandSoft },
  replyStudent: { backgroundColor: colors.surfaceAlt },
  waiting: {
    gap: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  composerSafe: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  lockedNote: { gap: spacing.sm, alignItems: 'center' },
  composer: { gap: spacing.sm, alignItems: 'flex-end' },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md - 1,
    paddingBottom: spacing.sm,
    fontSize: 14,
    color: colors.ink,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
});
