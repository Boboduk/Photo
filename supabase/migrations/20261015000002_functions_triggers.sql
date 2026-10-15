-- =============================================================================
-- FRAME — вспомогательные функции и триггеры
-- Все функции с security definer используют пустой search_path и полные имена.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Проверки текущего пользователя (используются в политиках RLS)
-- -----------------------------------------------------------------------------

-- Пользователь авторизован и не заблокирован.
create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and banned_at is null
  );
$$;

create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role in ('moderator', 'admin')
      and banned_at is null
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
      and banned_at is null
  );
$$;

-- Профиль не заблокирован (для фильтрации контента заблокированных авторов).
create or replace function public.is_profile_visible(p_profile uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = p_profile and banned_at is null);
$$;

create or replace function public.is_conversation_member(p_conversation uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = p_conversation and user_id = (select auth.uid())
  );
$$;

-- Есть ли блокировка между двумя пользователями в любую сторону.
create or replace function public.is_blocked_between(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_blocks
    where (blocker_id = p_a and blocked_id = p_b)
       or (blocker_id = p_b and blocked_id = p_a)
  );
$$;

-- Может ли текущий пользователь писать в диалог: он участник, не заблокирован,
-- собеседник существует, не заблокирован администрацией и нет взаимной блокировки.
create or replace function public.can_send_message(p_conversation uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_active_user()
    and public.is_conversation_member(p_conversation)
    and not exists (
      select 1
      from public.conversation_members cm
      left join public.profiles p on p.id = cm.user_id
      where cm.conversation_id = p_conversation
        and cm.user_id <> (select auth.uid())
        and (
          p.banned_at is not null
          or public.is_blocked_between((select auth.uid()), cm.user_id)
        )
    )
    and exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = p_conversation and cm.user_id <> (select auth.uid())
    );
$$;

-- -----------------------------------------------------------------------------
-- Ограничение частоты действий (защита от спама)
-- -----------------------------------------------------------------------------

create or replace function public.enforce_rate_limit(p_recent bigint, p_max integer)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_recent >= p_max then
    raise exception 'rate_limited' using errcode = 'P0001', hint = 'Слишком много действий за короткое время';
  end if;
end;
$$;

create or replace function public.rate_limit_messages()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.enforce_rate_limit(
    (select count(*) from public.messages
      where sender_id = new.sender_id and created_at > now() - interval '1 minute'),
    20
  );
  return new;
end;
$$;

create or replace function public.rate_limit_portfolio_items()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.enforce_rate_limit(
    (select count(*) from public.portfolio_items
      where owner_id = new.owner_id and created_at > now() - interval '1 hour'),
    40
  );
  return new;
end;
$$;

create or replace function public.rate_limit_projects()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.enforce_rate_limit(
    (select count(*) from public.projects
      where author_id = new.author_id and created_at > now() - interval '1 hour'),
    5
  );
  return new;
end;
$$;

create or replace function public.rate_limit_applications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.enforce_rate_limit(
    (select count(*) from public.project_applications
      where applicant_id = new.applicant_id and created_at > now() - interval '1 hour'),
    20
  );
  return new;
end;
$$;

create trigger messages_rate_limit before insert on public.messages
  for each row execute function public.rate_limit_messages();
create trigger portfolio_items_rate_limit before insert on public.portfolio_items
  for each row execute function public.rate_limit_portfolio_items();
create trigger projects_rate_limit before insert on public.projects
  for each row execute function public.rate_limit_projects();
create trigger project_applications_rate_limit before insert on public.project_applications
  for each row execute function public.rate_limit_applications();

-- -----------------------------------------------------------------------------
-- Временные метки
-- -----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger profile_private_updated_at before update on public.profile_private
  for each row execute function public.set_updated_at();
create trigger portfolio_items_updated_at before update on public.portfolio_items
  for each row execute function public.set_updated_at();
create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();
create trigger project_applications_updated_at before update on public.project_applications
  for each row execute function public.set_updated_at();

