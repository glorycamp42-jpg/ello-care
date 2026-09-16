-- 엘로 메시지: 연결된 사람끼리 말로 보내고 말로 답한다 (문자·카톡을 거치지 않음)
create table if not exists ello_messages (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references auth.users(id) on delete cascade,
  to_user uuid not null references auth.users(id) on delete cascade,
  body text not null,
  reply_to uuid references ello_messages(id) on delete set null,
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  read_at timestamptz
);
create index if not exists ello_messages_to_unread_idx on ello_messages (to_user, created_at desc) where read_at is null;
create index if not exists ello_messages_pair_idx on ello_messages (from_user, to_user, created_at desc);
alter table ello_messages enable row level security;
create policy "own messages" on ello_messages for select using (auth.uid() = from_user or auth.uid() = to_user);
