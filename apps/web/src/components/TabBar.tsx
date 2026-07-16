import { motion } from 'framer-motion';
import { BookOpen, Camera, Home, TrendingUp, User } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '@/store/app';
import { cn } from '@/lib/cn';

const TABS = [
  { to: '/', icon: Home, label: 'Início' },
  { to: '/evolucao', icon: TrendingUp, label: 'Evolução' },
  { to: null, icon: Camera, label: 'Foto' },
  { to: '/biblioteca', icon: BookOpen, label: 'Conteúdo' },
  { to: '/perfil', icon: User, label: 'Perfil' },
] as const;

export function TabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { derived } = useApp();

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-1/2 -translate-x-1/2 z-40 w-full max-w-[520px]',
        'glass border-t border-x-0 border-b-0',
        'pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 px-2',
      )}
      aria-label="Navegação principal"
    >
      <ul className="flex items-end justify-around">
        {TABS.map((tab) => {
          if (!tab.to) {
            // O botão de captura não é uma aba: é a ação central do produto, e o
            // desenho precisa dizer isso antes de qualquer copy.
            return (
              <li key="capture" className="flex-1 flex justify-center">
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                  onClick={() =>
                    navigate(derived.hasAccess ? '/captura' : '/paywall?from=captura')
                  }
                  aria-label="Tirar foto da semana"
                  className={cn(
                    'relative -mt-6 grid place-items-center w-14 h-14 rounded-pill',
                    'bg-amber text-white shadow-float',
                    'transition-[filter] hover:brightness-105',
                  )}
                >
                  {derived.isPhotoDay && derived.hasAccess && (
                    <span className="absolute inset-0 rounded-pill bg-amber/40 animate-breathe" />
                  )}
                  <Camera size={22} className="relative" />
                </motion.button>
              </li>
            );
          }

          const active =
            tab.to === '/' ? location.pathname === '/' : location.pathname.startsWith(tab.to);
          const Icon = tab.icon;

          return (
            <li key={tab.to} className="flex-1">
              <NavLink
                to={tab.to}
                className={cn(
                  'relative flex flex-col items-center gap-1 py-1.5 rounded-lg',
                  'transition-colors duration-200',
                  active ? 'text-amber-ink' : 'text-muted hover:text-ink',
                )}
              >
                {active && (
                  <motion.span
                    layoutId="tab-pill"
                    transition={{ type: 'spring', stiffness: 480, damping: 34 }}
                    className="absolute inset-x-2 inset-y-0 -z-10 rounded-lg bg-amber-soft"
                  />
                )}
                <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
