export type PlatformSettingKey =
  | 'general'
  | 'branding'
  | 'support'
  | 'uploads'
  | 'payments'
  | 'community'
  | 'moderation'
  | 'maintenance'
  | 'legal'
  | 'notifications';

export type PlatformGeneralSettings = {
  platformName: string;
  tagline: string;
  description: string;
  defaultLanguage: string;
  defaultCurrency: string;
};

export type PlatformBrandingSettings = {
  logoHorizontal: string;
  logoDark: string;
  logoIcon: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
};

export type PlatformSupportSettings = {
  supportEmail: string;
  supportPhone: string;
  supportWhatsapp: string;
  facebookUrl: string;
  instagramUrl: string;
  linkedinUrl: string;
};

export type PlatformUploadSettings = {
  maxImageSizeMB: number;
  maxVideoSizeMB: number;
  maxAttachmentSizeMB: number;
  maxPaymentProofSizeMB: number;
  allowedImageTypes: string[];
  allowedVideoTypes: string[];
  allowedAttachmentTypes: string[];
  allowedPaymentProofTypes: string[];
};

export type PlatformPaymentSettings = {
  paymentProofEnabled: boolean;
  teacherCanApproveEnrollments: boolean;
  adminCanApproveEnrollments: boolean;
  platformCommissionPercent: number;
  defaultPaymentInstructions: string;
  defaultPaymentMethod: string;
  defaultPaymentPhone: string;
  defaultBankAccount: string;
};

export type PlatformCommunitySettings = {
  publicReadOnlyQuestions: boolean;
  allowAnonymousRead: boolean;
  studentsCanAskQuestions: boolean;
  teachersCanAnswerQuestions: boolean;
  studentsCanComment: boolean;
  studentsCanRateTeachers: boolean;
  maxQuestionsPerStudentPerDay: number;
  maxCommentsPerUserPerDay: number;
};

export type PlatformModerationSettings = {
  reportsEnabled: boolean;
  autoHideAfterReports: boolean;
  autoHideReportThreshold: number;
  teacherVerificationRequired: boolean;
  courseReviewRequired: boolean;
};

export type PlatformMaintenanceSettings = {
  enabled: boolean;
  message: string;
  allowedRoles: Array<'admin' | 'teacher' | 'student'>;
};

export type PlatformLegalSettings = {
  termsUrl: string;
  privacyUrl: string;
  refundPolicyUrl: string;
  contactUrl: string;
};

export type PlatformNotificationSettings = {
  emailNotificationsEnabled: boolean;
  inAppNotificationsEnabled: boolean;
  teacherNewCourseNotifications: boolean;
  answerNotifications: boolean;
  enrollmentNotifications: boolean;
};

export type PlatformSettingsValues = {
  general: PlatformGeneralSettings;
  branding: PlatformBrandingSettings;
  support: PlatformSupportSettings;
  uploads: PlatformUploadSettings;
  payments: PlatformPaymentSettings;
  community: PlatformCommunitySettings;
  moderation: PlatformModerationSettings;
  maintenance: PlatformMaintenanceSettings;
  legal: PlatformLegalSettings;
  notifications: PlatformNotificationSettings;
};

export type PlatformSettingRow<K extends PlatformSettingKey = PlatformSettingKey> = {
  id: string;
  key: K;
  value: PlatformSettingsValues[K];
  description: string | null;
  is_public: boolean;
  updated_by: string | null;
  updated_at: string;
  created_at: string;
};

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettingsValues = {
  general: {
    platformName: 'sosprof.tn',
    tagline: 'Soutien scolaire - Reponses rapides - Cours',
    description: 'Trouvez des profs qualifies, posez vos questions et accedez a des cours adaptes.',
    defaultLanguage: 'fr',
    defaultCurrency: 'TND',
  },
  branding: {
    logoHorizontal: '/brand/sosprof-logo-horizontal.png.png',
    logoDark: '/brand/sosprof-logo-dark.png.png',
    logoIcon: '/brand/sosprof-icon.png.png',
    primaryColor: '#082B66',
    accentColor: '#FF8A00',
    backgroundColor: '#F7FAFC',
  },
  support: { supportEmail: '', supportPhone: '', supportWhatsapp: '', facebookUrl: '', instagramUrl: '', linkedinUrl: '' },
  uploads: {
    maxImageSizeMB: 5,
    maxVideoSizeMB: 300,
    maxAttachmentSizeMB: 50,
    maxPaymentProofSizeMB: 10,
    allowedImageTypes: ['jpg', 'jpeg', 'png', 'webp'],
    allowedVideoTypes: ['mp4', 'webm', 'mov'],
    allowedAttachmentTypes: ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'webp'],
    allowedPaymentProofTypes: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
  },
  payments: {
    paymentProofEnabled: true, teacherCanApproveEnrollments: true, adminCanApproveEnrollments: true,
    platformCommissionPercent: 0, defaultPaymentInstructions: '', defaultPaymentMethod: '', defaultPaymentPhone: '', defaultBankAccount: '',
  },
  community: {
    publicReadOnlyQuestions: true, allowAnonymousRead: true, studentsCanAskQuestions: true, teachersCanAnswerQuestions: true,
    studentsCanComment: true, studentsCanRateTeachers: true, maxQuestionsPerStudentPerDay: 10, maxCommentsPerUserPerDay: 50,
  },
  moderation: { reportsEnabled: true, autoHideAfterReports: false, autoHideReportThreshold: 5, teacherVerificationRequired: true, courseReviewRequired: false },
  maintenance: { enabled: false, message: 'La plateforme est en maintenance. Nous revenons bientot.', allowedRoles: ['admin'] },
  legal: { termsUrl: '', privacyUrl: '', refundPolicyUrl: '', contactUrl: '' },
  notifications: { emailNotificationsEnabled: false, inAppNotificationsEnabled: true, teacherNewCourseNotifications: true, answerNotifications: true, enrollmentNotifications: true },
};
