-- =============================================================================
-- FRAME — поиск, прощающий опечатки и неполные слова
-- «масква», «якуцк», «свадебного фотографа», «мск», «питер» находят то же, что и
-- точное написание. Слово запроса считается найденным, если оно встречается в тексте
-- (в том числе как часть слова) или похоже на слово текста (триграммы pg_trgm).
-- Функции поиска пересоздаются с прежними сигнатурами — права (GRANT) сохраняются.
-- =============================================================================

-- Значимые слова запроса: нижний регистр, без знаков препинания, от 2 символов.
create or replace function public.search_words(p_value text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_agg(w), '{}')
  from regexp_split_to_table(lower(coalesce(p_value, '')), '[^[:alnum:]]+') as w
  where char_length(w) >= 2;
$$;

-- Каждое слово запроса есть в тексте точно или с опечаткой (для слов от 4 букв).
create or replace function public.fuzzy_match(p_query text, p_text text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(p_text, '') <> ''
    and cardinality(public.search_words(p_query)) > 0
    and not exists (
      select 1
      from unnest(public.search_words(p_query)) as w
      where not (
        lower(p_text) like '%' || public.escape_like(w) || '%'
        or (char_length(w) >= 4 and extensions.word_similarity(w, lower(p_text)) >= 0.4)
      )
    );
$$;

-- Похожесть текста на запрос, 0..1 — для сортировки по релевантности.
create or replace function public.fuzzy_score(p_query text, p_text text)
returns real
language sql
immutable
set search_path = ''
as $$
  select coalesce(avg(extensions.word_similarity(w, lower(coalesce(p_text, ''))))::real, 0)
  from unnest(public.search_words(p_query)) as w;
$$;

-- Разговорные и латинские названия крупных городов → название, как его пишут в профилях.
create or replace function public.normalize_city(p_city text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case lower(regexp_replace(btrim(coalesce(p_city, '')), '[[:space:].-]+', ' ', 'g'))
    when 'мск' then 'Москва'
    when 'msk' then 'Москва'
    when 'moscow' then 'Москва'
    when 'moskva' then 'Москва'
    when 'спб' then 'Санкт-Петербург'
    when 'питер' then 'Санкт-Петербург'
    when 'петербург' then 'Санкт-Петербург'
    when 'санкт петербург' then 'Санкт-Петербург'
    when 'с петербург' then 'Санкт-Петербург'
    when 'spb' then 'Санкт-Петербург'
    when 'saint petersburg' then 'Санкт-Петербург'
    when 'st petersburg' then 'Санкт-Петербург'
    when 'екб' then 'Екатеринбург'
    when 'екат' then 'Екатеринбург'
    when 'нск' then 'Новосибирск'
    when 'новосиб' then 'Новосибирск'
    when 'нн' then 'Нижний Новгород'
    when 'нижний' then 'Нижний Новгород'
    when 'ростов' then 'Ростов-на-Дону'
    when 'ростов на дону' then 'Ростов-на-Дону'
    when 'kazan' then 'Казань'
    when 'sochi' then 'Сочи'
    else nullif(btrim(p_city), '')
  end;
$$;

-- Город профиля или проекта подходит под фильтр (сокращения, часть названия, опечатка).
create or replace function public.city_matches(p_filter text, p_city text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_filter is null
    or btrim(p_filter) = ''
    or (
      coalesce(p_city, '') <> ''
      and (
        p_city ilike '%' || public.escape_like(public.normalize_city(p_filter)) || '%'
        or (
          char_length(public.normalize_city(p_filter)) >= 4
          and extensions.word_similarity(lower(public.normalize_city(p_filter)), lower(p_city)) >= 0.4
        )
      )
    );
$$;

-- Подсказки «возможно, вы искали»: похожие имена, города, категории, типы профилей и теги.
create or replace function public.search_suggestions(p_query text, p_limit integer default 6)
returns table (term text, kind text, score real)
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (select lower(btrim(coalesce(public.normalize_city(p_query), p_query, ''))) as value),
  terms as (
    select p.display_name as term, 'person' as kind from public.profiles p where p.banned_at is null
    union
    select p.city, 'city' from public.profiles p where p.banned_at is null and coalesce(p.city, '') <> ''
    union
    select pr.city, 'city' from public.projects pr where pr.hidden_at is null and coalesce(pr.city, '') <> ''
    union
    select c.name, 'category' from public.categories c where c.is_active
    union
    select pt.name, 'profile_type' from public.profile_types pt where pt.is_active
    union
    select t.tag, 'tag'
    from public.portfolio_tags t
    join public.portfolio_items i on i.id = t.item_id
    where i.is_published and i.hidden_at is null
  )
  select s.term, s.kind, s.score
  from (
    select distinct on (lower(terms.term)) terms.term, terms.kind,
      greatest(extensions.word_similarity(q.value, lower(terms.term)), extensions.similarity(q.value, lower(terms.term)))::real as score
    from terms
    cross join q
    where char_length(q.value) >= 2
    order by lower(terms.term), 3 desc
  ) s
  where s.score >= 0.3
  order by s.score desc, s.term
  limit least(greatest(coalesce(p_limit, 6), 1), 20);
$$;

-- -----------------------------------------------------------------------------
-- Каталог участников
-- -----------------------------------------------------------------------------

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
  candidates as (
    -- Текст для нечёткого поиска: имя, логин, город, о себе, тип профиля и специализации.
    select
      p.*,
      concat_ws(' ', p.display_name, p.username, p.city, p.bio, pt.name,
        (select string_agg(c.name, ' ') from public.categories c where c.slug = any (p.specializations))) as haystack
    from public.profiles p
    left join public.profile_types pt on pt.slug = p.profile_type
    cross join params
    where p.banned_at is null
      and (
        p_kind is null
        or (p_kind = 'photographer' and coalesce(pt.shows_in_photographer_catalog, false))
        or (p_kind = 'model' and coalesce(pt.shows_in_model_catalog, false))
      )
      and (p_types is null or cardinality(p_types) = 0 or p.profile_type = any (p_types))
      and public.city_matches(params.city, p.city)
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
  ),
  matched as (
    select
      c.*,
      case
        when params.q is null then 0::real
        else coalesce(ts_rank(c.search_vector, params.tsq), 0)
          + case when c.display_name ilike public.escape_like(params.q) || '%'
                   or c.username ilike public.escape_like(params.q) || '%' then 1 else 0 end
          + public.fuzzy_score(params.q, c.haystack) * 0.5
      end as rank
    from candidates c
    cross join params
    where params.q is null
      or (params.tsq is not null and c.search_vector @@ params.tsq)
      or c.display_name ilike '%' || public.escape_like(params.q) || '%'
      or c.username ilike '%' || public.escape_like(params.q) || '%'
      or public.fuzzy_match(params.q, c.haystack)
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
-- Портфолио
-- -----------------------------------------------------------------------------

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
      or public.fuzzy_match(
        params.q,
        concat_ws(' ', i.title, i.description, p.display_name,
          (select c.name from public.categories c where c.slug = i.category_slug),
          (select string_agg(t.tag, ' ') from public.portfolio_tags t where t.item_id = i.id))
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
-- Проекты
-- -----------------------------------------------------------------------------

create or replace function public.search_projects(
  p_query text default null,
  p_city text default null,
  p_category text default null,
  p_format public.collab_format default null,
  p_looking_for public.team_role default null,
  p_statuses public.project_status[] default array['open']::public.project_status[],
  p_author uuid default null,
  p_sort text default 'newest',
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
    and public.city_matches(params.city, pr.city)
    and (
      params.q is null
      or pr.title ilike '%' || public.escape_like(params.q) || '%'
      or pr.description ilike '%' || public.escape_like(params.q) || '%'
      or public.fuzzy_match(
        params.q,
        concat_ws(' ', pr.title, pr.description, pr.location,
          (select c.name from public.categories c where c.slug = pr.category_slug))
      )
    )
  order by
    case when p_sort = 'soon' then pr.shoot_date end asc nulls last,
    pr.created_at desc,
    pr.id
  limit (select lim from params)
  offset (select off from params);
$$;

-- -----------------------------------------------------------------------------
-- Права
-- -----------------------------------------------------------------------------

revoke execute on function
  public.search_words(text),
  public.fuzzy_match(text, text),
  public.fuzzy_score(text, text),
  public.normalize_city(text),
  public.city_matches(text, text),
  public.search_suggestions(text, integer)
  from public;

grant execute on function
  public.search_words(text),
  public.fuzzy_match(text, text),
  public.fuzzy_score(text, text),
  public.normalize_city(text),
  public.city_matches(text, text),
  public.search_suggestions(text, integer)
  to anon, authenticated;
