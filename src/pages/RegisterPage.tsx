import { BookOpen, GraduationCap } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import { useAuth } from '../contexts/AuthContext';
import { dashboardPathForRole, isValidEmail } from '../lib/auth';
import { getErrorMessage } from '../lib/debug';
import { UserRole } from '../types/database';

const roleOptions = [
  {
    option: 'student',
    label: 'Etudiant',
    description: 'Posez vos questions, suivez vos cours et trouvez des profs.',
    icon: GraduationCap,
  },
  {
    option: 'teacher',
    label: 'Prof',
    description: 'Repondez aux questions, developpez votre reputation et proposez vos cours.',
    icon: BookOpen,
  },
] as const;

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
    if (!fullName.trim()) return 'Le nom complet est requis.';
    if (!isValidEmail(email)) return 'Veuillez saisir une adresse email valide.';
    if (password.length < 6) return 'Le mot de passe doit contenir au moins 6 caracteres.';
    if (password !== confirmPassword) return 'Les mots de passe ne correspondent pas.';
    if (!role) return 'Choisissez Etudiant ou Prof.';
    if (role === 'teacher' && !specialty.trim()) return 'La specialite est requise pour les profs.';
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
        setMessage('Compte cree. Verifiez votre email pour confirmer votre compte, puis connectez-vous.');
        return;
      }
      navigate(redirectPath || dashboardPathForRole(createdProfile.role || role), { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Impossible de creer le compte.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <form onSubmit={submit} className="mt-2">
        <h1 className="mt-5 text-3xl font-black tracking-tight text-brand-navy lg:mt-8">Creer un compte</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Rejoignez sosprof.tn selon votre profil.</p>
        {error ? (
          <p role="alert" className="mt-5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
            {message}
          </p>
        ) : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {roleOptions.map(({ option, label, description, icon: Icon }) => (
            <button
              key={option}
              type="button"
              onClick={() => setRole(option)}
              aria-pressed={role === option}
              className={`min-h-[148px] rounded-2xl border p-4 text-left transition ${
                role === option
                  ? 'border-brand-orange bg-orange-50 shadow-[0_16px_40px_rgba(255,138,0,0.14)]'
                  : 'border-brand-border bg-white hover:border-brand-navy/30 hover:bg-slate-50'
              }`}
            >
              <span className={`grid h-10 w-10 place-items-center rounded-xl ${role === option ? 'bg-[#FF8A00] text-white' : 'bg-slate-100 text-brand-navy'}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="mt-4 block font-black text-brand-navy">{label}</span>
              <span className="mt-1 block text-sm leading-5 text-slate-600">{description}</span>
            </button>
          ))}
        </div>

        <label className="mt-6 block text-sm font-bold text-brand-navy">
          Nom complet
          <input
            className="mt-2 h-12 w-full rounded-xl border border-brand-border bg-white px-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-orange focus:ring-4 focus:ring-orange-100"
            autoComplete="name"
            placeholder="Votre nom complet"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
          />
        </label>
        {role === 'teacher' ? (
          <label className="mt-4 block text-sm font-bold text-brand-navy">
            Specialite
            <input
              className="mt-2 h-12 w-full rounded-xl border border-brand-border bg-white px-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-orange focus:ring-4 focus:ring-orange-100"
              placeholder="Ex: Mathematiques, Informatique, Francais..."
              value={specialty}
              onChange={(event) => setSpecialty(event.target.value)}
              required
            />
          </label>
        ) : null}
        <label className="mt-4 block text-sm font-bold text-brand-navy">
          Email
          <input
            className="mt-2 h-12 w-full rounded-xl border border-brand-border bg-white px-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-orange focus:ring-4 focus:ring-orange-100"
            type="email"
            autoComplete="email"
            placeholder="votre@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="mt-4 block text-sm font-bold text-brand-navy">
          Mot de passe
          <input
            className="mt-2 h-12 w-full rounded-xl border border-brand-border bg-white px-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-orange focus:ring-4 focus:ring-orange-100"
            type="password"
            autoComplete="new-password"
            placeholder="Creez un mot de passe"
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        <label className="mt-4 block text-sm font-bold text-brand-navy">
          Confirmer le mot de passe
          <input
            className="mt-2 h-12 w-full rounded-xl border border-brand-border bg-white px-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-orange focus:ring-4 focus:ring-orange-100"
            type="password"
            autoComplete="new-password"
            placeholder="Confirmez votre mot de passe"
            minLength={6}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />
        </label>
        <button
          disabled={loading}
          className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-[#FF8A00] px-4 font-black text-white transition hover:bg-[#F07800] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Creation du compte...' : 'Creer mon compte'}
        </button>
        <p className="mt-6 text-center text-sm text-slate-600">
          Deja inscrit ?{' '}
          <Link
            to={redirectPath ? `/login?redirect=${encodeURIComponent(redirectPath)}` : '/login'}
            className="font-bold text-brand-navy transition hover:text-brand-orange hover:underline"
          >
            Connexion
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
