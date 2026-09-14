import crypto from 'node:crypto';

/**
 * Webhook da Cakto → libera o acesso do comprador automaticamente.
 *
 * O PROBLEMA QUE ISTO RESOLVE
 * Sem este endpoint, a Cakto recebe o dinheiro e ninguém avisa o app. Quem
 * decide quem entra é a tabela `acessos_liberados`, e ela só mudava quando
 * alguém digitava o e-mail à mão no painel do Supabase. Quem comprava de
 * madrugada via "Não encontramos uma compra com esse e-mail" até o Eduardo
 * acordar — logo depois de pagar, que é quando a vontade de usar é maior e a
 * paciência para esperar é menor.
 *
 * COMO PROTEGE
 * O segredo está na PRÓPRIA URL (?token=...). Isso funciona com qualquer
 * plataforma, sem depender do esquema de assinatura dela. Quem não souber o
 * token recebe 404 — de propósito: 401 confirmaria que o endereço existe.
 *
 * NÃO devolve nada do banco em resposta nenhuma. A única coisa que este
 * arquivo faz no Supabase é inserir/remover uma linha de `acessos_liberados`.
 */

/**
 * Confirmado no painel da Cakto em 10/09/2026 — o payload real é:
 *
 *   { "secret": "<uuid>",
 *     "event": "purchase_approved",
 *     "data": [ { "id": ..., "refId": ...,
 *                 "customer": { "name": ..., "email": ..., "phone": ... } } ] }
 *
 * Repare que `data` é um ARRAY (modo de disparo "Agrupado": um evento por
 * venda, com todos os itens). A busca recursiva abaixo atravessa arrays porque
 * `Object.values` de um array devolve os elementos.
 *
 * Eventos que a Cakto oferece: Boleto gerado, Pix gerado, Compra aprovada,
 * Compra recusada, Reembolso, Chargeback, Assinatura criada/cancelada/renovada,
 * Abandono de Checkout, PicPay gerado, Nubank gerado.
 * Assinados neste webhook: **Compra aprovada, Reembolso, Chargeback**.
 */
const APROVACAO = [
  'aprovad', 'approved', 'paid', 'pago', 'pagamento_aprovado', 'purchase_approved',
  'compra_aprovada', 'venda_aprovada', 'completed', 'concluid', 'authorized',
];

/**
 * SÓ tira o acesso quem já pagou e teve o dinheiro devolvido.
 *
 * "recusado", "expirado" e "aguardando" ficam de fora de propósito: significam
 * que o pagamento NUNCA aconteceu, então não há acesso a tirar. Se estivessem
 * aqui, uma segunda cobrança recusada (renovação, cartão vencido, tentativa de
 * outro produto) apagaria o acesso de uma cliente que está em dia.
 *
 * "cancelado" também fica de fora por padrão: em assinatura costuma significar
 * "não renova mais", e o acesso deveria durar até o fim do período pago —
 * cortar na hora tira o app de quem ainda pagou por ele. Para revogar no
 * cancelamento, ponha a palavra em CAKTO_EVENTOS_CANCELAMENTO.
 *
 * Errar para o lado de MANTER o acesso custa alguns dias de app. Errar para o
 * lado de TIRAR tranca uma cliente pagante para fora — e é ela que reclama.
 */
