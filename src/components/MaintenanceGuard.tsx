import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getPublicPlatformSettings } from '../services/platformSettingsService';
import { DEFAULT_PLATFORM_SETTINGS, PlatformMaintenanceSettings } from '../types/platformSettings';
import BrandWordmark from './brand/BrandWordmark';
import LoadingSpinner from './ui/LoadingSpinner';

export default function MaintenanceGuard({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { profile, loading: authLoading } = useAuth();
  const [maintenance, setMaintenance] = useState<PlatformMaintenanceSettings>(DEFAULT_PLATFORM_SETTINGS.maintenance);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => {
      getPublicPlatformSettings()
        .then((settings) => setMaintenance(settings.maintenance ?? DEFAULT_PLATFORM_SETTINGS.maintenance))
        .catch(() => setMaintenance(DEFAULT_PLATFORM_SETTINGS.maintenance))
        .finally(() => setLoading(false));
    };
    load();
    window.addEventListener('platform-settings-updated', load);
    return () => window.removeEventListener('platform-settings-updated', load);
  }, []);

  if (loading || authLoading) return <LoadingSpinner fullPage label="Chargement de sosprof.tn" />;

  const adminPath = pathname.startsWith('/admin');
  const loginPath = pathname === '/login';
  const allowedRole = profile && maintenance.allowedRoles.includes(profile.role);
  if (!maintenance.enabled || adminPath || loginPath || allowedRole) return children;

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <section className="w-full max-w-xl rounded-3xl border border-brand-border bg-white p-8 text-center shadow-sm md:p-12">
        <BrandWordmark size="md" className="justify-center" />
        <p className="mt-8 text-xs font-black uppercase tracking-[0.2em] text-brand-orange">Maintenance</p>
        <h1 className="mt-3 text-3xl font-black text-brand-navy">Nous revenons bientôt.</h1>
        <p className="mx-auto mt-4 max-w-md leading-7 text-slate-600">{maintenance.message}</p>
        <Link to="/login" className="mt-8 inline-flex rounded-xl bg-brand-navy px-5 py-3 text-sm font-bold text-white">Connexion admin</Link>
      </section>
    </main>
  );
}
