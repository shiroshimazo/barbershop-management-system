-- ============================================================================
-- Phase 13: admin service menu RPCs
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- ============================================================================

alter table public.services
  add column if not exists category text not null default 'Cuts',
  add column if not exists badge text not null default 'None',
  add column if not exists icon text not null default 'scis',
  add column if not exists deleted_at timestamptz;

update public.services
   set category = case
         when slug in ('classic-fade-beard') then 'Combo'
         when slug in ('beard-sculpt') then 'Beard'
         when slug in ('full-service') then 'Premium'
         when name ilike '%beard%' or name ilike '%shave%' then 'Beard'
         when name ilike '%full%' then 'Premium'
         else 'Cuts'
       end,
       badge = case
         when coalesce(tag, '') in ('Signature', 'Premium', 'Classic', 'New', 'Limited') then tag
         when slug in ('classic-fade-beard', 'skin-fade', 'beard-sculpt') then 'Signature'
         when slug in ('classic-cut') then 'Classic'
         when slug in ('full-service') then 'Premium'
         else 'None'
       end,
       icon = case
         when slug in ('beard-sculpt') then 'beard'
         when slug in ('full-service') then 'full'
         when slug in ('kids-cut') then 'kid'
         when name ilike '%towel%' then 'towel'
         when name ilike '%color%' then 'color'
         when name ilike '%buzz%' then 'buzz'
         else 'scis'
       end,
       tag = nullif(case
         when coalesce(tag, '') in ('Signature', 'Premium', 'Classic', 'New', 'Limited') then tag
         when slug in ('classic-fade-beard', 'skin-fade', 'beard-sculpt') then 'Signature'
         when slug in ('classic-cut') then 'Classic'
         when slug in ('full-service') then 'Premium'
         else ''
       end, '')
 where deleted_at is null;

alter table public.services
  drop constraint if exists services_category_check,
  drop constraint if exists services_badge_check,
  drop constraint if exists services_icon_check;

alter table public.services
  add constraint services_category_check
    check (category in ('Cuts', 'Beard', 'Combo', 'Premium', 'Add-ons')),
  add constraint services_badge_check
    check (badge in ('Signature', 'Premium', 'Classic', 'New', 'Limited', 'None')),
  add constraint services_icon_check
    check (icon in ('scis', 'beard', 'towel', 'raz', 'buzz', 'kid', 'full', 'color'));

create index if not exists services_admin_lookup_idx
  on public.services(deleted_at, active, category, display_order, name);

create or replace function public.get_admin_services(p_timezone text default 'Asia/Singapore')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_90_start timestamptz := ((((now() at time zone p_timezone)::date - 90)::timestamp) at time zone p_timezone);
  v_services jsonb := '[]'::jsonb;
  v_stats jsonb := '{}'::jsonb;
  v_category_counts jsonb := '{}'::jsonb;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  with base as (
    select
      s.*,
      'SVC-' ||
      case s.category
        when 'Cuts' then '1'
        when 'Beard' then '2'
        when 'Combo' then '3'
        when 'Premium' then '4'
        when 'Add-ons' then '5'
        else '9'
      end ||
      lpad((row_number() over (partition by s.category order by s.display_order, s.name))::text, 2, '0') as service_code,
      coalesce(metrics.bookings_90d, 0) as bookings_90d,
      coalesce(metrics.revenue_90d_cents, 0) as revenue_90d_cents
    from public.services s
    left join lateral (
      select
        (
          select count(*)::int
            from public.appointments a
           where a.scheduled_at >= v_90_start
             and a.status <> 'cancelled'
             and (a.service_id = s.id or lower(trim(a.service)) = lower(trim(s.name)))
        ) as bookings_90d,
        (
          coalesce((
            select sum(v.price_cents)::int
              from public.visits v
             where v.visited_at >= v_90_start
               and lower(trim(v.service)) = lower(trim(s.name))
          ), 0)
          +
          coalesce((
            select sum(w.price_cents)::int
              from public.walk_ins w
             where w.served_at >= v_90_start
               and w.status = 'served'
               and lower(trim(w.service)) = lower(trim(s.name))
          ), 0)
        ) as revenue_90d_cents
    ) metrics on true
    where s.deleted_at is null
  )
  select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', id,
        'code', service_code,
        'slug', slug,
        'name', name,
        'category', category,
        'priceCents', price_cents,
        'durationMinutes', duration_minutes,
        'description', coalesce(descriptor, ''),
        'badge', coalesce(badge, 'None'),
        'icon', coalesce(icon, 'scis'),
        'active', active,
        'displayOrder', display_order,
        'bookings90d', bookings_90d,
        'revenue90dCents', revenue_90d_cents
      )
      order by display_order, name
    ), '[]'::jsonb)
    into v_services
    from base;

  select coalesce(jsonb_object_agg(category, service_count), '{}'::jsonb)
    into v_category_counts
    from (
      select category, count(*)::int as service_count
        from public.services
       where deleted_at is null
       group by category
    ) counts;

  with base as (
    select
      s.*,
      coalesce(metrics.revenue_90d_cents, 0) as revenue_90d_cents
    from public.services s
    left join lateral (
      select
        (
          coalesce((
            select sum(v.price_cents)::int
              from public.visits v
             where v.visited_at >= v_90_start
               and lower(trim(v.service)) = lower(trim(s.name))
          ), 0)
          +
          coalesce((
            select sum(w.price_cents)::int
              from public.walk_ins w
             where w.served_at >= v_90_start
               and w.status = 'served'
               and lower(trim(w.service)) = lower(trim(s.name))
          ), 0)
        ) as revenue_90d_cents
    ) metrics on true
    where s.deleted_at is null
  )
  select jsonb_build_object(
      'totalCount', count(*)::int,
      'activeCount', count(*) filter (where active = true)::int,
      'archivedCount', count(*) filter (where active = false)::int,
      'signatureCount', count(*) filter (where badge = 'Signature')::int,
      'premiumCount', count(*) filter (where badge = 'Premium')::int,
      'avgTicketCents', coalesce(round(avg(price_cents) filter (where active = true))::int, 0),
      'avgDurationMinutes', coalesce(round(avg(duration_minutes) filter (where active = true))::int, 0),
      'totalRevenue90dCents', coalesce(sum(revenue_90d_cents), 0)::int,
      'categoryCounts', v_category_counts,
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
    'services', v_services,
    'stats', v_stats
  );
