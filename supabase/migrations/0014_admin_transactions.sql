-- ============================================================================
-- Phase 14: admin transactions ledger
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- ============================================================================

alter table public.visits
  add column if not exists tip_cents int not null default 0,
  add column if not exists discount_cents int not null default 0,
  add column if not exists discount_type text,
  add column if not exists tax_cents int not null default 0,
  add column if not exists payment_method text not null default 'card',
  add column if not exists card_label text,
  add column if not exists transaction_status text not null default 'completed',
  add column if not exists refund_reason text,
  add column if not exists loyalty_points_added int not null default 0;

alter table public.walk_ins
  add column if not exists location text,
  add column if not exists tip_cents int not null default 0,
  add column if not exists discount_cents int not null default 0,
  add column if not exists discount_type text,
  add column if not exists tax_cents int not null default 0,
  add column if not exists payment_method text not null default 'cash',
  add column if not exists card_label text,
  add column if not exists transaction_status text not null default 'completed',
  add column if not exists refund_reason text,
  add column if not exists loyalty_points_added int not null default 0;

alter table public.visits
  drop constraint if exists visits_tip_cents_nonnegative,
  drop constraint if exists visits_discount_cents_nonnegative,
  drop constraint if exists visits_tax_cents_nonnegative,
  drop constraint if exists visits_payment_method_check,
  drop constraint if exists visits_transaction_status_check,
  drop constraint if exists visits_loyalty_points_added_nonnegative;

alter table public.visits
  add constraint visits_tip_cents_nonnegative check (tip_cents >= 0),
  add constraint visits_discount_cents_nonnegative check (discount_cents >= 0),
  add constraint visits_tax_cents_nonnegative check (tax_cents >= 0),
  add constraint visits_payment_method_check check (payment_method in ('card', 'cash', 'split')),
  add constraint visits_transaction_status_check check (transaction_status in ('completed', 'refunded', 'pending')),
  add constraint visits_loyalty_points_added_nonnegative check (loyalty_points_added >= 0);

alter table public.walk_ins
  drop constraint if exists walk_ins_tip_cents_nonnegative,
  drop constraint if exists walk_ins_discount_cents_nonnegative,
  drop constraint if exists walk_ins_tax_cents_nonnegative,
  drop constraint if exists walk_ins_payment_method_check,
  drop constraint if exists walk_ins_transaction_status_check,
  drop constraint if exists walk_ins_loyalty_points_added_nonnegative;

alter table public.walk_ins
  add constraint walk_ins_tip_cents_nonnegative check (tip_cents >= 0),
  add constraint walk_ins_discount_cents_nonnegative check (discount_cents >= 0),
  add constraint walk_ins_tax_cents_nonnegative check (tax_cents >= 0),
  add constraint walk_ins_payment_method_check check (payment_method in ('card', 'cash', 'split')),
  add constraint walk_ins_transaction_status_check check (transaction_status in ('completed', 'refunded', 'pending')),
  add constraint walk_ins_loyalty_points_added_nonnegative check (loyalty_points_added >= 0);

create index if not exists visits_admin_transactions_idx
  on public.visits(visited_at desc, transaction_status);

create index if not exists walk_ins_admin_transactions_idx
  on public.walk_ins(served_at desc, transaction_status);

update public.visits v
   set loyalty_points_added = greatest(round(v.price_cents::numeric / 100), 0)::int
  from public.customers c
 where c.id = v.customer_id
   and v.loyalty_points_added = 0
   and v.transaction_status = 'completed';

update public.walk_ins
   set transaction_status = 'refunded',
       refund_reason = coalesce(refund_reason, 'Walk-in cancelled')
 where status = 'cancelled'
   and transaction_status <> 'refunded';

