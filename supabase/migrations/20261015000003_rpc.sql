-- =============================================================================
-- FRAME — функции API (вызываются через supabase.rpc)
-- Функции с security invoker работают с правами пользователя и подчиняются RLS.
-- Функции с security definer явно проверяют, кто их вызывает.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Утилиты поиска
-- -----------------------------------------------------------------------------

-- Экранирует спецсимволы шаблона LIKE в пользовательском вводе.
create or replace function public.escape_like(p_value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select replace(replace(replace(p_value, '\', '\\'), '%', '\%'), '_', '\_');
$$;

-- Строит безопасный префиксный запрос полнотекстового поиска: "анн моск" -> 'анн':* & 'моск':*
create or replace function public.prefix_tsquery(p_value text)
returns tsquery
language sql
immutable
set search_path = ''
as $$
  select case when s.q is null then null else to_tsquery('simple', s.q) end
  from (
    select string_agg(quote_literal(w) || ':*', ' & ') as q
    from regexp_split_to_table(lower(coalesce(p_value, '')), '[^[:alnum:]]+') as w
    where w <> ''
  ) s;
$$;

-- -----------------------------------------------------------------------------
-- Каталоги фотографов и моделей
-- -----------------------------------------------------------------------------

create or replace function public.search_profiles(
  p_kind text default null,                          -- 'photographer' | 'model' | null
  p_query text default null,
  p_city text default null,
  p_types public.profile_type[] default null,
  p_specializations text[] default null,
  p_category text default null,                      -- категория съёмки в портфолио
  p_experience public.experience_level[] default null,
  p_availability public.availability_status[] default null,
  p_formats public.collab_format[] default null,
  p_tags text[] default null,
  p_sort text default 'relevance',                   -- relevance | newest | active
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
  profile_type public.profile_type,
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
    where p.banned_at is null
      and (
        p_kind is null
        or (p_kind = 'photographer' and p.profile_type in ('photographer', 'both'))
        or (p_kind = 'model' and p.profile_type in ('model', 'both'))
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

-- -----------------------------------------------------------------------------
-- Лента работ
-- -----------------------------------------------------------------------------

create or replace function public.search_portfolio(
  p_query text default null,
  p_category text default null,
  p_tag text default null,
  p_owner uuid default null,
  p_sort text default 'newest',                      -- newest | popular
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
  owner_profile_type public.profile_type,
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

-- -----------------------------------------------------------------------------
-- Проекты и съёмки
-- -----------------------------------------------------------------------------

create or replace function public.search_projects(
  p_query text default null,
  p_city text default null,
  p_category text default null,
  p_format public.collab_format default null,
  p_looking_for public.team_role default null,
  p_statuses public.project_status[] default array['open']::public.project_status[],
  p_author uuid default null,
  p_sort text default 'newest',                      -- newest | soon
  p_limit integer default 24,
  p_offset integer default 0
)
returns table (
  id uuid,
  title text,
  description text,
  city text,
  location text,
  shoot_date date,
  category_slug text,
  looking_for public.team_role[],
  collab_format public.collab_format,
  spots smallint,
  cover_url text,
  status public.project_status,
  applications_count integer,
  created_at timestamptz,
  author_id uuid,
  author_username text,
  author_display_name text,
  author_avatar_url text,
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
      nullif(btrim(p_city), '') as city,
      least(greatest(coalesce(p_limit, 24), 1), 60) as lim,
      greatest(coalesce(p_offset, 0), 0) as off
  )
  select
    pr.id, pr.title, left(pr.description, 280), pr.city, pr.location, pr.shoot_date, pr.category_slug,
    pr.looking_for, pr.collab_format, pr.spots, pr.cover_url, pr.status, pr.applications_count, pr.created_at,
    a.id, a.username, a.display_name, a.avatar_url,
    count(*) over () as total_count
  from public.projects pr
  join public.profiles a on a.id = pr.author_id
  cross join params
  where pr.hidden_at is null
    and a.banned_at is null
    and (p_statuses is null or cardinality(p_statuses) = 0 or pr.status = any (p_statuses))
    and (p_author is null or pr.author_id = p_author)
    and (p_category is null or pr.category_slug = p_category)
    and (p_format is null or pr.collab_format = p_format)
    and (p_looking_for is null or p_looking_for = any (pr.looking_for))
    and (params.city is null or pr.city ilike '%' || public.escape_like(params.city) || '%')
    and (
      params.q is null
      or pr.title ilike '%' || public.escape_like(params.q) || '%'
      or pr.description ilike '%' || public.escape_like(params.q) || '%'
    )
  order by
    case when p_sort = 'soon' then pr.shoot_date end asc nulls last,
    pr.created_at desc,
    pr.id
  limit (select lim from params)
  offset (select off from params);
$$;

-- -----------------------------------------------------------------------------
-- Профиль: данные, которые пользователь разрешил показывать
-- -----------------------------------------------------------------------------

create or replace function public.profile_public_details(p_profile uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'age',
      case when pp.show_age and pp.birth_date is not null
        then extract(year from age(current_date, pp.birth_date))::integer end,
    'params',
      case when pp.show_params then jsonb_strip_nulls(jsonb_build_object(
        'height_cm', pp.height_cm,
        'clothing_size', pp.clothing_size,
        'shoe_size', pp.shoe_size,
        'hair_color', pp.hair_color,
        'eye_color', pp.eye_color
      )) end,
    'contacts',
      case
        when (select auth.uid()) = p.id
          or (
            not public.is_blocked_between((select auth.uid()), p.id)
            and (
              pp.contacts_visibility = 'everyone'
              or (pp.contacts_visibility = 'members' and public.is_active_user())
            )
          )
        then jsonb_strip_nulls(jsonb_build_object(
          'email', pp.contact_email,
          'phone', pp.contact_phone,
          'telegram', pp.contact_telegram
        ))
      end
  )
  from public.profile_private pp
  join public.profiles p on p.id = pp.id
  where pp.id = p_profile
    and (p.banned_at is null or p.id = (select auth.uid()) or public.is_moderator());
$$;

-- -----------------------------------------------------------------------------
-- Портфолио: порядок и обложка
-- -----------------------------------------------------------------------------

create or replace function public.reorder_portfolio(p_ids uuid[])
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.portfolio_items i
     set position = x.ord::integer
    from unnest(p_ids) with ordinality as x(id, ord)
   where i.id = x.id and i.owner_id = (select auth.uid());
$$;

create or replace function public.reorder_portfolio_images(p_item uuid, p_ids uuid[])
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.portfolio_images im
     set position = x.ord::integer
    from unnest(p_ids) with ordinality as x(id, ord)
   where im.id = x.id and im.item_id = p_item and im.owner_id = (select auth.uid());
$$;

create or replace function public.set_portfolio_cover(p_item uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.portfolio_items
     set is_cover = false
   where owner_id = (select auth.uid()) and is_cover and id <> p_item;
  update public.portfolio_items
     set is_cover = true
   where id = p_item and owner_id = (select auth.uid());
end;
$$;

-- -----------------------------------------------------------------------------
-- Лайки и избранное
-- -----------------------------------------------------------------------------

-- user_id не передаётся явно: колонка закрыта для записи и заполняется auth.uid() по умолчанию.
create or replace function public.toggle_like(p_item uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_liked boolean;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  delete from public.likes where user_id = (select auth.uid()) and item_id = p_item;
  if found then
    v_liked := false;
  else
    insert into public.likes (item_id) values (p_item);
    v_liked := true;
  end if;

  return jsonb_build_object(
    'liked', v_liked,
    'likes_count', (select likes_count from public.portfolio_items where id = p_item)
  );
end;
$$;

create or replace function public.toggle_favorite(p_item uuid default null, p_profile uuid default null)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if num_nonnulls(p_item, p_profile) <> 1 then
    raise exception 'invalid_target';
  end if;

  if p_item is not null then
    delete from public.favorites where user_id = (select auth.uid()) and item_id = p_item;
    if found then return false; end if;
    insert into public.favorites (item_id) values (p_item);
  else
    delete from public.favorites where user_id = (select auth.uid()) and profile_id = p_profile;
    if found then return false; end if;
    insert into public.favorites (profile_id) values (p_profile);
  end if;
  return true;
end;
$$;

-- -----------------------------------------------------------------------------
-- Диалоги
-- -----------------------------------------------------------------------------

-- Возвращает существующий личный диалог с пользователем или создаёт новый.
-- Уникальный direct_key гарантирует, что у пары пользователей один диалог.
create or replace function public.get_or_create_direct_conversation(p_other uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_key text;
  v_id uuid;
begin
  if v_me is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_other is null or p_other = v_me then
    raise exception 'cannot_message_self';
  end if;

  v_key := least(v_me::text, p_other::text) || ':' || greatest(v_me::text, p_other::text);

  select id into v_id from public.conversations where direct_key = v_key;
  if v_id is not null then
    -- Диалог уже есть: восстанавливаем участие (на случай повторного вызова) и возвращаем его.
    insert into public.conversation_members (conversation_id, user_id)
    values (v_id, v_me)
    on conflict do nothing;
    return v_id;
  end if;

  if not public.is_active_user() then
    raise exception 'account_banned';
  end if;
  if not exists (select 1 from public.profiles where id = p_other and banned_at is null) then
    raise exception 'user_not_found';
  end if;
  if public.is_blocked_between(v_me, p_other) then
    raise exception 'blocked';
  end if;

  perform public.enforce_rate_limit(
    (select count(*) from public.conversations
      where created_by = v_me and created_at > now() - interval '1 hour'),
    30
  );

  insert into public.conversations (direct_key, created_by)
  values (v_key, v_me)
  on conflict (direct_key) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from public.conversations where direct_key = v_key;
  end if;

  insert into public.conversation_members (conversation_id, user_id)
  values (v_id, v_me), (v_id, p_other)
  on conflict do nothing;

  return v_id;
end;
$$;

-- Список диалогов текущего пользователя (или один диалог, если передан p_conversation).
create or replace function public.list_conversations(
  p_search text default null,
  p_conversation uuid default null,
  p_limit integer default 100
)
returns table (
  id uuid,
  created_at timestamptz,
  last_message_at timestamptz,
  other_id uuid,
  other_username text,
  other_display_name text,
  other_avatar_url text,
  other_last_read_at timestamptz,
  last_message_body text,
  last_message_sender_id uuid,
  unread_count bigint,
  blocked_by_me boolean,
  can_message boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id,
    c.created_at,
    c.last_message_at,
    o.user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    o.last_read_at,
    lm.body,
    lm.sender_id,
    (
      select count(*) from public.messages m
      where m.conversation_id = c.id
        and m.created_at > me.last_read_at
        and m.sender_id is distinct from me.user_id
    ) as unread_count,
    exists (
      select 1 from public.user_blocks b
      where b.blocker_id = me.user_id and b.blocked_id = o.user_id
    ) as blocked_by_me,
    (
      o.user_id is not null
      and p.banned_at is null
      and not public.is_blocked_between(me.user_id, o.user_id)
    ) as can_message
  from public.conversation_members me
  join public.conversations c on c.id = me.conversation_id
  left join public.conversation_members o on o.conversation_id = c.id and o.user_id <> me.user_id
  left join public.profiles p on p.id = o.user_id
  left join lateral (
    select m.body, m.sender_id
    from public.messages m
    where m.conversation_id = c.id
    order by m.created_at desc
    limit 1
  ) lm on true
  where me.user_id = (select auth.uid())
    and (p_conversation is null or c.id = p_conversation)
    -- Пустые диалоги, созданные собеседником, не показываем, пока он не напишет.
    and (p_conversation is not null or c.last_message_at is not null or c.created_by = me.user_id)
    and (
      nullif(btrim(p_search), '') is null
      or p.display_name ilike '%' || public.escape_like(btrim(p_search)) || '%'
      or p.username ilike '%' || public.escape_like(btrim(p_search)) || '%'
    )
  order by coalesce(c.last_message_at, c.created_at) desc
  limit least(greatest(coalesce(p_limit, 100), 1), 200);
$$;

create or replace function public.mark_conversation_read(p_conversation uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversation_members
     set last_read_at = now()
   where conversation_id = p_conversation and user_id = (select auth.uid());

  update public.notifications
     set read_at = now()
   where user_id = (select auth.uid())
     and group_key = 'conv:' || p_conversation::text
     and read_at is null;
end;
$$;

create or replace function public.unread_counts()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'messages', (
      select count(*)
      from public.conversation_members me
      join public.messages m
        on m.conversation_id = me.conversation_id
       and m.created_at > me.last_read_at
       and m.sender_id is distinct from me.user_id
      where me.user_id = (select auth.uid())
    ),
    'notifications', (
      select count(*) from public.notifications
      where user_id = (select auth.uid()) and read_at is null
    )
  );
$$;

-- -----------------------------------------------------------------------------
-- Отклики на проекты
-- -----------------------------------------------------------------------------

-- Отклик: сохраняет заявку, открывает (или создаёт) диалог с автором
-- и отправляет в него сообщение. Всё — в одной транзакции.
create or replace function public.apply_to_project(
  p_project uuid,
  p_role public.team_role,
  p_message text,
  p_chat_text text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_project record;
  v_existing record;
  v_application uuid;
  v_conversation uuid;
  v_message text := btrim(coalesce(p_message, ''));
begin
  if v_me is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not public.is_active_user() then
    raise exception 'account_banned';
  end if;
  if char_length(v_message) < 1 or char_length(v_message) > 1000 then
    raise exception 'invalid_message';
  end if;

  select id, author_id, status, title into v_project
  from public.projects
  where id = p_project and hidden_at is null;

  if not found or not public.is_profile_visible(v_project.author_id) then
    raise exception 'project_not_found';
  end if;
  if v_project.author_id = v_me then
    raise exception 'own_project';
  end if;
  if v_project.status <> 'open' then
    raise exception 'project_closed';
  end if;
  if public.is_blocked_between(v_me, v_project.author_id) then
    raise exception 'blocked';
  end if;

  select id, status into v_existing
  from public.project_applications
  where project_id = p_project and applicant_id = v_me;

  if found and v_existing.status <> 'withdrawn' then
    raise exception 'already_applied';
  end if;

  v_conversation := public.get_or_create_direct_conversation(v_project.author_id);

  if v_existing.id is not null then
    update public.project_applications
       set status = 'pending', role = p_role, message = v_message,
           conversation_id = v_conversation, responded_at = null
     where id = v_existing.id
     returning id into v_application;
  else
    insert into public.project_applications (project_id, applicant_id, role, message, conversation_id)
    values (p_project, v_me, p_role, v_message, v_conversation)
    returning id into v_application;
  end if;

  insert into public.messages (conversation_id, sender_id, body)
  values (v_conversation, v_me, left(coalesce(nullif(btrim(p_chat_text), ''), v_message), 4000));

  return jsonb_build_object('application_id', v_application, 'conversation_id', v_conversation);
end;
$$;

-- Автор проекта принимает/отклоняет отклик; откликнувшийся может его отозвать.
create or replace function public.set_application_status(
  p_application uuid,
  p_status public.application_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_app record;
  v_project record;
begin
  if v_me is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not public.is_active_user() then
    raise exception 'account_banned';
  end if;

  select * into v_app from public.project_applications where id = p_application;
  if not found then
    raise exception 'application_not_found';
  end if;

  select id, author_id, title into v_project from public.projects where id = v_app.project_id;

  if v_project.author_id = v_me then
    if p_status not in ('pending', 'accepted', 'declined') then
      raise exception 'invalid_status';
    end if;
    if v_app.status = 'withdrawn' then
      raise exception 'application_withdrawn';
    end if;

    update public.project_applications
       set status = p_status,
           responded_at = case when p_status = 'pending' then null else now() end
     where id = p_application;

    if p_status in ('accepted', 'declined') and p_status <> v_app.status then
      perform public.notify(
        v_app.applicant_id,
        v_me,
        'application_status',
        jsonb_build_object(
          'project_id', v_project.id,
          'project_title', v_project.title,
          'application_id', v_app.id,
          'status', p_status,
          'actor_name', (select display_name from public.profiles where id = v_me)
        )
      );
    end if;
  elsif v_app.applicant_id = v_me then
    if p_status <> 'withdrawn' then
      raise exception 'invalid_status';
    end if;
    update public.project_applications set status = 'withdrawn' where id = p_application;
  else
    raise exception 'forbidden' using errcode = '42501';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Жалобы
-- -----------------------------------------------------------------------------

create or replace function public.submit_report(
  p_target_type public.report_target,
  p_target_id uuid,
  p_reason public.report_reason,
  p_details text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_owner uuid;
  v_snapshot jsonb;
  v_id uuid;
begin
  if v_me is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not public.is_active_user() then
    raise exception 'account_banned';
  end if;

  perform public.enforce_rate_limit(
    (select count(*) from public.reports where reporter_id = v_me and created_at > now() - interval '1 hour'),
    10
  );

  if p_target_type = 'profile' then
    select id, jsonb_build_object(
             'username', username, 'display_name', display_name,
             'avatar_url', avatar_url, 'bio', left(bio, 500))
      into v_owner, v_snapshot
      from public.profiles where id = p_target_id and banned_at is null;
  elsif p_target_type = 'portfolio_item' then
    select owner_id, jsonb_build_object(
             'title', title, 'cover_image_url', cover_image_url, 'description', left(description, 500))
      into v_owner, v_snapshot
      from public.portfolio_items
     where id = p_target_id and is_published and hidden_at is null;
  elsif p_target_type = 'project' then
    select author_id, jsonb_build_object('title', title, 'description', left(description, 500))
      into v_owner, v_snapshot
      from public.projects where id = p_target_id and hidden_at is null;
  elsif p_target_type = 'message' then
    -- Пожаловаться можно только на сообщение собеседника в своём диалоге.
    -- В жалобу попадает только текст этого сообщения.
    select m.sender_id, jsonb_build_object('body', m.body, 'sent_at', m.created_at)
      into v_owner, v_snapshot
      from public.messages m
     where m.id = p_target_id
       and m.sender_id is distinct from v_me
       and exists (
         select 1 from public.conversation_members cm
         where cm.conversation_id = m.conversation_id and cm.user_id = v_me
       );
  end if;

  if v_snapshot is null then
    raise exception 'target_not_found';
  end if;
  if v_owner = v_me then
    raise exception 'cannot_report_self';
  end if;

  select id into v_id from public.reports
   where reporter_id = v_me and target_type = p_target_type and target_id = p_target_id and status = 'open';
  if v_id is not null then
    return v_id;
  end if;

  insert into public.reports (reporter_id, target_type, target_id, target_owner_id, reason, details, snapshot)
  values (v_me, p_target_type, p_target_id, v_owner, p_reason, left(nullif(btrim(p_details), ''), 2000), v_snapshot)
  returning id into v_id;

  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Удаление собственного аккаунта
-- Удаляет пользователя из auth.users; профиль и весь его контент удаляются каскадно.
-- Файлы в Storage приложение удаляет до вызова этой функции.
-- -----------------------------------------------------------------------------

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  delete from auth.users where id = v_me;
end;
$$;

-- -----------------------------------------------------------------------------
-- Администрирование
-- Каждая функция сама проверяет роль. Доступа к личным перепискам нет:
-- статистика по сообщениям — только агрегированная.
-- -----------------------------------------------------------------------------

create or replace function public.assert_moderator()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end;
$$;

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
    'photographers', (select count(*) from public.profiles where profile_type in ('photographer', 'both')),
    'models', (select count(*) from public.profiles where profile_type in ('model', 'both')),
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

create or replace function public.admin_list_users(
  p_query text default null,
  p_filter text default 'all',                       -- all | banned | staff
  p_limit integer default 30,
  p_offset integer default 0
)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  profile_type public.profile_type,
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
    -- Электронная почта видна только администраторам
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

create or replace function public.admin_set_user_ban(p_user uuid, p_banned boolean, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target_role public.app_role;
begin
  perform public.assert_moderator();

  if p_user = (select auth.uid()) then
    raise exception 'cannot_ban_self';
  end if;

  select role into v_target_role from public.profiles where id = p_user;
  if not found then
    raise exception 'user_not_found';
  end if;
  -- Модератор может блокировать только обычных пользователей; администратора заблокировать нельзя.
  if v_target_role = 'admin' or (v_target_role = 'moderator' and not public.is_admin()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.profiles
     set banned_at = case when p_banned then coalesce(banned_at, now()) end,
         ban_reason = case when p_banned then left(nullif(btrim(p_reason), ''), 500) end
   where id = p_user;
end;
$$;

create or replace function public.admin_set_user_role(p_user uuid, p_role public.app_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_user = (select auth.uid()) then
    raise exception 'cannot_change_own_role';
  end if;
  update public.profiles set role = p_role where id = p_user;
  if not found then
    raise exception 'user_not_found';
  end if;
end;
$$;

create or replace function public.admin_set_content_hidden(
  p_type public.report_target,
  p_id uuid,
  p_hidden boolean,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_moderator();

  if p_type = 'portfolio_item' then
    update public.portfolio_items
       set hidden_at = case when p_hidden then coalesce(hidden_at, now()) end,
           hidden_reason = case when p_hidden then left(nullif(btrim(p_reason), ''), 500) end
     where id = p_id;
  elsif p_type = 'project' then
    update public.projects
       set hidden_at = case when p_hidden then coalesce(hidden_at, now()) end,
           hidden_reason = case when p_hidden then left(nullif(btrim(p_reason), ''), 500) end
     where id = p_id;
  else
    raise exception 'unsupported_target';
  end if;

  if not found then
    raise exception 'target_not_found';
  end if;
end;
$$;

-- Удаляет работу или проект. Возвращает пути файлов в Storage,
-- которые приложение удаляет следом (модераторам разрешено удаление файлов).
create or replace function public.admin_delete_content(p_type public.report_target, p_id uuid)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_paths text[];
begin
  perform public.assert_moderator();

  if p_type = 'portfolio_item' then
    select coalesce(array_agg(storage_path) filter (where storage_path is not null), '{}')
      into v_paths
      from public.portfolio_images where item_id = p_id;
    delete from public.portfolio_items where id = p_id;
  elsif p_type = 'project' then
    select coalesce(array_remove(array[cover_path], null), '{}') into v_paths
      from public.projects where id = p_id;
    delete from public.projects where id = p_id;
  else
    raise exception 'unsupported_target';
  end if;

  if not found then
    raise exception 'target_not_found';
  end if;

  return coalesce(v_paths, '{}');
end;
$$;

create or replace function public.admin_resolve_report(
  p_report uuid,
  p_status public.report_status,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_moderator();
  update public.reports
     set status = p_status,
         resolution_note = left(nullif(btrim(p_note), ''), 1000),
         resolved_by = case when p_status = 'open' then null else (select auth.uid()) end,
         resolved_at = case when p_status = 'open' then null else now() end
   where id = p_report;
  if not found then
    raise exception 'report_not_found';
  end if;
end;
$$;