end;
$$;

revoke all on function public.get_admin_services(text) from public;
grant execute on function public.get_admin_services(text) to authenticated;

create or replace function public.admin_save_service(
  p_service_id uuid,
  p_name text,
  p_slug text,
  p_category text,
  p_price_cents int,
  p_duration_minutes int,
  p_description text,
  p_badge text,
  p_icon text,
  p_active boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service_id uuid := p_service_id;
  v_name text := nullif(trim(p_name), '');
  v_slug text := nullif(trim(lower(coalesce(p_slug, ''))), '');
  v_category text := coalesce(nullif(trim(p_category), ''), 'Cuts');
  v_badge text := coalesce(nullif(trim(p_badge), ''), 'None');
  v_icon text := coalesce(nullif(trim(p_icon), ''), 'scis');
  v_display_order int;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if v_name is null then
    raise exception 'Service name is required';
  end if;

  if v_category not in ('Cuts', 'Beard', 'Combo', 'Premium', 'Add-ons') then
    raise exception 'Invalid service category';
  end if;

  if v_badge not in ('Signature', 'Premium', 'Classic', 'New', 'Limited', 'None') then
    raise exception 'Invalid service badge';
  end if;

  if v_icon not in ('scis', 'beard', 'towel', 'raz', 'buzz', 'kid', 'full', 'color') then
    raise exception 'Invalid service icon';
  end if;

  if v_slug is null then
    v_slug := trim(both '-' from regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'));
  end if;

  if v_slug = '' then
    v_slug := 'service-' || left(replace(gen_random_uuid()::text, '-', ''), 6);
  end if;

  if v_service_id is null and exists (select 1 from public.services where slug = v_slug) then
    v_slug := v_slug || '-' || left(replace(gen_random_uuid()::text, '-', ''), 6);
  end if;

  if v_service_id is null then
    select coalesce(max(display_order), 0) + 1
      into v_display_order
      from public.services;

    insert into public.services (
      slug,
      name,
      price_cents,
      duration_minutes,
      descriptor,
      tag,
      active,
      display_order,
      category,
      badge,
      icon
    )
    values (
      v_slug,
      v_name,
      greatest(coalesce(p_price_cents, 0), 0),
      greatest(coalesce(p_duration_minutes, 1), 1),
      nullif(trim(coalesce(p_description, '')), ''),
      nullif(v_badge, 'None'),
      coalesce(p_active, true),
      v_display_order,
      v_category,
      v_badge,
      v_icon
    )
    returning id into v_service_id;
  else
    update public.services
       set slug = v_slug,
           name = v_name,
           price_cents = greatest(coalesce(p_price_cents, 0), 0),
           duration_minutes = greatest(coalesce(p_duration_minutes, 1), 1),
           descriptor = nullif(trim(coalesce(p_description, '')), ''),
           tag = nullif(v_badge, 'None'),
           active = coalesce(p_active, active),
           category = v_category,
           badge = v_badge,
           icon = v_icon
     where id = v_service_id
       and deleted_at is null;

    if not found then
      raise exception 'Service not found';
    end if;
  end if;

  return v_service_id;
end;
$$;

revoke all on function public.admin_save_service(uuid, text, text, text, int, int, text, text, text, boolean) from public;
grant execute on function public.admin_save_service(uuid, text, text, text, int, int, text, text, text, boolean) to authenticated;

create or replace function public.admin_set_service_active(p_service_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  update public.services
     set active = coalesce(p_active, active)
   where id = p_service_id
     and deleted_at is null;

  if not found then
    raise exception 'Service not found';
  end if;
end;
$$;

revoke all on function public.admin_set_service_active(uuid, boolean) from public;
grant execute on function public.admin_set_service_active(uuid, boolean) to authenticated;

create or replace function public.admin_delete_service(p_service_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  delete from public.services
   where id = p_service_id;

  if not found then
    raise exception 'Service not found';
  end if;
end;
$$;

revoke all on function public.admin_delete_service(uuid) from public;
grant execute on function public.admin_delete_service(uuid) to authenticated;
