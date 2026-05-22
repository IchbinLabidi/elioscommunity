import {
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  Bell,
  Settings,
  Shield,
  Star,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { cx } from '../../lib/utils';
import { UserRole } from '../../types/database';

type SidebarProps = {
  role?: UserRole;
  isOpen: boolean;
  isCollapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
  mode: 'desktop' | 'mobile';
  className?: string;
};

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

function getNavSections(role: UserRole | undefined, profileId?: string): NavSection[] {
  if (role === 'admin') {
    return [
      {
        title: 'Main',
        items: [
          { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { to: '/notifications', label: 'Notifications', icon: Bell },
        ],
      },
      {
        title: 'Management',
        items: [
          { to: '/admin/users', label: 'Users', icon: Users },
          { to: '/admin/enrollments', label: 'Enrollments', icon: CreditCard },
          { to: '/admin/courses', label: 'Courses', icon: BookOpen },
        ],
      },
      {
        title: 'Moderation',
        items: [
          { to: '/admin/reports', label: 'Reports', icon: Shield },
          { to: '/admin/questions', label: 'Questions', icon: MessageSquare },
          { to: '/admin/answers', label: 'Answers', icon: MessageSquare },
          { to: '/admin/audit-logs', label: 'Audit logs', icon: Shield },
        ],
      },
    ];
  }

  if (role === 'teacher') {
    return [
      {
        title: 'Main',
        items: [
          { to: '/teacher/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { to: '/notifications', label: 'Notifications', icon: Bell },
        ],
      },
      {
        title: 'Teaching',
        items: [
          { to: '/teacher/courses', label: 'My courses', icon: BookOpen },
          { to: '/teacher/enrollments', label: 'Enrollment requests', icon: CreditCard },
        ],
      },
      {
        title: 'Community',
        items: [
          { to: '/questions', label: 'Questions', icon: MessageSquare },
        ],
      },
      {
        title: 'Account',
        items: [
          { to: '/teacher/profile/edit', label: 'Profile', icon: Settings },
          ...(profileId ? [{ to: `/teachers/${profileId}`, label: 'Public profile', icon: UserRound }] : []),
        ],
      },
    ];
  }

  return [
    {
      title: 'Main',
      items: [
        { to: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/notifications', label: 'Notifications', icon: Bell },
      ],
    },
    {
      title: 'Learning',
      items: [
        { to: '/courses', label: 'Browse courses', icon: BookOpen },
        { to: '/student/courses', label: 'My courses', icon: BookOpen },
        { to: '/student/enrollments', label: 'Enrollments', icon: CreditCard },
      ],
    },
    {
      title: 'Community',
      items: [
        { to: '/questions/new', label: 'Ask question', icon: MessageSquare },
        { to: '/student/questions', label: 'My questions', icon: BookOpen },
        { to: '/teachers', label: 'Teachers', icon: GraduationCap },
      ],
    },
    {
      title: 'Account',
      items: [
        { to: '/settings', label: 'Profile', icon: Settings },
      ],
    },
  ];
}

function SidebarPanel({
  role,
  isCollapsed,
  onClose,
  onToggleCollapse,
  mode,
  className = '',
}: Omit<SidebarProps, 'isOpen'>) {
  const { profile } = useAuth();
  const collapsed = mode === 'desktop' && isCollapsed;
  const sections = getNavSections(role, profile?.id);

  return (
    <aside
      aria-label="Private navigation"
      className={cx(
        'flex flex-col border-r border-slate-200 bg-white transition-[width] duration-200',
        mode === 'desktop' ? 'hidden h-screen shrink-0 lg:flex' : 'h-full w-[min(320px,calc(100vw-32px))] shadow-2xl',
        mode === 'desktop' && (collapsed ? 'w-20' : 'w-72'),
        className,
      )}
    >
      <div className={cx('flex h-16 items-center border-b border-slate-100 shrink-0', collapsed ? 'justify-center px-2' : 'justify-between gap-3 px-4')}>
        <Link to={role ? `/${role}/dashboard` : '/home'} onClick={mode === 'mobile' ? onClose : undefined} className={cx('flex min-w-0 items-center text-elios-navy', collapsed ? 'justify-center' : 'gap-3')}>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-elios-navy text-elios-yellow">
            <GraduationCap className="h-6 w-6" />
          </span>
          {!collapsed ? <span className="truncate text-lg font-bold">Elios Community</span> : null}
        </Link>
        {mode === 'mobile' ? (
          <button type="button" aria-label="Close sidebar" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 text-elios-navy hover:bg-slate-50">
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>
      <div className={cx('border-b border-slate-100 shrink-0', collapsed ? 'p-3' : 'p-4')}>
        <div className={cx('flex items-start', collapsed ? 'justify-center' : 'justify-between gap-3')}>
          {!collapsed ? (
            <div className="min-w-0 w-full rounded-xl bg-elios-sky p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-elios-blue">{role ?? 'member'}</p>
              <p className="mt-1 truncate font-semibold text-elios-navy">{profile?.full_name || 'Elios member'}</p>
              {profile?.specialty ? <p className="mt-1 truncate text-sm text-slate-600">{profile.specialty}</p> : null}
            </div>
          ) : (
            <span title={profile?.full_name || 'Elios member'} className="grid h-11 w-11 place-items-center rounded-xl bg-elios-sky font-bold text-elios-blue">
              {(profile?.full_name || 'E').charAt(0)}
            </span>
          )}
        </div>
      </div>
      <nav className={cx('flex-1 space-y-4 overflow-y-auto scrollbar-hide py-4', collapsed ? 'px-3' : 'px-4')}>
        {sections.map((section, sectionIdx) => (
          <div key={section.title} className={cx('space-y-1', !collapsed && sectionIdx > 0 && 'pt-3 border-t border-slate-50')}>
            {!collapsed ? (
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                {section.title}
              </p>
            ) : null}
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={collapsed ? item.label : undefined}
                  onClick={mode === 'mobile' ? onClose : undefined}
                  className={({ isActive }) =>
                    cx(
                      'relative flex min-h-11 items-center rounded-xl text-sm font-semibold transition',
                      collapsed ? 'justify-center px-2' : 'gap-3 px-3',
                      isActive
                        ? "bg-elios-navy text-white before:absolute before:left-0 before:h-6 before:w-1 before:rounded-r before:bg-elios-yellow before:content-['']"
                        : 'text-slate-600 hover:bg-slate-50 hover:text-elios-navy',
                    )
                  }
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed ? <span>{item.label}</span> : null}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className={cx('border-t border-slate-100 p-4 shrink-0', collapsed ? 'px-3' : '')}>
        {mode === 'desktop' ? (
          <button
            type="button"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={onToggleCollapse}
            className={cx('mb-3 flex w-full items-center rounded-xl border border-slate-200 py-2 text-sm font-bold text-elios-blue hover:bg-slate-50', collapsed ? 'justify-center px-2' : 'justify-between px-3')}
          >
            {!collapsed ? <span>Collapse</span> : null}
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </button>
        ) : null}
        {!collapsed ? (
          <div className="flex items-center gap-2 rounded-xl border border-elios-yellow/60 bg-yellow-50 p-3 text-sm text-elios-navy">
            <Star className="h-4 w-4 shrink-0 fill-elios-yellow text-elios-yellow" />
            Reputation grows through helpful answers.
          </div>
        ) : null}
      </div>
    </aside>
  );
}

export default function Sidebar({ isOpen, className, ...props }: SidebarProps) {
  if (props.mode === 'desktop') return <SidebarPanel className={className} {...props} />;

  return (
    <div className={cx('fixed inset-0 z-50 lg:hidden', isOpen ? 'pointer-events-auto' : 'pointer-events-none')}>
      <button
        type="button"
        aria-label="Close sidebar overlay"
        onClick={props.onClose}
        className={cx('absolute inset-0 bg-slate-950/40 transition-opacity', isOpen ? 'opacity-100' : 'opacity-0')}
      />
      <div className={cx('absolute inset-y-0 left-0 transition-transform duration-200', isOpen ? 'translate-x-0' : '-translate-x-full')}>
        <SidebarPanel {...props} />
      </div>
    </div>
  );
}
