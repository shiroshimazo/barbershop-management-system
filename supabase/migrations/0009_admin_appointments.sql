-- ============================================================================
-- Phase 10: admin appointment operations, calendar, time off, and shifts
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- ============================================================================

alter table public.appointments
  drop constraint if exists appointments_status_check;

alter table public.appointments
  add constraint appointments_status_check
  check (status in ('pending', 'scheduled', 'completed', 'cancelled', 'no_show'));

drop policy if exists "appointments_admin_update" on public.appointments;
create policy "appointments_admin_update"
  on public.appointments for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.admin_validate_appointment_slot(
  p_appointment_id uuid,
  p_barber_id uuid,
  p_starts_at timestamptz,
  p_duration_minutes int,
  p_timezone text default 'Asia/Singapore'
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_duration int := greatest(coalesce(p_duration_minutes, 45), 5);
  v_ends_at timestamptz := p_starts_at + make_interval(mins => greatest(coalesce(p_duration_minutes, 45), 5));
  v_local_date date := (p_starts_at at time zone p_timezone)::date;
  v_local_start time := (p_starts_at at time zone p_timezone)::time;
  v_local_end time := ((p_starts_at + make_interval(mins => greatest(coalesce(p_duration_minutes, 45), 5))) at time zone p_timezone)::time;
begin
  if p_starts_at <= now() then
    return 'Selected time has already passed';
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
    return 'Selected time is outside this barber''s shift';
  end if;

  if exists (
    select 1
      from public.barber_time_off t
     where t.barber_id = p_barber_id
       and tstzrange(t.starts_at, t.ends_at, '[)') && tstzrange(p_starts_at, v_ends_at, '[)')
  ) then
    return 'Selected time overlaps blocked time off';
  end if;

  if exists (
    select 1
      from public.appointments a
     where a.id <> p_appointment_id
       and a.barber_id = p_barber_id
       and a.status in ('pending', 'scheduled')
       and tstzrange(
             a.scheduled_at,
             a.scheduled_at + make_interval(mins => a.duration_minutes),
             '[)'
           ) && tstzrange(p_starts_at, v_ends_at, '[)')
  ) then
    return 'Selected time overlaps another booking';
  end if;

  return null;
end;
$$;

revoke all on function public.admin_validate_appointment_slot(uuid, uuid, timestamptz, int, text) from public;

create or replace function public.get_admin_appointment_workspace(
  p_anchor_date date default null,
  p_view text default 'day',
  p_barber_id uuid default null,
  p_timezone text default 'Asia/Singapore'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_anchor_date date := coalesce(p_anchor_date, (now() at time zone p_timezone)::date);
  v_range_start_date date;
  v_range_end_date date;
  v_range_start timestamptz;
  v_range_end timestamptz;
  v_bookings jsonb := '[]'::jsonb;
  v_calendar jsonb := '[]'::jsonb;
  v_barbers jsonb := '[]'::jsonb;
  v_shifts jsonb := '[]'::jsonb;
  v_time_off jsonb := '[]'::jsonb;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if lower(coalesce(p_view, 'day')) = 'week' then
    v_range_start_date := date_trunc('week', v_anchor_date::timestamp)::date;
    v_range_end_date := v_range_start_date + 7;
  else
    v_range_start_date := v_anchor_date;
    v_range_end_date := v_anchor_date + 1;
  end if;

  v_range_start := (v_range_start_date::timestamp at time zone p_timezone);
  v_range_end := (v_range_end_date::timestamp at time zone p_timezone);

  select coalesce(jsonb_agg(row_payload order by sort_at), '[]'::jsonb)
    into v_bookings
    from (
      select
        a.scheduled_at as sort_at,
        jsonb_build_object(
          'id', a.id,
          'customerId', a.customer_id,
          'customerName', c.fullname,
          'customerEmail', c.email,
          'barberId', a.barber_id,
          'barberName', b.fullname,
          'service', a.service,
          'scheduledAt', a.scheduled_at,
          'durationMinutes', a.duration_minutes,
          'status', a.status,
          'priceCents', a.price_cents,
          'location', coalesce(a.location, b.location),
          'notes', a.notes
        ) as row_payload
      from public.appointments a
      left join public.customers c on c.id = a.customer_id
      left join public.barbers b on b.id = a.barber_id
      where a.status in ('pending', 'scheduled', 'cancelled')
        and a.scheduled_at >= now() - interval '30 days'
      order by
        case
          when a.status = 'pending' then 0
          when a.status = 'scheduled' then 1
          else 2
        end,
        a.scheduled_at
      limit 120
    ) rows;

  select coalesce(jsonb_agg(row_payload order by scheduled_at), '[]'::jsonb)
    into v_calendar
    from (
      select
        a.scheduled_at,
        jsonb_build_object(
          'id', a.id,
          'customerName', c.fullname,
          'barberId', a.barber_id,
          'barberName', b.fullname,
          'service', a.service,
          'scheduledAt', a.scheduled_at,
          'durationMinutes', a.duration_minutes,
          'status', a.status
        ) as row_payload
      from public.appointments a
      left join public.customers c on c.id = a.customer_id
      left join public.barbers b on b.id = a.barber_id
      where a.scheduled_at >= v_range_start
        and a.scheduled_at < v_range_end
        and a.status in ('pending', 'scheduled', 'cancelled')
        and (p_barber_id is null or a.barber_id = p_barber_id)
    ) rows;

  select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', b.id,
        'name', b.fullname,
        'initials', b.initials,
        'specialty', b.specialty,
        'location', b.location
      )
      order by b.fullname
    ), '[]'::jsonb)
    into v_barbers
    from public.barbers b
   where b.active = true;

  select coalesce(jsonb_agg(row_payload order by barber_name, day_of_week, start_time), '[]'::jsonb)
    into v_shifts
    from (
      select
        b.fullname as barber_name,
        ba.day_of_week,
        ba.start_time,
        jsonb_build_object(
          'id', ba.id,
          'barberId', ba.barber_id,
          'barberName', b.fullname,
          'dayOfWeek', ba.day_of_week,
          'startTime', to_char(ba.start_time, 'HH24:MI'),
          'endTime', to_char(ba.end_time, 'HH24:MI'),
          'slotStepMinutes', ba.slot_step_minutes,
          'active', ba.active
        ) as row_payload
      from public.barber_availability ba
      join public.barbers b on b.id = ba.barber_id
      where (p_barber_id is null or ba.barber_id = p_barber_id)
    ) rows;

  select coalesce(jsonb_agg(row_payload order by starts_at), '[]'::jsonb)
    into v_time_off
    from (
      select
        t.starts_at,
        jsonb_build_object(
          'id', t.id,
          'barberId', t.barber_id,
          'barberName', b.fullname,
          'startsAt', t.starts_at,
          'endsAt', t.ends_at,
          'reason', t.reason
        ) as row_payload
      from public.barber_time_off t
      left join public.barbers b on b.id = t.barber_id
      where t.ends_at > v_range_start
        and t.starts_at < v_range_end
        and (p_barber_id is null or t.barber_id = p_barber_id)
    ) rows;

  return jsonb_build_object(
    'anchorDate', v_anchor_date,
    'view', lower(coalesce(p_view, 'day')),
    'rangeStart', v_range_start,
    'rangeEnd', v_range_end,
    'bookings', v_bookings,
    'calendarBookings', v_calendar,
    'barbers', v_barbers,
    'shifts', v_shifts,
    'timeOff', v_time_off
  );
