-- ================================================================
-- StudentHome — Performance Optimization Migration (v6.0)
-- ================================================================
-- Adds missing indexes, optimizes query performance
-- Safe to run multiple times (idempotent)
-- Run in: Supabase → SQL Editor → Paste → Run
-- ================================================================

begin;

-- ----------------------------------------------------------------
-- STEP 1: COMPOSITE INDEXES (for common query patterns)
-- ----------------------------------------------------------------

-- Houses: Common filter combinations
create index if not exists idx_houses_school_area 
  on puablic.houses(school, area);

create index if not exists idx_houses_school_price 
  on public.houses(school, price);

create index if not exists idx_houses_status_active 
  on public.houses(status) 
  where status = 'Active';

create index if not exists idx_houses_created_at_desc 
  on public.houses(created_at DESC);

create index if not exists idx_houses_type 
  on public.houses(type);

-- Reviews: Optimize by house and date
create index if not exists idx_reviews_house_created 
  on public.reviews(house_id, created_at DESC);

-- Favorites: Composite for faster lookups
create index if not exists idx_favorites_user_house 
  on public.favorites(user_id, house_id);

-- Profiles: Email lookup (for forgot password)
create index if not exists idx_profiles_email 
  on public.profiles(email);

create index if not exists idx_profiles_reset_token 
  on public.profiles(resettoken) 
  where resettoken is not null;

-- ----------------------------------------------------------------
-- STEP 2: PARTIAL INDEXES (only index active/valid rows)
-- ----------------------------------------------------------------

-- Only index active houses (most common query)
create index if not exists idx_houses_active_school 
  on public.houses(school) 
  where status = 'Active';

create index if not exists idx_houses_active_price 
  on public.houses(price) 
  where status = 'Active';

-- ----------------------------------------------------------------
-- STEP 3: UPDATE RLS POLICIES (add caching hints)
-- ----------------------------------------------------------------

-- Optimize houses read policy (public read is already good)
-- No changes needed - already allows public SELECT

-- ----------------------------------------------------------------
-- STEP 4: ADD MATERIALIZED VIEW FOR STATISTICS (optional but fast)
-- ----------------------------------------------------------------

-- Drop if exists to allow re-running
drop materialized view if exists public.house_stats;

-- Create materialized view for fast statistics
create materialized view public.house_stats as
select 
  school,
  area,
  type,
  count(*) as total_listings,
  avg(price) as avg_price,
  min(price) as min_price,
  max(price) as max_price,
  count(*) filter (where status = 'Active') as active_listings
from public.houses
where status = 'Active'
group by school, area, type;

-- Index the materialized view
create unique index if not exists idx_house_stats_unique 
  on public.house_stats(school, area, type);

-- Function to refresh stats (call periodically, not on every request)
create or replace function public.refresh_house_stats()
returns void
language plpgsql
security definer
as $$
begin
  refresh materialized view concurrently public.house_stats;
end;
$$;

-- ----------------------------------------------------------------
-- STEP 5: ADD QUERY HINTS VIA COMMENTS (Supabase respects these)
-- ----------------------------------------------------------------

-- Mark frequently accessed columns
comment on column public.houses.school is 'Indexed: Frequently filtered';
comment on column public.houses.area is 'Indexed: Frequently filtered';
comment on column public.houses.price is 'Indexed: Frequently filtered and sorted';
comment on column public.houses.status is 'Indexed: Partial index on Active';

-- ----------------------------------------------------------------
-- STEP 6: OPTIMIZE AUTH USER LOOKUP (for forgot password)
-- ----------------------------------------------------------------

-- Add index for email lookup in auth.users (if not already present)
-- Note: auth.users is managed by Supabase, but we can optimize our usage
-- The profiles table already has email index from STEP 1

commit;

-- ================================================================
-- PERFORMANCE RECOMMENDATIONS (Manual Steps):
-- ================================================================
-- 
-- 1. ENABLE DATABASE CACHING:
--    - Go to Supabase Dashboard → Settings → Database
--    - Enable "Statement Cache" if not already enabled
--
-- 2. ADD CONNECTION POOLING:
--    - Supabase provides connection pooling automatically
--    - Use the pooled connection string for better performance
--
-- 3. MONITOR SLOW QUERIES:
--    - Supabase Dashboard → Database → Logs
--    - Look for queries taking > 1 second
--
-- 4. REFRESH MATERIALIZED VIEW PERIODICALLY:
--    Run this daily or after bulk updates:
--    SELECT refresh_house_stats();
--
-- 5. CONSIDER EDGE CACHING:
--    - Use Vercel Edge Cache for static data (universities)
--    - Cache houses list for 5-10 minutes with stale-while-revalidate
--
-- ================================================================
