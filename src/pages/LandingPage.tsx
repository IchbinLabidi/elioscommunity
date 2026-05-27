import { ArrowRight, BookOpen, MessageSquare, Star, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import BrandWordmark from '../components/brand/BrandWordmark';
import { useAuth } from '../contexts/AuthContext';

export default function LandingPage() {
  const { profile } = useAuth();
  const askQuestionPath = profile ? '/questions/new' : '/register?role=student&redirect=/questions/new';

  return (
    <main>
      <section className="bg-elios-navy text-white">
        <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <div>
            <div className="flex w-fit max-w-full flex-col items-start">
              <h1>
                <BrandWordmark size="lg" variant="light" showIcon={false} />
              </h1>
              <span className="mt-3 inline-flex w-fit max-w-full self-end rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-orange-200 sm:translate-x-20 sm:text-xs lg:translate-x-40">
                Plateforme tunisienne de soutien scolaire
              </span>
            </div>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-blue-100 sm:text-xl">
              Posez vos questions, recevez des réponses rapides de professeurs qualifiés, et accédez à des cours adaptés à votre niveau.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/teachers" className="inline-flex items-center gap-2 rounded-full bg-[#FF8A00] px-5 py-3 font-bold text-white transition hover:bg-[#F07800]">
                Trouver un prof <ArrowRight className="h-5 w-5" />
              </Link>
              <Link to={askQuestionPath} className="rounded-full border border-white/20 bg-white px-5 py-3 font-bold text-elios-navy transition hover:bg-orange-50">
                Posez une question
              </Link>
            </div>
          </div>
          <div className="rounded-lg bg-white p-5 text-elios-navy shadow-soft">
            <div className="rounded-lg bg-elios-sky p-5">
              <p className="text-sm font-bold uppercase tracking-wide text-elios-blue">Comment ça marche ?</p>
              <div className="mt-5 space-y-4">
                {[
                  ["L'étudiant pose une question", 'Ajoutez le contexte, choisissez la matière, et publiez votre question.'],
                  ['Un prof répond', 'Des professeurs qualifiés vous aident avec une réponse claire.'],
                  ['La meilleure réponse est validée', "L'étudiant choisit la réponse la plus utile et peut noter le professeur."],
                ].map(([title, text], index) => (
                  <div key={title} className="flex gap-4 rounded-lg bg-white p-4">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#FF8A00] font-bold text-white">{index + 1}</span>
                    <div>
                      <p className="font-bold">{title}</p>
                      <p className="text-sm leading-6 text-slate-600">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="bg-white py-14">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          {[
            { icon: MessageSquare, title: 'Questions', text: 'Les étudiants ajoutent leur contexte, leur matière et leurs images.' },
            { icon: Users, title: 'Profs', text: 'Les profils publics montrent spécialités, cours, réponses et réputation.' },
            { icon: Star, title: 'Avis', text: 'Les notes liées aux échanges rendent la confiance plus visible.' },
            { icon: BookOpen, title: 'Cours', text: 'Les professeurs proposent des cours gratuits ou payants adaptés.' },
          ].map((feature) => (
            <div key={feature.title} className="rounded-lg border border-slate-200 p-5">
              <feature.icon className="h-8 w-8 text-elios-blue" />
              <h2 className="mt-4 font-bold text-elios-navy">{feature.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{feature.text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