end;
$$;

revoke all on function public.get_admin_appointment_workspace(date, text, uuid, text) from public;
grant execute on function public.get_admin_appointment_workspace(date, text, uuid, text) to authenticated;

create or replace function public.admin_update_appointment_status(
  p_appointment_id uuid,
  p_status text,
  p_timezone text default 'Asia/Singapore'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appointment public.appointments%rowtype;
  v_reason text;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_status not in ('pending', 'scheduled', 'completed', 'cancelled', 'no_show') then
    raise exception 'Unsupported appointment status';
  end if;

  select * into v_appointment
    from public.appointments
   where id = p_appointment_id
   for update;

  if not found then
    raise exception 'Appointment not found';
  end if;

  if p_status in ('pending', 'scheduled') then
    v_reason := public.admin_validate_appointment_slot(
      p_appointment_id,
      v_appointment.barber_id,
      v_appointment.scheduled_at,
      v_appointment.duration_minutes,
      p_timezone
    );

    if v_reason is not null then
      raise exception '%', v_reason;
    end if;
  end if;

  update public.appointments
     set status = p_status
   where id = p_appointment_id;
end;
$$;

revoke all on function public.admin_update_appointment_status(uuid, text, text) from public;
grant execute on function public.admin_update_appointment_status(uuid, text, text) to authenticated;

create or replace function public.admin_reschedule_appointment(
  p_appointment_id uuid,
  p_scheduled_at timestamptz,
  p_duration_minutes int default null,
  p_timezone text default 'Asia/Singapore'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appointment public.appointments%rowtype;
  v_duration int;
  v_reason text;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  select * into v_appointment
    from public.appointments
   where id = p_appointment_id
   for update;

  if not found then
    raise exception 'Appointment not found';
  end if;

  v_duration := greatest(coalesce(p_duration_minutes, v_appointment.duration_minutes, 45), 5);
  v_reason := public.admin_validate_appointment_slot(
    p_appointment_id,
    v_appointment.barber_id,
    p_scheduled_at,
    v_duration,
    p_timezone
  );

  if v_reason is not null then
    raise exception '%', v_reason;
  end if;

  update public.appointments
     set scheduled_at = p_scheduled_at,
         duration_minutes = v_duration,
         status = 'scheduled'
   where id = p_appointment_id;
end;
$$;

revoke all on function public.admin_reschedule_appointment(uuid, timestamptz, int, text) from public;
grant execute on function public.admin_reschedule_appointment(uuid, timestamptz, int, text) to authenticated;

create or replace function public.admin_create_barber_time_off(
  p_barber_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_time_off_id uuid;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_starts_at >= p_ends_at then
    raise exception 'Time off must end after it starts';
  end if;

  insert into public.barber_time_off (barber_id, starts_at, ends_at, reason)
  values (p_barber_id, p_starts_at, p_ends_at, nullif(trim(p_reason), ''))
  returning id into v_time_off_id;

  return v_time_off_id;
end;
$$;

revoke all on function public.admin_create_barber_time_off(uuid, timestamptz, timestamptz, text) from public;
grant execute on function public.admin_create_barber_time_off(uuid, timestamptz, timestamptz, text) to authenticated;

create or replace function public.admin_save_barber_shift(
  p_barber_id uuid,
  p_day_of_week int,
  p_start_time time,
  p_end_time time,
  p_active boolean default true,
  p_slot_step_minutes int default 15
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shift_id uuid;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_day_of_week < 0 or p_day_of_week > 6 then
    raise exception 'Day of week must be between 0 and 6';
  end if;

  if p_start_time >= p_end_time then
    raise exception 'Shift must end after it starts';
  end if;

  if p_active then
    update public.barber_availability
       set active = false
     where barber_id = p_barber_id
       and day_of_week = p_day_of_week;
  end if;

  insert into public.barber_availability (
    barber_id,
    day_of_week,
    start_time,
    end_time,
    slot_step_minutes,
    active
  )
  values (
    p_barber_id,
    p_day_of_week,
    p_start_time,
    p_end_time,
    greatest(coalesce(p_slot_step_minutes, 15), 5),
    p_active
  )
  on conflict (barber_id, day_of_week, start_time, end_time)
  do update set
    slot_step_minutes = excluded.slot_step_minutes,
    active = excluded.active
  returning id into v_shift_id;

  return v_shift_id;
end;
$$;

revoke all on function public.admin_save_barber_shift(uuid, int, time, time, boolean, int) from public;
grant execute on function public.admin_save_barber_shift(uuid, int, time, time, boolean, int) to authenticated;
