-- ============================================================================
-- SIMETRIAPP — falta rodar isto (cole no SQL Editor e clique em Run)
-- Reforço de segurança: a RLS já bloqueia, isto tira o privilégio do role
-- anônimo, para a resposta virar erro de permissão em vez de lista vazia.
-- ============================================================================
revoke all on public.acessos_liberados from anon;
revoke all on public.estado_app from anon;

-- Confere: deve listar o seu e-mail
select email, nota, liberado_em from public.acessos_liberados;
