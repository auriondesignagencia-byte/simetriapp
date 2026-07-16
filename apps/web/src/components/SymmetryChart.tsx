import { useId, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { formatDateShort, type PhotoEntry } from '@simetriapp/shared';
import { cn } from '@/lib/cn';

export interface ChartPoint {
  weekNumber: number;
  asymmetryIndex: number;
  takenAt: string;
  id?: string;
}

interface Props {
  points: ChartPoint[];
  /** Mini: usado no card da Home. Full: tela de evolução, com eixos e toque. */
  variant?: 'mini' | 'full';
  /** Paywall: desenha a curva de verdade, mas borrada e com cadeado. */
  locked?: boolean;
  onPointTap?: (p: ChartPoint) => void;
  selectedId?: string | null;
  className?: string;
}

const PAD = { top: 16, right: 12, bottom: 26, left: 30 };

export function SymmetryChart({
  points,
  variant = 'full',
  locked = false,
  onPointTap,
  selectedId,
  className,
}: Props) {
  const gradId = useId();
  const height = variant === 'mini' ? 96 : 220;
  const width = 320; // viewBox fixo; o SVG escala por CSS
  const ref = useRef<SVGSVGElement>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  const sorted = useMemo(
    () => [...points].sort((a, b) => a.weekNumber - b.weekNumber),
    [points],
  );

  const geom = useMemo(() => {
    if (sorted.length === 0) return null;

    const pad = variant === 'mini' ? { top: 8, right: 6, bottom: 8, left: 6 } : PAD;
    const w = width - pad.left - pad.right;
    const h = height - pad.top - pad.bottom;

    const values = sorted.map((p) => p.asymmetryIndex);
    // A escala nunca começa em 0: uma curva de 8% a 4% num eixo 0–10 vira uma
    // linha quase reta e a mãe não vê o progresso real que ela construiu.
    // Mas também nunca é justa demais, senão ruído de 0,2pp vira montanha.
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const span = Math.max(2.5, rawMax - rawMin);
    const yMin = Math.max(0, rawMin - span * 0.25);
    const yMax = rawMax + span * 0.25;

    const xs = sorted.map((_, i) =>
      sorted.length === 1 ? pad.left + w / 2 : pad.left + (i / (sorted.length - 1)) * w,
    );
    const ys = sorted.map(
      (p) => pad.top + h - ((p.asymmetryIndex - yMin) / (yMax - yMin || 1)) * h,
    );

    // Curva suave via Catmull-Rom → Bézier. Uma polilinha reta ficaria dura e
    // "clínica"; o produto inteiro é o oposto disso.
    let d = `M ${xs[0]} ${ys[0]}`;
    for (let i = 0; i < xs.length - 1; i++) {
      const x0 = xs[Math.max(0, i - 1)];
      const y0 = ys[Math.max(0, i - 1)];
      const x1 = xs[i];
      const y1 = ys[i];
      const x2 = xs[i + 1];
      const y2 = ys[i + 1];
      const x3 = xs[Math.min(xs.length - 1, i + 2)];
      const y3 = ys[Math.min(ys.length - 1, i + 2)];

      const t = 0.18;
      const c1x = x1 + (x2 - x0) * t;
      const c1y = y1 + (y2 - y0) * t;
      const c2x = x2 - (x3 - x1) * t;
      const c2y = y2 - (y3 - y1) * t;
      d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`;
    }

    const area = `${d} L ${xs[xs.length - 1]} ${pad.top + h} L ${xs[0]} ${pad.top + h} Z`;

    return { d, area, xs, ys, yMin, yMax, pad, w, h };
  }, [sorted, height, variant]);

  if (!geom) return null;

  // Índice caindo = melhora. Verde-sálvia quando a série cai, âmbar quando não.
  const improving =
    sorted.length >= 2 &&
    sorted[sorted.length - 1].asymmetryIndex < sorted[0].asymmetryIndex;
  const stroke = improving ? 'rgb(var(--sage))' : 'rgb(var(--amber))';

  return (
    <div className={cn('relative', className)}>
      <svg
        ref={ref}
        viewBox={`0 0 ${width} ${height}`}
        className={cn('w-full h-auto overflow-visible', locked && 'blur-[6px] saturate-50')}
        role="img"
        aria-label={
          locked
            ? 'Gráfico de evolução bloqueado'
            : `Evolução da estimativa: ${sorted.length} registros, de ${sorted[0].asymmetryIndex.toFixed(1)}% a ${sorted[sorted.length - 1].asymmetryIndex.toFixed(1)}%`
        }
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.18" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>

        {variant === 'full' && (
          <g>
            {[0, 0.5, 1].map((f) => {
              const y = geom.pad.top + geom.h * f;
              const val = geom.yMax - (geom.yMax - geom.yMin) * f;
              return (
                <g key={f}>
                  <line
                    x1={geom.pad.left}
                    y1={y}
                    x2={width - geom.pad.right}
                    y2={y}
                    stroke="rgb(var(--line))"
                    strokeWidth="1"
                    strokeDasharray="2 4"
                  />
                  <text
                    x={geom.pad.left - 6}
                    y={y + 3}
                    textAnchor="end"
                    className="fill-[rgb(var(--muted))] text-[9px] tabular-nums"
                  >
                    {val.toFixed(1)}
                  </text>
                </g>
              );
            })}
          </g>
        )}

        <motion.path
          d={geom.area}
          fill={`url(#${gradId})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        />

        {/* O "draw-in": a curva se desenha da esquerda para a direita, como se a
            mãe estivesse vendo as semanas dela sendo traçadas uma a uma. */}
        <motion.path
          d={geom.d}
          fill="none"
          stroke={stroke}
          strokeWidth={variant === 'mini' ? 2 : 2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.1, ease: [0.32, 0.72, 0, 1] }}
        />

        {sorted.map((p, i) => {
          const isSel = selectedId ? p.id === selectedId : hovered === i;
          const last = i === sorted.length - 1;
          return (
            <g key={p.id ?? i}>
              {last && variant === 'full' && (
                <motion.circle
                  cx={geom.xs[i]}
                  cy={geom.ys[i]}
                  r={9}
                  fill={stroke}
                  className="animate-breathe"
                  // Sem isto, o scale() do keyframe usa a origem do viewBox (0,0)
                  // e o halo "escapa" do ponto quanto mais à direita ele estiver.
                  style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.18 }}
                  transition={{ delay: 1.1 }}
                />
              )}
              <motion.circle
                cx={geom.xs[i]}
                cy={geom.ys[i]}
                r={isSel ? 5.5 : variant === 'mini' ? 2.5 : 4}
                fill="rgb(var(--surface))"
                stroke={stroke}
                strokeWidth={2}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  delay: 0.4 + (i / Math.max(1, sorted.length)) * 0.8,
                  type: 'spring',
                  stiffness: 400,
                  damping: 22,
                }}
                style={{ transformOrigin: `${geom.xs[i]}px ${geom.ys[i]}px` }}
              />
              {variant === 'full' && !locked && (
                <circle
                  cx={geom.xs[i]}
                  cy={geom.ys[i]}
                  r={16}
                  fill="transparent"
                  className="cursor-pointer"
                  onPointerEnter={() => setHovered(i)}
                  onPointerLeave={() => setHovered(null)}
                  onClick={() => onPointTap?.(p)}
                />
              )}
            </g>
          );
        })}

        {variant === 'full' &&
          sorted.map((p, i) => {
            // Em séries longas, rotular toda semana vira ruído ilegível em 360px.
            const step = Math.ceil(sorted.length / 5);
            if (i % step !== 0 && i !== sorted.length - 1) return null;
            return (
              <text
                key={`x${i}`}
                x={geom.xs[i]}
                y={height - 8}
                textAnchor="middle"
                className="fill-[rgb(var(--muted))] text-[9px]"
              >
                S{p.weekNumber}
              </text>
            );
          })}
      </svg>

      {hovered !== null && variant === 'full' && !locked && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full"
          style={{
            left: `${(geom.xs[hovered] / width) * 100}%`,
            top: `${(geom.ys[hovered] / height) * 100}%`,
          }}
        >
          <div className="mb-2 rounded-lg bg-ink px-2.5 py-1.5 shadow-lift">
            <p className="text-12 font-medium text-canvas tabular-nums">
              {sorted[hovered].asymmetryIndex.toFixed(1)}%
            </p>
            <p className="text-[10px] text-canvas/60">
              Semana {sorted[hovered].weekNumber} · {formatDateShort(sorted[hovered].takenAt)}
            </p>
          </div>
        </motion.div>
      )}

      {locked && (
        <div className="absolute inset-0 grid place-items-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="grid place-items-center w-12 h-12 rounded-pill bg-surface shadow-float"
          >
            <Lock size={18} className="text-amber-ink" />
          </motion.div>
        </div>
      )}
    </div>
  );
}

export function toChartPoints(entries: PhotoEntry[]): ChartPoint[] {
  return entries.map((e) => ({
    id: e.id,
    weekNumber: e.weekNumber,
    asymmetryIndex: e.asymmetryIndex,
    takenAt: e.takenAt,
  }));
}
