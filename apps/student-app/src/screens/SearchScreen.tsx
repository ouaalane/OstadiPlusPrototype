/**
 * Search («Rechercher») — Udemy-style discovery.
 *
 * A filled search field, popular searches derived from the real catalogue,
 * browsable categories with counts and live local results (course thumbnail,
 * title, teacher). No remote calls, no placeholder rows.
 */

import React, { useMemo, useRef, useState } from 'react';
import { BrandTextInput as TextInput } from '../components/BrandTextInput';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { courseTeacher, type Course } from '@ostadiplus/shared';

import {
  AppText,
  Card,
  EmptyState,
  SectionHead,
  Thumb,
} from '../components/ui';
import { useI18n } from '../i18n/useI18n';
import { useLayout } from '../i18n/layout';
import { useStore } from '../store/StudentStore';
import { colors, radius, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';
import { useScrollToTopOnTabPress } from '../navigation/useScrollToTopOnTabPress';

/**
 * Search fold: case-, accent- and diacritic-insensitive so « Fès », « fes » and
 * Arabic variants (أ/ا، ة/ه، ى/ي) all match.
 */
function fold(value: string): string {
  return value
    .toLowerCase()
    .replace(/[àâäá]/g, 'a')
    .replace(/[éèêë]/g, 'e')
    .replace(/[îïí]/g, 'i')
    .replace(/[ôöó]/g, 'o')
    .replace(/[ûüùú]/g, 'u')
    .replace(/ç/g, 'c')
    .replace(/[’'`\-]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[\u064B-\u0652\u0640]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

interface Category {
  label: string;
  count: number;
  kind: 'subject' | 'level';
}

export default function SearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { state, myCourses } = useStore();
  const { lang, t, dir } = useI18n();
  const l = useLayout(lang);
  const rtl = dir === 'rtl';
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTopOnTabPress(scrollRef);
  const [query, setQuery] = useState('');

  /** The catalogue becomes discoverable once the centre activates access. */
  const catalogue = useMemo(
    () => myCourses.length ? state.courses.filter((course) => course.status === 'published') : [],
    [state.courses, myCourses.length],
  );

  const categories = useMemo<Category[]>(() => {
    const bySubject = new Map<string, number>();
    const byLevel = new Map<string, number>();
    for (const course of catalogue) {
      bySubject.set(course.subject, (bySubject.get(course.subject) ?? 0) + 1);
      byLevel.set(course.level, (byLevel.get(course.level) ?? 0) + 1);
    }
    const sort = (a: Category, b: Category) =>
      b.count - a.count || a.label.localeCompare(b.label, lang === 'ar' ? 'ar' : 'fr');
    const subjects: Category[] = [...bySubject.entries()].map(([label, count]) => ({
      label,
      count,
      kind: 'subject',
    }));
    const levels: Category[] = [...byLevel.entries()].map(([label, count]) => ({
      label,
      count,
      kind: 'level',
    }));
    return [...subjects.sort(sort), ...levels.sort(sort)];
  }, [catalogue, lang]);

  const topSearches = useMemo(
    () =>
      categories
        .filter((category) => category.kind === 'subject')
        .slice(0, 6)
        .map((category) => category.label),
    [categories],
  );

  const results = useMemo(() => {
    const needle = fold(query);
    if (!needle) return [];
    return catalogue.filter((course) => {
      const teacher = courseTeacher(state, course);
      return [course.title, course.subject, course.level, course.summary, teacher.name]
        .map(fold)
        .some((value) => value.includes(needle));
    });
  }, [catalogue, query, state]);

  const openCourse = (course: Course) => {
    navigation.navigate('CourseDetail', { courseId: course.id });
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <AppText size={24} weight="bold" tone="ink">
            {t('search')}
          </AppText>
          <AppText size={12.5} tone="muted">
            {rtl
              ? 'ابحث في دوراتك وموادك وأساتذتك'
              : 'Cours, matières et professeurs du catalogue'}
          </AppText>
        </View>

        <View style={[styles.field, l.row]}>
          <Ionicons name="search" size={19} color={colors.muted} importantForAccessibility="no" />
          <TextInput
          selectionColor={colors.brand}
          cursorColor={colors.brand}
            value={query}
            onChangeText={setQuery}
            placeholder={rtl ? 'ابحث عن دورة، مادة، أو أستاذ…' : 'Rechercher un cours, une matière…'}
            placeholderTextColor={colors.faint}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            accessibilityLabel={rtl ? 'البحث في الدورات' : 'Rechercher dans les cours'}
            style={[
              styles.input,
              {
                textAlign: rtl ? 'right' : 'left',
                writingDirection: rtl ? 'rtl' : 'ltr',
              },
            ]}
          />
          {query.length > 0 ? (
            <Pressable
              onPress={() => setQuery('')}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={rtl ? 'مسح البحث' : 'Effacer la recherche'}
            >
              <Ionicons
                name="close-circle"
                size={18}
                color={colors.lineStrong}
                importantForAccessibility="no"
              />
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {query.trim().length === 0 ? (
          <>
            {/* ---- popular searches ---- */}
            {topSearches.length > 0 ? (
              <View style={{ gap: spacing.md }}>
                <SectionHead title={t('top_searches')} />
                <View style={[styles.chipWrap, l.row]}>
                  {topSearches.map((term) => (
                    <Pressable
                      key={term}
                      onPress={() => setQuery(term)}
                      style={({ pressed }) => [styles.chip, pressed && { opacity: 0.7 }]}
                      accessibilityRole="button"
                      accessibilityLabel={`${rtl ? 'بحث' : 'Rechercher'} ${term}`}
                    >
                      <Ionicons
                        name="search-outline"
                        size={13}
                        color={colors.brand}
                        importantForAccessibility="no"
                      />
                      <AppText size={12.5} weight="semibold" tone="brand" numberOfLines={1}>
                        {term}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {/* ---- categories ---- */}
            {categories.length > 0 ? (
              <View style={{ gap: spacing.md }}>
                <SectionHead title={t('browse_categories')} />
                <Card flush>
                  {categories.map((category, index) => (
                    <Pressable
                      key={`${category.kind}-${category.label}`}
                      onPress={() => setQuery(category.label)}
                      style={({ pressed }) => [
                        styles.categoryRow,
                        l.row,
                        index > 0 && styles.rowDivider,
                        pressed && { backgroundColor: colors.brandSofter },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`${category.label} — ${category.count} ${
                        rtl ? 'دورة' : category.count === 1 ? 'cours' : 'cours'
                      }`}
                    >
                      <View style={styles.categoryIcon} importantForAccessibility="no">
                        <Ionicons
                          name={category.kind === 'level' ? 'school-outline' : 'albums-outline'}
                          size={18}
                          color={colors.brand}
                        />
                      </View>
                      <AppText size={14.5} weight="semibold" tone="ink" style={{ flex: 1 }}>
                        {category.label}
                      </AppText>
                      <AppText size={11.5} tone="muted">
                        {category.count}
                      </AppText>
                      <Ionicons
                        name={rtl ? 'chevron-back' : 'chevron-forward'}
                        size={18}
                        color={colors.faint}
                        importantForAccessibility="no"
                      />
                    </Pressable>
                  ))}
                </Card>
              </View>
            ) : null}

            {categories.length === 0 ? (
              <EmptyState
                icon="search-outline"
                title={rtl ? 'لا توجد دورات بعد' : 'Aucun cours pour le moment'}
                description={
                  rtl
                    ? 'ستظهر هنا الدورات التي ينشرها أساتذتك.'
                    : 'Les cours publiés par vos professeurs apparaîtront ici.'
                }
              />
            ) : null}
          </>
        ) : (
          <>
            {/* ---- live results ---- */}
            <SectionHead
              title={rtl ? 'نتائج البحث' : 'Résultats'}
              counter={`${results.length} ${rtl ? 'نتيجة' : results.length === 1 ? 'résultat' : 'résultats'}`}
            />

            {results.length === 0 ? (
              <EmptyState
                icon="search-outline"
                title={rtl ? 'لا توجد نتائج' : 'Aucun résultat'}
                description={
                  rtl
                    ? `لم نعثر على دورة تطابق « ${query.trim()} ». جرّب كلمة أخرى أو تصفّح الفئات.`
                    : `Aucun cours ne correspond à « ${query.trim()} ». Essayez un autre mot ou parcourez les catégories.`
                }
                action={
                  <Pressable
                    onPress={() => setQuery('')}
                    style={({ pressed }) => [styles.resetButton, pressed && { opacity: 0.7 }]}
                    accessibilityRole="button"
                    accessibilityLabel={rtl ? 'مسح البحث' : 'Effacer la recherche'}
                  >
                    <AppText size={13.5} weight="semibold" tone="brand">
                      {rtl ? 'مسح البحث' : 'Effacer la recherche'}
                    </AppText>
                  </Pressable>
                }
              />
            ) : (
              <Card flush>
                {results.map((course, index) => (
                  <SearchResultRow
                    key={course.id}
                    course={course}
                    first={index === 0}
                    onPress={() => openCourse(course)}
                  />
                ))}
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function SearchResultRow({
  course,
  first,
  onPress,
}: {
  course: Course;
  first: boolean;
  onPress: () => void;
}) {
  const { state } = useStore();
  const { lang, dir } = useI18n();
  const l = useLayout(lang);
  const rtl = dir === 'rtl';
  const teacher = courseTeacher(state, course);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.resultRow,
        l.row,
        !first && styles.rowDivider,
        pressed && { backgroundColor: colors.brandSofter },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${course.title} — ${teacher.name}, ${course.subject}`}
      accessibilityHint={rtl ? 'يفتح صفحة الدورة' : 'Ouvre la page du cours'}
    >
      <Thumb
        cover={course.cover}
        width={92}
        height={64}
        radiusValue={radius.sm}
      />
      <View style={{ flex: 1, gap: 3 }}>
        <AppText size={14} weight="semibold" tone="ink" numberOfLines={2}>
          {course.title}
        </AppText>
        <AppText size={11.5} tone="muted" numberOfLines={1}>
          {teacher.name}
        </AppText>
        <AppText size={11} tone="faint" numberOfLines={1}>
          {course.subject} · {course.level}
        </AppText>
      </View>
      <Ionicons
        name={rtl ? 'chevron-back' : 'chevron-forward'}
        size={18}
        color={colors.faint}
        importantForAccessibility="no"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  headerSafe: {
    backgroundColor: colors.surface,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  header: { paddingHorizontal: spacing.lg, gap: 2 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    minHeight: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.lg,
  },
  input: {
    flex: 1,
    fontSize: 14.5,
    color: colors.ink,
    paddingVertical: 0,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.xl,
    paddingBottom: spacing.xxl * 2,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.brandSofter,
    borderWidth: 1,
    borderColor: colors.brandSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.brandSofter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.line },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  resetButton: {
    alignSelf: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
});
