import { Bell, Brush, CreditCard, FileText, Globe, HardDriveUpload, Headphones, LockKeyhole, Shield, SlidersHorizontal, Wrench } from 'lucide-react';
import { ReactNode, useEffect, useRef, useState } from 'react';
import AccountSecuritySection from '../components/account/AccountSecuritySection';
import BrandWordmark from '../components/brand/BrandWordmark';
import DraftRestoreBanner from '../components/forms/DraftRestoreBanner';
import DraftStatus from '../components/forms/DraftStatus';
import BackButton from '../components/navigation/BackButton';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import useFormDraft, { draftKey } from '../hooks/useFormDraft';
import { getPlatformSettings, updateSetting } from '../services/platformSettingsService';
import {
  DEFAULT_PLATFORM_SETTINGS,
  PlatformBrandingSettings,
  PlatformCommunitySettings,
  PlatformGeneralSettings,
  PlatformLegalSettings,
  PlatformMaintenanceSettings,
  PlatformModerationSettings,
  PlatformNotificationSettings,
  PlatformPaymentSettings,
  PlatformSettingKey,
  PlatformSettingsValues,
  PlatformSupportSettings,
  PlatformUploadSettings,
} from '../types/platformSettings';

type AdminSettingsTab = PlatformSettingKey | 'account';

const tabs: Array<{ key: AdminSettingsTab; label: string; icon: typeof Globe }> = [
  { key: 'general', label: 'Général', icon: Globe },
  { key: 'branding', label: 'Branding', icon: Brush },
  { key: 'support', label: 'Support', icon: Headphones },
  { key: 'uploads', label: 'Uploads', icon: HardDriveUpload },
  { key: 'payments', label: 'Paiements', icon: CreditCard },
  { key: 'community', label: 'Communauté', icon: SlidersHorizontal },
  { key: 'moderation', label: 'Modération', icon: Shield },
  { key: 'maintenance', label: 'Maintenance', icon: Wrench },
  { key: 'legal', label: 'Légal', icon: FileText },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'account', label: 'Sécurité du compte', icon: LockKeyhole },
];

