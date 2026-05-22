import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dashboardPathForRole, isValidEmail } from '../lib/auth';
import { getErrorMessage } from '../lib/debug';
import { UserRole } from '../types/database';

export default function RegisterPage() {
  const { signUp, profile, session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedRole = searchParams.get('role');
  const redirectPath = searchParams.get('redirect');
  const queryRole = requestedRole === 'teacher' || requestedRole === 'student' ? requestedRole : 'student';
  const [role, setRole] = useState<Exclude<UserRole, 'admin'>>(queryRole);
  const [fullName, setFullName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && profile) {
      navigate(dashboardPathForRole(profile.role), { replace: true });
    }
  }, [authLoading, navigate, profile]);

  useEffect(() => {
    setRole(queryRole);
  }, [queryRole]);

  const validate = () => {
    if (!fullName.trim()) return 'Full name is required.';
    if (!isValidEmail(email)) return 'Enter a valid email address.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    if (!role) return 'Choose Student or Teacher.';
    if (role === 'teacher' && !specialty.trim()) return 'Specialty is required for teachers.';
    return '';
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const createdProfile = await signUp({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        role,
        specialty: specialty.trim(),
      });
      if (!createdProfile) {
        if (session) {
          navigate('/complete-profile', { replace: true });
          return;
        }
        setMessage('Account created. Check your email to confirm your account, then log in.');
        return;
      }
      navigate(redirectPath || dashboardPathForRole(createdProfile?.role || role), { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to create account.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-[calc(100vh-4rem)] place-items-center px-4 py-10">
      <form onSubmit={submit} className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
        <h1 className="text-2xl font-bold text-elios-navy">Create your Elios account</h1>
        <p className="mt-2 text-sm text-slate-600">Choose how you want to participate.</p>
        {error ? <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        {message ? <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}
        <div className="mt-5 grid grid-cols-2 gap-3">
          {(['student', 'teacher'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setRole(option)}
              className={`rounded-lg border px-4 py-3 text-sm font-bold capitalize ${role === option ? 'border-elios-yellow bg-yellow-50 text-elios-navy' : 'border-slate-200 text-slate-600'}`}
            >
              {option}
            </button>
          ))}
        </div>
        <label className="mt-5 block text-sm font-semibold text-elios-navy">
          Full name
          <input className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 outline-none focus:border-elios-blue focus:ring-4 focus:ring-elios-sky" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
        </label>
        {role === 'teacher' ? (
          <label className="mt-4 block text-sm font-semibold text-elios-navy">
            Specialty
            <input className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 outline-none focus:border-elios-blue focus:ring-4 focus:ring-elios-sky" value={specialty} onChange={(event) => setSpecialty(event.target.value)} required />
          </label>
        ) : null}
        <label className="mt-4 block text-sm font-semibold text-elios-navy">
          Email
          <input className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 outline-none focus:border-elios-blue focus:ring-4 focus:ring-elios-sky" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label className="mt-4 block text-sm font-semibold text-elios-navy">
          Password
          <input className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 outline-none focus:border-elios-blue focus:ring-4 focus:ring-elios-sky" type="password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        <label className="mt-4 block text-sm font-semibold text-elios-navy">
          Confirm password
          <input className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 outline-none focus:border-elios-blue focus:ring-4 focus:ring-elios-sky" type="password" minLength={6} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
        </label>
        <button disabled={loading} className="mt-6 w-full rounded-lg bg-elios-navy px-4 py-3 font-bold text-white disabled:opacity-60">
          {loading ? 'Creating account...' : 'Register'}
        </button>
        <p className="mt-4 text-center text-sm text-slate-600">
          Already registered? <Link to="/login" className="font-bold text-elios-blue">Login</Link>
        </p>
      </form>
    </main>
  );
}
