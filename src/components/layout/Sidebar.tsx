import { BookOpen, CreditCard, GraduationCap, LayoutDashboard, MessageSquare, Settings, Shield, Star, Users } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { cx } from '../../lib/utils';

export default function Sidebar() {
  const { profile } = useAuth();

  const items =
    profile?.role === 'admin'
      ? [
          { to: '/admin/dashboard', label: 'Admin', icon: Shield },
          { to: '/admin/users', label: 'Users', icon: Users },
          { to: '/admin/reports', label: 'Reports', icon: Shield },
          { to: '/admin/enrollments', label: 'Enrollments', icon: CreditCard },
          { to: '/admin/questions', label: 'Questions', icon: MessageSquare },
          { to: '/admin/answers', label: 'Answers', icon: MessageSquare },
          { to: '/admin/comments', label: 'Comments', icon: MessageSquare },
          { to: '/admin/ratings', label: 'Reviews', icon: Star },
          { to: '/admin/courses', label: 'Courses', icon: BookOpen },
          { to: '/admin/chapters', label: 'Chapters', icon: BookOpen },
          { to: '/admin/videos', label: 'Videos', icon: BookOpen },
          { to: '/admin/attachments', label: 'Files', icon: BookOpen },
          { to: '/admin/audit-logs', label: 'Audit logs', icon: Shield },
        ]
      : profile?.role === 'teacher'
        ? [
            { to: '/teacher/dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { to: '/questions', label: 'Open questions', icon: MessageSquare },
            { to: '/teacher/enrollments', label: 'Enrollments', icon: CreditCard },
            { to: '/teacher/courses', label: 'My courses', icon: BookOpen },
            { to: '/teacher/courses/new', label: 'New course', icon: BookOpen },
            { to: '/teacher/profile/edit', label: 'Profile', icon: Settings },
          ]
        : [
            { to: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { to: '/questions/new', label: 'Ask question', icon: MessageSquare },
            { to: '/student/questions', label: 'My questions', icon: BookOpen },
            { to: '/student/enrollments', label: 'Enrollments', icon: CreditCard },
            { to: '/teachers', label: 'Teachers', icon: GraduationCap },
            { to: '/settings', label: 'Profile', icon: Settings },
          ];

  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-4 lg:block">
      <div className="mb-5 rounded-lg bg-elios-sky p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-elios-blue">{profile?.role}</p>
        <p className="mt-1 truncate font-semibold text-elios-navy">{profile?.full_name || 'Elios member'}</p>
        {profile?.specialty ? <p className="mt-1 text-sm text-slate-600">{profile.specialty}</p> : null}
      </div>
      <nav className="space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cx(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition',
                isActive ? 'bg-elios-navy text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-elios-navy',
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-6 flex items-center gap-2 rounded-lg border border-elios-yellow/60 bg-yellow-50 p-3 text-sm text-elios-navy">
        <Star className="h-4 w-4 fill-elios-yellow text-elios-yellow" />
        Reputation grows through helpful answers.
      </div>
    </aside>
  );
}
