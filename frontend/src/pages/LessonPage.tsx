import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Clock, FlaskConical } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { CircuitPreview } from '../components/circuit/CircuitPreview';
import { PageHeader } from '../components/layout/PageHeader';
import { KnowledgeCheck } from '../components/lessons/KnowledgeCheck';
import { LessonSections } from '../components/lessons/LessonBlocks';
import { TryInBuilderButton } from '../components/lessons/TryInBuilderButton';
import { getLesson, getNextLesson, getPreviousLesson, lessons } from '../content/lessons';

export function LessonPage() {
  const { slug = '' } = useParams();
  const lesson = getLesson(slug);

  if (!lesson) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <BookOpen size={40} className="mx-auto text-slate-300" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Lesson not found</h1>
        <p className="mt-2 text-sm text-slate-600">
          The lesson “{slug}” does not exist. Browse the learning path to find a working lesson.
        </p>
        <Link to="/learn" className="btn-primary mt-5">
          Back to lessons
        </Link>
      </div>
    );
  }

  const previous = getPreviousLesson(lesson.slug);
  const next = getNextLesson(lesson.slug);
  const lessonIndex = lessons.findIndex((item) => item.slug === lesson.slug);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-slate-500">
        <Link to="/learn" className="inline-flex items-center gap-1 font-semibold text-indigo-700 hover:text-indigo-900">
          <ArrowLeft size={13} aria-hidden="true" /> All lessons
        </Link>
        <span className="mx-2 text-slate-300">/</span>
        <span>{lesson.id}</span>
      </nav>

      <PageHeader
        eyebrow={`${lesson.id} · ${lesson.level}`}
        title={lesson.title}
        description={lesson.summary}
        actions={
          <>
            <span className="inline-flex items-center gap-1 self-center text-xs text-slate-500">
              <Clock size={14} aria-hidden="true" /> {lesson.duration_minutes} min
            </span>
            <TryInBuilderButton circuit={lesson.example_circuit} />
          </>
        }
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <article className="min-w-0">
          <section className="card mb-6 p-5" aria-labelledby="objectives-title">
            <h2 id="objectives-title" className="text-sm font-bold text-slate-900">
              Learning objectives
            </h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {lesson.objectives.map((objective) => (
                <li key={objective} className="flex gap-2 text-[13px] leading-5 text-slate-700">
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-500" aria-hidden="true" />
                  {objective}
                </li>
              ))}
            </ul>
          </section>

          <LessonSections sections={lesson.sections} />

          <section className="mt-10" aria-labelledby="checks-title">
            <div className="mb-3">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Knowledge checks</p>
              <h2 id="checks-title" className="mt-1 text-lg font-bold text-slate-900">
                Test your understanding
              </h2>
            </div>
            <div className="space-y-3">
              {lesson.check_questions.map((question, index) => (
                <KnowledgeCheck
                  key={`${lesson.slug}-${index}`}
                  question={question}
                  number={index + 1}
                  idPrefix={lesson.slug}
                />
              ))}
            </div>
          </section>

          <nav className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5" aria-label="Lesson navigation">
            {previous ? (
              <Link to={`/learn/${previous.slug}`} className="btn-secondary">
                <ArrowLeft size={15} aria-hidden="true" /> {previous.id}: {previous.title}
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link to={`/learn/${next.slug}`} className="btn-primary">
                Next: {next.title} <ArrowRight size={15} aria-hidden="true" />
              </Link>
            ) : (
              <Link to="/playground" className="btn-primary">
                Open Playground <FlaskConical size={15} aria-hidden="true" />
              </Link>
            )}
          </nav>
        </article>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section className="card p-4" aria-labelledby="example-circuit-title">
            <div className="flex items-center justify-between">
              <h2 id="example-circuit-title" className="text-sm font-bold text-slate-900">
                Lesson circuit
              </h2>
              <span className="badge bg-slate-100 text-slate-500">{lesson.example_circuit.shots} shots</span>
            </div>
            <div className="mt-3">
              <CircuitPreview circuit={lesson.example_circuit} label={`${lesson.title} example circuit`} />
            </div>
            <div className="mt-3">
              <TryInBuilderButton circuit={lesson.example_circuit} className="btn-primary w-full" />
            </div>
            <p className="mt-2 text-center text-[11px] text-slate-500">
              Loads this exact circuit into the canonical builder state.
            </p>
          </section>

          <section className="card p-4" aria-labelledby="expected-title">
            <h2 id="expected-title" className="text-sm font-bold text-slate-900">
              What to expect
            </h2>
            <ul className="mt-2 space-y-2">
              {lesson.expected_behavior.map((item) => (
                <li key={item} className="flex gap-2 text-xs leading-5 text-slate-600">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-indigo-400" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-4" aria-labelledby="prereq-title">
            <h2 id="prereq-title" className="text-sm font-bold text-slate-900">
              Prerequisites
            </h2>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-600">
              {lesson.prerequisites.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </section>

          <section className="card p-4" aria-labelledby="path-title">
            <h2 id="path-title" className="text-sm font-bold text-slate-900">
              Learning path
            </h2>
            <ol className="mt-2 space-y-1">
              {lessons.map((item, index) => (
                <li key={item.slug}>
                  <Link
                    to={`/learn/${item.slug}`}
                    aria-current={item.slug === lesson.slug ? 'page' : undefined}
                    className={[
                      'flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors',
                      item.slug === lesson.slug
                        ? 'bg-indigo-50 font-semibold text-indigo-800'
                        : 'text-slate-600 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    <span className="w-6 shrink-0 font-mono text-[10px] text-slate-400">{item.id}</span>
                    <span className="truncate">{item.title}</span>
                    {index === lessonIndex ? (
                      <span className="ml-auto text-[10px] font-bold uppercase text-indigo-500">Here</span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}
