# Changement direct d'email

Le changement d'email est effectue par l'Edge Function
`update-current-user-email`. Elle verifie le JWT de la session, derive
l'utilisateur courant cote serveur et appelle l'API Admin Supabase avec
`email_confirm: true`.

Le frontend ne transmet jamais d'identifiant utilisateur et ne contient aucune
cle privilegiee.

## Deploiement

Configurez les secrets reserves aux Edge Functions :

```bash
supabase secrets set SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
supabase secrets set SUPABASE_ANON_KEY="your-project-anon-key"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
supabase functions deploy update-current-user-email
```

Ne deployez pas cette fonction avec `--no-verify-jwt`. Elle doit recevoir une
session utilisateur valide.

## Regles d'implementation

- La fonction n'accepte que `newEmail`; elle ne prend aucun `userId`.
- Un client Supabase utilisateur verifie le JWT avec la cle anon, puis un
  client serveur separe applique la modification avec la cle `service_role`.
- Supabase Auth reste la source de verite de l'adresse de connexion.
- `profiles.email` est synchronise uniquement apres la reussite de la mise a
  jour Auth et uniquement pour l'identifiant issu du JWT.
- N'exposez jamais la cle `service_role` dans le frontend.
- N'appelez jamais l'API admin Supabase depuis le navigateur.
- Une confirmation du mot de passe avant changement d'email pourra etre ajoutee
  plus tard pour renforcer la protection d'une session laissee ouverte.