export default function AdminSettingsPage() {
  const { profile } = useAuth();
  const [settings, setSettings] = useState<PlatformSettingsValues>(DEFAULT_PLATFORM_SETTINGS);
  const [active, setActive] = useState<AdminSettingsTab>('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const restoredRef = useRef(false);
  const settingsDraft = useFormDraft({
    key: draftKey(profile?.id, 'admin:platform-settings'),
    values: settings,
    onRestore: (values) => {
      restoredRef.current = true;
      setSettings(values);
      setDirty(true);
    },
    shouldSave: () => dirty,
  });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const loaded = await getPlatformSettings();
      if (!restoredRef.current) {
        setSettings(loaded);
        setDirty(false);
      }
    } catch {
      setError('Impossible de charger les paramètres plateforme.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const patch = <K extends PlatformSettingKey>(key: K, values: Partial<PlatformSettingsValues[K]>) => {
    setSettings((current) => ({ ...current, [key]: { ...current[key], ...values } } as PlatformSettingsValues));
    setDirty(true);
    setNotice('');
  };

  const save = async () => {
    if (active === 'account') return;
    const validationError = validateSetting(active, settings[active]);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updateSetting(active, settings[active]);
      setNotice('Paramètres enregistrés.');
      setDirty(false);
      settingsDraft.clearDraft();
    } catch {
      setError('Impossible d’enregistrer les paramètres.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner label="Chargement des paramètres" />;

  return (
    <section className="space-y-6">
      <BackButton label="Retour au tableau de bord" fallbackTo="/admin/dashboard" />
      <header>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-orange">Administration</p>
        <h1 className="mt-2 text-3xl font-black text-brand-navy">Paramètres plateforme</h1>
        <p className="mt-2 max-w-3xl text-slate-600">Gérez l’identité, les limites, les paiements, la maintenance et les réglages globaux de sosprof.tn.</p>
      </header>

      {notice ? <p className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{notice}</p> : null}
      {error ? <p className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p> : null}
      {settingsDraft.restored ? <DraftRestoreBanner onKeep={settingsDraft.dismissRestoreBanner} onDiscard={() => { settingsDraft.discardDraft(); restoredRef.current = false; void load(); }} /> : null}

      <div className="grid gap-6 xl:grid-cols-[250px_minmax(0,1fr)]">
        <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-brand-border bg-white p-3 shadow-sm xl:block xl:space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => { setActive(tab.key); setError(''); setNotice(''); }}
              className={`flex min-w-fit items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition xl:w-full ${active === tab.key ? 'bg-brand-navy text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-navy'}`}
            >
              <tab.icon className="h-4 w-4 shrink-0" />
              {tab.label}
            </button>
          ))}
        </nav>

        <div className={active === 'account' ? '' : 'rounded-2xl border border-brand-border bg-white p-5 shadow-sm md:p-7'}>
          {active === 'account' ? <AccountSecuritySection compact /> : <SettingForm active={active} settings={settings} patch={patch} />}
          {active !== 'account' ? (
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
              <p className="text-sm font-semibold text-slate-500">{dirty ? 'Modifications non enregistrées' : 'Les modifications sont à jour.'}</p>
              <DraftStatus status={settingsDraft.status} lastSavedAt={settingsDraft.lastSavedAt} />
              <div className="flex gap-3">
                {dirty ? <button type="button" onClick={() => void load()} className="rounded-xl border border-brand-border px-4 py-3 text-sm font-bold text-brand-navy">Annuler</button> : null}
                <button type="button" disabled={saving || !dirty} onClick={() => void save()} className="rounded-xl bg-brand-orange px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50">
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function SettingForm({ active, settings, patch }: {
  active: PlatformSettingKey;
  settings: PlatformSettingsValues;
  patch: <K extends PlatformSettingKey>(key: K, values: Partial<PlatformSettingsValues[K]>) => void;
}) {
  if (active === 'general') return <GeneralForm value={settings.general} change={(values) => patch('general', values)} />;
  if (active === 'branding') return <BrandingForm value={settings.branding} change={(values) => patch('branding', values)} />;
  if (active === 'support') return <SupportForm value={settings.support} change={(values) => patch('support', values)} />;
  if (active === 'uploads') return <UploadsForm value={settings.uploads} change={(values) => patch('uploads', values)} />;
  if (active === 'payments') return <PaymentsForm value={settings.payments} change={(values) => patch('payments', values)} />;
  if (active === 'community') return <CommunityForm value={settings.community} change={(values) => patch('community', values)} />;
  if (active === 'moderation') return <ModerationForm value={settings.moderation} change={(values) => patch('moderation', values)} />;
  if (active === 'maintenance') return <MaintenanceForm value={settings.maintenance} change={(values) => patch('maintenance', values)} />;
  if (active === 'legal') return <LegalForm value={settings.legal} change={(values) => patch('legal', values)} />;
  return <NotificationsForm value={settings.notifications} change={(values) => patch('notifications', values)} />;
}

function GeneralForm({ value, change }: { value: PlatformGeneralSettings; change: (values: Partial<PlatformGeneralSettings>) => void }) {
  return <FormSection title="Général" subtitle="Identité principale et préférences par défaut."><Grid><Field label="Nom de la plateforme" value={value.platformName} onChange={(platformName) => change({ platformName })} /><Field label="Slogan" value={value.tagline} onChange={(tagline) => change({ tagline })} /><TextArea label="Description" value={value.description} onChange={(description) => change({ description })} wide /><Field label="Langue par défaut" value={value.defaultLanguage} onChange={(defaultLanguage) => change({ defaultLanguage })} /><Field label="Devise par défaut" value={value.defaultCurrency} onChange={(defaultCurrency) => change({ defaultCurrency })} /></Grid></FormSection>;
}

function BrandingForm({ value, change }: { value: PlatformBrandingSettings; change: (values: Partial<PlatformBrandingSettings>) => void }) {
  return <FormSection title="Branding" subtitle="Logos et couleurs de référence de la plateforme."><Grid><Field label="Logo horizontal" value={value.logoHorizontal} onChange={(logoHorizontal) => change({ logoHorizontal })} wide /><Field label="Logo fond sombre" value={value.logoDark} onChange={(logoDark) => change({ logoDark })} wide /><Field label="Icône" value={value.logoIcon} onChange={(logoIcon) => change({ logoIcon })} wide /><ColorField label="Couleur principale" value={value.primaryColor} onChange={(primaryColor) => change({ primaryColor })} /><ColorField label="Couleur accent" value={value.accentColor} onChange={(accentColor) => change({ accentColor })} /><ColorField label="Arrière-plan" value={value.backgroundColor} onChange={(backgroundColor) => change({ backgroundColor })} /></Grid><div className="mt-6 rounded-xl border border-brand-border p-4"><p className="mb-3 text-sm font-bold text-brand-navy">Aperçu du wordmark d'interface</p><BrandWordmark size="md" /><button type="button" style={{ backgroundColor: value.accentColor, color: value.primaryColor }} className="mt-4 rounded-xl px-4 py-2 text-sm font-bold">Bouton exemple</button></div></FormSection>;
}

function SupportForm({ value, change }: { value: PlatformSupportSettings; change: (values: Partial<PlatformSupportSettings>) => void }) {
  return <FormSection title="Support" subtitle="Coordonnées visibles pour aider vos utilisateurs."><Grid><Field label="Email support" type="email" value={value.supportEmail} onChange={(supportEmail) => change({ supportEmail })} /><Field label="Téléphone support" value={value.supportPhone} onChange={(supportPhone) => change({ supportPhone })} /><Field label="WhatsApp support" value={value.supportWhatsapp} onChange={(supportWhatsapp) => change({ supportWhatsapp })} /><Field label="Facebook URL" value={value.facebookUrl} onChange={(facebookUrl) => change({ facebookUrl })} /><Field label="Instagram URL" value={value.instagramUrl} onChange={(instagramUrl) => change({ instagramUrl })} /><Field label="LinkedIn URL" value={value.linkedinUrl} onChange={(linkedinUrl) => change({ linkedinUrl })} /></Grid></FormSection>;
}

function UploadsForm({ value, change }: { value: PlatformUploadSettings; change: (values: Partial<PlatformUploadSettings>) => void }) {
  return <FormSection title="Uploads" subtitle="Limites et extensions acceptées par le client."><Grid><NumberField label="Taille max image (MB)" value={value.maxImageSizeMB} onChange={(maxImageSizeMB) => change({ maxImageSizeMB })} /><NumberField label="Taille max vidéo (MB)" value={value.maxVideoSizeMB} onChange={(maxVideoSizeMB) => change({ maxVideoSizeMB })} /><NumberField label="Taille max pièce jointe (MB)" value={value.maxAttachmentSizeMB} onChange={(maxAttachmentSizeMB) => change({ maxAttachmentSizeMB })} /><NumberField label="Taille max preuve (MB)" value={value.maxPaymentProofSizeMB} onChange={(maxPaymentProofSizeMB) => change({ maxPaymentProofSizeMB })} /><CsvField label="Types image" value={value.allowedImageTypes} onChange={(allowedImageTypes) => change({ allowedImageTypes })} /><CsvField label="Types vidéo" value={value.allowedVideoTypes} onChange={(allowedVideoTypes) => change({ allowedVideoTypes })} /><CsvField label="Types pièce jointe" value={value.allowedAttachmentTypes} onChange={(allowedAttachmentTypes) => change({ allowedAttachmentTypes })} wide /><CsvField label="Types preuve de paiement" value={value.allowedPaymentProofTypes} onChange={(allowedPaymentProofTypes) => change({ allowedPaymentProofTypes })} wide /></Grid></FormSection>;
}

function PaymentsForm({ value, change }: { value: PlatformPaymentSettings; change: (values: Partial<PlatformPaymentSettings>) => void }) {
  return <FormSection title="Paiements" subtitle="Paramètres internes du parcours d’inscription payante."><ToggleList><Toggle label="Preuve de paiement activée" checked={value.paymentProofEnabled} onChange={(paymentProofEnabled) => change({ paymentProofEnabled })} /><Toggle label="Le prof peut approuver" checked={value.teacherCanApproveEnrollments} onChange={(teacherCanApproveEnrollments) => change({ teacherCanApproveEnrollments })} /><Toggle label="L’admin peut approuver" checked={value.adminCanApproveEnrollments} onChange={(adminCanApproveEnrollments) => change({ adminCanApproveEnrollments })} /></ToggleList><Grid className="mt-6"><NumberField label="Commission plateforme (%)" value={value.platformCommissionPercent} onChange={(platformCommissionPercent) => change({ platformCommissionPercent })} /><Field label="Méthode de paiement" value={value.defaultPaymentMethod} onChange={(defaultPaymentMethod) => change({ defaultPaymentMethod })} /><Field label="Téléphone de paiement" value={value.defaultPaymentPhone} onChange={(defaultPaymentPhone) => change({ defaultPaymentPhone })} /><Field label="Compte bancaire" value={value.defaultBankAccount} onChange={(defaultBankAccount) => change({ defaultBankAccount })} /><TextArea label="Instructions de paiement" value={value.defaultPaymentInstructions} onChange={(defaultPaymentInstructions) => change({ defaultPaymentInstructions })} wide /></Grid></FormSection>;
}

function CommunityForm({ value, change }: { value: PlatformCommunitySettings; change: (values: Partial<PlatformCommunitySettings>) => void }) {
  return <FormSection title="Communauté" subtitle="Participation et lecture des échanges."><ToggleList><Toggle label="Questions publiques en lecture seule" checked={value.publicReadOnlyQuestions} onChange={(publicReadOnlyQuestions) => change({ publicReadOnlyQuestions })} /><Toggle label="Lecture anonyme autorisée" checked={value.allowAnonymousRead} onChange={(allowAnonymousRead) => change({ allowAnonymousRead })} /><Toggle label="Les étudiants peuvent poser des questions" checked={value.studentsCanAskQuestions} onChange={(studentsCanAskQuestions) => change({ studentsCanAskQuestions })} /><Toggle label="Les profs peuvent répondre" checked={value.teachersCanAnswerQuestions} onChange={(teachersCanAnswerQuestions) => change({ teachersCanAnswerQuestions })} /><Toggle label="Commentaires étudiants autorisés" checked={value.studentsCanComment} onChange={(studentsCanComment) => change({ studentsCanComment })} /><Toggle label="Notes profs autorisées" checked={value.studentsCanRateTeachers} onChange={(studentsCanRateTeachers) => change({ studentsCanRateTeachers })} /></ToggleList><Grid className="mt-6"><NumberField label="Questions par étudiant / jour" value={value.maxQuestionsPerStudentPerDay} onChange={(maxQuestionsPerStudentPerDay) => change({ maxQuestionsPerStudentPerDay })} /><NumberField label="Commentaires par utilisateur / jour" value={value.maxCommentsPerUserPerDay} onChange={(maxCommentsPerUserPerDay) => change({ maxCommentsPerUserPerDay })} /></Grid></FormSection>;
}

function ModerationForm({ value, change }: { value: PlatformModerationSettings; change: (values: Partial<PlatformModerationSettings>) => void }) {
  return <FormSection title="Modération" subtitle="Contrôles de qualité et signalements."><ToggleList><Toggle label="Reports activés" checked={value.reportsEnabled} onChange={(reportsEnabled) => change({ reportsEnabled })} /><Toggle label="Masquage automatique après reports" checked={value.autoHideAfterReports} onChange={(autoHideAfterReports) => change({ autoHideAfterReports })} /><Toggle label="Vérification des profs obligatoire" checked={value.teacherVerificationRequired} onChange={(teacherVerificationRequired) => change({ teacherVerificationRequired })} /><Toggle label="Validation des cours obligatoire" checked={value.courseReviewRequired} onChange={(courseReviewRequired) => change({ courseReviewRequired })} /></ToggleList><Grid className="mt-6"><NumberField label="Seuil de reports" value={value.autoHideReportThreshold} onChange={(autoHideReportThreshold) => change({ autoHideReportThreshold })} /></Grid></FormSection>;
}

function MaintenanceForm({ value, change }: { value: PlatformMaintenanceSettings; change: (values: Partial<PlatformMaintenanceSettings>) => void }) {
  return <FormSection title="Maintenance" subtitle="Interrompre temporairement l’accès public tout en gardant l’administration disponible."><ToggleList><Toggle label="Mode maintenance activé" checked={value.enabled} onChange={(enabled) => change({ enabled })} /></ToggleList><Grid className="mt-6"><TextArea label="Message de maintenance" value={value.message} onChange={(message) => change({ message })} wide /><CsvField label="Rôles autorisés" value={value.allowedRoles} onChange={(roles) => change({ allowedRoles: roles.filter((role): role is 'admin' | 'teacher' | 'student' => ['admin', 'teacher', 'student'].includes(role)) })} wide /></Grid></FormSection>;
}

function LegalForm({ value, change }: { value: PlatformLegalSettings; change: (values: Partial<PlatformLegalSettings>) => void }) {
  return <FormSection title="Légal" subtitle="Liens publics vers vos documents officiels."><Grid><Field label="Conditions d’utilisation URL" value={value.termsUrl} onChange={(termsUrl) => change({ termsUrl })} /><Field label="Confidentialité URL" value={value.privacyUrl} onChange={(privacyUrl) => change({ privacyUrl })} /><Field label="Politique de remboursement URL" value={value.refundPolicyUrl} onChange={(refundPolicyUrl) => change({ refundPolicyUrl })} /><Field label="Contact URL" value={value.contactUrl} onChange={(contactUrl) => change({ contactUrl })} /></Grid></FormSection>;
}

function NotificationsForm({ value, change }: { value: PlatformNotificationSettings; change: (values: Partial<PlatformNotificationSettings>) => void }) {
  return <FormSection title="Notifications" subtitle="Canaux et événements qui déclenchent des alertes."><ToggleList><Toggle label="Notifications email" checked={value.emailNotificationsEnabled} onChange={(emailNotificationsEnabled) => change({ emailNotificationsEnabled })} /><Toggle label="Notifications dans l’application" checked={value.inAppNotificationsEnabled} onChange={(inAppNotificationsEnabled) => change({ inAppNotificationsEnabled })} /><Toggle label="Nouveau cours d’un prof suivi" checked={value.teacherNewCourseNotifications} onChange={(teacherNewCourseNotifications) => change({ teacherNewCourseNotifications })} /><Toggle label="Réponses aux questions" checked={value.answerNotifications} onChange={(answerNotifications) => change({ answerNotifications })} /><Toggle label="Inscriptions aux cours" checked={value.enrollmentNotifications} onChange={(enrollmentNotifications) => change({ enrollmentNotifications })} /></ToggleList></FormSection>;
}

function FormSection({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <section><h2 className="text-xl font-black text-brand-navy">{title}</h2><p className="mt-1 mb-6 text-sm text-slate-500">{subtitle}</p>{children}</section>;
}
function Grid({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`grid gap-4 md:grid-cols-2 ${className}`}>{children}</div>;
}
function ToggleList({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 md:grid-cols-2">{children}</div>;
}
function Field({ label, value, onChange, type = 'text', wide = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; wide?: boolean }) {
  return <label className={wide ? 'md:col-span-2' : ''}><span className="mb-2 block text-sm font-bold text-brand-navy">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="h-12 w-full rounded-xl border border-brand-border px-4 text-sm outline-none focus:border-brand-orange focus:ring-4 focus:ring-orange-50" /></label>;
}
function TextArea({ label, value, onChange, wide = false }: { label: string; value: string; onChange: (value: string) => void; wide?: boolean }) {
  return <label className={wide ? 'md:col-span-2' : ''}><span className="mb-2 block text-sm font-bold text-brand-navy">{label}</span><textarea rows={4} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-brand-border px-4 py-3 text-sm outline-none focus:border-brand-orange focus:ring-4 focus:ring-orange-50" /></label>;
}
function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label><span className="mb-2 block text-sm font-bold text-brand-navy">{label}</span><input type="number" min={0} value={value} onChange={(event) => onChange(Number(event.target.value))} className="h-12 w-full rounded-xl border border-brand-border px-4 text-sm outline-none focus:border-brand-orange" /></label>;
}
function CsvField({ label, value, onChange, wide = false }: { label: string; value: string[]; onChange: (value: string[]) => void; wide?: boolean }) {
  return <Field label={label} wide={wide} value={value.join(', ')} onChange={(text) => onChange(text.split(',').map((part) => part.trim().toLowerCase()).filter(Boolean))} />;
}
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label><span className="mb-2 block text-sm font-bold text-brand-navy">{label}</span><div className="flex h-12 items-center gap-2 rounded-xl border border-brand-border px-3"><input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="h-8 w-10 cursor-pointer border-0 bg-transparent" /><input value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 text-sm outline-none" /></div></label>;
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex items-center justify-between gap-4 rounded-xl border border-brand-border p-4 text-sm font-bold text-brand-navy"><span>{label}</span><button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`relative h-7 w-12 rounded-full transition ${checked ? 'bg-brand-orange' : 'bg-slate-200'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${checked ? 'left-6' : 'left-1'}`} /></button></label>;
}

function validateSetting(key: PlatformSettingKey, value: PlatformSettingsValues[PlatformSettingKey]) {
  const validUrl = (url: string) => !url || /^https?:\/\//i.test(url);
  const validColor = (color: string) => /^#[0-9a-f]{6}$/i.test(color);
  if (key === 'branding') {
    const branding = value as PlatformBrandingSettings;
    if (![branding.primaryColor, branding.accentColor, branding.backgroundColor].every(validColor)) return 'Les couleurs doivent être au format hexadécimal (#RRGGBB).';
  }
  if (key === 'support') {
    const support = value as PlatformSupportSettings;
    if (support.supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(support.supportEmail)) return 'Veuillez saisir un email support valide.';
    if (![support.facebookUrl, support.instagramUrl, support.linkedinUrl].every(validUrl)) return 'Les liens sociaux doivent être des URL valides.';
  }
  if (key === 'uploads') {
    const uploads = value as PlatformUploadSettings;
    if ([uploads.maxImageSizeMB, uploads.maxVideoSizeMB, uploads.maxAttachmentSizeMB, uploads.maxPaymentProofSizeMB].some((size) => size <= 0)) return 'Les limites de fichiers doivent être supérieures à zéro.';
  }
  if (key === 'payments') {
    const payments = value as PlatformPaymentSettings;
    if (payments.platformCommissionPercent < 0 || payments.platformCommissionPercent > 100) return 'La commission doit être comprise entre 0 et 100.';
  }
  if (key === 'maintenance' && (value as PlatformMaintenanceSettings).enabled && !(value as PlatformMaintenanceSettings).message.trim()) return 'Un message est requis lorsque la maintenance est activée.';
  if (key === 'legal' && !Object.values(value as PlatformLegalSettings).every(validUrl)) return 'Les liens légaux doivent être des URL valides.';
  return '';
}
