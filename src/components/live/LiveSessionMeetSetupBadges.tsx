import { LiveSession, MeetSetupStatus } from '../../types/liveSessions';

const styles: Record<MeetSetupStatus, string> = {
  not_attempted: 'bg-slate-100 text-slate-600',
  configured: 'bg-emerald-50 text-emerald-700',
  failed: 'bg-red-50 text-red-700',
  unsupported: 'bg-orange-50 text-orange-700',
};

function badge(label: string, status: MeetSetupStatus, value: string) {
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${styles[status]}`}>{label} : {value}</span>;
}

export default function LiveSessionMeetSetupBadges({ session }: { session: LiveSession }) {
  const hostStatus = session.meet_space_config_status ?? 'not_attempted';
  const artifactStatus = session.meet_artifact_config_status ?? 'not_attempted';
  const hostLabels: Record<MeetSetupStatus, string> = {
    not_attempted: 'Non configuré',
    configured: 'Activé',
    failed: 'Échoué',
    unsupported: 'Non supporté',
  };
  const artifactLabels: Record<MeetSetupStatus, string> = {
    not_attempted: 'Non configuré',
    configured: 'Partage activé',
    failed: 'Échoué',
    unsupported: 'Non supporté',
  };

  return (
    <div className="flex flex-wrap gap-2">
      {badge('Host Management', hostStatus, hostLabels[hostStatus])}
      {badge('Artifacts', artifactStatus, artifactLabels[artifactStatus])}
    </div>
  );
}
