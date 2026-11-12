alter table public.players
  add column if not exists pitch_x double precision,
  add column if not exists pitch_z double precision;

drop policy if exists "pitch_position_owner_editor_update" on public.players;

create policy "pitch_position_owner_editor_update"
  on public.players
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
