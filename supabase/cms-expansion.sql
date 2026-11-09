-- Executar no SQL Editor do Supabase para ativar Homepage, Sobre, Contacto e Publicidade.
create extension if not exists pgcrypto;

-- Mantém a configuração de votações que também alimenta /destaques.
create table if not exists public.casa_vote_content (
  key text primary key check (key in ('poll', 'winner_1', 'winner_2', 'winner_3')),
  title text not null default '',
  subtitle text not null default '',
  description text not null default '',
  image_url text not null default '',
  link_url text not null default '',
  is_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.casa_vote_content enable row level security;
grant select on public.casa_vote_content to anon, authenticated;
grant insert, update, delete on public.casa_vote_content to authenticated;
drop policy if exists "Public sees enabled vote content" on public.casa_vote_content;
create policy "Public sees enabled vote content" on public.casa_vote_content for select to anon using (is_enabled = true);
drop policy if exists "Admins manage vote content" on public.casa_vote_content;
create policy "Admins manage vote content" on public.casa_vote_content for all to authenticated using (true) with check (true);
insert into public.casa_vote_content (key, title)
values ('poll', 'Votar agora'), ('winner_1', ''), ('winner_2', ''), ('winner_3', '')
on conflict (key) do nothing;

create table if not exists public.casa_homepage_sections (
  section_key text primary key check (section_key in ('articles', 'interviews', 'voting')),
  title text not null,
  sort_order integer not null default 1,
  is_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.casa_homepage_sections enable row level security;
grant select on public.casa_homepage_sections to anon, authenticated;
grant insert, update, delete on public.casa_homepage_sections to authenticated;
drop policy if exists "Public reads homepage section settings" on public.casa_homepage_sections;
create policy "Public reads homepage section settings" on public.casa_homepage_sections for select to anon using (true);
drop policy if exists "Admins manage homepage sections" on public.casa_homepage_sections;
create policy "Admins manage homepage sections" on public.casa_homepage_sections for all to authenticated using (true) with check (true);
insert into public.casa_homepage_sections (section_key, title, sort_order, is_enabled) values
  ('articles', 'ARTIGOS', 1, true), ('interviews', 'ENTREVISTAS', 2, true), ('voting', 'VOTAÇÕES', 3, false)
on conflict (section_key) do nothing;

create table if not exists public.casa_homepage_editorial (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('article', 'interview')),
  content_id uuid not null,
  title text not null,
  subtitle text not null default '',
  category text not null default '',
  image_url text not null default '',
  link_url text not null default '',
  sort_order integer not null default 1,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (content_type, content_id)
);
alter table public.casa_homepage_editorial enable row level security;
grant select on public.casa_homepage_editorial to anon, authenticated;
grant insert, update, delete on public.casa_homepage_editorial to authenticated;
drop policy if exists "Public sees enabled homepage editorial" on public.casa_homepage_editorial;
create policy "Public sees enabled homepage editorial" on public.casa_homepage_editorial for select to anon using (is_enabled = true);
drop policy if exists "Admins manage homepage editorial" on public.casa_homepage_editorial;
create policy "Admins manage homepage editorial" on public.casa_homepage_editorial for all to authenticated using (true) with check (true);

create table if not exists public.casa_site_content (
  id integer primary key default 1 check (id = 1),
  about_title text not null default '',
  about_text text not null default '',
  about_enabled boolean not null default true,
  charts_update_text text not null default '',
  listeners_update_text text not null default '',
  data_source_text text not null default '',
  contact_enabled boolean not null default true,
  contribution_title text not null default '',
  contribution_text text not null default '',
  contribution_url text not null default '',
  contribution_bank_info text not null default '',
  contribution_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.casa_site_content add column if not exists about_enabled boolean not null default true;
alter table public.casa_site_content add column if not exists contact_enabled boolean not null default true;
alter table public.casa_site_content add column if not exists contribution_enabled boolean not null default true;
alter table public.casa_site_content enable row level security;
grant select on public.casa_site_content to anon, authenticated;
grant insert, update, delete on public.casa_site_content to authenticated;
drop policy if exists "Public reads CASA site content" on public.casa_site_content;
create policy "Public reads CASA site content" on public.casa_site_content for select to anon using (true);
drop policy if exists "Admins manage CASA site content" on public.casa_site_content;
create policy "Admins manage CASA site content" on public.casa_site_content for all to authenticated using (true) with check (true);
insert into public.casa_site_content (id, about_title, about_text, charts_update_text, listeners_update_text, data_source_text, contribution_title, contribution_text)
values (1, 'A música angolana, com contexto.', 'A CASA é um projeto independente dedicado a acompanhar, organizar e dar contexto à música angolana. Reunimos charts, dados e histórias para documentar uma cultura em constante movimento.', 'Os charts são atualizados diariamente.', 'Os dados de ouvintes mensais são atualizados mensalmente.', 'Os dados apresentados pertencem às respetivas plataformas, Apple Music e Spotify. A CASA organiza e apresenta estes indicadores de forma independente.', 'Apoia a CASA', 'Se este projeto te é útil, podes contribuir para o manter e ajudar a crescer.')
on conflict (id) do nothing;

create table if not exists public.casa_contact_settings (
  id integer primary key default 1 check (id = 1),
  recipient_email text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.casa_contact_settings enable row level security;
grant select, insert, update, delete on public.casa_contact_settings to authenticated;
drop policy if exists "Admins manage CASA contact settings" on public.casa_contact_settings;
create policy "Admins manage CASA contact settings" on public.casa_contact_settings for all to authenticated using (true) with check (true);
insert into public.casa_contact_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.casa_ads_settings (
  id integer primary key default 1 check (id = 1),
  is_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.casa_ads_settings enable row level security;
grant select on public.casa_ads_settings to anon;
grant select, insert, update, delete on public.casa_ads_settings to authenticated;
drop policy if exists "Public reads CASA ads switch" on public.casa_ads_settings;
create policy "Public reads CASA ads switch" on public.casa_ads_settings for select to anon using (true);
drop policy if exists "Admins manage CASA ads switch" on public.casa_ads_settings;
create policy "Admins manage CASA ads switch" on public.casa_ads_settings for all to authenticated using (true) with check (true);
insert into public.casa_ads_settings (id, is_enabled) values (1, false) on conflict (id) do nothing;

create table if not exists public.casa_advertisements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  advertiser text not null default '',
  embed_url text not null,
  target_url text not null default '',
  page_scope text not null default 'all' check (page_scope in ('all', 'home', 'sobre', 'artigos', 'destaques', 'charts', 'artistas')),
  sort_order integer not null default 1,
  is_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.casa_advertisements enable row level security;
grant select on public.casa_advertisements to anon, authenticated;
grant insert, update, delete on public.casa_advertisements to authenticated;
drop policy if exists "Public sees enabled CASA ads" on public.casa_advertisements;
create policy "Public sees enabled CASA ads" on public.casa_advertisements for select to anon using (is_enabled = true);
drop policy if exists "Admins manage CASA ads" on public.casa_advertisements;
create policy "Admins manage CASA ads" on public.casa_advertisements for all to authenticated using (true) with check (true);

-- Permite remover os conteúdos existentes diretamente do CMS.
grant delete on public.casa_articles to authenticated;
drop policy if exists "Admins delete CASA articles" on public.casa_articles;
create policy "Admins delete CASA articles" on public.casa_articles for delete to authenticated using (true);
grant delete on public.casa_artist_of_the_month to authenticated;
drop policy if exists "Admins delete artist of the month entries" on public.casa_artist_of_the_month;
create policy "Admins delete artist of the month entries" on public.casa_artist_of_the_month for delete to authenticated using (true);

-- Remove homepage cards automatically when their source content is deleted.
create or replace function public.casa_cleanup_homepage_article()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.casa_homepage_editorial where content_type = 'article' and content_id = old.id;
  return old;
end;
$$;
drop trigger if exists casa_homepage_article_cleanup on public.casa_articles;
create trigger casa_homepage_article_cleanup after delete on public.casa_articles
for each row execute function public.casa_cleanup_homepage_article();

create or replace function public.casa_sync_homepage_article()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.casa_homepage_editorial set
    title = new.title, subtitle = coalesce(new.excerpt, ''), category = coalesce(new.category, ''),
    image_url = coalesce(new.cover_image_url, ''), link_url = '/artigos/' || new.slug,
    is_enabled = case when new.status <> 'published' then false else is_enabled end
  where content_type = 'article' and content_id = new.id;
  return new;
end;
$$;
drop trigger if exists casa_homepage_article_sync on public.casa_articles;
create trigger casa_homepage_article_sync after update on public.casa_articles
for each row execute function public.casa_sync_homepage_article();

create or replace function public.casa_sync_homepage_interview()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    delete from public.casa_homepage_editorial where content_type = 'interview' and content_id = old.id;
    return old;
  end if;
  update public.casa_homepage_editorial set
    title = new.title, subtitle = coalesce(new.subtitle, ''), category = coalesce(new.category, ''),
    image_url = coalesce(new.image_url, ''), link_url = coalesce(new.link_url, '/artigos'),
    is_enabled = case when new.is_published = false or new.section <> 'interviews' then false else is_enabled end
  where content_type = 'interview' and content_id = new.id;
  return new;
end;
$$;
drop trigger if exists casa_homepage_interview_sync on public.casa_editorial_highlights;
create trigger casa_homepage_interview_sync after update or delete on public.casa_editorial_highlights
for each row when (old.section = 'interviews') execute function public.casa_sync_homepage_interview();
