/**
 * Downloads («التنزيلات» / «Téléchargements») — the dedicated bottom-tab
 * screen for offline content.
 *
 * Shows the device storage summary, how-downloads-work guidance, the videos
 * that can be saved offline (with progress + cancel/delete) and the bundled
 * PDF lessons, which are always readable offline.
 *
 * Bilingual: strings are authored inline per language, layout flips RTL↔LTR.
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Paths } from 'expo-file-system';

import { allLessons, formatSize, relativeTime, type Lesson } from '@ostadiplus/shared';

import {
  AppText,
  Card,
  EmptyState,
  Eyebrow,
  IconButton,
  Pill,
  PrimaryButton,
  ProgressBar,
  TipCard,
} from '../components/ui';
import { useI18n } from '../i18n/useI18n';
import { useLayout } from '../i18n/layout';
import { lessonRoute } from '../lib/lesson';
import { useStore } from '../store/StudentStore';
import { colors, radius, spacing } from '../theme';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useScrollToTopOnTabPress } from '../navigation/useScrollToTopOnTabPress';

const MB = 1024 * 1024;

export default function DownloadsScreen() {
  const {
    myCourses,
    myDownloads,
    downloadLesson,
    cancelDownload,
    deleteDownload,
    downloadUriFor,
    downloadStatusFor,
    canPlayDownload,
  } = useStore();
  const { lang, dir } = useI18n();
  const l = useLayout(lang);
  const rtl = dir === 'rtl';
  const scrollRef = useRef<ScrollView>(null);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  useScrollToTopOnTabPress(scrollRef);

  /** Published video + PDF lessons from the student's courses. */
  const items: Lesson[] = useMemo(() => {
    const out: Lesson[] = [];
    for (const course of myCourses) {
      for (const lesson of allLessons(course)) {
        if (!lesson.published) continue;
        if (lesson.kind === 'video' && lesson.file) out.push(lesson);
        else if (lesson.kind === 'pdf') out.push(lesson);
      }
    }
    return out;
  }, [myCourses]);

  const totalSize = useMemo(
    () => myDownloads.filter((d) => d.status === 'complete').reduce((sum, d) => sum + d.sizeMb, 0),
    [myDownloads],
  );

  const completedCount = myDownloads.filter((d) => d.status === 'complete').length;

  /** Real device storage — no quota is invented. */
  const disk = useMemo(() => {
    try {
      const total = Paths.totalDiskSpace / MB;
      const free = Paths.availableDiskSpace / MB;
      if (!Number.isFinite(total) || total <= 0) return null;
      return { total, free: Math.max(0, free), used: Math.max(0, total - free) };
    } catch {
      return null;
    }
  }, []);

  const handleDownload = useCallback(
    async (lesson: Lesson) => {
      const existing = myDownloads.find((d) => d.lessonId === lesson.id);
      if (existing?.status === 'complete') return;
      const result = await downloadLesson(lesson.id);
      if (result === 'error') {
        Alert.alert(
          rtl ? 'فشل التحميل' : 'Échec du téléchargement',
          rtl
            ? 'تعذّر تحميل الملف. تأكد من اتصالك بالإنترنت وحاول مجدداً.'
            : 'Impossible de télécharger le fichier. Vérifiez votre connexion Internet.',
        );
      }
    },
    [myDownloads, downloadLesson, rtl],
  );

  const handleDelete = useCallback(
    (lessonId: string) => {
      Alert.alert(
        rtl ? 'حذف الملف' : 'Supprimer le fichier',
        rtl
          ? 'هل أنت متأكد من رغبتك في حذف هذا الملف المحمل؟'
          : 'Êtes-vous sûr de vouloir supprimer ce fichier téléchargé ?',
        [
          { text: rtl ? 'إلغاء' : 'Annuler', style: 'cancel' },
          {
            text: rtl ? 'حذف' : 'Supprimer',
            style: 'destructive',
            onPress: () => {
              void deleteDownload(lessonId);
            },
          },
        ],
      );
    },
    [deleteDownload, rtl],
  );

  /** Open a downloaded lesson, honouring the subscription gate. */
  const openDownloaded = useCallback(
    (lesson: Lesson) => {
      const uri = downloadUriFor(lesson.id);
      if (!canPlayDownload(lesson.id)) {
        Alert.alert(
          rtl ? 'الاشتراك منتهي' : 'Abonnement expiré',
          rtl
            ? 'انتهى اشتراكك. تواصل مع مركزك لتجديده قبل تشغيل الملفات المحملة.'
            : 'Votre abonnement a expiré. Contactez votre centre pour le renouveler avant de lire les fichiers téléchargés.',
        );
        return;
      }
      if (!uri) return;
      const ext = lesson.file.split('.').pop() ?? '';
      if (ext === 'mp4') {
        Alert.alert(
          lesson.title,
          rtl ? 'يتم تشغيل الفيديو بدون إنترنت.' : 'Lecture de la vidéo hors ligne.',
        );
      } else {
        Alert.alert(
          lesson.title,
          rtl ? 'يتم فتح المستند بدون إنترنت.' : 'Ouverture du document hors ligne.',
        );
      }
    },
    [canPlayDownload, downloadUriFor, rtl],
  );

  const downloadedCount = completedCount;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ---- header ---- */}
      <View style={styles.header}>
        <Eyebrow>{rtl ? 'متاح بدون اتصال' : 'Disponible hors ligne'}</Eyebrow>
        <AppText size={24} weight="bold" tone="ink" style={{ marginTop: 2 }}>
          {rtl ? 'التنزيلات' : 'Téléchargements'}
        </AppText>
        <AppText size={12.5} tone="muted" style={{ marginTop: 2 }}>
          {rtl
            ? 'الدروس والملفات المتوفرة بدون إنترنت'
            : 'Leçons et fichiers disponibles hors ligne'}
        </AppText>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ---- storage ---- */}
        {disk ? (
          <Card style={styles.storageCard}>
            <View style={l.rowBetween}>
              <Eyebrow>{rtl ? 'مساحة الجهاز' : 'Stockage de l’appareil'}</Eyebrow>
              <AppText size={12.5} weight="semibold" tone="ink">
                {formatSize(disk.used)} / {formatSize(disk.total)}
              </AppText>
            </View>
            <ProgressBar value={disk.total > 0 ? (disk.used / disk.total) * 100 : 0} />
            <AppText size={11.5} tone="muted">
              {downloadedCount > 0
                ? rtl
                  ? `${downloadedCount} ملف محمّل · ${formatSize(totalSize)} من التطبيق`
                  : `${downloadedCount} fichiers · ${formatSize(totalSize)} dans l'app`
                : rtl
                  ? `مساحة حرة: ${formatSize(disk.free)}`
                  : `Espace libre : ${formatSize(disk.free)}`}
            </AppText>
          </Card>
        ) : null}

        {/* ---- how downloads work ---- */}
        <TipCard
          icon="cloud-download-outline"
          title={rtl ? 'كيف تعمل التحميلات؟' : 'Comment fonctionnent les téléchargements ?'}
          body={
            rtl
              ? 'حمّل الدروس لمشاهدتها دون اتصال. الملفات المرفقة مضمّنة داخل التطبيق وتبقى متاحة دائماً.'
              : "Téléchargez les leçons pour les regarder hors ligne. Les fichiers joints sont intégrés à l'app et restent toujours disponibles."
          }
        />

        {/* ---- full file library ---- */}
        <Card flush>
          <Pressable
            onPress={() => navigation.navigate('Library')}
            style={({ pressed }) => [styles.libraryRow, l.row, pressed && { opacity: 0.7 }]}
            accessible
            accessibilityRole="button"
            accessibilityLabel={
              rtl ? 'المكتبة — كل ملفات الدروس' : 'Bibliothèque — tous les fichiers de cours'
            }
            accessibilityHint={rtl ? 'يفتح مكتبة الملفات' : 'Ouvre la bibliothèque de fichiers'}
          >
            <View style={styles.libraryIcon} importantForAccessibility="no">
              <Ionicons name="folder-open-outline" size={20} color={colors.brand} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText size={14.5} weight="semibold" tone="ink">
                {rtl ? 'المكتبة' : 'Bibliothèque'}
              </AppText>
              <AppText size={12} tone="muted">
                {rtl
                  ? 'كل ملفات الدروس في مكان واحد'
                  : 'Tous les fichiers de cours au même endroit'}
              </AppText>
            </View>
            <Ionicons
              name={rtl ? 'chevron-back' : 'chevron-forward'}
              size={18}
              color={colors.faint}
              importantForAccessibility="no"
            />
          </Pressable>
        </Card>

        {/* ---- nothing downloaded yet ---- */}
        {items.length > 0 && downloadedCount === 0 ? (
          <EmptyState
            icon="cloud-download-outline"
            badgeIcon="arrow-down"
            title={rtl ? 'لا توجد تنزيلات بعد' : 'Aucun téléchargement'}
            description={
              rtl
                ? 'حمّل دروسك المفضلة لتشاهدها أينما كنت، حتى دون اتصال بالإنترنت.'
                : 'Téléchargez vos leçons pour les regarder partout, même sans connexion.'
            }
            action={
              <PrimaryButton
                label={rtl ? 'تصفح دوراتي' : 'Parcourir mes cours'}
                variant="soft"
                onPress={() => navigation.navigate('Tabs', { screen: 'Courses' })}
              />
            }
          />
        ) : null}

        {/* ---- list ---- */}
        {items.length === 0 ? (
          <EmptyState
            icon="cloud-download-outline"
            title={rtl ? 'لا دروس متاحة للتحميل' : 'Aucune leçon disponible'}
            description={
              rtl
                ? 'لا توجد دروس منشورة في دوراتك للتحميل.'
                : 'Aucune leçon publiée dans vos cours à télécharger.'
            }
          />
        ) : (
          <View style={{ gap: spacing.md }}>
            {items.map((item) => {
              const record = myDownloads.find((d) => d.lessonId === item.id);
              const status = downloadStatusFor(item.id);
              const downloaded = record?.status === 'complete';
              const downloading = status === 'downloading';
              const playable = downloaded && canPlayDownload(item.id);
              const isPdf = item.kind === 'pdf';

              return (
                <Card key={item.id} flush>
                  <View style={[styles.row, l.row]}>
                    <View
                      style={[
                        styles.icon,
                        isPdf && { backgroundColor: colors.surfaceAlt },
                      ]}
                      importantForAccessibility="no"
                    >
                      <Ionicons
                        name={isPdf ? 'document-text' : 'videocam'}
                        size={20}
                        color={isPdf ? colors.brand : colors.brand}
                      />
                    </View>

                    <View style={{ flex: 1, gap: 3 }}>
                      <AppText size={14} weight="semibold" tone="ink" numberOfLines={2}>
                        {item.title}
                      </AppText>
                      <View style={[l.row, { gap: spacing.sm, flexWrap: 'wrap' }]}>
                        <AppText size={11.5} tone="muted">
                          {isPdf
                            ? `${item.pages} ${rtl ? 'صفحة' : 'pages'} · ${formatSize(item.sizeMb)}`
                            : formatSize(item.sizeMb)}
                        </AppText>
                        {isPdf ? (
                          <Pill label={rtl ? 'مضمّن للتطبيق' : 'Intégré'} tone="neutral" />
                        ) : downloaded ? (
                          <Pill
                            label={
                              playable
                                ? rtl
                                  ? 'مكتمل — قابل للتشغيل'
                                  : 'Terminé — lisible'
                                : rtl
                                  ? 'مكتمل — مقفل'
                                  : 'Terminé — verrouillé'
                            }
                            tone={playable ? 'success' : 'warning'}
                            dot
                          />
                        ) : downloading ? (
                          <Pill
                            label={rtl ? 'جارٍ التحميل' : 'Téléchargement…'}
                            tone="brand"
                            dot
                          />
                        ) : null}
                      </View>
                      {downloading ? (
                        <View style={{ marginTop: 4 }}>
                          <ProgressBar value={record?.progress ?? 0} height={5} />
                        </View>
                      ) : null}
                    </View>

                    {/* trailing control */}
                    {isPdf ? (
                      <IconButton
                        icon={rtl ? 'chevron-back' : 'chevron-forward'}
                        variant="plain"
                        size={34}
                        label={item.title}
                        onPress={() =>
                          navigation.navigate(lessonRoute(item.kind), { lessonId: item.id })
                        }
                      />
                    ) : downloading ? (
                      <IconButton
                        icon="close"
                        variant="plain"
                        size={34}
                        label={rtl ? 'إلغاء التحميل' : 'Annuler le téléchargement'}
                        onPress={() => cancelDownload(item.id)}
                      />
                    ) : downloaded ? (
                      <IconButton
                        icon="trash-outline"
                        variant="plain"
                        size={34}
                        label={rtl ? 'حذف' : 'Supprimer'}
                        onPress={() => handleDelete(item.id)}
                      />
                    ) : (
                      <IconButton
                        icon="download-outline"
                        variant="surface"
                        size={38}
                        label={rtl ? 'تحميل' : 'Télécharger'}
                        onPress={() => {
                          void handleDownload(item);
                        }}
                      />
                    )}
                  </View>

                  {/* card footer — offline reading */}
                  {downloaded ? (
                    <Pressable
                      onPress={() => openDownloaded(item)}
                      style={({ pressed }) => [l.rowBetween, styles.footer, pressed && { opacity: 0.7 }]}
                      accessibilityRole="button"
                      accessibilityLabel={
                        rtl
                          ? `مشاهدة بدون اتصال: ${item.title}`
                          : `Regarder hors ligne : ${item.title}`
                      }
                    >
                      <AppText size={13} weight="semibold" tone="brand">
                        {rtl ? 'مشاهدة بدون اتصال' : 'Regarder hors ligne'}
                      </AppText>
                      <View style={[l.row, { gap: spacing.sm }]}>
                        {record?.downloadedAt ? (
                          <AppText size={11} tone="faint">
                            {relativeTime(record.downloadedAt, lang)}
                          </AppText>
                        ) : null}
                        <Ionicons
                          name={rtl ? 'arrow-back' : 'arrow-forward'}
                          size={15}
                          color={colors.brand}
                          importantForAccessibility="no"
                        />
                      </View>
                    </Pressable>
                  ) : null}
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  libraryRow: { alignItems: 'center', gap: spacing.md, padding: spacing.md },
  libraryIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm + 2,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storageCard: { gap: spacing.md, backgroundColor: colors.surfaceAlt, borderColor: 'transparent' },
  row: { gap: spacing.md, padding: spacing.md },
  icon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
