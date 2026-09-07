import { Entrar } from './screens/Entrar';
import { NUVEM_ATIVA } from './lib/supabase';
import { useSessao } from './store/sessao';

/**
 * Decide se mostra o app ou a tela de entrada.
 *
 * Sem as chaves do Supabase configuradas, some do caminho: o app roda como antes,
 * só no aparelho. É o que mantém desenvolvimento e demonstração sem depender de
 * conta nem de rede.
 */
export function PortaDeEntrada({ children }: { children: React.ReactNode }) {
  const { sessao, carregando } = useSessao();

  if (!NUVEM_ATIVA) return <>{children}</>;

  // Enquanto lê a sessão salva. Piscar a tela de login para quem já está logado
  // seria pior do que um instante de tela vazia.
  if (carregando) return null;

  if (!sessao) return <Entrar />;

  return <>{children}</>;
}
