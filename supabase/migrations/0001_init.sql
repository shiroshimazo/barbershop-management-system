-- ============================================================================
-- Barbershop Management System - initial schema
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- ============================================================================

-- ----------------------------------------------------------------------------
-- customers: one row per signed-up user, linked to auth.users
-- ----------------------------------------------------------------------------
create table if not exists public.customers (
  id uuid primary key references auth.users(id) on delete cascade,
  fullname text not null,
  email text not null unique,
  phone text,
  loyalty_points int not null default 0,
  tier text not null default 'silver' check (tier in ('silver', 'gold', 'platinum')),
  member_since timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- barbers: shop staff (managed by admins; readable by everyone)
-- ----------------------------------------------------------------------------
create table if not exists public.barbers (
  id uuid primary key default gen_random_uuid(),
  fullname text not null,
  initials text not null,
  specialty text,
  location text,
  years_experience int,
  rating numeric(2,1) default 5.0,
  review_count int default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- appointments: future / current bookings
-- ----------------------------------------------------------------------------
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  barber_id uuid not null references public.barbers(id) on delete restrict,
  service text not null,
  scheduled_at timestamptz not null,
  duration_minutes int not null default 45,
  location text,
  price_cents int not null default 0,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled', 'no_show')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists appointments_customer_idx on public.appointments(customer_id, scheduled_at desc);
create index if not exists appointments_barber_idx on public.appointments(barber_id, scheduled_at desc);

-- ----------------------------------------------------------------------------
-- visits: completed appointment history (receipts)
-- ----------------------------------------------------------------------------
create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  barber_id uuid not null references public.barbers(id) on delete restrict,
  appointment_id uuid references public.appointments(id) on delete set null,
  service text not null,
  visited_at timestamptz not null,
  location text,
  price_cents int not null default 0,
  rating int check (rating between 1 and 5),
  created_at timestamptz not null default now()
);

create index if not exists visits_customer_idx on public.visits(customer_id, visited_at desc);

-- ----------------------------------------------------------------------------
-- favorites: customer <-> barber many-to-many
-- ----------------------------------------------------------------------------
create table if not exists public.favorites (
  customer_id uuid not null references public.customers(id) on delete cascade,
  barber_id uuid not null references public.barbers(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (customer_id, barber_id)
);

-- ----------------------------------------------------------------------------
-- updated_at trigger
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

drop trigger if exists appointments_set_updated_at on public.appointments;
create trigger appointments_set_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Auto-create customer profile when a user signs up
-- Reads fullname/phone from raw_user_meta_data (set by signUp options.data)
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.customers (id, fullname, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'fullname', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table public.customers     enable row level security;
alter table public.barbers       enable row level security;
alter table public.appointments  enable row level security;
alter table public.visits        enable row level security;
alter table public.favorites     enable row level security;

-- customers: a user can read/update only their own row
drop policy if exists "customers_select_own" on public.customers;
create policy "customers_select_own"
  on public.customers for select
  using (auth.uid() = id);

drop policy if exists "customers_update_own" on public.customers;
create policy "customers_update_own"
  on public.customers for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- barbers: anyone authenticated can read; writes are admin-only (no policy = denied)
drop policy if exists "barbers_select_all" on public.barbers;
create policy "barbers_select_all"
  on public.barbers for select
  to authenticated
  using (true);

-- appointments: a user can CRUD only their own
drop policy if exists "appointments_select_own" on public.appointments;
create policy "appointments_select_own"
  on public.appointments for select
  using (auth.uid() = customer_id);

drop policy if exists "appointments_insert_own" on public.appointments;
create policy "appointments_insert_own"
  on public.appointments for insert
  with check (auth.uid() = customer_id);

drop policy if exists "appointments_update_own" on public.appointments;
create policy "appointments_update_own"
  on public.appointments for update
  using (auth.uid() = customer_id)
  with check (auth.uid() = customer_id);

drop policy if exists "appointments_delete_own" on public.appointments;
create policy "appointments_delete_own"
  on public.appointments for delete
  using (auth.uid() = customer_id);

-- visits: a user can read their own; inserts happen server-side or via admin
drop policy if exists "visits_select_own" on public.visits;
create policy "visits_select_own"
  on public.visits for select
  using (auth.uid() = customer_id);

-- favorites: a user can manage only their own
drop policy if exists "favorites_select_own" on public.favorites;
create policy "favorites_select_own"
  on public.favorites for select
  using (auth.uid() = customer_id);

drop policy if exists "favorites_insert_own" on public.favorites;
create policy "favorites_insert_own"
  on public.favorites for insert
  with check (auth.uid() = customer_id);

drop policy if exists "favorites_delete_own" on public.favorites;
create policy "favorites_delete_own"
  on public.favorites for delete
  using (auth.uid() = customer_id);

-- ----------------------------------------------------------------------------
-- Seed barbers
-- ----------------------------------------------------------------------------
insert into public.barbers (fullname, initials, specialty, location, years_experience, rating, review_count)
values
  ('Jordan Tate', 'JT', 'Classic cuts & fades', 'Downtown', 8, 5.0, 218),
  ('Sami Kade',   'SK', 'Beard sculpting',      'Eastside', 6, 4.8, 164),
  ('Rey Vargas',  'RV', 'Skin fades & designs', 'Downtown', 7, 4.9, 302)
on conflict do nothing;
