import { logSupabaseError } from '../lib/debug';
import { supabase } from '../lib/supabase';

const blockedMessage = 'Your account has been restricted. Contact support for more information.';

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
