-- StudentHome safe non-destructive Supabase migration
-- Purpose:
-- 1) Preserve existing data
-- 2) Keep current frontend compatible
-- 3) Remove dangerous public write access
-- 4) Restrict house writes to admins only
-- 5) Keep public reads working

begin;

-- --------------------------------------------------
-- Helper: ensure profiles table exists enough for role checks
-- --------------------------------------------------
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  university text,
  phone text,
  role text default 'student',
  created_at timestamptz default now()
);

-- --------------------------------------------------
-- Ensure core tables exist without dropping data
-- --------------------------------------------------
create table if not exists public.universities (
  id bigserial primary key,
  created_at timestamptz default now(),
  name text unique not null,
  locations text[] default '{}'
);

create table if not exists public.houses (
  id bigserial primary key,
  created_at timestamptz default now(),
  title text not null,
  school text,
  area text,
  "exactLocation" text,
  location text,
  type text,
  price numeric not null default 0,
  rooms integer default 1,
  status text default 'Active',
  photo text,
  photos text[] default '{}',
  description text,
  "desc" text,
  contact jsonb default '{"phone":"","whatsapp":""}'::jsonb,
  amenities text[] default '{}'
);

create table if not exists public.reviews (
  id bigserial primary key,
  created_at timestamptz default now(),
  name text not null,
  text text not null,
  school text,
  avatar text,
  house_id bigint references public.houses(id) on delete cascade
);

create table if not exists public.favorites (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  house_id bigint references public.houses(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, house_id)
);

create table if not exists public.inquiries (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  house_id bigint references public.houses(id) on delete cascade,
  message text,
  status text default 'Pending',
  created_at timestamptz default now()
);

-- --------------------------------------------------
-- Add missing columns safely if older versions exist
-- --------------------------------------------------
alter table public.houses add column if not exists school text;
alter table public.houses add column if not exists area text;
alter table public.houses add column if not exists "exactLocation" text;
alter table public.houses add column if not exists location text;
alter table public.houses add column if not exists type text;
alter table public.houses add column if not exists rooms integer default 1;
alter table public.houses add column if not exists status text default 'Active';
alter table public.houses add column if not exists photo text;
alter table public.houses add column if not exists photos text[] default '{}';
alter table public.houses add column if not exists description text;
alter table public.houses add column if not exists "desc" text;
alter table public.houses add column if not exists contact jsonb default '{"phone":"","whatsapp":""}'::jsonb;
alter table public.houses add column if not exists amenities text[] default '{}';

alter table public.reviews add column if not exists school text;
alter table public.reviews add column if not exists avatar text;
alter table public.reviews add column if not exists house_id bigint references public.houses(id) on delete cascade;

alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists university text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists role text default 'student';
alter table public.profiles add column if not exists created_at timestamptz default now();

-- --------------------------------------------------
-- Backfill house compatibility fields without deleting data
-- --------------------------------------------------
update public.houses
set photos = case
  when photos is null or cardinality(photos) = 0 then
    case when photo is not null and photo <> '' then array[photo] else '{}'::text[] end
  else photos
end;

update public.houses
set photo = case
  when (photo is null or photo = '') and photos is not null and cardinality(photos) > 0 then photos[1]
  else photo
end;

update public.houses
set description = coalesce(description, "desc", '');

update public.houses
set "desc" = coalesce("desc", description, '');

update public.houses
set location = coalesce(
  nullif(location, ''),
  trim(
    both ' ' from
      concat(
        coalesce(nullif("exactLocation", ''), nullif(area, ''), ''),
        case
          when coalesce(nullif(school, ''), '') <> '' then concat(' (', school, ')')
          else ''
        end
      )
  )
);

update public.houses
set contact = coalesce(contact, '{"phone":"","whatsapp":""}'::jsonb);

update public.houses
set amenities = coalesce(amenities, '{}'::text[]);

