-- Weekly message, neighbors, answers, and prayers.
-- Same pattern as 0001: members read through RLS, all writes happen server-side.

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Neighbors: the people we serve. Often just a first name and a last initial,
-- so the same person can be found again next week.
-- ---------------------------------------------------------------------------
create table public.neighbors (
  id           uuid primary key default gen_random_uuid(),
  first_name   text not null check (char_length(first_name) between 1 and 40),
  last_name    text check (char_length(last_name) <= 40),
  search_name  text generated always as (lower(first_name || ' ' || coalesce(last_name, ''))) stored,
  created_by   uuid references public.profiles on delete set null,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index neighbors_search_trgm on public.neighbors using gin (search_name extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- The weekly message admins post: gospel, a message to share, two questions.
-- ---------------------------------------------------------------------------
create table public.weekly_posts (
  id                  uuid primary key default gen_random_uuid(),
  week_of             date not null,
  title               text check (char_length(title) <= 120),
  gospel_reference    text not null check (char_length(gospel_reference) <= 120),
  gospel_text         text not null check (char_length(gospel_text) <= 20000),
  message             text not null check (char_length(message) <= 20000),
  hope_question       text not null check (char_length(hope_question) <= 500),
  friendship_question text not null check (char_length(friendship_question) <= 500),
  published           boolean not null default false,
  published_at        timestamptz,
  emailed_at          timestamptz,
  created_by          uuid references public.profiles on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index weekly_posts_week on public.weekly_posts (week_of desc);

-- Answers neighbors share to this week's questions, written down by a volunteer.
create table public.answers (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.weekly_posts on delete cascade,
  question    text not null check (question in ('hope', 'friendship')),
  neighbor_id uuid references public.neighbors on delete set null,
  answer      text not null check (char_length(answer) between 1 and 4000),
  recorded_by uuid references public.profiles on delete set null,
  created_at  timestamptz not null default now()
);
create index answers_post on public.answers (post_id, question, created_at);
create index answers_neighbor on public.answers (neighbor_id);

-- Prayer requests, for a named person or anonymous.
create table public.prayers (
  id           uuid primary key default gen_random_uuid(),
  neighbor_id  uuid references public.neighbors on delete set null,
  anonymous    boolean not null default false,
  request      text not null check (char_length(request) between 1 and 2000),
  submitted_by uuid references public.profiles on delete set null,
  created_at   timestamptz not null default now(),
  check (anonymous or neighbor_id is not null)
);
create index prayers_created on public.prayers (created_at desc);
create index prayers_neighbor on public.prayers (neighbor_id);

-- ---------------------------------------------------------------------------
-- Live name search: typo-tolerant, best matches first, with how often we've
-- met them and when, so volunteers can tell two Johns apart.
-- ---------------------------------------------------------------------------
create or replace function public.search_neighbors(q text, max_results int default 8)
returns table (id uuid, first_name text, last_name text, mentions bigint, last_seen_at timestamptz)
language sql stable
security definer set search_path = public, extensions
as $$
  with term as (select lower(btrim(coalesce(q, ''))) as t)
  select n.id, n.first_name, n.last_name,
         (select count(*) from public.answers a where a.neighbor_id = n.id)
       + (select count(*) from public.prayers p where p.neighbor_id = n.id) as mentions,
         n.last_seen_at
  from public.neighbors n, term
  where term.t = ''
     or n.search_name like '%' || term.t || '%'
     or word_similarity(term.t, n.search_name) > 0.35
  order by (n.search_name like term.t || '%') desc,
           word_similarity(term.t, n.search_name) desc,
           n.last_seen_at desc
  limit greatest(1, least(max_results, 20));
$$;
-- Only the server (secret key) calls it, after checking membership.
revoke execute on function public.search_neighbors(text, int) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row level security: members read, nobody writes from the browser.
-- ---------------------------------------------------------------------------
alter table public.neighbors    enable row level security;
alter table public.weekly_posts enable row level security;
alter table public.answers      enable row level security;
alter table public.prayers      enable row level security;

create policy "members read neighbors" on public.neighbors    for select using (public.is_member());
create policy "members read posts"     on public.weekly_posts for select using (public.is_member() and (published or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')));
create policy "members read answers"   on public.answers      for select using (public.is_member());
create policy "members read prayers"   on public.prayers      for select using (public.is_member());

alter publication supabase_realtime add table public.answers, public.prayers;
