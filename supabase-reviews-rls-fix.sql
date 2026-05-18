-- Run this once in Supabase → SQL Editor (fixes review spam: login required to post)
drop policy if exists "public_insert_reviews" on public.reviews;

create policy "authenticated_insert_reviews"
  on public.reviews for insert to authenticated
  with check (auth.uid() is not null);
