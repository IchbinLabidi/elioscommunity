import { CheckCircle2, Clock, Eye, MessageSquare, MessageSquarePlus } from 'lucide-react';
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

  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft">
      {question.image_url ? (
        <Link to={`/questions/${question.id}`} className="block aspect-[16/7] bg-elios-sky">
          <img src={question.image_url} alt="" className="h-full w-full object-cover" />
        </Link>
      ) : null}
      <div className="p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-elios-sky px-3 py-1 text-xs font-bold text-elios-blue">{question.subject}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {isAnswered ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <Clock className="h-3 w-3 text-amber-600" />}
          {question.status}
        </span>
        {isMine ? <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-bold text-elios-navy">Your question</span> : null}
        {profile?.role === 'teacher' && teacherAnswered ? (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Replied</span>
        ) : null}
        {profile?.role === 'teacher' && !teacherAnswered && question.status === 'open' ? (
          <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-bold text-elios-navy">Needs answer</span>
        ) : null}
        {profile?.role === 'teacher' && !teacherAnswered && question.status === 'answered' ? (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">Answered</span>
        ) : null}
      </div>
      <Link to={`/questions/${question.id}`} className="mt-3 block text-xl font-bold text-elios-navy hover:text-elios-blue">
        {question.title}
      </Link>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{question.description}</p>
      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm text-slate-500">
        <span>{question.profiles?.full_name || 'Student'}</span>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1"><MessageSquare className="h-4 w-4" />{question.answer_count ?? 0}</span>
          <span>{formatDate(question.created_at)}</span>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Link to={teacherCanAnswer && !teacherAnswered ? `/questions/${question.id}#answer` : `/questions/${question.id}`} className="inline-flex items-center gap-2 text-sm font-bold text-elios-blue">
          {teacherCanAnswer && !teacherAnswered ? <MessageSquarePlus className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {profile?.role === 'teacher' && teacherAnswered ? 'View my answer' : teacherCanAnswer ? 'Answer question' : 'View question'}
        </Link>
        <ReportButton targetType="question" targetId={question.id} />
      </div>
      </div>
    </article>
  );
}
