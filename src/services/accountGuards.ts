import { logSupabaseError } from '../lib/debug';
import { supabase } from '../lib/supabase';

const blockedMessage = 'Your account has been restricted. Contact support for more information.';
const teacherRestrictionMessage = 'Action non autorisee. Votre compte professeur est suspendu ou bloque.';

export async function ensureCurrentUserIsNotBlocked(action: string) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) {
    logSupabaseError(`${action}.authUser`, authError);
    throw authError;
  }

  const userId = authData.user?.id;
  if (!userId) throw new Error('You must be logged in to continue.');

  const { data, error } = await supabase
    .from('profiles')
    .select('is_blocked')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    logSupabaseError(`${action}.blockedCheck`, error);
    throw error;
  }

  if (data?.is_blocked) throw new Error(blockedMessage);
  return userId;
}

export async function ensureCurrentTeacherCanAct(action: string, allowAdmin = false) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) {
    logSupabaseError(`${action}.authUser`, authError);
    throw authError;
  }
  const userId = authData.user?.id;
  if (!userId) throw new Error('You must be logged in to continue.');
  const { data, error } = await supabase.from('profiles').select('role, is_blocked, verification_status').eq('id', userId).maybeSingle();
  if (error) {
    logSupabaseError(`${action}.teacherRestrictionCheck`, error);
    throw error;
  }
  if (allowAdmin && data?.role === 'admin') return userId;
  if (data?.role !== 'teacher' || data.is_blocked || ['suspended', 'blocked'].includes(data.verification_status ?? '')) {
    throw new Error(teacherRestrictionMessage);
  }
  return userId;
}

export async function ensureCurrentUserCanParticipate(action: string) {
  const userId = await ensureCurrentUserIsNotBlocked(action);
  const { data, error } = await supabase.from('profiles').select('role, verification_status').eq('id', userId).maybeSingle();
  if (error) {
    logSupabaseError(`${action}.participationCheck`, error);
    throw error;
  }
  if (data?.role === 'teacher' && ['suspended', 'blocked'].includes(data.verification_status ?? '')) {
    throw new Error(teacherRestrictionMessage);
  }
  return userId;
}
