import { Session, User } from '@supabase/supabase-js';
/* eslint-disable react-refresh/only-export-components */
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { logSupabaseError } from '../lib/debug';
import { supabase } from '../lib/supabase';
import { Profile, UserRole } from '../types/database';
import { dashboardPathForRole } from '../lib/auth';

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  redirectToDashboard: (role?: UserRole) => string;
  completeProfile: (data: {
    fullName: string;
    role: Exclude<UserRole, 'admin'>;
    specialty?: string;
  }) => Promise<Profile>;
  signIn: (email: string, password: string) => Promise<Profile | null>;
  signUp: (data: {
    email: string;
    password: string;
    fullName: string;
    role: Exclude<UserRole, 'admin'>;
    specialty?: string;
  }) => Promise<Profile | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const profileMissingMessage = 'Your account exists but profile setup is incomplete.';

  const getRecoveryRole = (user: User): Exclude<UserRole, 'admin'> | null => {
    const role = user.user_metadata?.role;
    return role === 'student' || role === 'teacher' ? role : null;
  };

  const loadProfile = useCallback(async (userId: string) => {
    let lastError: unknown;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (!error && data) {
        const loadedProfile = data as Profile;
        setProfile(loadedProfile);
        return loadedProfile;
      }

      lastError = error;
      if (!error && !data) break;
      await new Promise((resolve) => window.setTimeout(resolve, 250));
    }

    logSupabaseError('profile.fetch', lastError);

    if (!lastError) {
      throw new Error(profileMissingMessage);
    }

    if (lastError && typeof lastError === 'object' && 'message' in lastError) {
      throw new Error(String(lastError.message));
    }

    throw new Error('Unable to load your profile.');
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user.id) await loadProfile(session.user.id);
  }, [loadProfile, session?.user.id]);

  const createProfile = useCallback(async (data: {
    userId: string;
    fullName: string;
    email: string;
    role: Exclude<UserRole, 'admin'>;
    specialty?: string;
  }) => {
    const fallbackPayload = {
      id: data.userId,
      full_name: data.fullName,
      email: data.email,
      role: data.role,
      specialty: data.role === 'teacher' ? data.specialty || null : null,
      created_at: new Date().toISOString(),
    };

    const { data: rpcProfile, error: rpcError } = await supabase.rpc('create_own_profile', {
      profile_full_name: data.fullName,
      profile_email: data.email,
      profile_role: data.role,
      profile_specialty: data.role === 'teacher' ? data.specialty || null : null,
    });

    if (rpcError) {
      logSupabaseError('profile.create', rpcError);
      const isMissingRpc = rpcError.code === 'PGRST202' || rpcError.message?.includes('Could not find the function');
      if (!isMissingRpc) throw rpcError;

      const { data: directProfile, error: directError } = await supabase
        .from('profiles')
        .upsert(fallbackPayload, { onConflict: 'id' })
        .select('*')
        .single();

      if (directError) {
        logSupabaseError('profile.create.fallback', directError);
        throw directError;
      }

      const createdProfile = directProfile as Profile;
      setProfile(createdProfile);
      return createdProfile;
    }

    const createdProfile = rpcProfile as Profile;
    setProfile(createdProfile);
    return createdProfile;
  }, []);

  const recoverProfileFromUser = useCallback(async (user: User) => {
    const role = getRecoveryRole(user);
    if (!role) return null;

    return createProfile({
      userId: user.id,
      fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Elios member',
      email: user.email || '',
      role,
      specialty: user.user_metadata?.specialty,
    });
  }, [createProfile]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data, error }) => {
      if (!mounted) return;
      if (error) {
        logSupabaseError('session.restore', error);
        setLoading(false);
        return;
      }
      setSession(data.session);
      if (data.session?.user.id) {
        try {
          await loadProfile(data.session.user.id);
        } catch (error) {
          logSupabaseError('session.profile.fetch', error);
          try {
            await recoverProfileFromUser(data.session.user);
          } catch (recoveryError) {
            logSupabaseError('session.profile.recover', recoveryError);
            setProfile(null);
          }
        }
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user.id) {
        setLoading(true);
        loadProfile(nextSession.user.id)
          .catch((error) => {
            logSupabaseError('authState.profile.fetch', error);
            return recoverProfileFromUser(nextSession.user).catch((recoveryError) => {
              logSupabaseError('authState.profile.recover', recoveryError);
              setProfile(null);
            });
          })
          .finally(() => setLoading(false));
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile, recoverProfileFromUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      profile,
      loading,
      refreshProfile,
      redirectToDashboard: (role) => dashboardPathForRole(role || profile?.role || 'student'),
      completeProfile: async ({ fullName, role, specialty }) => {
        const currentUser = session?.user;
        if (!currentUser) throw new Error('You must be logged in to complete your profile.');

        return createProfile({
          userId: currentUser.id,
          fullName,
          email: currentUser.email || '',
          role,
          specialty,
        });
      },
      signIn: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          logSupabaseError('login', error);
          throw error;
        }
        setSession(data.session);
        if (!data.user) {
          throw new Error('Login succeeded, but no user was returned by Supabase.');
        }
        try {
          return await loadProfile(data.user.id);
        } catch (profileError) {
          logSupabaseError('login.profile.fetch', profileError);
          try {
            return await recoverProfileFromUser(data.user);
          } catch (recoveryError) {
            logSupabaseError('login.profile.recover', recoveryError);
          }
          return null;
        }
      },
      signUp: async ({ email, password, fullName, role, specialty }) => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, role, specialty } },
        });
        if (error) {
          logSupabaseError('signup', error);
          const message = error.message.toLowerCase();
          if (message.includes('already registered') || message.includes('already exists')) {
            throw new Error('This email already exists. Please login instead.');
          }
          throw error;
        }

        if (!data.user) return null;
        setSession(data.session);

        if (!data.session) {
          console.info('Supabase signup requires email confirmation before client-side profile fetch can run.');
          return null;
        }

        return createProfile({
          userId: data.user.id,
          fullName,
          email,
          role,
          specialty,
        });
      },
      signOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
          logSupabaseError('logout', error);
          throw error;
        }
        setSession(null);
        setProfile(null);
      },
    }),
    [createProfile, loadProfile, loading, profile, recoverProfileFromUser, refreshProfile, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
