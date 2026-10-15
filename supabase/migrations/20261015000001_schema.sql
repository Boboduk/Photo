-- =============================================================================
-- FRAME — схема базы данных
-- Таблицы, типы, ограничения и индексы. Права доступа (RLS) — в отдельной миграции.
-- =============================================================================

create extension if not exists pg_trgm with schema extensions;

-- -----------------------------------------------------------------------------
-- Перечисления
-- -----------------------------------------------------------------------------

-- Тип профиля, который пользователь выбирает при регистрации.
create type public.profile_type as enum ('photographer', 'model', 'both');

-- Роль на платформе. Изменяется только администратором.
create type public.app_role as enum ('user', 'moderator', 'admin');

create type public.experience_level as enum ('beginner', 'intermediate', 'professional');

create type public.availability_status as enum ('available', 'limited', 'unavailable');

-- Форматы сотрудничества. TFP не означает передачу прав на снимки:
-- условия использования фотографий оговариваются отдельно (projects.usage_rights).
create type public.collab_format as enum ('tfp', 'paid', 'commercial', 'collab');

-- Роли участников съёмочной команды (кого ищут в проекте, кто отмечен в работе).
create type public.team_role as enum ('photographer', 'model', 'makeup', 'stylist', 'other');

create type public.project_status as enum ('open', 'in_progress', 'completed', 'cancelled');

create type public.application_status as enum ('pending', 'accepted', 'declined', 'withdrawn');

create type public.contacts_visibility as enum ('nobody', 'members', 'everyone');

create type public.notification_type as enum (
  'message',
  'application',
  'application_status',
  'project_status',
  'like',
  'mention'
);

create type public.report_target as enum ('profile', 'portfolio_item', 'project', 'message');

create type public.report_reason as enum (
  'spam',
  'harassment',
  'inappropriate',
  'copyright',
  'unauthorized_photo',
  'impersonation',
  'underage',
  'other'
);

create type public.report_status as enum ('open', 'resolved', 'dismissed');

-- -----------------------------------------------------------------------------
-- Категории и специализации (управляются администратором)
-- -----------------------------------------------------------------------------

create table public.categories (
  slug text primary key check (slug ~ '^[a-z0-9-]{2,40}$'),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  -- Переводы названия для будущих языков интерфейса: {"en": "Portrait"}
  translations jsonb not null default '{}'::jsonb check (jsonb_typeof(translations) = 'object'),
  for_photographers boolean not null default false,
  for_models boolean not null default false,
  -- Может ли категория использоваться как тип съёмки для работ и проектов.
  for_works boolean not null default true,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Профили
-- -----------------------------------------------------------------------------

-- Публичная часть профиля. Всё, что лежит в этой таблице, видно другим людям.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_.]{3,30}$'),
  display_name text not null check (char_length(btrim(display_name)) between 2 and 60),
  avatar_url text check (char_length(avatar_url) <= 1000),
  cover_url text check (char_length(cover_url) <= 1000),
  city text check (char_length(city) <= 80),
  bio text check (char_length(bio) <= 1000),
  profile_type public.profile_type not null default 'photographer',
  specializations text[] not null default '{}' check (cardinality(specializations) <= 12),
  experience public.experience_level,
  availability public.availability_status not null default 'available',
  collab_formats public.collab_format[] not null default '{}',
  -- {"instagram": "...", "telegram": "...", "vk": "...", "behance": "...", "website": "..."}
  social_links jsonb not null default '{}'::jsonb check (jsonb_typeof(social_links) = 'object'),
  role public.app_role not null default 'user',
  banned_at timestamptz,
  ban_reason text check (char_length(ban_reason) <= 500),
  onboarded_at timestamptz,
  last_active_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    to_tsvector(
      'simple',
      coalesce(display_name, '') || ' ' || username || ' ' || coalesce(city, '') || ' ' || coalesce(bio, '')
    )
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_search_vector_idx on public.profiles using gin (search_vector);
create index profiles_display_name_trgm_idx on public.profiles using gin (display_name extensions.gin_trgm_ops);
create index profiles_username_trgm_idx on public.profiles using gin (username extensions.gin_trgm_ops);
create index profiles_city_trgm_idx on public.profiles using gin (city extensions.gin_trgm_ops);
create index profiles_specializations_idx on public.profiles using gin (specializations);
create index profiles_collab_formats_idx on public.profiles using gin (collab_formats);
create index profiles_type_idx on public.profiles (profile_type);
create index profiles_created_at_idx on public.profiles (created_at desc);
create index profiles_last_active_idx on public.profiles (last_active_at desc);

