import { TeacherVerificationStatus } from '../../types/database';

const styles: Record<TeacherVerificationStatus, string> = {
  pending: 'bg-amber-50 text-amber-700',
  verified: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
  suspended: 'bg-orange-50 text-orange-700',
  blocked: 'bg-slate-200 text-slate-800',
};

const labels: Record<TeacherVerificationStatus, string> = {
  pending: 'En attente',
  verified: 'Verifie',
  rejected: 'Refuse',
  suspended: 'Suspendu',
  blocked: 'Bloque',
};

export function teacherStatus(profile: { verification_status?: TeacherVerificationStatus; is_verified?: boolean; is_blocked?: boolean }) {
  if (profile.verification_status) return profile.verification_status;
  if (profile.is_blocked) return 'blocked';
  return profile.is_verified ? 'verified' : 'pending';
}

export default function TeacherVerificationBadge({ status }: { status: TeacherVerificationStatus }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${styles[status]}`}>{labels[status]}</span>;
}
