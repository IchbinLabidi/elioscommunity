import { AlertCircle, CheckCircle2, Clock3, ExternalLink, Lock, MessageCircle, PlayCircle, RotateCcw, Unlock } from 'lucide-react';
import { formatDate, money } from '../../lib/utils';
import { Course, CourseEnrollment } from '../../types/database';
import CourseStatusBadge from './CourseStatusBadge';

export type CourseAccessStatus = 'free' | 'locked' | 'pending' | 'approved' | 'rejected' | 'cancelled';

type Props = {
  course: Course;
  enrollment?: CourseEnrollment | null;
  accessStatus: CourseAccessStatus;
  progress?: number | null;
  onStartLearning: () => void;
  onEnroll: () => void;
  onContactTeacher?: () => void;
  onViewEnrollment: () => void;
  onResubmitProof: () => void;
  onOpenExternalCourse?: () => void;
};

const iconStyles: Record<CourseAccessStatus, string> = {
  free: 'bg-elios-sky text-elios-blue',
  locked: 'bg-slate-100 text-elios-navy',
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-600',
};

export default function CourseAccessStatusCard({
  course,
  enrollment,
  accessStatus,
  progress,
  onStartLearning,
  onEnroll,
  onContactTeacher,
  onViewEnrollment,
  onResubmitProof,
  onOpenExternalCourse,
}: Props) {
  const started = typeof progress === 'number' && progress > 0;
  const states = {
    free: {
      icon: PlayCircle,
      title: 'Free course',
      subtitle: 'You can start learning immediately.',
      badge: <CourseStatusBadge tone="free" label="Free access" />,
      cta: started ? 'Continue learning' : 'Start learning',
      action: onStartLearning,
      detail: null,
    },
    locked: {
      icon: Lock,
      title: 'Paid course',
      subtitle: 'Enroll to unlock all chapters, videos, and files.',
      badge: <CourseStatusBadge tone="paid" />,
      cta: 'Enroll now',
      action: onEnroll,
      detail: money(Number(course.price), course.currency ?? 'TND'),
    },
    pending: {
      icon: Clock3,
      title: 'Payment proof submitted',
      subtitle: 'Your payment proof is waiting for teacher approval.',
      badge: <CourseStatusBadge tone="pending" label="Pending review" />,
      cta: 'View enrollment status',
      action: onViewEnrollment,
      detail: enrollment ? `Submitted ${formatDate(enrollment.created_at)}` : null,
    },
    approved: {
      icon: CheckCircle2,
      title: 'Course unlocked',
      subtitle: 'Your enrollment has been approved. You now have full access to all chapters, videos, and files.',
      badge: <CourseStatusBadge tone="purchased" label="Purchased" />,
      cta: started ? 'Continue learning' : 'Start learning',
      action: onStartLearning,
      detail: enrollment?.reviewed_at ? `Approved ${formatDate(enrollment.reviewed_at)}` : null,
    },
    rejected: {
      icon: AlertCircle,
      title: 'Payment proof rejected',
      subtitle: enrollment?.rejection_reason || 'Review the payment details and submit a new proof when ready.',
      badge: <CourseStatusBadge tone="rejected" />,
      cta: 'Resubmit proof',
      action: onResubmitProof,
      detail: null,
    },
    cancelled: {
      icon: RotateCcw,
      title: 'Enrollment cancelled',
      subtitle: 'Start a new enrollment when you are ready to unlock this course.',
      badge: <CourseStatusBadge tone="cancelled" />,
      cta: 'Enroll now',
      action: onEnroll,
      detail: null,
    },
  } satisfies Record<CourseAccessStatus, {
    icon: typeof Unlock;
    title: string;
    subtitle: string;
    badge: JSX.Element;
    cta: string;
    action: () => void;
    detail: string | null;
  }>;

  const state = states[accessStatus];
  const Icon = state.icon;
  const approved = accessStatus === 'approved';

  return (
    <section className={`overflow-hidden rounded-2xl border bg-white shadow-soft ${approved ? 'border-emerald-100' : 'border-slate-200'}`}>
      <div className={`h-1.5 ${approved ? 'bg-gradient-to-r from-emerald-400 via-elios-yellow to-elios-blue' : 'bg-elios-navy'}`} />
      <div className="grid gap-5 p-5 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center md:p-6">
        <span className={`grid h-16 w-16 place-items-center rounded-2xl ${iconStyles[accessStatus]}`}>
          <Icon className="h-8 w-8" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {state.badge}
            {approved ? <CourseStatusBadge tone="full-access" /> : null}
          </div>
          <h2 className="mt-3 text-2xl font-black text-elios-navy">{state.title}</h2>
          <p className="mt-2 max-w-2xl leading-7 text-slate-600">{state.subtitle}</p>
          {state.detail ? <p className="mt-3 text-sm font-bold text-elios-navy">{state.detail}</p> : null}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row md:w-56 md:flex-col">
          <button type="button" onClick={state.action} className="rounded-lg bg-elios-yellow px-5 py-3 text-sm font-black text-elios-navy transition hover:bg-yellow-300">
            {state.cta}
          </button>
          {onContactTeacher ? (
            <button type="button" onClick={onContactTeacher} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm font-bold text-elios-navy hover:bg-slate-50">
              <MessageCircle className="h-4 w-4" />Contact teacher
            </button>
          ) : null}
          {onOpenExternalCourse ? (
            <button type="button" onClick={onOpenExternalCourse} className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-bold text-elios-blue">
              External course <ExternalLink className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
