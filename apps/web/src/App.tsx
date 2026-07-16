import { AnimatePresence, motion } from 'framer-motion';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useApp } from './store/app';
import { TabBar } from './components/TabBar';
import { Onboarding } from './screens/Onboarding';
import { Home } from './screens/Home';
import { Capture } from './screens/Capture';
import { Evolution } from './screens/Evolution';
import { Library } from './screens/Library';
import { Profile } from './screens/Profile';
import { Notifications } from './screens/Notifications';
import { Report } from './screens/Report';
import { Paywall } from './screens/Paywall';
import { ProfessionalPanel } from './screens/ProfessionalPanel';

/** Rotas onde a tab bar atrapalha: fluxos imersivos e de tela cheia. */
const IMMERSIVE = ['/captura', '/onboarding', '/paywall', '/relatorio', '/profissional'];

export function App() {
  const location = useLocation();
  const { state } = useApp();

  const immersive = IMMERSIVE.some((p) => location.pathname.startsWith(p));

  // Duas superfícies não herdam o shell mobile do app da mãe:
  // o painel do profissional (outro produto, outro login, outra largura) e o
  // relatório (que é uma FOLHA — espremê-lo em 520px corta a tabela e ele existe
  // justamente para ser impresso e lido no consultório).
  if (location.pathname.startsWith('/profissional')) {
    return (
      <Routes>
        <Route path="/profissional/*" element={<ProfessionalPanel />} />
      </Routes>
    );
  }

  if (location.pathname.startsWith('/relatorio')) {
    return (
      <Routes>
        <Route path="/relatorio" element={<Report />} />
      </Routes>
    );
  }

  if (!state.onboarded && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div className="min-h-dvh bg-canvas">
      <div className="mx-auto w-full max-w-[520px] min-h-dvh relative">
        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            key={location.pathname.split('/')[1] || 'home'}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className={immersive ? '' : 'pb-24'}
          >
            <Routes location={location}>
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/" element={<Home />} />
              <Route path="/captura" element={<Capture />} />
              <Route path="/evolucao" element={<Evolution />} />
              <Route path="/biblioteca" element={<Library />} />
              <Route path="/biblioteca/:id" element={<Library />} />
              <Route path="/perfil" element={<Profile />} />
              <Route path="/notificacoes" element={<Notifications />} />
              <Route path="/paywall" element={<Paywall />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </motion.main>
        </AnimatePresence>

        {!immersive && <TabBar />}
      </div>
    </div>
  );
}
