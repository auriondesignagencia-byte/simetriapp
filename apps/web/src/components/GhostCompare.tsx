import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

/**
 * Dois usos, um componente:
 *
 * 1. mode="ghost" — na CAPTURA: a foto antiga entra semi-transparente por cima
 *    da nova, e o slider controla a opacidade dela. Serve para a mãe perceber se
 *    girou o celular ou mudou a altura desde a semana passada. Sem esse
 *    alinhamento, comparar duas fotos é comparar dois ângulos, não duas cabeças.
 *
 * 2. mode="wipe" — na EVOLUÇÃO: cortina antes/depois clássica, para VER o
 *    progresso. Aqui o objetivo é emocional, não técnico.
 */
export function GhostCompare({
  current,
  previous,
  mode = 'ghost',
  labels,
}: {
  current: string;
  previous: string;
  mode?: 'ghost' | 'wipe';
  labels?: { before: string; after: string };
}) {
  const [value, setValue] = useState(mode === 'ghost' ? 0.45 : 0.5);
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const setFromEvent = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setValue(Math.min(1, Math.max(0, (clientX - r.left) / r.width)));
  };

  return (
    <div className="space-y-3">
      <div
        ref={ref}
        onPointerDown={(e) => {
          setDragging(true);
          (e.target as Element).setPointerCapture(e.pointerId);
          setFromEvent(e.clientX);
        }}
        onPointerMove={(e) => dragging && setFromEvent(e.clientX)}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
        className="relative w-full aspect-square rounded-card overflow-hidden border border-line touch-none select-none bg-raised cursor-ew-resize"
      >
        <img src={current} alt="Foto desta semana" className="absolute inset-0 w-full h-full object-cover" draggable={false} />

        {mode === 'ghost' ? (
          <img
            src={previous}
            alt="Foto da semana anterior"
            className="absolute inset-0 w-full h-full object-cover mix-blend-luminosity"
            style={{ opacity: value }}
            draggable={false}
          />
        ) : (
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ clipPath: `inset(0 ${(1 - value) * 100}% 0 0)` }}
          >
            <img src={previous} alt="Foto anterior" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
          </div>
        )}

        {mode === 'wipe' && (
          <motion.div
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lift"
            style={{ left: `${value * 100}%` }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-pill bg-white shadow-float grid place-items-center">
              <span className="text-[10px] text-ink">◀▶</span>
            </div>
          </motion.div>
        )}

        {labels && (
          <>
            <span className="absolute top-3 left-3 rounded-pill bg-ink/70 backdrop-blur-sm px-2.5 py-1 text-12 text-white">
              {labels.before}
            </span>
            <span className="absolute top-3 right-3 rounded-pill bg-ink/70 backdrop-blur-sm px-2.5 py-1 text-12 text-white">
              {labels.after}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-12 text-muted shrink-0 w-20">
          {mode === 'ghost' ? 'Só a nova' : labels?.before ?? 'Antes'}
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          aria-label={mode === 'ghost' ? 'Transparência da foto anterior' : 'Cortina antes e depois'}
          className={cn(
            'flex-1 h-1.5 appearance-none rounded-pill bg-line cursor-pointer',
            '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5',
            '[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-pill',
            '[&::-webkit-slider-thumb]:bg-amber [&::-webkit-slider-thumb]:shadow-lift',
            '[&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:border-0',
            '[&::-moz-range-thumb]:rounded-pill [&::-moz-range-thumb]:bg-amber',
          )}
        />
        <span className="text-12 text-muted shrink-0 w-20 text-right">
          {mode === 'ghost' ? 'Sobrepor' : labels?.after ?? 'Depois'}
        </span>
      </div>
    </div>
  );
}
