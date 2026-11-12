-- ============================================================
-- 在你的 Supabase 项目里执行这一整段（SQL Editor → New query → 粘贴 → Run）
-- 作用：建一张只允许"写"、不允许"读"的答题表
-- ============================================================

create table if not exists public.answers (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  card        text not null,              -- 哪张卡，取页面标题
  week        text,                       -- 第几周，页面里填
  body        text not null,              -- 答题卡正文
  ua          text                        -- 设备信息，排查用
);

-- 打开行级安全：这是"只写不读"的关键
alter table public.answers enable row level security;

-- 显式授权：这样不管建项目时"自动暴露新表"开没开，都能提交
grant usage on schema public to anon;
grant insert on public.answers to anon;
grant usage, select on all sequences in schema public to anon;

-- 允许匿名用户（网页里的 anon key）插入
drop policy if exists "anon can insert" on public.answers;
create policy "anon can insert"
  on public.answers
  for insert
  to anon
  with check (
    char_length(body) between 1 and 40000
    and char_length(card) <= 200
  );

-- 故意不创建任何 select / update / delete 策略
-- → 匿名用户读不到、改不了、删不了
-- → 只有 service_role key（存在你电脑上）能读

-- 不建视图。
-- 原因：Postgres 的视图默认以"创建者权限"运行，而创建者是超级用户，
-- 匿名用户查视图时会绕过 RLS，等于把"只写不读"废掉。
-- 读取统一走 service_role key 直接查表（tools/read_answers.py），不需要视图。
