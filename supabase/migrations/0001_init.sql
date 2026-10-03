-- Pizza Service: one community service crew per deployment.
-- Everything a browser reads goes through RLS (members only). All writes happen
-- server-side with the secret key, so there are no insert/update policies.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Crew settings (single row)
-- ---------------------------------------------------------------------------
create table public.settings (
  id                int primary key default 1 check (id = 1),
  crew_name         text not null default 'Pizza Service',
  days_before_slice int  not null default 2 check (days_before_slice between 0 and 14),
  charge_time       time not null default '18:00',
  timezone          text not null default 'America/Los_Angeles',
  fees_paid_by      text not null default 'eaters' check (fees_paid_by in ('eaters', 'payer')),
  invite_code       text not null default encode(gen_random_bytes(6), 'hex'),
  updated_at        timestamptz not null default now()
);
insert into public.settings default values;

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  email       text not null,
  full_name   text,
  avatar_url  text,
  role        text not null default 'pending' check (role in ('pending', 'member', 'admin')),
  auto_join   boolean not null default false,  -- "subscriber": in every split automatically
  has_card    boolean not null default false,
  card_label  text,                            -- e.g. "Visa •••• 4242", safe to show the crew
  can_receive boolean not null default false,  -- bank connected through Stripe, payouts enabled
  created_at  timestamptz not null default now()
);

-- Stripe identifiers stay out of reach of the browser entirely.
create table public.billing (
  user_id            uuid primary key references public.profiles on delete cascade,
  stripe_customer_id text unique,
  payment_method_id  text,
  stripe_account_id  text unique,
  updated_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Pizza spend requests and who is in each split
-- ---------------------------------------------------------------------------
create table public.requests (
  id           uuid primary key default gen_random_uuid(),
  payer_id     uuid not null references public.profiles on delete cascade,
  amount_cents int  not null check (amount_cents between 100 and 200000),
  note         text check (char_length(note) <= 140),
  payer_eats   boolean not null default true,
  status       text not null default 'open' check (status in ('open', 'slicing', 'sliced', 'canceled')),
  slice_at     timestamptz not null,
  sliced_at    timestamptz,
  created_at   timestamptz not null default now()
);
create index requests_status_slice_at on public.requests (status, slice_at);

create table public.participants (
  request_id        uuid not null references public.requests on delete cascade,
  user_id           uuid not null references public.profiles on delete cascade,
  kind              text not null check (kind in ('payer', 'subscriber', 'once')),
  share_cents       int,
  charge_cents      int,
  status            text not null default 'in' check (status in ('in', 'charging', 'paid', 'failed', 'covered')),
  payment_intent_id text,
  failure           text,
  joined_at         timestamptz not null default now(),
  primary key (request_id, user_id)
);
create index participants_user on public.participants (user_id);

-- ---------------------------------------------------------------------------
-- New Google sign-ins get a profile. The very first person becomes admin;
-- everyone else waits until they open the crew's invite link.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'),
    case when exists (select 1 from public.profiles where role = 'admin') then 'pending' else 'admin' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
create or replace function public.is_member()
returns boolean
language sql stable
security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('member', 'admin'));
$$;

alter table public.settings     enable row level security;
alter table public.profiles     enable row level security;
alter table public.billing      enable row level security;
alter table public.requests     enable row level security;
alter table public.participants enable row level security;

create policy "members read settings"     on public.settings     for select using (public.is_member());
create policy "read own profile"          on public.profiles     for select using (id = auth.uid());
create policy "members read profiles"     on public.profiles     for select using (public.is_member());
create policy "members read requests"     on public.requests     for select using (public.is_member());
create policy "members read participants" on public.participants for select using (public.is_member());
-- billing: no policies on purpose (server only)

-- Live pizza: browsers re-slice as people join.
alter publication supabase_realtime add table public.requests, public.participants;
