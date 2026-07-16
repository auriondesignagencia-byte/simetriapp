import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

type Tone = 'plain' | 'amber' | 'sage' | 'terra' | 'sky';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
  /** Só quando o card é realmente clicável — vira <button> semanticamente. */
  interactive?: boolean;
  elevation?: 'rest' | 'lift' | 'float';
  children: React.ReactNode;
}

/**
 * O briefing proíbe faixas/barras de cor decorativas na borda. A diferenciação
 * de card, então, vem de TONALIDADE DE FUNDO + sombra — nunca de um accent bar.
 */
const tones: Record<Tone, string> = {
  plain: 'bg-surface border-line/60',
  amber: 'bg-amber-soft border-amber/20',
  sage: 'bg-sage-soft border-sage/20',
  terra: 'bg-terra-soft border-terra/20',
  sky: 'bg-sky-soft border-sky/25',
};

export function Card({
  tone = 'plain',
  interactive = false,
  elevation = 'rest',
  className,
  children,
  ...props
}: CardProps) {
  const Comp = interactive ? motion.button : motion.div;

  return (
    <Comp
      whileTap={interactive ? { scale: 0.985 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className={cn(
        'rounded-card border p-5',
        tones[tone],
        elevation === 'rest' && 'shadow-rest',
        elevation === 'lift' && 'shadow-lift',
        elevation === 'float' && 'shadow-float',
        interactive &&
          'w-full text-left cursor-pointer transition-shadow duration-200 hover:shadow-lift',
        className,
      )}
      {...(props as any)}
    >
      {children}
    </Comp>
  );
}

export function CardLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('text-12 font-medium uppercase tracking-[0.08em] text-muted', className)}>
      {children}
    </p>
  );
}
