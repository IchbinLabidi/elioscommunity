import { FormEvent, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dashboardPathForRole, isValidEmail } from '../lib/auth';

export default function LoginPage() {
  const { signIn, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const routeError = (location.state as { error?: string } | null)?.error;
  const redirectPath = new URLSearchParams(location.search).get('redirect');

  useEffect(() => {
    if (!authLoading && profile) {
      navigate(redirectPath || dashboardPathForRole(profile.role), { replace: true });
    }
  }, [authLoading, navigate, profile, redirectPath]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      setSubmitting(false);
      return;
    }
    if (!password) {
      setError('Password is required.');
      setSubmitting(false);
      return;
    }
    try {
      const signedInProfile = await signIn(email, password);
      const from = redirectPath || (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      if (!signedInProfile) {
        navigate('/complete-profile', { replace: true });
        return;
      }
      navigate(from || dashboardPathForRole(signedInProfile.role || profile?.role || 'student'), { replace: true });
    } catch {
      setError('Unable to log in. Check your email and password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-[calc(100vh-4rem)] place-items-center px-4 py-10">
      <form onSubmit={submit} className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
        <h1 className="text-2xl font-bold text-elios-navy">Welcome back</h1>
        <p className="mt-2 text-sm text-slate-600">Log in to continue learning or teaching.</p>
        {routeError || error ? (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error || routeError}</p>
        ) : null}
        <label className="mt-5 block text-sm font-semibold text-elios-navy">
          Email
          <input className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 outline-none focus:border-elios-blue focus:ring-4 focus:ring-elios-sky" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label className="mt-4 block text-sm font-semibold text-elios-navy">
          Password
          <input className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 outline-none focus:border-elios-blue focus:ring-4 focus:ring-elios-sky" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        <button disabled={submitting} className="mt-6 w-full rounded-lg bg-elios-navy px-4 py-3 font-bold text-white disabled:opacity-60">
          {submitting ? 'Logging in...' : 'Login'}
        </button>
        <p className="mt-4 text-center text-sm text-slate-600">
          New here? <Link to="/register" className="font-bold text-elios-blue">Create an account</Link>
        </p>
      </form>
    </main>
  );
}
