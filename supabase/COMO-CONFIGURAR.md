# Conta do cliente — como ligar (Simetriapp)

Enquanto as duas chaves abaixo não estiverem preenchidas, **o app funciona como
sempre funcionou**: tudo no aparelho, sem tela de login. Nada quebra por estar
sem configuração.

## 1. Criar o projeto no Supabase

1. Entre em **supabase.com** e crie uma conta (o plano gratuito atende).
2. **New project** → dê o nome `simetriapp` → escolha a região **South America (São Paulo)** → crie.
3. Guarde a senha do banco que ele pedir (você não vai precisar dela agora, mas não dá para recuperar depois).

Leva uns dois minutos para o projeto ficar pronto.

## 2. Criar as tabelas

1. No menu lateral, abra **SQL Editor** → **New query**.
2. Abra o arquivo `supabase/setup.sql` desta pasta, copie **tudo** e cole lá.
3. Clique em **Run**.

Deve aparecer "Success". Isso cria a lista de compradores, a tabela de dados e o espaço das fotos.

## 3. Pegar as duas chaves

No menu lateral: **Project Settings** → **API**. Copie:

- **Project URL** → vai em `VITE_SUPABASE_URL`
- **anon public** (a chave longa, marcada como `anon`) → vai em `VITE_SUPABASE_ANON_KEY`

> A outra chave, `service_role`, **nunca** deve entrar no app. Ela ignora todas
> as regras de segurança. Só use no painel do Supabase.

## 4. Colocar as chaves

**No seu computador:** crie o arquivo `.env` na raiz do projeto com:

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

**Na Vercel** (é o que vale para os clientes): painel do projeto →
**Settings → Environment Variables** → adicione as duas, em **Production**.
Depois **Deployments → … → Redeploy**, porque variável só passa a valer em um
deploy novo.

## 5. Liberar um cliente que comprou

No Supabase: **Table Editor** → tabela `acessos_liberados` → **Insert row** →
coloque o e-mail (o mesmo da compra) e, em `nota`, algo como "Cakto 07/09".

Ou pelo **SQL Editor**:

```sql
insert into public.acessos_liberados (email, nota)
values ('cliente@exemplo.com', 'Cakto 07/09');
```

A partir daí, esse e-mail entra no app. Quem não estiver na lista vê:
*"Não encontramos uma compra com esse e-mail."*

## Para tirar o acesso de alguém

```sql
delete from public.acessos_liberados where email = 'cliente@exemplo.com';
```

O login para de funcionar **e** os dados deixam de ser lidos. Nada é apagado —
se você recolocar o e-mail, o histórico volta.

## O que acontece com quem já usa o app hoje

Na primeira vez que a pessoa entrar com a conta, o que estiver no aparelho dela
é enviado para a nuvem automaticamente. Ninguém perde histórico.