-- Приватная часть профиля: личные данные и настройки. Читать и менять может только владелец.
-- Наружу отдельные поля попадают только через функцию profile_public_details()
-- и только если пользователь сам разрешил их показывать.
create table public.profile_private (
  id uuid primary key references public.profiles (id) on delete cascade,
  birth_date date,
  show_age boolean not null default false,
  -- Добровольные параметры модели. Не участвуют в публичном поиске.
  height_cm smallint check (height_cm between 100 and 230),
  clothing_size text check (char_length(clothing_size) <= 20),
  shoe_size text check (char_length(shoe_size) <= 20),
  hair_color text check (char_length(hair_color) <= 40),
  eye_color text check (char_length(eye_color) <= 40),
  show_params boolean not null default false,
  -- Контакты с настройкой видимости. По умолчанию скрыты: общение идёт через чат.
  contact_email text check (char_length(contact_email) <= 200),
  contact_phone text check (char_length(contact_phone) <= 40),
  contact_telegram text check (char_length(contact_telegram) <= 64),
  contacts_visibility public.contacts_visibility not null default 'nobody',
  -- Настройки уведомлений
  notify_messages boolean not null default true,
  notify_applications boolean not null default true,
  notify_project_updates boolean not null default true,
  notify_likes boolean not null default true,
  notify_mentions boolean not null default true,
  -- Согласия, полученные при регистрации
  terms_accepted_at timestamptz,
  personal_data_consent_at timestamptz,
  age_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Портфолио
-- -----------------------------------------------------------------------------

create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  description text check (char_length(description) <= 3000),
  category_slug text references public.categories (slug) on update cascade on delete set null,
  shot_on date,
  is_published boolean not null default true,
  -- Обложка портфолио (не больше одной на пользователя)
  is_cover boolean not null default false,
  position integer not null default 0,
  likes_count integer not null default 0 check (likes_count >= 0),
  -- Денормализованная обложка работы (первое изображение), обновляется триггером
  cover_image_url text,
  cover_width integer,
  cover_height integer,
  images_count integer not null default 0,
  -- Модерация
  hidden_at timestamptz,
  hidden_reason text check (char_length(hidden_reason) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index portfolio_items_one_cover_idx on public.portfolio_items (owner_id) where is_cover;
create index portfolio_items_owner_idx on public.portfolio_items (owner_id, position, created_at desc);
create index portfolio_items_feed_idx on public.portfolio_items (created_at desc)
  where is_published and hidden_at is null;
create index portfolio_items_category_idx on public.portfolio_items (category_slug);
create index portfolio_items_title_trgm_idx on public.portfolio_items using gin (title extensions.gin_trgm_ops);

create table public.portfolio_images (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.portfolio_items (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  -- Путь в Storage (bucket "media"). Для демо-данных с внешними ссылками — null.
  storage_path text check (char_length(storage_path) <= 500),
  url text not null check (char_length(url) <= 1000),
  width integer check (width > 0),
  height integer check (height > 0),
  alt text check (char_length(alt) <= 300),
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index portfolio_images_item_idx on public.portfolio_images (item_id, position);

create table public.portfolio_tags (
  item_id uuid not null references public.portfolio_items (id) on delete cascade,
  tag text not null check (tag ~ '^[[:alnum:]_-]{1,32}$'),
  primary key (item_id, tag)
);

create index portfolio_tags_tag_idx on public.portfolio_tags (tag);

-- Участники съёмки: зарегистрированные пользователи или просто имя.
create table public.portfolio_credits (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.portfolio_items (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete cascade,
  name text check (char_length(btrim(name)) between 1 and 80),
  role public.team_role not null,
  created_at timestamptz not null default now(),
  check (profile_id is not null or name is not null),
  unique (item_id, profile_id)
);

create index portfolio_credits_profile_idx on public.portfolio_credits (profile_id);

-- -----------------------------------------------------------------------------
-- Сообщения
-- -----------------------------------------------------------------------------

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  -- Ключ личного диалога "<меньший uuid>:<больший uuid>" — не даёт создать дубликаты.
  direct_key text unique,
  created_by uuid references public.profiles (id) on delete set null,
  last_message_at timestamptz,
  created_at timestamptz not null default now()
);

create index conversations_last_message_idx on public.conversations (last_message_at desc nulls last);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index conversation_members_user_idx on public.conversation_members (user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index messages_conversation_idx on public.messages (conversation_id, created_at desc);
create index messages_sender_idx on public.messages (sender_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Проекты и отклики
-- -----------------------------------------------------------------------------

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 120),
  description text not null check (char_length(btrim(description)) between 10 and 5000),
  city text check (char_length(city) <= 80),
  location text check (char_length(location) <= 160),
  shoot_date date,
  category_slug text references public.categories (slug) on update cascade on delete set null,
  looking_for public.team_role[] not null check (cardinality(looking_for) between 1 and 5),
  collab_format public.collab_format not null,
  -- Условия участия
  terms text check (char_length(terms) <= 2000),
  -- Как будут использоваться снимки (оговаривается отдельно, в том числе для TFP)
  usage_rights text check (char_length(usage_rights) <= 2000),
  requirements text check (char_length(requirements) <= 2000),
  spots smallint not null default 1 check (spots between 1 and 50),
  cover_url text check (char_length(cover_url) <= 1000),
  cover_path text check (char_length(cover_path) <= 500),
  status public.project_status not null default 'open',
  applications_count integer not null default 0 check (applications_count >= 0),
  hidden_at timestamptz,
  hidden_reason text check (char_length(hidden_reason) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_author_idx on public.projects (author_id, created_at desc);
create index projects_feed_idx on public.projects (status, created_at desc) where hidden_at is null;
create index projects_category_idx on public.projects (category_slug);
create index projects_looking_for_idx on public.projects using gin (looking_for);
create index projects_title_trgm_idx on public.projects using gin (title extensions.gin_trgm_ops);
create index projects_city_trgm_idx on public.projects using gin (city extensions.gin_trgm_ops);

create table public.project_applications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  applicant_id uuid not null references public.profiles (id) on delete cascade,
  role public.team_role,
  message text not null check (char_length(btrim(message)) between 1 and 1000),
  status public.application_status not null default 'pending',
  conversation_id uuid references public.conversations (id) on delete set null,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, applicant_id)
);

create index project_applications_applicant_idx on public.project_applications (applicant_id, created_at desc);
create index project_applications_project_idx on public.project_applications (project_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Социальные функции
-- -----------------------------------------------------------------------------

create table public.likes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  item_id uuid not null references public.portfolio_items (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create index likes_item_idx on public.likes (item_id);
create index likes_user_created_idx on public.likes (user_id, created_at desc);

-- Избранное: либо работа, либо пользователь.
create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  item_id uuid references public.portfolio_items (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (num_nonnulls(item_id, profile_id) = 1),
  check (profile_id is distinct from user_id)
);

create unique index favorites_user_item_idx on public.favorites (user_id, item_id) where item_id is not null;
create unique index favorites_user_profile_idx on public.favorites (user_id, profile_id) where profile_id is not null;
create index favorites_user_created_idx on public.favorites (user_id, created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  type public.notification_type not null,
  -- Данные для отображения: id и названия сущностей, статус, счётчик и т.д.
  data jsonb not null default '{}'::jsonb,
  -- Ключ группировки однотипных непрочитанных уведомлений (например, "conv:<id>")
  group_key text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;
create unique index notifications_unread_group_idx on public.notifications (user_id, group_key)
  where read_at is null and group_key is not null;

-- -----------------------------------------------------------------------------
-- Безопасность сообщества
-- -----------------------------------------------------------------------------

create table public.user_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index user_blocks_blocked_idx on public.user_blocks (blocked_id);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id) on delete set null,
  target_type public.report_target not null,
  target_id uuid not null,
  -- Владелец контента, на который пожаловались (для быстрых действий модератора)
  target_owner_id uuid references public.profiles (id) on delete set null,
  reason public.report_reason not null,
  details text check (char_length(details) <= 2000),
  -- Снимок содержимого на момент жалобы. Для сообщений — только текст
  -- обжалованного сообщения: модератор не получает доступа ко всей переписке.
  snapshot jsonb not null default '{}'::jsonb,
  status public.report_status not null default 'open',
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  resolution_note text check (char_length(resolution_note) <= 1000),
  created_at timestamptz not null default now()
);

create index reports_status_idx on public.reports (status, created_at desc);
create index reports_reporter_idx on public.reports (reporter_id, created_at desc);
create index reports_target_idx on public.reports (target_type, target_id);

-- -----------------------------------------------------------------------------
-- Справочные данные
-- -----------------------------------------------------------------------------

insert into public.categories (slug, name, translations, for_photographers, for_models, for_works, sort_order) values
  ('portrait',     'Портрет',                 '{"en": "Portrait"}',       true,  true,  true,  10),
  ('fashion',      'Fashion',                 '{"en": "Fashion"}',        true,  true,  true,  20),
  ('beauty',       'Beauty',                  '{"en": "Beauty"}',         true,  true,  true,  30),
  ('street',       'Street',                  '{"en": "Street"}',         true,  false, true,  40),
  ('street-style', 'Street style',            '{"en": "Street style"}',   false, true,  true,  45),
  ('wedding',      'Свадебная съёмка',        '{"en": "Wedding"}',        true,  false, true,  50),
  ('reportage',    'Репортаж',                '{"en": "Reportage"}',      true,  false, true,  60),
  ('product',      'Предметная съёмка',       '{"en": "Product"}',        true,  false, true,  70),
  ('fine-art',     'Художественная съёмка',   '{"en": "Fine art"}',       true,  false, true,  80),
  ('commercial',   'Коммерческая съёмка',     '{"en": "Commercial"}',     false, true,  true,  90),
  ('catalog',      'Каталожная съёмка',       '{"en": "Catalog"}',        false, true,  true,  100),
  ('art-projects', 'Арт-проекты',             '{"en": "Art projects"}',   false, true,  true,  110);
