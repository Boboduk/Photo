-- =============================================================================
-- FRAME — демонстрационные данные для локальной разработки
-- Демо-аккаунты не имеют пароля и не могут войти в систему.
-- Используются только для предварительного наполнения интерфейса.
-- Удалить их можно запросом: delete from auth.users where email like '%@demo.frame.local';
-- =============================================================================

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, phone_change, phone_change_token, reauthentication_token) values
  ('00000000-0000-0000-0000-000000000000', '9d5716f8-3486-5d57-930e-57111401f9e5', 'authenticated', 'authenticated', 'alina.sokolova@demo.frame.local', '', now(), '{"provider":"email","providers":["email"]}', '{"username": "alina.sokolova", "display_name": "Алина Соколова", "profile_type": "photographer"}', now() - interval '120 days', now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '93bce4d3-d0a0-59c2-bfba-3e7f4632b090', 'authenticated', 'authenticated', 'maxim.orlov@demo.frame.local', '', now(), '{"provider":"email","providers":["email"]}', '{"username": "maxim.orlov", "display_name": "Максим Орлов", "profile_type": "photographer"}', now() - interval '112 days', now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '5c3a941b-96d3-5710-85a7-3e21ac958d4f', 'authenticated', 'authenticated', 'nika.belova@demo.frame.local', '', now(), '{"provider":"email","providers":["email"]}', '{"username": "nika.belova", "display_name": "Ника Белова", "profile_type": "photographer"}', now() - interval '104 days', now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'af172229-cadf-536d-9258-bf93df80d489', 'authenticated', 'authenticated', 'denis.kim@demo.frame.local', '', now(), '{"provider":"email","providers":["email"]}', '{"username": "denis.kim", "display_name": "Денис Ким", "profile_type": "photographer"}', now() - interval '96 days', now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '27388cde-8868-505f-b82a-2e074dfd0790', 'authenticated', 'authenticated', 'eva.mironova@demo.frame.local', '', now(), '{"provider":"email","providers":["email"]}', '{"username": "eva.mironova", "display_name": "Ева Миронова", "profile_type": "photographer"}', now() - interval '88 days', now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '9020d816-4402-5e40-b4af-7f97434b842c', 'authenticated', 'authenticated', 'sofia.lebedeva@demo.frame.local', '', now(), '{"provider":"email","providers":["email"]}', '{"username": "sofia.lebedeva", "display_name": "Софья Лебедева", "profile_type": "model"}', now() - interval '80 days', now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'd6dd5229-05ca-5169-93fb-2923414ea145', 'authenticated', 'authenticated', 'artem.volkov@demo.frame.local', '', now(), '{"provider":"email","providers":["email"]}', '{"username": "artem.volkov", "display_name": "Артём Волков", "profile_type": "model"}', now() - interval '72 days', now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'c8363d90-789a-5b3a-8183-b494d3e5c48f', 'authenticated', 'authenticated', 'mila.andreeva@demo.frame.local', '', now(), '{"provider":"email","providers":["email"]}', '{"username": "mila.andreeva", "display_name": "Мила Андреева", "profile_type": "model"}', now() - interval '64 days', now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'ff02e80a-168e-5015-b9f9-13e96b9838a4', 'authenticated', 'authenticated', 'daniil.romanov@demo.frame.local', '', now(), '{"provider":"email","providers":["email"]}', '{"username": "daniil.romanov", "display_name": "Даниил Романов", "profile_type": "model"}', now() - interval '56 days', now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '0a35b8cb-d55f-5223-95e3-315e89057390', 'authenticated', 'authenticated', 'vera.goncharova@demo.frame.local', '', now(), '{"provider":"email","providers":["email"]}', '{"username": "vera.goncharova", "display_name": "Вера Гончарова", "profile_type": "both"}', now() - interval '48 days', now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'e382d45e-d10e-52fb-9880-c2036f1e2382', 'authenticated', 'authenticated', 'lev.zakharov@demo.frame.local', '', now(), '{"provider":"email","providers":["email"]}', '{"username": "lev.zakharov", "display_name": "Лев Захаров", "profile_type": "both"}', now() - interval '40 days', now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '77f3b342-e296-5727-aea4-df92b5e65196', 'authenticated', 'authenticated', 'ksenia.titova@demo.frame.local', '', now(), '{"provider":"email","providers":["email"]}', '{"username": "ksenia.titova", "display_name": "Ксения Титова", "profile_type": "model"}', now() - interval '32 days', now(), '', '', '', '', '', '', '', '');

update public.profiles set
  city = 'Москва', bio = 'Снимаю портреты и fashion-истории с мягким естественным светом. Ищу моделей и стилистов для серии editorial-съёмок этой осенью.', specializations = array['portrait', 'fashion'],
  experience = 'professional', availability = 'available', collab_formats = array['tfp', 'paid', 'commercial']::public.collab_format[],
  avatar_url = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&h=400&q=80', social_links = '{"instagram": "alina_sokolova"}',
  onboarded_at = now(), created_at = now() - interval '120 days', last_active_at = now() - interval '0 hours'
where id = '9d5716f8-3486-5d57-930e-57111401f9e5';
update public.profiles set
  city = 'Санкт-Петербург', bio = 'Уличная фотография и городской портрет. Плёнка и цифра. Люблю долгие прогулки со съёмкой по Петроградке.', specializations = array['street', 'reportage', 'portrait'],
  experience = 'intermediate', availability = 'available', collab_formats = array['tfp', 'collab']::public.collab_format[],
  avatar_url = 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&h=400&q=80', social_links = '{"telegram": "maxim_orlov"}',
  onboarded_at = now(), created_at = now() - interval '112 days', last_active_at = now() - interval '7 hours'
where id = '93bce4d3-d0a0-59c2-bfba-3e7f4632b090';
update public.profiles set
  city = 'Казань', bio = 'Beauty и художественная фотография. Работаю в студии, много экспериментирую с цветом и фактурами.', specializations = array['beauty', 'fine-art'],
  experience = 'professional', availability = 'limited', collab_formats = array['paid', 'commercial', 'collab']::public.collab_format[],
  avatar_url = 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&h=400&q=80', social_links = '{"instagram": "nika_belova"}',
  onboarded_at = now(), created_at = now() - interval '104 days', last_active_at = now() - interval '14 hours'
where id = '5c3a941b-96d3-5710-85a7-3e21ac958d4f';
update public.profiles set
  city = 'Москва', bio = 'Предметная и коммерческая съёмка для брендов. Также снимаю каталоги и lookbook.', specializations = array['product', 'fashion'],
  experience = 'professional', availability = 'available', collab_formats = array['paid', 'commercial']::public.collab_format[],
  avatar_url = 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&h=400&q=80', social_links = '{"telegram": "denis_kim"}',
  onboarded_at = now(), created_at = now() - interval '96 days', last_active_at = now() - interval '21 hours'
where id = 'af172229-cadf-536d-9258-bf93df80d489';
update public.profiles set
  city = 'Екатеринбург', bio = 'Свадебный и семейный фотограф. В свободное время собираю творческие портретные проекты.', specializations = array['wedding', 'portrait'],
  experience = 'intermediate', availability = 'available', collab_formats = array['tfp', 'paid']::public.collab_format[],
  avatar_url = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&h=400&q=80', social_links = '{"instagram": "eva_mironova"}',
  onboarded_at = now(), created_at = now() - interval '88 days', last_active_at = now() - interval '28 hours'
where id = '27388cde-8868-505f-b82a-2e074dfd0790';
update public.profiles set
  city = 'Москва', bio = 'Модель, 3 года в индустрии. Открыта к fashion и beauty-проектам, люблю сложные образы.', specializations = array['fashion', 'beauty', 'catalog'],
  experience = 'intermediate', availability = 'available', collab_formats = array['tfp', 'paid', 'commercial']::public.collab_format[],
  avatar_url = 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&h=400&q=80', social_links = '{"telegram": "sofia_lebedeva"}',
  onboarded_at = now(), created_at = now() - interval '80 days', last_active_at = now() - interval '35 hours'
where id = '9020d816-4402-5e40-b4af-7f97434b842c';
update public.profiles set
  city = 'Санкт-Петербург', bio = 'Начинающая модель. Собираю портфолио, рад творческим TFP-проектам и уличным съёмкам.', specializations = array['commercial', 'street-style'],
  experience = 'beginner', availability = 'available', collab_formats = array['tfp', 'collab']::public.collab_format[],
  avatar_url = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&h=400&q=80', social_links = '{"instagram": "artem_volkov"}',
  onboarded_at = now(), created_at = now() - interval '72 days', last_active_at = now() - interval '42 hours'
where id = 'd6dd5229-05ca-5169-93fb-2923414ea145';
update public.profiles set
  city = 'Казань', bio = 'Люблю арт-проекты и необычные концепции. Занимаюсь танцем — хорошо чувствую движение в кадре.', specializations = array['portrait', 'art-projects', 'beauty'],
  experience = 'intermediate', availability = 'limited', collab_formats = array['tfp', 'collab', 'paid']::public.collab_format[],
  avatar_url = 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&h=400&q=80', social_links = '{"telegram": "mila_andreeva"}',
  onboarded_at = now(), created_at = now() - interval '64 days', last_active_at = now() - interval '49 hours'
where id = 'c8363d90-789a-5b3a-8183-b494d3e5c48f';
update public.profiles set
  city = 'Москва', bio = 'Fashion и каталожные съёмки, работал с локальными брендами одежды. Рост 186.', specializations = array['fashion', 'catalog', 'commercial'],
  experience = 'professional', availability = 'available', collab_formats = array['paid', 'commercial']::public.collab_format[],
  avatar_url = 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&h=400&q=80', social_links = '{"instagram": "daniil_romanov"}',
  onboarded_at = now(), created_at = now() - interval '56 days', last_active_at = now() - interval '6 hours'
where id = 'ff02e80a-168e-5015-b9f9-13e96b9838a4';
update public.profiles set
  city = 'Новосибирск', bio = 'Фотограф и модель. Снимаю автопортреты и художественные серии, ищу единомышленников для совместных проектов.', specializations = array['fine-art', 'portrait', 'art-projects'],
  experience = 'intermediate', availability = 'available', collab_formats = array['tfp', 'collab']::public.collab_format[],
  avatar_url = 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=400&h=400&q=80', social_links = '{"telegram": "vera_goncharova"}',
  onboarded_at = now(), created_at = now() - interval '48 days', last_active_at = now() - interval '13 hours'
