-- =============================================================================
-- FRAME — права доступа и Row Level Security
-- Принцип: всё запрещено, пока явно не разрешено. Изменение служебных полей
-- (роль, блокировка, счётчики, модерация) закрыто на уровне колонок.
-- =============================================================================

-- Владелец записи по умолчанию — текущий пользователь. Колонки владельца не входят
-- в список разрешённых для вставки, поэтому подставить чужой id невозможно.
alter table public.portfolio_items alter column owner_id set default auth.uid();
alter table public.portfolio_images alter column owner_id set default auth.uid();
alter table public.projects alter column author_id set default auth.uid();
alter table public.messages alter column sender_id set default auth.uid();
alter table public.likes alter column user_id set default auth.uid();
alter table public.favorites alter column user_id set default auth.uid();
alter table public.user_blocks alter column blocker_id set default auth.uid();

-- -----------------------------------------------------------------------------
-- Привилегии на таблицы
-- -----------------------------------------------------------------------------

revoke all on all tables in schema public from anon, authenticated;
grant all on all tables in schema public to service_role;

-- Публичное чтение
grant select on public.categories, public.profiles, public.portfolio_items, public.portfolio_images,
  public.portfolio_tags, public.portfolio_credits, public.projects
  to anon, authenticated;

-- Только для авторизованных
grant select on public.profile_private, public.conversations, public.conversation_members,
  public.messages, public.project_applications, public.notifications, public.user_blocks, public.reports
  to authenticated;

-- Лайки и избранное читает только владелец (см. политики ниже). Гостю право SELECT нужно
-- лишь для того, чтобы функции ленты могли проверить «лайкнуто/сохранено» — политики
-- для роли anon отсутствуют, поэтому гость не видит ни одной строки.
grant select on public.likes, public.favorites to anon, authenticated;

grant insert, update, delete on public.categories to authenticated;

grant update (
  username, display_name, avatar_url, cover_url, city, bio, profile_type, specializations,
  experience, availability, collab_formats, social_links, onboarded_at
) on public.profiles to authenticated;

grant update (
  birth_date, show_age, height_cm, clothing_size, shoe_size, hair_color, eye_color, show_params,
  contact_email, contact_phone, contact_telegram, contacts_visibility,
  notify_messages, notify_applications, notify_project_updates, notify_likes, notify_mentions
) on public.profile_private to authenticated;

grant insert (title, description, category_slug, shot_on, is_published, position)
  on public.portfolio_items to authenticated;
grant update (title, description, category_slug, shot_on, is_published, is_cover, position)
  on public.portfolio_items to authenticated;
grant delete on public.portfolio_items to authenticated;

grant insert (item_id, storage_path, url, width, height, alt, position)
  on public.portfolio_images to authenticated;
grant update (alt, position) on public.portfolio_images to authenticated;
grant delete on public.portfolio_images to authenticated;

grant insert, delete on public.portfolio_tags to authenticated;

grant insert (item_id, profile_id, name, role) on public.portfolio_credits to authenticated;
grant delete on public.portfolio_credits to authenticated;

grant update (last_read_at) on public.conversation_members to authenticated;

grant insert (conversation_id, body) on public.messages to authenticated;

grant insert (
  title, description, city, location, shoot_date, category_slug, looking_for, collab_format,
  terms, usage_rights, requirements, spots, cover_url, cover_path
) on public.projects to authenticated;
grant update (
  title, description, city, location, shoot_date, category_slug, looking_for, collab_format,
  terms, usage_rights, requirements, spots, cover_url, cover_path, status
) on public.projects to authenticated;
grant delete on public.projects to authenticated;

grant insert (item_id), delete on public.likes to authenticated;
grant insert (item_id, profile_id), delete on public.favorites to authenticated;
grant update (read_at), delete on public.notifications to authenticated;
grant insert (blocked_id), delete on public.user_blocks to authenticated;

-- -----------------------------------------------------------------------------
-- Привилегии на функции
-- -----------------------------------------------------------------------------

revoke execute on all functions in schema public from public, anon, authenticated;

-- Проверки, которые используются внутри политик RLS
grant execute on function
  public.is_active_user(),
  public.is_moderator(),
  public.is_admin(),
  public.is_profile_visible(uuid),
  public.is_conversation_member(uuid),
  public.can_send_message(uuid),
  public.is_blocked_between(uuid, uuid),
  public.escape_like(text),
  public.prefix_tsquery(text)
  to anon, authenticated;

-- Публичные функции чтения
grant execute on function
  public.search_profiles(text, text, text, public.profile_type[], text[], text, public.experience_level[],
    public.availability_status[], public.collab_format[], text[], text, integer, integer),
  public.search_portfolio(text, text, text, uuid, text, integer, integer),
  public.search_projects(text, text, text, public.collab_format, public.team_role, public.project_status[],
    uuid, text, integer, integer),
  public.profile_public_details(uuid)
  to anon, authenticated;

