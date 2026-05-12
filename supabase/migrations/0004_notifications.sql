-- ============================================================================
-- Phase 6: notifications inbox
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- ============================================================================
-- Design notes:
--   * One row per notification, owned by user_id (references customers.id,
--     which is also auth.users.id thanks to the existing FK chain).
--   * `where_at` is named explicitly to avoid the SQL keyword `where`.
--   * `actions` is JSONB so we can store the three CTA labels per kind.
--   * RLS: a user can read/update their own rows. Inserts go through the
--     SECURITY DEFINER triggers below (so no INSERT policy is needed for the
--     client — clients never insert directly).
--   * Triggers wire the existing appointments + visits tables to the inbox so
--     real user activity creates real notifications:
--       - Booking confirmed (on appointment insert)
--       - Booking cancelled (on appointment status -> cancelled)
--       - Receipt ready (on visit insert)
-- ============================================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.customers(id) on delete cascade,
  kind text not null check (kind in ('booking', 'receipt', 'account', 'offer')),
  title text not null,
  body text,
  is_unread boolean not null default true,
  needs_action boolean not null default false,
  when_at timestamptz,
  who text,
  where_at text,
  actions jsonb not null default '{}'::jsonb,
  icon_variant text not null default 'default' check (icon_variant in ('default', 'gold')),
  icon text not null default 'bell',
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists notifications_user_idx
  on public.notifications(user_id, created_at desc);

create index if not exists notifications_user_unread_idx
  on public.notifications(user_id)
  where is_unread = true;

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select
  using (auth.uid() = user_id);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own"
  on public.notifications for delete
  using (auth.uid() = user_id);

-- No INSERT policy: inserts come exclusively from SECURITY DEFINER triggers below.

-- ----------------------------------------------------------------------------
-- Trigger: appointment booked -> 'Booking confirmed' notification
-- ----------------------------------------------------------------------------
create or replace function public.notify_appointment_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_barber_name text;
begin
  select fullname into v_barber_name
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
      ' (' || coalesce(new.location, 'Downtown') || ') with ' ||
      coalesce(v_barber_name, 'your barber') || '.',
    true,
    true,
    new.scheduled_at,
    coalesce(v_barber_name, 'Blade & Co.'),
    coalesce(new.location, 'Downtown'),
    jsonb_build_object(
      'primary',   'Add to calendar',
      'secondary', 'Reschedule',
      'tertiary',  'View booking'
    ),
    'gold',
    'calendar'
  );

  return new;
end;
$$;

drop trigger if exists on_appointment_created on public.appointments;
create trigger on_appointment_created
  after insert on public.appointments
  for each row
  when (new.status = 'scheduled')
  execute function public.notify_appointment_created();

-- ----------------------------------------------------------------------------
-- Trigger: appointment cancelled -> 'Booking cancelled' notification
-- ----------------------------------------------------------------------------
create or replace function public.notify_appointment_cancelled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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
      coalesce(new.location, 'Downtown'),
      jsonb_build_object(
        'primary',   'Rebook',
        'secondary', 'View bookings'
      ),
      'default',
      'calendar'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_appointment_status_changed on public.appointments;
create trigger on_appointment_status_changed
  after update of status on public.appointments
  for each row
  execute function public.notify_appointment_cancelled();

-- ----------------------------------------------------------------------------
-- Trigger: visit recorded -> 'Receipt ready' notification
-- ----------------------------------------------------------------------------
create or replace function public.notify_visit_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (
    user_id, kind, title, body, is_unread,
    when_at, where_at, actions, icon_variant, icon
  )
  values (
    new.customer_id,
    'receipt',
    'Receipt ready - $' || (new.price_cents / 100)::text,
    'Your receipt for ' || new.service ||
      ' is available. Download a PDF for reimbursements or expenses.',
    true,
    new.visited_at,
    coalesce(new.location, 'Downtown'),
    jsonb_build_object(
      'primary',   'Download PDF',
      'secondary', 'Email me',
      'tertiary',  'Open History'
    ),
    'default',
    'receipt'
  );
  return new;
end;
$$;

drop trigger if exists on_visit_created on public.visits;
create trigger on_visit_created
  after insert on public.visits
  for each row
  execute function public.notify_visit_created();

-- ----------------------------------------------------------------------------
-- Helper: mark a notification read/unread (keeps read_at in sync)
-- ----------------------------------------------------------------------------
create or replace function public.set_notification_read(p_id uuid, p_read boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notifications
     set is_unread = not p_read,
         read_at = case when p_read then now() else null end
   where id = p_id and user_id = auth.uid();
end;
$$;

grant execute on function public.set_notification_read(uuid, boolean) to authenticated;