const CANCELAMENTO = ['reembols', 'refund', 'estorno', 'chargeback', 'disputa', 'dispute'];

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Compara sem vazar o tamanho pelo tempo de resposta. */
function segredoConfere(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Procura o e-mail em qualquer lugar do payload.
 *
 * Deliberadamente tolerante: cada plataforma nomeia esse campo de um jeito
 * (`email`, `customer.email`, `buyer_email`, `data.customer.email`...). Chave
 * que contém "email" ganha prioridade; se não houver, vale o primeiro valor
 * que se pareça com um e-mail.
 */
function acharEmail(obj, preferido = true, profundidade = 0) {
  if (!obj || typeof obj !== 'object' || profundidade > 6) return null;
  for (const [chave, valor] of Object.entries(obj)) {
    if (typeof valor === 'string' && RE_EMAIL.test(valor.trim())) {
      if (!preferido || /e-?mail/i.test(chave)) return valor.trim().toLowerCase();
    }
  }
  for (const valor of Object.values(obj)) {
    const achado = acharEmail(valor, preferido, profundidade + 1);
    if (achado) return achado;
  }
  return null;
}

/** Junta os campos que costumam carregar o status, para casar por palavra. */
function textoDeEvento(obj, profundidade = 0) {
  if (!obj || typeof obj !== 'object' || profundidade > 6) return '';
  let txt = '';
  for (const [chave, valor] of Object.entries(obj)) {
    if (typeof valor === 'string' && /status|event|tipo|type|situa|acao|action/i.test(chave)) {
      txt += ' ' + valor;
    } else if (valor && typeof valor === 'object') {
      txt += textoDeEvento(valor, profundidade + 1);
    }
  }
  return txt.toLowerCase();
}

function corpoComoObjeto(req) {
  const b = req.body;
  if (!b) return {};
  if (typeof b === 'object') return b;
  if (typeof b === 'string') {
    try {
      return JSON.parse(b);
    } catch {
      return Object.fromEntries(new URLSearchParams(b));
    }
  }
  return {};
}

async function supabase(caminho, opcoes) {
  const url = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return fetch(`${url}/rest/v1/${caminho}`, {
    ...opcoes,
    headers: {
      apikey: chave,
      Authorization: `Bearer ${chave}`,
      'Content-Type': 'application/json',
      ...(opcoes?.headers ?? {}),
    },
  });
}

/**
 * ═══ Conversions API da Meta: a compra, mandada do SERVIDOR ═══
 *
 * POR QUE ISTO EXISTE
 * O pixel no navegador só dispara a compra se a pessoa CHEGAR numa página de
 * aprovado. No Pix ela sai do navegador, paga no app do banco e muitas vezes
 * não volta — então o evento simplesmente não acontece. Medido em 14/09: a
 * compra por Pix liberou o acesso normalmente e a Meta não registrou nada.
 *
 * Aqui o evento sai daqui, do momento em que a Cakto CONFIRMA o pagamento.
 * Não depende de navegador aberto, de cookie nem de bloqueador de anúncio.
 *
 * DESLIGADO por padrão: sem META_PIXEL_ID e META_CAPI_TOKEN no ambiente, a
 * função não faz nada e o webhook segue igual. Falha aqui NUNCA derruba a
 * liberação de acesso — quem pagou entra no app mesmo que a Meta esteja fora.
 */
const sha256 = (txt) => crypto.createHash('sha256').update(String(txt).trim().toLowerCase()).digest('hex');

/** Procura o valor pago no payload, sem depender do nome exato do campo. */
function acharValor(obj, profundidade = 0) {
  if (!obj || typeof obj !== 'object' || profundidade > 6) return null;
  for (const [chave, valor] of Object.entries(obj)) {
    if (!/amount|valor|total|price|preco|pre_o/i.test(chave)) continue;
    const n = typeof valor === 'number' ? valor : parseFloat(String(valor).replace(',', '.'));
    // Centavos: plataforma nenhuma cobra R$ 4.990,00 por app de bebê.
    if (Number.isFinite(n) && n > 0) return n > 1000 ? n / 100 : n;
  }
  for (const valor of Object.values(obj)) {
    const achado = acharValor(valor, profundidade + 1);
    if (achado) return achado;
  }
  return null;
}

/**
 * Identificador do pedido — é o que evita contar a mesma compra duas vezes.
 *
 * A ordem das chaves é deliberada e foi o que um teste pegou: o payload da
 * Cakto traz `id: 99` (um número interno, pequeno, que pode repetir entre
 * produtos) ANTES de `refId: '5TPgzUM'`, que é o código do pedido mostrado ao
 * comprador e no painel. Varrendo na ordem do objeto, vinha o `id` — e dois
 * pedidos diferentes com o mesmo `id` seriam tratados como a mesma compra pela
 * Meta, sumindo com uma venda do relatório. Por isso `id` é o ÚLTIMO recurso.
 */
function acharPedido(obj, profundidade = 0) {
  const preferencia = [/^refid$/i, /^(order_?id|transaction_?id|codigo|code)$/i, /^ref$/i, /^id$/i];

  const varrer = (o, teste, prof = 0) => {
    if (!o || typeof o !== 'object' || prof > 6) return null;
    for (const [chave, valor] of Object.entries(o)) {
      if (teste.test(chave) && (typeof valor === 'string' || typeof valor === 'number')) {
        return String(valor);
      }
    }
    for (const valor of Object.values(o)) {
      const achado = varrer(valor, teste, prof + 1);
      if (achado) return achado;
    }
    return null;
  };

  for (const teste of preferencia) {
    const achado = varrer(obj, teste, profundidade);
    if (achado) return achado;
  }
  return null;
}

async function avisarMeta({ email, valor, pedido }) {
  const pixel = process.env.META_PIXEL_ID;
  const token = process.env.META_CAPI_TOKEN;
  if (!pixel || !token) return { enviado: false, motivo: 'sem META_PIXEL_ID/META_CAPI_TOKEN' };

  const evento = {
    event_name: 'Purchase',
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'website',
    event_source_url: process.env.META_EVENT_SOURCE_URL || 'https://landing-bebe.vercel.app/',
    // Mesmo pedido = mesmo id. A Cakto REENVIA o webhook quando não recebe 2xx,
    // e sem isto cada reenvio viraria outra compra no relatório.
    ...(pedido ? { event_id: `cakto_${pedido}` } : {}),
    // O e-mail vai embaralhado (sha256). A Meta casa a pessoa sem nunca receber
    // o endereço — é o que a política dela exige e o que é decente fazer com o
    // dado de quem comprou.
    user_data: { em: [sha256(email)] },
    custom_data: { currency: 'BRL', ...(valor ? { value: valor } : {}) },
  };

  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${pixel}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [evento],
        access_token: token,
        ...(process.env.META_TEST_EVENT_CODE ? { test_event_code: process.env.META_TEST_EVENT_CODE } : {}),
      }),
    });
    const corpo = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error('[meta] recusou:', r.status, JSON.stringify(corpo).slice(0, 300));
      return { enviado: false, motivo: `http ${r.status}` };
    }
    console.log('[meta] compra enviada', JSON.stringify({ recebidos: corpo.events_received ?? null, pedido }));
    return { enviado: true };
  } catch (erro) {
    console.error('[meta] falhou:', String(erro).slice(0, 200));
    return { enviado: false, motivo: 'excecao' };
  }
}

