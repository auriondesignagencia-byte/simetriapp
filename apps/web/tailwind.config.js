/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    // Escala tipográfica FECHADA. Substituir (em vez de estender) é intencional:
    // remove text-sm/text-base/text-lg do vocabulário, então ninguém consegue
    // introduzir um tamanho fora da escala 12/14/16/20/24/32/40 sem perceber.
    fontSize: {
      12: ['0.75rem', { lineHeight: '1.125rem', letterSpacing: '0.01em' }],
      14: ['0.875rem', { lineHeight: '1.375rem' }],
      16: ['1rem', { lineHeight: '1.625rem' }],
      20: ['1.25rem', { lineHeight: '1.875rem', letterSpacing: '-0.01em' }],
      24: ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.015em' }],
      32: ['2rem', { lineHeight: '2.5rem', letterSpacing: '-0.02em' }],
      40: ['2.5rem', { lineHeight: '2.875rem', letterSpacing: '-0.025em' }],
    },
    extend: {
      colors: {
        // Tudo via CSS var para o dark mode trocar o TOKEN, não a classe.
        // Nenhum componente precisa saber que dark mode existe.
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        raised: 'rgb(var(--raised) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',

        amber: {
          DEFAULT: 'rgb(var(--amber) / <alpha-value>)',
          soft: 'rgb(var(--amber-soft) / <alpha-value>)',
          ink: 'rgb(var(--amber-ink) / <alpha-value>)',
        },
        sage: {
          DEFAULT: 'rgb(var(--sage) / <alpha-value>)',
          soft: 'rgb(var(--sage-soft) / <alpha-value>)',
          ink: 'rgb(var(--sage-ink) / <alpha-value>)',
        },
        terra: {
          DEFAULT: 'rgb(var(--terra) / <alpha-value>)',
          soft: 'rgb(var(--terra-soft) / <alpha-value>)',
          ink: 'rgb(var(--terra-ink) / <alpha-value>)',
        },
        sky: {
          DEFAULT: 'rgb(var(--sky) / <alpha-value>)',
          soft: 'rgb(var(--sky-soft) / <alpha-value>)',
          ink: 'rgb(var(--sky-ink) / <alpha-value>)',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        card: '20px',
        lg: '16px',
        xl: '24px',
        pill: '999px',
      },
      // Sombras difusas em camadas. Nunca uma sombra dura de 1px preta —
      // a sensação é papel flutuando sobre papel, não caixa sobre fundo.
      boxShadow: {
        rest: '0 1px 2px rgb(var(--shadow) / 0.04), 0 4px 16px -6px rgb(var(--shadow) / 0.08)',
        lift: '0 2px 6px rgb(var(--shadow) / 0.05), 0 12px 32px -10px rgb(var(--shadow) / 0.14)',
        float: '0 8px 20px -6px rgb(var(--shadow) / 0.10), 0 24px 56px -18px rgb(var(--shadow) / 0.20)',
        inset: 'inset 0 1px 0 rgb(255 255 255 / 0.5)',
      },
      spacing: {
        // Grid de 4px. Os nomes são os múltiplos que o Tailwind já dá; aqui só
        // completamos os buracos que a escala padrão não cobre.
        13: '3.25rem',
        18: '4.5rem',
        22: '5.5rem',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'breathe': {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.6' },
          '50%': { transform: 'scale(1.06)', opacity: '0.9' },
        },
      },
      animation: {
        'fade-up': 'fade-up 300ms cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 1.6s infinite',
        breathe: 'breathe 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
