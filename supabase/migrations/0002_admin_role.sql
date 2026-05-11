-- ============================================================================
-- Add admin role support to customers
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- ============================================================================
-- Design notes:
--   * Single source of truth: public.customers.role
--   * Default 'customer' — Google / OAuth sign-ups (which fire the existing
--     handle_new_user trigger) can therefore NEVER end up as admin.
--   * Admin accounts are created in two manual steps:
--       1) Create the auth.users row in the Supabase dashboard
--          (Authentication > Users > Add user > email + password).
--       2) Run the promotion SQL at the bottom of this file once.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Add role column with a CHECK constraint
-- ----------------------------------------------------------------------------
alter table public.customers
  add column if not exists role text not null default 'customer'
  check (role in ('customer', 'admin'));

create index if not exists customers_role_idx on public.customers(role);

-- ----------------------------------------------------------------------------
-- 2. is_admin() helper — usable in RLS policies later
--    SECURITY DEFINER so it can read customers.role even when the calling
--    user's own RLS policy hasn't been satisfied yet.
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from public.customers where id = auth.uid()),
    false
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- ----------------------------------------------------------------------------
-- 3. RLS: let admins read every customer row (not just their own)
--    Keeps the existing "customers_select_own" policy — they stack with OR.
-- ----------------------------------------------------------------------------
drop policy if exists "customers_select_admin" on public.customers;
create policy "customers_select_admin"
  on public.customers for select
  to authenticated
  using (public.is_admin());

-- ============================================================================
-- 4. Promote an existing user to admin
--    Step A: Create the auth.users row from the Supabase dashboard first.
--            Suggested email: admin@bladeco.local
--    Step B: Replace the email below and run this single statement:
-- ============================================================================
--
-- update public.customers
--    set role = 'admin'
--  where email = 'admin@bladeco.local';
--
-- ============================================================================
-- 5. Verify
-- ============================================================================
--
-- select id, email, role from public.customers where role = 'admin';
--
