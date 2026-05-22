import { useEffect, useState } from 'react';
import ModerationActions from '../components/admin/ModerationActions';
import BackButton from '../components/navigation/BackButton';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import {
  AdminTargetType,
  deleteContent,
  getAdminAnswers,
  getAdminAttachments,
  getAdminChapters,
  getAdminComments,
  getAdminCourses,
  getAdminQuestions,
  getAdminRatings,
  getAdminVideos,
  hideContent,
  unhideContent,
} from '../services/adminService';

type Row = { id: string; title?: string; content?: string; review?: string | null; subject?: string; is_hidden?: boolean; hidden_reason?: string | null };

const loaders = {
  question: getAdminQuestions,
  answer: getAdminAnswers,
  answer_comment: getAdminComments,
  rating: getAdminRatings,
  course: getAdminCourses,
  chapter: getAdminChapters,
  video: getAdminVideos,
  attachment: getAdminAttachments,
};

function rowTitle(row: Row, type: string) {
  if (row.title) return row.title;
  if (row.content) return row.content.slice(0, 100);
  if (row.review) return row.review.slice(0, 100);
  return `${type} ${row.id.slice(0, 8)}`;
}

export default function AdminContentListPage({ type, heading }: { type: keyof typeof loaders; heading: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = () => {
    setLoading(true);
    loaders[type]().then((data) => setRows(data as Row[])).catch((err) => setError(err instanceof Error ? err.message : 'Unable to load content.')).finally(() => setLoading(false));
  };
  useEffect(load, [type]);

  const hide = async (row: Row) => {
    const reason = window.prompt('Hide reason') || 'Moderated by admin';
    await hideContent(type as AdminTargetType, row.id, reason);
    load();
  };
  const remove = async (row: Row) => {
    if (!window.confirm('Delete this content?')) return;
    await deleteContent(type as AdminTargetType, row.id, 'Deleted by admin');
    load();
  };

  return (
    <section className="space-y-5">
      <BackButton
        label={type === 'chapter' || type === 'video' || type === 'attachment' ? 'Back to courses moderation' : 'Back to dashboard'}
        fallbackTo={type === 'chapter' || type === 'video' || type === 'attachment' ? '/admin/courses' : '/admin/dashboard'}
      />
      <h1 className="text-3xl font-bold text-elios-navy">{heading}</h1>
      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {loading ? <LoadingSpinner /> : <div className="space-y-3">{rows.map((row) => (
        <article key={row.id} className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div><p className="font-bold text-elios-navy">{rowTitle(row, type)}</p>{row.is_hidden ? <p className="text-xs font-bold text-red-700">Hidden: {row.hidden_reason || 'No reason'}</p> : null}</div>
            <ModerationActions hidden={row.is_hidden} onHide={() => hide(row)} onUnhide={() => unhideContent(type as AdminTargetType, row.id).then(load)} onDelete={() => remove(row)} />
          </div>
        </article>
      ))}{!rows.length ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-500">No content found.</p> : null}</div>}
    </section>
  );
}
