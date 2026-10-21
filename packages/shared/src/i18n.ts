/**
 * OstadiPlus — Bilingual dictionary (French + Arabic).
 *
 * All user-visible strings live here. Keys are snake_case English identifiers.
 * Add a new key any time a new string is needed — the TypeScript type will
 * immediately flag any consumer that uses an unknown key.
 *
 * RTL languages: Arabic ('ar'). Everything else is LTR.
 */

import type { Lang, Dir } from './types';

export type { Lang, Dir };

export const RTL_LANGS: Lang[] = ['ar'];

/** Returns the text direction for a given language. */
export function dir(lang: Lang): Dir {
  return RTL_LANGS.includes(lang) ? 'rtl' : 'ltr';
}

/* ------------------------------------------------------------------ */
/* Dictionary                                                          */
/* ------------------------------------------------------------------ */

const dict = {
  // ── App name ──────────────────────────────────────────────────────
  app_name: { fr: 'Ustadi Plus', ar: 'أوستادي بلس' },

  // ── Welcome / Auth ────────────────────────────────────────────────
  welcome_title: { fr: 'Bienvenue sur Ustadi Plus', ar: 'مرحباً بك في أوستادي بلس' },
  welcome_subtitle: { fr: 'La plateforme de vos cours en ligne', ar: 'منصة دروسك الرقمية' },
  login: { fr: 'Se connecter', ar: 'تسجيل الدخول' },
  signup: { fr: "S'inscrire", ar: 'إنشاء حساب' },
  logout: { fr: 'Se déconnecter', ar: 'تسجيل الخروج' },
  guest_access: { fr: 'Compte démo', ar: 'حساب تجريبي' },
  email: { fr: 'Adresse e-mail', ar: 'البريد الإلكتروني' },
  phone: { fr: 'Numéro de téléphone', ar: 'رقم الهاتف' },
  password: { fr: 'Mot de passe', ar: 'كلمة المرور' },
  password_confirm: { fr: 'Confirmer le mot de passe', ar: 'تأكيد كلمة المرور' },
  password_mismatch: { fr: 'Les mots de passe ne correspondent pas', ar: 'كلمتا المرور غير متطابقتين' },
  forgot_password: { fr: 'Mot de passe oublié ?', ar: 'نسيت كلمة المرور؟' },
  terms: { fr: 'Conditions d\'utilisation', ar: 'شروط الاستخدام' },
  privacy: { fr: 'Politique de confidentialité', ar: 'سياسة الخصوصية' },
  terms_notice: {
    fr: 'En vous inscrivant, vous acceptez nos Conditions d\'utilisation et notre Politique de confidentialité.',
    ar: 'بالتسجيل، أنت توافق على شروط الاستخدام وسياسة الخصوصية.',
  },
  language: { fr: 'Langue', ar: 'اللغة' },
  choose_language: { fr: 'Choisir la langue', ar: 'اختر اللغة' },

  // ── Registration fields ───────────────────────────────────────────
  full_name: { fr: 'Nom complet', ar: 'الاسم الكامل' },
  first_name: { fr: 'Prénom', ar: 'الاسم' },
  last_name: { fr: 'Nom de famille', ar: 'اسم العائلة' },
  student_type: { fr: 'Type d\'étudiant', ar: 'نوع الطالب' },
  student_type_bac_libre: { fr: 'Bac Libre', ar: 'باك حر' },
  student_type_moutamadris: { fr: 'Moutamadris', ar: 'متمدرس' },
  school_level: { fr: 'Niveau scolaire', ar: 'المستوى الدراسي' },
  create_account: { fr: 'Créer mon compte', ar: 'إنشاء حسابي' },
  already_have_account: { fr: 'Vous avez déjà un compte ?', ar: 'هل لديك حساب؟' },
  no_account: { fr: 'Vous n\'avez pas de compte ?', ar: 'ليس لديك حساب؟' },

  // ── Student card / QR ─────────────────────────────────────────────
  student_card: { fr: 'Ma carte étudiant', ar: 'بطاقتي الطلابية' },
  student_code: { fr: 'Code étudiant', ar: 'رمز الطالب' },
  show_qr_instruction: {
    fr: 'Montrez ce code à votre centre pour vous inscrire.',
    ar: 'أرِ هذا الرمز لمركزك لتسجيل انضمامك.',
  },
  join_center: { fr: 'Rejoindre un centre', ar: 'الانضمام إلى مركز' },
  enter_center_code: { fr: 'Code d\'invitation du centre', ar: 'رمز دعوة المركز' },
  center_code_placeholder: { fr: 'Ex: ATLAS-23', ar: 'مثال: ATLAS-23' },
  join_request_sent: {
    fr: 'Demande envoyée. Le centre doit l\'approuver.',
    ar: 'تم إرسال الطلب. يجب أن يوافق المركز عليه.',
  },
  center_not_found: { fr: 'Code de centre invalide.', ar: 'رمز المركز غير صحيح.' },
  membership_pending: { fr: 'En attente d\'approbation', ar: 'بانتظار الموافقة' },
  membership_active: { fr: 'Membre actif', ar: 'عضو نشط' },
  membership_rejected: { fr: 'Demande refusée', ar: 'تم رفض الطلب' },

  // ── Home ──────────────────────────────────────────────────────────
  home: { fr: 'Accueil', ar: 'الرئيسية' },
  my_learning: { fr: 'Mon apprentissage', ar: 'تعلّمي' },
  browse_categories: { fr: 'Parcourir les catégories', ar: 'تصفّح الفئات' },
  top_searches: { fr: 'Recherches populaires', ar: 'الأكثر بحثاً' },
  continue_learning: { fr: 'Continuer à apprendre', ar: 'متابعة التعلم' },
  recent_lessons: { fr: 'Dernières leçons', ar: 'آخر الدروس' },
  my_courses_preview: { fr: 'Mes cours', ar: 'دوراتي' },
  announcements_preview: { fr: 'Annonces', ar: 'الإعلانات' },
  downloads_shortcut: { fr: 'Téléchargements', ar: 'التنزيلات' },
  no_access_yet: {
    fr: 'Aucun cours actif. Rejoignez un centre pour commencer.',
    ar: 'لا توجد دورات نشطة. انضم إلى مركز للبدء.',
  },
  pending_request: {
    fr: 'Votre demande d\'accès est en cours de traitement.',
    ar: 'طلب وصولك قيد المعالجة.',
  },
  welcome_user: { fr: 'Bonjour', ar: 'مرحباً' },

  // ── Courses ───────────────────────────────────────────────────────
  courses: { fr: 'Cours', ar: 'الدورات' },
  my_courses: { fr: 'Mes cours', ar: 'دوراتي' },
  all_courses: { fr: 'Tous les cours', ar: 'كل الدورات' },
  course_details: { fr: 'Détails du cours', ar: 'تفاصيل الدورة' },
  lessons: { fr: 'Leçons', ar: 'الدروس' },
  chapters: { fr: 'Chapitres', ar: 'الفصول' },
  no_courses: { fr: 'Aucun cours disponible.', ar: 'لا توجد دورات متاحة.' },
  subscription_expires: { fr: 'Expire le', ar: 'ينتهي في' },
  subscription_expired: { fr: 'Abonnement expiré', ar: 'الاشتراك منتهي' },
  subscription_expired_msg: {
    fr: 'Votre abonnement a expiré. Contactez votre centre pour le renouveler.',
    ar: 'انتهى اشتراكك. تواصل مع مركزك لتجديده.',
  },
  subscription_active: { fr: 'Abonnement actif', ar: 'الاشتراك نشط' },
  subscription_pending: { fr: 'En attente d\'activation', ar: 'بانتظار التفعيل' },
  subscription_suspended: { fr: 'Accès suspendu', ar: 'الوصول موقوف' },
  access_unavailable: {
    fr: 'Accès indisponible. Contactez votre enseignant.',
    ar: 'الوصول غير متاح. تواصل مع أستاذك.',
  },

  // ── Lesson kinds ──────────────────────────────────────────────────
  kind_video: { fr: 'Vidéo', ar: 'فيديو' },
  kind_pdf: { fr: 'Document', ar: 'مستند' },
  kind_image: { fr: 'Image', ar: 'صورة' },
  kind_exercise: { fr: 'Exercice', ar: 'تمرين' },
  kind_exam: { fr: 'Examen', ar: 'امتحان' },

  // ── Video player ──────────────────────────────────────────────────
  play: { fr: 'Lecture', ar: 'تشغيل' },
  pause: { fr: 'Pause', ar: 'إيقاف مؤقت' },
  fullscreen: { fr: 'Plein écran', ar: 'ملء الشاشة' },
  next_lesson: { fr: 'Leçon suivante', ar: 'الدرس التالي' },
  prev_lesson: { fr: 'Leçon précédente', ar: 'الدرس السابق' },
  download: { fr: 'Télécharger', ar: 'تنزيل' },
  playback_error: { fr: 'Erreur de lecture. Réessayer ?', ar: 'خطأ في التشغيل. إعادة المحاولة؟' },
  retry: { fr: 'Réessayer', ar: 'إعادة المحاولة' },
  loading: { fr: 'Chargement…', ar: 'جارٍ التحميل…' },
  resume_from: { fr: 'Reprendre à', ar: 'متابعة من' },

  // ── Downloads ─────────────────────────────────────────────────────
  downloads: { fr: 'Téléchargés', ar: 'التنزيلات' },
  downloads_empty: { fr: 'Aucun fichier téléchargé.', ar: 'لا توجد ملفات محملة.' },
  downloads_coming_soon: {
    fr: 'Les téléchargements seront disponibles prochainement.',
    ar: 'ستكون التنزيلات متاحة قريباً.',
  },
  storage_used: { fr: 'Espace utilisé', ar: 'المساحة المستخدمة' },
  delete_download: { fr: 'Supprimer', ar: 'حذف' },

  // ── Actualités / Notifications ────────────────────────────────────
  updates: { fr: 'Actualités', ar: 'الأخبار' },
  notifications: { fr: 'Notifications', ar: 'الإشعارات' },
  no_notifications: { fr: 'Aucune notification.', ar: 'لا توجد إشعارات.' },
  mark_read: { fr: 'Marquer comme lu', ar: 'وضع علامة مقروء' },
  center_join_request_title: { fr: 'Demande d\'adhésion', ar: 'طلب انضمام' },
  center_join_request_body: {
    fr: 'souhaite vous ajouter à son centre. Acceptez-vous ?',
    ar: 'يريد إضافتك إلى مركزه. هل توافق؟',
  },
  accept: { fr: 'Accepter', ar: 'قبول' },
  reject: { fr: 'Refuser', ar: 'رفض' },
  access_granted_title: { fr: 'Accès activé', ar: 'تم تفعيل الوصول' },
  access_granted_body: { fr: 'Votre accès au cours a été activé.', ar: 'تم تفعيل وصولك إلى الدورة.' },

  // ── Profile ───────────────────────────────────────────────────────
  profile: { fr: 'Profil', ar: 'الملف الشخصي' },
  my_profile: { fr: 'Mon profil', ar: 'ملفي الشخصي' },
  my_subscription: { fr: 'Mon abonnement', ar: 'اشتراكي' },
  center_association: { fr: 'Centre associé', ar: 'المركز المرتبط' },
  no_center: { fr: 'Non associé à un centre', ar: 'غير مرتبط بأي مركز' },
  notification_preferences: { fr: 'Préférences de notification', ar: 'تفضيلات الإشعارات' },
  help_support: { fr: 'Aide et support', ar: 'المساعدة والدعم' },
  account_options: { fr: 'Options du compte', ar: 'خيارات الحساب' },
  delete_account: { fr: 'Supprimer le compte', ar: 'حذف الحساب' },
  reset_demo: { fr: 'Réinitialiser la démo', ar: 'إعادة تعيين العرض' },

  // ── Dashboard (teacher-facing, defaults to French) ────────────────
  dashboard_overview: { fr: 'Vue d\'ensemble', ar: 'نظرة عامة' },
  dashboard_courses: { fr: 'Cours', ar: 'الدورات' },
  dashboard_students: { fr: 'Étudiants', ar: 'الطلاب' },
  dashboard_announcements: { fr: 'Annonces', ar: 'الإعلانات' },
  dashboard_settings: { fr: 'Paramètres', ar: 'الإعدادات' },
  total_students: { fr: 'Total étudiants', ar: 'إجمالي الطلاب' },
  active_subscriptions: { fr: 'Abonnements actifs', ar: 'الاشتراكات النشطة' },
  expired_subscriptions: { fr: 'Abonnements expirés', ar: 'الاشتراكات المنتهية' },
  published_courses: { fr: 'Cours publiés', ar: 'الدورات المنشورة' },
  activate: { fr: 'Activer', ar: 'تفعيل' },
  deactivate: { fr: 'Désactiver', ar: 'إيقاف' },
  renew: { fr: 'Renouveler', ar: 'تجديد' },
  suspend: { fr: 'Suspendre', ar: 'تعليق' },
  duration_1_month: { fr: '1 mois', ar: 'شهر واحد' },
  duration_3_months: { fr: '3 mois', ar: '3 أشهر' },
  duration_6_months: { fr: '6 mois', ar: '6 أشهر' },
  duration_12_months: { fr: '12 mois', ar: 'سنة كاملة' },
  choose_duration: { fr: 'Choisir la durée', ar: 'اختر المدة' },
  student_code_label: { fr: 'Code étudiant', ar: 'رمز الطالب' },
  scan_or_enter_code: { fr: 'Scanner ou saisir le code', ar: 'مسح أو إدخال الرمز' },
  simulate_scan: { fr: 'Simuler le scan', ar: 'محاكاة المسح' },
  add_student: { fr: 'Ajouter un étudiant', ar: 'إضافة طالب' },
  invite_student: { fr: 'Inviter un étudiant', ar: 'دعوة طالب' },
  expires_on: { fr: 'Expire le', ar: 'ينتهي في' },
  expired_badge: { fr: 'Expiré', ar: 'منتهي' },
  pending_badge: { fr: 'En attente', ar: 'بانتظار التفعيل' },
  active_badge: { fr: 'Actif', ar: 'نشط' },
  suspended_badge: { fr: 'Suspendu', ar: 'موقوف' },

  // ── General / shared ──────────────────────────────────────────────
  save: { fr: 'Enregistrer', ar: 'حفظ' },
  cancel: { fr: 'Annuler', ar: 'إلغاء' },
  confirm: { fr: 'Confirmer', ar: 'تأكيد' },
  edit: { fr: 'Modifier', ar: 'تعديل' },
  delete: { fr: 'Supprimer', ar: 'حذف' },
  close: { fr: 'Fermer', ar: 'إغلاق' },
  back: { fr: 'Retour', ar: 'رجوع' },
  next: { fr: 'Suivant', ar: 'التالي' },
  search: { fr: 'Rechercher', ar: 'بحث' },
  filter: { fr: 'Filtrer', ar: 'تصفية' },
  all: { fr: 'Tous', ar: 'الكل' },
  yes: { fr: 'Oui', ar: 'نعم' },
  no: { fr: 'Non', ar: 'لا' },
  error_generic: { fr: 'Une erreur est survenue.', ar: 'حدث خطأ.' },
  success: { fr: 'Succès', ar: 'تمت العملية بنجاح' },
  not_found: { fr: 'Page introuvable', ar: 'الصفحة غير موجودة' },
  teacher_label: { fr: 'Enseignant', ar: 'الأستاذ' },
  center_label: { fr: 'Centre', ar: 'المركز' },
  minutes_abbr: { fr: 'min', ar: 'دقيقة' },
  pages_abbr: { fr: 'pages', ar: 'صفحات' },
  mb_abbr: { fr: 'Mo', ar: 'ميغا' },
} as const;

export type TranslationKey = keyof typeof dict;

/**
 * Translate a key into the given language.
 * Falls back to French when a key is missing (should not happen if types are correct).
 */
export function t(key: TranslationKey, lang: Lang): string {
  const entry = dict[key];
  if (!entry) return key;
  return entry[lang] ?? entry['fr'];
}

export { dict as translations };
