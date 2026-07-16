/**
 * Motor de estimativa visual de simetria craniana.
 *
 * LIMITE TÉCNICO ASSUMIDO: uma foto 2D de celular não permite craniometria
 * clínica. Nada aqui é medição — são razões entre distâncias em PIXELS de
 * pontos marcados por um humano. Razões são adimensionais, então a escala da
 * foto se cancela; é por isso que o método sobrevive sem calibração. O que ele
 * NÃO sobrevive é a mudança de ângulo/altura da câmera entre semanas — daí o
 * ghost overlay da semana anterior na captura existir como requisito, e não
 * como enfeite.
 */

import { round1, round3 } from './utils.js';

/** Coordenada normalizada (0..1) relativa à imagem — resiliente a resize. */
export interface Point {
  x: number;
  y: number;
}

/**
 * Os 4 pontos do método das diagonais (padrão para CVAI em plagiocefalia).
 * Vistos de cima, com o bebê olhando para o topo da foto:
 *
 *        frenteEsq  ·   ·  frenteDir
 *                    \ /
 *                     ×            (as duas diagonais se cruzam)
 *                    / \
 *        trasDir    ·   ·  trasEsq
 *
 * Diagonal A = frenteEsq → trasDir   (30° à esquerda do eixo ântero-posterior)
 * Diagonal B = frenteDir → trasEsq   (30° à direita)
 */
export interface ReferencePoints {
  frenteEsq: Point;
  frenteDir: Point;
  trasEsq: Point;
  trasDir: Point;
}

export type PointKey = keyof ReferencePoints;

export const POINT_KEYS: PointKey[] = ['frenteEsq', 'frenteDir', 'trasDir', 'trasEsq'];

export const POINT_LABELS: Record<PointKey, string> = {
  frenteEsq: 'Testa — lado esquerdo',
  frenteDir: 'Testa — lado direito',
  trasDir: 'Nuca — lado direito',
  trasEsq: 'Nuca — lado esquerdo',
};

/**
 * Dica exibida ao arrastar cada ponto. Escrita para um pai leigo às 3h da
 * manhã, não para um fisioterapeuta.
 */
export const POINT_HINTS: Record<PointKey, string> = {
  frenteEsq: 'Encoste na borda da cabecinha, um pouco acima da testa, do lado esquerdo do bebê.',
  frenteDir: 'Agora o mesmo ponto, do lado direito do bebê.',
  trasDir: 'Na borda de trás da cabeça, do lado direito — em diagonal com a testa esquerda.',
  trasEsq: 'E o último: borda de trás da cabeça, lado esquerdo.',
};

export interface SymmetryEstimate {
  /**
   * Índice de assimetria (%). Diferença entre as duas diagonais, dividida pela
   * maior. 0% = diagonais iguais. Análogo visual ao CVAI, SEM valor clínico.
   */
  asymmetryIndex: number;
  /** Comprimento da diagonal A, em px normalizados. */
  diagonalA: number;
  /** Comprimento da diagonal B, em px normalizados. */
  diagonalB: number;
  /**
   * Razão largura/comprimento (%) estimada a partir da extensão dos 4 pontos.
   * Referência visual para braquicefalia (cabeça mais larga que comprida).
   * É uma DERIVAÇÃO dos mesmos 4 pontos, não uma medida independente — por isso
   * é sempre secundária na interface.
   */
  widthLengthRatio: number;
  /** Qual lado tem a diagonal maior. Descritivo, nunca diagnóstico. */
  longerDiagonal: 'A' | 'B' | 'equal';
  band: SymmetryBand;
}

/**
 * Faixas de leitura. Os cortes seguem a literatura de CVAI (≈3,5% e ≈7%) mas
 * são usados aqui apenas para escolher a COR e o TEXTO da interface — nunca
 * para afirmar grau, gravidade ou diagnóstico. Nenhuma faixa se chama
 * "leve/moderado/grave": esses são termos clínicos e não nos pertencem.
 */
