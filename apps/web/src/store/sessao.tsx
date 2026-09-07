import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { NUVEM_ATIVA, supabase } from '@/lib/supabase';

interface SessaoContexto {
  sessao: Session | null;
  /** true enquanto ainda não sabemos se há sessão salva. */
  carregando: boolean;
  sair: () => Promise<void>;
}

const Ctx = createContext<SessaoContexto | null>(null);

/**
 * Sessão do usuário.
 *
 * Sem as chaves do Supabase no ambiente, `carregando` já nasce falso e `sessao`
 * fica nula para sempre — o app roda como antes, no aparelho, sem tela de login.
 * Isso mantém o desenvolvimento e a demonstração funcionando offline.
 */
export function SessaoProvider({ children }: { children: React.ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null);
  const [carregando, setCarregando] = useState(NUVEM_ATIVA);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session);
      setCarregando(false);
    });

    // Cobre o retorno do link mágico e a expiração do token.
    const { data: assinatura } = supabase.auth.onAuthStateChange((_evento, nova) => {
      setSessao(nova);
      setCarregando(false);
    });

    return () => assinatura.subscription.unsubscribe();
  }, []);

  const value = useMemo<SessaoContexto>(
    () => ({
      sessao,
      carregando,
      sair: async () => {
        await supabase?.auth.signOut();
      },
    }),
    [sessao, carregando],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSessao() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSessao precisa estar dentro de SessaoProvider');
  return ctx;
}
