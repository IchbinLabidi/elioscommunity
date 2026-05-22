import { BookOpen, MessageCircle, UserPlus, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { followTeacher, isFollowingTeacher, unfollowTeacher } from '../services/followsService';
import RatingStars from './ui/RatingStars';
import { TeacherPublicStats, TeacherStats, TeacherWithStats } from '../types/database';

function firstStats(teacher: TeacherWithStats) {
  return (Array.isArray(teacher.teacher_public_stats) ? teacher.teacher_public_stats[0] : teacher.teacher_public_stats)
    ?? (Array.isArray(teacher.teacher_stats) ? teacher.teacher_stats[0] : teacher.teacher_stats);
}

function average(stats?: TeacherPublicStats | TeacherStats | null) {
  return Number('average_rating' in (stats ?? {}) ? (stats as TeacherPublicStats).average_rating : (stats as TeacherStats | null)?.rating_average ?? 0);
}

function count(stats?: TeacherPublicStats | TeacherStats | null) {
  return Number('total_ratings' in (stats ?? {}) ? (stats as TeacherPublicStats).total_ratings : (stats as TeacherStats | null)?.rating_count ?? 0);
}

export default function TeacherCard({ teacher }: { teacher: TeacherWithStats }) {
  const { profile } = useAuth();
  const stats = firstStats(teacher);
  const ratingAverage = average(stats);
  const ratingCount = count(stats);
  const answerCount = Number('total_answers' in (stats ?? {}) ? (stats as TeacherPublicStats).total_answers : (stats as TeacherStats | null)?.answer_count ?? 0);
  const courseCount = Number('total_courses' in (stats ?? {}) ? (stats as TeacherPublicStats).total_courses : (stats as TeacherStats | null)?.course_count ?? 0);
  const followerCount = 'follower_count' in (stats ?? {}) || 'total_followers' in (stats ?? {})
    ? Number((stats as TeacherPublicStats).follower_count ?? (stats as TeacherPublicStats).total_followers ?? 0)
    : null;
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [followError, setFollowError] = useState('');

  useEffect(() => {
    if (profile?.role !== 'student') return;
    isFollowingTeacher(teacher.id)
      .then(setFollowing)
      .catch(() => undefined);
  }, [profile?.role, teacher.id]);

  const toggleFollow = async () => {
    setFollowBusy(true);
    setFollowError('');
    try {
      if (following) {
        await unfollowTeacher(teacher.id);
        setFollowing(false);
      } else {
        await followTeacher(teacher.id);
        setFollowing(true);
      }
    } catch (err) {
      setFollowError(err instanceof Error ? err.message : 'Unable to update follow.');
    } finally {
      setFollowBusy(false);
    }
  };

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft">
      <div className="flex items-start gap-4">
        <img
          src={teacher.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${teacher.full_name}`}
          alt=""
          className="h-16 w-16 rounded-lg object-cover"
        />
        <div className="min-w-0">
          <Link to={`/teachers/${teacher.id}`} className="text-lg font-bold text-elios-navy hover:text-elios-blue">
            {teacher.full_name} {teacher.is_verified ? <span className="text-sm text-elios-blue">Verified</span> : null}
          </Link>
          <p className="text-sm font-medium text-elios-blue">{teacher.headline || teacher.specialty || 'Teacher'}</p>
          <div className="mt-2 flex items-center gap-2">
            <RatingStars value={ratingAverage} size="sm" />
            <span className="text-xs text-slate-500">
              {ratingCount > 0
                ? `${ratingAverage.toFixed(1)} (${ratingCount} review${ratingCount === 1 ? '' : 's'})`
                : 'No ratings yet'}
            </span>
          </div>
        </div>
      </div>
      {teacher.subjects?.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {teacher.subjects.slice(0, 3).map((subject) => <span key={subject} className="rounded-full bg-elios-sky px-3 py-1 text-xs font-bold text-elios-blue">{subject}</span>)}
        </div>
      ) : null}
      <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">{teacher.bio || 'Ready to help students learn with clarity and confidence.'}</p>
      <div className={`mt-5 grid gap-3 border-t border-slate-100 pt-4 text-sm text-slate-600 ${followerCount === null ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
        <span className="inline-flex items-center gap-2"><MessageCircle className="h-4 w-4 text-elios-blue" />{answerCount} answers</span>
        <span className="inline-flex items-center gap-2"><BookOpen className="h-4 w-4 text-elios-blue" />{courseCount} courses</span>
        {followerCount === null ? null : <span className="inline-flex items-center gap-2"><Users className="h-4 w-4 text-elios-blue" />{followerCount} followers</span>}
      </div>
      {followError ? <p className="mt-4 rounded-lg bg-red-50 p-2 text-xs font-semibold text-red-700">{followError}</p> : null}
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Link to={`/teachers/${teacher.id}`} className="flex-1 rounded-lg bg-elios-navy px-4 py-3 text-center text-sm font-bold text-white">
          View profile
        </Link>
        {profile?.role === 'student' ? (
          <button type="button" disabled={followBusy} onClick={toggleFollow} className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold disabled:opacity-60 ${following ? 'border border-slate-200 bg-white text-elios-navy' : 'bg-elios-yellow text-elios-navy'}`}>
            <UserPlus className="h-4 w-4" />
            {followBusy ? 'Saving...' : following ? 'Following' : 'Follow'}
          </button>
        ) : null}
      </div>
    </article>
  );
}
