import { CheckCircle2, CircleHelp, XCircle } from 'lucide-react';
import { useState } from 'react';
import type { CheckQuestion } from '../../content/lessons/types';

interface KnowledgeCheckProps {
  question: CheckQuestion;
  number: number;
  idPrefix: string;
}

export function KnowledgeCheck({ question, number, idPrefix }: KnowledgeCheckProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const correct = selected === question.answer_index;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-2">
        <CircleHelp size={18} className="mt-0.5 shrink-0 text-indigo-600" aria-hidden="true" />
        <fieldset className="min-w-0 flex-1">
          <legend className="text-sm font-semibold leading-6 text-slate-900">
            Check {number}: {question.question}
          </legend>
          <div className="mt-3 space-y-2">
            {question.options.map((option, index) => {
              const optionId = `${idPrefix}-q${number}-option-${index}`;
              const isChosen = selected === index;
              const isCorrect = index === question.answer_index;
              const showCorrect = submitted && isCorrect;
              const showWrong = submitted && isChosen && !isCorrect;
              return (
                <label
                  key={optionId}
                  htmlFor={optionId}
                  className={[
                    'flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                    showCorrect
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                      : showWrong
                        ? 'border-rose-300 bg-rose-50 text-rose-950'
                        : isChosen
                          ? 'border-indigo-300 bg-indigo-50 text-indigo-950'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                  ].join(' ')}
                >
                  <input
                    id={optionId}
                    type="radio"
                    name={`${idPrefix}-q${number}`}
                    value={index}
                    checked={isChosen}
                    onChange={() => {
                      setSelected(index);
                      setSubmitted(false);
                    }}
                    className="mt-1 h-4 w-4 accent-indigo-600"
                  />
                  <span>{option}</span>
                  {showCorrect ? <CheckCircle2 size={16} className="ml-auto mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" /> : null}
                  {showWrong ? <XCircle size={16} className="ml-auto mt-0.5 shrink-0 text-rose-600" aria-hidden="true" /> : null}
                </label>
              );
            })}
          </div>
        </fieldset>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn-primary px-3 py-1.5 text-xs"
          onClick={() => setSubmitted(true)}
          disabled={selected === null}
        >
          Check answer
        </button>
        {submitted ? (
          <button
            type="button"
            className="btn-ghost px-3 py-1.5 text-xs"
            onClick={() => {
              setSelected(null);
              setSubmitted(false);
            }}
          >
            Try again
          </button>
        ) : null}
      </div>

      {submitted ? (
        <div
          role="status"
          className={[
            'mt-3 rounded-lg border px-3 py-2 text-[13px] leading-5',
            correct ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900',
          ].join(' ')}
        >
          <p className="font-semibold">{correct ? 'Correct.' : 'Not quite.'}</p>
          <p className="mt-1">{question.explanation}</p>
        </div>
      ) : null}
    </div>
  );
}
