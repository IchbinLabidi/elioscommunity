import { Lock, MessageCircle } from 'lucide-react';

export default function LockedContentCard({ whatsapp }: { whatsapp?: string | null }) {
  const phone = whatsapp?.replace(/\D/g, '');
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
      <div className="flex items-center gap-2 font-semibold text-elios-navy">
        <Lock className="h-5 w-5 text-elios-blue" />
        This chapter is locked.
      </div>
      <p className="mt-1">Contact the teacher to enroll and access videos and files.</p>
      {phone ? (
        <a href={`https://wa.me/${phone}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-elios-navy px-4 py-2 font-bold text-white">
          <MessageCircle className="h-4 w-4" />
          Contact teacher
        </a>
      ) : null}
    </div>
  );
}
