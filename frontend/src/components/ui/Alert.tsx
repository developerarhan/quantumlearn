import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import type { ReactNode } from 'react';

type Tone = 'error' | 'success' | 'info' | 'warning';

const TONES: Record<Tone, { wrapper: string; icon: typeof Info }> = {
  error: { wrapper: 'border-rose-200 bg-rose-50 text-rose-900', icon: AlertCircle },
  success: { wrapper: 'border-emerald-200 bg-emerald-50 text-emerald-900', icon: CheckCircle2 },
  info: { wrapper: 'border-indigo-200 bg-indigo-50 text-indigo-900', icon: Info },
  warning: { wrapper: 'border-amber-200 bg-amber-50 text-amber-900', icon: TriangleAlert },
};

interface AlertProps {
  tone?: Tone;
  title: string;
  children?: ReactNode;
  onDismiss?: () => void;
}

export function Alert({ tone = 'info', title, children, onDismiss }: AlertProps) {
  const { wrapper, icon: Icon } = TONES[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-xl border px-4 py-3 text-sm ${wrapper}`}>
      <div className="flex items-start gap-3">
        <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{title}</p>
          {children ? <div className="mt-1 text-[13px] leading-5 opacity-90">{children}</div> : null}
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded p-1 opacity-60 hover:bg-white/60 hover:opacity-100"
            aria-label="Dismiss message"
          >
            <X size={15} aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
