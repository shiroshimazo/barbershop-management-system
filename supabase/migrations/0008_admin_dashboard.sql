-- ============================================================================
-- Phase 9: admin dashboard metrics and walk-ins
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- ============================================================================

create table if not exists public.walk_ins (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid references public.barbers(id) on delete set null,
  customer_name text not null default 'Walk-in guest',
  service text not null default 'Walk-in service',
  served_at timestamptz not null default now(),
  price_cents int not null default 0 check (price_cents >= 0),
  status text not null default 'served' check (status in ('served', 'cancelled')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists walk_ins_served_at_idx
  on public.walk_ins(served_at desc);

create index if not exists walk_ins_barber_idx
  on public.walk_ins(barber_id, served_at desc);

alter table public.walk_ins enable row level security;

drop policy if exists "walk_ins_admin_all" on public.walk_ins;
create policy "walk_ins_admin_all"
  on public.walk_ins for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "appointments_select_admin" on public.appointments;
create policy "appointments_select_admin"
  on public.appointments for select
  to authenticated
  using (public.is_admin());

drop policy if exists "visits_select_admin" on public.visits;
create policy "visits_select_admin"
  on public.visits for select
  to authenticated
  using (public.is_admin());

drop policy if exists "barber_availability_admin_all" on public.barber_availability;
create policy "barber_availability_admin_all"
  on public.barber_availability for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "barber_time_off_admin_all" on public.barber_time_off;
create policy "barber_time_off_admin_all"
  on public.barber_time_off for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.get_admin_dashboard(p_timezone text default 'Asia/Singapore')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone p_timezone)::date;
  v_day_start timestamptz := ((now() at time zone p_timezone)::date::timestamp at time zone p_timezone);
  v_day_end timestamptz := ((((now() at time zone p_timezone)::date + 1)::timestamp) at time zone p_timezone);
  v_today_bookings int := 0;
  v_revenue_cents int := 0;
  v_walk_ins int := 0;
  v_upcoming int := 0;
  v_upcoming_rows jsonb := '[]'::jsonb;
  v_barber_rows jsonb := '[]'::jsonb;
  v_recent_walk_ins jsonb := '[]'::jsonb;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  select count(*)::int
    into v_today_bookings
    from public.appointments a
   where a.scheduled_at >= v_day_start
     and a.scheduled_at < v_day_end
     and a.status in ('scheduled', 'completed');

  select (
    coalesce((
      select sum(v.price_cents)::int
        from public.visits v
       where v.visited_at >= v_day_start
         and v.visited_at < v_day_end
    ), 0) +
    coalesce((
      select sum(w.price_cents)::int
        from public.walk_ins w
       where w.served_at >= v_day_start
         and w.served_at < v_day_end
         and w.status = 'served'
    ), 0)
  )
  into v_revenue_cents;

  select count(*)::int
    into v_walk_ins
    from public.walk_ins w
   where w.served_at >= v_day_start
     and w.served_at < v_day_end
     and w.status = 'served';

  select count(*)::int
    into v_upcoming
    from public.appointments a
   where a.scheduled_at >= now()
     and a.status = 'scheduled';

  select coalesce(jsonb_agg(row_payload order by scheduled_at), '[]'::jsonb)
    into v_upcoming_rows
    from (
      select
        a.scheduled_at,
        jsonb_build_object(
          'id', a.id,
          'customerName', c.fullname,
          'customerEmail', c.email,
          'barberName', b.fullname,
          'service', a.service,
          'scheduledAt', a.scheduled_at,
          'durationMinutes', a.duration_minutes,
          'status', a.status,
          'priceCents', a.price_cents,
          'location', coalesce(a.location, b.location)
        ) as row_payload
      from public.appointments a
      left join public.customers c on c.id = a.customer_id
      left join public.barbers b on b.id = a.barber_id
      where a.scheduled_at >= now()
        and a.status = 'scheduled'
      order by a.scheduled_at
      limit 8
    ) rows;

  select coalesce(jsonb_agg(row_payload order by barber_name), '[]'::jsonb)
    into v_barber_rows
    from (
      select
        b.fullname as barber_name,
        jsonb_build_object(
          'barberId', b.id,
          'name', b.fullname,
          'initials', b.initials,
          'specialty', b.specialty,
          'location', b.location,
          'rating', b.rating,
          'todayBookingsCount', coalesce(today_bookings.count, 0),
          'walkInsToday', coalesce(today_walk_ins.count, 0),
          'windows', coalesce(windows.items, '[]'::jsonb),
          'nextAppointmentAt', next_appt.scheduled_at,
          'nextService', next_appt.service,
          'status',
            case
              when windows.items is null then 'No hours today'
              when next_appt.scheduled_at is null then 'Open'
              else 'Booked flow'
            end
        ) as row_payload
      from public.barbers b
      left join lateral (
        select jsonb_agg(
          jsonb_build_object(
            'startTime', to_char(ba.start_time, 'HH24:MI'),
            'endTime', to_char(ba.end_time, 'HH24:MI'),
            'stepMinutes', ba.slot_step_minutes
          )
          order by ba.start_time
        ) as items
        from public.barber_availability ba
        where ba.barber_id = b.id
          and ba.active = true
          and ba.day_of_week = extract(dow from v_today)::int
      ) windows on true
      left join lateral (
        select count(*)::int
          from public.appointments a
         where a.barber_id = b.id
           and a.scheduled_at >= v_day_start
           and a.scheduled_at < v_day_end
           and a.status = 'scheduled'
      ) today_bookings on true
      left join lateral (
        select count(*)::int
          from public.walk_ins w
         where w.barber_id = b.id
           and w.served_at >= v_day_start
           and w.served_at < v_day_end
           and w.status = 'served'
      ) today_walk_ins on true
      left join lateral (
        select a.scheduled_at, a.service
          from public.appointments a
         where a.barber_id = b.id
           and a.scheduled_at >= now()
           and a.status = 'scheduled'
         order by a.scheduled_at
         limit 1
      ) next_appt on true
      where b.active = true
    ) rows;

  select coalesce(jsonb_agg(row_payload order by served_at desc), '[]'::jsonb)
    into v_recent_walk_ins
    from (
      select
        w.served_at,
        jsonb_build_object(
          'id', w.id,
          'customerName', w.customer_name,
          'service', w.service,
          'servedAt', w.served_at,
          'priceCents', w.price_cents,
          'barberName', b.fullname,
          'status', w.status
        ) as row_payload
      from public.walk_ins w
      left join public.barbers b on b.id = w.barber_id
      where w.served_at >= v_day_start
        and w.served_at < v_day_end
      order by w.served_at desc
      limit 6
    ) rows;

  return jsonb_build_object(
    'date', v_today,
    'generatedAt', now(),
    'metrics', jsonb_build_object(
      'todayBookingsCount', v_today_bookings,
      'revenueCents', v_revenue_cents,
      'walkInsCount', v_walk_ins,
      'upcomingAppointmentsCount', v_upcoming,
      'availableBarbersCount', (
        select count(*)::int
          from public.barbers b
         where b.active = true
           and exists (
             select 1
               from public.barber_availability ba
              where ba.barber_id = b.id
                and ba.active = true
                and ba.day_of_week = extract(dow from v_today)::int
           )
      )
    ),
    'upcomingAppointments', v_upcoming_rows,
    'barberAvailability', v_barber_rows,
    'recentWalkIns', v_recent_walk_ins
  );
end;
$$;

revoke all on function public.get_admin_dashboard(text) from public;
grant execute on function public.get_admin_dashboard(text) to authenticated;
