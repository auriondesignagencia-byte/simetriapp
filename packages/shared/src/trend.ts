/**
 * Leitura de tendência a partir da série de índices.
 *
 * REGRA DE COPY, não de código: nada aqui pode soar diagnóstico. O app relata o
 * que os NÚMEROS DELE fizeram ("a diferença entre as diagonais diminuiu"), nunca
 * o que o BEBÊ tem ou terá. A diferença é a linha que separa acompanhamento de
 * exercício ilegal da medicina.
 */

import { round1, round2 } from './utils.js';

export type TrendDirection = 'melhora' | 'estavel' | 'sem_mudanca' | 'atencao' | 'insuficiente';

export interface TrendReading {
  direction: TrendDirection;
  /** Frase curta para cards e badges. */
  headline: string;
  /** Frase de apoio, um nível mais explicativa. */
  detail: string;
  /** Variação absoluta no período analisado (pontos percentuais). */
  delta: number;
  /** Quantas semanas entraram na conta. */
  windowWeeks: number;
  /** Inclinação por semana (pp/semana). Negativo = diagonais se aproximando. */
  slopePerWeek: number;
}

export interface TrendPoint {
  weekNumber: number;
  asymmetryIndex: number;
}

/** Regressão linear simples sobre (semana, índice). */
function linearSlope(points: TrendPoint[]): number {
  const n = points.length;
  if (n < 2) return 0;
  const meanX = points.reduce((s, p) => s + p.weekNumber, 0) / n;
  const meanY = points.reduce((s, p) => s + p.asymmetryIndex, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.weekNumber - meanX) * (p.asymmetryIndex - meanY);
    den += (p.weekNumber - meanX) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

const WINDOW = 4;

export function readTrend(all: TrendPoint[]): TrendReading {
  const points = [...all].sort((a, b) => a.weekNumber - b.weekNumber);

  if (points.length < 2) {
    return {
      direction: 'insuficiente',
      headline: 'Ainda sem tendência',
      detail: 'A curva começa a aparecer a partir da segunda foto.',
      delta: 0,
      windowWeeks: points.length,
      slopePerWeek: 0,
    };
  }

  const window = points.slice(-WINDOW);
  const slope = linearSlope(window);
  const delta = window[window.length - 1].asymmetryIndex - window[0].asymmetryIndex;
  const weeks = window[window.length - 1].weekNumber - window[0].weekNumber || 1;
  const label = weeks === 1 ? 'na última semana' : `nas últimas ${weeks} semanas`;

  // O ruído de marcação manual num celular é da ordem de ±0,3 pp por semana.
  // Abaixo disso o app se recusa a chamar de tendência — chamar seria inventar
  // sinal em cima de tremor de mão.
  const NOISE = 0.3;

  if (slope <= -NOISE) {
    return {
      direction: 'melhora',
      headline: 'Tendência de melhora',
      detail: `A diferença entre as diagonais diminuiu ${Math.abs(delta).toFixed(1)} ponto${
        Math.abs(delta) >= 2 ? 's' : ''
      } ${label}.`,
      delta: round1(delta),
      windowWeeks: weeks,
      slopePerWeek: round2(slope),
    };
  }

  if (slope >= NOISE) {
    return {
      direction: 'atencao',
      headline: 'A diferença aumentou',
      detail: `As diagonais ficaram mais distantes entre si ${label}. Vale comentar com o profissional na próxima consulta.`,
      delta: round1(delta),
      windowWeeks: weeks,
      slopePerWeek: round2(slope),
    };
  }

  if (Math.abs(delta) < 0.5) {
    return {
      direction: 'sem_mudanca',
      headline: 'Sem mudança perceptível',
      detail: `Os valores ficaram praticamente iguais ${label}.`,
      delta: round1(delta),
      windowWeeks: weeks,
      slopePerWeek: round2(slope),
    };
  }

  return {
    direction: 'estavel',
    headline: 'Estável',
    detail: `Pequenas variações ${label}, sem uma direção clara.`,
    delta: round1(delta),
    windowWeeks: weeks,
    slopePerWeek: round2(slope),
  };
}

export interface Projection {
  available: boolean;
  weeksToTarget: number | null;
  text: string;
}

/**
 * Projeção de ritmo. Só existe se a série estiver realmente caindo e tiver
 * histórico suficiente — extrapolar 2 pontos ruidosos para dar uma data a uma
 * mãe ansiosa seria a coisa mais irresponsável que este app poderia fazer.
 *
 * "Alvo" = 3,5 pp, o piso da faixa "diagonais próximas". Não é alta, não é cura.
 */
const TARGET = 3.5;

export function projectPace(all: TrendPoint[]): Projection {
  const points = [...all].sort((a, b) => a.weekNumber - b.weekNumber);
  const unavailable = (text: string): Projection => ({
    available: false,
    weeksToTarget: null,
    text,
  });

  if (points.length < 4) {
    return unavailable('A estimativa de ritmo aparece depois de 4 registros.');
  }

  const current = points[points.length - 1].asymmetryIndex;
  if (current <= TARGET) {
    return unavailable('Os valores já estão na faixa em que as diagonais ficam próximas.');
  }

  const slope = linearSlope(points.slice(-WINDOW));
  if (slope >= -0.15) {
    return unavailable(
      'Ainda não dá para estimar um ritmo — os valores não vêm caindo de forma constante.',
    );
  }

  const weeks = Math.ceil((current - TARGET) / Math.abs(slope));
  if (weeks > 40) {
    return unavailable('O ritmo atual é lento demais para uma estimativa útil de prazo.');
  }

  return {
    available: true,
    weeksToTarget: weeks,
    text: `Mantendo esse mesmo ritmo, a tendência é de aproximação à simetria em torno de ${weeks} semana${
      weeks === 1 ? '' : 's'
    }. Isto é uma projeção matemática do próprio histórico, não uma previsão médica — o ritmo real varia.`,
  };
}
