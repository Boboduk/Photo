-- =============================================================================
-- FRAME — замена enum profile_type на управляемую таблицу profile_types
-- Позволяет администратору динамически добавлять, переименовывать и отключать
-- типы профилей без изменений схемы.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Создаём таблицу profile_types
-- -----------------------------------------------------------------------------

create table public.profile_types (
  slug             text primary key check (slug ~ '^[a-z0-9-]{2,40}$'),
  name             text not null check (char_length(btrim(name)) between 1 and 60),
  translations     jsonb not null default '{}'::jsonb,
  shows_in_photographer_catalog boolean not null default false,
  shows_in_model_catalog        boolean not null default false,
  sort_order       integer not null default 100,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Начальные данные: сохраняем существующие значения + добавляем новые
insert into public.profile_types (slug, name, shows_in_photographer_catalog, shows_in_model_catalog, sort_order) values
  ('photographer', 'Фотограф',             true,  false, 10),
  ('model',        'Модель',                false, true,  20),
  ('both',         'Фотограф и модель',     true,  true,  30),
  ('stylist',      'Стилист',               false, false, 40),
  ('assistant',    'Ассистент',             false, false, 50),
  ('videographer', 'Видеограф',             true,  false, 60),
  ('client',       'Заказчик',              false, false, 70);

-- -----------------------------------------------------------------------------
-- 2. Конвертируем profiles.profile_type: enum → text + FK
-- -----------------------------------------------------------------------------

-- Меняем тип колонки с enum на text (значения совпадают, приведение происходит через ::text).
-- Значение по умолчанию ссылается на enum, поэтому снимаем его и ставим заново.
alter table public.profiles
  alter column profile_type drop default;

alter table public.profiles
  alter column profile_type type text using profile_type::text;

alter table public.profiles
  alter column profile_type set default 'photographer';

-- Добавляем внешний ключ
alter table public.profiles
  add constraint profiles_profile_type_fkey
  foreign key (profile_type) references public.profile_types(slug)
  on update cascade;

-- -----------------------------------------------------------------------------
-- 3. Пересоздаём функции, использовавшие public.profile_type
--    (DROP + CREATE обязателен при изменении типов параметров/возврата)
-- -----------------------------------------------------------------------------

-- Функция search_profiles: p_types меняется с profile_type[] на text[]
drop function if exists public.search_profiles(text, text, text, public.profile_type[], text[], text,
  public.experience_level[], public.availability_status[], public.collab_format[], text[], text, integer, integer);

create or replace function public.search_profiles(
  p_kind text default null,
  p_query text default null,
  p_city text default null,
  p_types text[] default null,
  p_specializations text[] default null,
  p_category text default null,
  p_experience public.experience_level[] default null,
  p_availability public.availability_status[] default null,
  p_formats public.collab_format[] default null,
  p_tags text[] default null,
  p_sort text default 'relevance',
  p_limit integer default 24,
  p_offset integer default 0
)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  cover_url text,
  city text,
  bio text,
  profile_type text,
  specializations text[],
  experience public.experience_level,
  availability public.availability_status,
  collab_formats public.collab_format[],
  created_at timestamptz,
  last_active_at timestamptz,
  works_count bigint,
  preview jsonb,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with params as (
    select
      nullif(btrim(p_query), '') as q,
      public.prefix_tsquery(p_query) as tsq,
      nullif(btrim(p_city), '') as city,
      coalesce(p_sort, 'relevance') as sort,
      least(greatest(coalesce(p_limit, 24), 1), 60) as lim,
      greatest(coalesce(p_offset, 0), 0) as off
  ),
  matched as (
    select
      p.*,
      case
        when params.q is null then 0::real
        else coalesce(ts_rank(p.search_vector, params.tsq), 0)
          + case when p.display_name ilike public.escape_like(params.q) || '%'
                   or p.username ilike public.escape_like(params.q) || '%' then 1 else 0 end
      end as rank
    from public.profiles p
    cross join params
    left join public.profile_types pt on pt.slug = p.profile_type
    where p.banned_at is null
      and (
        p_kind is null
        or (p_kind = 'photographer' and coalesce(pt.shows_in_photographer_catalog, false))
        or (p_kind = 'model' and coalesce(pt.shows_in_model_catalog, false))
      )
      and (p_types is null or cardinality(p_types) = 0 or p.profile_type = any (p_types))
      and (params.city is null or p.city ilike '%' || public.escape_like(params.city) || '%')
      and (
        params.q is null
        or (params.tsq is not null and p.search_vector @@ params.tsq)
        or p.display_name ilike '%' || public.escape_like(params.q) || '%'
        or p.username ilike '%' || public.escape_like(params.q) || '%'
      )
      and (p_specializations is null or cardinality(p_specializations) = 0 or p.specializations && p_specializations)
      and (p_experience is null or cardinality(p_experience) = 0 or p.experience = any (p_experience))
      and (p_availability is null or cardinality(p_availability) = 0 or p.availability = any (p_availability))
      and (p_formats is null or cardinality(p_formats) = 0 or p.collab_formats && p_formats)
      and (
        p_category is null
        or exists (
          select 1 from public.portfolio_items i
          where i.owner_id = p.id and i.category_slug = p_category
            and i.is_published and i.hidden_at is null
        )
      )
      and (
        p_tags is null or cardinality(p_tags) = 0
        or exists (
          select 1
          from public.portfolio_items i
          join public.portfolio_tags t on t.item_id = i.id
          where i.owner_id = p.id and t.tag = any (p_tags)
            and i.is_published and i.hidden_at is null
        )
      )
  )
  select
    m.id, m.username, m.display_name, m.avatar_url, m.cover_url, m.city, m.bio,
    m.profile_type, m.specializations, m.experience, m.availability, m.collab_formats,
    m.created_at, m.last_active_at,
    (
      select count(*) from public.portfolio_items i
      where i.owner_id = m.id and i.is_published and i.hidden_at is null
    ) as works_count,
    coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'url', x.cover_image_url, 'width', x.cover_width, 'height', x.cover_height))
      from (
        select i.id, i.cover_image_url, i.cover_width, i.cover_height
        from public.portfolio_items i
        where i.owner_id = m.id and i.is_published and i.hidden_at is null and i.cover_image_url is not null
        order by i.is_cover desc, i.position, i.created_at desc
        limit 3
      ) x
    ), '[]'::jsonb) as preview,
    count(*) over () as total_count
  from matched m
  cross join params
  order by
    case when params.sort = 'newest' then m.created_at end desc nulls last,
    case when params.sort = 'active' then m.last_active_at end desc nulls last,
    case when params.sort not in ('newest', 'active') then m.rank end desc nulls last,
    m.last_active_at desc,
    m.id
  limit (select lim from params)
  offset (select off from params);
