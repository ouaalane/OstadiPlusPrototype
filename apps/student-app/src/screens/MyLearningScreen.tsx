/**
 * «Mon apprentissage» — the student's Udemy-style library.
 *
 * Real device storage, the four library filters (Tout / Téléchargée /
 * Archivés / Favoris), a course row per enrolled course with its teacher and
 * offline stats, persisted archive/favourite actions and bulk download
 * removal. All counts and sizes come from the store and the file system.
 */

import React, { useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Paths } from 'expo-file-system';

import {
  allLessons,
  courseDurationSec,
  courseProgress,
  courseTeacher,
  formatSize,
  type Course,
} from '@ostadiplus/shared';

import {
  AppText,
  Card,
  EmptyState,
  IconButton,
  PrimaryButton,
  ProgressBar,
  Thumb,
} from '../components/ui';
import { useI18n } from '../i18n/useI18n';
import { useLayout } from '../i18n/layout';
import { lessonRoute } from '../lib/lesson';
import { useStore, type DownloadRecord } from '../store/StudentStore';
import { colors, radius, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';
import { useScrollToTopOnTabPress } from '../navigation/useScrollToTopOnTabPress';

const MB = 1024 * 1024;

type LibraryFilter = 'all' | 'downloaded' | 'archived' | 'favorites';

interface LearningRow {
  course: Course;
  downloaded: DownloadRecord[];
  percent: number;
  archived: boolean;
  favorite: boolean;
}

export default function MyLearningScreen() {
  const {
    state,
    me,
    myCourses,
    myDownloads,
    archivedCourseIds,
    favoriteCourseIds,
    toggleArchived,
    toggleFavorite,
    deleteDownloads,
  } = useStore();
  const { lang, dir } = useI18n();
  const l = useLayout(lang);
  const rtl = dir === 'rtl';
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTopOnTabPress(scrollRef);
  const [filter, setFilter] = useState<LibraryFilter>('all');

  const rows = useMemo<LearningRow[]>(() => {
    return myCourses.map((course) => {
      const lessons = allLessons(course);
      const lessonIds = new Set(lessons.map((lesson) => lesson.id));
      const downloaded = myDownloads.filter(
        (record) => lessonIds.has(record.lessonId) && record.status === 'complete',
      );
      const progress = me ? courseProgress(state, me.id, course) : null;
      return {
        course,
        downloaded,
        percent: progress?.percent ?? 0,
        archived: archivedCourseIds.includes(course.id),
        favorite: favoriteCourseIds.includes(course.id),
      };
    });
  }, [myCourses, myDownloads, me, state, archivedCourseIds, favoriteCourseIds]);

  const counts = useMemo(
    () => ({
      all: rows.filter((row) => !row.archived).length,
      downloaded: rows.filter((row) => !row.archived && row.downloaded.length > 0).length,
      archived: rows.filter((row) => row.archived).length,
      favorites: rows.filter((row) => !row.archived && row.favorite).length,
    }),
    [rows],
  );

  const visibleRows = useMemo(() => {
    switch (filter) {
      case 'downloaded':
        return rows.filter((row) => !row.archived && row.downloaded.length > 0);
      case 'archived':
        return rows.filter((row) => row.archived);
      case 'favorites':
        return rows.filter((row) => !row.archived && row.favorite);
      default:
        return rows.filter((row) => !row.archived);
    }
  }, [rows, filter]);

  /**
   * Real device storage — never invent a quota. Read on each render so the
   * bar follows a completed or removed download, not just the first mount.
   */
  const disk = (() => {
    try {
      const total = Paths.totalDiskSpace / MB;
      const free = Paths.availableDiskSpace / MB;
      if (!Number.isFinite(total) || total <= 0) return null;
      return { total, free: Math.max(0, free), used: Math.max(0, total - free) };
    } catch {
      return null;
    }
  })();

  const appDownloadSize = useMemo(
    () =>
      myDownloads
        .filter((record) => record.status === 'complete')
        .reduce((sum, record) => sum + record.sizeMb, 0),
    [myDownloads],
  );

  const completedDownloads = myDownloads.filter((record) => record.status === 'complete').length;

  const openCourse = (course: Course) => {
    navigation.navigate('CourseDetail', { courseId: course.id });
  };

  const startCourse = (row: LearningRow) => {
    const lessons = allLessons(row.course).filter((lesson) => lesson.published);
    const progress = me ? courseProgress(state, me.id, row.course) : null;
    const lesson =
      lessons.find((item) => item.id === progress?.nextLessonId) ?? lessons[0];
    if (!lesson) {
      openCourse(row.course);
      return;
    }
    navigation.navigate(lessonRoute(lesson.kind), { lessonId: lesson.id });
  };

  const confirmDeleteDownloads = (row: LearningRow) => {
    const lessonIds = new Set(allLessons(row.course).map((lesson) => lesson.id));
    const records = myDownloads.filter((record) => lessonIds.has(record.lessonId));
    if (records.length === 0) return;

    Alert.alert(
      rtl ? 'حذف التنزيلات' : 'Supprimer les téléchargements',
      rtl
        ? `سيتم حذف ${records.length} ملفاً محمّلاً من « ${row.course.title} » من هذا الجهاز.`
        : `${records.length} fichier${records.length === 1 ? '' : 's'} téléchargé${
            records.length === 1 ? '' : 's'
          } de « ${row.course.title} » seront supprimés de cet appareil.`,
      [
        { text: rtl ? 'إلغاء' : 'Annuler', style: 'cancel' },
        {
          text: rtl ? 'حذف' : 'Supprimer',
          style: 'destructive',
          onPress: () => {
            void deleteDownloads(records.map((record) => record.lessonId));
          },
        },
      ],
    );
  };

  const filters: { key: LibraryFilter; label: string; count: number }[] = [
    { key: 'all', label: rtl ? 'الكل' : 'Tout', count: counts.all },
    { key: 'downloaded', label: rtl ? 'محمّلة' : 'Téléchargée', count: counts.downloaded },
    { key: 'archived', label: rtl ? 'المؤرشفة' : 'Archivés', count: counts.archived },
    { key: 'favorites', label: rtl ? 'المفضلة' : 'Favoris', count: counts.favorites },
  ];

  const emptyCopy: Record<LibraryFilter, { title: string; description: string }> = {
    all: {
      title: rtl ? 'لا دورات في مكتبتك' : 'Aucun cours dans votre bibliothèque',
      description: rtl
        ? 'ستظهر هنا الدورات التي يفعّل لك الأستاذ وصولك إليها.'
        : "Les cours dont votre professeur active l'accès apparaîtront ici.",
    },
    downloaded: {
      title: rtl ? 'لا توجد دروس محمّلة' : 'Aucun téléchargement',
      description: rtl
        ? 'حمّل دروس الفيديو من صفحة الدورة لتشاهدها بدون اتصال.'
        : 'Téléchargez les leçons vidéo depuis la page du cours pour les regarder hors ligne.',
    },
    archived: {
      title: rtl ? 'لا دورات مؤرشفة' : 'Aucun cours archivé',
      description: rtl
        ? 'أرشِف الدورات التي أنهيتها لتبقي هذه القائمة مرتبة.'
        : 'Archivez les cours terminés pour garder cette liste organisée.',
    },
    favorites: {
      title: rtl ? 'لا دورات مفضلة' : 'Aucun favori',
      description: rtl
        ? 'أضف الدورات إلى المفضلة من زر الحفظ في صفحة الدورة.'
        : 'Ajoutez un cours aux favoris depuis le bouton Enregistrer de sa page.',
    },
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={[styles.header, l.rowBetween]}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText size={24} weight="bold" tone="ink">
              {rtl ? 'تعلّمي' : 'Mon apprentissage'}
            </AppText>
            <AppText size={12.5} tone="muted">
              {rtl
                ? 'كل دوراتك وتنزيلاتك في مكان واحد'
                : 'Tous vos cours et téléchargements au même endroit'}
            </AppText>
          </View>
          <IconButton
            icon="search-outline"
            variant="surface"
            size={40}
            label={rtl ? 'البحث في الدورات' : 'Rechercher des cours'}
            onPress={() => navigation.navigate('Tabs', { screen: 'Search' })}
          />
        </View>
      </SafeAreaView>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ---- real device storage ---- */}
        {disk ? (
          <Card style={styles.storageCard}>
            <View style={[l.rowBetween, { alignItems: 'flex-end' }]}>
              <View style={{ gap: 2 }}>
                <AppText size={13.5} weight="bold" tone="ink">
                  {rtl ? 'مساحة التخزين' : 'Stockage'}
                </AppText>
                <AppText size={11.5} tone="muted">
                  {formatSize(disk.used)} {rtl ? 'مستخدمة من' : 'utilisés sur'}{' '}
                  {formatSize(disk.total)}
                </AppText>
              </View>
              <AppText size={12} weight="semibold" tone="brand">
                {formatSize(disk.free)} {rtl ? 'حرة' : 'libres'}
              </AppText>
            </View>

            <ProgressBar
              value={disk.total > 0 ? (disk.used / disk.total) * 100 : 0}
              height={5}
              tone="brand"
            />

            <View style={[l.row, { gap: spacing.sm }]}>
              <Ionicons name="cloud-download-outline" size={15} color={colors.muted} />
              <AppText size={11.5} tone="muted">
                {completedDownloads > 0
                  ? rtl
                    ? `${completedDownloads} ملفاً محمّلاً · ${formatSize(appDownloadSize)}`
                    : `${completedDownloads} fichier${
                        completedDownloads === 1 ? '' : 's'
                      } · ${formatSize(appDownloadSize)}`
                  : rtl
                    ? 'لا توجد ملفات محمّلة بعد'
                    : 'Aucun fichier téléchargé pour le moment'}
              </AppText>
            </View>
          </Card>
        ) : null}

        {/* ---- filters ---- */}
        <View style={[styles.filterRow, l.row]}>
          {filters.map((item) => {
            const active = filter === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => setFilter(item.key)}
                style={({ pressed }) => [
                  styles.filterChip,
                  active && styles.filterChipActive,
                  pressed && !active && { opacity: 0.7 },
                ]}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${item.label} (${item.count})`}
              >
                <AppText
                  size={12.5}
                  weight={active ? 'bold' : 'semibold'}
                  tone={active ? 'white' : 'body'}
                >
                  {item.label} ({item.count})
                </AppText>
              </Pressable>
            );
          })}
        </View>

        {/* ---- course list ---- */}
        {visibleRows.length === 0 ? (
          <EmptyState
            icon={
              filter === 'archived'
                ? 'archive-outline'
                : filter === 'favorites'
                  ? 'bookmark-outline'
                  : filter === 'downloaded'
                    ? 'cloud-download-outline'
                    : 'library-outline'
            }
            title={emptyCopy[filter].title}
            description={emptyCopy[filter].description}
            action={
              filter === 'all' ? (
                <PrimaryButton
                  label={rtl ? 'تصفّح الدورات' : 'Découvrir des cours'}
                  variant="soft"
                  onPress={() => navigation.navigate('Tabs', { screen: 'Search' })}
                />
              ) : (
                <PrimaryButton
                  label={rtl ? 'عرض كل الدورات' : 'Voir tous les cours'}
                  variant="soft"
                  onPress={() => setFilter('all')}
                />
              )
            }
          />
        ) : (
          <View style={{ gap: spacing.lg }}>
            {visibleRows.map((row) => (
              <LearningCourseCard
                key={row.course.id}
                row={row}
                onOpen={() => openCourse(row.course)}
                onStart={() => startCourse(row)}
                onToggleArchived={() => toggleArchived(row.course.id)}
                onToggleFavorite={() => toggleFavorite(row.course.id)}
                onDeleteDownloads={() => confirmDeleteDownloads(row)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function LearningCourseCard({
  row,
  onOpen,
  onStart,
  onToggleArchived,
  onToggleFavorite,
  onDeleteDownloads,
}: {
  row: LearningRow;
  onOpen: () => void;
  onStart: () => void;
  onToggleArchived: () => void;
  onToggleFavorite: () => void;
  onDeleteDownloads: () => void;
}) {
  const { state, progressOf } = useStore();
  const { lang, dir } = useI18n();
  const l = useLayout(lang);
  const rtl = dir === 'rtl';
  const teacher = courseTeacher(state, row.course);
  const totalSec = courseDurationSec(row.course);
  const downloadedCount = row.downloaded.length;
  const watched = row.downloaded.filter(
    (record) => progressOf(record.lessonId)?.completed,
  ).length;
  const size = row.downloaded.reduce((sum, record) => sum + record.sizeMb, 0);
  const downloadStats = rtl
    ? `${downloadedCount} جلسة محمّلة • ${formatSize(size)}`
    : `${downloadedCount} session${downloadedCount === 1 ? '' : 's'} téléchargée${
        downloadedCount === 1 ? '' : 's'
      } • ${formatSize(size)}`;
  const watchedStats = rtl
    ? `${watched} من ${downloadedCount} تمت مشاهدتها`
    : `${watched} sur ${downloadedCount} regardée${watched === 1 ? '' : 's'}`;

  return (
    <Card flush style={styles.courseCard}>
      <Pressable
        onPress={onOpen}
        style={({ pressed }) => [styles.courseTop, l.rowTop, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
        accessibilityLabel={`${row.course.title} — ${teacher.name}`}
        accessibilityHint={rtl ? 'يفتح صفحة الدورة' : 'Ouvre la page du cours'}
      >
        <Thumb
          cover={row.course.cover}
          width={88}
          height={88}
          radiusValue={radius.md}
          overlay
        >
          <View style={styles.thumbMeta} pointerEvents="none" importantForAccessibility="no">
            <AppText size={10} weight="bold" tone="white">
              {row.downloaded.length > 0 ? '✓' : row.percent > 0 ? `${row.percent}%` : '▶'}
            </AppText>
          </View>
        </Thumb>

        <View style={{ flex: 1, gap: 4 }}>
          <View style={[l.row, { gap: spacing.sm }]}>
            <AppText size={15} weight="bold" tone="ink" numberOfLines={2} style={{ flex: 1 }}>
              {row.course.title}
            </AppText>
            {row.archived ? (
              <Ionicons name="archive" size={15} color={colors.faint} />
            ) : null}
          </View>
          <AppText size={12} tone="muted" numberOfLines={1}>
            {teacher.name}
          </AppText>
          <AppText size={11} tone="faint" numberOfLines={1}>
            {row.course.subject} · {row.course.level}
            {totalSec > 0
              ? ` · ${Math.round(totalSec / 60)} ${rtl ? 'دقيقة' : 'min'}`
              : ''}
          </AppText>
          {row.percent > 0 ? (
            <View style={[l.row, { gap: spacing.sm, marginTop: 2 }]}>
              <View style={{ flex: 1 }}>
                <ProgressBar value={row.percent} height={4} />
              </View>
              <AppText size={10.5} weight="semibold" tone="muted">
                {row.percent}%
              </AppText>
            </View>
          ) : null}
        </View>
      </Pressable>

      {/* ---- offline stats + bulk deletion ---- */}
      <View style={[styles.offlineRow, l.rowBetween]}>
        <View style={[l.row, { gap: 6, flex: 1 }]}>
          <Ionicons name="download-outline" size={14} color={colors.muted} />
          <View style={{ flex: 1, gap: 1 }}>
            <AppText size={11.5} tone="muted" numberOfLines={1}>
              {downloadStats}
            </AppText>
            {downloadedCount > 0 ? (
              <AppText size={10.5} tone="faint" numberOfLines={1}>
                {watchedStats}
              </AppText>
            ) : null}
          </View>
        </View>
        {downloadedCount > 0 ? (
          <Pressable
            onPress={onDeleteDownloads}
            hitSlop={6}
            style={({ pressed }) => [styles.deleteLink, l.row, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel={`${rtl ? 'حذف التنزيلات' : 'Supprimer les téléchargements'} — ${row.course.title}`}
          >
            <Ionicons name="trash-outline" size={13} color={colors.danger} />
            <AppText size={10.5} weight="semibold" tone="danger" numberOfLines={1}>
              {rtl ? 'حذف التنزيلات' : 'supprimer les téléchargements'}
            </AppText>
          </Pressable>
        ) : null}
      </View>

      {/* ---- actions ---- */}
      <View style={[styles.actionRow, l.row]}>
        <PrimaryButton
          label={
            row.percent > 0
              ? rtl
                ? 'متابعة الدورة'
                : 'Continuer le cours'
              : rtl
                ? 'ابدأ الدورة'
                : 'Débuter le cours'
          }
          leadingIcon="play"
          variant="accent"
          compact
          onPress={onStart}
          style={{ flex: 1 }}
        />
        <IconButton
          icon={row.favorite ? 'bookmark' : 'bookmark-outline'}
          variant="surface"
          size={40}
          label={
            row.favorite
              ? rtl
                ? 'إزالة من المفضلة'
                : 'Retirer des favoris'
              : rtl
                ? 'إضافة إلى المفضلة'
                : 'Ajouter aux favoris'
          }
          onPress={onToggleFavorite}
        />
        <IconButton
          icon={row.archived ? 'archive' : 'archive-outline'}
          variant="surface"
          size={40}
          label={
            row.archived
              ? rtl
                ? 'إلغاء الأرشفة'
                : "Retirer des archives"
              : rtl
                ? 'أرشفة الدورة'
                : 'Archiver le cours'
          }
          onPress={onToggleArchived}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  headerSafe: {
    backgroundColor: colors.surface,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
  },
  header: { paddingHorizontal: spacing.lg, gap: 2 },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  storageCard: { gap: spacing.md, backgroundColor: colors.surfaceAlt, borderColor: colors.transparent },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  filterChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  filterChipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  courseCard: { overflow: 'hidden' },
  courseTop: { padding: spacing.md, gap: spacing.md },
  thumbMeta: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineRow: {
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  deleteLink: { gap: 4, flexShrink: 1 },
  actionRow: {
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
});
