-- Conteúdo de votação da página Destaques. Executar no SQL Editor do Supabase.
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
create policy "Public sees enabled vote content"
  on public.casa_vote_content for select to anon
  using (is_enabled = true);

drop policy if exists "Admins manage vote content" on public.casa_vote_content;
create policy "Admins manage vote content"
  on public.casa_vote_content for all to authenticated
  using (true) with check (true);

insert into public.casa_vote_content (key, title)
values ('poll', 'Votar agora'), ('winner_1', ''), ('winner_2', ''), ('winner_3', '')
on conflict (key) do nothing;
