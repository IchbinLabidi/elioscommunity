import { GraduationCap, LogOut, Menu } from 'lucide-react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function Navbar() {
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
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 text-elios-navy">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-elios-navy text-elios-yellow">
            <GraduationCap className="h-6 w-6" />
          </span>
          <span className="text-lg font-bold tracking-normal">Elios Community</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
          {profile ? (
            <NavLink to="/questions" className={({ isActive }) => (isActive ? 'text-elios-blue' : '')}>
              {profile.role === 'teacher' ? 'Browse Questions' : 'Questions'}
            </NavLink>
          ) : null}
          <NavLink to="/teachers" className={({ isActive }) => (isActive ? 'text-elios-blue' : '')}>
            Teachers
          </NavLink>
          <NavLink to="/courses" className={({ isActive }) => (isActive ? 'text-elios-blue' : '')}>
            Courses
          </NavLink>
          {profile ? (
            <NavLink to={`/${profile.role}/dashboard`} className={({ isActive }) => (isActive ? 'text-elios-blue' : '')}>
              Dashboard
            </NavLink>
          ) : null}
        </nav>
        <div className="flex items-center gap-3">
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
          <Menu className="h-6 w-6 text-elios-navy md:hidden" />
        </div>
      </div>
    </header>
  );
}
