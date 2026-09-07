import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente do Supabase.
 *
 * Enquanto as chaves não estiverem no ambiente, `supabase` é null e o app
 * continua funcionando exatamente como antes: tudo no aparelho, sem conta. Isso
 * mantém o desenvolvimento e a demonstração rodando sem depender de rede, e
 * evita que uma configuração faltando derrube o app na mão de um cliente.
 */

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const NUVEM_ATIVA = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = NUVEM_ATIVA
  ? createClient(url as string, anonKey as string, {
      auth: {
        // O link mágico volta com a sessão na URL; o cliente troca por um token
        // e limpa o endereço sozinho.
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
        flowType: 'pkce',
      },
    })
  : null;

/** Bucket onde ficam as fotos, uma pasta por usuário. */
export const BUCKET_FOTOS = 'fotos';
