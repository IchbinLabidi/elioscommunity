import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import EnrollmentStatusBadge from '../components/EnrollmentStatusBadge';
import PaymentInstructionsCard from '../components/PaymentInstructionsCard';
import PaymentProofUpload from '../components/PaymentProofUpload';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { money } from '../lib/utils';
import { getPublishedCourseById } from '../services/coursesService';
import { createEnrollment, getMyEnrollmentForCourse, validatePaymentProofFile } from '../services/enrollmentsService';
import { Course, CourseEnrollment } from '../types/database';

export default function CourseEnrollmentPage() {
  const { courseId } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<CourseEnrollment | null>(null);
  const [proof, setProof] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!courseId) return;
    setLoading(true);
    Promise.all([getPublishedCourseById(courseId), getMyEnrollmentForCourse(courseId)])
      .then(([courseData, enrollmentData]) => {
        setCourse(courseData as Course);
        setEnrollment(enrollmentData);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load enrollment page.'))
      .finally(() => setLoading(false));
  }, [courseId]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!courseId || !course) return;
    if (profile?.role !== 'student') return setError('Only students can enroll in courses.');
    if (Number(course.price) <= 0) return setError('This course is free. You can start learning directly.');
    if (!proof) return setError('Upload your proof of payment.');
    const validation = validatePaymentProofFile(proof);
    if (validation) return setError(validation);
    if (note.length > 1000) return setError('Payment note must be 1000 characters or less.');

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const saved = await createEnrollment(courseId, proof, note.trim());
      setEnrollment(saved);
      setSuccess('Your payment proof has been submitted. The teacher will review it soon.');
      setProof(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit enrollment.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error && !course) return <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>;
  if (!course) return <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">Course not found.</p>;

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-elios-blue">Course enrollment</p>
        <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-elios-navy">{course.title}</h1>
            <p className="mt-2 text-lg font-bold text-elios-navy">{money(Number(course.price), course.currency ?? 'TND')}</p>
          </div>
          {enrollment ? <EnrollmentStatusBadge status={enrollment.status} /> : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <PaymentInstructionsCard course={course} />
        <form onSubmit={submit} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-elios-navy">Submit proof of payment</h2>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-600">
            <li>Pay using the teacher instructions.</li>
            <li>Upload proof of payment.</li>
            <li>Wait for teacher approval.</li>
          </ol>
          <p className="mt-4 rounded-lg bg-elios-sky p-3 text-sm font-semibold text-elios-navy">Your access will be activated after the teacher approves your payment.</p>
          {error ? <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
          {success ? <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p> : null}
          {enrollment?.status === 'approved' ? (
            <Link to={`/courses/${course.id}/learn`} className="mt-5 inline-flex rounded-lg bg-elios-yellow px-4 py-3 font-bold text-elios-navy">Start learning</Link>
          ) : (
            <div className="mt-5 space-y-4">
              <PaymentProofUpload file={proof} onChange={setProof} />
              <label className="block text-sm font-semibold text-elios-navy">
                Payment note
                <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} maxLength={1000} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3" />
              </label>
              <button disabled={saving} className="rounded-lg bg-elios-navy px-5 py-3 font-bold text-white disabled:opacity-60">{saving ? 'Submitting...' : enrollment?.status === 'rejected' ? 'Resubmit proof' : 'Submit proof'}</button>
            </div>
          )}
          <button type="button" onClick={() => navigate('/student/enrollments')} className="mt-4 block text-sm font-bold text-elios-blue">View my enrollments</button>
        </form>
      </div>
    </section>
  );
}
