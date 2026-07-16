import { motion, type HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'sage' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-amber text-white shadow-rest hover:shadow-lift hover:brightness-[1.04] disabled:bg-amber/40',
  secondary:
    'bg-surface text-ink border border-line hover:bg-raised shadow-rest disabled:text-muted',
  ghost: 'bg-transparent text-muted hover:bg-raised hover:text-ink',
  sage: 'bg-sage text-white shadow-rest hover:shadow-lift hover:brightness-[1.04]',
  // "danger" ainda é terracota, nunca vermelho. O único lugar que ganha vermelho
  // de verdade neste app é a exclusão definitiva de conta — e mesmo lá é discreto.
  danger: 'bg-terra-soft text-terra-ink border border-terra/30 hover:bg-terra/15',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-14 rounded-pill gap-1.5',
  md: 'h-12 px-6 text-16 rounded-pill gap-2',
  lg: 'h-14 px-8 text-16 rounded-pill gap-2.5',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <motion.button
      // 0.97, não 0.9. O toque precisa responder, não quicar — o tom do produto
      // é cuidado, e um botão elástico demais lê como app de jogo.
      whileTap={isDisabled ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      disabled={isDisabled}
      className={cn(
        'inline-flex items-center justify-center font-medium select-none',
        'transition-[background,box-shadow,filter,color] duration-200',
        'disabled:cursor-not-allowed disabled:shadow-none',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </motion.button>
  );
}