export type SymmetryBand = 'proxima' | 'intermediaria' | 'acentuada';

export const BAND_COPY: Record<SymmetryBand, { label: string; description: string }> = {
  proxima: {
    label: 'Diagonais próximas',
    description: 'As duas medidas ficaram bem parecidas nesta foto.',
  },
  intermediaria: {
    label: 'Diferença perceptível',
    description: 'As diagonais ficaram diferentes entre si nesta foto.',
  },
  acentuada: {
    label: 'Diferença acentuada',
    description: 'As diagonais ficaram bastante diferentes nesta foto. Vale mostrar ao profissional.',
  },
};

export function bandFor(asymmetryIndex: number): SymmetryBand {
  if (asymmetryIndex < 3.5) return 'proxima';
  if (asymmetryIndex < 7) return 'intermediaria';
  return 'acentuada';
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function calculateSymmetry(points: ReferencePoints): SymmetryEstimate {
  const diagonalA = distance(points.frenteEsq, points.trasDir);
  const diagonalB = distance(points.frenteDir, points.trasEsq);

  const longest = Math.max(diagonalA, diagonalB);
  // Guarda contra os 4 pontos empilhados no mesmo lugar (divisão por zero).
  const asymmetryIndex = longest === 0 ? 0 : (Math.abs(diagonalA - diagonalB) / longest) * 100;

  const xs = POINT_KEYS.map((k) => points[k].x);
  const ys = POINT_KEYS.map((k) => points[k].y);
  const width = Math.max(...xs) - Math.min(...xs);
  const length = Math.max(...ys) - Math.min(...ys);
  const widthLengthRatio = length === 0 ? 0 : (width / length) * 100;

  const delta = diagonalA - diagonalB;
  const longerDiagonal: 'A' | 'B' | 'equal' =
    Math.abs(delta) < 0.001 ? 'equal' : delta > 0 ? 'A' : 'B';

  return {
    asymmetryIndex: round1(asymmetryIndex),
    diagonalA: round3(diagonalA),
    diagonalB: round3(diagonalB),
    widthLengthRatio: round1(widthLengthRatio),
    longerDiagonal,
    band: bandFor(asymmetryIndex),
  };
}

/**
 * Posição inicial sugerida dos 4 pontos a partir da caixa do rosto/cabeça
 * devolvida pela detecção 2D do navegador. É um CHUTE EDUCADO, e a interface
 * diz isso: existe para poupar arrasto, não para dispensar o ajuste humano.
 *
 * Deriva as diagonais a ±30° do eixo ântero-posterior, que é a convenção do
 * método. `box` vem em coordenadas normalizadas.
 */
export function suggestReferencePoints(box: {
  x: number;
  y: number;
  width: number;
  height: number;
}): ReferencePoints {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const rx = box.width / 2;
  const ry = box.height / 2;

  // 30° a partir do eixo vertical (ântero-posterior), projetado na elipse.
  const rad = (30 * Math.PI) / 180;
  const dx = Math.sin(rad) * rx;
  const dy = Math.cos(rad) * ry;

  const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
  const p = (x: number, y: number): Point => ({ x: clamp01(x), y: clamp01(y) });

  return {
    frenteEsq: p(cx - dx, cy - dy),
    frenteDir: p(cx + dx, cy - dy),
    trasDir: p(cx + dx, cy + dy),
    trasEsq: p(cx - dx, cy + dy),
  };
}

/** Fallback quando a detecção facial não encontra nada: centro do quadro. */
export const FALLBACK_BOX = { x: 0.22, y: 0.18, width: 0.56, height: 0.64 };

/**
 * Frase obrigatória em QUALQUER superfície que mostre o índice. Exportada como
 * constante justamente para que ninguém possa exibir o número sem ela.
 */
export const DISCLAIMER_INDEX =
  'Esta é uma estimativa visual de acompanhamento, não uma medição clínica com craniômetro.';

export const DISCLAIMER_SHORT = 'Estimativa visual — não substitui avaliação profissional.';
