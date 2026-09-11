/**
 * Gera um link de entrada NA HORA, sem passar pelo e-mail.
 *
 * POR QUE EXISTE
 * O serviço de e-mail embutido do Supabase manda pouquíssimos e-mails por hora
 * — e o teto é do PROJETO inteiro, não por pessoa. Quando ele estoura, a
 * cliente que PAGOU vê "Muitos links foram pedidos agora há pouco" e não tem o
 * que fazer a não ser esperar. Este script contorna: pede o link direto à API
 * de administração (que não manda e-mail nenhum e não consome o teto) e imprime
 * o endereço pronto para você colar no WhatsApp dela.
 *
 * É a rede de segurança do atendimento enquanto o SMTP próprio não entra —
 * e continua útil depois, para quando o e-mail cair no spam.
 *
 * COMO USAR
 *   node tools/link-de-entrada.mjs cliente@exemplo.com
 *
 * A chave `service_role` precisa estar em `.env.webhook.local` (que o git
 * ignora), na linha:
 *   SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
 * Painel do Supabase → Project Settings → API Keys → service_role.
 *
 * ⚠️ Essa chave ignora todas as regras de segurança do banco. Ela fica só
 * nesta máquina e na Vercel. Nunca em print, mensagem ou commit.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Lê chave=valor de um .env sem depender de pacote nenhum. */
function lerEnv(arquivo) {
  try {
    return Object.fromEntries(
      readFileSync(resolve(raiz, arquivo), 'utf8')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#') && l.includes('='))
        .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
    );
  } catch {
    return {};
  }
}

const env = { ...lerEnv('.env'), ...lerEnv('.env.webhook.local'), ...process.env };

const url = env.SUPABASE_URL ?? env.VITE_SUPABASE_URL;
const chave = env.SUPABASE_SERVICE_ROLE_KEY;
const destino = env.APP_URL ?? 'https://simetriapp.vercel.app';
const email = (process.argv[2] ?? '').trim().toLowerCase();

if (!email) {
  console.error('Uso: node tools/link-de-entrada.mjs cliente@exemplo.com');
  process.exit(1);
}
if (!url) {
  console.error('Falta VITE_SUPABASE_URL no .env.');
  process.exit(1);
}
if (!chave) {
  console.error(
    'Falta SUPABASE_SERVICE_ROLE_KEY em .env.webhook.local.\n' +
      'Pegue em: Supabase → Project Settings → API Keys → service_role, e rode:\n' +
      "  echo 'SUPABASE_SERVICE_ROLE_KEY=cole_aqui' >> .env.webhook.local",
  );
  process.exit(1);
}

const cabecalho = { apikey: chave, Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' };

// Entrar sem estar na lista não adianta: as políticas do banco usam a MESMA
// lista, então a pessoa logaria para ver tela de erro. Melhor avisar aqui.
const naLista = await fetch(
  `${url}/rest/v1/acessos_liberados?email=eq.${encodeURIComponent(email)}&select=email`,
  { headers: cabecalho },
).then((r) => (r.ok ? r.json() : null));

if (Array.isArray(naLista) && naLista.length === 0) {
  console.error(
    `⚠️  ${email} NÃO está em acessos_liberados — o link vai funcionar, mas os dados ficam bloqueados.\n` +
      '   Confira o e-mail da compra na Cakto, ou insira na tabela antes.\n',
  );
}

const r = await fetch(`${url}/auth/v1/admin/generate_link`, {
  method: 'POST',
  headers: cabecalho,
  body: JSON.stringify({ type: 'magiclink', email, options: { redirect_to: destino } }),
});

if (!r.ok) {
  console.error('Falhou:', r.status, (await r.text()).slice(0, 300));
  process.exit(1);
}

const { action_link } = await r.json();
console.log('\nLink de entrada (vale 1 hora, uma vez só). Mande para a cliente:\n');
console.log(action_link + '\n');
