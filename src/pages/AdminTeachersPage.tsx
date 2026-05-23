import { Eye, GraduationCap, Search, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import TeacherStatusModal, { TeacherStatusModalAction } from '../components/admin/TeacherStatusModal';
import TeacherVerificationBadge, { teacherStatus } from '../components/admin/TeacherVerificationBadge';
import BackButton from '../components/navigation/BackButton';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { formatDate } from '../lib/utils';
import {
  AdminTeacherSummary,
  blockTeacher,
  getAdminTeachers,
  rejectTeacher,
  removeTeacherVerification,
  suspendTeacher,
  unsuspendTeacher,
  unblockTeacher,
  verifyTeacher,
} from '../services/adminTeachersService';
import { TeacherVerificationStatus } from '../types/database';

export default function AdminTeachersPage({
  initialStatus = 'all',
}: {
  initialStatus?: TeacherVerificationStatus | 'all';
}) {
  const [searchParams] = useSearchParams();
  const queryStatus = searchParams.get('status');
  const requestedStatus = ['pending', 'verified', 'rejected', 'suspended', 'blocked'].includes(queryStatus ?? '')
    ? queryStatus as TeacherVerificationStatus
    : initialStatus;
  const [teachers, setTeachers] = useState<AdminTeacherSummary[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<TeacherVerificationStatus | 'all'>(requestedStatus);
  const [specialty, setSpecialty] = useState('');
  const [activity, setActivity] = useState<'all' | 'courses' | 'answers'>('all');
  const [sort, setSort] = useState<'newest' | 'highest-rating' | 'most-answers' | 'most-courses' | 'pending-first'>('pending-first');
  const [selected, setSelected] = useState<AdminTeacherSummary | null>(null);
  const [action, setAction] = useState<TeacherStatusModalAction | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    getAdminTeachers({ query, status, specialty, activity, sort }).then(setTeachers).catch((err) => setError(err instanceof Error ? err.message : 'Impossible de charger les profs.')).finally(() => setLoading(false));
  };
  useEffect(load, [activity, query, sort, specialty, status]);
  useEffect(() => setStatus(requestedStatus), [requestedStatus]);

  const beginAction = (teacher: AdminTeacherSummary, next: TeacherStatusModalAction) => {
    setSelected(teacher);
    setAction(next);
  };

  const perform = async (nextStatus: TeacherVerificationStatus, reason: string) => {
    if (!selected) return;
    setBusy(true);
    setError('');
    try {
      if (nextStatus === 'verified') await verifyTeacher(selected.id);
      else if (nextStatus === 'rejected') await rejectTeacher(selected.id, reason);
      else if (nextStatus === 'suspended') await suspendTeacher(selected.id, reason);
      else if (nextStatus === 'blocked') await blockTeacher(selected.id, reason);
      else if (action === 'unblock') await unblockTeacher(selected.id);
      else if (action === 'unsuspend') await unsuspendTeacher(selected.id);
      else await removeTeacherVerification(selected.id, reason);
      setAction(null);
      setSelected(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-6">
      <BackButton label="Retour au tableau de bord" fallbackTo="/admin/dashboard" />
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-black uppercase text-brand-orange">Verification enseignants</p>
          <h1 className="mt-2 text-3xl font-black text-elios-navy">Gestion des profs</h1>
          <p className="mt-2 text-slate-600">Verifiez les profils, suivez l'activite et controlez la qualite des enseignants.</p>
        </div>
        <button type="button" onClick={() => setStatus('pending')} className="inline-flex items-center gap-2 rounded-xl bg-elios-navy px-4 py-3 text-sm font-bold text-white"><ShieldCheck className="h-4 w-4" /> Profils en attente</button>
      </header>

      <div className="grid gap-3 rounded-2xl border border-brand-border bg-white p-4 shadow-sm lg:grid-cols-[minmax(220px,1fr)_165px_180px_160px_180px]">
        <label className="relative"><Search className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nom, email, specialite" className="h-12 w-full rounded-xl border border-slate-200 pl-10 pr-4 outline-none focus:border-brand-orange" /></label>
        <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="h-12 rounded-xl border border-slate-200 px-3 text-sm font-semibold">
          <option value="all">Tous statuts</option><option value="pending">En attente</option><option value="verified">Verifie</option><option value="rejected">Refuse</option><option value="suspended">Suspendu</option><option value="blocked">Bloque</option>
        </select>
        <input value={specialty} onChange={(event) => setSpecialty(event.target.value)} placeholder="Specialite" className="h-12 rounded-xl border border-slate-200 px-3 text-sm" />
        <select value={activity} onChange={(event) => setActivity(event.target.value as typeof activity)} className="h-12 rounded-xl border border-slate-200 px-3 text-sm font-semibold">
          <option value="all">Toute activite</option><option value="courses">Avec cours</option><option value="answers">Avec reponses</option>
        </select>
        <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="h-12 rounded-xl border border-slate-200 px-3 text-sm font-semibold">
          <option value="pending-first">En attente d'abord</option><option value="newest">Nouveaux</option><option value="highest-rating">Meilleure note</option><option value="most-answers">Plus de reponses</option><option value="most-courses">Plus de cours</option>
        </select>
      </div>
      {error ? <p className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p> : null}
      {loading ? <LoadingSpinner label="Chargement des profs" /> : (
        <div className="overflow-x-auto rounded-2xl border border-brand-border bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500"><tr><th className="px-5 py-4">Prof</th><th className="px-4 py-4">Statut</th><th className="px-4 py-4">Reputation</th><th className="px-4 py-4">Activite</th><th className="px-4 py-4">Inscription</th><th className="px-5 py-4 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {teachers.map((teacher) => (
                <tr key={teacher.id} className="align-top hover:bg-slate-50/70">
                  <td className="px-5 py-4"><div className="flex gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-elios-sky text-elios-blue"><GraduationCap className="h-5 w-5" /></span><div><p className="font-bold text-elios-navy">{teacher.full_name}</p><p className="text-slate-500">{teacher.email}</p><p className="text-xs text-slate-400">{teacher.specialty || 'Specialite non indiquee'}</p></div></div></td>
                  <td className="px-4 py-4"><TeacherVerificationBadge status={teacherStatus(teacher)} /></td>
                  <td className="px-4 py-4 text-slate-600"><p className="font-bold text-elios-navy">{Number(teacher.average_rating).toFixed(1)} / 5</p><p>{teacher.total_reviews} avis</p><p>{teacher.follower_count ?? 0} abonnes</p></td>
                  <td className="px-4 py-4 text-slate-600"><p>{teacher.total_answers} reponses</p><p>{teacher.total_best_answers} meilleures</p><p>{teacher.total_courses} cours</p></td>
                  <td className="px-4 py-4 text-slate-600">{formatDate(teacher.created_at)}</td>
                  <td className="px-5 py-4"><div className="flex min-w-[270px] flex-wrap justify-end gap-2">
                    <Link to={`/admin/teachers/${teacher.id}`} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 font-bold text-elios-blue"><Eye className="h-4 w-4" /> Voir</Link>
                    {teacherStatus(teacher) !== 'verified' ? <button onClick={() => beginAction(teacher, 'verify')} className="rounded-lg bg-emerald-600 px-3 py-2 font-bold text-white">Verifier</button> : <button onClick={() => beginAction(teacher, 'remove')} className="rounded-lg border px-3 py-2 font-bold">Retirer</button>}
                    <button onClick={() => beginAction(teacher, 'reject')} className="rounded-lg border border-red-100 px-3 py-2 font-bold text-red-700">Refuser</button>
                    {teacherStatus(teacher) === 'suspended' ? <button onClick={() => beginAction(teacher, 'unsuspend')} className="rounded-lg border border-emerald-100 px-3 py-2 font-bold text-emerald-700">Reactiver</button> : <button onClick={() => beginAction(teacher, 'suspend')} className="rounded-lg border border-orange-100 px-3 py-2 font-bold text-orange-700">Suspendre</button>}
                    {teacherStatus(teacher) === 'blocked' ? <button onClick={() => beginAction(teacher, 'unblock')} className="rounded-lg border border-emerald-200 px-3 py-2 font-bold text-emerald-700">Debloquer</button> : <button onClick={() => beginAction(teacher, 'block')} className="rounded-lg border border-red-100 px-3 py-2 font-bold text-red-700">Bloquer</button>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!teachers.length ? <p className="p-10 text-center text-sm text-slate-500">Aucun prof ne correspond aux filtres.</p> : null}
        </div>
      )}
      <TeacherStatusModal action={action} open={Boolean(action && selected)} busy={busy} teacherName={selected?.full_name ?? ''} onClose={() => setAction(null)} onConfirm={perform} />
    </section>
  );
}
