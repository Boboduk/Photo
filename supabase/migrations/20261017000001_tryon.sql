-- =============================================================================
-- FRAME — виртуальная примерочная
-- Пользователь загружает фото модели (себя или совершеннолетнего человека, который
-- дал согласие) и фото нарядов; сервер генерирует снимок той же модели в выбранных
-- нарядах. Все файлы лежат в приватном бакете tryon и доступны только владельцу.
-- =============================================================================

create type public.garment_category as enum (
  'top', 'bottom', 'dress', 'outerwear', 'shoes', 'accessory', 'full_look'
);

create type public.tryon_status as enum ('processing', 'succeeded', 'failed');

-- -----------------------------------------------------------------------------
-- Таблицы
-- -----------------------------------------------------------------------------

create table public.tryon_models (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  storage_path text not null unique check (char_length(storage_path) <= 500),
  width integer check (width > 0),
  height integer check (height > 0),
  -- Момент, когда пользователь подтвердил согласие человека на фото.
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index tryon_models_owner_idx on public.tryon_models (owner_id, created_at desc);

create table public.tryon_garments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  category public.garment_category not null,
  storage_path text not null unique check (char_length(storage_path) <= 500),
  width integer check (width > 0),
  height integer check (height > 0),
  created_at timestamptz not null default now()
);

create index tryon_garments_owner_idx on public.tryon_garments (owner_id, created_at desc);

create table public.tryon_results (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  -- Результат остаётся, даже если модель или наряд потом удалили.
  model_id uuid references public.tryon_models (id) on delete set null,
  garment_ids uuid[] not null check (cardinality(garment_ids) between 1 and 5),
  instructions text check (char_length(instructions) <= 500),
  status public.tryon_status not null default 'processing',
  storage_path text unique check (char_length(storage_path) <= 500),
  width integer check (width > 0),
  height integer check (height > 0),
  error text check (char_length(error) <= 200),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index tryon_results_owner_idx on public.tryon_results (owner_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Лимиты. Генерация стоит денег, поэтому частота ограничивается в базе,
-- до обращения к модели: строка результата создаётся перед вызовом API.
-- -----------------------------------------------------------------------------

create or replace function public.tryon_models_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.tryon_models where owner_id = new.owner_id) >= 20 then
    raise exception 'limit_reached' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create or replace function public.tryon_garments_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.tryon_garments where owner_id = new.owner_id) >= 300 then
    raise exception 'limit_reached' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create or replace function public.tryon_results_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Параллельные запросы одного пользователя проверяются по очереди.
  perform pg_advisory_xact_lock(hashtext('tryon_results:' || new.owner_id::text));

  if (
    select count(*) from public.tryon_results
    where owner_id = new.owner_id
      and status = 'processing'
      and created_at > now() - interval '5 minutes'
  ) >= 2 then
    raise exception 'tryon_busy' using errcode = 'P0001';
  end if;

  perform public.enforce_rate_limit(
    (select count(*) from public.tryon_results
      where owner_id = new.owner_id and created_at > now() - interval '1 hour'),
    20
  );
  perform public.enforce_rate_limit(
    (select count(*) from public.tryon_results
      where owner_id = new.owner_id and created_at > now() - interval '1 day'),
    100
  );
  return new;
end;
$$;

create trigger tryon_models_limit before insert on public.tryon_models
  for each row execute function public.tryon_models_limit();
create trigger tryon_garments_limit before insert on public.tryon_garments
  for each row execute function public.tryon_garments_limit();
create trigger tryon_results_limit before insert on public.tryon_results
  for each row execute function public.tryon_results_limit();

-- -----------------------------------------------------------------------------
-- Привилегии. Supabase по умолчанию выдаёт новым таблицам и функциям все права
-- для anon и authenticated — забираем их и выдаём только нужное.
-- -----------------------------------------------------------------------------

revoke all on public.tryon_models, public.tryon_garments, public.tryon_results from anon, authenticated;
grant all on public.tryon_models, public.tryon_garments, public.tryon_results to service_role;

revoke execute on function
  public.tryon_models_limit(),
  public.tryon_garments_limit(),
  public.tryon_results_limit()
  from public, anon, authenticated;

grant select, delete on public.tryon_models, public.tryon_garments, public.tryon_results to authenticated;

grant insert (name, storage_path, width, height) on public.tryon_models to authenticated;
grant update (name) on public.tryon_models to authenticated;

grant insert (name, category, storage_path, width, height) on public.tryon_garments to authenticated;
grant update (name, category) on public.tryon_garments to authenticated;

grant insert (model_id, garment_ids, instructions) on public.tryon_results to authenticated;
grant update (status, storage_path, width, height, error, completed_at) on public.tryon_results to authenticated;

-- -----------------------------------------------------------------------------
-- Row Level Security: всё видно и меняется только владельцем.
-- Модераторы доступа не имеют — это личные материалы, они нигде не публикуются.
-- -----------------------------------------------------------------------------

alter table public.tryon_models enable row level security;
alter table public.tryon_garments enable row level security;
alter table public.tryon_results enable row level security;

create policy "tryon_models: owner reads"
  on public.tryon_models for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "tryon_models: owner inserts own uploads"
  on public.tryon_models for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and public.is_active_user()
    and storage_path like (select auth.uid())::text || '/models/%'
  );

create policy "tryon_models: owner updates"
  on public.tryon_models for update to authenticated
  using (owner_id = (select auth.uid()) and public.is_active_user())
  with check (owner_id = (select auth.uid()));

create policy "tryon_models: owner deletes"
  on public.tryon_models for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy "tryon_garments: owner reads"
  on public.tryon_garments for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "tryon_garments: owner inserts own uploads"
  on public.tryon_garments for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and public.is_active_user()
    and storage_path like (select auth.uid())::text || '/garments/%'
  );

create policy "tryon_garments: owner updates"
  on public.tryon_garments for update to authenticated
  using (owner_id = (select auth.uid()) and public.is_active_user())
  with check (owner_id = (select auth.uid()));

create policy "tryon_garments: owner deletes"
  on public.tryon_garments for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy "tryon_results: owner reads"
  on public.tryon_results for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "tryon_results: owner inserts with own model"
  on public.tryon_results for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and public.is_active_user()
    and exists (
      select 1 from public.tryon_models m
      where m.id = model_id and m.owner_id = (select auth.uid())
    )
  );

create policy "tryon_results: owner updates"
  on public.tryon_results for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and (storage_path is null or storage_path like (select auth.uid())::text || '/results/%')
  );

create policy "tryon_results: owner deletes"
  on public.tryon_results for delete to authenticated
  using (owner_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Storage: приватный бакет, файлы раскладываются по папкам <user_id>/...
-- Изображения отдаются только по временным подписанным ссылкам.
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tryon', 'tryon', false, 10 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "tryon storage: read own files"
  on storage.objects for select to authenticated
  using (bucket_id = 'tryon' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "tryon storage: upload to own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'tryon'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.is_active_user()
  );

create policy "tryon storage: delete own files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'tryon' and (storage.foldername(name))[1] = (select auth.uid())::text);
