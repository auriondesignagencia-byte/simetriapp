import { useMemo, useState } from 'react';
import { Camera, FileText, Layers, Lock, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  ANGLE_LABELS,
  BAND_COPY,
  calculateSymmetry,
  formatDateBR,
  type PhotoEntry,
} from '@simetriapp/shared';
import { Button } from '@/components/ui/Button';
import { Card, CardLabel } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Disclaimer } from '@/components/ui/Disclaimer';
import { Sheet } from '@/components/ui/Sheet';
import { SymmetryChart, toChartPoints } from '@/components/SymmetryChart';
import { GhostCompare } from '@/components/GhostCompare';
import { IndexReadout } from '@/components/IndexReadout';
import { EmptyCurveArt } from '@/components/Illustration';
import { useApp } from '@/store/app';
import { cn } from '@/lib/cn';

export function Evolution() {
  const navigate = useNavigate();
  const { state, derived } = useApp();
  const [selected, setSelected] = useState<PhotoEntry | null>(null);
  const [compare, setCompare] = useState(false);

  const entries = useMemo(
    () => [...state.entries].sort((a, b) => a.weekNumber - b.weekNumber),
    [state.entries],
  );

  const first = entries[0] ?? null;
  const latest = derived.latest;

  const selectedEstimate = useMemo(
    () => (selected ? calculateSymmetry(selected.referencePoints) : null),
    [selected],
  );

  if (entries.length === 0) {
    return (
      <div className="px-5 pt-6 space-y-5">
        <h1 className="text-24">Evolução</h1>
        <Card>
          <div className="my-2">
            <EmptyCurveArt />
          </div>
          <p className="text-14 text-muted leading-relaxed text-center mb-5">
            Nenhum registro ainda. A primeira foto marca o ponto de partida da curva.
          </p>
          <Button fullWidth onClick={() => navigate('/captura')}>
            <Camera size={18} />
            Tirar a primeira foto
          </Button>
        </Card>
      </div>
    );
  }

  const trendTone =
    derived.trend.direction === 'melhora'
      ? 'sage'
      : derived.trend.direction === 'atencao'
        ? 'terra'
        : 'sky';

  const TrendIcon =
    derived.trend.direction === 'melhora'
      ? TrendingDown
      : derived.trend.direction === 'atencao'
        ? TrendingUp
        : Minus;

  return (
    <div className="px-5 pt-6 space-y-5">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-24">Evolução</h1>
          <p className="text-12 text-muted mt-0.5">
            {entries.length} registro{entries.length === 1 ? '' : 's'} · semana{' '}
            {latest?.weekNumber}
          </p>
        </div>
        {latest && (
          <div className="text-right">
            <span className="font-display text-32 leading-none text-ink tabular-nums">
              {latest.asymmetryIndex.toFixed(1)}
            </span>
            <span className="text-14 text-muted ml-1">%</span>
          </div>
        )}
      </header>

      <Card className="!p-0 overflow-hidden">
        <div className="px-3 pt-4 pb-2">
          <SymmetryChart
            points={toChartPoints(entries)}
            variant="full"
            locked={!derived.hasAccess}
            selectedId={selected?.id ?? null}
            onPointTap={(p) => {
              if (!derived.hasAccess) {
                navigate('/paywall?from=evolucao');
                return;
              }
              const entry = entries.find((e) => e.id === p.id);
              if (entry) setSelected(entry);
            }}
          />
        </div>
        <div className="px-5 pb-5">
          <Disclaimer level="block" />
        </div>
      </Card>

      {!derived.hasAccess && (
        <Card tone="amber" interactive onClick={() => navigate('/paywall?from=evolucao')}>
          <div className="flex items-center gap-3">
            <span className="grid place-items-center w-10 h-10 rounded-pill bg-amber/20 text-amber-ink shrink-0">
              <Lock size={17} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-14 font-medium text-amber-ink">Histórico completo é do Premium</p>
              <p className="text-12 text-amber-ink/80 mt-0.5 leading-snug">
                Suas fotos continuam salvas. Toque para reativar o acesso.
              </p>
            </div>
          </div>
        </Card>
      )}

      {entries.length >= 2 && derived.hasAccess && (
        <Card tone={trendTone as 'sage' | 'terra' | 'sky'}>
          <div className="flex items-start gap-3">
            <span
              className={cn(
                'grid place-items-center w-10 h-10 rounded-pill shrink-0',
                trendTone === 'sage' && 'bg-sage/20 text-sage-ink',
                trendTone === 'terra' && 'bg-terra/20 text-terra-ink',
                trendTone === 'sky' && 'bg-sky/25 text-sky-ink',
              )}
            >
              <TrendIcon size={18} />
            </span>
            <div className="flex-1 min-w-0">
              <h2
                className={cn(
                  'text-20',
                  trendTone === 'sage' && 'text-sage-ink',
                  trendTone === 'terra' && 'text-terra-ink',
                  trendTone === 'sky' && 'text-sky-ink',
                )}
              >
                {derived.trend.headline}
              </h2>
              <p
                className={cn(
                  'text-14 leading-relaxed mt-1',
                  trendTone === 'sage' && 'text-sage-ink/80',
                  trendTone === 'terra' && 'text-terra-ink/80',
                  trendTone === 'sky' && 'text-sky-ink/80',
                )}
              >
                {derived.trend.detail}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Projeção de ritmo. O motor já se recusa a projetar em série curta ou
          ruidosa; quando ele recusa, a tela mostra a RECUSA — não esconde o
          card. Sumir com a seção faria a mãe achar que o app quebrou. */}
      {derived.hasAccess && (
        <Card>
          <CardLabel>Ritmo</CardLabel>
          {derived.projection.available ? (
            <>
              <div className="flex items-end gap-2 mt-1.5">
                <span className="font-display text-40 leading-none text-ink tabular-nums">
                  {derived.projection.weeksToTarget}
                </span>
                <span className="text-16 text-muted pb-1">semanas</span>
              </div>
              <p className="text-14 text-muted mt-2 leading-relaxed">{derived.projection.text}</p>
            </>
          ) : (
            <p className="text-14 text-muted mt-2 leading-relaxed">{derived.projection.text}</p>
          )}
        </Card>
      )}

      {/* Antes/depois. Só faz sentido com dois pontos distantes o suficiente —
          comparar a semana 3 com a 4 não mostra nada e frustra. */}
      {derived.hasAccess && first && latest && first.id !== latest.id && (
        <Card className="!p-0 overflow-hidden">
          <button
            onClick={() => setCompare((v) => !v)}
            className="w-full flex items-center gap-3 p-5 text-left"
          >
            <span className="grid place-items-center w-10 h-10 rounded-pill bg-sky-soft text-sky-ink shrink-0">
              <Layers size={17} />
            </span>
            <div className="flex-1 min-w-0">
              <CardLabel>Comparar</CardLabel>
              <p className="text-14 text-ink mt-0.5">
                Semana {first.weekNumber} e semana {latest.weekNumber}
              </p>
            </div>
            <Badge tone="neutral">{compare ? 'Ocultar' : 'Ver'}</Badge>
          </button>

          {compare && (
            <div className="px-5 pb-5">
              <GhostCompare
                previous={first.imageUrl}
                current={latest.imageUrl}
                mode="wipe"
                labels={{
                  before: `Semana ${first.weekNumber}`,
                  after: `Semana ${latest.weekNumber}`,
                }}
              />
              <p className="text-12 text-muted leading-relaxed mt-3">
                O índice saiu de {first.asymmetryIndex.toFixed(1)}% para{' '}
                {latest.asymmetryIndex.toFixed(1)}% entre estas duas fotos. Ângulos de câmera
                diferentes mudam a aparência da imagem — compare os números, não as fotos.
              </p>
            </div>
          )}
        </Card>
      )}

      <section className="space-y-2">
        <CardLabel className="px-1">Registros</CardLabel>
        <ul className="space-y-2">
          {[...entries].reverse().map((entry) => {
            const tone =
              entry.band === 'proxima' ? 'sage' : entry.band === 'intermediaria' ? 'amber' : 'terra';
            return (
              <li key={entry.id}>
                <Card
                  interactive
                  onClick={() =>
                    derived.hasAccess ? setSelected(entry) : navigate('/paywall?from=evolucao')
                  }
                  className="flex items-center gap-3 !p-3"
                >
                  <img
                    src={entry.imageUrl}
                    alt=""
                    className={cn(
                      'w-14 h-14 rounded-lg object-cover bg-raised shrink-0',
                      !derived.hasAccess && 'blur-[6px]',
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-14 font-medium text-ink">Semana {entry.weekNumber}</p>
                    <p className="text-12 text-muted mt-0.5">{formatDateBR(entry.takenAt)}</p>
                    {entry.note && (
                      <p className="text-12 text-muted mt-1 line-clamp-1 italic">{entry.note}</p>
                    )}
                  </div>
                  {derived.hasAccess ? (
                    <Badge tone={tone as 'sage' | 'amber' | 'terra'}>
                      {entry.asymmetryIndex.toFixed(1)}%
                    </Badge>
                  ) : (
                    <Lock size={15} className="text-muted shrink-0 mr-1" />
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      </section>

      <Button
        variant="secondary"
        fullWidth
        onClick={() => navigate(derived.hasAccess ? '/relatorio' : '/paywall?from=relatorio')}
      >
        <FileText size={18} />
        Gerar relatório para o profissional
      </Button>

      <Sheet
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Semana ${selected.weekNumber}` : undefined}
      >
        {selected && selectedEstimate && (
          <div className="space-y-4 pb-3">
            <img
              src={selected.imageUrl}
              alt={`Foto da semana ${selected.weekNumber}`}
              className="w-full aspect-square object-cover rounded-lg bg-raised"
            />

            <p className="text-12 text-muted">{formatDateBR(selected.takenAt)}</p>

            {/* O IndexReadout recalcula a partir dos pontos marcados: o número da
                lista e o número daqui vêm do mesmo lugar, não de um campo copiado. */}
            <IndexReadout estimate={selectedEstimate} size="lg" />

            <div className="rounded-lg bg-raised border border-line/70 px-3.5 py-3">
              <p className="text-12 font-medium text-ink">{BAND_COPY[selected.band].label}</p>
              <p className="text-12 text-muted leading-relaxed mt-1">
                {BAND_COPY[selected.band].description}
              </p>
            </div>

            {/* Ângulos complementares desta semana — registro visual, sem índice. */}
            {selected.angles && selected.angles.length > 0 && (
              <div>
                <CardLabel>Outros ângulos</CardLabel>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {selected.angles.map((a) => (
                    <div key={a.angle} className="rounded-lg overflow-hidden border border-line">
                      <img
                        src={a.imageUrl}
                        alt={ANGLE_LABELS[a.angle]}
                        className="w-full aspect-square object-cover bg-raised"
                      />
                      <p className="text-[10px] text-muted text-center py-1 px-1 leading-tight">
                        {ANGLE_LABELS[a.angle]}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-12 text-muted leading-snug mt-2">
                  Registro visual do formato da cabeça. Só a foto de cima entra no índice.
                </p>
              </div>
            )}

            {selected.note && (
              <div>
                <CardLabel>Sua anotação</CardLabel>
                <p className="text-14 text-ink leading-relaxed mt-1.5 italic">"{selected.note}"</p>
              </div>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}
