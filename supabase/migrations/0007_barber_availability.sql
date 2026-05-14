-- ============================================================================
-- Phase 8: barber-specific availability and guarded booking
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- ============================================================================

create extension if not exists btree_gist;

create table if not exists public.barber_availability (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  slot_step_minutes int not null default 15 check (slot_step_minutes between 5 and 240),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint barber_availability_valid_window check (start_time < end_time)
);

create unique index if not exists barber_availability_unique_window
  on public.barber_availability(barber_id, day_of_week, start_time, end_time);

create index if not exists barber_availability_lookup_idx
  on public.barber_availability(barber_id, day_of_week, active);

create table if not exists public.barber_time_off (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  constraint barber_time_off_valid_window check (starts_at < ends_at)
);

create index if not exists barber_time_off_lookup_idx
  on public.barber_time_off(barber_id, starts_at, ends_at);

alter table public.barber_availability enable row level security;
alter table public.barber_time_off enable row level security;

drop policy if exists "barber_availability_select_all" on public.barber_availability;
create policy "barber_availability_select_all"
  on public.barber_availability for select
  to authenticated
  using (true);

-- Time-off rows are read through security-definer RPCs only, so no direct
-- customer select policy is created for barber_time_off.

create or replace function public.get_barber_available_slots(
  p_barber_id uuid,
  p_date date,
  p_service_id uuid default null,
  p_service_duration_minutes int default null,
  p_timezone text default 'Asia/Singapore'
)
returns table (
  slot_label text,
  starts_at timestamptz,
  ends_at timestamptz,
  is_available boolean,
  unavailable_reason text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return query
  with service_config as (
    select greatest(coalesce(p_service_duration_minutes, s.duration_minutes, 45), 5) as duration_minutes
      from (select 1) seed
      left join public.services s
        on s.id = p_service_id
       and s.active = true
  ),
  windows as (
    select
      ((p_date::timestamp + ba.start_time) at time zone p_timezone) as window_start,
      ((p_date::timestamp + ba.end_time) at time zone p_timezone) as window_end,
      greatest(ba.slot_step_minutes, 5) as step_minutes,
      sc.duration_minutes
    from public.barber_availability ba
    join public.barbers b
      on b.id = ba.barber_id
     and b.active = true
    cross join service_config sc
    where ba.barber_id = p_barber_id
      and ba.day_of_week = extract(dow from p_date)::int
      and ba.active = true
      and ba.start_time < ba.end_time
  ),
  slots as (
    select
      gs as slot_start,
      gs + make_interval(mins => w.duration_minutes) as slot_end
    from windows w
    cross join lateral generate_series(
      w.window_start,
      w.window_end - make_interval(mins => w.duration_minutes),
      make_interval(mins => w.step_minutes)
    ) as gs
  ),
  evaluated as (
    select
      s.slot_start,
      s.slot_end,
      case
        when s.slot_start <= now() then 'past'
        when exists (
          select 1
            from public.appointments a
           where a.barber_id = p_barber_id
             and a.status = 'scheduled'
             and tstzrange(
                   a.scheduled_at,
                   a.scheduled_at + make_interval(mins => a.duration_minutes),
                   '[)'
                 ) && tstzrange(s.slot_start, s.slot_end, '[)')
        ) then 'booked'
        when exists (
          select 1
            from public.barber_time_off t
           where t.barber_id = p_barber_id
             and tstzrange(t.starts_at, t.ends_at, '[)') && tstzrange(s.slot_start, s.slot_end, '[)')
        ) then 'unavailable'
        else null
      end as reason
    from slots s
  )
  select
    to_char(e.slot_start at time zone p_timezone, 'FMHH12:MI AM') as slot_label,
    e.slot_start as starts_at,
    e.slot_end as ends_at,
    e.reason is null as is_available,
    e.reason as unavailable_reason
  from evaluated e
  order by e.slot_start;
end;
$$;

revoke all on function public.get_barber_available_slots(uuid, date, uuid, int, text) from public;
grant execute on function public.get_barber_available_slots(uuid, date, uuid, int, text) to authenticated;

create or replace function public.book_customer_appointment(
  p_barber_id uuid,
  p_scheduled_at timestamptz,
  p_service_id uuid default null,
  p_service_name text default null,
  p_duration_minutes int default null,
  p_location text default null,
  p_price_cents int default null,
  p_notes text default null,
  p_timezone text default 'Asia/Singapore'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_duration_minutes int;
  v_service_name text;
  v_price_cents int;
  v_appointment_id uuid;
  v_starts_at timestamptz := p_scheduled_at;
  v_ends_at timestamptz;
  v_local_date date;
  v_local_start time;
  v_local_end time;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Serialize customer-created bookings per barber so the overlap check and
  -- insert below cannot race when two users confirm the same time together.
  perform pg_advisory_xact_lock(hashtextextended(p_barber_id::text, 0));

  select
    greatest(coalesce(p_duration_minutes, s.duration_minutes, 45), 5),
    coalesce(nullif(trim(p_service_name), ''), s.name, 'Appointment'),
    coalesce(p_price_cents, s.price_cents, 0)
  into v_duration_minutes, v_service_name, v_price_cents
  from (select 1) seed
  left join public.services s
    on s.id = p_service_id
   and s.active = true;

  v_ends_at := v_starts_at + make_interval(mins => v_duration_minutes);
  v_local_date := (v_starts_at at time zone p_timezone)::date;
  v_local_start := (v_starts_at at time zone p_timezone)::time;
  v_local_end := (v_ends_at at time zone p_timezone)::time;

  if v_starts_at <= now() then
    raise exception 'Selected time has already passed';
  end if;

  if not exists (
    select 1
      from public.barbers b
      join public.barber_availability ba
        on ba.barber_id = b.id
     where b.id = p_barber_id
       and b.active = true
       and ba.active = true
       and ba.day_of_week = extract(dow from v_local_date)::int
       and v_local_start >= ba.start_time
       and v_local_end <= ba.end_time
  ) then
    raise exception 'Selected time is outside this barber''s availability';
  end if;

  if exists (
    select 1
      from public.barber_time_off t
     where t.barber_id = p_barber_id
       and tstzrange(t.starts_at, t.ends_at, '[)') && tstzrange(v_starts_at, v_ends_at, '[)')
  ) then
    raise exception 'Selected time is unavailable';
  end if;

  if exists (
    select 1
      from public.appointments a
     where a.barber_id = p_barber_id
       and a.status = 'scheduled'
       and tstzrange(
             a.scheduled_at,
             a.scheduled_at + make_interval(mins => a.duration_minutes),
             '[)'
           ) && tstzrange(v_starts_at, v_ends_at, '[)')
  ) then
    raise exception 'Selected time is already booked';
  end if;

  insert into public.appointments (
    customer_id,
    barber_id,
    service_id,
    service,
    scheduled_at,
    duration_minutes,
    location,
    price_cents,
    status,
    notes
  )
  values (
    v_user_id,
    p_barber_id,
    p_service_id,
    v_service_name,
    v_starts_at,
    v_duration_minutes,
    p_location,
    v_price_cents,
    'scheduled',
    nullif(trim(p_notes), '')
  )
  returning id into v_appointment_id;

  return v_appointment_id;
end;
$$;

revoke all on function public.book_customer_appointment(uuid, timestamptz, uuid, text, int, text, int, text, text) from public;
grant execute on function public.book_customer_appointment(uuid, timestamptz, uuid, text, int, text, int, text, text) to authenticated;

insert into public.barber_availability (barber_id, day_of_week, start_time, end_time, slot_step_minutes)
select b.id, d.day_of_week, time '09:00', time '19:00', 15
  from public.barbers b
 cross join (values (1), (2), (3), (4), (5), (6)) as d(day_of_week)
 where b.active = true
on conflict do nothing;
