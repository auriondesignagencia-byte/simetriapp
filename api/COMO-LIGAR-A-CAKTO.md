# Ligar a Cakto ao app (SimetriApp)

Hoje a Cakto recebe o dinheiro e **ninguém avisa o app**. Quem compra fora do
seu horário vê *"Não encontramos uma compra com esse e-mail"* até você inserir
o e-mail à mão em `acessos_liberados`. Este endpoint acaba com isso.

O endereço **já está no ar e protegido por um token**. Falta uma coisa só: a
chave do Supabase que dá permissão de escrever na tabela.

> 🔑 **O token não está escrito aqui de propósito** — ele é a própria senha do
> webhook e este arquivo vai para o git. Para vê-lo:
> ```bash
> cd /Users/eduardomendes/Projetos/em-andamento/simetriapp
> vercel env pull .env.producao --environment production --scope auriondesignagencia-bytes-projects
> grep CAKTO_WEBHOOK_SECRET .env.producao
> rm .env.producao      # apague depois de copiar
> ```

---

## Passo 1 — pegar a chave secreta do Supabase

Painel do Supabase → projeto do **SimetriApp** → **Project Settings → API Keys**.
Copie a chave **`service_role`** (nas contas novas: `sb_secret_...`).

> ⚠️ Essa chave ignora todas as regras de segurança do banco. **Nunca** coloque
> dentro do app, no navegador, em print ou em mensagem. Ela vai só para a
> Vercel, onde fica no servidor.

## Passo 2 — colar na Vercel

```bash
cd /Users/eduardomendes/Projetos/em-andamento/simetriapp
vercel env add SUPABASE_SERVICE_ROLE_KEY production --scope auriondesignagencia-bytes-projects
# cole a chave quando pedir
vercel deploy --prod --yes --scope auriondesignagencia-bytes-projects
```

## Passo 3 — conferir

```bash
curl "https://simetriapp.vercel.app/api/cakto?token=SEU_TOKEN"
```

Tem que responder `{"ok":true,"supabaseConfigurado":true}`.
Se vier `false`, a chave não entrou.

## Passo 4 — cadastrar o webhook na Cakto

No painel da Cakto, em **Webhooks** (ou Integrações / Notificações), cadastre
para o evento de **compra aprovada**:

```
https://simetriapp.vercel.app/api/cakto?token=SEU_TOKEN
```

Se der para escolher mais eventos, marque também **reembolso/estorno**.

> 🔒 **Essa URL inteira é a senha.** Quem tiver ela libera acesso de graça.
> Não publique, não mande em grupo, não coloque em print.

## Passo 5 — a compra de teste (não pule)

Faça **uma compra de teste de verdade** na Cakto. Depois:

```bash
vercel logs https://simetriapp.vercel.app --scope auriondesignagencia-bytes-projects
```

- **`[cakto] acesso liberado`** → funcionou. Acabou.
- **`[cakto] evento nao reconhecido: <palavra>`** → a Cakto usa uma palavra que
  eu não previ. Resolve sem mexer em código:
  ```bash
  vercel env add CAKTO_EVENTOS_APROVACAO production --scope auriondesignagencia-bytes-projects
  # digite a palavra do log, ex.: pedido_pago
  vercel deploy --prod --yes --scope auriondesignagencia-bytes-projects
  ```
- **`[cakto] nenhum e-mail no payload`** → me mande as chaves do log e eu ajusto.

---

## O que o endpoint faz

| Situação | O que acontece |
|---|---|
| Compra aprovada | Insere o e-mail em `acessos_liberados` |
| Cakto reenvia a mesma compra | Atualiza, não duplica nem dá erro |
| Reembolso / estorno / chargeback | Remove o acesso |
| **Pagamento recusado** | **Ignora** — nunca houve acesso a tirar |
| **Assinatura cancelada** | **Ignora** por padrão |
| URL sem o token certo | 404, sem tocar no banco |

As duas linhas em negrito são escolha deliberada: **errar mantendo o acesso
custa alguns dias de app; errar tirando tranca uma cliente que está em dia** — e
é ela que reclama. Para revogar no cancelamento, use `CAKTO_EVENTOS_CANCELAMENTO`.
