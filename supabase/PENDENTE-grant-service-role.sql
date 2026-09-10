-- ─────────────────────────────────────────────────────────────────────────────
-- COLE ISTO NO SQL EDITOR DO PROJETO simetriapp (ojvvcqygawwtrbkbbgci)
--
-- Sem isto o webhook da Cakto não consegue liberar acesso: o Supabase responde
--   42501  permission denied for table acessos_liberados
--
-- Por que só aqui e não no Baby Calm: este projeto foi criado com "expor novas
-- tabelas automaticamente" DESLIGADO, então os privilégios padrão das roles da
-- API nunca foram concedidos nesta tabela.
--
-- Detalhe que engana: a chave `service_role` ignora RLS, mas NÃO ignora GRANT
-- de tabela. Por isso ela passa nas políticas e ainda assim é barrada aqui.
--
-- Seguro: `service_role` só existe do lado do servidor. A tabela continua
-- fechada para `anon` e `authenticated` — quem lê pelo app é a função
-- email_liberado(), que é security definer.
-- ─────────────────────────────────────────────────────────────────────────────

-- Basta INSERT/SELECT/DELETE: o código usa `resolution=ignore-duplicates`
-- (ON CONFLICT DO NOTHING). Se um dia voltar para `merge-duplicates`, aí passa
-- a exigir UPDATE também — foi assim que este erro apareceu em 10/09.
grant select, insert, delete on public.acessos_liberados to service_role;

-- Confirme (deve listar as três permissões para service_role):
select grantee, privilege_type
from information_schema.role_table_grants
where table_name = 'acessos_liberados' and grantee = 'service_role';
