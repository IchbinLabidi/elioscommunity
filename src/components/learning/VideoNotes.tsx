import { Lock, Pencil, StickyNote, Trash2 } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { getErrorMessage } from '../../lib/debug';
import useFormDraft, { draftKey } from '../../hooks/useFormDraft';
import { createVideoNote, deleteVideoNote, getMyVideoNotes, updateVideoNote } from '../../services/videoLearningService';
import { Profile, VideoNote } from '../../types/database';
import { formatSeconds } from '../../utils/time';
import ActionDialog from '../ui/ActionDialog';

type Props = {
  videoId: string;
  profile: Profile | null;
  currentTime: number | null;
  onSeek: (seconds: number) => void;
  embedded?: boolean;
};

export default function VideoNotes({ videoId, profile, currentTime, onSeek, embedded = false }: Props) {
  const [notes, setNotes] = useState<VideoNote[]>([]);
  const [content, setContent] = useState('');
  const [editing, setEditing] = useState<VideoNote | null>(null);
  const [editContent, setEditContent] = useState('');
  const [attachTime, setAttachTime] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const noteDraft = useFormDraft({
    key: draftKey(profile?.id, `student:video-note:${videoId}`),
    values: { content, attachTime },
    onRestore: (values) => {
      setContent(values.content);
      setAttachTime(values.attachTime);
    },
    expiresInMs: 24 * 60 * 60 * 1000,
    enabled: profile?.role === 'student',
  });

  const canUseNotes = profile?.role === 'student';

  const loadNotes = useCallback(async () => {
    if (!canUseNotes) return;
    setLoading(true);
    setError('');
    try {
      setNotes(await getMyVideoNotes(videoId));
    } catch (err) {
      setError(getErrorMessage(err, 'Impossible de charger vos notes.'));
    } finally {
      setLoading(false);
    }
  }, [canUseNotes, videoId]);

  useEffect(() => {
    setNotes([]);
    loadNotes();
  }, [loadNotes]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    setError('');
    try {
      await createVideoNote(videoId, content, attachTime && currentTime !== null ? Math.floor(currentTime) : null);
      noteDraft.clearDraft();
      setContent('');
      await loadNotes();
    } catch (err) {
      setError(getErrorMessage(err, 'Impossible d’enregistrer votre note.'));
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit() {
    if (!editing || !editContent.trim()) return;
    setSaving(true);
    setError('');
    try {
      await updateVideoNote(editing.id, editContent, editing.timestamp_seconds);
      setEditing(null);
      setEditContent('');
      await loadNotes();
    } catch (err) {
      setError(getErrorMessage(err, 'Impossible de modifier votre note.'));
    } finally {
      setSaving(false);
    }
  }

  async function removeNote() {
    if (!deletingNoteId) return;
    setSaving(true);
    setError('');
    try {
      await deleteVideoNote(deletingNoteId);
      setDeletingNoteId(null);
      await loadNotes();
    } catch (err) {
      setError(getErrorMessage(err, 'Impossible de supprimer votre note.'));
    } finally {
      setSaving(false);
    }
  }

  if (!canUseNotes) {
    return (
      <section className={embedded ? 'pt-4' : 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5'}>
        <h3 className="inline-flex items-center gap-2 font-bold text-elios-navy"><Lock className="h-5 w-5 text-elios-blue" />Notes privées</h3>
        <p className="mt-3 text-sm text-slate-600">Les notes privées sont réservées aux étudiants et ne sont jamais visibles par les professeurs.</p>
      </section>
    );
  }

  return (
    <section className={embedded ? 'pt-4' : 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5'}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="inline-flex items-center gap-2 font-bold text-elios-navy"><StickyNote className="h-5 w-5 text-elios-blue" />Mes notes</h3>
        <span className="text-xs font-semibold text-slate-500">Visibles uniquement par vous</span>
      </div>
      {error ? <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <form onSubmit={submit} className="mt-3 space-y-3">
        <textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={2000} placeholder="Prenez vos notes personnelles pendant le cours..." className="min-h-[88px] w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-elios-blue" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={attachTime} onChange={(event) => setAttachTime(event.target.checked)} />
            Joindre le moment actuel de la vidéo {currentTime !== null ? `(${formatSeconds(currentTime)})` : ''}
          </label>
          <button disabled={saving || !content.trim()} className="rounded-xl bg-brand-orange px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">Enregistrer</button>
        </div>
        {noteDraft.restored ? <p className="text-xs font-semibold text-orange-700">Votre note non enregistrée a été restaurée.</p> : null}
      </form>
      {loading ? <p className="mt-4 text-sm text-slate-500">Chargement des notes...</p> : (
        <div className="mt-4 space-y-3">
          {notes.length ? notes.map((note) => (
            <article key={note.id} className="rounded-lg bg-yellow-50 p-3">
              {editing?.id === note.id ? (
                <div className="space-y-2">
                  <textarea value={editContent} onChange={(event) => setEditContent(event.target.value)} className="min-h-20 w-full rounded-lg border border-yellow-200 p-3 text-sm" />
                  <div className="flex gap-2">
                    <button type="button" onClick={saveEdit} disabled={saving} className="rounded-lg bg-elios-navy px-3 py-2 text-xs font-bold text-white">Enregistrer</button>
                    <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-yellow-200 px-3 py-2 text-xs font-bold text-slate-600">Annuler</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {note.timestamp_seconds !== null ? (
                      <button type="button" onClick={() => onSeek(note.timestamp_seconds ?? 0)} className="rounded-full bg-white px-2 py-1 text-xs font-bold text-elios-blue">{formatSeconds(note.timestamp_seconds)}</button>
                    ) : <span />}
                    <div className="flex gap-2 text-xs font-bold text-slate-500">
                      <button type="button" onClick={() => { setEditing(note); setEditContent(note.content); }} className="inline-flex items-center gap-1"><Pencil className="h-3.5 w-3.5" />Modifier</button>
                      <button type="button" onClick={() => setDeletingNoteId(note.id)} className="inline-flex items-center gap-1 text-red-600"><Trash2 className="h-3.5 w-3.5" />Supprimer</button>
                    </div>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{note.content}</p>
                </>
              )}
            </article>
          )) : <p className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">Prenez vos notes personnelles pendant le cours.</p>}
        </div>
      )}
      <ActionDialog open={Boolean(deletingNoteId)} title="Supprimer cette note ?" message="Cette note privée sera supprimée." confirmLabel="Supprimer" danger busy={saving} resetKey={deletingNoteId ?? ''} onClose={() => setDeletingNoteId(null)} onConfirm={() => void removeNote()} />
    </section>
  );
}
