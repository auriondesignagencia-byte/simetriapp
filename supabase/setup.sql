-- ============================================================================
-- SIMETRIAPP — configuração do Supabase
-- Rode este arquivo inteiro no SQL Editor do projeto, uma vez.
-- ============================================================================

-- 1. LISTA DE ACESSO ---------------------------------------------------------
-- Quem comprou. Só estes e-mails conseguem entrar e guardar dados.
create table if not exists public.acessos_liberados (
  email        text primary key,
  liberado_em  timestamptz not null default now(),
  nota         text
);

alter table public.acessos_liberados enable row level security;
-- Sem políticas: ninguém lê nem escreve pelo app. Você gerencia pelo painel do
-- Supabase, e a checagem passa pela função abaixo.

-- Responde apenas sim ou não. `security definer` deixa a função enxergar a
-- tabela sem que o navegador precise de permissão para lê-la — a lista de
-- compradores nunca chega ao cliente.
create or replace function public.email_liberado(endereco text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.acessos_liberados
    where email = lower(trim(endereco))
  );
$$;

grant execute on function public.email_liberado(text) to anon, authenticated;

-- 2. DADOS DO APP ------------------------------------------------------------
-- Uma linha por usuário. O app já trabalha com um objeto de estado só, então
-- guardá-lo inteiro em jsonb evita reescrever a aplicação para esta fase.
create table if not exists public.estado_app (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  dados         jsonb not null,
  atualizado_em timestamptz not null default now()
);

alter table public.estado_app enable row level security;

-- Cada um só enxerga a própria linha — e só se o e-mail continuar liberado.
-- Assim, tirar alguém da lista corta o acesso aos dados, não só ao login.
create policy "dono lê o próprio estado"
  on public.estado_app for select
  using (
    auth.uid() = user_id
    and public.email_liberado(auth.jwt() ->> 'email')
  );

create policy "dono cria o próprio estado"
  on public.estado_app for insert
  with check (
    auth.uid() = user_id
    and public.email_liberado(auth.jwt() ->> 'email')
  );

create policy "dono atualiza o próprio estado"
  on public.estado_app for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "dono apaga o próprio estado"
  on public.estado_app for delete
  using (auth.uid() = user_id);

-- Permissões da API. O projeto foi criado com "expor automaticamente novas
-- tabelas" DESLIGADO (recomendação do próprio Supabase), então cada tabela
-- precisa ser liberada de propósito. Só o usuário autenticado entra aqui;
-- `anon` não recebe nada além da função de checagem acima.
grant select, insert, update, delete on public.estado_app to authenticated;

-- Reforço: o role anônimo não precisa tocar nestas tabelas. A RLS já bloqueia
-- as linhas (uma consulta anônima volta vazia), mas revogar o privilégio faz a
-- resposta ser um erro de permissão em vez de uma lista vazia — uma camada a
-- menos de superfície exposta.
revoke all on public.acessos_liberados from anon;
revoke all on public.estado_app from anon;

-- 3. FOTOS -------------------------------------------------------------------
-- Bucket privado: nada é servido por URL pública. O app pede uma URL assinada,
-- válida por uma hora, toda vez que precisa exibir.
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', false)
on conflict (id) do nothing;

-- Cada usuário só mexe na própria pasta. O caminho é sempre "<user_id>/arquivo".
create policy "dono lê as próprias fotos"
  on storage.objects for select
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "dono envia as próprias fotos"
  on storage.objects for insert
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "dono apaga as próprias fotos"
  on storage.objects for delete
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================================
-- COMO LIBERAR UM CLIENTE
--   insert into public.acessos_liberados (email, nota)
--   values ('cliente@exemplo.com', 'Cakto 07/09');
--
-- COMO REVOGAR
--   delete from public.acessos_liberados where email = 'cliente@exemplo.com';
--   (o login para de funcionar e os dados deixam de ser lidos; nada é apagado)
-- ============================================================================
