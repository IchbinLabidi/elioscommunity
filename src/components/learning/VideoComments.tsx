import { MessageSquare, Pencil, Reply, Trash2 } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { getErrorMessage } from '../../lib/debug';
import { createVideoComment, deleteVideoComment, getVideoComments, updateVideoComment } from '../../services/videoLearningService';
import { Profile, VideoCommentWithUser } from '../../types/database';
import { formatSeconds } from '../../utils/time';

type Props = {
  videoId: string;
  currentUserId?: string;
  profile: Profile | null;
  currentTime: number | null;
  onSeek: (seconds: number) => void;
};

export default function VideoComments({ videoId, currentUserId, profile, currentTime, onSeek }: Props) {
  const [comments, setComments] = useState<VideoCommentWithUser[]>([]);
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState<VideoCommentWithUser | null>(null);
  const [editing, setEditing] = useState<VideoCommentWithUser | null>(null);
  const [editContent, setEditContent] = useState('');
  const [attachTime, setAttachTime] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadComments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setComments(await getVideoComments(videoId));
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load comments.'));
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const rootComments = useMemo(() => comments.filter((comment) => !comment.parent_comment_id), [comments]);
  const repliesByParent = useMemo(() => {
    const map = new Map<string, VideoCommentWithUser[]>();
    comments.filter((comment) => comment.parent_comment_id).forEach((comment) => {
      const key = comment.parent_comment_id ?? '';
      map.set(key, [...(map.get(key) ?? []), comment]);
    });
    return map;
  }, [comments]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    setError('');
    try {
      await createVideoComment(videoId, content, attachTime && currentTime !== null ? Math.floor(currentTime) : null, replyTo?.id ?? null);
      setContent('');
      setReplyTo(null);
      setAttachTime(false);
      await loadComments();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to post comment.'));
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit() {
    if (!editing || !editContent.trim()) return;
    setSaving(true);
    setError('');
    try {
      await updateVideoComment(editing.id, editContent);
      setEditing(null);
      setEditContent('');
      await loadComments();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update comment.'));
    } finally {
      setSaving(false);
    }
  }

  async function removeComment(commentId: string) {
    if (!confirm('Delete this comment?')) return;
    setSaving(true);
    setError('');
    try {
      await deleteVideoComment(commentId);
      await loadComments();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete comment.'));
    } finally {
      setSaving(false);
    }
  }

  function renderComment(comment: VideoCommentWithUser, isReply = false) {
    const canManage = currentUserId === comment.user_id || profile?.role === 'admin';
    return (
      <div key={comment.id} className={isReply ? 'ml-8 border-l border-slate-200 pl-4' : ''}>
        <div className="rounded-lg bg-slate-50 p-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-bold text-elios-navy">{comment.profiles?.full_name ?? 'User'}</span>
            <span className="rounded-full bg-white px-2 py-0.5 font-semibold capitalize text-slate-600">{comment.profiles?.role ?? 'student'}</span>
            {comment.timestamp_seconds !== null ? (
              <button type="button" onClick={() => onSeek(comment.timestamp_seconds ?? 0)} className="font-bold text-elios-blue">
                {formatSeconds(comment.timestamp_seconds)}
              </button>
            ) : null}
          </div>
          {editing?.id === comment.id ? (
            <div className="mt-2 space-y-2">
              <textarea value={editContent} onChange={(event) => setEditContent(event.target.value)} className="min-h-20 w-full rounded-lg border border-slate-200 p-3 text-sm" />
              <div className="flex gap-2">
                <button type="button" onClick={saveEdit} disabled={saving} className="rounded-lg bg-elios-navy px-3 py-2 text-xs font-bold text-white">Save</button>
                <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">Cancel</button>
              </div>
            </div>
          ) : (
            <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{comment.content}</p>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-xs font-bold text-slate-500">
          {!isReply ? <button type="button" onClick={() => setReplyTo(comment)} className="inline-flex items-center gap-1"><Reply className="h-3.5 w-3.5" />Reply</button> : null}
          {canManage ? <button type="button" onClick={() => { setEditing(comment); setEditContent(comment.content); }} className="inline-flex items-center gap-1"><Pencil className="h-3.5 w-3.5" />Edit</button> : null}
          {canManage ? <button type="button" onClick={() => removeComment(comment.id)} className="inline-flex items-center gap-1 text-red-600"><Trash2 className="h-3.5 w-3.5" />Delete</button> : null}
        </div>
        {(repliesByParent.get(comment.id) ?? []).map((reply) => renderComment(reply, true))}
      </div>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="inline-flex items-center gap-2 font-bold text-elios-navy"><MessageSquare className="h-5 w-5 text-elios-blue" />Discussion</h3>
        <span className="text-xs font-semibold text-slate-500">Visible to students and teacher</span>
      </div>
      {error ? <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {loading ? <p className="mt-4 text-sm text-slate-500">Loading comments...</p> : (
        <div className="mt-4 space-y-4">
          {rootComments.length ? rootComments.map((comment) => renderComment(comment)) : <p className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">No comments yet. Start the discussion.</p>}
        </div>
      )}
      {profile ? (
        <form onSubmit={submit} className="mt-4 space-y-3">
          {replyTo ? <p className="text-xs font-semibold text-slate-500">Replying to {replyTo.profiles?.full_name ?? 'comment'} <button type="button" onClick={() => setReplyTo(null)} className="text-elios-blue">Cancel</button></p> : null}
          <textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={2000} placeholder="Add a comment for this video..." className="min-h-24 w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-elios-blue" />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="inline-flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={attachTime} onChange={(event) => setAttachTime(event.target.checked)} />
              Attach current time {currentTime !== null ? `(${formatSeconds(currentTime)})` : ''}
            </label>
            <button disabled={saving || !content.trim()} className="rounded-lg bg-elios-yellow px-4 py-2 text-sm font-bold text-elios-navy disabled:opacity-60">Post comment</button>
          </div>
        </form>
      ) : <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Log in to join the video discussion.</p>}
    </section>
  );
}
