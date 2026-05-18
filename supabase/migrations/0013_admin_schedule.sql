-- ============================================================================
-- Phase 14: admin schedule calendar RPCs
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- ============================================================================

alter table public.appointments
  add column if not exists customer_name text,
  add column if not exists schedule_kind text;

alter table public.appointments
  alter column customer_id drop not null;

update public.appointments
   set schedule_kind = 'booked'
 where schedule_kind is null;

alter table public.appointments
  alter column schedule_kind set default 'booked',
  alter column schedule_kind set not null;

alter table public.appointments
  drop constraint if exists appointments_schedule_kind_check;

alter table public.appointments
  add constraint appointments_schedule_kind_check
  check (schedule_kind in ('booked', 'walkin', 'vip'));

alter table public.barber_time_off
  add column if not exists notes text;

create index if not exists appointments_schedule_lookup_idx
  on public.appointments(barber_id, scheduled_at, schedule_kind)
  where status in ('pending', 'scheduled', 'completed');

drop policy if exists "appointments_admin_insert" on public.appointments;
create policy "appointments_admin_insert"
  on public.appointments for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "appointments_admin_delete" on public.appointments;
create policy "appointments_admin_delete"
  on public.appointments for delete
  to authenticated
  using (public.is_admin());

create or replace function public.notify_appointment_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_barber_name text;
begin
  if new.customer_id is null then
    return new;
  end if;

  select fullname
    into v_barber_name
    from public.barbers
   where id = new.barber_id;

  insert into public.notifications (
    user_id, kind, title, body, is_unread, needs_action,
    when_at, who, where_at, actions, icon_variant, icon
  )
  values (
    new.customer_id,
    'booking',
    'Booking confirmed - ' || new.service,
    'You''re set for ' ||
      to_char(new.scheduled_at, 'Dy, Mon DD at FMHH12:MI AM') ||
      '. We''ll remind you before chair time.',
    true,
    false,
    new.scheduled_at,
    coalesce(v_barber_name, 'Your barber'),
    coalesce(new.location, 'Blade & Co.'),
    jsonb_build_array(
      jsonb_build_object('label', 'View appointment', 'kind', 'primary', 'target', 'appointments'),
      jsonb_build_object('label', 'Reschedule', 'kind', 'secondary', 'target', 'appointments')
    ),
    'gold',
    'calendar'
  );

  return new;
end;
$$;

create or replace function public.notify_appointment_cancelled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.customer_id is null then
    return new;
  end if;

  if old.status is distinct from 'cancelled' and new.status = 'cancelled' then
    insert into public.notifications (
      user_id, kind, title, body, is_unread,
      when_at, where_at, actions, icon_variant, icon
    )
    values (
      new.customer_id,
      'booking',
      'Booking cancelled - ' || new.service,
      'Your visit on ' || to_char(new.scheduled_at, 'Dy, Mon DD') ||
        ' was cancelled. You can rebook anytime.',
      true,
      new.scheduled_at,
      coalesce(new.location, 'Blade & Co.'),
      jsonb_build_array(
        jsonb_build_object('label', 'Book again', 'kind', 'primary', 'target', 'book')
      ),
      'warning',
      'calendar'
    );
  end if;

  return new;
end;
$$;

