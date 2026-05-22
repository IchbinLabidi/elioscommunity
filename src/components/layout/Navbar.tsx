import { GraduationCap, LogOut, Menu } from 'lucide-react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import NotificationsBell from '../notifications/NotificationsBell';
import { useAuth } from '../../contexts/AuthContext';
import { ContentContainer } from './PageContainer';
import { cx } from '../../lib/utils';

export default function Navbar({
  onOpenSidebar,
  showSidebarMenu = false,
  showBrand = true,
  className = '',
}: {
  onOpenSidebar?: () => void;
  showSidebarMenu?: boolean;
  showBrand?: boolean;
  className?: string;
}) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const isFullyAuthenticated = Boolean(profile);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className={cx("sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur shrink-0", className)}>
      <ContentContainer className="flex h-16 items-center justify-between">
        <div className="flex min-w-0 items-center gap-2">
          {showSidebarMenu ? (
            <button
              type="button"
              aria-label="Open sidebar"
              onClick={onOpenSidebar}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 text-elios-navy hover:bg-slate-50 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          ) : null}
          {showBrand ? (
            <Link to="/" className="flex min-w-0 items-center gap-2 text-elios-navy">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-elios-navy text-elios-yellow">
                <GraduationCap className="h-6 w-6" />
              </span>
              <span className="truncate text-lg font-bold tracking-normal">Elios Community</span>
            </Link>
          ) : null}
        </div>
        {!profile ? <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
          <NavLink to="/teachers" className={({ isActive }) => (isActive ? 'text-elios-blue' : '')}>
            Teachers
          </NavLink>
          <NavLink to="/courses" className={({ isActive }) => (isActive ? 'text-elios-blue' : '')}>
            Courses
          </NavLink>
        </nav> : <span className="hidden md:block" />}
        <div className="flex items-center gap-3">
          {isFullyAuthenticated && !isAuthPage ? <NotificationsBell /> : null}
          {isFullyAuthenticated && !isAuthPage ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-elios-navy transition hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          ) : !isFullyAuthenticated ? (
            <div className="hidden items-center gap-2 sm:flex">
              <Link to="/login" className="rounded-lg px-4 py-2 text-sm font-semibold text-elios-navy hover:bg-slate-50">
                Login
              </Link>
              <Link to="/register" className="rounded-lg bg-elios-yellow px-4 py-2 text-sm font-bold text-elios-navy hover:bg-yellow-300">
                Register
              </Link>
            </div>
          ) : null}
        </div>
      </ContentContainer>
    </header>
  );
}
