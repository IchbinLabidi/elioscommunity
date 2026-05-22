type SupabaseLikeError = {
  message?: string;
  details?: string;
  code?: string;
  status?: number;
  hint?: string;
};

export function logSupabaseError(action: string, error: unknown) {
  const supabaseError = error as SupabaseLikeError;
  console.error('Supabase error', {
    action,
    message: supabaseError?.message,
    details: supabaseError?.details,
    code: supabaseError?.code ?? supabaseError?.status,
    hint: supabaseError?.hint,
    raw: error,
  });
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;

  const supabaseError = error as SupabaseLikeError;
  return supabaseError?.message || supabaseError?.details || fallback;
}