-- Отметка активности пользователя (для сортировки «по активности»).
create or replace function public.touch_last_active(p_user uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles
     set last_active_at = now()
   where id = p_user and last_active_at < now() - interval '5 minutes';
$$;

create or replace function public.touch_activity_from_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'portfolio_items' then
    perform public.touch_last_active(new.owner_id);
  elsif tg_table_name = 'projects' then
    perform public.touch_last_active(new.author_id);
  elsif tg_table_name = 'project_applications' then
    perform public.touch_last_active(new.applicant_id);
  end if;
  return null;
end;
$$;

create trigger portfolio_items_touch_activity after insert on public.portfolio_items
  for each row execute function public.touch_activity_from_row();
create trigger projects_touch_activity after insert on public.projects
  for each row execute function public.touch_activity_from_row();
create trigger project_applications_touch_activity after insert on public.project_applications
  for each row execute function public.touch_activity_from_row();

-- -----------------------------------------------------------------------------
-- Регистрация: создание профиля по данным из формы
-- -----------------------------------------------------------------------------

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
  v_type public.profile_type;
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

  v_type := case v_meta ->> 'profile_type'
    when 'model' then 'model'::public.profile_type
    when 'both' then 'both'::public.profile_type
    else 'photographer'::public.profile_type
  end;

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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Портфолио: обложка работы, счётчики
-- -----------------------------------------------------------------------------

create or replace function public.refresh_portfolio_item_cover(p_item uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.portfolio_items i
     set cover_image_url = c.url,
         cover_width = c.width,
         cover_height = c.height,
         images_count = c.total
    from (
      select
        (select url from public.portfolio_images where item_id = p_item order by position, created_at limit 1) as url,
        (select width from public.portfolio_images where item_id = p_item order by position, created_at limit 1) as width,
        (select height from public.portfolio_images where item_id = p_item order by position, created_at limit 1) as height,
        (select count(*)::integer from public.portfolio_images where item_id = p_item) as total
    ) c
   where i.id = p_item;
$$;

create or replace function public.portfolio_images_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_portfolio_item_cover(old.item_id);
  else
    perform public.refresh_portfolio_item_cover(new.item_id);
    if tg_op = 'UPDATE' and new.item_id <> old.item_id then
      perform public.refresh_portfolio_item_cover(old.item_id);
    end if;
  end if;
  return null;
end;
$$;

create trigger portfolio_images_refresh_cover
  after insert or update or delete on public.portfolio_images
  for each row execute function public.portfolio_images_changed();

-- -----------------------------------------------------------------------------
-- Уведомления
-- -----------------------------------------------------------------------------

-- Проверяет настройки получателя. Если уведомления этого типа выключены — false.
create or replace function public.wants_notification(p_user uuid, p_type public.notification_type)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select case p_type
      when 'message' then notify_messages
      when 'application' then notify_applications
      when 'application_status' then notify_applications
      when 'project_status' then notify_project_updates
      when 'like' then notify_likes
      when 'mention' then notify_mentions
    end
    from public.profile_private where id = p_user
  ), true);
$$;

