-- =============================================================================
-- FRAME — модели платформы в примерочной
-- Зарегистрированная модель может открыть своё фото для примерки: тогда другие
-- участники выбирают её из списка «Модели FRAME» и примеряют на неё свои наряды.
-- Без явного согласия самой модели её фото никому не доступно (ст. 152.1 ГК РФ).
-- Созданные образы остаются приватными — их видит только автор.
-- =============================================================================

alter table public.tryon_models
  add column is_shared boolean not null default false,
  add column shared_at timestamptz;

create index tryon_models_shared_idx on public.tryon_models (shared_at desc) where is_shared;

-- Профиль относится к моделям (тип профиля показывается в каталоге моделей) и не заблокирован.
create or replace function public.is_model_profile(p_profile uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    join public.profile_types pt on pt.slug = p.profile_type
    where p.id = p_profile and p.banned_at is null and pt.shows_in_model_catalog
  );
$$;

-- Фото модели доступно текущему пользователю для примерки.
create or replace function public.is_tryon_model_shared_with_me(p_owner uuid, p_shared boolean)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_shared
    and p_owner <> (select auth.uid())
    and public.is_active_user()
    and public.is_model_profile(p_owner)
    and not public.is_blocked_between(p_owner, (select auth.uid()));
$$;

create or replace function public.tryon_models_set_shared_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_shared is distinct from old.is_shared then
    new.shared_at := case when new.is_shared then now() else null end;
  end if;
  return new;
end;
$$;

create trigger tryon_models_shared_at before update of is_shared on public.tryon_models
  for each row execute function public.tryon_models_set_shared_at();

revoke execute on function
  public.is_model_profile(uuid),
  public.is_tryon_model_shared_with_me(uuid, boolean),
  public.tryon_models_set_shared_at()
  from public, anon, authenticated;
-- Проверки используются внутри политик RLS.
grant execute on function public.is_model_profile(uuid), public.is_tryon_model_shared_with_me(uuid, boolean) to authenticated;

grant update (name, is_shared) on public.tryon_models to authenticated;

-- -----------------------------------------------------------------------------
-- Политики
-- -----------------------------------------------------------------------------

drop policy "tryon_models: owner reads" on public.tryon_models;
create policy "tryon_models: owner or shared with me"
  on public.tryon_models for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_tryon_model_shared_with_me(owner_id, is_shared));

-- Открыть фото для примерки может только владелец с профилем модели.
drop policy "tryon_models: owner updates" on public.tryon_models;
create policy "tryon_models: owner updates"
  on public.tryon_models for update to authenticated
  using (owner_id = (select auth.uid()) and public.is_active_user())
  with check (owner_id = (select auth.uid()) and (not is_shared or public.is_model_profile(owner_id)));

drop policy "tryon_results: owner inserts with own model" on public.tryon_results;
create policy "tryon_results: owner inserts with own or shared model"
  on public.tryon_results for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and public.is_active_user()
    and exists (
      select 1 from public.tryon_models m
      where m.id = model_id
        and (m.owner_id = (select auth.uid()) or public.is_tryon_model_shared_with_me(m.owner_id, m.is_shared))
    )
  );

-- Файл открытой модели читают все, кому она доступна (для выбора и генерации).
create policy "tryon storage: read shared model photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'tryon'
    and exists (
      select 1 from public.tryon_models m
      where m.storage_path = objects.name
        and public.is_tryon_model_shared_with_me(m.owner_id, m.is_shared)
    )
  );
