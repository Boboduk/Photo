-- =============================================================================
-- FRAME — ИИ-ассистент на сайте (Claude API + инструменты MCP-сервера)
-- Диалоги хранятся целиком (история нужна модели на каждом шаге) и видны только
-- владельцу. Число сообщений в сутки ограничено в базе: лимит не обойти из браузера.
-- =============================================================================

create table public.assistant_chats (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text check (char_length(title) <= 120),
  -- История в формате Claude Messages API: только дописывается, не редактируется.
  messages jsonb not null default '[]'::jsonb check (jsonb_typeof(messages) = 'array'),
  -- Действие ассистента, которое ждёт подтверждения пользователя: {tool, results}.
  pending jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index assistant_chats_owner_idx on public.assistant_chats (owner_id, updated_at desc);

create table public.assistant_usage (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null default current_date,
  turns integer not null default 0,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  primary key (user_id, day)
);

alter table public.assistant_chats enable row level security;
alter table public.assistant_usage enable row level security;

revoke all on public.assistant_chats, public.assistant_usage from anon, authenticated;
grant all on public.assistant_chats, public.assistant_usage to service_role;

grant select, delete on public.assistant_chats to authenticated;
grant insert (title) on public.assistant_chats to authenticated;
grant update (title, messages, pending, updated_at) on public.assistant_chats to authenticated;
-- Счётчики меняют только функции ниже.
grant select on public.assistant_usage to authenticated;

create policy "assistant_chats: owner reads"
  on public.assistant_chats for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "assistant_chats: owner creates"
  on public.assistant_chats for insert to authenticated
  with check (owner_id = (select auth.uid()) and public.is_active_user());

create policy "assistant_chats: owner updates"
  on public.assistant_chats for update to authenticated
  using (owner_id = (select auth.uid()) and public.is_active_user())
  with check (owner_id = (select auth.uid()));

create policy "assistant_chats: owner deletes"
  on public.assistant_chats for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy "assistant_usage: own"
  on public.assistant_usage for select to authenticated
  using (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Лимит сообщений ассистенту в сутки. Меняется только новой миграцией.
-- -----------------------------------------------------------------------------

create or replace function public.assistant_daily_limit()
returns integer
language sql
immutable
set search_path = ''
as $$
  select 40;
$$;

-- Засчитывает сообщение пользователя. Возвращает, сколько сообщений осталось на сегодня;
-- при превышении лимита — исключение rate_limited.
create or replace function public.assistant_take_turn()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_turns integer;
begin
  if v_me is null or not public.is_active_user() then
    raise exception 'not_authenticated';
  end if;

  insert into public.assistant_usage as u (user_id, day, turns)
  values (v_me, current_date, 1)
  on conflict (user_id, day) do update set turns = u.turns + 1
    where u.turns < public.assistant_daily_limit()
  returning u.turns into v_turns;

  if v_turns is null then
    raise exception 'rate_limited';
  end if;
  return public.assistant_daily_limit() - v_turns;
end;
$$;

-- Учёт токенов (для контроля расходов).
create or replace function public.assistant_add_usage(p_input bigint, p_output bigint)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.assistant_usage
  set input_tokens = input_tokens + greatest(coalesce(p_input, 0), 0),
      output_tokens = output_tokens + greatest(coalesce(p_output, 0), 0)
  where user_id = (select auth.uid()) and day = current_date;
$$;

revoke execute on function
  public.assistant_daily_limit(),
  public.assistant_take_turn(),
  public.assistant_add_usage(bigint, bigint)
  from public, anon;

grant execute on function
  public.assistant_daily_limit(),
  public.assistant_take_turn(),
  public.assistant_add_usage(bigint, bigint)
  to authenticated;
