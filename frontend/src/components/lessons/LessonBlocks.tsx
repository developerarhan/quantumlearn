import { AlertTriangle, Info, KeyRound } from 'lucide-react';
import type { LessonCallout, LessonSection } from '../../content/lessons/types';

const CALLOUT_STYLES = {
  info: { wrapper: 'border-sky-200 bg-sky-50 text-sky-950', icon: Info },
  key: { wrapper: 'border-indigo-200 bg-indigo-50 text-indigo-950', icon: KeyRound },
  warning: { wrapper: 'border-amber-200 bg-amber-50 text-amber-950', icon: AlertTriangle },
} as const;

function Callout({ callout }: { callout: LessonCallout }) {
  const style = CALLOUT_STYLES[callout.tone ?? 'info'];
  const Icon = style.icon;
  return (
    <aside className={`rounded-xl border px-4 py-3 ${style.wrapper}`}>
      <div className="flex items-start gap-2.5">
        <Icon size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
        <div>
          <p className="text-sm font-bold">{callout.title}</p>
          <p className="mt-1 text-[13px] leading-6 opacity-90">{callout.text}</p>
        </div>
      </div>
    </aside>
  );
}

export function LessonSections({ sections }: { sections: LessonSection[] }) {
  return (
    <div className="space-y-8">
      {sections.map((section, index) => (
        <section key={section.heading} aria-labelledby={`section-${index}`}>
          <h2 id={`section-${index}`} className="text-lg font-bold tracking-tight text-slate-900">
            <span className="mr-2 text-sm font-bold text-indigo-500">{String(index + 1).padStart(2, '0')}</span>
            {section.heading}
          </h2>
          <div className="mt-2 space-y-3">
            {section.body.map((paragraph) => (
              <p key={paragraph} className="text-[15px] leading-7 text-slate-700">
                {paragraph}
              </p>
            ))}
          </div>
          {section.equation ? (
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-slate-900 px-4 py-3 text-center">
              <code className="whitespace-pre font-mono text-sm text-indigo-100">{section.equation}</code>
            </div>
          ) : null}
          {section.callout ? (
            <div className="mt-3">
              <Callout callout={section.callout} />
            </div>
          ) : null}
        </section>
      ))}
    </div>
  );
}
