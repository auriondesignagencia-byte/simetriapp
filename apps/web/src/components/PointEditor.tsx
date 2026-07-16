import { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { POINT_KEYS, POINT_LABELS, type PointKey, type ReferencePoints } from '@simetriapp/shared';
import { cn } from '@/lib/cn';

interface Props {
  image: string;
  points: ReferencePoints;
  active: PointKey;
  onActiveChange: (k: PointKey) => void;
  onChange: (p: ReferencePoints, moved: PointKey) => void;
  /** Somente leitura: usado na tela de detalhe da foto. */
  readOnly?: boolean;
}

const SHORT: Record<PointKey, string> = {
  frenteEsq: 'FE',
  frenteDir: 'FD',
  trasDir: 'TD',
  trasEsq: 'TE',
};

/**
 * As diagonais são desenhadas em cores diferentes porque a mãe precisa VER que
 * está comparando duas medidas cruzadas — sem isso, "índice de assimetria" é só
 * um número que caiu do céu, e número que cai do céu é número em que se acredita
 * demais.
 */
export function PointEditor({
  image,
  points,
  active,
  onActiveChange,
  onChange,
  readOnly = false,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<PointKey | null>(null);

  const move = useCallback(
    (key: PointKey, clientX: number, clientY: number) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
      const y = Math.min(1, Math.max(0, (clientY - r.top) / r.height));
      onChange({ ...points, [key]: { x, y } }, key);
    },
    [points, onChange],
  );

  const start = (key: PointKey) => (e: React.PointerEvent) => {
    if (readOnly) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    setDragging(key);
    onActiveChange(key);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    move(dragging, e.clientX, e.clientY);
  };

  const end = () => setDragging(null);

  const p = points;
  const line = (a: PointKey, b: PointKey, color: string) => (
    <line
      x1={p[a].x * 100}
      y1={p[a].y * 100}
      x2={p[b].x * 100}
      y2={p[b].y * 100}
      stroke={color}
      strokeWidth="0.5"
      strokeLinecap="round"
      vectorEffect="non-scaling-stroke"
    />
  );

  const activePoint = p[active];

  return (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      className="relative w-full aspect-square rounded-card overflow-hidden border border-line touch-none select-none bg-raised"
    >
      <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover" draggable={false} />

      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
        {line('frenteEsq', 'trasDir', 'rgb(201 162 39)')}
        {line('frenteDir', 'trasEsq', 'rgb(168 197 214)')}
      </svg>

      {POINT_KEYS.map((key) => {
        const pt = p[key];
        const isActive = key === active;
        const isDrag = key === dragging;
        return (
          <motion.button
            key={key}
            type="button"
            onPointerDown={start(key)}
            onClick={() => onActiveChange(key)}
            animate={{ scale: isDrag ? 1.25 : isActive ? 1.1 : 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
            aria-label={POINT_LABELS[key]}
            disabled={readOnly}
            className={cn(
              'absolute -translate-x-1/2 -translate-y-1/2 grid place-items-center',
              'w-9 h-9 rounded-pill border-2 shadow-lift',
              readOnly ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
              isActive
                ? 'bg-amber border-white text-white z-20'
                : 'bg-surface/95 border-white text-muted z-10',
            )}
            style={{ left: `${pt.x * 100}%`, top: `${pt.y * 100}%` }}
          >
            <span className="text-[10px] font-semibold pointer-events-none">{SHORT[key]}</span>
          </motion.button>
        );
      })}

      {/* Lupa: aparece só durante o arrasto, no canto oposto ao dedo, e mostra a
          região sob o polegar ampliada 2,5×. Sem ela, marcar borda de crânio num
          celular é marcar debaixo do próprio dedo — literalmente às cegas. */}
      {dragging && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            'absolute top-3 w-28 h-28 rounded-pill overflow-hidden',
            'border-2 border-white shadow-float pointer-events-none z-30',
            activePoint.x > 0.5 ? 'left-3' : 'right-3',
          )}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${image})`,
              backgroundSize: '250% 250%',
              backgroundPosition: `${activePoint.x * 100}% ${activePoint.y * 100}%`,
            }}
          />
          <div className="absolute inset-0 grid place-items-center">
            <div className="w-5 h-5 rounded-pill border-2 border-amber shadow-rest" />
            <div className="absolute w-full h-px bg-white/40" />
            <div className="absolute h-full w-px bg-white/40" />
          </div>
        </motion.div>
      )}
    </div>
  );
}
