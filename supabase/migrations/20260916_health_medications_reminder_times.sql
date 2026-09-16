-- 약 알림 시간을 건강수첩(health_medications)에 통합: 본인·가족·시설 누가 넣어도 엘로가 기억
alter table health_medications
  add column if not exists times text[] not null default '{}',
  add column if not exists reminder_enabled boolean not null default true;
comment on column health_medications.times is 'Daily reminder times HH:MM (24h, elder local time). Empty = no reminder.';