export default async function handler(req, res) {
  const esperado = process.env.CAKTO_WEBHOOK_SECRET;
  const recebido = String(req.query?.token ?? '');

  // Sem segredo configurado o endpoint fica FECHADO. Um webhook aberto deixaria
  // qualquer pessoa que descobrisse a URL se dar acesso vitalício de graça.
  if (!esperado || !segredoConfere(recebido, esperado)) {
    return res.status(404).json({ erro: 'nao encontrado' });
  }

  if (req.method === 'GET') {
    // Teste de configuração: confirma token e variáveis sem tocar no banco.
    return res.status(200).json({
      ok: true,
      supabaseConfigurado: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ erro: 'use POST' });

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[cakto] faltam SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
    return res.status(500).json({ erro: 'servidor sem configuracao' });
  }

  const corpo = corpoComoObjeto(req);
  const email = acharEmail(corpo, true) ?? acharEmail(corpo, false);
  const evento = textoDeEvento(corpo) || JSON.stringify(corpo).slice(0, 400).toLowerCase();

  if (!email) {
    // Loga as CHAVES, não os valores: o payload traz dado pessoal do comprador.
    console.error('[cakto] nenhum e-mail no payload. chaves:', Object.keys(corpo).join(','));
    return res.status(400).json({ erro: 'e-mail nao encontrado no payload' });
  }

  const extras = (process.env.CAKTO_EVENTOS_APROVACAO ?? '')
    .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

  const extrasCancel = (process.env.CAKTO_EVENTOS_CANCELAMENTO ?? '')
    .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

  const aprovou = [...APROVACAO, ...extras].some((p) => evento.includes(p));
  const cancelou = [...CANCELAMENTO, ...extrasCancel].some((p) => evento.includes(p));

  // Aprovação vence: um mesmo payload pode conter "cancelamento" numa lista de
  // status possíveis e ainda assim ser uma compra aprovada.
  if (!aprovou && !cancelou) {
    // Não liberar por padrão é a escolha segura — mas ficar mudo seria pior:
    // se a Cakto usar uma palavra fora da lista, NINGUÉM entraria e o motivo
    // não apareceria em lugar nenhum. Por isso o evento vai para o log.
    console.warn('[cakto] evento nao reconhecido:', evento.slice(0, 200));
    return res.status(200).json({
      ok: true,
      acao: 'ignorado',
      motivo: 'evento nao reconhecido',
      dica: 'adicione a palavra do status em CAKTO_EVENTOS_APROVACAO',
      eventoRecebido: evento.slice(0, 200),
    });
  }

  if (aprovou) {
    // ignore-duplicates, NÃO merge-duplicates. A Cakto reenvia o webhook quando
    // não recebe 2xx e o mesmo comprador pode chegar várias vezes, então o
    // reenvio não pode dar erro — mas `merge` vira ON CONFLICT DO UPDATE e passa
    // a exigir permissão de UPDATE na tabela. `ignore` vira DO NOTHING e se
    // basta com INSERT. Menos privilégio para o mesmo resultado: quem já está
    // liberado continua liberado. (Medido em 10/09: com merge, o SimetriApp
    // devolvia 42501 pedindo GRANT UPDATE.)
    const r = await supabase('acessos_liberados', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify({ email, nota: `Cakto ${new Date().toISOString().slice(0, 10)}` }),
    });
    if (!r.ok) {
      console.error('[cakto] falha ao liberar:', r.status, (await r.text()).slice(0, 200));
      return res.status(500).json({ erro: 'falha ao liberar' });
    }
    console.log('[cakto] acesso liberado');

    // Depois de liberar, nunca antes: se a Meta estiver fora do ar, quem pagou
    // já entrou no app. O await é de propósito — a função serverless morre no
    // return e um envio solto seria cortado no meio.
    const meta = await avisarMeta({
      email,
      valor: acharValor(corpo),
      pedido: acharPedido(corpo),
    });

    return res.status(200).json({ ok: true, acao: 'liberado', meta: meta.enviado });
  }

  const r = await supabase(`acessos_liberados?email=eq.${encodeURIComponent(email)}`, {
    method: 'DELETE',
    headers: { Prefer: 'return=minimal' },
  });
  if (!r.ok) {
    console.error('[cakto] falha ao remover:', r.status, (await r.text()).slice(0, 200));
    return res.status(500).json({ erro: 'falha ao remover' });
  }
  console.log('[cakto] acesso removido');
  return res.status(200).json({ ok: true, acao: 'removido' });
}
