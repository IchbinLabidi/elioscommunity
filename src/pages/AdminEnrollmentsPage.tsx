import { CreditCard, FileCheck2, Search, WalletCards } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AdminEnrollmentActionModal from '../components/admin/AdminEnrollmentActionModal';
import AdminStatCard from '../components/admin/AdminStatCard';
import EnrollmentStatusBadge from '../components/EnrollmentStatusBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { formatDate, money } from '../lib/utils';
import {
  AdminEnrollmentAction,
  AdminEnrollmentFilters,
  AdminEnrollmentStats,
  getAdminEnrollments,
  getEnrollmentStats,
  manageEnrollment,
} from '../services/adminEnrollmentsService';
import { CourseEnrollmentWithCourse, EnrollmentStatus } from '../types/database';
import { useAuth } from '../contexts/AuthContext';
import { draftKey } from '../hooks/useFormDraft';

const blankStats: AdminEnrollmentStats = { total: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0, estimatedRevenue: 0 };

function formatTnd(value: number) {
  return `${value.toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).replace(',', '.')} TND`;
}

export default function AdminEnrollmentsPage() {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<AdminEnrollmentFilters>({
    status: (searchParams.get('status') as EnrollmentStatus | null) ?? 'all',
    sort: 'newest',
  });
  const [enrollments, setEnrollments] = useState<CourseEnrollmentWithCourse[]>([]);
  const [stats, setStats] = useState(blankStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [chosen, setChosen] = useState<CourseEnrollmentWithCourse | null>(null);
  const [action, setAction] = useState<AdminEnrollmentAction | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [items, totals] = await Promise.all([getAdminEnrollments(filters), getEnrollmentStats()]);
      setEnrollments(items);
      setStats(totals);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les inscriptions.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, [filters]);
  useEffect(() => {
    const status = searchParams.get('status') as EnrollmentStatus | null;
    setFilters((current) => ({ ...current, status: status ?? 'all' }));
  }, [searchParams]);

  const hasFilters = Boolean(filters.query || filters.subject || filters.teacherId || filters.proof || (filters.status && filters.status !== 'all'));
  const setFilter = <K extends keyof AdminEnrollmentFilters>(key: K, value: AdminEnrollmentFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
    if (key === 'status') setSearchParams(value && value !== 'all' ? { status: String(value) } : {});
  };
  const startAction = (item: CourseEnrollmentWithCourse, nextAction: AdminEnrollmentAction) => {
    setChosen(item);
    setAction(nextAction);
  };
  const perform = async (reason: string, note: string) => {
    if (!chosen || !action) return false;
    setBusy(true);
    try {
      const result = await manageEnrollment(chosen.id, action, reason, note);
      setAction(null);
      setNotice(result.message);
      await load();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "L'action n'a pas pu etre effectuee.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.24em] text-brand-orange">Administration</p>
        <h1 className="mt-2 text-3xl font-black text-brand-navy">Gestion des inscriptions</h1>
        <p className="mt-2 max-w-3xl text-slate-600">Vérifiez les preuves de paiement, approuvez les accès et suivez les inscriptions aux cours.</p>
      </header>
      {notice ? <p className="rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{notice}</p> : null}
      {error ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700"><span>{error}</span><button type="button" onClick={() => void load()} className="font-bold underline">Réessayer</button></div> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Total inscriptions" value={stats.total} icon={CreditCard} />
        <AdminStatCard label="En attente" value={stats.pending} icon={FileCheck2} />
        <AdminStatCard label="Approuvées" value={stats.approved} icon={FileCheck2} />
        <AdminStatCard label="Refusées" value={stats.rejected} icon={FileCheck2} />
        <AdminStatCard label="Annulées" value={stats.cancelled} icon={CreditCard} />
        <AdminStatCard label="Revenus estimés" value={formatTnd(stats.estimatedRevenue)} icon={WalletCards} compactValue />
      </div>

      <section className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="relative xl:col-span-2">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <input value={filters.query ?? ''} onChange={(event) => setFilter('query', event.target.value)} placeholder="Etudiant, email ou cours" className="w-full rounded-xl border border-brand-border py-3 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-brand-orange" />
          </label>
          <select value={filters.status ?? 'all'} onChange={(event) => setFilter('status', event.target.value as EnrollmentStatus | 'all')} className="rounded-xl border border-brand-border px-3 py-3 text-sm">
            <option value="all">Tous les statuts</option><option value="pending">En attente</option><option value="approved">Approuvées</option><option value="rejected">Refusées</option><option value="cancelled">Annulées</option>
          </select>
          <input value={filters.subject ?? ''} onChange={(event) => setFilter('subject', event.target.value)} placeholder="Matiere" className="rounded-xl border border-brand-border px-3 py-3 text-sm" />
          <select value={filters.proof ?? ''} onChange={(event) => setFilter('proof', event.target.value as AdminEnrollmentFilters['proof'])} className="rounded-xl border border-brand-border px-3 py-3 text-sm">
            <option value="">Toutes les preuves</option><option value="with-proof">Avec preuve</option><option value="without-proof">Sans preuve</option>
          </select>
          <select value={filters.sort ?? 'newest'} onChange={(event) => setFilter('sort', event.target.value as AdminEnrollmentFilters['sort'])} className="rounded-xl border border-brand-border px-3 py-3 text-sm">
            <option value="newest">Plus recentes</option><option value="oldest">Plus anciennes</option><option value="pending-first">En attente d'abord</option><option value="highest-price">Prix le plus eleve</option>
          </select>
        </div>
        {hasFilters ? <button type="button" onClick={() => { setFilters({ status: 'all', sort: 'newest' }); setSearchParams({}); }} className="mt-4 text-sm font-bold text-brand-navy">Reinitialiser les filtres</button> : null}
      </section>

      {loading ? <LoadingSpinner label="Chargement des inscriptions" /> : enrollments.length ? (
        <div className="space-y-3">
          {enrollments.map((enrollment) => (
            <EnrollmentRow key={enrollment.id} enrollment={enrollment} onAction={startAction} />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-brand-border bg-white p-10 text-center text-slate-500">
          {hasFilters ? 'Aucune inscription ne correspond a vos filtres.' : 'Aucune inscription trouvee.'}
        </p>
      )}
      <AdminEnrollmentActionModal open={Boolean(action && chosen)} action={action} studentName={chosen?.student?.full_name ?? 'Etudiant'} busy={busy} draftKey={draftKey(profile?.id, `admin:enrollment:${chosen?.id ?? 'none'}`)} onClose={() => setAction(null)} onConfirm={perform} />
    </section>
  );
}

function EnrollmentRow({ enrollment, onAction }: { enrollment: CourseEnrollmentWithCourse; onAction: (item: CourseEnrollmentWithCourse, action: AdminEnrollmentAction) => void }) {
  const submitted = enrollment.submitted_at ?? enrollment.created_at;
  return (
    <article className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm">
      <div className="grid gap-5 xl:grid-cols-[1.1fr_1.25fr_0.9fr_auto] xl:items-center">
        <div>
          <p className="font-black text-brand-navy">{enrollment.student?.full_name ?? 'Etudiant'}</p>
          <p className="text-sm text-slate-500">{enrollment.student?.email}</p>
          <p className="mt-2 text-xs text-slate-400">Soumis le {formatDate(submitted)}</p>
        </div>
        <div>
          <p className="font-bold text-brand-navy">{enrollment.courses?.title ?? 'Cours'}</p>
          <p className="mt-1 text-sm text-slate-500">{enrollment.teacher?.full_name ?? 'Prof'} · {enrollment.courses?.subject}</p>
          <p className="mt-2 text-sm font-bold text-brand-orange">{money(Number(enrollment.courses?.price ?? 0), enrollment.courses?.currency ?? 'TND')}</p>
        </div>
        <div className="space-y-2">
          <EnrollmentStatusBadge status={enrollment.status} />
          <p className="text-xs text-slate-500">{enrollment.payment_proof_url ? 'Preuve reçue' : enrollment.payment_proof_error || 'Aucune preuve'}</p>
          {enrollment.reviewer ? <p className="text-xs text-slate-500">Par {enrollment.reviewer.full_name}</p> : null}
        </div>
        <div className="flex flex-wrap justify-start gap-2 xl:max-w-[310px] xl:justify-end">
          <Link to={`/admin/enrollments/${enrollment.id}`} className="rounded-xl bg-brand-navy px-3 py-2 text-sm font-bold text-white">Voir</Link>
          {enrollment.payment_proof_url ? <a href={enrollment.payment_proof_url} target="_blank" rel="noreferrer" className="rounded-xl border border-brand-border px-3 py-2 text-sm font-bold text-brand-navy">Preuve</a> : null}
          {enrollment.status === 'pending' ? <>
            <button onClick={() => onAction(enrollment, 'approve')} className="rounded-xl border border-emerald-100 px-3 py-2 text-sm font-bold text-emerald-700">Approuver</button>
            <button onClick={() => onAction(enrollment, 'reject')} className="rounded-xl border border-red-100 px-3 py-2 text-sm font-bold text-red-700">Refuser</button>
          </> : null}
        </div>
      </div>
    </article>
  );
}
