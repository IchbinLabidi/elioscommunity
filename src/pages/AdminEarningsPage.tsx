import { Building2, CalendarDays, Download, Receipt, Users, WalletCards } from 'lucide-react';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import AdminStatCard from '../components/admin/AdminStatCard';
import RevenueShareModal from '../components/earnings/RevenueShareModal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { draftKey } from '../hooks/useFormDraft';
import { EarningsFilters, getAdminEarningsByTeacher, getAdminEarningsTransactions, groupEarningsByCourse, groupEarningsByMonth, summarizeEarnings, TeacherRevenueRow, updateTeacherRevenueSharePercent } from '../services/earningsService';
import { Profile, TeacherEarning, TeacherEarningStatus } from '../types/database';

const currentYear = new Date().getFullYear();
const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
type Tab = 'global' | 'teachers' | 'courses' | 'transactions';

function tnd(value: number) {
  return `${value.toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND`;
}
const statuses: Record<TeacherEarningStatus, string> = { earned: 'Acquis', pending: 'En attente', paid_out: 'Payé', refunded: 'Remboursé', cancelled: 'Annulé' };

export default function AdminEarningsPage() {
  const { profile } = useAuth();
  const [filters, setFilters] = useState<EarningsFilters>({ year: currentYear, status: 'all', currency: 'TND' });
  const [transactions, setTransactions] = useState<TeacherEarning[]>([]);
  const [allTransactions, setAllTransactions] = useState<TeacherEarning[]>([]);
  const [teachers, setTeachers] = useState<TeacherRevenueRow[]>([]);
  const [tab, setTab] = useState<Tab>('global');
  const [editing, setEditing] = useState<Pick<Profile, 'id' | 'full_name' | 'teacher_revenue_share_percent'> | null>(null);
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [rows, all, teacherRows] = await Promise.all([
        getAdminEarningsTransactions(filters),
        getAdminEarningsTransactions(),
        getAdminEarningsByTeacher(filters),
      ]);
      setTransactions(rows);
      setAllTransactions(all);
      setTeachers(teacherRows);
    } catch {
      setError('Impossible de charger les revenus.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, [filters]);

  const totals = summarizeEarnings(allTransactions);
  const filteredTotals = summarizeEarnings(transactions);
  const monthly = groupEarningsByMonth(transactions, Number(filters.year || currentYear));
  const maximum = Math.max(...monthly.map((item) => item.gross), 1);
  const courses = useMemo(() => groupEarningsByCourse(transactions), [transactions]);
  const teacherOptions = teachers.map((item) => item.teacher);

  const savePercent = async (percent: number, note?: string) => {
    if (!editing) return false;
    setBusy(true); setModalError('');
    try {
      await updateTeacherRevenueSharePercent(editing.id, percent, note);
      setNotice('Pourcentage mis à jour.');
      setEditing(null);
      await load();
      return true;
    } catch (caught) {
      setModalError(caught instanceof Error ? caught.message : 'Impossible de modifier le pourcentage.');
      return false;
    } finally { setBusy(false); }
  };

  const exportCsv = () => {
    const lines = [['Date', 'Professeur', 'Cours', 'Brut', 'Part professeur', 'Montant professeur', 'Commission plateforme', 'Statut'], ...transactions.map((row) => [
      row.earned_at, row.teacher?.full_name ?? '', row.courses?.title ?? '', String(row.gross_amount), String(row.teacher_share_percent), String(row.teacher_amount), String(row.platform_amount), statuses[row.status],
    ])];
    const blob = new Blob([lines.map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'revenus-sosprof.csv'; link.click(); URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-brand-orange">Administration</p>
          <h1 className="mt-2 text-3xl font-black text-brand-navy">Revenus plateforme</h1>
          <p className="mt-2 text-slate-600">Analysez les revenus, commissions et parts professeurs.</p>
        </div>
        <button type="button" onClick={exportCsv} className="inline-flex items-center gap-2 rounded-xl border border-brand-border bg-white px-4 py-3 text-sm font-bold text-brand-navy"><Download className="h-4 w-4" /> Exporter CSV</button>
      </header>
      {notice ? <p className="rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{notice}</p> : null}
      {error ? <p className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <AdminStatCard label="Revenu brut total" value={tnd(totals.gross)} icon={WalletCards} compactValue />
        <AdminStatCard label="Parts professeurs" value={tnd(totals.teacherAmount)} icon={Users} compactValue />
        <AdminStatCard label="Commission plateforme" value={tnd(totals.platformAmount)} icon={Building2} compactValue />
        <AdminStatCard label="Brut ce mois" value={tnd(totals.monthGross)} icon={CalendarDays} compactValue />
        <AdminStatCard label="Brut cette année" value={tnd(totals.yearGross)} icon={CalendarDays} compactValue />
        <AdminStatCard label="Ventes sélectionnées" value={filteredTotals.sales} icon={Receipt} />
      </div>
      <AdminFilters filters={filters} teachers={teacherOptions} transactions={allTransactions} change={setFilters} />
      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-brand-border bg-white p-2 shadow-sm">
        {([['global', 'Vue globale'], ['teachers', 'Par professeur'], ['courses', 'Par cours'], ['transactions', 'Transactions']] as Array<[Tab, string]>).map(([value, label]) => (
          <button type="button" key={value} onClick={() => setTab(value)} className={`whitespace-nowrap rounded-xl px-4 py-3 text-sm font-bold ${tab === value ? 'bg-brand-navy text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{label}</button>
        ))}
      </div>
      {loading ? <LoadingSpinner label="Chargement des revenus" /> : (
        <>
          {tab === 'global' ? <GlobalView monthly={monthly} maximum={maximum} summary={filteredTotals} year={Number(filters.year || currentYear)} /> : null}
          {tab === 'teachers' ? <TeachersView rows={teachers} onEdit={(teacher) => { setModalError(''); setEditing(teacher); }} /> : null}
          {tab === 'courses' ? <CoursesView rows={courses} /> : null}
          {tab === 'transactions' ? <TransactionsView rows={transactions} /> : null}
        </>
      )}
      <RevenueShareModal key={editing?.id ?? 'closed'} teacher={editing} busy={busy} error={modalError} draftKey={draftKey(profile?.id, 'admin:revenue-share')} onClose={() => setEditing(null)} onSave={savePercent} />
    </section>
  );
}

function AdminFilters({ filters, teachers, transactions, change }: { filters: EarningsFilters; teachers: Array<Pick<Profile, 'id' | 'full_name'>>; transactions: TeacherEarning[]; change: (next: EarningsFilters) => void }) {
  const courses = Array.from(new Map(transactions.map((row) => [row.course_id, row.courses?.title ?? 'Cours'])).entries());
  return <section className="grid gap-3 rounded-2xl border border-brand-border bg-white p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-6">
    <select value={filters.year ?? ''} onChange={(event) => change({ ...filters, year: event.target.value ? Number(event.target.value) : '' })} className="h-12 rounded-xl border border-brand-border px-3 text-sm"><option value="">Toutes années</option>{Array.from({ length: 5 }, (_, index) => currentYear - index).map((year) => <option key={year}>{year}</option>)}</select>
    <select value={filters.month ?? ''} onChange={(event) => change({ ...filters, month: event.target.value ? Number(event.target.value) : '' })} className="h-12 rounded-xl border border-brand-border px-3 text-sm"><option value="">Tous mois</option>{months.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}</select>
    <select value={filters.teacherId ?? ''} onChange={(event) => change({ ...filters, teacherId: event.target.value })} className="h-12 rounded-xl border border-brand-border px-3 text-sm"><option value="">Tous profs</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.full_name}</option>)}</select>
    <select value={filters.courseId ?? ''} onChange={(event) => change({ ...filters, courseId: event.target.value })} className="h-12 rounded-xl border border-brand-border px-3 text-sm"><option value="">Tous cours</option>{courses.map(([id, title]) => <option key={id} value={id}>{title}</option>)}</select>
    <select value={filters.status ?? 'all'} onChange={(event) => change({ ...filters, status: event.target.value as TeacherEarningStatus | 'all' })} className="h-12 rounded-xl border border-brand-border px-3 text-sm"><option value="all">Tous statuts</option>{Object.entries(statuses).map(([status, label]) => <option key={status} value={status}>{label}</option>)}</select>
    <select value={filters.currency ?? 'TND'} onChange={(event) => change({ ...filters, currency: event.target.value })} className="h-12 rounded-xl border border-brand-border px-3 text-sm"><option value="">Toutes devises</option><option value="TND">TND</option></select>
  </section>;
}

function GlobalView({ monthly, maximum, summary, year }: { monthly: ReturnType<typeof groupEarningsByMonth>; maximum: number; summary: ReturnType<typeof summarizeEarnings>; year: number }) {
  return <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
    <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm"><h2 className="text-lg font-black text-brand-navy">Chiffre d’affaires mensuel {year}</h2><div className="mt-6 grid grid-cols-6 gap-3 sm:grid-cols-12">{monthly.map((item, index) => <div key={item.month} className="flex flex-col items-center gap-2"><div className="flex h-40 w-full items-end rounded-lg bg-slate-50 p-1"><span title={tnd(item.gross)} className="w-full rounded-md bg-brand-navy" style={{ height: `${Math.max(item.gross / maximum * 100, item.gross ? 6 : 0)}%` }} /></div><span className="text-xs font-semibold text-slate-500">{months[index]}</span></div>)}</div></div>
    <div className="space-y-3 rounded-2xl border border-brand-border bg-white p-5 shadow-sm"><h2 className="text-lg font-black text-brand-navy">Sélection</h2><Line label="Revenu brut" value={tnd(summary.gross)} /><Line label="Parts professeurs" value={tnd(summary.teacherAmount)} /><Line label="Commission plateforme" value={tnd(summary.platformAmount)} /><Line label="Ventes" value={String(summary.sales)} /></div>
  </section>;
}

function TeachersView({ rows, onEdit }: { rows: TeacherRevenueRow[]; onEdit: (teacher: TeacherRevenueRow['teacher']) => void }) {
  return <Table headers={['Professeur', 'Part', 'Revenu brut', 'Revenus prof', 'Commission', 'Ventes / cours', '']}>
    {rows.map((row) => <tr key={row.teacher.id} className="border-t border-slate-100"><td className="px-5 py-4"><p className="font-bold text-brand-navy">{row.teacher.full_name}</p><p className="text-xs text-slate-500">{row.teacher.email}</p></td><td className="px-4 py-4 font-bold">{row.teacher.teacher_revenue_share_percent ?? 50}%</td><td className="px-4 py-4">{tnd(row.gross)}</td><td className="px-4 py-4 font-bold text-brand-orange">{tnd(row.teacherAmount)}</td><td className="px-4 py-4">{tnd(row.platformAmount)}</td><td className="px-4 py-4">{row.sales} / {row.coursesCount}</td><td className="px-5 py-4 text-right"><button onClick={() => onEdit(row.teacher)} className="rounded-xl bg-brand-navy px-3 py-2 text-sm font-bold text-white">Modifier %</button></td></tr>)}
    {!rows.length ? <tr><td colSpan={7} className="p-10 text-center text-slate-500">Aucune transaction trouvée.</td></tr> : null}
  </Table>;
}

function CoursesView({ rows }: { rows: ReturnType<typeof groupEarningsByCourse> }) {
  return <Table headers={['Cours', 'Professeur', 'Revenu brut', 'Part prof', 'Commission plateforme', 'Ventes']}>{rows.map((row) => <tr key={row.courseId} className="border-t border-slate-100"><td className="px-5 py-4 font-bold text-brand-navy">{row.courseTitle}</td><td className="px-4 py-4">{row.teacherName}</td><td className="px-4 py-4">{tnd(row.gross)}</td><td className="px-4 py-4 font-bold text-brand-orange">{tnd(row.teacherAmount)}</td><td className="px-4 py-4">{tnd(row.platformAmount)}</td><td className="px-5 py-4">{row.sales}</td></tr>)}{!rows.length ? <tr><td colSpan={6} className="p-10 text-center text-slate-500">Aucune transaction trouvée.</td></tr> : null}</Table>;
}

function TransactionsView({ rows }: { rows: TeacherEarning[] }) {
  return <Table headers={['Date', 'Étudiant', 'Professeur', 'Cours', 'Brut', 'Part', 'Professeur', 'Plateforme', 'Statut']}>{rows.map((row) => <tr key={row.id} className="border-t border-slate-100"><td className="px-5 py-4">{new Intl.DateTimeFormat('fr-TN').format(new Date(row.earned_at))}</td><td className="px-4 py-4">{row.enrollment?.student?.full_name ?? '-'}</td><td className="px-4 py-4">{row.teacher?.full_name ?? '-'}</td><td className="px-4 py-4 font-bold text-brand-navy">{row.courses?.title ?? '-'}</td><td className="px-4 py-4">{tnd(Number(row.gross_amount))}</td><td className="px-4 py-4">{row.teacher_share_percent}%</td><td className="px-4 py-4 text-brand-orange">{tnd(Number(row.teacher_amount))}</td><td className="px-4 py-4">{tnd(Number(row.platform_amount))}</td><td className="px-5 py-4">{statuses[row.status]}</td></tr>)}{!rows.length ? <tr><td colSpan={9} className="p-10 text-center text-slate-500">Aucune transaction trouvée.</td></tr> : null}</Table>;
}

function Table({ headers, children }: { headers: string[]; children: ReactNode }) {
  return <div className="overflow-x-auto rounded-2xl border border-brand-border bg-white shadow-sm"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500"><tr>{headers.map((header) => <th key={header} className="px-4 py-4 first:pl-5 last:pr-5">{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}
function Line({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm"><span className="text-slate-500">{label}</span><span className="font-bold text-brand-navy">{value}</span></div>;
}
