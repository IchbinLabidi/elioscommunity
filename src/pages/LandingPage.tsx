import { ArrowRight, BookOpen, MessageSquare, Star, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LandingPage() {
  const { profile } = useAuth();
  const askQuestionPath = profile ? '/questions/new' : '/login?redirect=/questions/new';

  return (
    <main>
      <section className="bg-elios-navy text-white">
        <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <div>
            <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-elios-yellow">Elios Academy-inspired learning network</span>
            <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-tight tracking-normal sm:text-6xl">Elios Community</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-blue-100">
              Ask better questions, get trusted teacher answers, and discover courses from educators with visible reputation.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/teachers" className="inline-flex items-center gap-2 rounded-full bg-elios-yellow px-5 py-3 font-bold text-elios-navy transition hover:bg-yellow-300">
                Trouver un prof <ArrowRight className="h-5 w-5" />
              </Link>
              <Link to={askQuestionPath} className="rounded-full border border-white/20 bg-white px-5 py-3 font-bold text-elios-navy transition hover:bg-elios-yellow">
                Posez une question
              </Link>
            </div>
          </div>
          <div className="rounded-lg bg-white p-5 text-elios-navy shadow-soft">
            <div className="rounded-lg bg-elios-sky p-5">
              <p className="text-sm font-bold uppercase tracking-wide text-elios-blue">Live learning flow</p>
              <div className="mt-5 space-y-4">
                {[
                  ['Student asks', 'Attach context, pick a subject, and open the question.'],
                  ['Teacher answers', 'Qualified teachers respond and build reputation.'],
                  ['Best answer wins', 'Students mark the most helpful answer and leave a rating.'],
                ].map(([title, text], index) => (
                  <div key={title} className="flex gap-4 rounded-lg bg-white p-4">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-elios-yellow font-bold">{index + 1}</span>
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
            { icon: MessageSquare, title: 'Questions', text: 'Students can ask with images, subjects, status, and answer history.' },
            { icon: Users, title: 'Teachers', text: 'Public profiles show specialties, courses, answers, and approval status.' },
            { icon: Star, title: 'Ratings', text: 'Reviews are tied to real interactions for trustworthy reputation.' },
            { icon: BookOpen, title: 'Courses', text: 'Teachers can promote paid or free courses with links and cover images.' },
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
