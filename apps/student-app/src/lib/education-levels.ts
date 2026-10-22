import type { MaterialCommunityIcons } from '@expo/vector-icons';

/** Bilingual label — Arabic stays byte-for-byte, French is the LTR variant. */
interface Bi {
  ar: string;
  fr: string;
}

interface LevelOption {
  id: string;
  title: Bi;
  sub: Bi;
  /** MaterialCommunityIcons glyph — its education set reads as the level itself. */
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}

/**
 * Every educational level the platform supports (Stitch level-select).
 *
 * Icons spell out the cycle rather than the generic book/school the reference
 * uses: counting beads for primary, an open book for collège, the school for
 * the BAC years, a certificate for free candidates and a student cap for
 * university and vocational training.
 */
export const LEVELS: LevelOption[] = [
  {
    id: 'primary',
    title: { ar: 'ابتدائي', fr: 'Primaire' },
    sub: { ar: 'Primaire · من الأول إلى السادس ابتدائي', fr: 'Primaire · de la 1re à la 6e année' },
    icon: 'abacus',
  },
  {
    id: 'college',
    title: { ar: 'ثانوي إعدادي', fr: 'Collège' },
    sub: { ar: 'Collège · السنة 1، 2 و 3 إعدادي', fr: 'Collège · 1re, 2e et 3e année' },
    icon: 'book-education-outline',
  },
  {
    id: 'bac',
    title: { ar: 'ثانوي تأهيلي (BAC)', fr: 'Lycée (BAC)' },
    sub: { ar: 'Lycée · جذع مشترك، 1ère BAC، 2ème BAC', fr: 'Lycée · tronc commun, 1re BAC, 2e BAC' },
    icon: 'school-outline',
  },
  {
    id: 'free',
    title: { ar: 'باك حر (Candidats Libres)', fr: 'Bac libre (Candidats Libres)' },
    sub: { ar: 'مترشحون أحرار · جميع الشعب والمسالك', fr: 'Candidats libres · toutes les filières' },
    icon: 'certificate-outline',
  },
  {
    id: 'uni',
    title: { ar: 'جامعي وتكوين مهني', fr: 'Universitaire et formation professionnelle' },
    sub: { ar: 'EST, FST, BTS, CPGE, Facultés & OFPPT', fr: 'EST, FST, BTS, CPGE, Facultés & OFPPT' },
    icon: 'account-school-outline',
  },
];

