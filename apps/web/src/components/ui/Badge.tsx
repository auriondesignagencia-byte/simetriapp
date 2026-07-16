import { cn } from '@/lib/cn';

type Tone = 'neutral' | 'amber' | 'sage' | 'terra' | 'sky';

const tones: Record<Tone, string> = {
  neutral: 'bg-raised text-muted border-line',
  amber: 'bg-amber-soft text-amber-ink border-amber/25',
  sage: 'bg-sage-soft text-sage-ink border-sage/25',
  terra: 'bg-terra-soft text-terra-ink border-terra/25',
  sky: 'bg-sky-soft text-sky-ink border-sky/30',
};

export function Badge({
  tone = 'neutral',
  icon,
  children,
  className,
}: {
  tone?: Tone;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1',
        'text-12 font-medium whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/** Barra de progresso do onboarding e das trilhas de conteúdo. */
export function ProgressBar({
  value,
  max = 100,
  tone = 'amber',
  className,
}: {
  value: number;
  max?: number;
  tone?: 'amber' | 'sage';
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-1.5 w-full rounded-pill bg-line/70 overflow-hidden', className)}
    >
      <div
        className={cn(
          'h-full rounded-pill transition-[width] duration-500 ease-out',
          tone === 'amber' ? 'bg-amber' : 'bg-sage',
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
