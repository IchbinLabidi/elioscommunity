import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  MessageSquare,
  ShieldAlert,
  Trash2,
  UserRound,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AdminModerationTabs from '../components/admin/AdminModerationTabs';
import AdminSectionHeader from '../components/admin/AdminSectionHeader';
import AdminStatCard from '../components/admin/AdminStatCard';
import ModerationReasonModal from '../components/admin/ModerationReasonModal';
import ModerationStatusBadge from '../components/admin/ModerationStatusBadge';
import BackButton from '../components/navigation/BackButton';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { getErrorMessage } from '../lib/debug';
import { formatDate } from '../lib/utils';
import {
  getAdminAnswers,
  getAdminComments,
  getAdminQuestions,
  getModerationState,
  getModerationStats,
  moderateContent,
  ModerationAction,
  ModerationItem,
  ModerationStats,
  ModerationTab,
} from '../services/adminModerationService';

type Props = { initialTab?: ModerationTab };
type StateFilter = '' | 'visible' | 'hidden' | 'deleted' | 'reviewed' | 'unreviewed';

const routeByTab: Record<ModerationTab, string> = {
  question: '/admin/questions',
  answer: '/admin/answers',
  answer_comment: '/admin/comments',
};

const loadByTab = {
  question: getAdminQuestions,
  answer: getAdminAnswers,
  answer_comment: getAdminComments,
};

const targetLabels: Record<ModerationTab, string> = {
  question: 'question',
  answer: 'réponse',
  answer_comment: 'commentaire',
};