where id = '0a35b8cb-d55f-5223-95e3-315e89057390';
update public.profiles set
  city = 'Москва', bio = 'Снимаю street fashion и сам иногда стою по другую сторону камеры. Делаю зин о московской моде.', specializations = array['fashion', 'street', 'street-style'],
  experience = 'intermediate', availability = 'available', collab_formats = array['tfp', 'collab', 'paid']::public.collab_format[],
  avatar_url = 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=400&h=400&q=80', social_links = '{"instagram": "lev_zakharov"}',
  onboarded_at = now(), created_at = now() - interval '40 days', last_active_at = now() - interval '20 hours'
where id = 'e382d45e-d10e-52fb-9880-c2036f1e2382';
update public.profiles set
  city = 'Сочи', bio = 'Начинающая модель из Сочи. Хочу попробовать себя в beauty и коммерческих съёмках у моря.', specializations = array['beauty', 'commercial', 'portrait'],
  experience = 'beginner', availability = 'available', collab_formats = array['tfp', 'paid']::public.collab_format[],
  avatar_url = 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=400&h=400&q=80', social_links = '{"telegram": "ksenia_titova"}',
  onboarded_at = now(), created_at = now() - interval '32 days', last_active_at = now() - interval '27 hours'
where id = '77f3b342-e296-5727-aea4-df92b5e65196';

