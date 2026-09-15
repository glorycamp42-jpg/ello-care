-- Applied 2026-09-15 via Supabase MCP (project mzrtxmxjggnyyomutjsh)
alter table public.memories add column if not exists user_id uuid references public.users(id) on delete cascade;
create index if not exists memories_user_id_idx on public.memories(user_id);
create unique index if not exists memories_user_key_uniq on public.memories(user_id, time);
drop policy if exists "Allow all" on public.memories;
create policy "elder can read own memories" on public.memories for select using (user_id = auth.uid());
create policy "family can read own links" on public.family_links for select using (family_id = auth.uid() or elder_id = auth.uid());
create policy "elder can insert own gps" on public.gps_locations for insert with check (user_id = auth.uid());
create policy "elder can insert own sos" on public.sos_events for insert with check (elder_id = auth.uid());
create policy "elder or family can read sos" on public.sos_events for select using (
  elder_id = auth.uid() or exists (select 1 from public.family_links fl where fl.elder_id = sos_events.elder_id and fl.family_id = auth.uid() and fl.status = 'accepted'));
create policy "family can update sos status" on public.sos_events for update using (
  exists (select 1 from public.family_links fl where fl.elder_id = sos_events.elder_id and fl.family_id = auth.uid() and fl.status = 'accepted'));
create policy "family can read own sos notifications" on public.sos_notifications for select using (family_id = auth.uid());
create policy "elder can read own conversations" on public.conversations for select using (elder_id = auth.uid());
create policy "elder can read own tickets" on public.happiness_tickets for select using (elder_id = auth.uid());
create policy "elder can read own garden" on public.garden_status for select using (elder_id = auth.uid());
alter function public.set_updated_at() set search_path = public;
alter function public.handle_new_user() set search_path = public;
revoke execute on function public.handle_new_user() from anon, authenticated, public;
