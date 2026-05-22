import { BookOpen, ExternalLink, MapPin, MessageCircle, Pencil, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import CourseCard from '../components/CourseCard';
import TeacherReviews from '../components/TeacherReviews';
import TeacherStats from '../components/TeacherStats';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getCoursesByTeacherId } from '../services/coursesService';
import { getTeacherById, getTeacherReviews, getTeacherStats } from '../services/teachersService';
import { Course, TeacherRatingWithStudent, TeacherWithStats } from '../types/database';

export default function TeacherProfilePage() {
  const { id } = useParams();
  const { profile } = useAuth();
  const [teacher, setTeacher] = useState<TeacherWithStats | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [reviews, setReviews] = useState<TeacherRatingWithStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError('');
    Promise.all([getTeacherById(id), getCoursesByTeacherId(id), getTeacherReviews(id)])
      .then(([teacherData, coursesData, reviewsData]) => {
        setTeacher(teacherData);
        setCourses(coursesData);
        setReviews(reviewsData.slice(0, 6));
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load teacher profile.'))
      .finally(() => setLoading(false));
  }, [id]);

  const follow = async () => {
    if (!profile || !teacher) return;
    await supabase.from('follows').upsert({ student_id: profile.id, teacher_id: teacher.id });
  };

  if (loading) return <LoadingSpinner />;
  if (!teacher) return <p className="rounded-lg bg-white p-6">{error || 'Teacher not found.'}</p>;

  const stats = getTeacherStats(teacher);
  const contactLinks = [
    teacher.whatsapp ? { label: 'WhatsApp', href: `https://wa.me/${teacher.whatsapp.replace(/\D/g, '')}` } : null,
    teacher.website_url ? { label: 'Website', href: teacher.website_url } : null,
    teacher.linkedin_url ? { label: 'LinkedIn', href: teacher.linkedin_url } : null,
    teacher.facebook_url ? { label: 'Facebook', href: teacher.facebook_url } : null,
  ].filter(Boolean) as Array<{ label: string; href: string }>;

  return (
    <section className="space-y-6">
      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <div className="rounded-lg bg-elios-navy p-6 text-white shadow-soft">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <img src={teacher.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${teacher.full_name}`} alt="" className="h-28 w-28 rounded-lg object-cover" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-bold">{teacher.full_name}</h1>
                {teacher.is_verified ? <span className="rounded-full bg-elios-yellow px-3 py-1 text-xs font-bold text-elios-navy">Verified</span> : null}
              </div>
              <p className="mt-1 text-blue-100">{teacher.headline || teacher.specialty}</p>
              {teacher.location ? <p className="mt-2 inline-flex items-center gap-2 text-sm text-blue-100"><MapPin className="h-4 w-4" /> {teacher.location}</p> : null}
              {teacher.subjects?.length ? <div className="mt-3 flex flex-wrap gap-2">{teacher.subjects.map((subject) => <span key={subject} className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">{subject}</span>)}</div> : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile?.role === 'student' ? <button onClick={follow} className="inline-flex items-center gap-2 rounded-lg bg-elios-yellow px-4 py-3 font-bold text-elios-navy"><UserPlus className="h-5 w-5" />Follow</button> : null}
            {profile?.id === teacher.id ? <Link to="/teacher/profile/edit" className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-3 font-bold text-elios-navy"><Pencil className="h-5 w-5" />Edit profile</Link> : null}
          </div>
        </div>
      </div>

      <TeacherStats stats={stats} />

      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="font-bold text-elios-navy">About</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{teacher.bio || 'This teacher is preparing their profile.'}</p>
            {teacher.experience ? <p className="mt-3 text-sm leading-6 text-slate-600">{teacher.experience}</p> : null}
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="font-bold text-elios-navy">Education and languages</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{teacher.education || 'Education details not added yet.'}</p>
            {teacher.languages?.length ? <p className="mt-3 text-sm text-slate-600">Languages: {teacher.languages.join(', ')}</p> : null}
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="font-bold text-elios-navy">Contact</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {contactLinks.length ? contactLinks.map((link) => (
                <a key={link.label} href={link.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-elios-blue hover:bg-slate-50">
                  {link.label} <ExternalLink className="h-4 w-4" />
                </a>
              )) : <p className="text-sm text-slate-500">No public contact method added.</p>}
            </div>
          </div>
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-xl font-bold text-elios-navy"><MessageCircle className="h-5 w-5" /> Reviews</h2>
            <TeacherReviews reviews={reviews} />
          </div>
        </div>
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-elios-navy"><BookOpen className="h-5 w-5" /> Courses</h2>
          {courses.length ? <div className="grid gap-4 md:grid-cols-2">{courses.map((course) => <CourseCard key={course.id} course={course} />)}</div> : <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">No published courses yet.</p>}
        </div>
      </div>
    </section>
  );
}