create or replace function public.get_admin_schedule_workspace(
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
  v_now timestamptz := now();
  v_anchor_date date := coalesce(p_anchor_date, (now() at time zone p_timezone)::date);
  v_range_start_date date;
  v_range_end_date date;
  v_range_start timestamptz;
  v_range_end timestamptz;
  v_day_of_week int;
  v_barbers jsonb := '[]'::jsonb;
  v_events jsonb := '[]'::jsonb;
  v_services jsonb := '[]'::jsonb;
  v_shifts jsonb := '[]'::jsonb;
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

  v_day_of_week := extract(dow from v_anchor_date)::int;
  v_range_start := (v_range_start_date::timestamp at time zone p_timezone);
  v_range_end := (v_range_end_date::timestamp at time zone p_timezone);

  select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', b.id,
        'code', coalesce(nullif(b.initials, ''), upper(left(b.fullname, 2))),
        'name', b.fullname,
        'loc', coalesce(b.location, 'Downtown'),
        'tier', coalesce(b.tier, b.specialty, 'Stylist'),
        'active', coalesce(b.active, false),
        'avail', coalesce(b.active, false) and shift_row.id is not null,
        'shift', jsonb_build_object(
          'start', coalesce(extract(hour from shift_row.start_time), 9)
            + coalesce(extract(minute from shift_row.start_time), 0) / 60.0,
          'end', coalesce(extract(hour from shift_row.end_time), 18)
            + coalesce(extract(minute from shift_row.end_time), 0) / 60.0,
          'label', case
            when shift_row.id is null then 'Off'
            else to_char(shift_row.start_time, 'FMHH12:MI AM') || ' - ' ||
                 to_char(shift_row.end_time, 'FMHH12:MI AM')
          end
        )
      )
      order by coalesce(b.active, false) desc, coalesce(b.location, 'Downtown'), b.fullname
    ), '[]'::jsonb)
    into v_barbers
    from public.barbers b
    left join lateral (
      select ba.id, ba.start_time, ba.end_time
        from public.barber_availability ba
       where ba.barber_id = b.id
         and ba.day_of_week = v_day_of_week
         and ba.active = true
       order by ba.start_time
       limit 1
    ) shift_row on true
   where b.archived_at is null;

  select coalesce(jsonb_agg(row_payload order by sort_at, barber_name, kind_order), '[]'::jsonb)
    into v_events
    from (
      select
        a.scheduled_at as sort_at,
        b.fullname as barber_name,
        1 as kind_order,
        jsonb_build_object(
          'id', a.id,
          'source', 'appointment',
          'barber', a.barber_id,
          'barberName', b.fullname,
          'date', to_char(a.scheduled_at at time zone p_timezone, 'YYYY-MM-DD'),
          'startAt', a.scheduled_at,
          'endAt', a.scheduled_at + make_interval(mins => a.duration_minutes),
          'start', extract(hour from (a.scheduled_at at time zone p_timezone))
            + extract(minute from (a.scheduled_at at time zone p_timezone)) / 60.0,
          'end', extract(hour from ((a.scheduled_at + make_interval(mins => a.duration_minutes)) at time zone p_timezone))
            + extract(minute from ((a.scheduled_at + make_interval(mins => a.duration_minutes)) at time zone p_timezone)) / 60.0,
          'kind', case
            when coalesce(a.schedule_kind, 'booked') = 'booked' and lower(coalesce(c.tier, '')) = 'platinum'
              then 'vip'
            else coalesce(a.schedule_kind, 'booked')
          end,
          'client', coalesce(nullif(a.customer_name, ''), c.fullname, 'Guest customer'),
          'service', a.service,
          'priceCents', coalesce(a.price_cents, 0),
          'price', round(coalesce(a.price_cents, 0) / 100.0, 2),
          'durationMinutes', a.duration_minutes,
          'status', a.status,
          'notes', a.notes
        ) as row_payload
      from public.appointments a
      join public.barbers b on b.id = a.barber_id
      left join public.customers c on c.id = a.customer_id
      where a.scheduled_at < v_range_end
        and a.scheduled_at + make_interval(mins => a.duration_minutes) > v_range_start
        and a.status in ('pending', 'scheduled', 'completed')
        and (p_barber_id is null or a.barber_id = p_barber_id)

      union all

      select
        t.starts_at as sort_at,
        b.fullname as barber_name,
        2 as kind_order,
        jsonb_build_object(
          'id', t.id,
          'source', 'block',
          'barber', t.barber_id,
          'barberName', b.fullname,
          'date', to_char(t.starts_at at time zone p_timezone, 'YYYY-MM-DD'),
          'startAt', t.starts_at,
          'endAt', t.ends_at,
          'start', extract(hour from (t.starts_at at time zone p_timezone))
            + extract(minute from (t.starts_at at time zone p_timezone)) / 60.0,
          'end', extract(hour from (t.ends_at at time zone p_timezone))
            + extract(minute from (t.ends_at at time zone p_timezone)) / 60.0,
          'kind', 'block',
          'client', '',
          'service', coalesce(nullif(t.reason, ''), 'Blocked time'),
          'priceCents', 0,
          'price', 0,
          'durationMinutes', greatest(5, extract(epoch from (t.ends_at - t.starts_at))::int / 60),
          'status', 'blocked',
          'notes', t.notes
        ) as row_payload
      from public.barber_time_off t
      join public.barbers b on b.id = t.barber_id
      where t.starts_at < v_range_end
        and t.ends_at > v_range_start
        and (p_barber_id is null or t.barber_id = p_barber_id)
    ) rows;

  select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'name', s.name,
        'priceCents', s.price_cents,
        'durationMinutes', s.duration_minutes,
        'category', coalesce(s.category, 'Cuts')
      )
      order by s.display_order, s.name
    ), '[]'::jsonb)
    into v_services
    from public.services s
   where s.active = true
     and s.deleted_at is null;

  select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', ba.id,
        'barberId', ba.barber_id,
        'dayOfWeek', ba.day_of_week,
        'startTime', to_char(ba.start_time, 'HH24:MI'),
        'endTime', to_char(ba.end_time, 'HH24:MI'),
        'slotStepMinutes', ba.slot_step_minutes,
        'active', ba.active
      )
      order by ba.day_of_week, ba.start_time
    ), '[]'::jsonb)
    into v_shifts
    from public.barber_availability ba
   where p_barber_id is null or ba.barber_id = p_barber_id;

  return jsonb_build_object(
    'generatedAt', v_now,
    'anchorDate', v_anchor_date,
    'rangeStart', v_range_start,
    'rangeEnd', v_range_end,
    'barbers', v_barbers,
    'events', v_events,
    'services', v_services,
    'shifts', v_shifts,
    'stats', jsonb_build_object(
      'upcomingCount', (
        select count(*)::int
          from public.appointments a
         where a.scheduled_at >= v_now
           and a.status in ('pending', 'scheduled')
      )
    )
  );
