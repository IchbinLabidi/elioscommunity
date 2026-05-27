import { ReactNode, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  FileText,
  Pencil,
  Plus,
  Trash2,
  Video,
} from 'lucide-react';
import { ChapterAttachment, ChapterVideo, CourseChapterWithContent } from '../../types/database';

type Props = {
  chapter: CourseChapterWithContent;
  open: boolean;
  onToggle: () => void;
  onAddVideo: () => void;
  onAddResource: () => void;
  onEditChapter: () => void;
  onDeleteChapter: () => void;
  onTogglePreview: () => void;
  onTogglePublished: () => void;
  onEditVideo: (video: ChapterVideo) => void;
  onDeleteVideo: (video: ChapterVideo) => void;
  onEditAttachment: (attachment: ChapterAttachment) => void;
  onDeleteAttachment: (attachment: ChapterAttachment) => void;
};

export default function ChapterBuilderCard(props: Props) {
  const { chapter, open } = props;
  const [menuOpen, setMenuOpen] = useState(false);
  const itemCount = chapter.videos.length + chapter.attachments.length;

  const choose = (action: () => void) => {
    setMenuOpen(false);
    action();
  };

  return (
    <article className="overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm">
      <div className="p-4 sm:p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <button type="button" onClick={props.onToggle} className="flex min-w-0 flex-1 items-start gap-3 text-left">
            <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-50 text-brand-orange">
              <BookOpen className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-black uppercase tracking-wide text-brand-orange">Chapitre {chapter.chapter_order}</span>
              <span className="mt-1 block truncate text-lg font-black text-brand-navy">{chapter.title}</span>
              <span className="mt-1 block text-xs font-semibold text-slate-500">
                {chapter.videos.length} vidéo(s) · {chapter.attachments.length} fichier(s)
              </span>
            </span>
            {open ? <ChevronUp className="ml-auto mt-2 h-4 w-4 shrink-0 text-slate-400" /> : <ChevronDown className="ml-auto mt-2 h-4 w-4 shrink-0 text-slate-400" />}
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge published={chapter.is_published} />
            {chapter.is_free_preview ? <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-brand-orange">Aperçu gratuit</span> : null}
            <button type="button" onClick={props.onEditChapter} aria-label="Modifier le chapitre" className="rounded-lg border border-brand-border p-2 text-brand-navy hover:bg-slate-50">
              <Pencil className="h-4 w-4" />
            </button>
            <button type="button" onClick={props.onDeleteChapter} aria-label="Supprimer le chapitre" className="rounded-lg border border-red-100 p-2 text-red-600 hover:bg-red-50">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          <div className="relative">
            <button type="button" onClick={() => setMenuOpen((current) => !current)} aria-expanded={menuOpen} className="inline-flex items-center gap-2 rounded-xl bg-brand-navy px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800">
              <Plus className="h-4 w-4" />
              Ajouter du contenu
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {menuOpen ? (
              <div className="absolute left-0 top-full z-10 mt-2 w-60 rounded-xl border border-brand-border bg-white p-2 shadow-lg">
                <MenuAction icon={<Video className="h-4 w-4" />} label="Ajouter une vidéo" onClick={() => choose(props.onAddVideo)} />
                <MenuAction icon={<FileText className="h-4 w-4" />} label="Ajouter une ressource" onClick={() => choose(props.onAddResource)} />
              </div>
            ) : null}
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <button type="button" onClick={props.onTogglePreview} className="rounded-xl border border-brand-border px-3 py-2.5 text-xs font-bold text-brand-navy hover:bg-slate-50">
              {chapter.is_free_preview ? 'Retirer aperçu' : 'Aperçu gratuit'}
            </button>
            <button type="button" onClick={props.onTogglePublished} className="rounded-xl border border-brand-border px-3 py-2.5 text-xs font-bold text-brand-navy hover:bg-slate-50">
              {chapter.is_published ? 'Passer en brouillon' : 'Publier'}
            </button>
          </div>
        </div>
      </div>

      {open ? (
        <div className="border-t border-brand-border bg-slate-50/70 p-4 sm:p-5">
          {!itemCount ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-5 text-center">
              <p className="text-sm font-bold text-brand-navy">Aucun contenu dans ce chapitre</p>
              <p className="mt-1 text-sm text-slate-500">Commencez par ajouter une vidéo ou une ressource.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button type="button" onClick={props.onAddVideo} className="rounded-xl bg-brand-orange px-4 py-2.5 text-xs font-bold text-white">Ajouter une vidéo</button>
                <button type="button" onClick={props.onAddResource} className="rounded-xl border border-brand-border px-4 py-2.5 text-xs font-bold text-brand-navy">Ajouter une ressource</button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {chapter.videos.map((video) => (
                <ContentRow
                  key={video.id}
                  icon={<Video className="h-4 w-4" />}
                  title={video.title}
                  meta={`${video.duration_seconds ? `${Math.ceil(video.duration_seconds / 60)} min · ` : ''}${video.video_path ? 'Vidéo importée' : 'Lien externe'}`}
                  published={video.is_published}
                  onEdit={() => props.onEditVideo(video)}
                  onDelete={() => props.onDeleteVideo(video)}
                />
              ))}
              {chapter.attachments.map((attachment) => (
                <ContentRow
                  key={attachment.id}
                  icon={<FileText className="h-4 w-4" />}
                  title={attachment.title}
                  meta={attachment.file_type?.includes('pdf') ? 'PDF' : 'Fichier joint'}
                  published={attachment.is_published}
                  onEdit={() => props.onEditAttachment(attachment)}
                  onDelete={() => props.onDeleteAttachment(attachment)}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </article>
  );
}

function MenuAction({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-brand-navy hover:bg-slate-50">
      <span className="text-brand-orange">{icon}</span>{label}
    </button>
  );
}

function ContentRow({ icon, title, meta, published, onEdit, onDelete }: { icon: ReactNode; title: string; meta: string; published: boolean; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-white p-3 sm:flex-row sm:items-center">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-50 text-brand-orange">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-brand-navy">{title}</p>
        <p className="mt-1 text-xs text-slate-500">{meta}</p>
      </div>
      <StatusBadge published={published} />
      <div className="flex items-center gap-1">
        <button type="button" onClick={onEdit} aria-label={`Modifier ${title}`} className="rounded-lg p-2 text-brand-navy hover:bg-slate-50"><Pencil className="h-4 w-4" /></button>
        <button type="button" onClick={onDelete} aria-label={`Supprimer ${title}`} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

function StatusBadge({ published }: { published: boolean }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${published ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{published ? 'Publié' : 'Brouillon'}</span>;
}
