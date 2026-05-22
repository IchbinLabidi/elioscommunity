import { useEffect, useState } from 'react';
import EnrollmentCard from '../components/EnrollmentCard';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { getMyEnrollments } from '../services/enrollmentsService';
import { CourseEnrollmentWithCourse } from '../types/database';
import { CreditCard } from 'lucide-react';

export default function StudentEnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<CourseEnrollmentWithCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getMyEnrollments()
      .then(setEnrollments)
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load enrollments.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-elios-navy">My enrollments</h1>
        <p className="mt-2 text-slate-600">Track your paid course access requests.</p>
      </div>
      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {loading ? <LoadingSpinner /> : enrollments.length ? (
        <div className="space-y-3">{enrollments.map((enrollment) => <EnrollmentCard key={enrollment.id} enrollment={enrollment} />)}</div>
      ) : (
        <EmptyState icon={CreditCard} title="No enrollments yet." message="When you submit a payment proof, it will appear here." />
      )}
    </section>
  );
}
