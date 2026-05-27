import { CalendarDays, Coins, CreditCard, WalletCards } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import AdminStatCard from '../components/admin/AdminStatCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { getTeacherEarningCourses, getTeacherEarningsTransactions, groupEarningsByCourse, groupEarningsByMonth, summarizeEarnings, EarningsFilters } from '../services/earningsService';
import { TeacherEarning, TeacherEarningStatus } from '../types/database';

const currentYear = new Date().getFullYear();
const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

function tnd(value: number) {
  return `${value.toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND`;
}

const labels: Record<TeacherEarningStatus, string> = {
  earned: 'Acquis',
  pending: 'En attente',
  paid_out: 'Payé',
  refunded: 'Remboursé',
  cancelled: 'Annulé',
};

export default function TeacherEarningsPage() {
  const [filters, setFilters] = useState<EarningsFilters>({ year: currentYear, status: 'all' });
  const [rows, setRows] = useState<TeacherEarning[]>([]);
  const [courses, setCourses] = useState<Array<{ id: string; title: string }>>([]);
  const [allRows, setAllRows] = useState<TeacherEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [filtered, all, availableCourses] = await Promise.all([
        getTeacherEarningsTransactions(filters),
        getTeacherEarningsTransactions(),
        getTeacherEarningCourses(),
      ]);
      setRows(filtered);
      setAllRows(all);
      setCourses(availableCourses);
    } catch {
      setError('Impossible de charger les revenus.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, [filters]);

  const totals = summarizeEarnings(allRows);
  const monthly = groupEarningsByMonth(allRows, Number(filters.year || currentYear));
  const maximum = Math.max(...monthly.map((item) => item.teacherAmount), 1);
  const byCourse = useMemo(() => groupEarningsByCourse(rows), [rows]);

  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs font-black uppercase tracking-wide text-brand-orange">Professeur</p>
        <h1 className="mt-2 text-3xl font-black text-brand-navy">Mes revenus</h1>
        <p className="mt-2 text-slate-600">Suivez vos revenus générés par vos cours.</p>
      </header>
      {error ? <p className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <AdminStatCard label="Revenus ce mois" value={tnd(totals.monthTeacherAmount)} icon={CalendarDays} compactValue />
        <AdminStatCard label="Revenus cette année" value={tnd(totals.yearTeacherAmount)} icon={CalendarDays} compactValue />
        <AdminStatCard label="Revenus totaux" value={tnd(totals.teacherAmount)} icon={WalletCards} compactValue />
        <AdminStatCard label="En attente de paiement" value={tnd(totals.pending)} icon={Coins} compactValue />
        <AdminStatCard label="Nombre de ventes" value={totals.sales} icon={CreditCard} />
      </div>
      <Filters filters={filters} courses={courses} onChange={setFilters} />
      {loading ? <LoadingSpinner label="Chargement des revenus" /> : (
        <>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-brand-navy">Revenus mensuels {filters.year || currentYear}</h2>
              <div className="mt-6 grid grid-cols-6 gap-3 sm:grid-cols-12">
                {monthly.map((item, index) => (
                  <div key={item.month} className="flex flex-col items-center gap-2">
                    <div className="flex h-36 w-full items-end justify-center rounded-lg bg-slate-50 p-1">
                      <span title={tnd(item.teacherAmount)} style={{ height: `${Math.max((item.teacherAmount / maximum) * 100, item.teacherAmount ? 6 : 0)}%` }} className="block w-full rounded-md bg-brand-orange" />
                    </div>
                    <span className="text-xs font-semibold text-slate-500">{months[index]}</span>
                  </div>
                ))}
              </div>
            </section>
            <section className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-brand-navy">Par cours</h2>
              <div className="mt-4 space-y-3">
                {byCourse.slice(0, 6).map((course) => (
                  <div key={course.courseId} className="rounded-xl bg-slate-50 p-3">
                    <p className="truncate font-bold text-brand-navy">{course.courseTitle}</p>
                    <p className="mt-1 text-sm text-slate-500">{course.sales} vente(s)</p>
                    <p className="mt-2 font-black text-brand-orange">{tnd(course.teacherAmount)}</p>
                  </div>
                ))}
                {!byCourse.length ? <p className="text-sm text-slate-500">Aucun revenu pour le moment.</p> : null}
              </div>
            </section>
          </div>
          <Transactions rows={rows} />
        </>
      )}
    </section>
  );
}

function Filters({ filters, courses, onChange }: { filters: EarningsFilters; courses: Array<{ id: string; title: string }>; onChange: (next: EarningsFilters) => void }) {
  return (
    <section className="grid gap-3 rounded-2xl border border-brand-border bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
      <select value={filters.year ?? ''} onChange={(event) => onChange({ ...filters, year: event.target.value ? Number(event.target.value) : '' })} className="h-12 rounded-xl border border-brand-border px-3 text-sm">
        <option value="">Toutes les années</option>{Array.from({ length: 5 }, (_, index) => currentYear - index).map((year) => <option key={year} value={year}>{year}</option>)}
      </select>
      <select value={filters.month ?? ''} onChange={(event) => onChange({ ...filters, month: event.target.value ? Number(event.target.value) : '' })} className="h-12 rounded-xl border border-brand-border px-3 text-sm">
        <option value="">Tous les mois</option>{months.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
      </select>
      <select value={filters.courseId ?? ''} onChange={(event) => onChange({ ...filters, courseId: event.target.value })} className="h-12 rounded-xl border border-brand-border px-3 text-sm">
        <option value="">Tous les cours</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
      </select>
      <select value={filters.status ?? 'all'} onChange={(event) => onChange({ ...filters, status: event.target.value as TeacherEarningStatus | 'all' })} className="h-12 rounded-xl border border-brand-border px-3 text-sm">
        <option value="all">Tous les statuts</option>{Object.entries(labels).map(([status, label]) => <option key={status} value={status}>{label}</option>)}
      </select>
    </section>
  );
}

function Transactions({ rows }: { rows: TeacherEarning[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm">
      <div className="p-5"><h2 className="text-lg font-black text-brand-navy">Transactions</h2></div>
      {rows.length ? <div className="overflow-x-auto"><table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500"><tr><th className="px-5 py-4">Date</th><th className="px-4 py-4">Cours</th><th className="px-4 py-4">Montant brut</th><th className="px-4 py-4">Part</th><th className="px-4 py-4">Mes revenus</th><th className="px-5 py-4">Statut</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.id}><td className="px-5 py-4">{new Intl.DateTimeFormat('fr-TN').format(new Date(row.earned_at))}</td><td className="px-4 py-4 font-bold text-brand-navy">{row.courses?.title ?? 'Cours'}</td><td className="px-4 py-4">{tnd(Number(row.gross_amount))}</td><td className="px-4 py-4">{row.teacher_share_percent}%</td><td className="px-4 py-4 font-bold text-brand-orange">{tnd(Number(row.teacher_amount))}</td><td className="px-5 py-4">{labels[row.status]}</td></tr>)}</tbody>
      </table></div> : <p className="p-10 text-center text-slate-500">Aucun revenu pour le moment.</p>}
    </section>
  );
}
