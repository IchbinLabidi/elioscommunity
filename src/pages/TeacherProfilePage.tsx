import { BookOpen, ExternalLink, MapPin, MessageCircle, Pencil, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import CourseCard from '../components/CourseCard';
import { PageContainer } from '../components/layout/PageContainer';
import BackButton from '../components/navigation/BackButton';
import TeacherReviews from '../components/TeacherReviews';
import TeacherStats from '../components/TeacherStats';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { getCoursesByTeacherId } from '../services/coursesService';
import { followTeacher, getFollowerCount, isFollowingTeacher, unfollowTeacher } from '../services/followsService';
import { getTeacherById, getTeacherReviews, getTeacherStats } from '../services/teachersService';
import { Course, TeacherRatingWithStudent, TeacherWithStats } from '../types/database';

export default function TeacherProfilePage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, session } = useAuth();
  const [teacher, setTeacher] = useState<TeacherWithStats | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [reviews, setReviews] = useState<TeacherRatingWithStudent[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [followMessage, setFollowMessage] = useState('');
  const [followError, setFollowError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError('');
    Promise.all([
      getTeacherById(id),
      getCoursesByTeacherId(id),
      getTeacherReviews(id),
      getFollowerCount(id).catch(() => 0),
      profile?.role === 'student' ? isFollowingTeacher(id).catch(() => false) : Promise.resolve(false),
    ])
      .then(([teacherData, coursesData, reviewsData, count, currentFollowing]) => {
        setTeacher(teacherData);
        setCourses(coursesData);
        setReviews(reviewsData.slice(0, 6));
        setFollowerCount(count);
        setFollowing(currentFollowing);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load teacher profile.'))
      .finally(() => setLoading(false));
  }, [id, profile?.role]);

  const toggleFollow = async () => {
    if (!teacher) return;
    if (!session) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }
    if (profile?.role !== 'student') {
      setFollowError('Only students can follow teachers.');
      return;
    }

    setFollowBusy(true);
    setFollowError('');
    setFollowMessage('');
    try {
      if (following) {
        await unfollowTeacher(teacher.id);
        setFollowing(false);
        setFollowerCount((current) => Math.max(0, current - 1));
        setFollowMessage('Teacher unfollowed.');
      } else {
        await followTeacher(teacher.id);
        setFollowing(true);
        setFollowerCount((current) => current + 1);
        setFollowMessage('You are following this teacher.');
      }
    } catch (err) {
      setFollowError(err instanceof Error ? err.message : following ? 'Failed to unfollow teacher.' : 'Failed to follow teacher.');
    } finally {
      setFollowBusy(false);
    }
  };

  if (loading) return <PageContainer><LoadingSpinner /></PageContainer>;
  if (!teacher) return <PageContainer><p className="rounded-lg bg-white p-6">{error || 'Teacher not found.'}</p></PageContainer>;

  const stats = getTeacherStats(teacher);
  const contactLinks = [
    teacher.whatsapp ? { label: 'WhatsApp', href: `https://wa.me/${teacher.whatsapp.replace(/\D/g, '')}` } : null,
    teacher.website_url ? { label: 'Website', href: teacher.website_url } : null,
    teacher.linkedin_url ? { label: 'LinkedIn', href: teacher.linkedin_url } : null,
    teacher.facebook_url ? { label: 'Facebook', href: teacher.facebook_url } : null,
  ].filter(Boolean) as Array<{ label: string; href: string }>;

  return (
    <PageContainer className="space-y-6">
      <BackButton label="Back to teachers" fallbackTo="/teachers" />
      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {followError ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{followError}</p> : null}
      {followMessage ? <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{followMessage}</p> : null}
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
              <p className="mt-2 text-sm font-semibold text-blue-100">{followerCount} follower{followerCount === 1 ? '' : 's'}</p>
              {teacher.location ? <p className="mt-2 inline-flex items-center gap-2 text-sm text-blue-100"><MapPin className="h-4 w-4" /> {teacher.location}</p> : null}
              {teacher.subjects?.length ? <div className="mt-3 flex flex-wrap gap-2">{teacher.subjects.map((subject) => <span key={subject} className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">{subject}</span>)}</div> : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {!session || profile?.role === 'student' ? (
              <button
                type="button"
                onClick={toggleFollow}
                disabled={followBusy}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-3 font-bold transition disabled:cursor-wait disabled:opacity-70 ${following ? 'border border-white/30 bg-white/10 text-white hover:bg-white/20' : 'bg-elios-yellow text-elios-navy hover:bg-yellow-300'}`}
              >
                <UserPlus className="h-5 w-5" />
                {followBusy ? 'Saving...' : following ? 'Following' : 'Follow'}
              </button>
            ) : null}
            {profile?.id === teacher.id ? <Link to="/teacher/profile/edit" className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-3 font-bold text-elios-navy"><Pencil className="h-5 w-5" />Edit profile</Link> : null}
            {session && profile?.role !== 'student' ? <p className="max-w-56 text-sm font-semibold text-blue-100">Only students can follow teachers.</p> : null}
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
    </PageContainer>
  );
}
