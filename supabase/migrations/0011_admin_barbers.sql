-- ============================================================================
-- Phase 12: admin barber roster RPCs
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- ============================================================================

alter table public.barbers
  add column if not exists handle text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists tier text not null default 'Stylist'
    check (tier in ('Junior', 'Stylist', 'Senior', 'Master')),
  add column if not exists specialties text[] not null default '{}'::text[],
  add column if not exists signature_service text,
  add column if not exists bio text,
  add column if not exists archived_at timestamptz;

update public.barbers
   set handle = coalesce(handle, '@' || regexp_replace(lower(fullname), '[^a-z0-9]+', '', 'g')),
       email = coalesce(email, regexp_replace(lower(fullname), '[^a-z0-9]+', '', 'g') || '@bladeco.local'),
       tier = coalesce(
         tier,
         case
           when coalesce(years_experience, 0) >= 7 then 'Master'
           when coalesce(years_experience, 0) >= 5 then 'Senior'
           when coalesce(years_experience, 0) >= 2 then 'Stylist'
           else 'Junior'
         end
       ),
       specialties = case
         when cardinality(coalesce(specialties, '{}'::text[])) > 0 then specialties
         else array[coalesce(nullif(specialty, ''), 'Classic Cut')]
       end,
       signature_service = coalesce(
         signature_service,
         case
           when cardinality(coalesce(specialties, '{}'::text[])) > 0 then specialties[1]
           else coalesce(nullif(specialty, ''), 'Classic Cut')
         end
       )
 where archived_at is null;

