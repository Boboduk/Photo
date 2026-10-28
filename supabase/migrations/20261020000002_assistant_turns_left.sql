-- =============================================================================
-- FRAME — ассистент: сообщение засчитывается только после успешного ответа модели
-- Перед запросом к API проверяется остаток (без списания), а assistant_take_turn()
-- вызывается после первого ответа. Отдельной функции «вернуть сообщение» нет —
-- иначе её можно было бы вызвать напрямую и обойти лимит.
-- =============================================================================

create or replace function public.assistant_turns_left()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(
    public.assistant_daily_limit() - coalesce((
      select u.turns from public.assistant_usage u
      where u.user_id = (select auth.uid()) and u.day = current_date
    ), 0),
    0
  );
$$;

revoke execute on function public.assistant_turns_left() from public, anon;
grant execute on function public.assistant_turns_left() to authenticated;
