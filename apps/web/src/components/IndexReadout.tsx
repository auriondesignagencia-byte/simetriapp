import { motion } from 'framer-motion';
import { BAND_COPY, type SymmetryEstimate } from '@simetriapp/shared';
import { Disclaimer } from '@/components/ui/Disclaimer';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';

const bandTone = {
  proxima: 'sage',
  intermediaria: 'amber',
  acentuada: 'terra',
} as const;

/**
 * ÚNICO componente autorizado a imprimir o índice na tela. Ele já traz o
 * disclaimer colado — não existe caminho de código que mostre o número sem o
 * aviso, porque o aviso não é responsabilidade da tela que chama.
 *
 * O número aparece em fonte display e grande porque a mãe VAI olhar para ele
 * de qualquer jeito; fingir que é secundário escondendo-o num canto não protege
 * ninguém — o que protege é o contexto ao redor dele estar certo.
 */
export function IndexReadout({
  estimate,
  size = 'lg',
  className,
}: {
  estimate: SymmetryEstimate;
  size?: 'sm' | 'lg';
  className?: string;
}) {
  const tone = bandTone[estimate.band];
  const copy = BAND_COPY[estimate.band];

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-baseline gap-3">
        <motion.span
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            'font-display tabular-nums leading-none',
            size === 'lg' ? 'text-40' : 'text-24',
            tone === 'sage' && 'text-sage-ink',
            tone === 'amber' && 'text-amber-ink',
            tone === 'terra' && 'text-terra-ink',
          )}
        >
          {estimate.asymmetryIndex.toFixed(1)}
          <span className={cn('font-sans text-muted ml-0.5', size === 'lg' ? 'text-20' : 'text-14')}>
            %
          </span>
        </motion.span>

        <Badge tone={tone}>{copy.label}</Badge>
      </div>

      <p className="text-14 text-muted leading-relaxed">{copy.description}</p>

      {size === 'lg' && (
        <div className="flex gap-4 pt-1">
          <Measure label="Diagonal A" value={estimate.diagonalA} />
          <div className="w-px bg-line" />
          <Measure label="Diagonal B" value={estimate.diagonalB} />
        </div>
      )}

      <Disclaimer level="block" />
    </div>
  );
}

function Measure({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1">
      <p className="text-12 text-muted">{label}</p>
      {/* Valor relativo, não milímetros: a foto não tem escala e fingir que tem
          seria a mentira mais fácil de contar aqui. */}
      <p className="text-16 tabular-nums text-ink">{(value * 100).toFixed(1)}</p>
    </div>
  );
}
