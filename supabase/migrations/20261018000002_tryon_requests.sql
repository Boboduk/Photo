-- =============================================================================
-- FRAME — все модели платформы в примерочной
-- Во вкладке «Модели FRAME» видны все участники с профилем модели. Примерять можно
-- только на тех, кто сам открыл фото (ст. 152.1 ГК РФ). Остальных можно попросить
-- открыть примерку: модель получает уведомление и решает сама.
-- =============================================================================

alter type public.notification_type add value if not exists 'tryon_request';

create table public.tryon_requests (
  requester_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  model_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (requester_id, model_id),
  check (requester_id <> model_id)
);

create index tryon_requests_model_idx on public.tryon_requests (model_id, created_at desc);
create index tryon_requests_requester_idx on public.tryon_requests (requester_id, created_at desc);

alter table public.tryon_requests enable row level security;

revoke all on public.tryon_requests from anon, authenticated;
grant all on public.tryon_requests to service_role;
-- Запросы создаёт только функция request_tryon_photo (лимиты и проверки), напрямую — нельзя.
grant select on public.tryon_requests to authenticated;

create policy "tryon_requests: requester or model reads"
  on public.tryon_requests for select to authenticated
  using (requester_id = (select auth.uid()) or model_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Все модели платформы для вкладки «Модели FRAME» (кроме себя, заблокированных
-- и тех, с кем есть блокировка). requested_at — когда текущий пользователь просил открыть фото.
-- -----------------------------------------------------------------------------

create or replace function public.tryon_model_profiles(p_limit integer default 200)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  city text,
  requested_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.id, p.username, p.display_name, p.avatar_url, p.city, r.created_at
  from public.profiles p
  join public.profile_types pt on pt.slug = p.profile_type and pt.shows_in_model_catalog
  left join public.tryon_requests r on r.model_id = p.id and r.requester_id = (select auth.uid())
  where p.banned_at is null
    and p.id <> (select auth.uid())
    and not public.is_blocked_between(p.id, (select auth.uid()))
  order by p.last_active_at desc, p.id
  limit least(greatest(coalesce(p_limit, 200), 1), 500);
$$;

-- -----------------------------------------------------------------------------
-- Попросить модель открыть фото для примерки. Повторно ту же модель — не чаще раза
-- в 30 дней, всего — не больше 30 запросов в сутки. Возвращает статус:
-- requested | already_requested | already_shared | rate_limited | not_found
-- -----------------------------------------------------------------------------

create or replace function public.request_tryon_photo(p_model uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_last timestamptz;
begin
  if v_me is null or not public.is_active_user() then
    raise exception 'not_authenticated';
  end if;
  if p_model is null or p_model = v_me
     or not public.is_model_profile(p_model)
     or public.is_blocked_between(p_model, v_me) then
    return 'not_found';
  end if;
  if exists (select 1 from public.tryon_models m where m.owner_id = p_model and m.is_shared) then
    return 'already_shared';
  end if;

  select r.created_at into v_last
  from public.tryon_requests r
  where r.requester_id = v_me and r.model_id = p_model;
  if v_last is not null and v_last > now() - interval '30 days' then
    return 'already_requested';
  end if;

  if (
    select count(*) from public.tryon_requests r
    where r.requester_id = v_me and r.created_at > now() - interval '1 day'
  ) >= 30 then
    return 'rate_limited';
  end if;

  insert into public.tryon_requests (requester_id, model_id)
  values (v_me, p_model)
  on conflict (requester_id, model_id) do update set created_at = now();

  perform public.notify(
    p_model,
    v_me,
    'tryon_request',
    jsonb_build_object('actor_name', (select p.display_name from public.profiles p where p.id = v_me)),
    'tryon_request'
  );
  return 'requested';
end;
$$;

revoke execute on function
  public.tryon_model_profiles(integer),
  public.request_tryon_photo(uuid)
  from public, anon;

grant execute on function
  public.tryon_model_profiles(integer),
  public.request_tryon_photo(uuid)
  to authenticated;