$$;

-- Функция search_portfolio: owner_profile_type меняется с profile_type на text
drop function if exists public.search_portfolio(text, text, text, uuid, text, integer, integer);

create or replace function public.search_portfolio(
  p_query text default null,
  p_category text default null,
  p_tag text default null,
  p_owner uuid default null,
  p_sort text default 'newest',
  p_limit integer default 24,
  p_offset integer default 0
)
returns table (
  id uuid,
  title text,
  category_slug text,
  cover_image_url text,
  cover_width integer,
  cover_height integer,
  images_count integer,
  likes_count integer,
  created_at timestamptz,
  owner_id uuid,
  owner_username text,
  owner_display_name text,
  owner_avatar_url text,
  owner_profile_type text,
  liked boolean,
  saved boolean,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with params as (
    select
      nullif(btrim(p_query), '') as q,
      nullif(lower(btrim(p_tag)), '') as tag,
      least(greatest(coalesce(p_limit, 24), 1), 60) as lim,
      greatest(coalesce(p_offset, 0), 0) as off
  )
  select
    i.id, i.title, i.category_slug, i.cover_image_url, i.cover_width, i.cover_height, i.images_count,
    i.likes_count, i.created_at,
    p.id, p.username, p.display_name, p.avatar_url, p.profile_type,
    exists (select 1 from public.likes l where l.item_id = i.id and l.user_id = (select auth.uid())) as liked,
    exists (select 1 from public.favorites f where f.item_id = i.id and f.user_id = (select auth.uid())) as saved,
    count(*) over () as total_count
  from public.portfolio_items i
  join public.profiles p on p.id = i.owner_id
  cross join params
  where i.is_published
    and i.hidden_at is null
    and i.cover_image_url is not null
    and p.banned_at is null
    and (p_owner is null or i.owner_id = p_owner)
    and (p_category is null or i.category_slug = p_category)
    and (
      params.tag is null
      or exists (select 1 from public.portfolio_tags t where t.item_id = i.id and t.tag = params.tag)
    )
    and (
      params.q is null
      or i.title ilike '%' || public.escape_like(params.q) || '%'
      or i.description ilike '%' || public.escape_like(params.q) || '%'
      or p.display_name ilike '%' || public.escape_like(params.q) || '%'
      or exists (
        select 1 from public.portfolio_tags t
        where t.item_id = i.id and t.tag ilike public.escape_like(lower(params.q)) || '%'
      )
    )
  order by
    case when p_sort = 'popular' then i.likes_count end desc nulls last,
    case when p_owner is not null then i.position end asc nulls last,
    i.created_at desc,
    i.id
  limit (select lim from params)
  offset (select off from params);
$$;

-- Функция admin_list_users: profile_type меняется с enum на text
drop function if exists public.admin_list_users(text, text, integer, integer);

create or replace function public.admin_list_users(
  p_query text default null,
  p_filter text default 'all',
  p_limit integer default 30,
  p_offset integer default 0
)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  profile_type text,
  role public.app_role,
  city text,
  banned_at timestamptz,
  ban_reason text,
  created_at timestamptz,
  last_active_at timestamptz,
  email text,
  works_count bigint,
  projects_count bigint,
  reports_count bigint,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean := public.is_admin();
  v_q text := nullif(btrim(p_query), '');
begin
  perform public.assert_moderator();

  return query
  select
    p.id, p.username, p.display_name, p.avatar_url, p.profile_type, p.role, p.city,
    p.banned_at, p.ban_reason, p.created_at, p.last_active_at,
    case when v_is_admin then u.email::text end,
    (select count(*) from public.portfolio_items i where i.owner_id = p.id),
    (select count(*) from public.projects pr where pr.author_id = p.id),
    (select count(*) from public.reports r where r.target_owner_id = p.id),
    count(*) over ()
  from public.profiles p
  left join auth.users u on u.id = p.id
  where (
      v_q is null
      or p.display_name ilike '%' || public.escape_like(v_q) || '%'
      or p.username ilike '%' || public.escape_like(v_q) || '%'
      or (v_is_admin and u.email ilike '%' || public.escape_like(v_q) || '%')
    )
    and (
      coalesce(p_filter, 'all') = 'all'
      or (p_filter = 'banned' and p.banned_at is not null)
      or (p_filter = 'staff' and p.role in ('moderator', 'admin'))
    )
  order by p.created_at desc
  limit least(greatest(coalesce(p_limit, 30), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

-- Обновляем admin_stats: используем флаги shows_in_*_catalog вместо хардкода
create or replace function public.admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_moderator();
  return jsonb_build_object(
    'users_total', (select count(*) from public.profiles),
    'users_new_7d', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'photographers', (
      select count(*) from public.profiles p
      join public.profile_types pt on pt.slug = p.profile_type
      where pt.shows_in_photographer_catalog
    ),
    'models', (
      select count(*) from public.profiles p
      join public.profile_types pt on pt.slug = p.profile_type
      where pt.shows_in_model_catalog
    ),
    'banned', (select count(*) from public.profiles where banned_at is not null),
    'portfolio_items', (select count(*) from public.portfolio_items),
    'portfolio_published', (select count(*) from public.portfolio_items where is_published and hidden_at is null),
    'portfolio_hidden', (select count(*) from public.portfolio_items where hidden_at is not null),
    'projects_total', (select count(*) from public.projects),
    'projects_active', (select count(*) from public.projects where status in ('open', 'in_progress') and hidden_at is null),
    'applications_total', (select count(*) from public.project_applications),
    'conversations_total', (select count(*) from public.conversations where last_message_at is not null),
    'messages_total', (select count(*) from public.messages),
    'messages_7d', (select count(*) from public.messages where created_at > now() - interval '7 days'),
    'reports_open', (select count(*) from public.reports where status = 'open')
  );
end;
$$;

-- Триггер регистрации: тип профиля из метаданных принимается, только если
-- такой активный тип существует, иначе — 'photographer'
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_username text;
  v_name text;
  v_type text;
begin
  v_username := regexp_replace(lower(coalesce(v_meta ->> 'username', '')), '[^a-z0-9_.]', '', 'g');
  v_username := left(v_username, 30);
  if char_length(v_username) < 3 then
    v_username := 'user' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;
  if exists (select 1 from public.profiles where username = v_username) then
    v_username := left(v_username, 21) || '_' || substr(md5(new.id::text || clock_timestamp()::text), 1, 8);
  end if;

  v_name := left(btrim(coalesce(v_meta ->> 'display_name', '')), 60);
  if char_length(v_name) < 2 then
    v_name := v_username;
  end if;

  select pt.slug into v_type
  from public.profile_types pt
  where pt.slug = v_meta ->> 'profile_type' and pt.is_active;
  v_type := coalesce(v_type, 'photographer');

  insert into public.profiles (id, username, display_name, profile_type)
  values (new.id, v_username, v_name, v_type);

  insert into public.profile_private (id, terms_accepted_at, personal_data_consent_at, age_confirmed_at)
  values (
    new.id,
    case when v_meta ->> 'terms_accepted' = 'true' then now() end,
    case when v_meta ->> 'personal_data_consent' = 'true' then now() end,
    case when v_meta ->> 'age_confirmed' = 'true' then now() end
  );

  return new;
end;
$$;

-- Удаляем старый enum: все зависящие от него функции и значения по умолчанию уже пересозданы
drop type public.profile_type;

-- -----------------------------------------------------------------------------
-- 4. RLS для profile_types
-- -----------------------------------------------------------------------------

alter table public.profile_types enable row level security;

-- Все могут читать активные типы
create policy "profile_types_select_active"
  on public.profile_types for select
  using (is_active);

-- Администратор может видеть и неактивные типы
create policy "profile_types_select_admin"
  on public.profile_types for select
  using (public.is_admin());

-- Только администратор может менять
create policy "profile_types_insert_admin"
  on public.profile_types for insert
  with check (public.is_admin());

create policy "profile_types_update_admin"
  on public.profile_types for update
  using (public.is_admin());

create policy "profile_types_delete_admin"
  on public.profile_types for delete
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- 5. Права доступа (GRANT)
-- -----------------------------------------------------------------------------

grant select on public.profile_types to anon, authenticated;
grant insert, update, delete on public.profile_types to authenticated;

-- Переоформляем GRANT для пересозданных функций
grant execute on function
  public.search_profiles(text, text, text, text[], text[], text, public.experience_level[],
    public.availability_status[], public.collab_format[], text[], text, integer, integer),
  public.search_portfolio(text, text, text, uuid, text, integer, integer)
  to anon, authenticated;

grant execute on function
  public.admin_list_users(text, text, integer, integer)
  to authenticated;
