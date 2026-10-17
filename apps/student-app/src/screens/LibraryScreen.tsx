/**
 * «الملفات والملخصات» — the Stitch library screen (its `folder` bottom tab).
 *
 * Header (title + subtitle), functional search + category chips
 * (الكل · ملخصات · سلاسل تمارين · امتحانات وطنية), a count/sort row, then
 * file cards (gradient icon tile, title, size/status, subject • teacher,
 * open/download action) and the offline note.
 *
 * Data: every published PDF lesson across the student's courses, categorised
 * by title keywords (امتحان / سلسلة / ملخص).
 */

import React, { useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { allLessons, courseTeacher, formatSize, type Lesson } from '@ostadiplus/shared';

import { AppText, Card, EmptyState, NoticeCard } from '../components/ui';
import { useI18n } from '../i18n/useI18n';
import { useLayout } from '../i18n/layout';
import { useStore } from '../store/StudentStore';
import { colors, familyFor, radius, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';
import { useScrollToTopOnTabPress } from '../navigation/useScrollToTopOnTabPress';

type CatKey = 'all' | 'summary' | 'series' | 'exam';

const CATS: { key: CatKey; label: string; labelFr: string }[] = [
  { key: 'all', label: 'الكل', labelFr: 'Tout' },
  { key: 'summary', label: 'ملخصات', labelFr: 'Résumés' },
  { key: 'series', label: 'سلاسل تمارين', labelFr: 'Séries d’exercices' },
  { key: 'exam', label: 'امتحانات وطنية', labelFr: 'Examens nationaux' },
];

/** Title-keyword categorisation (no taxonomy field exists in the dataset). */
function categorise(title: string): Exclude<CatKey, 'all'> {
  if (/امتحان|وطني|nation/i.test(title)) return 'exam';
  if (/سلسلة|سلسله|تمارين| exercice/i.test(title)) return 'series';
  return 'summary';
}

interface FileEntry {
  lesson: Lesson;
  courseTitle: string;
  subject: string;
  /** The prof who owns the course this file belongs to. */
  teacherName: string;
  cat: Exclude<CatKey, 'all'>;
}

export default function LibraryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { state, myCourses, progressOf, markCompleted } = useStore();
  const { lang } = useI18n();
  const l = useLayout(lang);
  const rtl = lang === 'ar';
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<CatKey>('all');
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTopOnTabPress(scrollRef);

  /** Published PDF lessons across every enrolled course. */
  const files: FileEntry[] = useMemo(() => {
    const out: FileEntry[] = [];
    for (const course of myCourses) {
      for (const lesson of allLessons(course)) {
        if (lesson.kind !== 'pdf' || !lesson.published) continue;
        out.push({
          lesson,
          courseTitle: course.title,
          subject: course.subject,
          teacherName: courseTeacher(state, course).name,
          cat: categorise(lesson.title),
        });
      }
    }
    return out;
  }, [myCourses, state]);

  const visible = useMemo(() => {
    const q = query.trim();
    return files.filter((f) => {
      if (cat !== 'all' && f.cat !== cat) return false;
      if (q && !`${f.lesson.title} ${f.courseTitle} ${f.subject}`.includes(q)) return false;
      return true;
    });
  }, [files, cat, query]);

  const counts = useMemo(() => ({
    all: files.length,
    summary: files.filter((f) => f.cat === 'summary').length,
    series: files.filter((f) => f.cat === 'series').length,
    exam: files.filter((f) => f.cat === 'exam').length,
  }), [files]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ---- header ---- */}
      <View style={[l.row, styles.header]}>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText size={24} weight="bold" tone="ink">
            {rtl ? 'الملفات والملخصات' : 'Fichiers et résumés'}
          </AppText>
          <AppText size={12.5} tone="muted">
            {rtl
              ? 'Study Files · باكالوريا المغرب 2025'
              : 'Fichiers d’étude · Baccalauréat Maroc 2025'}
          </AppText>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ---- search ---- */}
        <View style={[l.row, styles.searchRow]}>
          <View style={[l.row, styles.searchBox]}>
            <Ionicons name="search" size={18} color={colors.muted} importantForAccessibility="no" />
            <TextInput
              style={[
                l.fieldInput,
                { fontFamily: familyFor(lang, 'regular'), fontSize: 13.5, color: colors.ink },
                styles.searchInput,
              ]}
              value={query}
              onChangeText={setQuery}
              placeholder={rtl ? 'ابحث عن ملف أو ملخص...' : 'Rechercher un fichier ou un résumé…'}
              placeholderTextColor={colors.faint}
              accessibilityLabel={rtl ? 'ابحث عن ملف أو ملخص' : 'Rechercher un fichier ou un résumé'}
              returnKeyType="search"
              submitBehavior="blurAndSubmit"
            />
          </View>
          <Pressable
            style={({ pressed }) => [styles.filterBtn, pressed && { opacity: 0.6 }]}
            hitSlop={8}
            onPress={() =>
              Alert.alert(
                rtl ? 'خيارات التصفية' : 'Options de filtrage',
                rtl
                  ? 'استعمل شرائح التصنيف لتصفية الملفات حسب نوعها.'
                  : 'Utilisez les catégories pour filtrer les fichiers par type.',
              )
            }
            accessible
            accessibilityRole="button"
            accessibilityLabel={rtl ? 'خيارات التصفية' : 'Options de filtrage'}
          >
            <Ionicons name="options-outline" size={18} color={colors.brand} importantForAccessibility="no" />
          </Pressable>
        </View>

        {/* ---- category chips ---- */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={l.chipRow}>
          {CATS.map((c) => {
            const active = cat === c.key;
            return (
              <Pressable
                key={c.key}
                onPress={() => setCat(c.key)}
                style={({ pressed }) => [
                  styles.chip,
                  active && styles.chipActive,
                  pressed && !active && { opacity: 0.7 },
                ]}
                accessible
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={rtl ? c.label : c.labelFr}
              >
                <AppText size={13} weight={active ? 'bold' : 'semibold'} tone={active ? 'white' : 'body'}>
                  {rtl ? c.label : c.labelFr}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ---- count / sort ---- */}
        <View style={l.rowBetween}>
          <AppText size={13.5} weight="bold" tone="ink">
            {rtl ? `${visible.length} ملفًا متوفرًا` : `${visible.length} fichiers disponibles`}
          </AppText>
          <Pressable
            style={({ pressed }) => [l.row, styles.sortBtn, pressed && { opacity: 0.6 }]}
            hitSlop={8}
            onPress={() =>
              Alert.alert(
                rtl ? 'الترتيب' : 'Tri',
                rtl
                  ? 'الملفات مرتّبة حسب التاريخ — الأحدث أولاً.'
                  : 'Les fichiers sont triés par date — du plus récent au plus ancien.',
              )
            }
            accessible
            accessibilityRole="button"
            accessibilityLabel={rtl ? 'الترتيب: الأحدث' : 'Tri : plus récents'}
          >
            <AppText size={12} tone="muted" importantForAccessibility="no">
              {rtl ? 'الترتيب: الأحدث' : 'Tri : plus récents'}
            </AppText>
            <Ionicons name="chevron-down" size={15} color={colors.muted} importantForAccessibility="no" />
          </Pressable>
        </View>

        {/* ---- file cards ---- */}
        {visible.length === 0 ? (
          <EmptyState
            icon="document-text-outline"
            title={rtl ? 'لا ملفات مطابقة' : 'Aucun fichier correspondant'}
            description={
              rtl
                ? 'جرّب كلمة أخرى أو اختر «الكل» لعرض جميع الملفات المتوفرة في دوراتك.'
                : 'Essayez un autre mot-clé ou choisissez « Tout » pour afficher tous les fichiers disponibles dans vos cours.'
            }
          />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {visible.map(({ lesson, courseTitle, subject, teacherName }) => {
              const done = progressOf(lesson.id)?.completed ?? false;
              return (
                <Card key={lesson.id} flush>
                  <Pressable
                    onPress={() => navigation.navigate('Pdf', { lessonId: lesson.id })}
                    style={({ pressed }) => [l.row, styles.fileCard, pressed && { opacity: 0.8 }]}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel={
                      rtl
                        ? `ملف ${lesson.title}، ${subject}، ${lesson.pages} صفحة، ${formatSize(lesson.sizeMb)}${done ? '، محمّل' : ''}`
                        : `Fichier ${lesson.title}, ${subject}, ${lesson.pages} pages, ${formatSize(lesson.sizeMb)}${done ? ', téléchargé' : ''}`
                    }
                    accessibilityHint={
                      done
                        ? rtl
                          ? 'يفتح الملف'
                          : 'Ouvre le fichier'
                        : rtl
                          ? 'يفتح الملف للتحميل'
                          : 'Ouvre le fichier pour le télécharger'
                    }
                  >
                    <View style={styles.fileIcon}>
                      <LinearGradient
                        colors={[colors.brand, colors.brandDark]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      <Ionicons name="document-text" size={22} color={colors.white} />
                    </View>

                    <View style={{ flex: 1, gap: 4 }}>
                      <AppText size={14} weight="bold" tone="ink" numberOfLines={2}>
                        {lesson.title}
                      </AppText>
                      <AppText size={11.5} tone="muted" numberOfLines={1}>
                        {subject} • {teacherName} • {formatSize(lesson.sizeMb)}
                      </AppText>
                      <View style={[l.row, styles.fileMeta]}>
                        <AppText size={11} tone="faint">
                          {rtl ? `${lesson.pages} صفحة` : `${lesson.pages} pages`}
                        </AppText>
                        {done ? (
                          <View style={[l.row, styles.savedTag]}>
                            <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                            <AppText size={11} weight="semibold" tone="success">
                              {rtl ? 'محمّل ✓' : 'Téléchargé ✓'}
                            </AppText>
                          </View>
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.fileAction}>
                      <Ionicons name={done ? 'folder-open-outline' : 'download-outline'} size={18} color={colors.brand} />
                      <AppText size={11.5} weight="semibold" tone="brand">
                        {done ? (rtl ? 'فتح' : 'Ouvrir') : rtl ? 'تحميل' : 'Télécharger'}
                      </AppText>
                    </View>
                  </Pressable>
                </Card>
              );
            })}
          </View>
        )}

        {/* ---- offline note ---- */}
        <NoticeCard
          icon="cloud-done-outline"
          tone="brand"
          title={
            rtl
              ? 'الملفات المحملة تُحفظ في جهازك وتعمل بدون إنترنت.'
              : 'Les fichiers téléchargés sont enregistrés sur votre appareil et fonctionnent hors ligne.'
          }
          body=""
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  header: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  content: { padding: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.xxl * 2, gap: spacing.lg },

  searchRow: { gap: spacing.sm },
  searchBox: {
    flex: 1,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  searchInput: { paddingVertical: 0 },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.brandSofter,
    borderWidth: 1,
    borderColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  chipRow: { gap: spacing.sm },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },

  sortBtn: {
    gap: 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },

  fileCard: {
    gap: spacing.md,
    padding: spacing.md,
  },
  fileIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileMeta: { gap: spacing.sm },
  savedTag: { gap: 3 },
  fileAction: {
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.brandSofter,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
  },
});
