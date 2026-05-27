import { MessageSquare, Pencil, Reply, Trash2 } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { getErrorMessage } from '../../lib/debug';
import useFormDraft, { draftKey } from '../../hooks/useFormDraft';
import { createVideoComment, deleteVideoComment, getVideoComments, updateVideoComment } from '../../services/videoLearningService';
import { Profile, VideoCommentWithUser } from '../../types/database';
import { formatSeconds } from '../../utils/time';
import ActionDialog from '../ui/ActionDialog';

type Props = {
  videoId: string;
  currentUserId?: string;
  profile: Profile | null;
  currentTime: number | null;
  onSeek: (seconds: number) => void;
  embedded?: boolean;
};

export default function VideoComments({ videoId, currentUserId, profile, currentTime, onSeek, embedded = false }: Props) {
  const [comments, setComments] = useState<VideoCommentWithUser[]>([]);
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState<VideoCommentWithUser | null>(null);
  const [editing, setEditing] = useState<VideoCommentWithUser | null>(null);
  const [editContent, setEditContent] = useState('');
  const [attachTime, setAttachTime] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const commentDraft = useFormDraft({
    key: draftKey(profile?.id, `discussion:${videoId}`),
    values: { content, attachTime },
    onRestore: (values) => {
      setContent(values.content);
      setAttachTime(values.attachTime);
    },
    expiresInMs: 24 * 60 * 60 * 1000,
    enabled: Boolean(profile),
  });

  const loadComments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setComments(await getVideoComments(videoId));
    } catch (err) {
      setError(getErrorMessage(err, 'Impossible de charger la discussion.'));
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
      commentDraft.clearDraft();
      setContent('');
      setReplyTo(null);
      setAttachTime(false);
      await loadComments();
    } catch (err) {
      setError(getErrorMessage(err, 'Impossible de publier votre message.'));
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
      setError(getErrorMessage(err, 'Impossible de modifier votre message.'));
    } finally {
      setSaving(false);
    }
  }

  async function removeComment() {
    if (!deletingCommentId) return;
    setSaving(true);
    setError('');
    try {
      await deleteVideoComment(deletingCommentId);
      setDeletingCommentId(null);
      await loadComments();
    } catch (err) {
      setError(getErrorMessage(err, 'Impossible de supprimer votre message.'));
    } finally {
      setSaving(false);
    }
  }

  function renderComment(comment: VideoCommentWithUser, isReply = false) {
    const canManage = currentUserId === comment.user_id || profile?.role === 'admin';
    return (
      <div key={comment.id} className={isReply ? 'ml-8 border-l border-slate-200 pl-4' : ''}>
        <div className="rounded-xl bg-slate-50 p-3">
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
                    <button type="button" onClick={saveEdit} disabled={saving} className="rounded-lg bg-elios-navy px-3 py-2 text-xs font-bold text-white">Enregistrer</button>
                    <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">Annuler</button>
              </div>
            </div>
          ) : (
            <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{comment.content}</p>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-xs font-bold text-slate-500">
          {!isReply ? <button type="button" onClick={() => setReplyTo(comment)} className="inline-flex items-center gap-1"><Reply className="h-3.5 w-3.5" />Répondre</button> : null}
          {canManage ? <button type="button" onClick={() => { setEditing(comment); setEditContent(comment.content); }} className="inline-flex items-center gap-1"><Pencil className="h-3.5 w-3.5" />Modifier</button> : null}
          {canManage ? <button type="button" onClick={() => setDeletingCommentId(comment.id)} className="inline-flex items-center gap-1 text-red-600"><Trash2 className="h-3.5 w-3.5" />Supprimer</button> : null}
        </div>
        {(repliesByParent.get(comment.id) ?? []).map((reply) => renderComment(reply, true))}
      </div>
    );
  }

  return (
    <section className={embedded ? 'pt-4' : 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5'}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="inline-flex items-center gap-2 font-bold text-elios-navy"><MessageSquare className="h-5 w-5 text-elios-blue" />Discussion</h3>
        <span className="text-xs font-semibold text-slate-500">Visible par la classe</span>
      </div>
      {error ? <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {loading ? <p className="mt-3 text-sm text-slate-500">Chargement de la discussion...</p> : (
        <div className="mt-3 space-y-3">
          {rootComments.length ? rootComments.map((comment) => renderComment(comment)) : <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">Aucune discussion pour le moment.</p>}
        </div>
      )}
      {profile ? (
        <form onSubmit={submit} className="mt-3 space-y-3">
          {replyTo ? <p className="text-xs font-semibold text-slate-500">Réponse à {replyTo.profiles?.full_name ?? 'un message'} <button type="button" onClick={() => setReplyTo(null)} className="text-elios-blue">Annuler</button></p> : null}
          <textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={2000} placeholder="Posez une question ou partagez une remarque..." className="min-h-[88px] w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-elios-blue" />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="inline-flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={attachTime} onChange={(event) => setAttachTime(event.target.checked)} />
              Joindre le moment actuel de la vidéo {currentTime !== null ? `(${formatSeconds(currentTime)})` : ''}
            </label>
            <button disabled={saving || !content.trim()} className="rounded-xl bg-brand-orange px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">Publier</button>
          </div>
          {commentDraft.restored ? <p className="text-xs font-semibold text-orange-700">Votre message non publié a été restauré.</p> : null}
        </form>
      ) : <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Connectez-vous pour participer à la discussion.</p>}
      <ActionDialog open={Boolean(deletingCommentId)} title="Supprimer ce message ?" message="Ce message sera retiré de la discussion." confirmLabel="Supprimer" danger busy={saving} resetKey={deletingCommentId ?? ''} onClose={() => setDeletingCommentId(null)} onConfirm={() => void removeComment()} />
    </section>
  );
}
