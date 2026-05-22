import { BookOpen, MessageSquare, Star, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardStats from '../components/DashboardStats';
import QuestionCard from '../components/QuestionCard';
import { useAuth } from '../contexts/AuthContext';
import { getMyQuestions } from '../lib/questionsService';
import { supabase } from '../lib/supabase';
import { QuestionWithStudent } from '../types/database';

export default function StudentDashboardPage() {
  const { profile } = useAuth();
  const [questions, setQuestions] = useState<QuestionWithStudent[]>([]);
  const [followCount, setFollowCount] = useState(0);

  useEffect(() => {
    if (!profile) return;
    Promise.all([
      getMyQuestions(profile.id),
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('student_id', profile.id),
    ]).then(([questionResult, followResult]) => {
      setQuestions(questionResult as QuestionWithStudent[]);
      setFollowCount(followResult.count ?? 0);
    });
  }, [profile]);

  const answered = questions.filter((question) => question.status === 'answered').length;

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-bold text-elios-navy">Student dashboard</h1>
          <p className="mt-2 text-slate-600">Track your questions, answers, teachers, and courses.</p>
        </div>
        <Link to="/questions/new" className="inline-flex items-center justify-center gap-2 rounded-lg bg-elios-yellow px-4 py-3 font-bold text-elios-navy">
          <MessageSquare className="h-5 w-5" />
          Ask Question
        </Link>
      </div>
      <DashboardStats stats={[
        { label: 'Questions', value: questions.length, icon: MessageSquare },
        { label: 'Answered', value: answered, icon: Star },
        { label: 'Following', value: followCount, icon: Users },
        { label: 'Courses to explore', value: 'Live', icon: BookOpen },
      ]} />
      <div>
        <h2 className="mb-4 text-xl font-bold text-elios-navy">Your recent questions</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {questions.slice(0, 6).map((question) => <QuestionCard key={question.id} question={question} />)}
        </div>
      </div>
    </section>
  );
}
