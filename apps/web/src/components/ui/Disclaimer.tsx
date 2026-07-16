import { Info } from 'lucide-react';
import { DISCLAIMER_INDEX, DISCLAIMER_SHORT } from '@simetriapp/shared';
import { cn } from '@/lib/cn';

/**
 * A regra do produto é: nenhum número de simetria aparece sem esta frase por
 * perto. Para tornar isso difícil de violar por acidente, o componente que
 * mostra o índice (<IndexReadout>) já RENDERIZA este disclaimer internamente —
 * não é algo que a tela precise lembrar de adicionar.
 *
 * Se um dia alguém quiser mostrar o índice sem o aviso, vai ter que apagar
 * código de propósito. Essa fricção é o ponto.
 */

type Level = 'inline' | 'block' | 'strong';

export function Disclaimer({
  level = 'inline',
  className,
  text,
}: {
  level?: Level;
  className?: string;
  text?: string;
}) {
  const copy = text ?? (level === 'inline' ? DISCLAIMER_SHORT : DISCLAIMER_INDEX);

  if (level === 'inline') {
    return (
      <p className={cn('flex items-start gap-1.5 text-12 text-muted leading-snug', className)}>
        <Info size={13} className="mt-0.5 shrink-0 opacity-70" aria-hidden />
        <span>{copy}</span>
      </p>
    );
  }

  return (
    <div
      role="note"
      className={cn(
        'flex items-start gap-2.5 rounded-lg px-3.5 py-3',
        level === 'strong'
          ? 'bg-sky-soft border border-sky/30'
          : 'bg-raised border border-line/70',
        className,
      )}
    >
      <Info
        size={15}
        className={cn('mt-0.5 shrink-0', level === 'strong' ? 'text-sky-ink' : 'text-muted')}
        aria-hidden
      />
      <p
        className={cn(
          'text-12 leading-relaxed',
          level === 'strong' ? 'text-sky-ink' : 'text-muted',
        )}
      >
        {copy}
      </p>
    </div>
  );
}
