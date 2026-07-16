import { motion } from 'framer-motion';
import { Card, CardLabel } from '@/components/ui/Card';

/**
 * Streak como um FIO com contas — não um emoji de fogo.
 *
 * A diferença não é estética. Um contador de fogo diz "não quebre a sequência",
 * e a mãe que perdeu uma semana porque o bebê estava internado não precisa de um
 * app cobrando ela. Um fio com contas diz "olha o que vocês já construíram" —
 * mesmo raciocínio, sem culpa. Por isso o texto celebra o TOTAL acumulado, e a
 * sequência atual é só o destaque visual das últimas contas.
 */
export function StreakThread({ streak, total }: { streak: number; total: number }) {
  if (total === 0) return null;

  const beads = Math.min(12, Math.max(total, streak));
  const filledFrom = beads - streak;

  return (
    <Card className="flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <CardLabel>Sua constância</CardLabel>
        <p className="text-16 text-ink mt-1 leading-snug">
          {streak >= 2 ? (
            <>
              <span className="font-display text-20">{streak} semanas</span> seguidas registrando
            </>
          ) : (
            <>
              <span className="font-display text-20">{total}</span> registro
              {total === 1 ? '' : 's'} até aqui
            </>
          )}
        </p>
      </div>

      <svg
        viewBox={`0 0 ${beads * 14} 24`}
        className="h-6 shrink-0"
        style={{ width: beads * 14 }}
        role="img"
        aria-label={`${streak} semanas consecutivas de ${total} registros`}
      >
        <line
          x1="7"
          y1="12"
          x2={beads * 14 - 7}
          y2="12"
          stroke="rgb(var(--line))"
          strokeWidth="1.5"
        />
        {Array.from({ length: beads }).map((_, i) => {
          const active = i >= filledFrom;
          return (
            <motion.circle
              key={i}
              cx={7 + i * 14}
              cy="12"
              r={active ? 4.5 : 3}
              fill={active ? 'rgb(var(--amber))' : 'rgb(var(--line))'}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                delay: 0.05 * i,
                type: 'spring',
                stiffness: 420,
                damping: 20,
              }}
              style={{ transformOrigin: `${7 + i * 14}px 12px` }}
            />
          );
        })}
      </svg>
    </Card>
  );
}
