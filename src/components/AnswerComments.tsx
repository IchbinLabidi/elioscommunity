import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { MessageCircle, Pencil, Send, Trash2, X } from 'lucide-react';
import { getErrorMessage } from '../lib/debug';
import { formatDate } from '../lib/utils';
import { createAnswerComment, deleteAnswerComment, getCommentsByAnswerId, updateAnswerComment } from '../services/answerCommentsService';
import { AnswerCommentWithUser, Profile } from '../types/database';
import AuthPromptModal from './auth/AuthPromptModal';
import ReportButton from './ReportButton';
import DraftStatus from './forms/DraftStatus';
import useFormDraft, { draftKey } from '../hooks/useFormDraft';
import ActionDialog from './ui/ActionDialog';

type AnswerCommentsProps = {
  answerId: string;
  questionStudentId: string;
  answerTeacherId: string;
  profile: Profile | null;
  questionId?: string;
};

export default function AnswerComments({ answerId, questionStudentId, answerTeacherId, profile, questionId }: AnswerCommentsProps) {
  const [comments, setComments] = useState<AnswerCommentWithUser[]>([]);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [deletingComment, setDeletingComment] = useState<AnswerCommentWithUser | null>(null);

  const canComment = Boolean(
    profile
    && (
      profile.role === 'admin'
      || (profile.role === 'student' && profile.id === questionStudentId)
      || (profile.role === 'teacher' && profile.id === answerTeacherId)
    ),
  );
  const commentDraft = useFormDraft({
    key: draftKey(profile?.id, `answer-comment:${answerId}`),
    values: { draft },
    onRestore: (values) => setDraft(values.draft),
    expiresInMs: 24 * 60 * 60 * 1000,
    enabled: canComment,
  });

  const placeholder = profile?.role === 'teacher' ? 'Reply to the student...' : 'Reply to this teacher...';
  const visibleComments = useMemo(() => (showAll ? comments : comments.slice(0, 2)), [comments, showAll]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setComments(await getCommentsByAnswerId(answerId));
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load replies.'));
    } finally {
      setLoading(false);
    }
  }, [answerId]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!canComment) {
      setError('You are not allowed to reply to this answer.');
      return;
    }
    if (!draft.trim()) {
      setError('Reply cannot be empty.');
      return;
    }
    if (draft.trim().length > 2000) {
      setError('Reply must be 2000 characters or less.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await createAnswerComment(answerId, draft);
      setComments((current) => [...current, created]);
      commentDraft.clearDraft();
      setDraft('');
      setShowAll(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create reply.'));
    } finally {
      setSubmitting(false);
    }
  };

  const saveEdit = async (comment: AnswerCommentWithUser) => {
    setError('');
    if (!editDraft.trim()) {
      setError('Reply cannot be empty.');
      return;
    }
    if (editDraft.trim().length > 2000) {
      setError('Reply must be 2000 characters or less.');
      return;
    }

    setBusyId(comment.id);
    try {
      const updated = await updateAnswerComment(comment.id, editDraft);
      setComments((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setEditingId(null);
      setEditDraft('');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update reply.'));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    if (!deletingComment) return;
    const comment = deletingComment;
    setError('');
    setBusyId(comment.id);
    try {
      await deleteAnswerComment(comment.id);
      setComments((current) => current.map((item) => (item.id === comment.id ? { ...item, deleted_at: new Date().toISOString() } : item)));
      setDeletingComment(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete reply.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mt-5 border-t border-slate-100 pt-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-elios-navy">
        <MessageCircle className="h-4 w-4 text-elios-blue" />
        {comments.length} repl{comments.length === 1 ? 'y' : 'ies'}
      </div>

      {error ? <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-500">Loading replies...</p> : null}

      <div className="space-y-3">
        {visibleComments.map((comment) => {
          const isOwner = profile?.id === comment.user_id;
          const canDelete = isOwner || profile?.role === 'admin';
          const role = comment.profiles?.role ?? 'student';
          return (
            <div key={comment.id} className="flex gap-3">
              <img
                src={comment.profiles?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${comment.profiles?.full_name || 'User'}`}
                alt=""
                className="mt-1 h-8 w-8 rounded-full object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-elios-navy">{comment.profiles?.full_name || 'User'}</span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold capitalize text-slate-500 ring-1 ring-slate-200">{role}</span>
                    {comment.edited_at && !comment.deleted_at ? <span className="text-[11px] text-slate-400">Edited</span> : null}
                  </div>
                  {comment.deleted_at ? (
                    <p className="mt-1 text-sm italic text-slate-500">Comment deleted</p>
                  ) : editingId === comment.id ? (
                    <div className="mt-2">
                      <textarea value={editDraft} onChange={(event) => setEditDraft(event.target.value)} rows={3} maxLength={2000} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-elios-blue focus:ring-4 focus:ring-elios-sky" />
                      <div className="mt-2 flex gap-2">
                        <button type="button" onClick={() => saveEdit(comment)} disabled={busyId === comment.id} className="rounded-lg bg-elios-navy px-3 py-2 text-xs font-bold text-white disabled:opacity-60">Save</button>
                        <button type="button" onClick={() => { setEditingId(null); setEditDraft(''); }} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-elios-navy">
                          <X className="h-3 w-3" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-700">{comment.content}</p>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 pl-2 text-xs text-slate-500">
                  <span>{formatDate(comment.created_at)}</span>
                  {isOwner && !comment.deleted_at ? (
                    <button type="button" onClick={() => { setEditingId(comment.id); setEditDraft(comment.content); }} className="inline-flex items-center gap-1 font-bold text-slate-600 hover:text-elios-blue">
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                  ) : null}
                  {canDelete && !comment.deleted_at ? (
                    <button type="button" onClick={() => setDeletingComment(comment)} disabled={busyId === comment.id} className="inline-flex items-center gap-1 font-bold text-red-600 disabled:opacity-60">
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  ) : null}
                  {profile && !comment.deleted_at ? <ReportButton targetType="answer_comment" targetId={comment.id} /> : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {comments.length > 2 ? (
        <button type="button" onClick={() => setShowAll((current) => !current)} className="mt-3 text-sm font-bold text-elios-blue">
          {showAll ? 'Show fewer replies' : `View all ${comments.length} replies`}
        </button>
      ) : null}

      {canComment ? (
        <div className="mt-4">
          <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={2} maxLength={2000} placeholder={placeholder} className="min-h-12 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-elios-blue focus:ring-4 focus:ring-elios-sky" />
            <button disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-lg bg-elios-yellow px-4 py-2 text-sm font-bold text-elios-navy disabled:opacity-60">
              <Send className="h-4 w-4" />
              {submitting ? 'Replying...' : 'Reply'}
            </button>
          </form>
          <div className="mt-2"><DraftStatus status={commentDraft.status} lastSavedAt={commentDraft.lastSavedAt} /></div>
        </div>
      ) : !profile ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="font-bold text-elios-navy">Connectez-vous pour participer à la discussion.</p>
          <p className="mt-1 text-sm text-slate-600">Créez un compte pour commenter la réponse de ce professeur.</p>
          <button type="button" onClick={() => setAuthPromptOpen(true)} className="mt-3 rounded-lg bg-elios-yellow px-4 py-2 text-sm font-bold text-elios-navy hover:bg-yellow-300">
            Commenter
          </button>
        </div>
      ) : null}
      <AuthPromptModal
        isOpen={authPromptOpen}
        onClose={() => setAuthPromptOpen(false)}
        title="Connectez-vous pour commenter"
        description="Créez un compte gratuit pour participer à la discussion."
        redirectTo={`/questions/${questionId ?? ''}`}
        suggestedRole="student"
        actionLabel="Créer un compte"
      />
      <ActionDialog open={Boolean(deletingComment)} title="Supprimer ce commentaire ?" message="Cette action retirera le commentaire de la discussion." confirmLabel="Supprimer" danger busy={busyId === deletingComment?.id} resetKey={deletingComment?.id} onClose={() => setDeletingComment(null)} onConfirm={() => void remove()} />
    </div>
  );
}
