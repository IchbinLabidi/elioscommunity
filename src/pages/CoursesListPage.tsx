import { BookOpen, Clock3, ListFilter, Search, Undo2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { CourseWithTeacher, Subject } from '../types/database';
import { getPublishedCourses } from '../services/coursesService';
import { getPublishedSubjects } from '../services/subjectsService';

const subjectIcons: Record<string, string> = {
  'Computer Science': '💻',
  Mathematics: '📐',
  Physics: '⚛️',
  Chemistry: '🧪',
  Biology: '🧬',
  Philosophy: '🧠',
  Arabic: '🔤',
  French: '🇫🇷',
  English: 'ENG',
  History: '🏛️',
  Geography: '🌍',
  Economics: '📊',
  Other: '📚',
};

function shortSubject(subject: string) {
  return subject === 'Computer Science' ? 'Informatique' : subject;
}

function CourseTile({ course }: { course: CourseWithTeacher }) {
  const lessons = typeof course.lesson_count === 'number' ? course.lesson_count : 0;
  const teacherName = course.profiles?.full_name ?? 'Elios teacher';

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft">
      <div className="relative aspect-[16/6.5] overflow-hidden bg-elios-navy">
        {course.cover_url ? (
          <img src={course.cover_url} alt="" className="h-full w-full object-cover opacity-80" />
        ) : (
          <div className="grid h-full place-items-center bg-gradient-to-r from-elios-blue to-slate-500 px-4 text-white">
            <span className="text-xl font-black uppercase leading-tight">{course.title}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-elios-navy/70 to-elios-navy/20" />
        <h3 className="absolute bottom-4 left-4 right-4 line-clamp-2 text-xl font-black uppercase leading-5 text-white">{course.title}</h3>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h4 className="line-clamp-2 text-lg font-black leading-6 text-elios-navy">{course.title}</h4>
          <span className="rounded-md bg-blue-50 px-3 py-2 text-xs font-black text-elios-blue">New</span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 text-sm">
          <span className="line-clamp-1 text-slate-500">{teacherName}</span>
          <span className="font-black">1h</span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 text-sm font-black">
          <span>{course.level || course.subject}</span>
          <span>{lessons} lessons</span>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <div className="h-2 flex-1 rounded-full bg-slate-200">
            <div className="h-2 rounded-full bg-elios-yellow" style={{ width: '0%' }} />
          </div>
          <span className="text-sm font-black">0%</span>
        </div>

        <Link to={`/courses/${course.id}`} className="mt-4 flex items-center justify-between rounded-lg bg-[#f3f2f8] px-4 py-3 text-sm font-black text-elios-navy">
          Start Course
          <span className="text-xl text-amber-700">→</span>
        </Link>
      </div>
    </article>
  );
}

export default function CoursesListPage() {
  const [courses, setCourses] = useState<CourseWithTeacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [query, setQuery] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [view, setView] = useState<'courses' | 'recordings'>('courses');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([getPublishedSubjects(), getPublishedCourses({ query })])
      .then(([subjectData, data]) => {
        setSubjects(subjectData);
        setCourses(data);
        setSelectedSubjectId((current) => current || data[0]?.subject_id || subjectData[0]?.id || '');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load courses.'))
      .finally(() => setLoading(false));
  }, [query]);

  const subjectStats = useMemo(() => {
    return subjects.map((subject) => {
      const subjectCourses = courses.filter((course) => course.subject_id === subject.id || course.subject === subject.name);
      const lessons = subjectCourses.reduce((total, course) => total + (course.lesson_count ?? 0), 0);
      return { subject, count: subjectCourses.length, lessons };
    }).filter((item) => item.count > 0 || item.subject.is_published);
  }, [courses, subjects]);

  const selectedCourses = useMemo(() => {
    return courses.filter((course) => course.subject_id === selectedSubjectId);
  }, [courses, selectedSubjectId]);

  const selectedLessons = selectedCourses.reduce((total, course) => total + (course.lesson_count ?? 0), 0);
  const selectedSubject = subjects.find((subject) => subject.id === selectedSubjectId) ?? subjects[0];

  return (
    <section className="min-h-[calc(100vh-72px)] bg-[#f7f6fb] px-3 py-6 text-elios-navy md:px-6">
      <div className="mx-auto grid max-w-[1500px] gap-7 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6 lg:max-h-[calc(100vh-48px)] lg:overflow-y-auto">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-[0.28em] text-amber-700">Subjects</h2>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#f3f2f8] text-sm font-black">{subjectStats.length}</span>
          </div>

          <div className="space-y-3">
            {subjectStats.map((item) => {
              const active = item.subject.id === selectedSubjectId;
              return (
                <button
                  key={item.subject.id}
                  type="button"
                  onClick={() => setSelectedSubjectId(item.subject.id)}
                  className={`flex w-full items-center gap-4 rounded-xl p-3 text-left transition ${active ? 'bg-elios-navy text-white' : 'bg-white text-elios-navy hover:bg-slate-50'}`}
                >
                  <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-lg shadow-sm ${active ? 'bg-white/10' : 'bg-[#f3f2f8]'}`}>{item.subject.icon ?? subjectIcons[item.subject.name] ?? '📚'}</span>
                  <span>
                    <span className="block text-lg font-black">{shortSubject(item.subject.name)}</span>
                    <span className={`text-sm font-black ${active ? 'text-white/85' : 'text-slate-500'}`}>{item.count} courses / {item.lessons} replays</span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-7 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-700">Selected subject</p>
              <h1 className="mt-1 text-4xl font-black leading-tight">{shortSubject(selectedSubject?.name ?? 'Courses')}</h1>
              <p className="mt-2 text-slate-500">Algo</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-[#f3f2f8] px-4 py-2 text-sm font-black">{selectedCourses.length} courses</span>
              <span className="rounded-full bg-[#f3f2f8] px-4 py-2 text-sm font-black">0 locked</span>
              <span className="rounded-full bg-[#f3f2f8] px-4 py-2 text-sm font-black">{selectedLessons} replays</span>
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="inline-flex w-fit rounded-xl bg-[#f3f2f8] p-1">
              <button type="button" onClick={() => setView('courses')} className={`inline-flex items-center gap-3 rounded-lg px-5 py-3 text-sm font-black ${view === 'courses' ? 'bg-elios-navy text-white' : 'text-slate-500'}`}>
                <ListFilter className="h-4 w-4" />
                Courses
                <span className={`grid h-7 min-w-7 place-items-center rounded-full px-2 ${view === 'courses' ? 'bg-white/15 text-white' : 'bg-white text-elios-navy'}`}>{selectedCourses.length}</span>
              </button>
              <button type="button" onClick={() => setView('recordings')} className={`inline-flex items-center gap-3 rounded-lg px-5 py-3 text-sm font-black ${view === 'recordings' ? 'bg-elios-navy text-white' : 'text-slate-500'}`}>
                <Undo2 className="h-4 w-4" />
                Recordings
                <span className={`grid h-7 min-w-7 place-items-center rounded-full px-2 ${view === 'recordings' ? 'bg-white/15 text-white' : 'bg-white text-elios-navy'}`}>{selectedLessons}</span>
              </button>
            </div>

            <label className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 xl:w-80">
              <Search className="h-4 w-4 text-slate-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search courses" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            </label>
          </div>

          <div className="mt-8 flex items-center justify-between">
            <h2 className="text-2xl font-black">Courses</h2>
            <span className="grid h-8 min-w-8 place-items-center rounded-full bg-[#f3f2f8] px-3 text-sm font-black">{selectedCourses.length}</span>
          </div>

          {error ? <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

          {loading ? <LoadingSpinner /> : selectedCourses.length ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {selectedCourses.map((course) => <CourseTile key={course.id} course={course} />)}
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState icon={view === 'courses' ? BookOpen : Clock3} title="No courses found" message="Try another subject or search term." />
            </div>
          )}
        </main>
      </div>
    </section>
  );
}
