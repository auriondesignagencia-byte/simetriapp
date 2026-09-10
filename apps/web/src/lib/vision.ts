/**
 * Visão computacional 2D — o mínimo defensável, e nada além disso.
 *
 * O que este módulo FAZ:
 *   - acha uma caixa de rosto/cabeça no quadro, quando o navegador oferece isso
 *   - mede foco e exposição da foto capturada
 *   - comprime a imagem antes de subir
 *
 * O que este módulo NÃO FAZ, deliberadamente:
 *   - estimar ângulo/rotação da cabeça em graus
 *   - decidir sozinho que "está bom" e disparar a captura
 *   - calcular índice nenhum sem um humano ter conferido os pontos
 *
 * Um modelo de topo de crânio de bebê treinado para craniometria não existe
 * disponível, e uma câmera de celular não tem profundidade. Fingir qualquer uma
 * das duas coisas colocaria um número clínico falso na mão de uma mãe ansiosa.
 */

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** O guia na tela: o alvo é a cabeça ocupar mais ou menos este círculo. */
export const GUIDE = { cx: 0.5, cy: 0.46, r: 0.32 };

export type FramingStatus = 'sem_deteccao' | 'longe' | 'perto' | 'descentralizado' | 'ideal';

export const FRAMING_COPY: Record<FramingStatus, string> = {
  sem_deteccao: 'Encaixe a cabecinha dentro do círculo',
  longe: 'Aproxime um pouco',
  perto: 'Afaste um pouco',
  descentralizado: 'Centralize a cabeça no círculo',
  ideal: 'Distância ideal — pode fotografar',
};

export function supportsFaceDetection(): boolean {
  return typeof window !== 'undefined' && 'FaceDetector' in window;
}

let detector: any = null;

export async function detectBox(video: HTMLVideoElement): Promise<Box | null> {
  if (!supportsFaceDetection()) return null;
  try {
    if (!detector) {
      detector = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
    }
    const faces = await detector.detect(video);
    if (!faces?.length) return null;

    const b = faces[0].boundingBox;
    const vw = video.videoWidth || 1;
    const vh = video.videoHeight || 1;
    return { x: b.x / vw, y: b.y / vh, width: b.width / vw, height: b.height / vh };
  } catch {
    // Detector pode falhar em frames intermediários. Falhar é aceitável: o guia
    // estático continua na tela e a captura nunca depende do detector.
    return null;
  }
}

export function framingFor(box: Box | null): FramingStatus {
  if (!box) return 'sem_deteccao';

  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const dist = Math.hypot(cx - GUIDE.cx, cy - GUIDE.cy);

  if (dist > GUIDE.r * 0.5) return 'descentralizado';

  // Compara o "raio" da cabeça com o raio do guia. Tolerância larga de propósito:
  // apertar a faixa daria uma falsa sensação de precisão métrica.
  const r = Math.max(box.width, box.height) / 2;
  if (r < GUIDE.r * 0.62) return 'longe';
  if (r > GUIDE.r * 1.25) return 'perto';
  return 'ideal';
}

export interface QualityReport {
  ok: boolean;
  /** 0..1, quanto maior mais nítida. */
  sharpness: number;
  /** 0..1 */
  brightness: number;
  problem: 'borrada' | 'escura' | 'estourada' | null;
  hint: string | null;
}

/**
 * Foco via variância do Laplaciano num recorte central, em escala reduzida.
 * É o truque clássico: imagem borrada tem poucas transições bruscas de
 * intensidade, então a variância do Laplaciano despenca.
 */
export function assessQuality(canvas: HTMLCanvasElement): QualityReport {
  const w = 160;
  const h = Math.round((canvas.height / canvas.width) * w);

  const small = document.createElement('canvas');
  small.width = w;
  small.height = h;
  const ctx = small.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(canvas, 0, 0, w, h);

  const { data } = ctx.getImageData(0, 0, w, h);
  const gray = new Float32Array(w * h);
  let sum = 0;
  for (let i = 0; i < w * h; i++) {
    const g = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    gray[i] = g;
    sum += g;
  }
  const brightness = sum / (w * h) / 255;

  let mean = 0;
  const lap: number[] = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const v =
        4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - w] - gray[i + w];
      lap.push(v);
      mean += v;
    }
  }
  mean /= lap.length || 1;
  const variance = lap.reduce((s, v) => s + (v - mean) ** 2, 0) / (lap.length || 1);

  // 120 calibrado empiricamente em webcam/celular: abaixo disso a marcação de
  // ponto vira chute, e um chute vira um número que a mãe vai levar a sério.
  const sharpness = Math.min(1, variance / 120);

  if (brightness < 0.22) {
    return {
      ok: false,
      sharpness,
      brightness,
      problem: 'escura',
      hint: 'A foto ficou escura demais. Chegue perto de uma janela ou acenda a luz do teto — sem flash direto no rosto.',
    };
  }
  if (brightness > 0.93) {
    return {
      ok: false,
      sharpness,
      brightness,
      problem: 'estourada',
      hint: 'A luz estourou a imagem e apagou o contorno da cabeça. Tente sem o sol batendo direto ou saia de baixo da luminária.',
    };
  }
  if (sharpness < 0.34) {
    return {
      ok: false,
      sharpness,
      brightness,
      problem: 'borrada',
      hint: 'A foto saiu tremida. Apoie o cotovelo em algo firme, espere o bebê parar de mexer e toque de novo.',
    };
  }

  return { ok: true, sharpness, brightness, problem: null, hint: null };
}

/**
 * Redimensiona e comprime antes de subir. Uma foto crua de celular moderno tem
 * 4-8 MB; multiplicada por 12 semanas e por N pacientes, isso vira conta de S3 e
 * espera no 4G da sala de espera. 1024px é folgado para marcar 4 pontos.
 */
export async function compressImage(canvas: HTMLCanvasElement, maxSize = 1024): Promise<string> {
  const scale = Math.min(1, maxSize / Math.max(canvas.width, canvas.height));
  const out = document.createElement('canvas');
  out.width = Math.round(canvas.width * scale);
  out.height = Math.round(canvas.height * scale);
  out.getContext('2d')!.drawImage(canvas, 0, 0, out.width, out.height);
  return out.toDataURL('image/jpeg', 0.82);
}

/**
 * Carrega uma foto escolhida pelo usuário num canvas quadrado, do mesmo jeito
 * que a câmera faz (recorte central).
 *
 * Existe porque a câmera falha em casos que NÃO são exceção no público deste
 * app: permissão negada, navegador embutido de Instagram/Facebook (que é por
 * onde chega o tráfego de anúncio) e desktop sem webcam. Sem isto a única
 * saída era a foto simulada — ou seja, um registro inventado indo parar no
 * histórico, no índice e no relatório de uma mãe.
 */
export async function canvasFromFile(file: File): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('imagem ilegível'));
      el.src = url;
    });

    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = side;
    canvas.height = side;
    canvas.getContext('2d')!.drawImage(
      img,
      (img.naturalWidth - side) / 2,
      (img.naturalHeight - side) / 2,
      side,
      side,
      0,
      0,
      side,
      side,
    );
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}