export default function AdminModerationPage({ initialTab = 'question' }: Props) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<ModerationTab>(initialTab);
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statsError, setStatsError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<StateFilter>('');
  const [questionStatus, setQuestionStatus] = useState('');
  const [reportedOnly, setReportedOnly] = useState(false);
  const [sort, setSort] = useState<'newest' | 'reported' | 'hidden'>('newest');
  const [modal, setModal] = useState<{ action: 'hide' | 'restore' | 'delete'; item: ModerationItem } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => setTab(initialTab), [initialTab]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError('');
    try {
      setStats(await getModerationStats());
    } catch (err) {
      setStatsError(getErrorMessage(err, 'Impossible de charger les statistiques de modération.'));
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadItems = useCallback(async (selectedTab: ModerationTab) => {
    setLoading(true);
    setError('');
    try {
      setItems(await loadByTab[selectedTab]());
    } catch (err) {
      setError(getErrorMessage(err, 'Impossible de charger les contenus de modération.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    void loadItems(tab);
  }, [loadItems, tab]);

  const changeTab = (nextTab: ModerationTab) => {
    setTab(nextTab);
    setSearch('');
    setStateFilter('');
    setQuestionStatus('');
    setReportedOnly(false);
    navigate(routeByTab[nextTab]);
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items
      .filter((item) => {
        const matchesSearch = !query || `${item.title} ${item.content} ${item.authorName} ${item.authorEmail} ${item.subject || ''}`.toLowerCase().includes(query);
        const state = getModerationState(item);
        const matchesState = !stateFilter
          || (stateFilter === 'unreviewed' ? !item.reviewedAt : stateFilter === 'reviewed' ? Boolean(item.reviewedAt) : state === stateFilter);
        const matchesQuestionStatus = tab !== 'question' || !questionStatus || item.questionStatus === questionStatus;
        const matchesReports = !reportedOnly || item.reportCount > 0;
        return matchesSearch && matchesState && matchesQuestionStatus && matchesReports;
      })
      .sort((first, second) => {
        if (sort === 'reported') return second.reportCount - first.reportCount || new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
        if (sort === 'hidden') return Number(second.isHidden || second.isDeleted) - Number(first.isHidden || first.isDeleted);
        return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
      });
  }, [items, questionStatus, reportedOnly, search, sort, stateFilter, tab]);

  const clearFilters = () => {
    setSearch('');
    setStateFilter('');
    setQuestionStatus('');
    setReportedOnly(false);
    setSort('newest');
  };

  const act = async (item: ModerationItem, action: ModerationAction, reason?: string) => {
    setBusyId(item.id);
    setError('');
    setNotice('');
    try {
      await moderateContent(item.type, item.id, action, reason);
      setModal(null);
      setNotice(action === 'mark_reviewed' ? 'Contenu marqué comme vérifié.' : 'Action de modération enregistrée.');
      await Promise.all([loadItems(tab), loadStats()]);
    } catch (err) {
      setError(getErrorMessage(err, 'Impossible d’enregistrer cette action.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="space-y-6">
      <BackButton label="Retour au tableau de bord" fallbackTo="/admin/dashboard" />
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-orange">Administration</p>
        <h1 className="mt-2 text-3xl font-black text-brand-navy">Modération</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Gérez les questions, réponses et commentaires publiés sur sosprof.tn.
        </p>
      </div>

      {statsError ? (
        <ErrorCard message="Impossible de charger les statistiques de modération." onRetry={() => void loadStats()} />
      ) : statsLoading ? (
        <LoadingSpinner />
      ) : stats ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard label="Questions masquées" value={`${stats.hiddenQuestions} / ${stats.totalQuestions}`} icon={MessageSquare} hint="Questions modérées" />
          <AdminStatCard label="Réponses masquées" value={`${stats.hiddenAnswers} / ${stats.totalAnswers}`} icon={FileText} hint="Réponses modérées" />
          <AdminStatCard label="Commentaires masqués" value={`${stats.hiddenComments} / ${stats.totalComments}`} icon={EyeOff} hint="Réponses de discussion" />
          <AdminStatCard label="À vérifier" value={stats.pendingReview} icon={ShieldAlert} hint={`${stats.pendingReports} report(s) en attente`} />
        </div>
      ) : null}

      <AdminModerationTabs value={tab} onChange={changeTab} />

      <section className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm">
        <AdminSectionHeader title={`Modérer les ${targetLabels[tab]}s`} subtitle="Filtrez le contenu, examinez son contexte et consignez chaque décision." />
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher contenu ou auteur"
            className="min-h-12 rounded-xl border border-brand-border px-4 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 xl:col-span-2"
          />
          <select value={stateFilter} onChange={(event) => setStateFilter(event.target.value as StateFilter)} className="min-h-12 rounded-xl border border-brand-border px-3 text-sm text-slate-700 outline-none focus:border-brand-orange">
            <option value="">Tous les états</option>
            <option value="visible">Visible</option>
            <option value="hidden">Masqué</option>
            <option value="deleted">Supprimé</option>
            <option value="reviewed">Vérifié</option>
            <option value="unreviewed">Non vérifié</option>
          </select>
          {tab === 'question' ? (
            <select value={questionStatus} onChange={(event) => setQuestionStatus(event.target.value)} className="min-h-12 rounded-xl border border-brand-border px-3 text-sm text-slate-700 outline-none focus:border-brand-orange">
              <option value="">Tous les statuts</option>
              <option value="open">Ouverte</option>
              <option value="answered">Répondue</option>
              <option value="closed">Clôturée</option>
            </select>
          ) : (
            <label className="flex min-h-12 items-center gap-2 rounded-xl border border-brand-border px-4 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={reportedOnly} onChange={(event) => setReportedOnly(event.target.checked)} className="h-4 w-4 accent-brand-orange" />
              Signalés uniquement
            </label>
          )}
          <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="min-h-12 rounded-xl border border-brand-border px-3 text-sm text-slate-700 outline-none focus:border-brand-orange">
            <option value="newest">Plus récents</option>
            <option value="reported">Signalés d’abord</option>
            <option value="hidden">Masqués d’abord</option>
          </select>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          {tab === 'question' ? (
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
              <input type="checkbox" checked={reportedOnly} onChange={(event) => setReportedOnly(event.target.checked)} className="h-4 w-4 accent-brand-orange" />
              Signalées uniquement
            </label>
          ) : <span />}
          {(search || stateFilter || questionStatus || reportedOnly || sort !== 'newest') ? (
            <button type="button" onClick={clearFilters} className="rounded-xl border border-brand-border px-4 py-2.5 text-sm font-bold text-brand-navy hover:bg-slate-50">
              Réinitialiser les filtres
            </button>
          ) : null}
        </div>
      </section>

      {notice ? <p className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{notice}</p> : null}
      {error ? <ErrorCard message="Impossible de charger les contenus de modération ou d’enregistrer l’action." onRetry={() => void loadItems(tab)} /> : null}

      {loading ? <LoadingSpinner /> : filtered.length ? (
        <div className="space-y-4">
          {filtered.map((item) => (
            <ContentCard
              key={item.id}
              item={item}
              busy={busyId === item.id}
              onReview={() => void act(item, 'mark_reviewed')}
              onModal={(action) => setModal({ action, item })}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-brand-border bg-white p-10 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-brand-orange" />
          <h2 className="mt-4 text-lg font-bold text-brand-navy">Aucun contenu à modérer.</h2>
          <p className="mt-2 text-sm text-slate-600">Aucun élément ne correspond aux filtres sélectionnés.</p>
        </div>
      )}

      {modal ? (
        <ModerationReasonModal
          isOpen
          action={modal.action}
          targetLabel={modal.item.title}
          busy={busyId === modal.item.id}
          onClose={() => setModal(null)}
          onConfirm={(reason) => act(modal.item, modal.action, reason)}
        />
      ) : null}
    </section>
  );
}

function ContentCard({ item, busy, onReview, onModal }: {
  item: ModerationItem;
  busy: boolean;
  onReview: () => void;
  onModal: (action: 'hide' | 'restore' | 'delete') => void;
}) {
  const authorPath = item.authorRole === 'teacher' ? `/admin/teachers/${item.authorId}` : item.authorRole === 'student' ? `/admin/students/${item.authorId}` : '/admin/users';
  const inaccessiblePublicly = item.isDeleted || item.isHidden;

  return (
    <article className="overflow-hidden rounded-2xl border border-brand-border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-24 w-full rounded-xl object-cover lg:w-36" /> : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <ModerationStatusBadge item={item} />
            {item.subject ? <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-brand-navy">{item.subject}</span> : null}
            {item.isBest ? <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-brand-navy ring-1 ring-orange-100">Meilleure réponse</span> : null}
            {item.reportCount ? <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">{item.reportCount} report(s)</span> : null}
          </div>
          <h2 className="mt-3 text-lg font-bold text-brand-navy">{item.title}</h2>
          <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm leading-6 text-slate-600">{item.content}</p>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-slate-500">
            <span>{item.authorName} {item.authorEmail ? `· ${item.authorEmail}` : ''}</span>
            <span>{formatDate(item.createdAt)}</span>
            {item.hiddenReason ? <span className="text-amber-700">Motif : {item.hiddenReason}</span> : null}
            {item.deletedReason ? <span className="text-red-700">Motif : {item.deletedReason}</span> : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 lg:max-w-[300px] lg:justify-end">
          {!inaccessiblePublicly ? (
            <Link to={`/questions/${item.questionId}`} className="inline-flex items-center gap-1 rounded-xl border border-brand-border px-3 py-2 text-sm font-bold text-brand-navy hover:bg-slate-50">
              <Eye className="h-4 w-4" /> Ouvrir
            </Link>
          ) : null}
          <Link to={authorPath} className="inline-flex items-center gap-1 rounded-xl border border-brand-border px-3 py-2 text-sm font-bold text-brand-navy hover:bg-slate-50">
            <UserRound className="h-4 w-4" /> Auteur
          </Link>
          {item.reportCount ? <Link to="/admin/reports?status=pending" className="rounded-xl border border-red-100 px-3 py-2 text-sm font-bold text-red-700">Reports</Link> : null}
          {!item.reviewedAt ? (
            <button type="button" onClick={onReview} disabled={busy} className="inline-flex items-center gap-1 rounded-xl border border-blue-100 px-3 py-2 text-sm font-bold text-blue-700 disabled:opacity-50">
              <CheckCircle2 className="h-4 w-4" /> Vérifié
            </button>
          ) : null}
          {item.isHidden || item.isDeleted ? (
            <button type="button" onClick={() => onModal('restore')} disabled={busy} className="inline-flex items-center gap-1 rounded-xl bg-brand-navy px-3 py-2 text-sm font-bold text-white disabled:opacity-50">
              <Eye className="h-4 w-4" /> Restaurer
            </button>
          ) : (
            <button type="button" onClick={() => onModal('hide')} disabled={busy} className="inline-flex items-center gap-1 rounded-xl bg-brand-navy px-3 py-2 text-sm font-bold text-white disabled:opacity-50">
              <EyeOff className="h-4 w-4" /> Masquer
            </button>
          )}
          {!item.isDeleted ? (
            <button type="button" onClick={() => onModal('delete')} disabled={busy} className="inline-flex items-center gap-1 rounded-xl border border-red-100 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50">
              <Trash2 className="h-4 w-4" /> Supprimer
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-red-50 text-red-700"><AlertTriangle className="h-5 w-5" /></span>
        <p className="text-sm font-semibold text-slate-700">{message}</p>
      </div>
      <button type="button" onClick={onRetry} className="rounded-xl bg-brand-navy px-4 py-2.5 text-sm font-bold text-white">Réessayer</button>
    </div>
  );
}
