# E-mail do login — CONFIGURADO em 11/09/2026 ✅

> Este arquivo era a pendência que bloqueava a venda. **Está resolvida.** Fica
> como registro do que foi feito e do que ainda pode melhorar.

## O que está valendo hoje

| | |
|---|---|
| Envio | SMTP próprio: **Gmail do Eduardo** (`smtp.gmail.com`, porta 465) |
| Remetente | **SimetriApp** `<eduardosmendes21@gmail.com>` |
| Teto | **100 e-mails/hora** (era 2) |
| E-mail | Em **português**, com botão dourado e o WhatsApp do suporte |

Verificado na hora: dois envios seguidos responderam `200` — antes, o segundo
sempre dava `429`.

⚠️ **A senha de app passou por uma conversa de chat.** Quando der, apague em
`myaccount.google.com/apppasswords`, gere outra e troque só o campo Senha no
Supabase. Nada mais muda.

⚠️ **Falta fazer o MESMO no projeto do Baby Calm** — ele continua com o teto de
2/hora e o e-mail em inglês.

## O que ainda melhora (não urgente)

O painel avisa que o Gmail é "para e-mail pessoal, não transacional": a entrega
funciona, mas em volume alto cai mais em spam, e o remetente é um `@gmail.com`.
Quando existir domínio próprio (`simetriapp.com.br`), migrar para o **Resend**
com algo como `acesso@simetriapp.com.br` — 3.000/mês de graça.

---

# Como foi feito (referência)

## Passo 1 — SMTP próprio (a senha é o Dr. Diego que gera)

**Decidido em 11/09: o remetente é o e-mail do Dr. Diego.** Ele é quem vende e
quem a cliente reconhece — o e-mail chega minutos depois de ela pagar, então o
remetente ser um desconhecido custa cliques.

⚠️ **Descoberto no painel em 11/09: o template do e-mail SÓ fica editável depois
que o SMTP próprio estiver ligado.** ("Set up custom SMTP to edit templates".)
Ou seja, o Passo 2 depende deste. Não dá para fazer na ordem inversa.

### O que o Dr. Diego precisa fazer (mandar isto para ele)

1. Entrar em **myaccount.google.com** com o e-mail dele.
2. **Segurança** → ligar a **Verificação em duas etapas**, se não estiver ligada
   (sem ela o Google não deixa criar a senha do passo seguinte).
3. Na busca do topo, procurar **"Senhas de app"** → criar uma com o nome
   `SimetriApp`.
4. O Google mostra **16 letras** em quatro blocos. Mandar para o Eduardo — vale
   só para este uso e pode ser apagada a qualquer momento no mesmo lugar.

> Se a conta dele for Google Workspace da empresa, o administrador pode ter
> bloqueado senhas de app. Nesse caso o caminho é o **Resend** com domínio
> próprio.

### O que o Eduardo preenche

Supabase → projeto `simetriapp` → **Authentication → Emails → SMTP Settings** →
liga **Enable custom SMTP**:

| Campo | Valor |
|---|---|
| Sender email | o e-mail do Dr. Diego |
| **Sender name** | **SimetriApp** |
| Host | `smtp.gmail.com` |
| Port | `465` |
| Username | o mesmo e-mail do Dr. Diego |
| Password | as 16 letras da senha de app (sem espaços) |

Depois, em **Rate Limits → emails per hour**: subir de **2 para 100**.

Repetir tudo no projeto do **Baby Calm**, que tem o mesmo teto.

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