update public.houses
set rooms = coalesce(rooms, 1),
    status = coalesce(status, 'Active'),
    type = coalesce(type, 'Self-contain'),
    price = coalesce(price, 0);

-- --------------------------------------------------
-- Performance indexes
-- --------------------------------------------------
create index if not exists idx_houses_school on public.houses(school);
create index if not exists idx_houses_area on public.houses(area);
create index if not exists idx_houses_price on public.houses(price);

-- --------------------------------------------------
-- Enable RLS
-- --------------------------------------------------
alter table public.universities enable row level security;
alter table public.houses enable row level security;
alter table public.reviews enable row level security;
alter table public.profiles enable row level security;
alter table public.favorites enable row level security;
alter table public.inquiries enable row level security;

-- --------------------------------------------------
-- Drop old conflicting policies safely
-- --------------------------------------------------
drop policy if exists "Public Read Unis" on public.universities;
drop policy if exists "Public Read Houses" on public.houses;
drop policy if exists "Public Insert Houses" on public.houses;
drop policy if exists "Public Update Houses" on public.houses;
drop policy if exists "Public Delete Houses" on public.houses;
drop policy if exists "Public Read Reviews" on public.reviews;
drop policy if exists "Public Insert Reviews" on public.reviews;
drop policy if exists "Allow public to post reviews" on public.reviews;
drop policy if exists "Allow public to read reviews" on public.reviews;
drop policy if exists "Public Profiles Read" on public.profiles;
drop policy if exists "User Update Own Profile" on public.profiles;
drop policy if exists "Users can manage own favorites" on public.favorites;
drop policy if exists "Users can submit inquiries" on public.inquiries;
drop policy if exists "Users can view own inquiries" on public.inquiries;
drop policy if exists "Admins can view all inquiries" on public.inquiries;

-- --------------------------------------------------
-- New safe policies
-- --------------------------------------------------

-- Universities
create policy "public_read_universities"
on public.universities
for select
to public
using (true);

create policy "admin_write_universities"
on public.universities
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

-- Houses
create policy "public_read_houses"
on public.houses
for select
to public
using (true);

create policy "admin_insert_houses"
on public.houses
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

create policy "admin_update_houses"
on public.houses
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

create policy "admin_delete_houses"
on public.houses
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

-- Reviews
create policy "public_read_reviews"
on public.reviews
for select
to public
using (true);

create policy "public_insert_reviews"
on public.reviews
for insert
to public
with check (true);

-- Profiles
create policy "read_profiles"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "update_own_profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "admin_read_all_profiles"
on public.profiles
for select
to authenticated
using (
  auth.uid() = id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

-- Favorites
create policy "manage_own_favorites"
on public.favorites
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Inquiries
create policy "insert_own_inquiries"
on public.inquiries
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "read_own_inquiries"
on public.inquiries
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

create policy "admin_update_inquiries"
on public.inquiries
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

-- --------------------------------------------------
-- Auth trigger: create profile row when auth user signs up
-- --------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, university, phone, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'university',
    new.raw_user_meta_data->>'phone',
    coalesce(new.raw_user_meta_data->>'role', 'student')
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    university = excluded.university,
    phone = excluded.phone;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

commit;

-- --------------------------------------------------
-- IMPORTANT MANUAL STEP AFTER RUNNING THIS MIGRATION:
-- Make sure your admin users have role = 'admin' in public.profiles
--
-- Example using auth.users.email:
-- update public.profiles
-- set role = 'admin'
-- from auth.users
-- where public.profiles.id = auth.users.id
--   and auth.users.email in ('admin@example.com');
--
-- Or, if you only know auth user IDs:
-- update public.profiles
-- set role = 'admin'
-- where id in ('uuid-1', 'uuid-2');
--
-- Since profiles.id references auth.users.id, use the Supabase Table Editor
-- or run the update in the SQL editor if allowed.
-- --------------------------------------------------
