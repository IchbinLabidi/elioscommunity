import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import EnrollmentCard from '../components/EnrollmentCard';
import BackButton from '../components/navigation/BackButton';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { getMyEnrollments } from '../services/enrollmentsService';
import { CourseEnrollmentWithCourse } from '../types/database';
import { CreditCard } from 'lucide-react';

export default function StudentEnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<CourseEnrollmentWithCourse[]>([]);
  const [activeStatus, setActiveStatus] = useState<CourseEnrollmentWithCourse['status']>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getMyEnrollments()
      .then(setEnrollments)
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load enrollments.'))
      .finally(() => setLoading(false));
  }, []);

  const tabs: Array<{ status: CourseEnrollmentWithCourse['status']; label: string }> = [
    { status: 'pending', label: 'Pending' },
    { status: 'approved', label: 'Approved' },
    { status: 'rejected', label: 'Rejected' },
    { status: 'cancelled', label: 'Cancelled' },
  ];
  const visibleEnrollments = enrollments.filter((enrollment) => enrollment.status === activeStatus);

  return (
    <section className="space-y-5">
      <BackButton label="Back to dashboard" fallbackTo="/student/dashboard" />
      <div>
        <h1 className="text-3xl font-bold text-elios-navy">My enrollments</h1>
        <p className="mt-2 text-slate-600">Track payment reviews separately from the courses you already own.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.status}
            type="button"
            onClick={() => setActiveStatus(tab.status)}
            className={`rounded-lg px-4 py-2 text-sm font-bold ${activeStatus === tab.status ? 'bg-elios-navy text-white' : 'border border-slate-200 bg-white text-elios-blue'}`}
          >
            {tab.label} ({enrollments.filter((enrollment) => enrollment.status === tab.status).length})
          </button>
        ))}
      </div>
      {activeStatus === 'approved' ? (
        <Link to="/student/courses" className="inline-flex w-fit rounded-lg bg-elios-yellow px-4 py-3 text-sm font-bold text-elios-navy">
          Open My courses
        </Link>
      ) : null}
      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {loading ? <LoadingSpinner /> : visibleEnrollments.length ? (
        <div className="space-y-3">{visibleEnrollments.map((enrollment) => <EnrollmentCard key={enrollment.id} enrollment={enrollment} />)}</div>
      ) : (
        <EmptyState icon={CreditCard} title={`No ${activeStatus} enrollments.`} message="Payment proof updates will appear here when they reach this status." />
      )}
    </section>
  );
}
