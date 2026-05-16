-- ============================================================================
-- Phase 11: admin customer list RPCs
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- ============================================================================

create or replace function public.get_admin_customers()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customers jsonb := '[]'::jsonb;
  v_stats jsonb := '{}'::jsonb;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  with base as (
    select
      c.id,
      c.fullname,
      c.email,
      c.phone,
      c.tier,
      c.loyalty_points,
      c.member_since,
      coalesce(v.visit_count, 0) as visit_count,
      coalesce(v.lifetime_cents, 0) as lifetime_cents,
      last_visit.visited_at as last_visit_at,
      last_visit.barber_name as last_barber_name,
      case
        when c.tier = 'silver' then greatest(500 - c.loyalty_points, 0)
        when c.tier = 'gold' then greatest(1500 - c.loyalty_points, 0)
        else greatest(3000 - c.loyalty_points, 0)
      end as points_to_next,
      case
        when c.tier = 'silver' then 'Gold'
        when c.tier = 'gold' then 'Platinum'
        else 'next perk'
      end as next_milestone
    from public.customers c
    left join lateral (
      select count(*)::int as visit_count,
             coalesce(sum(price_cents), 0)::int as lifetime_cents
        from public.visits v
       where v.customer_id = c.id
    ) v on true
    left join lateral (
      select v.visited_at,
             b.fullname as barber_name
        from public.visits v
        left join public.barbers b on b.id = v.barber_id
       where v.customer_id = c.id
       order by v.visited_at desc
       limit 1
    ) last_visit on true
    where coalesce(c.role, 'customer') = 'customer'
  )
  select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', id,
        'customerCode', 'CST-' || upper(right(replace(id::text, '-', ''), 4)),
        'name', fullname,
        'email', email,
        'phone', phone,
        'tier', case when tier = 'silver' then 'standard' else tier end,
        'rawTier', tier,
        'joinedAt', member_since,
        'visitCount', visit_count,
        'lifetimeCents', lifetime_cents,
        'loyaltyPoints', loyalty_points,
        'pointsToNext', points_to_next,
        'nextMilestone', next_milestone,
        'lastVisitAt', last_visit_at,
        'lastBarberName', last_barber_name
      )
      order by loyalty_points desc, fullname
    ), '[]'::jsonb)
    into v_customers
    from base;

  with base as (
    select
      c.id,
      c.tier,
      c.loyalty_points,
      c.member_since,
      case
        when c.tier = 'silver' then greatest(500 - c.loyalty_points, 0)
        when c.tier = 'gold' then greatest(1500 - c.loyalty_points, 0)
        else greatest(3000 - c.loyalty_points, 0)
      end as points_to_next
    from public.customers c
    where coalesce(c.role, 'customer') = 'customer'
  )
  select jsonb_build_object(
      'totalCount', count(*)::int,
      'newThisMonth', count(*) filter (
        where member_since >= date_trunc('month', now())
      )::int,
      'standardCount', count(*) filter (where tier = 'silver')::int,
      'goldCount', count(*) filter (where tier = 'gold')::int,
      'platinumCount', count(*) filter (where tier = 'platinum')::int,
      'pointsInCirculation', coalesce(sum(loyalty_points), 0)::int,
      'pointsTrendPct', 0,
      'nearTierUpCount', count(*) filter (where points_to_next < 100)::int
    )
    into v_stats
    from base;

  return jsonb_build_object(
    'generatedAt', now(),
    'customers', v_customers,
    'stats', v_stats
  );
end;
$$;

revoke all on function public.get_admin_customers() from public;
grant execute on function public.get_admin_customers() to authenticated;

create or replace function public.admin_update_customer(
  p_customer_id uuid,
  p_fullname text,
  p_email text,
  p_phone text,
  p_tier text,
  p_loyalty_points int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fullname text := nullif(trim(p_fullname), '');
  v_email text := nullif(lower(trim(p_email)), '');
  v_tier text := coalesce(nullif(trim(p_tier), ''), 'silver');
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if v_fullname is null then
    raise exception 'Customer name is required';
  end if;

  if v_email is null then
    raise exception 'Customer email is required';
  end if;

  if v_tier not in ('silver', 'gold', 'platinum') then
    raise exception 'Invalid customer tier';
  end if;

  update public.customers
     set fullname = v_fullname,
         email = v_email,
         phone = nullif(trim(coalesce(p_phone, '')), ''),
         tier = v_tier,
         loyalty_points = greatest(coalesce(p_loyalty_points, 0), 0),
         updated_at = now()
   where id = p_customer_id
     and coalesce(role, 'customer') = 'customer';

  if not found then
    raise exception 'Customer not found';
  end if;
end;
$$;

revoke all on function public.admin_update_customer(uuid, text, text, text, text, int) from public;
grant execute on function public.admin_update_customer(uuid, text, text, text, text, int) to authenticated;

create or replace function public.admin_delete_customer(p_customer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  delete from public.customers
   where id = p_customer_id
     and coalesce(role, 'customer') = 'customer';

  if not found then
    raise exception 'Customer not found';
  end if;
end;
$$;

revoke all on function public.admin_delete_customer(uuid) from public;
grant execute on function public.admin_delete_customer(uuid) to authenticated;
