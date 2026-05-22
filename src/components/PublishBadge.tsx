export default function PublishBadge({ published, preview, locked }: { published?: boolean; preview?: boolean; locked?: boolean }) {
  if (locked) return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">Locked</span>;
  if (preview) return <span className="rounded-full bg-elios-yellow px-3 py-1 text-xs font-bold text-elios-navy">Free preview</span>;
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${published ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{published ? 'Published' : 'Draft'}</span>;
}
