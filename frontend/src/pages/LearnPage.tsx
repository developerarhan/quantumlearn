import { ArrowRight, BookOpen, Clock, FlaskConical, GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CircuitPreview } from '../components/circuit/CircuitPreview';
import { PageHeader } from '../components/layout/PageHeader';
import { TryInBuilderButton } from '../components/lessons/TryInBuilderButton';
import { lessons } from '../content/lessons';

export function LearnPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="Learning hub"
        title="Six lessons, one quantum circuit at a time"
        description="Each lesson combines a scientifically careful explanation, a diagram rendered from the same canonical model as the playground, a working sample, and a knowledge check."
        actions={
          <Link to="/playground" className="btn-primary">
            <FlaskConical size={16} aria-hidden="true" /> Open Playground
          </Link>
        }
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="card flex items-center gap-3 p-4">
          <BookOpen size={20} className="text-indigo-600" aria-hidden="true" />
          <div>
            <p className="text-sm font-bold text-slate-900">6 complete lessons</p>
            <p className="text-xs text-slate-500">Theory, example, checks</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <GraduationCap size={20} className="text-indigo-600" aria-hidden="true" />
          <div>
            <p className="text-sm font-bold text-slate-900">Beginner to intermediate</p>
            <p className="text-xs text-slate-500">No prior quantum background</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <Clock size={20} className="text-indigo-600" aria-hidden="true" />
          <div>
            <p className="text-sm font-bold text-slate-900">About 80 minutes</p>
            <p className="text-xs text-slate-500">Read, run, and experiment</p>
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        {lessons.map((lesson, index) => (
          <article key={lesson.slug} className="card grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="badge bg-indigo-600 text-white">{lesson.id}</span>
                <span className="badge bg-slate-100 text-slate-600">{lesson.level}</span>
                <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                  <Clock size={13} aria-hidden="true" /> {lesson.duration_minutes} min
                </span>
                {index === 0 ? <span className="badge bg-emerald-100 text-emerald-800">Start here</span> : null}
              </div>
              <h2 className="mt-3 text-xl font-bold tracking-tight text-slate-900">
                <Link to={`/learn/${lesson.slug}`} className="hover:text-indigo-700">
                  {lesson.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{lesson.summary}</p>
              <ul className="mt-3 grid gap-1.5 text-xs text-slate-600 sm:grid-cols-2">
                {lesson.objectives.slice(0, 4).map((objective) => (
                  <li key={objective} className="flex gap-1.5">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-indigo-400" aria-hidden="true" />
                    {objective}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to={`/learn/${lesson.slug}`} className="btn-primary px-3 py-2 text-xs">
                  Open lesson <ArrowRight size={14} aria-hidden="true" />
                </Link>
                <TryInBuilderButton circuit={lesson.example_circuit} compact label="Try example" />
              </div>
            </div>
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Lesson circuit</p>
              <CircuitPreview circuit={lesson.example_circuit} label={`${lesson.title} example circuit`} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