-- Создаёт уведомление. Если передан group_key и уже есть непрочитанное уведомление
-- с тем же ключом — обновляет его (увеличивает счётчик), а не создаёт новое.
create or replace function public.notify(
  p_user uuid,
  p_actor uuid,
  p_type public.notification_type,
  p_data jsonb,
  p_group_key text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user is null or p_user = p_actor then
    return;
  end if;
  if not public.wants_notification(p_user, p_type) then
    return;
  end if;

  if p_group_key is null then
    insert into public.notifications (user_id, actor_id, type, data)
    values (p_user, p_actor, p_type, p_data);
  else
    insert into public.notifications (user_id, actor_id, type, data, group_key)
    values (p_user, p_actor, p_type, p_data || jsonb_build_object('count', 1), p_group_key)
    on conflict (user_id, group_key) where read_at is null and group_key is not null
    do update set
      actor_id = excluded.actor_id,
      created_at = now(),
      data = public.notifications.data || excluded.data
        || jsonb_build_object('count', coalesce((public.notifications.data ->> 'count')::integer, 1) + 1);
  end if;
end;
$$;

-- Новое сообщение: обновляем диалог и уведомляем собеседника.
create or replace function public.on_message_inserted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member record;
  v_sender_name text;
begin
  update public.conversations
     set last_message_at = new.created_at
   where id = new.conversation_id;

  -- Отправитель прочитал собственное сообщение
  update public.conversation_members
     set last_read_at = new.created_at
   where conversation_id = new.conversation_id and user_id = new.sender_id;

  perform public.touch_last_active(new.sender_id);

  select display_name into v_sender_name from public.profiles where id = new.sender_id;

  for v_member in
    select user_id from public.conversation_members
    where conversation_id = new.conversation_id and user_id <> new.sender_id
  loop
    perform public.notify(
      v_member.user_id,
      new.sender_id,
      'message',
      jsonb_build_object(
        'conversation_id', new.conversation_id,
        'preview', left(new.body, 140),
        'actor_name', v_sender_name
      ),
      'conv:' || new.conversation_id::text
    );
  end loop;

  return null;
end;
$$;

create trigger messages_after_insert after insert on public.messages
  for each row execute function public.on_message_inserted();

-- Лайк: счётчик и уведомление автору работы.
create or replace function public.on_like_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item record;
begin
  if tg_op = 'INSERT' then
    update public.portfolio_items set likes_count = likes_count + 1
     where id = new.item_id
     returning id, owner_id, title into v_item;

    perform public.notify(
      v_item.owner_id,
      new.user_id,
      'like',
      jsonb_build_object(
        'item_id', v_item.id,
        'item_title', v_item.title,
        'actor_name', (select display_name from public.profiles where id = new.user_id)
      ),
      'like:' || new.item_id::text
    );
    return null;
  end if;

  update public.portfolio_items set likes_count = greatest(likes_count - 1, 0)
   where id = old.item_id;
  return null;
end;
$$;

create trigger likes_changed after insert or delete on public.likes
  for each row execute function public.on_like_changed();

-- Новый отклик: счётчик проекта и уведомление автору.
create or replace function public.on_application_inserted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project record;
begin
  update public.projects set applications_count = applications_count + 1
   where id = new.project_id
   returning id, author_id, title into v_project;

  perform public.notify(
    v_project.author_id,
    new.applicant_id,
    'application',
    jsonb_build_object(
      'project_id', v_project.id,
      'project_title', v_project.title,
      'application_id', new.id,
      'actor_name', (select display_name from public.profiles where id = new.applicant_id)
    )
  );
  return null;
end;
$$;

create trigger project_applications_after_insert after insert on public.project_applications
  for each row execute function public.on_application_inserted();

create or replace function public.on_application_deleted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.projects set applications_count = greatest(applications_count - 1, 0)
   where id = old.project_id;
  return null;
end;
$$;

create trigger project_applications_after_delete after delete on public.project_applications
  for each row execute function public.on_application_deleted();

-- Изменение статуса проекта: уведомляем принятых участников.
create or replace function public.on_project_status_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_applicant record;
begin
  if new.status is distinct from old.status then
    for v_applicant in
      select applicant_id from public.project_applications
      where project_id = new.id and status = 'accepted'
    loop
      perform public.notify(
        v_applicant.applicant_id,
        new.author_id,
        'project_status',
        jsonb_build_object(
          'project_id', new.id,
          'project_title', new.title,
          'status', new.status,
          'actor_name', (select display_name from public.profiles where id = new.author_id)
        )
      );
    end loop;
  end if;
  return null;
end;
$$;

create trigger projects_status_changed after update of status on public.projects
  for each row execute function public.on_project_status_changed();

-- Отметка пользователя как участника съёмки.
create or replace function public.on_credit_inserted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item record;
begin
  if new.profile_id is null then
    return null;
  end if;

  select id, owner_id, title into v_item from public.portfolio_items where id = new.item_id;

  perform public.notify(
    new.profile_id,
    v_item.owner_id,
    'mention',
    jsonb_build_object(
      'item_id', v_item.id,
      'item_title', v_item.title,
      'role', new.role,
      'actor_name', (select display_name from public.profiles where id = v_item.owner_id)
    )
  );
  return null;
end;
$$;

create trigger portfolio_credits_after_insert after insert on public.portfolio_credits
  for each row execute function public.on_credit_inserted();