create or replace function public.get_admin_transactions(p_timezone text default 'Asia/Singapore')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_transactions jsonb := '[]'::jsonb;
  v_barbers jsonb := '[]'::jsonb;
  v_stats jsonb := '{}'::jsonb;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  with rows as (
    select
      'visit'::text as source,
      v.id as source_id,
      v.visited_at as sold_at,
      v.barber_id,
      b.fullname as barber_name,
      b.initials as barber_code,
      coalesce(b.location, v.location, 'Downtown') as barber_location,
      coalesce(v.location, b.location, 'Downtown') as location,
      c.fullname as customer_name,
      c.email as customer_email,
      c.tier as customer_tier,
      v.service,
      v.price_cents as subtotal_cents,
      v.tip_cents,
      v.discount_cents,
      v.discount_type,
      v.tax_cents,
      v.payment_method,
      v.card_label,
      v.transaction_status,
      v.refund_reason,
      v.loyalty_points_added
    from public.visits v
    left join public.customers c on c.id = v.customer_id
    left join public.barbers b on b.id = v.barber_id

    union all

    select
      'walk_in'::text as source,
      w.id as source_id,
      w.served_at as sold_at,
      w.barber_id,
      b.fullname as barber_name,
      b.initials as barber_code,
      coalesce(b.location, w.location, 'Downtown') as barber_location,
      coalesce(w.location, b.location, 'Downtown') as location,
      w.customer_name as customer_name,
      null::text as customer_email,
      null::text as customer_tier,
      w.service,
      w.price_cents as subtotal_cents,
      w.tip_cents,
      w.discount_cents,
      w.discount_type,
      w.tax_cents,
      w.payment_method,
      w.card_label,
      case when w.status = 'cancelled' then 'refunded' else w.transaction_status end as transaction_status,
      w.refund_reason,
      0 as loyalty_points_added
    from public.walk_ins w
    left join public.barbers b on b.id = w.barber_id
  ),
  numbered as (
    select
      rows.*,
      row_number() over (order by sold_at, source_id) as row_num
    from rows
  )
  select coalesce(jsonb_agg(
      jsonb_build_object(
        'key', source || ':' || source_id::text,
        'source', source,
        'sourceId', source_id,
        'id', 'TXN-' || lpad((2400 + row_num)::text, 4, '0'),
        'createdAt', sold_at,
        'date', to_char(sold_at at time zone p_timezone, 'Dy, Mon FMDD'),
        'dateKey', to_char(sold_at at time zone p_timezone, 'YYYY-MM-DD'),
        'time', to_char(sold_at at time zone p_timezone, 'HH24:MI'),
        'barberId', barber_id,
        'barber', coalesce(barber_code, upper(left(coalesce(barber_name, 'NA'), 2))),
        'barberName', coalesce(barber_name, 'Unassigned'),
        'barberLoc', barber_location,
        'location', location,
        'customer', coalesce(nullif(customer_name, ''), 'Walk-in'),
        'customerEmail', customer_email,
        'tier',
          case
            when customer_tier = 'platinum' then 'Platinum'
            when customer_tier = 'gold' then 'Gold'
            when customer_tier = 'silver' then 'Standard'
            else null
          end,
        'services', jsonb_build_array(
          jsonb_build_object(
            'n', coalesce(nullif(service, ''), 'Service'),
            'p', round(coalesce(subtotal_cents, 0)::numeric / 100, 2)
          )
        ),
        'subtotal', round(coalesce(subtotal_cents, 0)::numeric / 100, 2),
        'tip', round(coalesce(tip_cents, 0)::numeric / 100, 2),
        'tipPct',
          case
            when coalesce(subtotal_cents, 0) > 0
              then round((coalesce(tip_cents, 0)::numeric / subtotal_cents::numeric) * 100)::int
            else 0
          end,
        'discount', round(coalesce(discount_cents, 0)::numeric / 100, 2),
        'discountType', discount_type,
        'tax', round(coalesce(tax_cents, 0)::numeric / 100, 2),
        'pay', coalesce(payment_method, 'card'),
        'card', coalesce(card_label, ''),
        'status', coalesce(transaction_status, 'completed'),
        'loyaltyAdded', coalesce(loyalty_points_added, 0),
        'refundReason', refund_reason
      )
      order by sold_at desc, source_id desc
    ), '[]'::jsonb)
    into v_transactions
    from numbered;

  select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', b.id,
        'name', b.fullname,
        'code', b.initials,
        'loc', coalesce(b.location, 'Downtown')
      )
      order by b.fullname
    ), '[]'::jsonb)
    into v_barbers
    from public.barbers b
   where coalesce(b.active, true) = true
      or exists (
        select 1 from public.visits v where v.barber_id = b.id
        union all
        select 1 from public.walk_ins w where w.barber_id = b.id
      );

  select jsonb_build_object(
      'upcomingCount', (
        select count(*)::int
          from public.appointments a
         where a.scheduled_at >= v_now
           and a.status in ('pending', 'scheduled')
      ),
      'totalCount', jsonb_array_length(v_transactions),
      'generatedAt', v_now
    )
    into v_stats;

  return jsonb_build_object(
    'generatedAt', v_now,
    'transactions', v_transactions,
    'barbers', v_barbers,
    'stats', v_stats
  );
end;
$$;

revoke all on function public.get_admin_transactions(text) from public;
grant execute on function public.get_admin_transactions(text) to authenticated;

create or replace function public.admin_refund_transaction(
  p_source text,
  p_source_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason text := coalesce(nullif(trim(p_reason), ''), 'Refunded from admin transactions');
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_source = 'visit' then
    update public.visits
       set transaction_status = 'refunded',
           refund_reason = v_reason
     where id = p_source_id;
  elsif p_source = 'walk_in' then
    update public.walk_ins
       set transaction_status = 'refunded',
           refund_reason = v_reason
     where id = p_source_id;
  else
    raise exception 'Invalid transaction source';
  end if;

  if not found then
    raise exception 'Transaction not found';
  end if;
end;
$$;

revoke all on function public.admin_refund_transaction(text, uuid, text) from public;
grant execute on function public.admin_refund_transaction(text, uuid, text) to authenticated;
