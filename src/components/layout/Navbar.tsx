import { useEffect, useState } from 'react';
import { LogOut, Menu, UserPlus, X } from 'lucide-react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import BrandLogo from '../brand/BrandLogo';
import NotificationsBell from '../notifications/NotificationsBell';
import { useAuth } from '../../contexts/AuthContext';
import { ContentContainer } from './PageContainer';
import { cx } from '../../lib/utils';

export default function Navbar({
  onOpenSidebar,
  showSidebarMenu = false,
  showBrand = true,
  showPrivateBrand = false,
  className = '',
}: {
  onOpenSidebar?: () => void;
  showSidebarMenu?: boolean;
  showBrand?: boolean;
  showPrivateBrand?: boolean;
  className?: string;
}) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const isFullyAuthenticated = Boolean(profile);
  const [isPublicMenuOpen, setIsPublicMenuOpen] = useState(false);

  useEffect(() => {
    setIsPublicMenuOpen(false);
  }, [location.pathname, location.search]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className={cx("sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur shrink-0", className)}>
      <ContentContainer className="flex min-h-[72px] items-center justify-between gap-3 py-2 lg:h-24 lg:py-0">
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
            <>
              <BrandLogo
                variant="horizontal"
                className="hidden min-w-[180px] sm:inline-flex"
                imageClassName="h-10 w-auto max-w-[180px] object-contain md:h-14 md:max-w-[220px] lg:h-16"
              />
              <BrandLogo variant="icon" className="sm:hidden" />
            </>
          ) : null}
          {!showBrand && showSidebarMenu ? (
            <>
              <BrandLogo
                to="/home"
                variant="horizontal"
                className={cx(showPrivateBrand ? 'hidden lg:inline-flex' : 'hidden')}
                imageClassName="h-10 w-auto max-w-[190px] object-contain xl:h-11 xl:max-w-[220px]"
              />
              <BrandLogo
                to="/home"
                variant="horizontal"
                className="inline-flex lg:hidden"
                imageClassName="h-9 w-auto max-w-[160px] object-contain"
              />
            </>
          ) : null}
        </div>
        {!profile ? <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 lg:flex">
          <NavLink
            to="/courses"
            className={({ isActive }) => cx(
              'relative py-2 transition hover:text-elios-navy',
              isActive && 'font-semibold text-elios-navy after:absolute after:-bottom-1 after:left-0 after:h-1 after:w-full after:rounded-full after:bg-elios-yellow',
            )}
          >
            Cours
          </NavLink>
          <NavLink
            to="/questions"
            className={({ isActive }) => cx(
              'relative py-2 transition hover:text-elios-navy',
              isActive && 'font-semibold text-elios-navy after:absolute after:-bottom-1 after:left-0 after:h-1 after:w-full after:rounded-full after:bg-elios-yellow',
            )}
          >
            Questions
          </NavLink>
        </nav> : <span className="hidden lg:block" />}
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
            <>
              <div className="hidden items-center gap-2 lg:flex">
                <Link to="/login" className="rounded-full border border-elios-navy px-4 py-2 text-sm font-bold text-elios-navy transition hover:bg-slate-50">
                  Connexion
                </Link>
                <Link
                  to="/register?role=student"
                  aria-label="Creer un compte etudiant"
                  title="Creer un compte etudiant"
                  className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-elios-navy transition hover:bg-elios-navy/5 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]"
                >
                  <UserPlus className="h-4 w-4" />
                </Link>
                <Link to="/teachers" className="rounded-full bg-[#FF8A00] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#F07800]">
                  Trouver un prof
                </Link>
                <Link to="/register?role=teacher" className="rounded-full bg-elios-navy px-4 py-2 text-sm font-bold text-white transition hover:bg-elios-blue">
                  Devenir prof
                </Link>
              </div>
              <div className="flex items-center gap-2 lg:hidden">
                <Link
                  to="/register?role=student"
                  aria-label="Creer un compte etudiant"
                  title="Creer un compte etudiant"
                  className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 text-elios-navy transition hover:bg-slate-50"
                >
                  <UserPlus className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  aria-label={isPublicMenuOpen ? 'Close menu' : 'Open menu'}
                  aria-expanded={isPublicMenuOpen}
                  onClick={() => setIsPublicMenuOpen((current) => !current)}
                  className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 text-elios-navy transition hover:bg-slate-50"
                >
                  {isPublicMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </ContentContainer>
      {!isFullyAuthenticated && isPublicMenuOpen ? (
        <ContentContainer className="border-t border-slate-100 pb-4 pt-3 lg:hidden">
          <nav className="grid gap-2 text-sm font-semibold text-slate-700">
            <Link to="/courses" className="rounded-xl px-3 py-2 hover:bg-slate-50">Cours</Link>
            <Link to="/questions" className="rounded-xl px-3 py-2 hover:bg-slate-50">Questions</Link>
          </nav>
          <div className="mt-3 grid gap-2">
            <Link to="/login" className="rounded-full border border-elios-navy px-4 py-3 text-center text-sm font-bold text-elios-navy transition hover:bg-slate-50">
              Connexion
            </Link>
            <Link to="/register?role=student" className="inline-flex items-center justify-center gap-2 rounded-full border border-elios-navy px-4 py-3 text-center text-sm font-bold text-elios-navy transition hover:bg-elios-navy/5">
              <UserPlus className="h-4 w-4" />
              Creer un compte
            </Link>
            <Link to="/teachers" className="rounded-full bg-[#FF8A00] px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-[#F07800]">
              Trouver un prof
            </Link>
            <Link to="/register?role=teacher" className="rounded-full bg-elios-navy px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-elios-blue">
              Devenir prof
            </Link>
          </div>
        </ContentContainer>
      ) : null}
    </header>
  );
}