create or replace function public.get_admin_barbers(p_timezone text default 'Asia/Singapore')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_local_now timestamp := now() at time zone p_timezone;
  v_today date := (now() at time zone p_timezone)::date;
  v_day_of_week int := extract(dow from (now() at time zone p_timezone)::date)::int;
  v_day_start timestamptz := ((now() at time zone p_timezone)::date::timestamp at time zone p_timezone);
  v_day_end timestamptz := ((((now() at time zone p_timezone)::date + 1)::timestamp) at time zone p_timezone);
  v_90_start timestamptz := ((((now() at time zone p_timezone)::date - 90)::timestamp) at time zone p_timezone);
  v_barbers jsonb := '[]'::jsonb;
  v_stats jsonb := '{}'::jsonb;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  with base as (
    select
      b.*,
      'BRB-' || lpad((row_number() over (order by b.created_at, b.fullname))::text, 2, '0') as barber_code,
      coalesce(m.bookings_90d, 0) as bookings_90d,
      coalesce(m.revenue_90d_cents, 0) as revenue_90d_cents,
      coalesce(m.clients_90d, 0) as clients_90d,
      coalesce(today.today_count, 0) as today_count,
      current_booking.ends_at as current_booking_ends_at,
      next_booking.scheduled_at as next_booking_at,
      exists (
        select 1
          from public.barber_availability ba
         where ba.barber_id = b.id
           and ba.day_of_week = v_day_of_week
           and ba.active = true
      ) as works_today
    from public.barbers b
    left join lateral (
      select
        (
          select count(*)::int
            from public.appointments a
           where a.barber_id = b.id
             and a.scheduled_at >= v_90_start
             and a.status <> 'cancelled'
        ) as bookings_90d,
        (
          coalesce((
            select sum(v.price_cents)::int
              from public.visits v
             where v.barber_id = b.id
               and v.visited_at >= v_90_start
          ), 0)
          +
          coalesce((
            select sum(w.price_cents)::int
              from public.walk_ins w
             where w.barber_id = b.id
               and w.served_at >= v_90_start
          ), 0)
        ) as revenue_90d_cents,
        (
          select count(distinct v.customer_id)::int
            from public.visits v
           where v.barber_id = b.id
             and v.visited_at >= v_90_start
        ) as clients_90d
    ) m on true
    left join lateral (
      select count(*)::int as today_count
        from public.appointments a
       where a.barber_id = b.id
         and a.scheduled_at >= v_day_start
         and a.scheduled_at < v_day_end
         and a.status in ('pending', 'scheduled', 'completed')
    ) today on true
    left join lateral (
      select a.scheduled_at + make_interval(mins => a.duration_minutes) as ends_at
        from public.appointments a
       where a.barber_id = b.id
         and a.status in ('pending', 'scheduled')
         and a.scheduled_at <= v_now
         and a.scheduled_at + make_interval(mins => a.duration_minutes) > v_now
       order by a.scheduled_at
       limit 1
    ) current_booking on true
    left join lateral (
      select a.scheduled_at
        from public.appointments a
       where a.barber_id = b.id
         and a.status in ('pending', 'scheduled')
         and a.scheduled_at > v_now
         and a.scheduled_at < v_day_end
       order by a.scheduled_at
       limit 1
    ) next_booking on true
    where b.archived_at is null
  )
  select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', id,
        'code', barber_code,
        'name', fullname,
        'initials', initials,
        'handle', coalesce(handle, '@' || regexp_replace(lower(fullname), '[^a-z0-9]+', '', 'g')),
        'email', email,
        'phone', phone,
        'location', coalesce(location, 'Downtown'),
        'tier', coalesce(tier, 'Stylist'),
        'yearsExperience', coalesce(years_experience, 0),
        'rating', coalesce(rating, 5.0),
        'reviews', coalesce(review_count, 0),
        'active', coalesce(active, false),
        'worksToday', works_today,
        'statusText', case
          when coalesce(active, false) = false then 'Off - not taking bookings'
          when current_booking_ends_at is not null then
            'In chair - until ' || to_char(current_booking_ends_at at time zone p_timezone, 'HH24:MI')
          when next_booking_at is not null then
            'Available - ' || to_char(next_booking_at at time zone p_timezone, 'HH24:MI') || ' next'
          else 'Available - walk-in OK'
        end,
        'specialties', case
          when cardinality(coalesce(specialties, '{}'::text[])) > 0 then to_jsonb(specialties)
          else to_jsonb(array[coalesce(nullif(specialty, ''), 'Classic Cut')])
        end,
        'signature', coalesce(signature_service, specialties[1], specialty, 'Classic Cut'),
        'bio', bio,
        'days', (
          select jsonb_agg(
            case
              when exists (
                select 1
                  from public.barber_availability ba
                 where ba.barber_id = base.id
                   and ba.day_of_week = d.db_day
                   and ba.active = true
              ) then 1 else 0
            end
            order by d.ord
          )
          from (values (1, 0), (2, 1), (3, 2), (4, 3), (5, 4), (6, 5), (0, 6)) as d(db_day, ord)
        ),
        'bookings90d', bookings_90d,
        'clients90d', clients_90d,
        'revenue90dCents', revenue_90d_cents,
        'todayCount', today_count,
        'completionRate', 100
      )
      order by active desc, fullname
    ), '[]'::jsonb)
    into v_barbers
    from base;

  with base as (
    select
      b.*,
      coalesce(m.bookings_90d, 0) as bookings_90d,
      coalesce(m.revenue_90d_cents, 0) as revenue_90d_cents
    from public.barbers b
    left join lateral (
      select
        (
          select count(*)::int
            from public.appointments a
           where a.barber_id = b.id
             and a.scheduled_at >= v_90_start
             and a.status <> 'cancelled'
        ) as bookings_90d,
        (
          coalesce((
            select sum(v.price_cents)::int
              from public.visits v
             where v.barber_id = b.id
               and v.visited_at >= v_90_start
          ), 0)
          +
          coalesce((
            select sum(w.price_cents)::int
              from public.walk_ins w
             where w.barber_id = b.id
               and w.served_at >= v_90_start
          ), 0)
        ) as revenue_90d_cents
    ) m on true
    where b.archived_at is null
  )
  select jsonb_build_object(
      'totalCount', count(*)::int,
      'onShiftCount', count(*) filter (where active = true)::int,
      'offCount', count(*) filter (where active = false)::int,
      'locationCount', count(distinct coalesce(location, 'Downtown'))::int,
      'downtownCount', count(*) filter (where coalesce(location, 'Downtown') = 'Downtown')::int,
      'eastsideCount', count(*) filter (where coalesce(location, 'Downtown') = 'Eastside')::int,
      'avgRating', coalesce(round(avg(rating)::numeric, 2), 0),
      'totalReviews', coalesce(sum(review_count), 0)::int,
      'bookings90d', coalesce(sum(bookings_90d), 0)::int,
      'revenue90dCents', coalesce(sum(revenue_90d_cents), 0)::int,
      'upcomingCount', (
        select count(*)::int
          from public.appointments a
         where a.scheduled_at >= v_now
           and a.status in ('pending', 'scheduled')
      )
    )
    into v_stats
    from base;

  return jsonb_build_object(
    'generatedAt', v_now,
    'barbers', v_barbers,
    'stats', v_stats
  );
end;
$$;

revoke all on function public.get_admin_barbers(text) from public;
grant execute on function public.get_admin_barbers(text) to authenticated;

