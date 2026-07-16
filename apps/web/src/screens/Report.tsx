import { useEffect, useMemo } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  BAND_COPY,
  DISCLAIMER_INDEX,
  babyAge,
  DIAGNOSTICO_LABELS,
  formatDateBR,
} from '@simetriapp/shared';
import { Button } from '@/components/ui/Button';
import { SymmetryChart, toChartPoints } from '@/components/SymmetryChart';
import { useApp } from '@/store/app';

/**
 * Documento, não tela. É a única superfície do app pensada para sair da tela e
 * chegar impressa na mão de uma fisioterapeuta — por isso ignora o shell mobile,
 * usa largura de papel e não tem nenhum elemento interativo dentro da folha.
 */
export function Report() {
  const navigate = useNavigate();
  const { state, derived, track } = useApp();

  const entries = useMemo(
    () => [...state.entries].sort((a, b) => a.weekNumber - b.weekNumber),
    [state.entries],
  );

  const { baby, user, professional, treatmentStart } = state;

  useEffect(() => {
    track('relatorio_exportado');
  }, [track]);

  if (!baby || !treatmentStart) return null;

  const age = babyAge(baby.birthDate);
  const first = entries[0] ?? null;
  const last = entries[entries.length - 1] ?? null;
  const delta = first && last ? last.asymmetryIndex - first.asymmetryIndex : 0;

  return (
    <div className="min-h-dvh bg-raised">
      <header className="no-print sticky top-0 z-10 glass px-5 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Voltar"
          className="p-2 -ml-2 rounded-pill text-muted hover:bg-surface hover:text-ink transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <span className="flex-1 text-14 font-medium text-ink">Relatório</span>
        <Button size="sm" onClick={() => window.print()}>
          <Printer size={15} />
          Imprimir
        </Button>
      </header>

      <div className="px-4 py-5">
        <article className="print-sheet mx-auto max-w-[760px] bg-surface rounded-card shadow-rest border border-line/60 p-8 sm:p-10 space-y-8">
          <header className="flex items-start justify-between gap-6 pb-6 border-b border-line">
            <div>
              <p className="font-display text-20 text-ink">Simetriapp</p>
              <p className="text-12 text-muted mt-0.5">
                Acompanhamento visual de simetria craniana
              </p>
            </div>
            <p className="text-12 text-muted text-right">
              Emitido em
              <br />
              {formatDateBR(new Date())}
            </p>
          </header>

          <section className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            <div>
              <p className="text-12 uppercase tracking-[0.08em] text-muted">Bebê</p>
              <p className="text-16 text-ink mt-1">{baby.name}</p>
              <p className="text-12 text-muted">{age.label}</p>
            </div>
            <div>
              <p className="text-12 uppercase tracking-[0.08em] text-muted">Responsável</p>
              <p className="text-16 text-ink mt-1">{user?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-12 uppercase tracking-[0.08em] text-muted">Registro clínico</p>
              <p className="text-16 text-ink mt-1">{DIAGNOSTICO_LABELS[baby.diagnosis]}</p>
              <p className="text-12 text-muted">informado pela família</p>
            </div>
            <div>
              <p className="text-12 uppercase tracking-[0.08em] text-muted">Profissional</p>
              <p className="text-16 text-ink mt-1">{professional?.name ?? 'Não vinculado'}</p>
              {professional && <p className="text-12 text-muted">{professional.clinicName}</p>}
            </div>
          </section>

          <section>
            <h2 className="text-20 mb-1">Série de acompanhamento</h2>
            <p className="text-12 text-muted mb-4">
              {entries.length} registro{entries.length === 1 ? '' : 's'} entre{' '}
              {first ? formatDateBR(first.takenAt) : '—'} e {last ? formatDateBR(last.takenAt) : '—'}
              {first && last && entries.length >= 2 && (
                <>
                  {' '}
                  · variação de {delta > 0 ? '+' : ''}
                  {delta.toFixed(1)} ponto{Math.abs(delta) === 1 ? '' : 's'} percentuais no período
                </>
              )}
            </p>

            {entries.length >= 2 ? (
              <div className="rounded-lg border border-line/70 bg-canvas p-3">
                <SymmetryChart points={toChartPoints(entries)} variant="full" />
              </div>
            ) : (
              <p className="text-14 text-muted">
                Registros insuficientes para traçar a curva. São necessários pelo menos dois.
              </p>
            )}
          </section>

          {entries.length >= 2 && (
            <section>
              <h2 className="text-20 mb-1">Leitura da série</h2>
              <p className="text-14 text-ink leading-relaxed">
                <strong className="font-medium">{derived.trend.headline}.</strong>{' '}
                {derived.trend.detail}
              </p>
              {derived.projection.available && (
                <p className="text-14 text-muted leading-relaxed mt-2">{derived.projection.text}</p>
              )}
            </section>
          )}

          <section>
            <h2 className="text-20 mb-3">Registros</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-14 border-collapse">
                <thead>
                  <tr className="text-left text-12 uppercase tracking-[0.08em] text-muted">
                    <th className="py-2 pr-3 font-medium border-b border-line">Semana</th>
                    <th className="py-2 pr-3 font-medium border-b border-line">Data</th>
                    <th className="py-2 pr-3 font-medium border-b border-line tabular-nums">
                      Índice
                    </th>
                    <th className="py-2 pr-3 font-medium border-b border-line tabular-nums">
                      Larg./Compr.
                    </th>
                    <th className="py-2 font-medium border-b border-line">Leitura</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id} className="align-top">
                      <td className="py-2.5 pr-3 border-b border-line/60 text-ink tabular-nums">
                        {e.weekNumber}
                      </td>
                      <td className="py-2.5 pr-3 border-b border-line/60 text-muted whitespace-nowrap">
                        {formatDateBR(e.takenAt)}
                      </td>
                      <td className="py-2.5 pr-3 border-b border-line/60 text-ink tabular-nums font-medium">
                        {e.asymmetryIndex.toFixed(1)}%
                      </td>
                      <td className="py-2.5 pr-3 border-b border-line/60 text-muted tabular-nums">
                        {e.widthLengthRatio.toFixed(1)}%
                      </td>
                      <td className="py-2.5 border-b border-line/60 text-muted">
                        {BAND_COPY[e.band].label}
                        {e.note && (
                          <span className="block text-12 italic mt-0.5">"{e.note}"</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* O aviso não é rodapé decorativo: é o que impede este PDF de circular
              como se fosse laudo. Fica dentro da folha, e imprime junto. */}
          <section className="rounded-lg border border-sky/40 bg-sky-soft p-4">
            <p className="text-12 font-medium text-sky-ink uppercase tracking-[0.08em]">
              Sobre estes números
            </p>
            <p className="text-14 text-sky-ink leading-relaxed mt-2">{DISCLAIMER_INDEX}</p>
            <p className="text-14 text-sky-ink/90 leading-relaxed mt-2">
              O índice é a diferença percentual entre as duas diagonais craniométricas, calculada a
              partir de quatro pontos marcados manualmente sobre uma foto 2D pela própria família.
              Serve para observar a direção da mudança ao longo das semanas — não para determinar
              grau, gravidade ou conduta. Toda decisão clínica permanece com o profissional.
            </p>
          </section>

          <footer className="text-12 text-muted pt-2">
            Gerado pelo Simetriapp em {formatDateBR(new Date())} · dados fornecidos por{' '}
            {user?.name ?? 'responsável'} · início do acompanhamento em{' '}
            {formatDateBR(treatmentStart)}
          </footer>
        </article>
      </div>
    </div>
  );
}
