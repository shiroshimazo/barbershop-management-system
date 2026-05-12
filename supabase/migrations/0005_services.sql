-- ============================================================================
-- Phase 7: shared service catalog
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- ============================================================================

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  price_cents int not null default 0,
  duration_minutes int not null default 45,
  descriptor text,
  tag text,
  active boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists services_active_idx
  on public.services(active, display_order, name);

alter table public.services enable row level security;

drop policy if exists "services_select_all" on public.services;
create policy "services_select_all"
  on public.services for select
  to authenticated
  using (true);

insert into public.services (slug, name, price_cents, duration_minutes, descriptor, tag, display_order)
values
  ('classic-fade-beard', 'Classic Fade + Beard Trim', 4800, 45, 'Most popular', 'Signature', 1),
  ('skin-fade', 'Skin Fade', 4000, 40, 'Sharp lines', null, 2),
  ('classic-cut', 'Classic Cut', 3500, 30, 'Scissor & comb', null, 3),
  ('beard-sculpt', 'Beard Sculpt & Hot Towel', 3200, 30, 'Includes oil', null, 4),
  ('full-service', 'The Full Service', 7500, 75, 'Cut + beard + treatment', 'Premium', 5),
  ('kids-cut', 'Kid''s Cut', 2200, 25, 'Under 12', null, 6)
on conflict (slug) do update
set
  name = excluded.name,
  price_cents = excluded.price_cents,
  duration_minutes = excluded.duration_minutes,
  descriptor = excluded.descriptor,
  tag = excluded.tag,
  active = true,
  display_order = excluded.display_order;

alter table public.appointments
  add column if not exists service_id uuid references public.services(id) on delete set null;

create index if not exists appointments_service_idx on public.appointments(service_id);

update public.appointments a
   set service_id = s.id
  from public.services s
 where a.service_id is null
   and lower(trim(a.service)) = lower(trim(s.name));
