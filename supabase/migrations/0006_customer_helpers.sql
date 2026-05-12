-- ============================================================================
-- Phase 7b: customer helpers for profile polish
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.customers (id, fullname, email, phone)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'fullname',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.email,
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.create_test_notification()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.notifications (
    user_id, kind, title, body, is_unread, needs_action,
    when_at, where_at, actions, icon_variant, icon
  )
  values (
    auth.uid(),
    'booking',
    'Test reminder',
    'This is a test reminder from your customer settings.',
    true,
    false,
    now() + interval '1 hour',
    'Blade & Co.',
    jsonb_build_object('primary', 'View booking', 'secondary', 'Dismiss'),
    'gold',
    'bell'
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.create_test_notification() to authenticated;

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.customers where id = v_user_id;
  delete from auth.users where id = v_user_id;
end;
$$;

grant execute on function public.delete_my_account() to authenticated;
