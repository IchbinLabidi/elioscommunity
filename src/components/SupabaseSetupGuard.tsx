import { Database, KeyRound } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

export default function SupabaseSetupGuard({ children }: { children: React.ReactNode }) {
  if (isSupabaseConfigured) return <>{children}</>;

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <section className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-lg bg-elios-sky text-elios-blue">
            <Database className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-elios-navy">Connect Supabase</h1>
            <p className="mt-1 text-sm text-slate-600">The app is ready, but it needs your project keys before it can run.</p>
          </div>
        </div>
        <div className="mt-6 rounded-lg bg-slate-950 p-4 text-sm text-slate-100">
          <p>VITE_SUPABASE_URL=https://your-project.supabase.co</p>
          <p>VITE_SUPABASE_ANON_KEY=your-supabase-anon-key</p>
        </div>
        <div className="mt-5 flex gap-3 rounded-lg bg-yellow-50 p-4 text-sm leading-6 text-elios-navy">
          <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-elios-blue" />
          <p>Create a file named <strong>.env.local</strong> in the project root, paste your Supabase URL and anon public key, then restart the dev server.</p>
        </div>
      </section>
    </main>
  );
}
