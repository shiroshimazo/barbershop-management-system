-- ============================================================================
-- Phase 5: settings JSONB column on customers
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- ============================================================================
-- Design notes:
--   * One column, one read/write. No new table — the Settings page toggles are
--     mostly UI preferences, so a JSONB blob keyed by toggle id is plenty.
--   * Defaults to '{}' so existing rows keep working; the client merges with
--     hardcoded defaults on load.
--   * RLS already protects customers (auth.uid() = id), so this column is
--     automatically per-user.
-- ============================================================================

alter table public.customers
  add column if not exists settings jsonb not null default '{}'::jsonb;

-- Optional: a tiny helper to merge new keys without clobbering existing ones.
-- Frontend uses set-and-replace, so this is just for future SQL convenience.
create or replace function public.merge_settings(patch jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.customers
     set settings = coalesce(settings, '{}'::jsonb) || coalesce(patch, '{}'::jsonb)
   where id = auth.uid();
end;
$$;

grant execute on function public.merge_settings(jsonb) to authenticated;
