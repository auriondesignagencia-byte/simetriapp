import { useId, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/cn';

interface FieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string;
  hint?: string;
  error?: string | null;
  /** Marca visual de "validado com sucesso" — usada no código do profissional. */
  valid?: boolean;
  suffix?: React.ReactNode;
}

export function Field({
  label,
  hint,
  error,
  valid,
  suffix,
  className,
  type,
  ...props
}: FieldProps) {
  const id = useId();
  const [reveal, setReveal] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && reveal ? 'text' : type;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-14 font-medium text-ink">
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          type={inputType}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
          className={cn(
            'w-full h-12 px-4 rounded-lg bg-surface text-16 text-ink placeholder:text-muted/70',
            'border transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            error
              ? 'border-terra/50 focus:ring-terra/40'
              : valid
                ? 'border-sage/50 focus:ring-sage/40'
                : 'border-line focus:border-amber/50 focus:ring-amber/30',
            (isPassword || suffix || valid) && 'pr-12',
            className,
          )}
          {...props}
        />

        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {valid && !isPassword && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 24 }}
              className="grid place-items-center w-6 h-6 rounded-pill bg-sage/15 text-sage-ink"
            >
              <Check size={14} strokeWidth={3} />
            </motion.span>
          )}
          {suffix}
          {isPassword && (
            <button
              type="button"
              onClick={() => setReveal((v) => !v)}
              aria-label={reveal ? 'Ocultar senha' : 'Mostrar senha'}
              className="p-1 text-muted hover:text-ink transition-colors"
            >
              {reveal ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {error ? (
          <motion.p
            key="err"
            id={`${id}-err`}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="text-12 text-terra-ink"
          >
            {error}
          </motion.p>
        ) : hint ? (
          <p key="hint" id={`${id}-hint`} className="text-12 text-muted">
            {hint}
          </p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

interface ChoiceProps<T extends string> {
  label: string;
  value: T | null;
  onChange: (v: T) => void;
  options: { value: T; label: string; description?: string }[];
  columns?: 1 | 2 | 3;
}

/** Grupo de escolha com cara de card, não de radio button de formulário. */
export function ChoiceGroup<T extends string>({
  label,
  value,
  onChange,
  options,
  columns = 2,
}: ChoiceProps<T>) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-14 font-medium text-ink mb-2">{label}</legend>
      <div
        className={cn(
          'grid gap-2',
          columns === 1 && 'grid-cols-1',
          columns === 2 && 'grid-cols-2',
          columns === 3 && 'grid-cols-3',
        )}
      >
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <motion.button
              key={opt.value}
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => onChange(opt.value)}
              aria-pressed={active}
              className={cn(
                'rounded-lg border px-4 py-3 text-left transition-all duration-200',
                active
                  ? 'border-amber/60 bg-amber-soft shadow-rest'
                  : 'border-line bg-surface hover:border-line hover:bg-raised',
              )}
            >
              <span
                className={cn(
                  'block text-14 font-medium',
                  active ? 'text-amber-ink' : 'text-ink',
                )}
              >
                {opt.label}
              </span>
              {opt.description && (
                <span className="block text-12 text-muted mt-0.5">{opt.description}</span>
              )}
            </motion.button>
          );
        })}
      </div>
    </fieldset>
  );
}

interface SwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, description, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'w-full flex items-center gap-4 text-left disabled:opacity-50',
        'disabled:cursor-not-allowed',
      )}
    >
      <span className="flex-1 min-w-0">
        <span className="block text-14 font-medium text-ink">{label}</span>
        {description && <span className="block text-12 text-muted mt-0.5">{description}</span>}
      </span>

      <span
        className={cn(
          'relative shrink-0 w-12 h-7 rounded-pill transition-colors duration-200',
          checked ? 'bg-sage' : 'bg-line',
        )}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 600, damping: 34 }}
          className={cn(
            'absolute top-1 w-5 h-5 rounded-pill bg-white shadow-rest',
            checked ? 'right-1' : 'left-1',
          )}
        />
      </span>
    </button>
  );
}
