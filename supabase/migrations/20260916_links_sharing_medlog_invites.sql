-- 엘로 앱 하나로: 누구나 자기 엘로를 쓰고, 원하면 사람을 "연결". 연결은 역할이 아니라 관계.
-- 1) family_links → 양방향 연결 + 공유 범위 (elder_id = 보이는 사람, family_id = 보는 사람; 공유 범위는 보이는 사람이 정함)
alter table family_links
  add column if not exists share_wellbeing boolean not null default true,
  add column if not exists share_meds boolean not null default true,
  add column if not exists share_appointments boolean not null default true,
  add column if not exists share_location boolean not null default false;
create unique index if not exists family_links_pair_uniq on family_links (family_id, elder_id);

-- 2) 연결 초대 번호 (6자리, 24시간)
create table if not exists link_invites (
  code text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  relationship_hint text default '',
  expires_at timestamptz not null default now() + interval '24 hours',
  created_at timestamptz not null default now()
);
create index if not exists link_invites_user_idx on link_invites (user_id);
alter table link_invites enable row level security;

-- 3) 약 복용 기록 (폰의 '먹었어요' → 서버)
create table if not exists medication_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  scheduled_time text not null,
  med_names text[] not null default '{}',
  status text not null default 'taken',
  taken_at timestamptz not null default now(),
  unique (user_id, log_date, scheduled_time)
);
create index if not exists medication_log_user_date_idx on medication_log (user_id, log_date desc);
alter table medication_log enable row level security;
create policy "own med log" on medication_log for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
