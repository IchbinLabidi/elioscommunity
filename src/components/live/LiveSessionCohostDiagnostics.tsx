import { LiveSession } from '../../types/liveSessions';

export default function LiveSessionCohostDiagnostics({ session }: { session: LiveSession }) {
  if (
    !session.teacher_cohost_error
    && !session.google_meet_space_name
    && !session.teacher_cohost_google_status_code
    && !session.teacher_cohost_google_message
    && !session.teacher_cohost_missing_scopes
    && !session.teacher_cohost_preview_unsupported
    && !session.teacher_cohost_attempted_method
    && !session.teacher_cohost_attempted_endpoint
    && !session.meet_space_config_error
    && !session.meet_artifact_config_error
  ) {
    return null;
  }

  return (
    <details className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
      <summary className="cursor-pointer font-semibold text-brand-navy">Détails techniques co-host</summary>
      <dl className="mt-3 grid gap-2 break-words">
        {session.teacher_cohost_error ? <div><dt className="font-bold">Raison</dt><dd>{session.teacher_cohost_error}</dd></div> : null}
        {session.google_meet_space_name ? <div><dt className="font-bold">Espace Meet</dt><dd>{session.google_meet_space_name}</dd></div> : null}
        {session.teacher_cohost_google_status_code ? <div><dt className="font-bold">Statut Google API</dt><dd>{session.teacher_cohost_google_status_code}</dd></div> : null}
        {session.teacher_cohost_google_message ? <div><dt className="font-bold">Message Google API</dt><dd>{session.teacher_cohost_google_message}</dd></div> : null}
        {session.teacher_cohost_attempted_method ? <div><dt className="font-bold">Méthode tentée</dt><dd>{session.teacher_cohost_attempted_method}</dd></div> : null}
        {session.teacher_cohost_attempted_endpoint ? <div><dt className="font-bold">Endpoint tenté</dt><dd>{session.teacher_cohost_attempted_endpoint}</dd></div> : null}
        {session.meet_space_config_error ? <div><dt className="font-bold">Host Management</dt><dd>{session.meet_space_config_error}</dd></div> : null}
        {session.meet_artifact_config_error ? <div><dt className="font-bold">Artifacts</dt><dd>{session.meet_artifact_config_error}</dd></div> : null}
        {session.teacher_cohost_missing_scopes ? <p className="rounded-lg bg-orange-50 p-2 font-semibold text-orange-800">Scopes Meet manquants : régénérez GOOGLE_REFRESH_TOKEN avec les permissions Google Meet.</p> : null}
        {session.teacher_cohost_preview_unsupported ? <p className="rounded-lg bg-orange-50 p-2 font-semibold text-orange-800">Google Meet co-host peut être indisponible pour ce projet, cette préversion ou les permissions Workspace.</p> : null}
      </dl>
    </details>
  );
}
