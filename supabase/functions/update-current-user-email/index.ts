import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ErrorCode =
  | 'SESSION_MISSING'
  | 'SESSION_INVALID'
  | 'INVALID_EMAIL'
  | 'SAME_EMAIL'
  | 'EMAIL_ALREADY_USED'
  | 'AUTH_UPDATE_FAILED'
  | 'PROFILE_SYNC_FAILED'
  | 'CONFIGURATION_ERROR'
  | 'UNKNOWN_ERROR';

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function failure(status: number, error: string, code: ErrorCode, details?: string) {
  return response({ error, code, details }, status);
}

function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function logFailure(step: string, userId: string | undefined, error: unknown) {
  const issue = error as { message?: string; status?: number; code?: string };
  console.error('update-current-user-email failed', {
    step,
    userId,
    message: issue?.message ?? String(error),
    status: issue?.status,
    code: issue?.code,
  });
}

async function isEmailUsedByAnotherUser(
  adminClient: ReturnType<typeof createClient>,
  email: string,
  currentUserId: string,
) {
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    if (data.users.some((user) => user.id !== currentUserId && user.email?.trim().toLowerCase() === email)) {
      return true;
    }
    if (data.users.length < 1000) return false;
  }
  throw new Error('Email uniqueness lookup exceeded the supported page limit.');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return failure(405, 'Méthode non autorisée.', 'UNKNOWN_ERROR');

  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    return failure(401, 'Session manquante. Veuillez vous reconnecter.', 'SESSION_MISSING');
  }

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceRoleKey) {
    logFailure('configuration', undefined, new Error('Required Edge Function secrets are missing.'));
    return failure(500, 'La modification d’email n’est pas configurée.', 'CONFIGURATION_ERROR');
  }

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) {
    logFailure('validate_session', undefined, userError ?? new Error('No authenticated user.'));
    return failure(401, 'Session invalide. Veuillez vous reconnecter.', 'SESSION_INVALID');
  }

  const currentUser = userData.user;
  const input = await req.json().catch(() => ({}));
  const newEmail = normalizeEmail(input.newEmail);

  if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    return failure(400, 'Adresse email invalide.', 'INVALID_EMAIL');
  }

  if (newEmail === normalizeEmail(currentUser.email)) {
    return failure(400, 'Cette adresse email est déjà votre adresse actuelle.', 'SAME_EMAIL');
  }

  try {
    if (await isEmailUsedByAnotherUser(adminClient, newEmail, currentUser.id)) {
      return failure(409, 'Cette adresse email est déjà utilisée.', 'EMAIL_ALREADY_USED');
    }
  } catch (error) {
    logFailure('check_duplicate_email', currentUser.id, error);
    return failure(500, 'Impossible de vérifier la disponibilité de cette adresse email.', 'AUTH_UPDATE_FAILED');
  }

  // TODO: Add reauthentication/current password confirmation before sensitive credential changes.
  const { data: updatedUser, error: authUpdateError } = await adminClient.auth.admin.updateUserById(currentUser.id, {
    email: newEmail,
    email_confirm: true,
  });

  if (authUpdateError) {
    logFailure('update_auth_user', currentUser.id, authUpdateError);
    if (/already|registered|exists|unique/i.test(authUpdateError.message)) {
      return failure(409, 'Cette adresse email est déjà utilisée.', 'EMAIL_ALREADY_USED');
    }
    return failure(500, 'Impossible de modifier l’adresse email dans le compte.', 'AUTH_UPDATE_FAILED');
  }

  const { error: profileUpdateError } = await adminClient
    .from('profiles')
    .update({ email: newEmail })
    .eq('id', currentUser.id);

  if (profileUpdateError) {
    logFailure('sync_profile_email', currentUser.id, profileUpdateError);
    return failure(
      500,
      'L’adresse de connexion a été modifiée, mais le profil n’a pas pu être synchronisé.',
      'PROFILE_SYNC_FAILED',
      'Reconnectez-vous puis contactez le support si l’adresse affichée ne se met pas à jour.',
    );
  }

  return response({
    email: updatedUser.user.email ?? newEmail,
    message: 'Votre adresse email a été mise à jour.',
  });
});
