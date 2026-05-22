import { BookOpen, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import LessonForm, { LessonFormValues } from '../components/LessonForm';
import LessonList from '../components/LessonList';
import BackButton from '../components/navigation/BackButton';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { getCourseById } from '../services/coursesService';
import {
  createLesson,
  deleteLesson,
  getTeacherLessonsByCourseId,
  toggleLessonPublished,
  updateLesson,
  uploadLessonPdf,
  uploadLessonVideo,
} from '../services/courseLessonsService';
import { Course, CourseLesson } from '../types/database';

export default function ManageCourseLessonsPage() {
  const { courseId } = useParams();
  const { profile } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<CourseLesson[]>([]);
  const [editingLesson, setEditingLesson] = useState<CourseLesson | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const nextOrder = useMemo(() => Math.max(0, ...lessons.map((lesson) => lesson.lesson_order)) + 1, [lessons]);

  const load = () => {
    if (!courseId) return;
    setLoading(true);
    setError('');
    Promise.all([getCourseById(courseId), getTeacherLessonsByCourseId(courseId)])
      .then(([courseData, lessonsData]) => {
        if (profile?.role === 'teacher' && courseData.teacher_id !== profile.id) {
          setError('You can only manage lessons for your own courses.');
          setCourse(null);
          setLessons([]);
          return;
        }
        setCourse(courseData);
        setLessons(lessonsData);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load course lessons.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [courseId, profile]);

  const submitLesson = async (values: LessonFormValues) => {
    if (!course || !profile) return;
    setSaving(true);
    setError('');
    try {
      const basePayload = {
        title: values.title.trim(),
        description: values.description.trim() || null,
        lesson_order: values.lesson_order,
        video_url: values.video_url.trim() || null,
        is_free_preview: values.is_free_preview,
        is_published: values.is_published,
      };

      const lesson = editingLesson
        ? await updateLesson(editingLesson.id, basePayload)
        : await createLesson(course.id, course.teacher_id, basePayload);

      const updates: { video_url?: string; video_path?: string; pdf_url?: string; pdf_path?: string } = {};
      if (values.videoFile) {
        const uploaded = await uploadLessonVideo(values.videoFile, course.teacher_id, course.id, lesson.id);
        updates.video_url = uploaded.publicUrl;
        updates.video_path = uploaded.path;
      }
      if (values.pdfFile) {
        const uploaded = await uploadLessonPdf(values.pdfFile, course.teacher_id, course.id, lesson.id);
        updates.pdf_url = uploaded.publicUrl;
        updates.pdf_path = uploaded.path;
      }
      if (Object.keys(updates).length) await updateLesson(lesson.id, updates);

      setShowForm(false);
      setEditingLesson(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save lesson.');
    } finally {
      setSaving(false);
    }
  };

  const removeLesson = async (lesson: CourseLesson) => {
    if (!window.confirm('Delete this lesson?')) return;
    await deleteLesson(lesson.id);
    load();
  };

  const toggleLesson = async (lesson: CourseLesson) => {
    await toggleLessonPublished(lesson.id, !lesson.is_published);
    load();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <section className="space-y-6">
      <BackButton label="Back to my courses" fallbackTo="/teacher/courses" />
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-elios-blue">Course lessons</p>
          <h1 className="mt-1 text-3xl font-bold text-elios-navy">{course?.title ?? 'Manage lessons'}</h1>
          <p className="mt-2 text-slate-600">Add videos, PDFs, previews, and lesson order for this course.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {course ? <Link to={`/courses/${course.id}`} className="rounded-lg border border-slate-200 px-4 py-3 text-center font-bold text-elios-blue">View public page</Link> : null}
          <button onClick={() => { setEditingLesson(null); setShowForm(true); }} className="inline-flex items-center justify-center gap-2 rounded-lg bg-elios-yellow px-4 py-3 font-bold text-elios-navy">
            <Plus className="h-5 w-5" />
            Add lesson
          </button>
        </div>
      </div>

      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      {showForm ? (
        <LessonForm
          lesson={editingLesson}
          nextOrder={nextOrder}
          saving={saving}
          onCancel={() => { setShowForm(false); setEditingLesson(null); }}
          onSubmit={submitLesson}
        />
      ) : null}

      {lessons.length ? (
        <LessonList
          lessons={lessons}
          onEdit={(lesson) => { setEditingLesson(lesson); setShowForm(true); }}
          onDelete={removeLesson}
          onTogglePublished={toggleLesson}
        />
      ) : (
        <EmptyState icon={BookOpen} title="No lessons yet" message="Add your first video or PDF lesson for this course." />
      )}
    </section>
  );
}
