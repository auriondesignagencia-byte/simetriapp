import { motion } from 'framer-motion';

/**
 * Ilustrações próprias, em SVG animado. O briefing pede explicitamente que NÃO
 * seja foto de banco de imagens — e num app sobre a cabeça do bebê de alguém,
 * a foto do bebê feliz de outra pessoa soa falsa exatamente para quem está
 * ansiosa. Formas suaves dizem "cuidado" sem prometer um desfecho.
 */

export function WelcomeArt() {
  return (
    <svg viewBox="0 0 240 200" className="w-full h-auto" role="img" aria-label="Mãe e bebê">
      <defs>
        <radialGradient id="w-glow" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="rgb(var(--amber))" stopOpacity="0.18" />
          <stop offset="100%" stopColor="rgb(var(--amber))" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="120" cy="92" r="86" fill="url(#w-glow)" />

      {[70, 58, 46].map((r, i) => (
        <motion.circle
          key={r}
          cx="120"
          cy="95"
          r={r}
          fill="none"
          stroke="rgb(var(--sky))"
          strokeOpacity={0.25 - i * 0.05}
          strokeWidth="1"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15 * i, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: '120px 95px' }}
        />
      ))}

      {/* Silhueta do colo: o braço curva e a cabecinha repousa nele. */}
      <motion.path
        d="M 58 152 C 62 106, 92 78, 122 78 C 152 78, 176 100, 180 138"
        fill="none"
        stroke="rgb(var(--amber))"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: [0.32, 0.72, 0, 1], delay: 0.2 }}
      />

      <motion.g
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.9, type: 'spring', stiffness: 260, damping: 20 }}
        style={{ transformOrigin: '120px 96px' }}
      >
        <circle cx="120" cy="96" r="30" fill="rgb(var(--sage))" fillOpacity="0.16" />
        <circle cx="120" cy="96" r="22" fill="rgb(var(--surface))" stroke="rgb(var(--sage))" strokeWidth="2" />
        <circle cx="112" cy="93" r="2.6" fill="rgb(var(--ink))" />
        <circle cx="128" cy="93" r="2.6" fill="rgb(var(--ink))" />
        <path
          d="M 113 104 Q 120 109 127 104"
          stroke="rgb(var(--ink))"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      </motion.g>
    </svg>
  );
}

export function HowItWorksArt() {
  const steps = [
    { x: 40, label: 'foto' },
    { x: 120, label: 'pontos' },
    { x: 200, label: 'curva' },
  ];
  return (
    <svg viewBox="0 0 240 130" className="w-full h-auto" role="img" aria-label="Como funciona">
      <motion.path
        d="M 40 66 L 200 66"
        stroke="rgb(var(--line))"
        strokeWidth="2"
        strokeDasharray="4 5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, delay: 0.3 }}
      />
      {steps.map((s, i) => (
        <motion.g
          key={s.x}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 + i * 0.25, type: 'spring', stiffness: 300, damping: 22 }}
          style={{ transformOrigin: `${s.x}px 66px` }}
        >
          <circle cx={s.x} cy="66" r="24" fill="rgb(var(--surface))" stroke="rgb(var(--line))" strokeWidth="1.5" />
          <circle cx={s.x} cy="66" r="24" fill={i === 2 ? 'rgb(var(--sage))' : 'rgb(var(--amber))'} fillOpacity="0.1" />
          <text x={s.x} y="70" textAnchor="middle" className="fill-[rgb(var(--muted))] text-[9px] font-medium">
            {i + 1}
          </text>
          <text x={s.x} y="108" textAnchor="middle" className="fill-[rgb(var(--muted))] text-[10px]">
            {s.label}
          </text>
        </motion.g>
      ))}
    </svg>
  );
}

/** Estado vazio da linha do tempo: um único ponto, esperando o segundo. */
export function EmptyCurveArt() {
  return (
    <svg viewBox="0 0 240 120" className="w-full h-auto" role="img" aria-label="Curva ainda vazia">
      <motion.path
        d="M 30 40 C 80 46, 130 68, 210 92"
        fill="none"
        stroke="rgb(var(--line))"
        strokeWidth="2"
        strokeDasharray="3 6"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.4, ease: 'easeOut' }}
      />
      <motion.circle
        cx="30"
        cy="40"
        r="6"
        fill="rgb(var(--amber))"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.4, type: 'spring', stiffness: 300, damping: 18 }}
        style={{ transformOrigin: '30px 40px' }}
      />
      <motion.circle
        cx="30"
        cy="40"
        r="12"
        fill="none"
        stroke="rgb(var(--amber))"
        strokeOpacity="0.35"
        className="animate-breathe"
        style={{ transformOrigin: '30px 40px' }}
      />
      {[110, 210].map((x, i) => (
        <motion.circle
          key={x}
          cx={x}
          cy={i === 0 ? 60 : 92}
          r="5"
          fill="none"
          stroke="rgb(var(--line))"
          strokeWidth="2"
          strokeDasharray="2 3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 + i * 0.2 }}
        />
      ))}
    </svg>
  );
}
