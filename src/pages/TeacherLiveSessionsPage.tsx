import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import TeacherLiveSessionsManager from '../components/live/TeacherLiveSessionsManager';
import BackButton from '../components/navigation/BackButton';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { getCourseById } from '../services/coursesService';
import { Course } from '../types/database';

export default function TeacherLiveSessionsPage() {
  const { courseId = '' } = useParams();
  const { profile } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    getCourseById(courseId).then((row) => {
      if (profile?.role === 'teacher' && row.teacher_id !== profile.id) throw new Error('Cours non autorisé.');
      setCourse(row);
    }).catch(() => setError('Impossible de charger le cours.')).finally(() => setLoading(false));
  }, [courseId, profile]);
  if (loading) return <LoadingSpinner label="Chargement des sessions live" />;
  if (!course) return <p className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>;
  return (
    <section className="mx-auto max-w-[1180px] space-y-6">
      <BackButton label="Retour à mes cours" fallbackTo="/teacher/courses" />
      <header>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-orange">Sessions live</p>
        <h1 className="mt-2 text-3xl font-black text-brand-navy">{course.title}</h1>
        <p className="mt-2 text-slate-600">Gérez vos sessions Google Meet, les enregistrements et les accès étudiants.</p>
      </header>
      <TeacherLiveSessionsManager course={course} />
    </section>
  );
}