create or replace function public.admin_save_barber(
  p_barber_id uuid,
  p_fullname text,
  p_handle text,
  p_email text,
  p_phone text,
  p_location text,
  p_tier text,
  p_years_experience int,
  p_specialties text[],
  p_signature_service text,
  p_days int[],
  p_active boolean,
  p_bio text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_barber_id uuid := p_barber_id;
  v_fullname text := nullif(trim(p_fullname), '');
  v_handle text := nullif(trim(p_handle), '');
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_location text := coalesce(nullif(trim(p_location), ''), 'Downtown');
  v_tier text := coalesce(nullif(trim(p_tier), ''), 'Stylist');
  v_specialties text[] := coalesce(p_specialties, '{}'::text[]);
  v_signature text;
  v_initials text;
  v_day int;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if v_fullname is null then
    raise exception 'Barber name is required';
  end if;

  if v_tier not in ('Junior', 'Stylist', 'Senior', 'Master') then
    raise exception 'Invalid barber tier';
  end if;

  if v_handle is null then
    v_handle := '@' || regexp_replace(lower(v_fullname), '[^a-z0-9]+', '', 'g');
  elsif left(v_handle, 1) <> '@' then
    v_handle := '@' || v_handle;
  end if;

  if cardinality(v_specialties) = 0 then
    v_specialties := array['Classic Cut'];
  end if;
  v_signature := coalesce(nullif(trim(p_signature_service), ''), v_specialties[1]);

  v_initials := upper(
    left(split_part(v_fullname, ' ', 1), 1) ||
    case
      when split_part(v_fullname, ' ', 2) <> '' then left(split_part(v_fullname, ' ', 2), 1)
      else substr(regexp_replace(v_fullname, '\s+', '', 'g'), 2, 1)
    end
  );

  if v_barber_id is null then
    insert into public.barbers (
      fullname, initials, handle, email, phone, location, tier,
      years_experience, specialty, specialties, signature_service, active, bio
    )
    values (
      v_fullname, v_initials, v_handle, v_email, nullif(trim(coalesce(p_phone, '')), ''),
      v_location, v_tier, greatest(coalesce(p_years_experience, 0), 0), v_signature,
      v_specialties, v_signature, coalesce(p_active, true), nullif(trim(coalesce(p_bio, '')), '')
    )
    returning id into v_barber_id;
  else
    update public.barbers
       set fullname = v_fullname,
           initials = v_initials,
           handle = v_handle,
           email = v_email,
           phone = nullif(trim(coalesce(p_phone, '')), ''),
           location = v_location,
           tier = v_tier,
           years_experience = greatest(coalesce(p_years_experience, 0), 0),
           specialty = v_signature,
           specialties = v_specialties,
           signature_service = v_signature,
           active = coalesce(p_active, active),
           bio = nullif(trim(coalesce(p_bio, '')), '')
     where id = v_barber_id
       and archived_at is null;

    if not found then
      raise exception 'Barber not found';
    end if;
  end if;

  update public.barber_availability
     set active = false
   where barber_id = v_barber_id;

  foreach v_day in array coalesce(p_days, '{}'::int[]) loop
    if v_day < 0 or v_day > 6 then
      raise exception 'Day of week must be between 0 and 6';
    end if;

    insert into public.barber_availability (
      barber_id, day_of_week, start_time, end_time, slot_step_minutes, active
    )
    values (v_barber_id, v_day, time '09:00', time '19:00', 15, true)
    on conflict (barber_id, day_of_week, start_time, end_time)
    do update set active = true,
                  slot_step_minutes = excluded.slot_step_minutes;
  end loop;

  return v_barber_id;
end;
$$;

revoke all on function public.admin_save_barber(uuid, text, text, text, text, text, text, int, text[], text, int[], boolean, text) from public;
grant execute on function public.admin_save_barber(uuid, text, text, text, text, text, text, int, text[], text, int[], boolean, text) to authenticated;

create or replace function public.admin_set_barber_active(p_barber_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  update public.barbers
     set active = coalesce(p_active, active)
   where id = p_barber_id
     and archived_at is null;

  if not found then
    raise exception 'Barber not found';
  end if;
end;
$$;

revoke all on function public.admin_set_barber_active(uuid, boolean) from public;
grant execute on function public.admin_set_barber_active(uuid, boolean) to authenticated;

create or replace function public.admin_archive_barber(p_barber_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  update public.barbers
     set active = false,
         archived_at = now()
   where id = p_barber_id
     and archived_at is null;

  if not found then
    raise exception 'Barber not found';
  end if;
end;
$$;

revoke all on function public.admin_archive_barber(uuid) from public;
grant execute on function public.admin_archive_barber(uuid) to authenticated;