-- Действия авторизованных пользователей
grant execute on function
  public.reorder_portfolio(uuid[]),
  public.reorder_portfolio_images(uuid, uuid[]),
  public.set_portfolio_cover(uuid),
  public.toggle_like(uuid),
  public.toggle_favorite(uuid, uuid),
  public.get_or_create_direct_conversation(uuid),
  public.list_conversations(text, uuid, integer),
  public.mark_conversation_read(uuid),
  public.unread_counts(),
  public.apply_to_project(uuid, public.team_role, text, text),
  public.set_application_status(uuid, public.application_status),
  public.submit_report(public.report_target, uuid, public.report_reason, text),
  public.delete_own_account(),
  public.admin_stats(),
  public.admin_list_users(text, text, integer, integer),
  public.admin_set_user_ban(uuid, boolean, text),
  public.admin_set_user_role(uuid, public.app_role),
  public.admin_set_content_hidden(public.report_target, uuid, boolean, text),
  public.admin_delete_content(public.report_target, uuid),
  public.admin_resolve_report(uuid, public.report_status, text)
  to authenticated;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

alter table public.categories enable row level security;
alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;
alter table public.portfolio_items enable row level security;
alter table public.portfolio_images enable row level security;
alter table public.portfolio_tags enable row level security;
alter table public.portfolio_credits enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.projects enable row level security;
alter table public.project_applications enable row level security;
alter table public.likes enable row level security;
alter table public.favorites enable row level security;
alter table public.notifications enable row level security;
alter table public.user_blocks enable row level security;
alter table public.reports enable row level security;

-- Категории ------------------------------------------------------------------

create policy "categories: active are public"
  on public.categories for select
  using (is_active or public.is_moderator());

create policy "categories: admins insert"
  on public.categories for insert to authenticated
  with check (public.is_admin());

create policy "categories: admins update"
  on public.categories for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "categories: admins delete"
  on public.categories for delete to authenticated
  using (public.is_admin());

-- Профили --------------------------------------------------------------------

create policy "profiles: public unless banned"
  on public.profiles for select
  using (banned_at is null or id = (select auth.uid()) or public.is_moderator());

create policy "profiles: owner updates"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()) and banned_at is null)
  with check (id = (select auth.uid()));

create policy "profile_private: owner reads"
  on public.profile_private for select to authenticated
  using (id = (select auth.uid()));

create policy "profile_private: owner updates"
  on public.profile_private for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Портфолио ------------------------------------------------------------------

create policy "portfolio_items: published are public"
  on public.portfolio_items for select
  using (
    (is_published and hidden_at is null and public.is_profile_visible(owner_id))
    or owner_id = (select auth.uid())
    or public.is_moderator()
  );

create policy "portfolio_items: owner inserts"
  on public.portfolio_items for insert to authenticated
  with check (owner_id = (select auth.uid()) and public.is_active_user());

create policy "portfolio_items: owner updates"
  on public.portfolio_items for update to authenticated
  using (owner_id = (select auth.uid()) and public.is_active_user())
  with check (owner_id = (select auth.uid()));

create policy "portfolio_items: owner or moderator deletes"
  on public.portfolio_items for delete to authenticated
  using (owner_id = (select auth.uid()) or public.is_moderator());

create policy "portfolio_images: visible with item"
  on public.portfolio_images for select
  using (exists (select 1 from public.portfolio_items i where i.id = item_id));

create policy "portfolio_images: owner inserts own uploads"
  on public.portfolio_images for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and public.is_active_user()
    and exists (
      select 1 from public.portfolio_items i
      where i.id = item_id and i.owner_id = (select auth.uid())
    )
    -- Только файлы из собственной папки в Storage
    and storage_path like (select auth.uid())::text || '/%'
    and url like '%/storage/v1/object/public/media/' || storage_path
  );

create policy "portfolio_images: owner updates"
  on public.portfolio_images for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "portfolio_images: owner or moderator deletes"
  on public.portfolio_images for delete to authenticated
  using (owner_id = (select auth.uid()) or public.is_moderator());

create policy "portfolio_tags: visible with item"
  on public.portfolio_tags for select
  using (exists (select 1 from public.portfolio_items i where i.id = item_id));

create policy "portfolio_tags: owner inserts"
  on public.portfolio_tags for insert to authenticated
  with check (exists (
    select 1 from public.portfolio_items i
    where i.id = item_id and i.owner_id = (select auth.uid())
  ));

