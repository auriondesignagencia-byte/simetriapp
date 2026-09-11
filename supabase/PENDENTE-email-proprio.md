# O e-mail do login precisa sair do Supabase (bloqueia a venda)

O serviço de e-mail embutido do Supabase manda **2 e-mails por hora — no projeto
inteiro, não por pessoa**. Estourou hoje (11/09) no seu próprio teste, com uma
pessoa só usando. Com anúncio no ar, a terceira mãe que comprar na mesma hora
não recebe link nenhum e vê *"Muitos links foram pedidos agora há pouco"* logo
depois de pagar.

Não dá para levantar esse teto no painel enquanto o SMTP for o embutido: o campo
de rate limit só passa a aceitar número maior **depois** que existe SMTP próprio.

---

## Destravar AGORA (enquanto o teto está estourado)

Gera o link de entrada direto, sem passar pelo e-mail — não consome o teto:

```bash
cd ~/Projetos/em-andamento/simetriapp
echo 'SUPABASE_SERVICE_ROLE_KEY=cole_a_chave_aqui' >> .env.webhook.local
node tools/link-de-entrada.mjs eduardosmendes21@gmail.com
```

A chave está em **Supabase → Project Settings → API Keys → `service_role`**.
O arquivo `.env.webhook.local` é ignorado pelo git.

Serve para o atendimento também: cliente que não recebeu o e-mail (spam, teto,
e-mail errado), você gera o link e manda no WhatsApp. Vale 1 hora, uma vez só.

---

## Passo 1 — SMTP próprio (10 min, sem domínio)

Para a fase de validação, o Gmail resolve: 500 e-mails/dia, nenhuma configuração
de DNS.

1. Na conta Google do envio: **Segurança → Verificação em duas etapas** ligada →
   **Senhas de app** → gerar uma para "SimetriApp".
2. Supabase → **Authentication → Emails → SMTP Settings** → **Enable Custom SMTP**:
   - Host `smtp.gmail.com` · Port `465` · User: o e-mail · Password: a senha de app
   - Sender email: o mesmo e-mail · **Sender name: `SimetriApp`**
3. Logo abaixo, **Rate Limits → emails per hour**: subir de 2 para **100**.

Quando existir domínio próprio (ex.: `simetriapp.com.br`), trocar para o
**Resend** — 3.000 e-mails/mês de graça e remetente com a cara do produto. O
Gmail entrega bem, mas o remetente é pessoal.

---

## Passo 2 — o e-mail está EM INGLÊS

Hoje a mãe recebe *"Your sign-in link — Follow the link below to sign in"*,
assinado por **Supabase Auth**. Ela acabou de pagar num site em português: isso
parece golpe, e quem desconfia não clica.

Supabase → **Authentication → Emails → Templates → Magic Link**.

Assunto:

```
Seu link de entrada no SimetriApp
```

Corpo:

```html
<h2>Seu acesso ao SimetriApp</h2>

<p>Olá! É só tocar no botão abaixo para entrar — não precisa de senha.</p>

<p>
  <a href="{{ .ConfirmationURL }}"
     style="display:inline-block;background:#C39A2B;color:#fff;
            padding:14px 28px;border-radius:999px;
            font-family:system-ui,sans-serif;font-weight:600;
            text-decoration:none">
    Entrar no SimetriApp
  </a>
</p>

<p>O link vale por 1 hora e pode ser usado uma vez só. Se você pedir outro
link, este aqui deixa de valer — use sempre o e-mail mais recente.</p>

<p>Se não foi você que pediu, pode ignorar esta mensagem.</p>

<p style="color:#6b6b6b;font-size:13px">
  Dúvida? Chame no WhatsApp: (32) 98486-5656
</p>
```

Faça o mesmo no projeto do **Baby Calm** — o template de lá está igual.
