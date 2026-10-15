-- =============================================================================
-- FRAME — хранилище изображений и Realtime
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Storage
-- Файлы раскладываются по папкам пользователей: <user_id>/<...>.
-- Ограничения размера и типа файлов проверяет сам Storage.
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp']),
  ('media', 'media', true, 15 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Чтение через API нужно для списка и удаления файлов (Storage сначала выбирает
-- объекты с учётом RLS). Публичные ссылки на изображения работают без этой политики.
create policy "frame storage: read own files or moderate"
  on storage.objects for select to authenticated
  using (
    bucket_id in ('avatars', 'media')
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or public.is_moderator()
    )
  );

create policy "frame storage: upload to own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('avatars', 'media')
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.is_active_user()
  );

create policy "frame storage: update own files"
  on storage.objects for update to authenticated
  using (
    bucket_id in ('avatars', 'media')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id in ('avatars', 'media')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Владелец удаляет свои файлы; модератор — файлы удалённого за нарушения контента.
create policy "frame storage: delete own files or moderate"
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('avatars', 'media')
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or public.is_moderator()
    )
  );

-- -----------------------------------------------------------------------------
-- Realtime: новые сообщения, отметки о прочтении и уведомления.
-- Realtime применяет политики RLS, поэтому каждый получает только свои события.
-- -----------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end;
$$;

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversation_members;
alter publication supabase_realtime add table public.notifications;