create policy "portfolio_tags: owner deletes"
  on public.portfolio_tags for delete to authenticated
  using (exists (
    select 1 from public.portfolio_items i
    where i.id = item_id and i.owner_id = (select auth.uid())
  ));

create policy "portfolio_credits: visible with item"
  on public.portfolio_credits for select
  using (exists (select 1 from public.portfolio_items i where i.id = item_id));

create policy "portfolio_credits: owner inserts"
  on public.portfolio_credits for insert to authenticated
  with check (
    public.is_active_user()
    and exists (
      select 1 from public.portfolio_items i
      where i.id = item_id and i.owner_id = (select auth.uid())
    )
    and (profile_id is null or public.is_profile_visible(profile_id))
  );

-- Автор работы управляет отметками; отмеченный пользователь может убрать себя.
create policy "portfolio_credits: owner or credited user deletes"
  on public.portfolio_credits for delete to authenticated
  using (
    profile_id = (select auth.uid())
    or exists (
      select 1 from public.portfolio_items i
      where i.id = item_id and i.owner_id = (select auth.uid())
    )
  );

-- Диалоги и сообщения ----------------------------------------------------------
-- Администраторы и модераторы НЕ имеют доступа к чужим перепискам.

create policy "conversations: members read"
  on public.conversations for select to authenticated
  using (public.is_conversation_member(id));

create policy "conversation_members: members read"
  on public.conversation_members for select to authenticated
  using (user_id = (select auth.uid()) or public.is_conversation_member(conversation_id));

create policy "conversation_members: update own read marker"
  on public.conversation_members for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "messages: members read"
  on public.messages for select to authenticated
  using (public.is_conversation_member(conversation_id));

create policy "messages: members send as themselves"
  on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and public.can_send_message(conversation_id));

-- Проекты и отклики ------------------------------------------------------------

create policy "projects: public unless hidden"
  on public.projects for select
  using (
    (hidden_at is null and public.is_profile_visible(author_id))
    or author_id = (select auth.uid())
    or public.is_moderator()
  );

create policy "projects: author inserts"
  on public.projects for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and public.is_active_user()
    and (cover_path is null or cover_path like (select auth.uid())::text || '/%')
  );

create policy "projects: author updates"
  on public.projects for update to authenticated
  using (author_id = (select auth.uid()) and public.is_active_user())
  with check (
    author_id = (select auth.uid())
    and (cover_path is null or cover_path like (select auth.uid())::text || '/%')
  );

create policy "projects: author or moderator deletes"
  on public.projects for delete to authenticated
  using (author_id = (select auth.uid()) or public.is_moderator());

-- Отклики создаются и меняют статус только через функции apply_to_project
-- и set_application_status. Читать их могут откликнувшийся и автор проекта.
create policy "project_applications: applicant or project author reads"
  on public.project_applications for select to authenticated
  using (
    applicant_id = (select auth.uid())
    or exists (
      select 1 from public.projects p
      where p.id = project_id and p.author_id = (select auth.uid())
    )
  );

-- Лайки и избранное -------------------------------------------------------------

create policy "likes: own"
  on public.likes for select to authenticated
  using (user_id = (select auth.uid()));

create policy "likes: like visible items"
  on public.likes for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_active_user()
    and exists (
      select 1 from public.portfolio_items i
      where i.id = item_id and i.is_published and i.hidden_at is null
    )
  );

create policy "likes: remove own"
  on public.likes for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "favorites: own"
  on public.favorites for select to authenticated
  using (user_id = (select auth.uid()));

create policy "favorites: save visible content"
  on public.favorites for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_active_user()
    and (
      (item_id is not null and exists (
        select 1 from public.portfolio_items i
        where i.id = item_id and i.is_published and i.hidden_at is null
      ))
      or (profile_id is not null and public.is_profile_visible(profile_id))
    )
  );

create policy "favorites: remove own"
  on public.favorites for delete to authenticated
  using (user_id = (select auth.uid()));

-- Уведомления --------------------------------------------------------------------
-- Создаются только триггерами (security definer).

create policy "notifications: own"
  on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));

create policy "notifications: mark own read"
  on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "notifications: delete own"
  on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));

-- Блокировки и жалобы -------------------------------------------------------------

create policy "user_blocks: own"
  on public.user_blocks for select to authenticated
  using (blocker_id = (select auth.uid()));

create policy "user_blocks: block others"
  on public.user_blocks for insert to authenticated
  with check (blocker_id = (select auth.uid()) and blocked_id <> (select auth.uid()));

create policy "user_blocks: unblock"
  on public.user_blocks for delete to authenticated
  using (blocker_id = (select auth.uid()));

-- Жалобы создаются через submit_report(), решаются через admin_resolve_report().
create policy "reports: reporter or moderator reads"
  on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or public.is_moderator());
