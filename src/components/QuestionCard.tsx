import { CalendarDays, CheckCircle2, Clock, Eye, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDate } from '../lib/utils';
import { QuestionWithStudent } from '../types/database';
import { useAuth } from '../contexts/AuthContext';
import ReportButton from './ReportButton';

export default function QuestionCard({ question }: { question: QuestionWithStudent }) {
  const { profile } = useAuth();
  const isAnswered = question.status === 'answered';
  const isMine = profile?.id === question.student_id;
  const teacherCanAnswer = profile?.role === 'teacher' && question.status !== 'closed';
  const teacherAnswered = Boolean(question.teacher_answered);
  const statusLabel = question.status === 'answered'
    ? 'Répondue'
    : question.status === 'closed'
      ? 'Clôturée'
      : 'Ouverte';
  const statusClassName = question.status === 'answered'
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
    : question.status === 'closed'
      ? 'bg-slate-100 text-slate-600 ring-slate-200'
      : 'bg-amber-50 text-amber-700 ring-amber-100';

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[#DCE5F0] bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-soft">
      {question.image_url ? (
        <Link to={`/questions/${question.id}`} className="block h-44 overflow-hidden bg-elios-sky">
          <img src={question.image_url} alt="" className="h-full w-full object-cover" />
        </Link>
      ) : null}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-elios-sky px-3 py-1 text-xs font-bold text-elios-navy">{question.subject}</span>
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusClassName}`}>
            {isAnswered ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
            {statusLabel}
          </span>
          {question.best_answer_id ? <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-elios-navy ring-1 ring-elios-yellow">Meilleure réponse</span> : null}
          {isMine ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-elios-navy ring-1 ring-slate-200">Votre question</span> : null}
          {profile?.role === 'teacher' && teacherAnswered ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">Répondu par vous</span> : null}
          {profile?.role === 'teacher' && !teacherAnswered && question.status === 'open' ? <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-bold text-elios-navy ring-1 ring-yellow-100">À répondre</span> : null}
        </div>

        <Link to={`/questions/${question.id}`} className="mt-4 line-clamp-2 text-xl font-bold leading-7 text-elios-navy transition group-hover:text-elios-blue">
          {question.title}
        </Link>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#526176]">{question.description}</p>

        <div className="mt-auto pt-5">
          <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
            <img
              src={question.profiles?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${question.profiles?.full_name || 'Student'}`}
              alt=""
              className="h-9 w-9 rounded-full bg-slate-100 object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-elios-navy">{question.profiles?.full_name || 'Étudiant'}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#526176]">
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {formatDate(question.created_at)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {question.answer_count ?? 0} réponse{(question.answer_count ?? 0) === 1 ? '' : 's'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <Link to={teacherCanAnswer && !teacherAnswered ? `/questions/${question.id}#answer` : `/questions/${question.id}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-elios-navy px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#061733]">
              <Eye className="h-4 w-4" />
              Voir la discussion
            </Link>
            {profile ? <ReportButton targetType="question" targetId={question.id} /> : null}
          </div>
        </div>
      </div>
    </article>
  );
}