end;
$$;

revoke all on function public.get_admin_schedule_workspace(date, text, uuid, text) from public;
grant execute on function public.get_admin_schedule_workspace(date, text, uuid, text) to authenticated;

create or replace function public.admin_save_schedule_appointment(
  p_appointment_id uuid,
  p_barber_id uuid,
  p_customer_name text,
  p_service text,
  p_scheduled_at timestamptz,
  p_duration_minutes int,
  p_price_cents int,
  p_kind text,
  p_notes text default null,
  p_timezone text default 'Asia/Singapore'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appointment_id uuid := p_appointment_id;
  v_kind text := coalesce(nullif(trim(p_kind), ''), 'booked');
  v_customer_name text := nullif(trim(coalesce(p_customer_name, '')), '');
  v_service text := coalesce(nullif(trim(p_service), ''), 'Classic Cut');
  v_duration int := greatest(coalesce(p_duration_minutes, 45), 5);
  v_ends_at timestamptz := p_scheduled_at + make_interval(mins => greatest(coalesce(p_duration_minutes, 45), 5));
  v_local_date date := (p_scheduled_at at time zone p_timezone)::date;
  v_local_start time := (p_scheduled_at at time zone p_timezone)::time;
  v_local_end time := ((p_scheduled_at + make_interval(mins => greatest(coalesce(p_duration_minutes, 45), 5))) at time zone p_timezone)::time;
  v_location text;
  v_service_id uuid;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if v_kind not in ('booked', 'walkin', 'vip') then
    raise exception 'Unsupported schedule entry type';
  end if;

  if v_customer_name is null then
    raise exception 'Customer name required';
  end if;

  if v_local_start >= v_local_end then
    raise exception 'Booking must end after it starts';
  end if;

  select coalesce(location, 'Downtown')
    into v_location
    from public.barbers
   where id = p_barber_id
     and active = true;

  if not found then
    raise exception 'Barber is not active';
  end if;

  if not exists (
    select 1
      from public.barber_availability ba
     where ba.barber_id = p_barber_id
       and ba.active = true
       and ba.day_of_week = extract(dow from v_local_date)::int
       and v_local_start >= ba.start_time
       and v_local_end <= ba.end_time
  ) then
    raise exception 'Selected time is outside this barber''s shift';
  end if;

  if exists (
    select 1
      from public.barber_time_off t
     where t.barber_id = p_barber_id
       and tstzrange(t.starts_at, t.ends_at, '[)') && tstzrange(p_scheduled_at, v_ends_at, '[)')
  ) then
    raise exception 'Selected time overlaps blocked time off';
  end if;

  if exists (
    select 1
      from public.appointments a
     where a.id <> coalesce(v_appointment_id, '00000000-0000-0000-0000-000000000000'::uuid)
       and a.barber_id = p_barber_id
       and a.status in ('pending', 'scheduled')
       and tstzrange(
             a.scheduled_at,
             a.scheduled_at + make_interval(mins => a.duration_minutes),
             '[)'
           ) && tstzrange(p_scheduled_at, v_ends_at, '[)')
  ) then
    raise exception 'Selected time overlaps another booking';
  end if;

  select id
    into v_service_id
    from public.services
   where active = true
     and lower(trim(name)) = lower(trim(v_service))
   order by display_order, name
   limit 1;

  if v_appointment_id is null then
    insert into public.appointments (
      customer_id,
      customer_name,
      barber_id,
      service_id,
      service,
      scheduled_at,
      duration_minutes,
      location,
      price_cents,
      status,
      notes,
      schedule_kind
    )
    values (
      null,
      v_customer_name,
      p_barber_id,
      v_service_id,
      v_service,
      p_scheduled_at,
      v_duration,
      v_location,
      greatest(coalesce(p_price_cents, 0), 0),
      'scheduled',
      nullif(trim(coalesce(p_notes, '')), ''),
      v_kind
    )
    returning id into v_appointment_id;
  else
    update public.appointments
       set customer_name = v_customer_name,
           barber_id = p_barber_id,
           service_id = v_service_id,
           service = v_service,
           scheduled_at = p_scheduled_at,
           duration_minutes = v_duration,
           location = v_location,
           price_cents = greatest(coalesce(p_price_cents, 0), 0),
           notes = nullif(trim(coalesce(p_notes, '')), ''),
           schedule_kind = v_kind,
           status = case when status = 'cancelled' then 'scheduled' else status end
     where id = v_appointment_id;

    if not found then
      raise exception 'Schedule booking not found';
    end if;
  end if;

  return v_appointment_id;
end;
$$;

revoke all on function public.admin_save_schedule_appointment(uuid, uuid, text, text, timestamptz, int, int, text, text, text) from public;
grant execute on function public.admin_save_schedule_appointment(uuid, uuid, text, text, timestamptz, int, int, text, text, text) to authenticated;

create or replace function public.admin_save_schedule_block(
  p_block_id uuid,
  p_barber_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_reason text,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_block_id uuid := p_block_id;
  v_reason text := coalesce(nullif(trim(p_reason), ''), 'Blocked time');
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_starts_at >= p_ends_at then
    raise exception 'Time block must end after it starts';
  end if;

  if not exists (select 1 from public.barbers where id = p_barber_id and active = true) then
    raise exception 'Barber is not active';
  end if;

  if exists (
    select 1
      from public.appointments a
     where a.barber_id = p_barber_id
       and a.status in ('pending', 'scheduled')
       and tstzrange(
             a.scheduled_at,
             a.scheduled_at + make_interval(mins => a.duration_minutes),
             '[)'
           ) && tstzrange(p_starts_at, p_ends_at, '[)')
  ) then
    raise exception 'Time block overlaps a booking';
  end if;

  if v_block_id is null then
    insert into public.barber_time_off (barber_id, starts_at, ends_at, reason, notes)
    values (p_barber_id, p_starts_at, p_ends_at, v_reason, nullif(trim(coalesce(p_notes, '')), ''))
    returning id into v_block_id;
  else
    update public.barber_time_off
       set barber_id = p_barber_id,
           starts_at = p_starts_at,
           ends_at = p_ends_at,
           reason = v_reason,
           notes = nullif(trim(coalesce(p_notes, '')), '')
     where id = v_block_id;

    if not found then
      raise exception 'Time block not found';
    end if;
  end if;

  return v_block_id;
end;
$$;

revoke all on function public.admin_save_schedule_block(uuid, uuid, timestamptz, timestamptz, text, text) from public;
grant execute on function public.admin_save_schedule_block(uuid, uuid, timestamptz, timestamptz, text, text) to authenticated;

create or replace function public.admin_delete_schedule_event(
  p_event_id uuid,
  p_event_type text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if lower(coalesce(p_event_type, 'appointment')) = 'block' then
    delete from public.barber_time_off
     where id = p_event_id;
  else
    delete from public.appointments
     where id = p_event_id;
  end if;

  if not found then
    raise exception 'Schedule entry not found';
  end if;
end;
$$;

revoke all on function public.admin_delete_schedule_event(uuid, text) from public;
grant execute on function public.admin_delete_schedule_event(uuid, text) to authenticated;
