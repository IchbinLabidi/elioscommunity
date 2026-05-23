import { BookOpen, CheckCircle2, MessageSquareText } from 'lucide-react';
import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from '../brand/BrandLogo';

const benefits = [
  { icon: MessageSquareText, label: 'Reponses rapides de professeurs' },
  { icon: BookOpen, label: 'Cours et supports pedagogiques' },
  { icon: CheckCircle2, label: 'Suivi de vos questions et inscriptions' },
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#F7FAFC] px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-7rem)] w-full max-w-7xl overflow-hidden rounded-3xl border border-brand-border bg-white shadow-soft lg:grid-cols-[minmax(0,1fr)_minmax(460px,0.88fr)]">
        <aside className="relative hidden overflow-hidden bg-[#061B3D] px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,138,0,0.22),_transparent_34%),linear-gradient(145deg,_rgba(8,43,102,0.95),_rgba(6,27,61,1))]" />
          <div className="relative">
            <BrandLogo variant="dark" className="mb-14" imageClassName="h-14 w-auto max-w-[250px] object-contain" />
            <p className="inline-flex rounded-full border border-orange-200/20 bg-white/10 px-4 py-2 text-sm font-semibold text-orange-100">
              Plateforme tunisienne de soutien scolaire
            </p>
            <h1 className="mt-6 max-w-xl text-4xl font-black leading-tight tracking-tight text-white">Apprendre devient plus simple</h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-blue-100">
              Posez vos questions, trouvez des profs qualifies et accedez a des cours adaptes a votre niveau.
            </p>
          </div>

          <div className="relative mt-10 space-y-3">
            {benefits.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#FF8A00] text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="font-semibold text-blue-50">{label}</span>
              </div>
            ))}
          </div>
        </aside>

        <section className="flex min-w-0 flex-col justify-center bg-[#F7FAFC] p-4 sm:p-8 lg:p-12">
          <div className="mx-auto w-full max-w-[480px]">
            <div className="mb-4 flex items-center justify-between gap-4 lg:hidden">
              <BrandLogo variant="horizontal" imageClassName="h-11 w-auto max-w-[210px] object-contain" />
              <Link to="/" className="text-sm font-semibold text-brand-navy transition hover:text-brand-orange">
                Accueil
              </Link>
            </div>
            <div className="rounded-3xl border border-brand-border bg-white p-5 shadow-[0_24px_80px_rgba(6,27,61,0.12)] sm:p-8">
              <div className="hidden justify-between gap-4 lg:flex lg:items-start">
                <BrandLogo variant="horizontal" imageClassName="h-12 w-auto max-w-[230px] object-contain" />
                <Link to="/" className="mt-1 text-sm font-semibold text-brand-navy transition hover:text-brand-orange">
                  Retour a l'accueil
                </Link>
              </div>
              {children}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
