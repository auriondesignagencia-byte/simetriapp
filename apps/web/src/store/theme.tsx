import { createContext, useCallback, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
const KEY = 'simetriapp.theme';

const Ctx = createContext<{ theme: Theme; toggle: () => void; set: (t: Theme) => void } | null>(
  null,
);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem(KEY) as Theme | null;
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(KEY, theme);
    // A barra de status do PWA instalado tem que acompanhar o tema, senão fica
    // uma faixa branca no topo do app escuro.
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#1A1815' : '#FDFCFA');
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);

  return (
    <Ctx.Provider value={{ theme, toggle, set: setTheme }}>{children}</Ctx.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTheme precisa estar dentro de <ThemeProvider>');
  return ctx;
}
