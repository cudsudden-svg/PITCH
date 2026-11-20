create table if not exists public.player_cards (
  player_id uuid primary key references public.players(id) on delete cascade,
  overall integer not null default 60 check (overall between 1 and 99),
  nationality text,
  preferred_foot text not null default 'Right'
    check (preferred_foot in ('Right', 'Left', 'Both')),
  height_cm integer check (height_cm between 100 and 250),
  photo_url text,
  pace integer not null default 60 check (pace between 1 and 99),
  shooting integer not null default 60 check (shooting between 1 and 99),
  passing integer not null default 60 check (passing between 1 and 99),
  dribbling integer not null default 60 check (dribbling between 1 and 99),
  defending integer not null default 60 check (defending between 1 and 99),
  physical integer not null default 60 check (physical between 1 and 99),
  updated_at timestamptz not null default now()
);

alter table public.player_cards enable row level security;

grant select on public.player_cards to anon, authenticated;
grant insert, update, delete on public.player_cards to authenticated;

drop policy if exists "player_cards_public_read" on public.player_cards;
create policy "player_cards_public_read"
  on public.player_cards
  for select
  to anon, authenticated
  using (true);

drop policy if exists "player_cards_owner_editor_insert" on public.player_cards;
create policy "player_cards_owner_editor_insert"
  on public.player_cards
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('owner', 'editor')
    )
  );

drop policy if exists "player_cards_owner_editor_update" on public.player_cards;
create policy "player_cards_owner_editor_update"
  on public.player_cards
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('owner', 'editor')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('owner', 'editor')
    )
  );

drop policy if exists "player_cards_owner_editor_delete" on public.player_cards;
create policy "player_cards_owner_editor_delete"
  on public.player_cards
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('owner', 'editor')
    )
  );
