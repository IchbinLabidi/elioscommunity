# Google Meet pour les sessions live

Les liens Google Meet sont crees par des Supabase Edge Functions avec le compte
Google plateforme. Aucun secret Google ne doit etre stocke dans l'application React.

## 1. Preparer Google OAuth, Calendar et Meet

1. Creez un projet dans Google Cloud Console pour `sosprof.tn`.
2. Activez l'API **Google Calendar API**.
3. Activez aussi l'API **Google Meet API**.
4. Configurez l'ecran de consentement OAuth de l'application.
5. Ajoutez le scope Calendar et les scopes Meet requis :
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/meetings.space.created`
   - `https://www.googleapis.com/auth/meetings.space.settings`
   - `https://www.googleapis.com/auth/meetings.space.readonly`
6. Creez un identifiant **OAuth Client ID** pour l'integration serveur.
7. Autorisez le compte Google plateforme, par exemple `live@sosprof.tn`, avec
   ces scopes, puis generez son `refresh_token`.
8. Creez ou choisissez le calendrier de ce compte plateforme et relevez son ID.

Si vous ajoutez les scopes Meet apres la premiere configuration, regenerez
`GOOGLE_REFRESH_TOKEN` : l'ancien jeton ne recoit pas les nouvelles permissions.

La session est creee dans le calendrier du compte ayant accorde le jeton OAuth.
Les professeurs ne connectent jamais leur propre compte Google.
Le professeur est ajoute comme invite Calendar lors de la creation d'une
session avec `profiles.meet_email` si cette colonne existe et est renseignee,
sinon `profiles.email`, puis l'adresse email du compte Auth. L'appel Calendar
utilise `sendUpdates=all` pour envoyer l'invitation.
L'attribution automatique du role co-host utilise l'API Google Meet
`spaces.members` en `v2beta`, fonctionnalite experimentale disponible selon le
programme Developer Preview et les droits Workspace du compte organisateur.
Si Google la refuse, les invitations et le lien Meet continuent de fonctionner.
Avant l'attribution co-host, l'application tente d'activer **Host Management**
avec l'appel documente
`PATCH https://meet.googleapis.com/v2/{spaceName}?updateMask=config.moderation`
et le corps `{ "name": "{spaceName}", "config": { "moderation": "ON" } }`.

La case Google Calendar **Call artifacts are shared with the host and co-hosts**
n'est pas exposee dans la documentation Meet API disponible. `ArtifactConfig`
configure l'auto-enregistrement, les transcriptions et les smart notes ; il ne
represente pas cette option de partage. L'application enregistre donc ce point
comme `unsupported`, sans simuler son activation.

## 2. Configurer les secrets Supabase

Conservez les identifiants OAuth uniquement dans les secrets des Edge Functions :

```bash
supabase secrets set GOOGLE_CLIENT_ID="your-oauth-client-id.apps.googleusercontent.com"
supabase secrets set GOOGLE_CLIENT_SECRET="your-oauth-client-secret"
supabase secrets set GOOGLE_REFRESH_TOKEN="your-platform-account-refresh-token"
supabase secrets set GOOGLE_CALENDAR_ID="primary-or-calendar-id@group.calendar.google.com"
supabase secrets set LIVE_SESSION_CRON_SECRET="generate-a-long-random-value"
```

Supprimez ou ignorez les anciens secrets `GOOGLE_CLIENT_EMAIL`,
`GOOGLE_PRIVATE_KEY` et `GOOGLE_PROJECT_ID` : les fonctions ne les utilisent plus.
Ne creez jamais de variable `VITE_GOOGLE_*` : les variables Vite sont exposees
dans le navigateur, y compris un secret client ou un refresh token.

## 3. Appliquer la base de donnees

Executez les migrations `split_035_part_1` a `split_035_part_5`, puis
`split_036_part_1_live_session_cohost_experimental.sql`, puis
`split_036_part_2_live_session_cohost_diagnostics.sql`, puis
`split_036_part_3_live_session_cohost_attempt.sql`, puis
`split_036_part_4_live_session_meet_space_config.sql` apres les
migrations existantes. Elles ajoutent :

- `course_live_sessions` et l'historique des notifications live ;
- les regles RLS limitant les liens Meet aux profs, admins et etudiants approuves ;
- un apercu public sans lien prive ;
- l'ajout d'enregistrement avec notification des etudiants inscrits.
- l'adresse Meet optionnelle d'un prof et l'etat de tentative co-host.
- l'etat Host Management et le diagnostic de partage des artefacts.

## 4. Deployer les Edge Functions

```bash
supabase functions deploy create-google-meet-session
supabase functions deploy update-google-meet-session
supabase functions deploy retry-google-meet-cohost
supabase functions deploy cancel-google-meet-session
supabase functions deploy send-live-session-reminders --no-verify-jwt
```

Les trois fonctions de gestion utilisent le JWT de l'utilisateur connecte.
La fonction de rappels est destinee a un appel planifie et exige l'en-tete
`x-cron-secret` correspondant a `LIVE_SESSION_CRON_SECRET`.

## 5. Planifier les rappels

Configurez un appel cron Supabase vers `send-live-session-reminders` toutes les
quelques minutes avec l'en-tete secret. La fonction envoie les rappels a 24 h,
1 h et 15 min et evite les doublons via `live_session_notifications`.

## 6. Verifier l'integration

1. Connectez-vous avec un profil professeur actif.
2. Ouvrez un cours appartenant a ce professeur, puis **Sessions live**.
3. Programmez une session : l'Edge Function doit renouveler le jeton OAuth,
   creer un evenement Calendar et enregistrer son lien Meet.
   Verifiez aussi que l'evenement contient le professeur parmi les invites.
4. Verifiez que le professeur et uniquement les etudiants `approved` sont invites.
5. Controlez `teacher_cohost_status` : `assigned`, `failed` ou `unsupported`.
   Controlez aussi `meet_space_config_status` : `configured` signifie que
   Host Management a ete active par l'API avant la tentative co-host.
6. En cas d'echec, controlez `teacher_cohost_google_status_code`,
   `teacher_cohost_google_message`, `teacher_cohost_missing_scopes` et
   `teacher_cohost_preview_unsupported`. Ces champs ne stockent aucun secret.
   Un scope manquant implique de regenerer `GOOGLE_REFRESH_TOKEN`; un refus de
   permission peut indiquer une limitation Workspace ou Developer Preview.
   `teacher_cohost_attempted_method` et `teacher_cohost_attempted_endpoint`
   permettent de confirmer l'appel exact tente par l'Edge Function.
   L'appel co-host documente est `POST https://meet.googleapis.com/v2beta/{spaceName}/members`.
   Si Google renvoie `Method not found`, l'espace Meet est valide mais la
   methode Preview `spaces.members.create` n'est pas disponible pour ce projet
   ou ce compte Workspace. Dans ce cas, les modifications de session ne
   relancent pas automatiquement cet appel ; utilisez **Reessayer co-host**
   uniquement apres activation Developer Preview ou changement de configuration.
6. Si la tentative echoue, verifiez que le lien Meet reste utilisable et testez
   le bouton **Reessayer co-host**.
7. Verifiez qu'un visiteur ou une inscription en attente ne voit aucun lien Meet.
8. Modifiez puis annulez une session et controlez les notifications.
9. Ajoutez un lien d'enregistrement et verifiez qu'il n'est visible que par les inscrits approuves.

Le lancement d'un enregistrement n'est pas garanti par l'application : il
depend de l'edition Google Workspace, des permissions Meet du compte
organisateur et de l'attribution effective du role co-host.
