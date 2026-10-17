/**
 * Onboarding — the first-run walkthrough, shown before the auth entry screen.
 *
 * Three real slides (offline downloads, progress & quizzes, the course library)
 * with tappable page dots and a CTA that advances to the next slide, then hands
 * over to the Welcome screen. Presentation only: nothing here touches the store.
 *
 * Bilingual: strings flip with the active language, layout flips RTL↔LTR.
 */

import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, PlayGlyph, PrimaryButton } from '../components/ui';
import { useI18n } from '../i18n/useI18n';
import { useLayout } from '../i18n/layout';
import { coverAssets } from '../assets/covers';
import { colors, radius, shadow, spacing } from '../theme';

interface Slide {
  /** Bundled cover keys used by the collage. */
  covers: [string, string, string];
  chipIcon: keyof typeof Ionicons.glyphMap;
  title: { ar: string; fr: string };
  body: { ar: string; fr: string };
}

const SLIDES: Slide[] = [
  {
    covers: ['violet', 'amber', 'blue'],
    chipIcon: 'play-outline',
    title: { ar: 'تعلّم. تابع. انجح.', fr: 'Apprendre. Suivre. Réussir.' },
    body: {
      ar: 'دروس الفيديو والملفات في مكان واحد، مع حفظ تلقائي للموضع الذي توقفت عنده.',
      fr: 'Vidéos et documents au même endroit, avec reprise automatique là où vous vous êtes arrêté.',
    },
  },
  {
    covers: ['cyan', 'teal', 'indigo'],
    chipIcon: 'cloud-download-outline',
    title: { ar: 'شاهد دروسك بدون إنترنت', fr: 'Regardez vos leçons hors ligne' },
    body: {
      ar: 'حمّل دروسك مرة واحدة وتابعها في أي وقت، حتى دون اتصال بالإنترنت.',
      fr: 'Téléchargez vos leçons une fois et regardez-les quand vous voulez, même sans connexion.',
    },
  },
  {
    covers: ['rose', 'slate', 'blue'],
    chipIcon: 'ribbon-outline',
    title: { ar: 'تابع تقدّمك واختبر نفسك', fr: 'Suivez vos progrès et testez-vous' },
    body: {
      ar: 'اختبارات قصيرة بعد كل درس، ونتيجة فورية تعرف منها ما يحتاج إلى مراجعة.',
      fr: 'Des quiz après chaque leçon et un résultat immédiat pour savoir quoi revoir.',
    },
  },
];

export default function OnboardingScreen({
  onSkip,
  onGetStarted,
}: {
  onSkip: () => void;
  onGetStarted: () => void;
}) {
  const { lang, dir } = useI18n();
  const l = useLayout(lang);
  const rtl = dir === 'rtl';
  const [page, setPage] = useState(0);
  const slide = SLIDES[page];
  const isLast = page === SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* ---- header: skip + page dots ---- */}
      <View style={[styles.header, l.rowBetween]}>
        <Pressable
          onPress={onSkip}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={rtl ? 'تخطّي' : 'Passer'}
          style={({ pressed }) => [styles.skip, pressed && { opacity: 0.6 }]}
        >
          <AppText size={14.5} weight="semibold" tone="muted">
            {rtl ? 'تخطّي' : 'Passer'}
          </AppText>
        </Pressable>

        {/* Dot order follows the reading direction (dot 1 starts at the leading edge). */}
        <View style={[styles.dots, l.row]} importantForAccessibility="no">
          {SLIDES.map((s, i) => (
            <Pressable
              key={s.covers[0]}
              onPress={() => setPage(i)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityState={{ selected: i === page }}
              accessibilityLabel={rtl ? `الشريحة ${i + 1}` : `Écran ${i + 1}`}
              style={[
                styles.dotMark,
                i === page ? { width: 22, backgroundColor: colors.brand } : null,
              ]}
            />
          ))}
        </View>
      </View>

      {/* ---- collage of real bundled covers ---- */}
      <View style={styles.collage}>
        <View style={styles.stage} importantForAccessibility="no">
          <View style={[styles.tile, styles.tileBack]}>
            <Image source={coverAssets[slide.covers[1]]} style={styles.tileImage} />
          </View>
          <View style={[styles.tile, styles.tileMid]}>
            <Image source={coverAssets[slide.covers[2]]} style={styles.tileImage} />
          </View>
          <View style={[styles.tile, styles.tileFront]}>
            <Image source={coverAssets[slide.covers[0]]} style={styles.tileImage} />
            <View style={styles.tileOverlay}>
              <PlayGlyph size={40} />
            </View>
          </View>
          <View style={styles.iconChip}>
            <Ionicons name={slide.chipIcon} size={16} color={colors.brand} />
          </View>
        </View>
      </View>

      {/* ---- copy ---- */}
      <View style={styles.copy}>
        <AppText
          size={26}
          weight="bold"
          tone="ink"
          style={{ textAlign: 'center', lineHeight: 34 }}
        >
          {lang === 'fr' ? slide.title.fr : slide.title.ar}
        </AppText>
        <AppText size={14.5} tone="muted" style={styles.body}>
          {lang === 'fr' ? slide.body.fr : slide.body.ar}
        </AppText>
      </View>

      {/* ---- action ---- */}
      <View style={styles.footer}>
        <PrimaryButton
          label={
            isLast ? (rtl ? 'ابدأ الآن' : 'Commencer') : rtl ? 'التالي' : 'Suivant'
          }
          onPress={() => {
            if (isLast) onGetStarted();
            else setPage((p) => p + 1);
          }}
          icon={rtl ? 'arrow-back' : 'arrow-forward'}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  skip: { minWidth: 56, paddingVertical: 4 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dotMark: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.line },
  collage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  stage: { width: 300, height: 320 },
  tile: {
    position: 'absolute',
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.raised,
  },
  tileImage: { width: '100%', height: '100%' },
  tileBack: {
    width: 146,
    height: 186,
    left: 0,
    top: 34,
    transform: [{ rotate: '-9deg' }],
  },
  tileMid: {
    width: 148,
    height: 190,
    right: 0,
    top: 0,
    transform: [{ rotate: '7deg' }],
  },
  tileFront: {
    width: 210,
    height: 132,
    left: 45,
    bottom: 16,
    transform: [{ rotate: '-2deg' }],
  },
  tileOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconChip: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    right: -6,
    bottom: 86,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.raised,
  },
  copy: {
    paddingHorizontal: spacing.xxl,
    gap: spacing.md,
  },
  body: { textAlign: 'center', lineHeight: 23 },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
});
