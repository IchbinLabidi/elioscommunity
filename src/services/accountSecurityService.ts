import { logSupabaseError } from '../lib/debug';
import { supabase } from '../lib/supabase';

type EmailUpdateErrorPayload = {
  error?: string;
  code?: string;
  details?: string;
};

export class AccountEmailUpdateError extends Error {
  code?: string;
  details?: string;
  status?: number;

  constructor(message: string, options: { code?: string; details?: string; status?: number } = {}) {
    super(message);
    this.name = 'AccountEmailUpdateError';
    this.code = options.code;
    this.details = options.details;
    this.status = options.status;
  }
}

export async function updateCurrentUserEmailDirect(newEmail: string) {
  const { data, error } = await supabase.functions.invoke('update-current-user-email', {
    body: { newEmail: newEmail.trim().toLowerCase() },
  });

  if (error) {
    let payload: EmailUpdateErrorPayload | null = null;
    const context = (error as { context?: Response }).context;
    if (context) {
      payload = await context.clone().json().catch(() => null) as EmailUpdateErrorPayload | null;
    }
    const failure = new AccountEmailUpdateError(payload?.error ?? error.message, {
      code: payload?.code,
      details: payload?.details,
      status: context?.status,
    });
    if (import.meta.env.DEV) {
      console.error('Email update Edge Function failed', {
        message: failure.message,
        code: failure.code,
        details: failure.details,
        status: failure.status,
        error,
      });
    }
    throw failure;
  }

  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) {
    logSupabaseError('account.refreshSessionAfterEmail', refreshError);
  }
  const { data: userData } = await supabase.auth.getUser();
  return userData.user?.email ?? refreshed.session?.user.email ?? String(data?.email ?? newEmail);
}
