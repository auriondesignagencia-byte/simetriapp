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

/**
 * Erro que veio no endereço quando o link do e-mail falhou.
 *
 * Precisa ser lido AQUI, antes de `createClient`: o cliente examina a URL ao
 * iniciar e a limpa em seguida. Ler depois, dentro de um componente, é tarde —
 * e era exatamente por isso que um link inválido devolvia a tela de "Entrar"
 * em branco, sem uma palavra explicando o que houve. Para quem acabou de
 * PAGAR, essa tela muda parece o app engolindo a compra.
 */
function lerErroDoLink(): string | null {
  if (typeof window === 'undefined') return null;

  // O Supabase manda o erro ora no # (link mágico), ora no ? (troca de código).
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const busca = new URLSearchParams(window.location.search);
  const campo = (nome: string) => hash.get(nome) ?? busca.get(nome);

  const codigo = campo('error_code');
  const erro = campo('error');
  if (!codigo && !erro) return null;

  // Vale para link já usado, link vencido e link antigo que foi invalidado por
  // um pedido mais novo — os três chegam como otp_expired/access_denied e são,
  // do ponto de vista de quem clicou, o mesmo problema com a mesma saída.
  if (/expired|access_denied|invalid/i.test(`${codigo} ${erro}`)) {
    return 'Esse link não vale mais — ou já foi aberto uma vez, ou você pediu outro depois dele (o novo cancela o anterior). Peça um link novo aqui embaixo e abra sempre o e-mail MAIS RECENTE.';
  }

  const descricao = campo('error_description');
  return descricao
    ? `Não foi possível entrar com esse link (${descricao}). Peça um novo aqui embaixo.`
    : 'Não foi possível entrar com esse link. Peça um novo aqui embaixo.';
}

export const ERRO_DO_LINK = NUVEM_ATIVA ? lerErroDoLink() : null;

export const supabase: SupabaseClient | null = NUVEM_ATIVA
  ? createClient(url as string, anonKey as string, {
      auth: {
        // O link mágico volta com a sessão na URL; o cliente troca por um token
        // e limpa o endereço sozinho.
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
        // IMPLÍCITO, não PKCE — e isso é o que faz o link funcionar na mão da
        // cliente. O PKCE guarda um segredo no navegador que PEDIU o link e só
        // aceita o link se ele for aberto NESSE MESMO navegador. Só que o
        // caminho real é: a mãe pede o link no celular, o link abre dentro do
        // app do Gmail (outro navegador), o segredo não está lá — e ela cai de
        // volta na tela de entrar, sem erro nenhum, achando que perdeu o
        // dinheiro. No fluxo implícito a sessão vem pronta no endereço e entra
        // em qualquer navegador que abrir o link.
        flowType: 'implicit',
      },
    })
  : null;

/** Bucket onde ficam as fotos, uma pasta por usuário. */
export const BUCKET_FOTOS = 'fotos';