insert into public.portfolio_items (id, owner_id, title, description, category_slug, is_published, is_cover, position, created_at) values ('1dd1519e-db10-5e6e-b834-98d3ea830e92', '9d5716f8-3486-5d57-930e-57111401f9e5', 'Осенний свет', 'Серия портретов в мягком утреннем свете у окна. Без ретуши кожи — только цвет.', 'portrait', true, true, 0, now() - interval '684 hours');
insert into public.portfolio_images (item_id, owner_id, url, width, height, position, alt) values ('1dd1519e-db10-5e6e-b834-98d3ea830e92', '9d5716f8-3486-5d57-930e-57111401f9e5', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1200&h=1500&q=80', 1200, 1500, 0, 'Осенний свет');
insert into public.portfolio_images (item_id, owner_id, url, width, height, position, alt) values ('1dd1519e-db10-5e6e-b834-98d3ea830e92', '9d5716f8-3486-5d57-930e-57111401f9e5', 'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?auto=format&fit=crop&w=1200&h=1500&q=80', 1200, 1500, 1, 'Осенний свет');
insert into public.portfolio_tags (item_id, tag) values ('1dd1519e-db10-5e6e-b834-98d3ea830e92', 'портрет');
insert into public.portfolio_tags (item_id, tag) values ('1dd1519e-db10-5e6e-b834-98d3ea830e92', 'естественныйсвет');
insert into public.portfolio_tags (item_id, tag) values ('1dd1519e-db10-5e6e-b834-98d3ea830e92', 'осень');
insert into public.portfolio_credits (item_id, profile_id, role) values ('1dd1519e-db10-5e6e-b834-98d3ea830e92', '9020d816-4402-5e40-b4af-7f97434b842c', 'model');
insert into public.portfolio_items (id, owner_id, title, description, category_slug, is_published, is_cover, position, created_at) values ('f54293b2-be46-5464-b5ba-e70185c33c53', '9d5716f8-3486-5d57-930e-57111401f9e5', 'Тихая улица', 'Editorial для независимого журнала. Стиль — минимализм и монохром.', 'fashion', true, false, 1, now() - interval '665 hours');
insert into public.portfolio_images (item_id, owner_id, url, width, height, position, alt) values ('f54293b2-be46-5464-b5ba-e70185c33c53', '9d5716f8-3486-5d57-930e-57111401f9e5', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&h=1800&q=80', 1200, 1800, 0, 'Тихая улица');
insert into public.portfolio_tags (item_id, tag) values ('f54293b2-be46-5464-b5ba-e70185c33c53', 'fashion');
insert into public.portfolio_tags (item_id, tag) values ('f54293b2-be46-5464-b5ba-e70185c33c53', 'editorial');
insert into public.portfolio_tags (item_id, tag) values ('f54293b2-be46-5464-b5ba-e70185c33c53', 'минимализм');
insert into public.portfolio_credits (item_id, profile_id, role) values ('f54293b2-be46-5464-b5ba-e70185c33c53', '9020d816-4402-5e40-b4af-7f97434b842c', 'model');
insert into public.portfolio_items (id, owner_id, title, description, category_slug, is_published, is_cover, position, created_at) values ('3c73ddeb-f4ac-50ae-a225-d752d77eac85', '9d5716f8-3486-5d57-930e-57111401f9e5', 'Линии', 'Fashion-съёмка в студии с жёстким светом.', 'fashion', true, false, 2, now() - interval '646 hours');
insert into public.portfolio_images (item_id, owner_id, url, width, height, position, alt) values ('3c73ddeb-f4ac-50ae-a225-d752d77eac85', '9d5716f8-3486-5d57-930e-57111401f9e5', 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1200&h=1600&q=80', 1200, 1600, 0, 'Линии');
insert into public.portfolio_tags (item_id, tag) values ('3c73ddeb-f4ac-50ae-a225-d752d77eac85', 'fashion');
insert into public.portfolio_tags (item_id, tag) values ('3c73ddeb-f4ac-50ae-a225-d752d77eac85', 'студия');
insert into public.portfolio_items (id, owner_id, title, description, category_slug, is_published, is_cover, position, created_at) values ('9fd09dfe-bf16-5e2e-a431-33ebc60030e0', '9d5716f8-3486-5d57-930e-57111401f9e5', 'Портрет в зелёном', 'Цветовой эксперимент: комплементарные оттенки и мягкая тень.', 'portrait', true, false, 3, now() - interval '627 hours');
insert into public.portfolio_images (item_id, owner_id, url, width, height, position, alt) values ('9fd09dfe-bf16-5e2e-a431-33ebc60030e0', '9d5716f8-3486-5d57-930e-57111401f9e5', 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1200&h=1500&q=80', 1200, 1500, 0, 'Портрет в зелёном');
insert into public.portfolio_tags (item_id, tag) values ('9fd09dfe-bf16-5e2e-a431-33ebc60030e0', 'портрет');
insert into public.portfolio_tags (item_id, tag) values ('9fd09dfe-bf16-5e2e-a431-33ebc60030e0', 'цвет');
insert into public.portfolio_items (id, owner_id, title, description, category_slug, is_published, is_cover, position, created_at) values ('ab0ead4a-9969-5210-8311-63d5b82f4ed6', '93bce4d3-d0a0-59c2-bfba-3e7f4632b090', 'Город после дождя', 'Петербург в сумерках: отражения, неон и случайные прохожие.', 'street', true, true, 0, now() - interval '608 hours');
insert into public.portfolio_images (item_id, owner_id, url, width, height, position, alt) values ('ab0ead4a-9969-5210-8311-63d5b82f4ed6', '93bce4d3-d0a0-59c2-bfba-3e7f4632b090', 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1500&h=1000&q=80', 1500, 1000, 0, 'Город после дождя');
insert into public.portfolio_tags (item_id, tag) values ('ab0ead4a-9969-5210-8311-63d5b82f4ed6', 'street');
insert into public.portfolio_tags (item_id, tag) values ('ab0ead4a-9969-5210-8311-63d5b82f4ed6', 'город');
insert into public.portfolio_tags (item_id, tag) values ('ab0ead4a-9969-5210-8311-63d5b82f4ed6', 'петербург');
insert into public.portfolio_items (id, owner_id, title, description, category_slug, is_published, is_cover, position, created_at) values ('51db7c9e-df8a-5788-9311-759546ab609b', '93bce4d3-d0a0-59c2-bfba-3e7f4632b090', 'Перекрёсток', 'Наблюдения за ритмом большого города.', 'street', true, false, 1, now() - interval '589 hours');
insert into public.portfolio_images (item_id, owner_id, url, width, height, position, alt) values ('51db7c9e-df8a-5788-9311-759546ab609b', '93bce4d3-d0a0-59c2-bfba-3e7f4632b090', 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1500&h=1000&q=80', 1500, 1000, 0, 'Перекрёсток');
insert into public.portfolio_tags (item_id, tag) values ('51db7c9e-df8a-5788-9311-759546ab609b', 'street');
insert into public.portfolio_tags (item_id, tag) values ('51db7c9e-df8a-5788-9311-759546ab609b', 'город');
insert into public.portfolio_items (id, owner_id, title, description, category_slug, is_published, is_cover, position, created_at) values ('a0deada4-a0f9-5c39-9cb3-5c1cd380088c', '93bce4d3-d0a0-59c2-bfba-3e7f4632b090', 'Артём, Петроградка', 'Уличный портрет для портфолио Артёма. TFP-съёмка, 40 минут прогулки.', 'portrait', true, false, 2, now() - interval '570 hours');
insert into public.portfolio_images (item_id, owner_id, url, width, height, position, alt) values ('a0deada4-a0f9-5c39-9cb3-5c1cd380088c', '93bce4d3-d0a0-59c2-bfba-3e7f4632b090', 'https://images.unsplash.com/photo-1488161628813-04466f872be2?auto=format&fit=crop&w=1200&h=1500&q=80', 1200, 1500, 0, 'Артём, Петроградка');
insert into public.portfolio_tags (item_id, tag) values ('a0deada4-a0f9-5c39-9cb3-5c1cd380088c', 'портрет');
insert into public.portfolio_tags (item_id, tag) values ('a0deada4-a0f9-5c39-9cb3-5c1cd380088c', 'tfp');
insert into public.portfolio_tags (item_id, tag) values ('a0deada4-a0f9-5c39-9cb3-5c1cd380088c', 'street');
insert into public.portfolio_credits (item_id, profile_id, role) values ('a0deada4-a0f9-5c39-9cb3-5c1cd380088c', 'd6dd5229-05ca-5169-93fb-2923414ea145', 'model');
insert into public.portfolio_items (id, owner_id, title, description, category_slug, is_published, is_cover, position, created_at) values ('f9a1c395-58a9-5d68-a31c-d9588d6b4c40', '93bce4d3-d0a0-59c2-bfba-3e7f4632b090', 'Ночной репортаж', 'Репортаж с городского фестиваля света.', 'reportage', true, false, 3, now() - interval '551 hours');
insert into public.portfolio_images (item_id, owner_id, url, width, height, position, alt) values ('f9a1c395-58a9-5d68-a31c-d9588d6b4c40', '93bce4d3-d0a0-59c2-bfba-3e7f4632b090', 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1500&h=1000&q=80', 1500, 1000, 0, 'Ночной репортаж');
insert into public.portfolio_tags (item_id, tag) values ('f9a1c395-58a9-5d68-a31c-d9588d6b4c40', 'репортаж');
insert into public.portfolio_tags (item_id, tag) values ('f9a1c395-58a9-5d68-a31c-d9588d6b4c40', 'ночь');
insert into public.portfolio_items (id, owner_id, title, description, category_slug, is_published, is_cover, position, created_at) values ('951bcec4-979f-5fe5-a79a-070c10294005', '5c3a941b-96d3-5710-85a7-3e21ac958d4f', 'Фактура', 'Beauty-история про текстуры кожи и блеск.', 'beauty', true, true, 0, now() - interval '532 hours');
insert into public.portfolio_images (item_id, owner_id, url, width, height, position, alt) values ('951bcec4-979f-5fe5-a79a-070c10294005', '5c3a941b-96d3-5710-85a7-3e21ac958d4f', 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=1200&h=1500&q=80', 1200, 1500, 0, 'Фактура');
insert into public.portfolio_tags (item_id, tag) values ('951bcec4-979f-5fe5-a79a-070c10294005', 'beauty');
insert into public.portfolio_tags (item_id, tag) values ('951bcec4-979f-5fe5-a79a-070c10294005', 'макияж');
insert into public.portfolio_tags (item_id, tag) values ('951bcec4-979f-5fe5-a79a-070c10294005', 'студия');
insert into public.portfolio_credits (item_id, profile_id, role) values ('951bcec4-979f-5fe5-a79a-070c10294005', 'c8363d90-789a-5b3a-8183-b494d3e5c48f', 'model');
insert into public.portfolio_items (id, owner_id, title, description, category_slug, is_published, is_cover, position, created_at) values ('6e731118-c9e2-5c54-a6fb-8e9df5368931', '5c3a941b-96d3-5710-85a7-3e21ac958d4f', 'Цвет', 'Яркий макияж и цветной фон — съёмка для визажиста.', 'beauty', true, false, 1, now() - interval '513 hours');
insert into public.portfolio_images (item_id, owner_id, url, width, height, position, alt) values ('6e731118-c9e2-5c54-a6fb-8e9df5368931', '5c3a941b-96d3-5710-85a7-3e21ac958d4f', 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&h=1500&q=80', 1200, 1500, 0, 'Цвет');
insert into public.portfolio_tags (item_id, tag) values ('6e731118-c9e2-5c54-a6fb-8e9df5368931', 'beauty');
insert into public.portfolio_tags (item_id, tag) values ('6e731118-c9e2-5c54-a6fb-8e9df5368931', 'цвет');
insert into public.portfolio_items (id, owner_id, title, description, category_slug, is_published, is_cover, position, created_at) values ('2699ea53-a755-5cb1-8d9a-f2e9df6f70a3', '5c3a941b-96d3-5710-85a7-3e21ac958d4f', 'Сон наяву', 'Художественная серия о границе между сном и реальностью.', 'fine-art', true, false, 2, now() - interval '494 hours');
insert into public.portfolio_images (item_id, owner_id, url, width, height, position, alt) values ('2699ea53-a755-5cb1-8d9a-f2e9df6f70a3', '5c3a941b-96d3-5710-85a7-3e21ac958d4f', 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&w=1200&h=1500&q=80', 1200, 1500, 0, 'Сон наяву');
insert into public.portfolio_tags (item_id, tag) values ('2699ea53-a755-5cb1-8d9a-f2e9df6f70a3', 'арт');
insert into public.portfolio_tags (item_id, tag) values ('2699ea53-a755-5cb1-8d9a-f2e9df6f70a3', 'концепт');
insert into public.portfolio_credits (item_id, profile_id, role) values ('2699ea53-a755-5cb1-8d9a-f2e9df6f70a3', 'c8363d90-789a-5b3a-8183-b494d3e5c48f', 'model');
insert into public.portfolio_items (id, owner_id, title, description, category_slug, is_published, is_cover, position, created_at) values ('a420651b-ebcd-5bc6-9fcf-248e851b3d3e', '5c3a941b-96d3-5710-85a7-3e21ac958d4f', 'Мила', 'Портрет для арт-проекта о танце.', 'portrait', true, false, 3, now() - interval '475 hours');
insert into public.portfolio_images (item_id, owner_id, url, width, height, position, alt) values ('a420651b-ebcd-5bc6-9fcf-248e851b3d3e', '5c3a941b-96d3-5710-85a7-3e21ac958d4f', 'https://images.unsplash.com/photo-1516726817505-f5ed825624d8?auto=format&fit=crop&w=1200&h=1500&q=80', 1200, 1500, 0, 'Мила');
insert into public.portfolio_tags (item_id, tag) values ('a420651b-ebcd-5bc6-9fcf-248e851b3d3e', 'портрет');
insert into public.portfolio_tags (item_id, tag) values ('a420651b-ebcd-5bc6-9fcf-248e851b3d3e', 'танец');
insert into public.portfolio_credits (item_id, profile_id, role) values ('a420651b-ebcd-5bc6-9fcf-248e851b3d3e', 'c8363d90-789a-5b3a-8183-b494d3e5c48f', 'model');
insert into public.portfolio_items (id, owner_id, title, description, category_slug, is_published, is_cover, position, created_at) values ('4204c527-a106-597f-b87e-120a5915ee70', 'af172229-cadf-536d-9258-bf93df80d489', 'Хронограф', 'Предметная съёмка часов для каталога бренда.', 'product', true, true, 0, now() - interval '456 hours');
insert into public.portfolio_images (item_id, owner_id, url, width, height, position, alt) values ('4204c527-a106-597f-b87e-120a5915ee70', 'af172229-cadf-536d-9258-bf93df80d489', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&h=1200&q=80', 1200, 1200, 0, 'Хронограф');
insert into public.portfolio_tags (item_id, tag) values ('4204c527-a106-597f-b87e-120a5915ee70', 'предметка');
insert into public.portfolio_tags (item_id, tag) values ('4204c527-a106-597f-b87e-120a5915ee70', 'каталог');
insert into public.portfolio_items (id, owner_id, title, description, category_slug, is_published, is_cover, position, created_at) values ('5b8ab0a6-c1b4-5615-9b8c-8f0dd8f1c70e', 'af172229-cadf-536d-9258-bf93df80d489', 'Звук', 'Рекламная съёмка наушников, минималистичный сет.', 'product', true, false, 1, now() - interval '437 hours');
insert into public.portfolio_images (item_id, owner_id, url, width, height, position, alt) values ('5b8ab0a6-c1b4-5615-9b8c-8f0dd8f1c70e', 'af172229-cadf-536d-9258-bf93df80d489', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&h=1200&q=80', 1200, 1200, 0, 'Звук');
insert into public.portfolio_tags (item_id, tag) values ('5b8ab0a6-c1b4-5615-9b8c-8f0dd8f1c70e', 'предметка');
insert into public.portfolio_tags (item_id, tag) values ('5b8ab0a6-c1b4-5615-9b8c-8f0dd8f1c70e', 'реклама');
insert into public.portfolio_items (id, owner_id, title, description, category_slug, is_published, is_cover, position, created_at) values ('74fc043d-bd31-516f-99c3-39a4245fe904', 'af172229-cadf-536d-9258-bf93df80d489', 'Красный кроссовок', 'Яркая предметная съёмка для e-commerce.', 'product', true, false, 2, now() - interval '418 hours');
insert into public.portfolio_images (item_id, owner_id, url, width, height, position, alt) values ('74fc043d-bd31-516f-99c3-39a4245fe904', 'af172229-cadf-536d-9258-bf93df80d489', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&h=1200&q=80', 1200, 1200, 0, 'Красный кроссовок');
insert into public.portfolio_tags (item_id, tag) values ('74fc043d-bd31-516f-99c3-39a4245fe904', 'предметка');
insert into public.portfolio_tags (item_id, tag) values ('74fc043d-bd31-516f-99c3-39a4245fe904', 'обувь');
insert into public.portfolio_items (id, owner_id, title, description, category_slug, is_published, is_cover, position, created_at) values ('851e49ae-f077-5248-9bbf-296d3d3d3b3b', 'af172229-cadf-536d-9258-bf93df80d489', 'Lookbook SS', 'Lookbook для локального бренда одежды.', 'fashion', true, false, 3, now() - interval '399 hours');
insert into public.portfolio_images (item_id, owner_id, url, width, height, position, alt) values ('851e49ae-f077-5248-9bbf-296d3d3d3b3b', 'af172229-cadf-536d-9258-bf93df80d489', 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1500&h=1000&q=80', 1500, 1000, 0, 'Lookbook SS');
insert into public.portfolio_tags (item_id, tag) values ('851e49ae-f077-5248-9bbf-296d3d3d3b3b', 'lookbook');
insert into public.portfolio_tags (item_id, tag) values ('851e49ae-f077-5248-9bbf-296d3d3d3b3b', 'fashion');
insert into public.portfolio_tags (item_id, tag) values ('851e49ae-f077-5248-9bbf-296d3d3d3b3b', 'каталог');
insert into public.portfolio_credits (item_id, profile_id, role) values ('851e49ae-f077-5248-9bbf-296d3d3d3b3b', 'ff02e80a-168e-5015-b9f9-13e96b9838a4', 'model');
insert into public.portfolio_items (id, owner_id, title, description, category_slug, is_published, is_cover, position, created_at) values ('9f6ab1c0-df9b-5a71-9fa4-ff1bbf9287fe', '27388cde-8868-505f-b82a-2e074dfd0790', 'Обещание', 'Свадебная история в загородном доме.', 'wedding', true, true, 0, now() - interval '380 hours');
insert into public.portfolio_images (item_id, owner_id, url, width, height, position, alt) values ('9f6ab1c0-df9b-5a71-9fa4-ff1bbf9287fe', '27388cde-8868-505f-b82a-2e074dfd0790', 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1500&h=1000&q=80', 1500, 1000, 0, 'Обещание');
insert into public.portfolio_tags (item_id, tag) values ('9f6ab1c0-df9b-5a71-9fa4-ff1bbf9287fe', 'свадьба');
insert into public.portfolio_tags (item_id, tag) values ('9f6ab1c0-df9b-5a71-9fa4-ff1bbf9287fe', 'love');
insert into public.portfolio_items (id, owner_id, title, description, category_slug, is_published, is_cover, position, created_at) values ('cc8c0178-c969-5aec-bea5-7f9703dea0ec', '27388cde-8868-505f-b82a-2e074dfd0790', 'Танец', 'Первый танец на закате.', 'wedding', true, false, 1, now() - interval '361 hours');
insert into public.portfolio_images (item_id, owner_id, url, width, height, position, alt) values ('cc8c0178-c969-5aec-bea5-7f9703dea0ec', '27388cde-8868-505f-b82a-2e074dfd0790', 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&h=1500&q=80', 1200, 1500, 0, 'Танец');
insert into public.portfolio_tags (item_id, tag) values ('cc8c0178-c969-5aec-bea5-7f9703dea0ec', 'свадьба');
insert into public.portfolio_items (id, owner_id, title, description, category_slug, is_published, is_cover, position, created_at) values ('40244f1a-e34b-5468-9830-a020cdb5c2ed', '27388cde-8868-505f-b82a-2e074dfd0790', 'Портрет у окна', 'Творческий портретный проект с начинающей моделью.', 'portrait', true, false, 2, now() - interval '342 hours');
insert into public.portfolio_images (item_id, owner_id, url, width, height, position, alt) values ('40244f1a-e34b-5468-9830-a020cdb5c2ed', '27388cde-8868-505f-b82a-2e074dfd0790', 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=1200&h=1500&q=80', 1200, 1500, 0, 'Портрет у окна');
insert into public.portfolio_tags (item_id, tag) values ('40244f1a-e34b-5468-9830-a020cdb5c2ed', 'портрет');
insert into public.portfolio_tags (item_id, tag) values ('40244f1a-e34b-5468-9830-a020cdb5c2ed', 'tfp');
insert into public.portfolio_credits (item_id, profile_id, role) values ('40244f1a-e34b-5468-9830-a020cdb5c2ed', '77f3b342-e296-5727-aea4-df92b5e65196', 'model');
insert into public.portfolio_items (id, owner_id, title, description, category_slug, is_published, is_cover, position, created_at) values ('8b01478c-d236-55cc-8566-1c41f845d035', '9020d816-4402-5e40-b4af-7f97434b842c', 'Полароиды', 'Свежие снепы для агентства.', 'fashion', true, true, 0, now() - interval '323 hours');
insert into public.portfolio_images (item_id, owner_id, url, width, height, position, alt) values ('8b01478c-d236-55cc-8566-1c41f845d035', '9020d816-4402-5e40-b4af-7f97434b842c', 'https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?auto=format&fit=crop&w=1200&h=1500&q=80', 1200, 1500, 0, 'Полароиды');
insert into public.portfolio_tags (item_id, tag) values ('8b01478c-d236-55cc-8566-1c41f845d035', 'снепы');
insert into public.portfolio_tags (item_id, tag) values ('8b01478c-d236-55cc-8566-1c41f845d035', 'модель');
insert into public.portfolio_items (id, owner_id, title, description, category_slug, is_published, is_cover, position, created_at) values ('7a60ce81-073e-5c29-a453-085eb34fae51', '9020d816-4402-5e40-b4af-7f97434b842c', 'Красное платье', 'Fashion-съёмка для дизайнера вечерних платьев.', 'fashion', true, false, 1, now() - interval '304 hours');
insert into public.portfolio_images (item_id, owner_id, url, width, height, position, alt) values ('7a60ce81-073e-5c29-a453-085eb34fae51', '9020d816-4402-5e40-b4af-7f97434b842c', 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&h=1800&q=80', 1200, 1800, 0, 'Красное платье');
insert into public.portfolio_tags (item_id, tag) values ('7a60ce81-073e-5c29-a453-085eb34fae51', 'fashion');
insert into public.portfolio_tags (item_id, tag) values ('7a60ce81-073e-5c29-a453-085eb34fae51', 'платье');
insert into public.portfolio_credits (item_id, profile_id, role) values ('7a60ce81-073e-5c29-a453-085eb34fae51', '9d5716f8-3486-5d57-930e-57111401f9e5', 'photographer');
insert into public.portfolio_items (id, owner_id, title, description, category_slug, is_published, is_cover, position, created_at) values ('8be879e3-b548-52b3-8ead-d8797d498271', '9020d816-4402-5e40-b4af-7f97434b842c', 'Beauty-тест', 'Тестовая beauty-съёмка с визажистом.', 'beauty', true, false, 2, now() - interval '285 hours');
insert into public.portfolio_images (item_id, owner_id, url, width, height, position, alt) values ('8be879e3-b548-52b3-8ead-d8797d498271', '9020d816-4402-5e40-b4af-7f97434b842c', 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=1200&h=1500&q=80', 1200, 1500, 0, 'Beauty-тест');
insert into public.portfolio_tags (item_id, tag) values ('8be879e3-b548-52b3-8ead-d8797d498271', 'beauty');
insert into public.portfolio_tags (item_id, tag) values ('8be879e3-b548-52b3-8ead-d8797d498271', 'тест');
insert into public.portfolio_items (id, owner_id, title, description, category_slug, is_published, is_cover, position, created_at) values ('d17d3628-28da-54de-9706-c8b928185a0b', 'd6dd5229-05ca-5169-93fb-2923414ea145', 'Первые снепы', 'Базовые снепы для портфолио.', 'commercial', true, true, 0, now() - interval '266 hours');
insert into public.portfolio_images (item_id, owner_id, url, width, height, position, alt) values ('d17d3628-28da-54de-9706-c8b928185a0b', 'd6dd5229-05ca-5169-93fb-2923414ea145', 'https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=1200&h=1500&q=80', 1200, 1500, 0, 'Первые снепы');
insert into public.portfolio_tags (item_id, tag) values ('d17d3628-28da-54de-9706-c8b928185a0b', 'снепы');
insert into public.portfolio_tags (item_id, tag) values ('d17d3628-28da-54de-9706-c8b928185a0b', 'начинающий');
insert into public.portfolio_items (id, owner_id, title, description, category_slug, is_published, is_cover, position, created_at) values ('27a2c9b1-c154-537e-8917-9a1ecf371748', 'd6dd5229-05ca-5169-93fb-2923414ea145', 'Street look', 'Образ для уличной съёмки.', 'street-style', true, false, 1, now() - interval '247 hours');
insert into public.portfolio_images (item_id, owner_id, url, width, height, position, alt) values ('27a2c9b1-c154-537e-8917-9a1ecf371748', 'd6dd5229-05ca-5169-93fb-2923414ea145', 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&h=1500&q=80', 1200, 1500, 0, 'Street look');
insert into public.portfolio_tags (item_id, tag) values ('27a2c9b1-c154-537e-8917-9a1ecf371748', 'streetstyle');
insert into public.portfolio_tags (item_id, tag) values ('27a2c9b1-c154-537e-8917-9a1ecf371748', 'образ');
insert into public.portfolio_credits (item_id, profile_id, role) values ('27a2c9b1-c154-537e-8917-9a1ecf371748', '93bce4d3-d0a0-59c2-bfba-3e7f4632b090', 'photographer');
insert into public.portfolio_items (id, owner_id, title, description, category_slug, is_published, is_cover, position, created_at) values ('2035c1da-0342-570d-9f17-b422884d622c', 'c8363d90-789a-5b3a-8183-b494d3e5c48f', 'Движение', 'Арт-проект про танец и пластику.', 'art-projects', true, true, 0, now() - interval '228 hours');
insert into public.portfolio_images (item_id, owner_id, url, width, height, position, alt) values ('2035c1da-0342-570d-9f17-b422884d622c', 'c8363d90-789a-5b3a-8183-b494d3e5c48f', 'https://images.unsplash.com/photo-1513956589380-bad6acb9b9d4?auto=format&fit=crop&w=1200&h=1600&q=80', 1200, 1600, 0, 'Движение');
insert into public.portfolio_tags (item_id, tag) values ('2035c1da-0342-570d-9f17-b422884d622c', 'арт');
insert into public.portfolio_tags (item_id, tag) values ('2035c1da-0342-570d-9f17-b422884d622c', 'танец');
insert into public.portfolio_tags (item_id, tag) values ('2035c1da-0342-570d-9f17-b422884d622c', 'движение');
insert into public.portfolio_credits (item_id, profile_id, role) values ('2035c1da-0342-570d-9f17-b422884d622c', '5c3a941b-96d3-5710-85a7-3e21ac958d4f', 'photographer');
insert into public.portfolio_items (id, owner_id, title, description, category_slug, is_published, is_cover, position, created_at) values ('54e8ec15-2831-5bfb-af40-d17064b78fe6', 'c8363d90-789a-5b3a-8183-b494d3e5c48f', 'Тени', 'Игра света и тени на лице.', 'portrait', true, false, 1, now() - interval '209 hours');
insert into public.portfolio_images (item_id, owner_id, url, width, height, position, alt) values ('54e8ec15-2831-5bfb-af40-d17064b78fe6', 'c8363d90-789a-5b3a-8183-b494d3e5c48f', 'https://images.unsplash.com/photo-1526510747491-58f928ec870f?auto=format&fit=crop&w=1200&h=1500&q=80', 1200, 1500, 0, 'Тени');
insert into public.portfolio_tags (item_id, tag) values ('54e8ec15-2831-5bfb-af40-d17064b78fe6', 'портрет');
insert into public.portfolio_tags (item_id, tag) values ('54e8ec15-2831-5bfb-af40-d17064b78fe6', 'свет');
insert into public.portfolio_items (id, owner_id, title, description, category_slug, is_published, is_cover, position, created_at) values ('5d9a11a3-091a-5332-b845-6320efc91733', 'ff02e80a-168e-5015-b9f9-13e96b9838a4', 'Каталог FW', 'Каталожная съёмка осенне-зимней коллекции.', 'catalog', true, true, 0, now() - interval '190 hours');
insert into public.portfolio_images (item_id, owner_id, url, width, height, position, alt) values ('5d9a11a3-091a-5332-b845-6320efc91733', 'ff02e80a-168e-5015-b9f9-13e96b9838a4', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=1200&h=1500&q=80', 1200, 1500, 0, 'Каталог FW');
insert into public.portfolio_tags (item_id, tag) values ('5d9a11a3-091a-5332-b845-6320efc91733', 'каталог');
insert into public.portfolio_tags (item_id, tag) values ('5d9a11a3-091a-5332-b845-6320efc91733', 'fashion');
insert into public.portfolio_credits (item_id, profile_id, role) values ('5d9a11a3-091a-5332-b845-6320efc91733', 'af172229-cadf-536d-9258-bf93df80d489', 'photographer');
insert into public.portfolio_items (id, owner_id, title, description, category_slug, is_published, is_cover, position, created_at) values ('354ef3ca-9a1c-5e8f-aeff-b79fe6f95b1a', 'ff02e80a-168e-5015-b9f9-13e96b9838a4', 'Костюм', 'Классика в современной подаче.', 'fashion', true, false, 1, now() - interval '171 hours');
insert into public.portfolio_images (item_id, owner_id, url, width, height, position, alt) values ('354ef3ca-9a1c-5e8f-aeff-b79fe6f95b1a', 'ff02e80a-168e-5015-b9f9-13e96b9838a4', 'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?auto=format&fit=crop&w=1200&h=1500&q=80', 1200, 1500, 0, 'Костюм');
insert into public.portfolio_tags (item_id, tag) values ('354ef3ca-9a1c-5e8f-aeff-b79fe6f95b1a', 'fashion');
insert into public.portfolio_tags (item_id, tag) values ('354ef3ca-9a1c-5e8f-aeff-b79fe6f95b1a', 'костюм');
insert into public.portfolio_items (id, owner_id, title, description, category_slug, is_published, is_cover, position, created_at) values ('55527cd1-f578-5f50-8212-087190e1320b', '0a35b8cb-d55f-5223-95e3-315e89057390', 'Автопортрет I', 'Серия автопортретов о внутренней тишине.', 'fine-art', true, true, 0, now() - interval '152 hours');
insert into public.portfolio_images (item_id, owner_id, url, width, height, position, alt) values ('55527cd1-f578-5f50-8212-087190e1320b', '0a35b8cb-d55f-5223-95e3-315e89057390', 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&h=1500&q=80', 1200, 1500, 0, 'Автопортрет I');
insert into public.portfolio_tags (item_id, tag) values ('55527cd1-f578-5f50-8212-087190e1320b', 'автопортрет');
insert into public.portfolio_tags (item_id, tag) values ('55527cd1-f578-5f50-8212-087190e1320b', 'арт');
insert into public.portfolio_items (id, owner_id, title, description, category_slug, is_published, is_cover, position, created_at) values ('ad70a6ae-a675-5287-ae44-2b59c02199cb', '0a35b8cb-d55f-5223-95e3-315e89057390', 'Северный свет', 'Портреты при холодном зимнем свете.', 'portrait', true, false, 1, now() - interval '133 hours');
insert into public.portfolio_images (item_id, owner_id, url, width, height, position, alt) values ('ad70a6ae-a675-5287-ae44-2b59c02199cb', '0a35b8cb-d55f-5223-95e3-315e89057390', 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=1200&h=1500&q=80', 1200, 1500, 0, 'Северный свет');
insert into public.portfolio_tags (item_id, tag) values ('ad70a6ae-a675-5287-ae44-2b59c02199cb', 'портрет');
insert into public.portfolio_tags (item_id, tag) values ('ad70a6ae-a675-5287-ae44-2b59c02199cb', 'зима');
insert into public.portfolio_items (id, owner_id, title, description, category_slug, is_published, is_cover, position, created_at) values ('ad3117e7-b903-5a65-b355-3398227e3613', '0a35b8cb-d55f-5223-95e3-315e89057390', 'Сад', 'Совместный арт-проект с флористом.', 'art-projects', true, false, 2, now() - interval '114 hours');
insert into public.portfolio_images (item_id, owner_id, url, width, height, position, alt) values ('ad3117e7-b903-5a65-b355-3398227e3613', '0a35b8cb-d55f-5223-95e3-315e89057390', 'https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?auto=format&fit=crop&w=1200&h=1700&q=80', 1200, 1700, 0, 'Сад');
insert into public.portfolio_tags (item_id, tag) values ('ad3117e7-b903-5a65-b355-3398227e3613', 'арт');
insert into public.portfolio_tags (item_id, tag) values ('ad3117e7-b903-5a65-b355-3398227e3613', 'цветы');
insert into public.portfolio_items (id, owner_id, title, description, category_slug, is_published, is_cover, position, created_at) values ('a166a9d6-4750-559c-b0d6-49ec3b72e4c2', 'e382d45e-d10e-52fb-9880-c2036f1e2382', 'Москва носит', 'Стрит-стайл с московских улиц для зина.', 'street-style', true, true, 0, now() - interval '95 hours');
insert into public.portfolio_images (item_id, owner_id, url, width, height, position, alt) values ('a166a9d6-4750-559c-b0d6-49ec3b72e4c2', 'e382d45e-d10e-52fb-9880-c2036f1e2382', 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1500&h=1000&q=80', 1500, 1000, 0, 'Москва носит');
insert into public.portfolio_tags (item_id, tag) values ('a166a9d6-4750-559c-b0d6-49ec3b72e4c2', 'streetstyle');
insert into public.portfolio_tags (item_id, tag) values ('a166a9d6-4750-559c-b0d6-49ec3b72e4c2', 'москва');
insert into public.portfolio_tags (item_id, tag) values ('a166a9d6-4750-559c-b0d6-49ec3b72e4c2', 'зин');
insert into public.portfolio_items (id, owner_id, title, description, category_slug, is_published, is_cover, position, created_at) values ('7e872196-6325-5662-a68f-d304cae5955d', 'e382d45e-d10e-52fb-9880-c2036f1e2382', 'Монохром', 'Чёрно-белая fashion-серия.', 'fashion', true, false, 1, now() - interval '76 hours');
insert into public.portfolio_images (item_id, owner_id, url, width, height, position, alt) values ('7e872196-6325-5662-a68f-d304cae5955d', 'e382d45e-d10e-52fb-9880-c2036f1e2382', 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=1200&h=1500&q=80', 1200, 1500, 0, 'Монохром');
insert into public.portfolio_tags (item_id, tag) values ('7e872196-6325-5662-a68f-d304cae5955d', 'fashion');
insert into public.portfolio_tags (item_id, tag) values ('7e872196-6325-5662-a68f-d304cae5955d', 'чб');
insert into public.portfolio_items (id, owner_id, title, description, category_slug, is_published, is_cover, position, created_at) values ('57fdc6a5-cb81-5bc9-845b-5bc4f7d9c82d', 'e382d45e-d10e-52fb-9880-c2036f1e2382', 'Неон', 'Ночные портреты в неоне.', 'street', true, false, 2, now() - interval '57 hours');
insert into public.portfolio_images (item_id, owner_id, url, width, height, position, alt) values ('57fdc6a5-cb81-5bc9-845b-5bc4f7d9c82d', 'e382d45e-d10e-52fb-9880-c2036f1e2382', 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1500&h=1000&q=80', 1500, 1000, 0, 'Неон');
insert into public.portfolio_tags (item_id, tag) values ('57fdc6a5-cb81-5bc9-845b-5bc4f7d9c82d', 'street');
insert into public.portfolio_tags (item_id, tag) values ('57fdc6a5-cb81-5bc9-845b-5bc4f7d9c82d', 'ночь');
insert into public.portfolio_tags (item_id, tag) values ('57fdc6a5-cb81-5bc9-845b-5bc4f7d9c82d', 'неон');
insert into public.portfolio_items (id, owner_id, title, description, category_slug, is_published, is_cover, position, created_at) values ('334b7b7b-59c3-5c3e-aa36-9cf41ca1ea78', '77f3b342-e296-5727-aea4-df92b5e65196', 'У моря', 'Beauty-съёмка на рассвете на пляже.', 'beauty', true, true, 0, now() - interval '38 hours');
insert into public.portfolio_images (item_id, owner_id, url, width, height, position, alt) values ('334b7b7b-59c3-5c3e-aa36-9cf41ca1ea78', '77f3b342-e296-5727-aea4-df92b5e65196', 'https://images.unsplash.com/photo-1542596768-5d1d21f1cf98?auto=format&fit=crop&w=1200&h=1500&q=80', 1200, 1500, 0, 'У моря');
insert into public.portfolio_tags (item_id, tag) values ('334b7b7b-59c3-5c3e-aa36-9cf41ca1ea78', 'beauty');
insert into public.portfolio_tags (item_id, tag) values ('334b7b7b-59c3-5c3e-aa36-9cf41ca1ea78', 'море');
insert into public.portfolio_items (id, owner_id, title, description, category_slug, is_published, is_cover, position, created_at) values ('17622d7c-4c74-5f7f-b48f-15ac99c74cef', '77f3b342-e296-5727-aea4-df92b5e65196', 'Тестовая съёмка', 'Тест для коммерческого портфолио.', 'commercial', true, false, 1, now() - interval '19 hours');
insert into public.portfolio_images (item_id, owner_id, url, width, height, position, alt) values ('17622d7c-4c74-5f7f-b48f-15ac99c74cef', '77f3b342-e296-5727-aea4-df92b5e65196', 'https://images.unsplash.com/photo-1532074205216-d0e1f4b87368?auto=format&fit=crop&w=1200&h=1500&q=80', 1200, 1500, 0, 'Тестовая съёмка');
insert into public.portfolio_tags (item_id, tag) values ('17622d7c-4c74-5f7f-b48f-15ac99c74cef', 'тест');
insert into public.portfolio_tags (item_id, tag) values ('17622d7c-4c74-5f7f-b48f-15ac99c74cef', 'коммерция');
insert into public.portfolio_credits (item_id, profile_id, role) values ('17622d7c-4c74-5f7f-b48f-15ac99c74cef', '27388cde-8868-505f-b82a-2e074dfd0790', 'photographer');

insert into public.likes (user_id, item_id) values
  ('93bce4d3-d0a0-59c2-bfba-3e7f4632b090', '1dd1519e-db10-5e6e-b834-98d3ea830e92'),
  ('9020d816-4402-5e40-b4af-7f97434b842c', '1dd1519e-db10-5e6e-b834-98d3ea830e92'),
  ('27388cde-8868-505f-b82a-2e074dfd0790', 'f54293b2-be46-5464-b5ba-e70185c33c53'),
  ('af172229-cadf-536d-9258-bf93df80d489', 'f54293b2-be46-5464-b5ba-e70185c33c53'),
  ('5c3a941b-96d3-5710-85a7-3e21ac958d4f', 'f54293b2-be46-5464-b5ba-e70185c33c53'),
  ('0a35b8cb-d55f-5223-95e3-315e89057390', 'f54293b2-be46-5464-b5ba-e70185c33c53'),
  ('93bce4d3-d0a0-59c2-bfba-3e7f4632b090', '3c73ddeb-f4ac-50ae-a225-d752d77eac85'),
  ('77f3b342-e296-5727-aea4-df92b5e65196', '3c73ddeb-f4ac-50ae-a225-d752d77eac85'),
  ('5c3a941b-96d3-5710-85a7-3e21ac958d4f', '3c73ddeb-f4ac-50ae-a225-d752d77eac85'),
  ('27388cde-8868-505f-b82a-2e074dfd0790', '3c73ddeb-f4ac-50ae-a225-d752d77eac85'),
  ('0a35b8cb-d55f-5223-95e3-315e89057390', '3c73ddeb-f4ac-50ae-a225-d752d77eac85'),
  ('9020d816-4402-5e40-b4af-7f97434b842c', '3c73ddeb-f4ac-50ae-a225-d752d77eac85'),
  ('d6dd5229-05ca-5169-93fb-2923414ea145', '3c73ddeb-f4ac-50ae-a225-d752d77eac85'),
  ('0a35b8cb-d55f-5223-95e3-315e89057390', '9fd09dfe-bf16-5e2e-a431-33ebc60030e0'),
  ('77f3b342-e296-5727-aea4-df92b5e65196', 'ab0ead4a-9969-5210-8311-63d5b82f4ed6'),
  ('0a35b8cb-d55f-5223-95e3-315e89057390', 'ab0ead4a-9969-5210-8311-63d5b82f4ed6'),
  ('c8363d90-789a-5b3a-8183-b494d3e5c48f', 'ab0ead4a-9969-5210-8311-63d5b82f4ed6'),
  ('27388cde-8868-505f-b82a-2e074dfd0790', 'ab0ead4a-9969-5210-8311-63d5b82f4ed6'),
  ('e382d45e-d10e-52fb-9880-c2036f1e2382', '51db7c9e-df8a-5788-9311-759546ab609b'),
  ('9020d816-4402-5e40-b4af-7f97434b842c', '51db7c9e-df8a-5788-9311-759546ab609b'),
  ('9d5716f8-3486-5d57-930e-57111401f9e5', '51db7c9e-df8a-5788-9311-759546ab609b'),
  ('af172229-cadf-536d-9258-bf93df80d489', '51db7c9e-df8a-5788-9311-759546ab609b'),
  ('d6dd5229-05ca-5169-93fb-2923414ea145', '51db7c9e-df8a-5788-9311-759546ab609b'),
  ('27388cde-8868-505f-b82a-2e074dfd0790', '51db7c9e-df8a-5788-9311-759546ab609b'),
  ('ff02e80a-168e-5015-b9f9-13e96b9838a4', '51db7c9e-df8a-5788-9311-759546ab609b'),
  ('77f3b342-e296-5727-aea4-df92b5e65196', '51db7c9e-df8a-5788-9311-759546ab609b'),
  ('27388cde-8868-505f-b82a-2e074dfd0790', 'a0deada4-a0f9-5c39-9cb3-5c1cd380088c'),
  ('d6dd5229-05ca-5169-93fb-2923414ea145', 'a0deada4-a0f9-5c39-9cb3-5c1cd380088c'),
  ('5c3a941b-96d3-5710-85a7-3e21ac958d4f', 'a0deada4-a0f9-5c39-9cb3-5c1cd380088c'),
  ('c8363d90-789a-5b3a-8183-b494d3e5c48f', 'f9a1c395-58a9-5d68-a31c-d9588d6b4c40'),
  ('5c3a941b-96d3-5710-85a7-3e21ac958d4f', 'f9a1c395-58a9-5d68-a31c-d9588d6b4c40'),
  ('d6dd5229-05ca-5169-93fb-2923414ea145', '951bcec4-979f-5fe5-a79a-070c10294005'),
  ('e382d45e-d10e-52fb-9880-c2036f1e2382', '951bcec4-979f-5fe5-a79a-070c10294005'),
  ('9020d816-4402-5e40-b4af-7f97434b842c', '951bcec4-979f-5fe5-a79a-070c10294005'),
  ('9d5716f8-3486-5d57-930e-57111401f9e5', '951bcec4-979f-5fe5-a79a-070c10294005'),
  ('77f3b342-e296-5727-aea4-df92b5e65196', '951bcec4-979f-5fe5-a79a-070c10294005'),
  ('27388cde-8868-505f-b82a-2e074dfd0790', '951bcec4-979f-5fe5-a79a-070c10294005'),
  ('c8363d90-789a-5b3a-8183-b494d3e5c48f', '6e731118-c9e2-5c54-a6fb-8e9df5368931'),
  ('93bce4d3-d0a0-59c2-bfba-3e7f4632b090', '6e731118-c9e2-5c54-a6fb-8e9df5368931'),
  ('77f3b342-e296-5727-aea4-df92b5e65196', '2699ea53-a755-5cb1-8d9a-f2e9df6f70a3'),
  ('e382d45e-d10e-52fb-9880-c2036f1e2382', '2699ea53-a755-5cb1-8d9a-f2e9df6f70a3'),
  ('d6dd5229-05ca-5169-93fb-2923414ea145', '2699ea53-a755-5cb1-8d9a-f2e9df6f70a3'),
  ('27388cde-8868-505f-b82a-2e074dfd0790', '2699ea53-a755-5cb1-8d9a-f2e9df6f70a3'),
  ('0a35b8cb-d55f-5223-95e3-315e89057390', '2699ea53-a755-5cb1-8d9a-f2e9df6f70a3'),
  ('9d5716f8-3486-5d57-930e-57111401f9e5', 'a420651b-ebcd-5bc6-9fcf-248e851b3d3e'),
  ('27388cde-8868-505f-b82a-2e074dfd0790', 'a420651b-ebcd-5bc6-9fcf-248e851b3d3e'),
  ('93bce4d3-d0a0-59c2-bfba-3e7f4632b090', '4204c527-a106-597f-b87e-120a5915ee70'),
  ('27388cde-8868-505f-b82a-2e074dfd0790', '4204c527-a106-597f-b87e-120a5915ee70'),
  ('77f3b342-e296-5727-aea4-df92b5e65196', '4204c527-a106-597f-b87e-120a5915ee70'),
  ('c8363d90-789a-5b3a-8183-b494d3e5c48f', '4204c527-a106-597f-b87e-120a5915ee70'),
  ('5c3a941b-96d3-5710-85a7-3e21ac958d4f', '4204c527-a106-597f-b87e-120a5915ee70'),
  ('77f3b342-e296-5727-aea4-df92b5e65196', '5b8ab0a6-c1b4-5615-9b8c-8f0dd8f1c70e'),
  ('d6dd5229-05ca-5169-93fb-2923414ea145', '5b8ab0a6-c1b4-5615-9b8c-8f0dd8f1c70e'),
  ('5c3a941b-96d3-5710-85a7-3e21ac958d4f', '5b8ab0a6-c1b4-5615-9b8c-8f0dd8f1c70e'),
  ('e382d45e-d10e-52fb-9880-c2036f1e2382', '5b8ab0a6-c1b4-5615-9b8c-8f0dd8f1c70e'),
  ('0a35b8cb-d55f-5223-95e3-315e89057390', '5b8ab0a6-c1b4-5615-9b8c-8f0dd8f1c70e'),
  ('93bce4d3-d0a0-59c2-bfba-3e7f4632b090', '5b8ab0a6-c1b4-5615-9b8c-8f0dd8f1c70e'),
  ('c8363d90-789a-5b3a-8183-b494d3e5c48f', '5b8ab0a6-c1b4-5615-9b8c-8f0dd8f1c70e'),
  ('9d5716f8-3486-5d57-930e-57111401f9e5', '5b8ab0a6-c1b4-5615-9b8c-8f0dd8f1c70e'),
  ('0a35b8cb-d55f-5223-95e3-315e89057390', '74fc043d-bd31-516f-99c3-39a4245fe904'),
  ('27388cde-8868-505f-b82a-2e074dfd0790', '74fc043d-bd31-516f-99c3-39a4245fe904'),
  ('5c3a941b-96d3-5710-85a7-3e21ac958d4f', '74fc043d-bd31-516f-99c3-39a4245fe904'),
  ('c8363d90-789a-5b3a-8183-b494d3e5c48f', '851e49ae-f077-5248-9bbf-296d3d3d3b3b'),
  ('9020d816-4402-5e40-b4af-7f97434b842c', '851e49ae-f077-5248-9bbf-296d3d3d3b3b'),
  ('0a35b8cb-d55f-5223-95e3-315e89057390', '851e49ae-f077-5248-9bbf-296d3d3d3b3b'),
  ('27388cde-8868-505f-b82a-2e074dfd0790', '851e49ae-f077-5248-9bbf-296d3d3d3b3b'),
  ('d6dd5229-05ca-5169-93fb-2923414ea145', '851e49ae-f077-5248-9bbf-296d3d3d3b3b'),
  ('5c3a941b-96d3-5710-85a7-3e21ac958d4f', '851e49ae-f077-5248-9bbf-296d3d3d3b3b'),
  ('9d5716f8-3486-5d57-930e-57111401f9e5', '851e49ae-f077-5248-9bbf-296d3d3d3b3b'),
  ('93bce4d3-d0a0-59c2-bfba-3e7f4632b090', '851e49ae-f077-5248-9bbf-296d3d3d3b3b'),
  ('d6dd5229-05ca-5169-93fb-2923414ea145', '9f6ab1c0-df9b-5a71-9fa4-ff1bbf9287fe'),
  ('9020d816-4402-5e40-b4af-7f97434b842c', 'cc8c0178-c969-5aec-bea5-7f9703dea0ec'),
  ('93bce4d3-d0a0-59c2-bfba-3e7f4632b090', 'cc8c0178-c969-5aec-bea5-7f9703dea0ec'),
  ('af172229-cadf-536d-9258-bf93df80d489', 'cc8c0178-c969-5aec-bea5-7f9703dea0ec'),
  ('d6dd5229-05ca-5169-93fb-2923414ea145', 'cc8c0178-c969-5aec-bea5-7f9703dea0ec'),
  ('e382d45e-d10e-52fb-9880-c2036f1e2382', 'cc8c0178-c969-5aec-bea5-7f9703dea0ec'),
  ('ff02e80a-168e-5015-b9f9-13e96b9838a4', 'cc8c0178-c969-5aec-bea5-7f9703dea0ec'),
  ('0a35b8cb-d55f-5223-95e3-315e89057390', 'cc8c0178-c969-5aec-bea5-7f9703dea0ec'),
  ('77f3b342-e296-5727-aea4-df92b5e65196', '40244f1a-e34b-5468-9830-a020cdb5c2ed'),
  ('ff02e80a-168e-5015-b9f9-13e96b9838a4', '40244f1a-e34b-5468-9830-a020cdb5c2ed'),
  ('5c3a941b-96d3-5710-85a7-3e21ac958d4f', '40244f1a-e34b-5468-9830-a020cdb5c2ed'),
  ('9020d816-4402-5e40-b4af-7f97434b842c', '40244f1a-e34b-5468-9830-a020cdb5c2ed'),
  ('93bce4d3-d0a0-59c2-bfba-3e7f4632b090', '40244f1a-e34b-5468-9830-a020cdb5c2ed'),
  ('c8363d90-789a-5b3a-8183-b494d3e5c48f', '40244f1a-e34b-5468-9830-a020cdb5c2ed'),
  ('e382d45e-d10e-52fb-9880-c2036f1e2382', '40244f1a-e34b-5468-9830-a020cdb5c2ed'),
  ('e382d45e-d10e-52fb-9880-c2036f1e2382', '8b01478c-d236-55cc-8566-1c41f845d035'),
  ('c8363d90-789a-5b3a-8183-b494d3e5c48f', '8b01478c-d236-55cc-8566-1c41f845d035'),
  ('77f3b342-e296-5727-aea4-df92b5e65196', '8b01478c-d236-55cc-8566-1c41f845d035'),
  ('d6dd5229-05ca-5169-93fb-2923414ea145', '8b01478c-d236-55cc-8566-1c41f845d035'),
  ('93bce4d3-d0a0-59c2-bfba-3e7f4632b090', '8b01478c-d236-55cc-8566-1c41f845d035'),
  ('0a35b8cb-d55f-5223-95e3-315e89057390', '7a60ce81-073e-5c29-a453-085eb34fae51'),
  ('ff02e80a-168e-5015-b9f9-13e96b9838a4', '7a60ce81-073e-5c29-a453-085eb34fae51'),
  ('93bce4d3-d0a0-59c2-bfba-3e7f4632b090', '7a60ce81-073e-5c29-a453-085eb34fae51'),
  ('93bce4d3-d0a0-59c2-bfba-3e7f4632b090', '8be879e3-b548-52b3-8ead-d8797d498271'),
  ('77f3b342-e296-5727-aea4-df92b5e65196', 'd17d3628-28da-54de-9706-c8b928185a0b'),
  ('5c3a941b-96d3-5710-85a7-3e21ac958d4f', 'd17d3628-28da-54de-9706-c8b928185a0b'),
  ('c8363d90-789a-5b3a-8183-b494d3e5c48f', 'd17d3628-28da-54de-9706-c8b928185a0b'),
  ('c8363d90-789a-5b3a-8183-b494d3e5c48f', '27a2c9b1-c154-537e-8917-9a1ecf371748'),
  ('77f3b342-e296-5727-aea4-df92b5e65196', '27a2c9b1-c154-537e-8917-9a1ecf371748'),
  ('0a35b8cb-d55f-5223-95e3-315e89057390', '2035c1da-0342-570d-9f17-b422884d622c'),
  ('27388cde-8868-505f-b82a-2e074dfd0790', '2035c1da-0342-570d-9f17-b422884d622c'),
  ('77f3b342-e296-5727-aea4-df92b5e65196', '2035c1da-0342-570d-9f17-b422884d622c'),
  ('9d5716f8-3486-5d57-930e-57111401f9e5', '2035c1da-0342-570d-9f17-b422884d622c'),
  ('9020d816-4402-5e40-b4af-7f97434b842c', '2035c1da-0342-570d-9f17-b422884d622c'),
  ('d6dd5229-05ca-5169-93fb-2923414ea145', '2035c1da-0342-570d-9f17-b422884d622c'),
  ('ff02e80a-168e-5015-b9f9-13e96b9838a4', '2035c1da-0342-570d-9f17-b422884d622c'),
  ('5c3a941b-96d3-5710-85a7-3e21ac958d4f', '2035c1da-0342-570d-9f17-b422884d622c'),
  ('93bce4d3-d0a0-59c2-bfba-3e7f4632b090', '54e8ec15-2831-5bfb-af40-d17064b78fe6'),
  ('27388cde-8868-505f-b82a-2e074dfd0790', '54e8ec15-2831-5bfb-af40-d17064b78fe6'),
  ('d6dd5229-05ca-5169-93fb-2923414ea145', '54e8ec15-2831-5bfb-af40-d17064b78fe6'),
  ('5c3a941b-96d3-5710-85a7-3e21ac958d4f', '54e8ec15-2831-5bfb-af40-d17064b78fe6'),
  ('af172229-cadf-536d-9258-bf93df80d489', '54e8ec15-2831-5bfb-af40-d17064b78fe6'),
  ('9d5716f8-3486-5d57-930e-57111401f9e5', '54e8ec15-2831-5bfb-af40-d17064b78fe6'),
  ('0a35b8cb-d55f-5223-95e3-315e89057390', '5d9a11a3-091a-5332-b845-6320efc91733'),
  ('5c3a941b-96d3-5710-85a7-3e21ac958d4f', '5d9a11a3-091a-5332-b845-6320efc91733'),
  ('77f3b342-e296-5727-aea4-df92b5e65196', '5d9a11a3-091a-5332-b845-6320efc91733'),
  ('93bce4d3-d0a0-59c2-bfba-3e7f4632b090', '5d9a11a3-091a-5332-b845-6320efc91733'),
  ('d6dd5229-05ca-5169-93fb-2923414ea145', '5d9a11a3-091a-5332-b845-6320efc91733'),
  ('77f3b342-e296-5727-aea4-df92b5e65196', '354ef3ca-9a1c-5e8f-aeff-b79fe6f95b1a'),
  ('0a35b8cb-d55f-5223-95e3-315e89057390', '354ef3ca-9a1c-5e8f-aeff-b79fe6f95b1a'),
  ('af172229-cadf-536d-9258-bf93df80d489', '354ef3ca-9a1c-5e8f-aeff-b79fe6f95b1a'),
  ('5c3a941b-96d3-5710-85a7-3e21ac958d4f', '354ef3ca-9a1c-5e8f-aeff-b79fe6f95b1a'),
  ('c8363d90-789a-5b3a-8183-b494d3e5c48f', '354ef3ca-9a1c-5e8f-aeff-b79fe6f95b1a'),
  ('ff02e80a-168e-5015-b9f9-13e96b9838a4', '55527cd1-f578-5f50-8212-087190e1320b'),
  ('77f3b342-e296-5727-aea4-df92b5e65196', '55527cd1-f578-5f50-8212-087190e1320b'),
  ('9d5716f8-3486-5d57-930e-57111401f9e5', '55527cd1-f578-5f50-8212-087190e1320b'),
  ('c8363d90-789a-5b3a-8183-b494d3e5c48f', 'ad70a6ae-a675-5287-ae44-2b59c02199cb'),
  ('9d5716f8-3486-5d57-930e-57111401f9e5', 'ad70a6ae-a675-5287-ae44-2b59c02199cb'),
  ('93bce4d3-d0a0-59c2-bfba-3e7f4632b090', 'ad70a6ae-a675-5287-ae44-2b59c02199cb'),
  ('9020d816-4402-5e40-b4af-7f97434b842c', 'ad70a6ae-a675-5287-ae44-2b59c02199cb'),
  ('d6dd5229-05ca-5169-93fb-2923414ea145', 'ad70a6ae-a675-5287-ae44-2b59c02199cb'),
  ('5c3a941b-96d3-5710-85a7-3e21ac958d4f', 'ad70a6ae-a675-5287-ae44-2b59c02199cb'),
  ('9d5716f8-3486-5d57-930e-57111401f9e5', 'ad3117e7-b903-5a65-b355-3398227e3613'),
  ('af172229-cadf-536d-9258-bf93df80d489', 'ad3117e7-b903-5a65-b355-3398227e3613'),
  ('93bce4d3-d0a0-59c2-bfba-3e7f4632b090', 'ad3117e7-b903-5a65-b355-3398227e3613'),
  ('ff02e80a-168e-5015-b9f9-13e96b9838a4', 'ad3117e7-b903-5a65-b355-3398227e3613'),
  ('93bce4d3-d0a0-59c2-bfba-3e7f4632b090', 'a166a9d6-4750-559c-b0d6-49ec3b72e4c2'),
  ('ff02e80a-168e-5015-b9f9-13e96b9838a4', 'a166a9d6-4750-559c-b0d6-49ec3b72e4c2'),
  ('5c3a941b-96d3-5710-85a7-3e21ac958d4f', 'a166a9d6-4750-559c-b0d6-49ec3b72e4c2'),
  ('0a35b8cb-d55f-5223-95e3-315e89057390', 'a166a9d6-4750-559c-b0d6-49ec3b72e4c2'),
  ('9020d816-4402-5e40-b4af-7f97434b842c', 'a166a9d6-4750-559c-b0d6-49ec3b72e4c2'),
  ('af172229-cadf-536d-9258-bf93df80d489', 'a166a9d6-4750-559c-b0d6-49ec3b72e4c2'),
  ('27388cde-8868-505f-b82a-2e074dfd0790', 'a166a9d6-4750-559c-b0d6-49ec3b72e4c2'),
  ('77f3b342-e296-5727-aea4-df92b5e65196', 'a166a9d6-4750-559c-b0d6-49ec3b72e4c2'),
  ('ff02e80a-168e-5015-b9f9-13e96b9838a4', '7e872196-6325-5662-a68f-d304cae5955d'),
  ('0a35b8cb-d55f-5223-95e3-315e89057390', '7e872196-6325-5662-a68f-d304cae5955d'),
  ('d6dd5229-05ca-5169-93fb-2923414ea145', '7e872196-6325-5662-a68f-d304cae5955d'),
  ('af172229-cadf-536d-9258-bf93df80d489', '7e872196-6325-5662-a68f-d304cae5955d'),
  ('27388cde-8868-505f-b82a-2e074dfd0790', '7e872196-6325-5662-a68f-d304cae5955d'),
  ('27388cde-8868-505f-b82a-2e074dfd0790', '57fdc6a5-cb81-5bc9-845b-5bc4f7d9c82d'),
  ('d6dd5229-05ca-5169-93fb-2923414ea145', '57fdc6a5-cb81-5bc9-845b-5bc4f7d9c82d'),
  ('9020d816-4402-5e40-b4af-7f97434b842c', '57fdc6a5-cb81-5bc9-845b-5bc4f7d9c82d'),
  ('c8363d90-789a-5b3a-8183-b494d3e5c48f', '57fdc6a5-cb81-5bc9-845b-5bc4f7d9c82d'),
  ('93bce4d3-d0a0-59c2-bfba-3e7f4632b090', '334b7b7b-59c3-5c3e-aa36-9cf41ca1ea78'),
  ('af172229-cadf-536d-9258-bf93df80d489', '334b7b7b-59c3-5c3e-aa36-9cf41ca1ea78'),
  ('0a35b8cb-d55f-5223-95e3-315e89057390', '334b7b7b-59c3-5c3e-aa36-9cf41ca1ea78'),
  ('e382d45e-d10e-52fb-9880-c2036f1e2382', '334b7b7b-59c3-5c3e-aa36-9cf41ca1ea78'),
  ('5c3a941b-96d3-5710-85a7-3e21ac958d4f', '334b7b7b-59c3-5c3e-aa36-9cf41ca1ea78'),
  ('9d5716f8-3486-5d57-930e-57111401f9e5', '334b7b7b-59c3-5c3e-aa36-9cf41ca1ea78'),
  ('27388cde-8868-505f-b82a-2e074dfd0790', '334b7b7b-59c3-5c3e-aa36-9cf41ca1ea78'),
  ('c8363d90-789a-5b3a-8183-b494d3e5c48f', '334b7b7b-59c3-5c3e-aa36-9cf41ca1ea78'),
  ('9d5716f8-3486-5d57-930e-57111401f9e5', '17622d7c-4c74-5f7f-b48f-15ac99c74cef'),
  ('93bce4d3-d0a0-59c2-bfba-3e7f4632b090', '17622d7c-4c74-5f7f-b48f-15ac99c74cef'),
  ('e382d45e-d10e-52fb-9880-c2036f1e2382', '17622d7c-4c74-5f7f-b48f-15ac99c74cef'),
  ('af172229-cadf-536d-9258-bf93df80d489', '17622d7c-4c74-5f7f-b48f-15ac99c74cef');

insert into public.projects (id, author_id, title, description, city, location, shoot_date, category_slug, looking_for, collab_format, terms, usage_rights, requirements, spots, cover_url, created_at) values ('1e43353d-9089-5624-8447-7aac376a347a', '9d5716f8-3486-5d57-930e-57111401f9e5', 'Ищу модель для портретной съёмки в студии', 'Готовлю серию студийных портретов с мягким светом и минимумом ретуши. Нужна модель с выразительной мимикой, опыт не обязателен — подскажу и помогу с позированием.', 'Москва', 'Студия на Бауманской', current_date + 14, 'portrait', array['model']::public.team_role[], 'tfp', 'Студию оплачиваю я. Съёмка около 2 часов.', 'Каждый участник получает 10–15 обработанных кадров и может использовать их в портфолио и соцсетях с отметкой авторов. Коммерческое использование — только по отдельной договорённости.', 'Пунктуальность, готовность к экспериментам с образом.', 1, 'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?auto=format&fit=crop&w=1200&h=800&q=80', now() - interval '104 hours');
insert into public.projects (id, author_id, title, description, city, location, shoot_date, category_slug, looking_for, collab_format, terms, usage_rights, requirements, spots, cover_url, created_at) values ('2f42b7de-00c1-5ff9-9329-7d33acc4c4fe', '9020d816-4402-5e40-b4af-7f97434b842c', 'Нужен фотограф для fashion-проекта', 'Хочу собрать команду для fashion-истории в стиле 90-х: фотограф и стилист. Есть мудборд и идеи локаций.', 'Москва', 'Городские локации', current_date + 21, 'fashion', array['photographer', 'stylist']::public.team_role[], 'collab', 'Совместный проект: каждый вкладывает своё время и навыки.', 'Снимки используются всеми участниками в портфолио; публикация в журналах — с согласия всей команды.', 'Портфолио с fashion-работами.', 2, 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1200&h=800&q=80', now() - interval '91 hours');
insert into public.projects (id, author_id, title, description, city, location, shoot_date, category_slug, looking_for, collab_format, terms, usage_rights, requirements, spots, cover_url, created_at) values ('41edb458-4ce5-574c-8eb9-e7a7922074f8', '93bce4d3-d0a0-59c2-bfba-3e7f4632b090', 'Ищу модель для творческого TFP-проекта', 'Уличная съёмка на закате: длинная прогулка, естественные эмоции, никакой постановки.', 'Санкт-Петербург', 'Петроградская сторона', current_date + 10, 'street', array['model']::public.team_role[], 'tfp', 'TFP: без оплаты с обеих сторон.', 'Модель получает 15+ кадров для портфолио. Использование фото в рекламе — только с отдельного согласия модели.', 'Удобная обувь и хорошее настроение :)', 1, 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?auto=format&fit=crop&w=1200&h=800&q=80', now() - interval '78 hours');
insert into public.projects (id, author_id, title, description, city, location, shoot_date, category_slug, looking_for, collab_format, terms, usage_rights, requirements, spots, cover_url, created_at) values ('2db05ad3-722a-5ea0-84fa-140b1271d174', '5c3a941b-96d3-5710-85a7-3e21ac958d4f', 'Съёмка для начинающих моделей', 'Провожу beauty-тесты для начинающих моделей: помогу с позированием, работаем с визажистом.', 'Казань', 'Студия «Свет»', current_date + 30, 'beauty', array['model']::public.team_role[], 'tfp', 'Студия и визажист за мой счёт.', 'Кадры можно использовать в портфолио; я использую их в своём портфолио и соцсетях.', 'Возраст 18+. Опыт не нужен.', 4, 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1200&h=800&q=80', now() - interval '65 hours');
insert into public.projects (id, author_id, title, description, city, location, shoot_date, category_slug, looking_for, collab_format, terms, usage_rights, requirements, spots, cover_url, created_at) values ('8dc5c8cf-7246-5592-ac99-72857abf57c4', 'e382d45e-d10e-52fb-9880-c2036f1e2382', 'Ищу визажиста и фотографа для совместной съёмки', 'Делаю выпуск зина о московском street style. Нужны визажист и второй фотограф.', 'Москва', 'Центр, Китай-город', current_date + 18, 'street-style', array['photographer', 'makeup']::public.team_role[], 'collab', 'Совместный проект, расходы на печать зина делим.', 'Все участники указаны в зине; снимки можно использовать в портфолио.', 'Опыт работы на улице.', 2, 'https://images.unsplash.com/photo-1503104834685-7205e8607eb9?auto=format&fit=crop&w=1200&h=800&q=80', now() - interval '52 hours');
insert into public.projects (id, author_id, title, description, city, location, shoot_date, category_slug, looking_for, collab_format, terms, usage_rights, requirements, spots, cover_url, created_at) values ('f2eaffb7-f717-50e2-9a5e-061ff329fb1a', 'af172229-cadf-536d-9258-bf93df80d489', 'Каталожная съёмка для бренда одежды', 'Ищу двух моделей (м/ж) для каталожной съёмки базовой коллекции бренда.', 'Москва', 'Студия на Таганке', current_date + 25, 'catalog', array['model']::public.team_role[], 'paid', 'Оплата по ставке за смену (8 часов), обсуждаем в чате.', 'Права на использование снимков передаются бренду на 1 год для сайта и маркетплейсов, условия фиксируются в договоре.', 'Опыт каталожных съёмок, параметры по запросу.', 2, 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&h=800&q=80', now() - interval '39 hours');
insert into public.projects (id, author_id, title, description, city, location, shoot_date, category_slug, looking_for, collab_format, terms, usage_rights, requirements, spots, cover_url, created_at) values ('3e9e00c7-4a5a-5d0d-8044-3d82173fcd40', '27388cde-8868-505f-b82a-2e074dfd0790', 'Love story в стиле ретро', 'Ищу пару (можно не настоящую) для ретро love story с винтажными нарядами.', 'Екатеринбург', 'Парк Харитонова', current_date + 35, 'wedding', array['model']::public.team_role[], 'tfp', 'Наряды и реквизит — мои.', 'Обе стороны используют снимки в портфолио, без коммерческого использования.', 'Пара 20–35 лет, готовность к позированию.', 2, 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1200&h=800&q=80', now() - interval '26 hours');
insert into public.projects (id, author_id, title, description, city, location, shoot_date, category_slug, looking_for, collab_format, terms, usage_rights, requirements, spots, cover_url, created_at) values ('7a3e00b3-5161-53a9-acbe-ea5045f6f61b', '0a35b8cb-d55f-5223-95e3-315e89057390', 'Арт-проект о северном свете', 'Серия художественных портретов с использованием проекций и света.', 'Новосибирск', 'Мастерская художницы', current_date + 40, 'fine-art', array['model', 'stylist']::public.team_role[], 'collab', 'Совместный некоммерческий проект с выставкой в финале.', 'Снимки используются в выставке и портфолио участников с указанием авторства.', 'Интерес к арту и концептуальной фотографии.', 3, 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&w=1200&h=800&q=80', now() - interval '13 hours');

-- Уведомления, созданные триггерами при наполнении демо-данными, не нужны.
delete from public.notifications;
