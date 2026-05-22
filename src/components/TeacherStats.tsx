import { Award, BookOpen, MessageSquare, Star, Trophy } from 'lucide-react';
import { TeacherPublicStats } from '../types/database';

export default function TeacherStats({ stats }: { stats: TeacherPublicStats | null }) {
  const items = [
    { label: 'Rating', value: Number(stats?.average_rating ?? 0).toFixed(1), icon: Star },
    { label: 'Reviews', value: stats?.total_reviews ?? 0, icon: Award },
    { label: 'Answers', value: stats?.total_answers ?? 0, icon: MessageSquare },
    { label: 'Best answers', value: stats?.total_best_answers ?? 0, icon: Trophy },
    { label: 'Courses', value: stats?.total_courses ?? 0, icon: BookOpen },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <item.icon className="h-5 w-5 text-elios-blue" />
          <p className="mt-3 text-2xl font-bold text-elios-navy">{item.value}</p>
          <p className="text-sm text-slate-500">{item.label}</p>
        </div>
      ))}
    </div>
  );
}
