import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Sheet } from './Sheet';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const DOW = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

interface DatePickerProps {
  label: string;
  value: string | null;
  onChange: (iso: string) => void;
  /** Data de nascimento nunca é no futuro — o padrão já bloqueia isso. */
  maxDate?: Date;
  minDate?: Date;
  hint?: string;
  error?: string | null;
}

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

function parseLocal(iso: string) {
  // new Date("2025-01-05") é interpretada como UTC e vira dia 4 em GMT-3.
  // Um bebê nascido dia 5 apareceria como nascido dia 4 na tela da mãe.
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function DatePicker({
  label,
  value,
  onChange,
  maxDate = new Date(),
  minDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 365 * 5),
  hint,
  error,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = value ? parseLocal(value) : null;
  const [cursor, setCursor] = useState(() => selected ?? new Date());

  const grid = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const lead = first.getDay();
    const cells: (Date | null)[] = Array(lead).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    }
    return cells;
  }, [cursor]);

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const isDisabled = (d: Date) =>
    startOfDay(d) > startOfDay(maxDate) || startOfDay(d) < startOfDay(minDate);

  const canPrev = new Date(cursor.getFullYear(), cursor.getMonth(), 0) >= startOfDay(minDate);
  const canNext = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1) <= startOfDay(maxDate);

  const display = selected
    ? selected.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="space-y-1.5">
      <label className="block text-14 font-medium text-ink">{label}</label>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'w-full h-12 px-4 rounded-lg bg-surface border text-left',
          'flex items-center justify-between gap-3 transition-colors duration-200',
          error ? 'border-terra/50' : 'border-line hover:border-amber/40',
        )}
      >
        <span className={cn('text-16', display ? 'text-ink' : 'text-muted/70')}>
          {display ?? 'Escolher data'}
        </span>
        <CalendarDays size={18} className="text-muted shrink-0" />
      </button>

      <AnimatePresence mode="wait" initial={false}>
        {error ? (
          <motion.p
            key="e"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-12 text-terra-ink"
          >
            {error}
          </motion.p>
        ) : hint ? (
          <p className="text-12 text-muted">{hint}</p>
        ) : null}
      </AnimatePresence>

      <Sheet open={open} onClose={() => setOpen(false)} title={label}>
        <div className="pb-4">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              disabled={!canPrev}
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              aria-label="Mês anterior"
              className="p-2 rounded-pill text-muted hover:bg-raised hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronLeft size={18} />
            </button>

            <p className="text-16 font-medium">
              {MONTHS[cursor.getMonth()]} <span className="text-muted">{cursor.getFullYear()}</span>
            </p>

            <button
              type="button"
              disabled={!canNext}
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              aria-label="Próximo mês"
              className="p-2 rounded-pill text-muted hover:bg-raised hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {DOW.map((d, i) => (
              <div key={i} className="text-12 text-muted text-center py-1 font-medium">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {grid.map((d, i) => {
              if (!d) return <div key={i} />;
              const disabled = isDisabled(d);
              const isSel = selected && toISO(d) === toISO(selected);
              return (
                <motion.button
                  key={i}
                  type="button"
                  whileTap={disabled ? undefined : { scale: 0.9 }}
                  disabled={disabled}
                  onClick={() => {
                    onChange(toISO(d));
                    setOpen(false);
                  }}
                  className={cn(
                    'aspect-square rounded-lg text-14 transition-colors duration-150',
                    isSel
                      ? 'bg-amber text-white font-medium shadow-rest'
                      : disabled
                        ? 'text-muted/30 cursor-not-allowed'
                        : 'text-ink hover:bg-amber-soft',
                  )}
                >
                  {d.getDate()}
                </motion.button>
              );
            })}
          </div>
        </div>
      </Sheet>
    </div>
  );
}
