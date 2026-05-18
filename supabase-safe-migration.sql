-- ================================================================
-- StudentHome — Master Database Migration (v5.0)
-- ================================================================
-- Safe to run multiple times (idempotent).
-- Will NOT delete existing data.
-- Run in: Supabase → SQL Editor → Paste → Run
-- ================================================================

begin;

-- ----------------------------------------------------------------
-- STEP 1: TABLES
-- ----------------------------------------------------------------

-- PROFILES (must exist first — other tables reference auth.users)
create table if not exists public.profiles (
  id           uuid references auth.users on delete cascade primary key,
  email        text unique,
  full_name    text,
  university   text,
  phone        text,
  role         text default 'student',
  avatar_url   text,
  created_at   timestamptz default now()
);
alter table public.profiles add column if not exists email        text unique;
alter table public.profiles add column if not exists full_name  text;
alter table public.profiles add column if not exists university text;
alter table public.profiles add column if not exists phone      text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists role       text default 'student';
alter table public.profiles add column if not exists created_at timestamptz default now();
alter table public.profiles add column if not exists resetToken  text;
alter table public.profiles add column if not exists resetExpiry bigint;

-- UNIVERSITIES
create table if not exists public.universities (
  id          bigserial primary key,
  created_at  timestamptz default now(),
  name        text unique not null,
  locations   text[]  default '{}',
  logo_url    text    default '',
  logo_scale  numeric default 1.1
);
alter table public.universities add column if not exists locations  text[]  default '{}';
alter table public.universities add column if not exists logo_url   text    default '';
alter table public.universities add column if not exists logo_scale numeric default 1.1;

-- HOUSES
create table if not exists public.houses (
  id              bigserial primary key,
  created_at      timestamptz default now(),
  title           text    not null,
  school          text,
  area            text,
  "exactLocation" text,
  location        text,
  type            text,
  price           numeric not null default 0,
  rooms           integer default 1,
  status          text    default 'Active',
  photo           text,
  photos          text[]  default '{}',
  video_url       text,
  video_thumbnail text,
  description     text,
  "desc"          text,
  contact         jsonb   default '{"phone":"","whatsapp":""}'::jsonb,
  amenities       text[]  default '{}',
  views           integer default 0
);
alter table public.houses add column if not exists school          text;
alter table public.houses add column if not exists area            text;
alter table public.houses add column if not exists "exactLocation" text;
alter table public.houses add column if not exists location        text;
alter table public.houses add column if not exists type            text;
alter table public.houses add column if not exists rooms           integer default 1;
alter table public.houses add column if not exists status          text    default 'Active';
alter table public.houses add column if not exists photo           text;
alter table public.houses add column if not exists photos          text[]  default '{}';
alter table public.houses add column if not exists description     text;
alter table public.houses add column if not exists "desc"          text;
alter table public.houses add column if not exists contact         jsonb   default '{"phone":"","whatsapp":""}'::jsonb;
alter table public.houses add column if not exists amenities       text[]  default '{}';
alter table public.houses add column if not exists views           integer default 0;

-- REVIEWS
create table if not exists public.reviews (
  id          bigserial primary key,
  created_at  timestamptz default now(),
  name        text not null,
  text        text not null,
  school      text,
  avatar      text,
  house_id    bigint references public.houses(id) on delete cascade
);
alter table public.reviews add column if not exists school   text;
alter table public.reviews add column if not exists avatar   text;
alter table public.reviews add column if not exists house_id bigint references public.houses(id) on delete cascade;

-- FAVORITES
create table if not exists public.favorites (
  id          bigserial primary key,
  created_at  timestamptz default now(),
  user_id     uuid   not null references auth.users(id) on delete cascade,
  house_id    bigint not null references public.houses(id) on delete cascade,
  unique (user_id, house_id)
);

-- INQUIRIES (Direct messages from students to agent about a property)
create table if not exists public.inquiries (
  id          bigserial primary key,
  created_at  timestamptz default now(),
  user_id     uuid   references auth.users(id) on delete cascade,
  house_id    bigint references public.houses(id) on delete cascade,
  message     text,
  status      text default 'Pending'   -- Pending | Replied | Closed
);
alter table public.inquiries add column if not exists message text;
alter table public.inquiries add column if not exists status text default 'Pending';


-- ----------------------------------------------------------------
-- STEP 2: DATA BACKFILL (safe — only fills empty/null values)
-- ----------------------------------------------------------------
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

update public.houses set description = coalesce(description, "desc", '');
update public.houses set "desc"      = coalesce("desc", description, '');

update public.houses
set location = coalesce(
  nullif(location, ''),
  trim(both ' ' from concat(
    coalesce(nullif("exactLocation", ''), nullif(area, ''), ''),
    case when coalesce(nullif(school, ''), '') <> ''
         then concat(' (', school, ')') else '' end
  ))
);

update public.houses set contact   = coalesce(contact,   '{"phone":"","whatsapp":""}'::jsonb);
update public.houses set amenities = coalesce(amenities, '{}'::text[]);
update public.houses set rooms     = coalesce(rooms,     1);
update public.houses set status    = coalesce(status,    'Active');
update public.houses set type      = coalesce(type,      'Self-contain');
update public.houses set price     = coalesce(price,     0);


-- ----------------------------------------------------------------
-- STEP 3: INDEXES
-- ----------------------------------------------------------------
create index if not exists idx_houses_school        on public.houses(school);
create index if not exists idx_houses_area          on public.houses(area);
create index if not exists idx_houses_price         on public.houses(price);
create index if not exists idx_reviews_house_id     on public.reviews(house_id);
create index if not exists idx_favorites_user_id    on public.favorites(user_id);
create index if not exists idx_favorites_house_id   on public.favorites(house_id);
create index if not exists idx_inquiries_user_id    on public.inquiries(user_id);
create index if not exists idx_inquiries_house_id   on public.inquiries(house_id);


-- ----------------------------------------------------------------
-- STEP 4: HELPER FUNCTION (prevents RLS recursion / 500 errors)
-- ----------------------------------------------------------------
create or replace function public.is_admin(user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from public.profiles
    where id = user_id and role = 'admin'
  );
end;
$$;


-- ----------------------------------------------------------------
-- STEP 5: ENABLE ROW LEVEL SECURITY
-- ----------------------------------------------------------------
alter table public.profiles    enable row level security;
alter table public.universities enable row level security;
alter table public.houses      enable row level security;
alter table public.reviews     enable row level security;
alter table public.favorites   enable row level security;
alter table public.inquiries   enable row level security;


-- ----------------------------------------------------------------
-- STEP 6: DROP OLD / CONFLICTING POLICIES
-- ----------------------------------------------------------------
drop policy if exists "public_read_universities"       on public.universities;
drop policy if exists "admin_write_universities"       on public.universities;
drop policy if exists "Public Read Unis"               on public.universities;

drop policy if exists "public_read_houses"             on public.houses;
drop policy if exists "admin_insert_houses"            on public.houses;
drop policy if exists "admin_update_houses"            on public.houses;
drop policy if exists "admin_delete_houses"            on public.houses;
drop policy if exists "Public Read Houses"             on public.houses;
drop policy if exists "Public Insert Houses"           on public.houses;
drop policy if exists "Public Update Houses"           on public.houses;
drop policy if exists "Public Delete Houses"           on public.houses;

drop policy if exists "public_read_reviews"            on public.reviews;
drop policy if exists "public_insert_reviews"          on public.reviews;
drop policy if exists "Public Read Reviews"            on public.reviews;
drop policy if exists "Public Insert Reviews"          on public.reviews;
drop policy if exists "Allow public to post reviews"   on public.reviews;
drop policy if exists "Allow public to read reviews"   on public.reviews;

drop policy if exists "read_own_profile"             on public.profiles;
drop policy if exists "read_profiles"                  on public.profiles;
drop policy if exists "update_own_profile"             on public.profiles;
drop policy if exists "admin_read_all_profiles"        on public.profiles;
drop policy if exists "Public Profiles Read"           on public.profiles;
drop policy if exists "User Update Own Profile"        on public.profiles;
drop policy if exists "allow_authenticated_read_profiles" on public.profiles;

drop policy if exists "manage_own_favorites"           on public.favorites;
drop policy if exists "Users can manage own favorites" on public.favorites;

drop policy if exists "insert_own_inquiries"           on public.inquiries;
drop policy if exists "read_own_inquiries"             on public.inquiries;
drop policy if exists "admin_update_inquiries"         on public.inquiries;


-- ----------------------------------------------------------------
-- STEP 7: CREATE POLICIES
-- ----------------------------------------------------------------

-- UNIVERSITIES
create policy "public_read_universities"
  on public.universities for select to public using (true);

create policy "admin_write_universities"
  on public.universities for all to authenticated
  using      (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- HOUSES
create policy "public_read_houses"
  on public.houses for select to public using (true);

create policy "admin_insert_houses"
  on public.houses for insert to authenticated
  with check (public.is_admin(auth.uid()));

create policy "admin_update_houses"
  on public.houses for update to authenticated
  using      (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "admin_delete_houses"
  on public.houses for delete to authenticated
  using (public.is_admin(auth.uid()));

-- REVIEWS (anyone can read; only logged-in users can post)
create policy "public_read_reviews"
  on public.reviews for select to public using (true);

create policy "authenticated_insert_reviews"
  on public.reviews for insert to authenticated
  with check (auth.uid() is not null);

-- PROFILES
create policy "read_own_profile"
  on public.profiles for select to authenticated
  using (auth.uid() = id or public.is_admin(auth.uid()));

create policy "update_own_profile"
  on public.profiles for update to authenticated
  using      (auth.uid() = id)
  with check (auth.uid() = id);

-- FAVORITES
create policy "manage_own_favorites"
  on public.favorites for all to authenticated
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- INQUIRIES
create policy "insert_own_inquiries"
  on public.inquiries for insert to authenticated
  with check (auth.uid() = user_id);

create policy "read_own_inquiries"
  on public.inquiries for select to authenticated
  using (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "admin_update_inquiries"
  on public.inquiries for update to authenticated
  using      (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));


-- ----------------------------------------------------------------
-- STEP 8: STORAGE BUCKETS (house photos & avatars)
-- ----------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('house-photos', 'house-photos', true),
       ('house-videos', 'house-videos', true),
       ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- House Photos Policy
drop policy if exists "Allow public access to house-photos" on storage.objects;
create policy "Allow public access to house-photos"
  on storage.objects for all
  using (bucket_id = 'house-photos');

-- House Videos Policy
drop policy if exists "Allow public access to house-videos" on storage.objects;
create policy "Allow public access to house-videos"
  on storage.objects for all
  using (bucket_id = 'house-videos');

-- Avatars Policy (Everyone can read, authenticated can upload)
drop policy if exists "Allow public access to avatars" on storage.objects;
create policy "Allow public access to avatars"
  on storage.objects for select to public
  using (bucket_id = 'avatars');

drop policy if exists "Allow authenticated upload to avatars" on storage.objects;
create policy "Allow authenticated upload to avatars"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars');

drop policy if exists "Allow users to delete or update own avatar" on storage.objects;
create policy "Allow users to delete or update own avatar"
  on storage.objects for all to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);


-- ----------------------------------------------------------------
-- STEP 9: AUTH TRIGGER (auto-create profile on sign up)
-- ----------------------------------------------------------------
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
  on conflict (id) do update set
    full_name  = excluded.full_name,
    university = excluded.university,
    phone      = excluded.phone;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ----------------------------------------------------------------
-- STEP 10: VIEWS COUNTER FUNCTION
-- ----------------------------------------------------------------
create or replace function public.increment_house_views(house_id_input bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.houses
  set views = coalesce(views, 0) + 1
  where id = house_id_input;
end;
$$;


-- ----------------------------------------------------------------
-- STEP 11: ROLE CHANGE PROTECTION TRIGGER
-- ----------------------------------------------------------------
create or replace function public.prevent_role_change_if_not_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only check if role is actually being changed
  if (old.role is distinct from new.role) then
    -- Check if the person doing the update is an admin
    if not exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    ) then
      raise exception 'Only admins can change roles. Your role is %', old.role;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists ensure_admin_on_role_change on public.profiles;
create trigger ensure_admin_on_role_change
  before update on public.profiles
  for each row execute procedure public.prevent_role_change_if_not_admin();

-- Ensure the auth schema is accessible for uid() calls
grant usage on schema auth to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;


commit;


-- ================================================================
-- MANUAL STEP: Set your account as admin (run separately if needed)
-- Replace the email with yours if it ever resets
-- ================================================================
-- BEGIN;
--   DROP TRIGGER IF EXISTS ensure_admin_on_role_change ON public.profiles;
--
--   UPDATE public.profiles SET role = 'admin'
--   WHERE id = (SELECT id FROM auth.users WHERE email = 'ugwunekejohn5@gmail.com');
--
--   CREATE TRIGGER ensure_admin_on_role_change
--   BEFORE UPDATE ON public.profiles
--   FOR EACH ROW EXECUTE PROCEDURE public.prevent_role_change_if_not_admin();
-- COMMIT;-- ----------------------------------------------------------------
-- STEP 10: GRANTS (Ensure students can run helper functions)
-- ----------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;

-- Specifically for is_admin to be used in RLS
grant execute on function public.is_admin(uuid) to authenticated, anon;

commit;

-- ----------------------------------------------------------------
-- STEP 11: AUDIT LOGS
-- ----------------------------------------------------------------
begin;

create table if not exists public.audit_logs (
    id bigint generated by default as identity primary key,
    admin_id uuid references auth.users(id) on delete set null,
    admin_name text,
    action text not null,
    entity_type text not null,
    entity_id text,
    details jsonb,
    created_at timestamptz default now() not null
);

alter table public.audit_logs enable row level security;

drop policy if exists "Admins can view audit logs" on public.audit_logs;
create policy "Admins can view audit logs" 
  on public.audit_logs for select to authenticated 
  using (public.is_admin(auth.uid()));

drop policy if exists "Admins can insert audit logs" on public.audit_logs;
create policy "Admins can insert audit logs" 
  on public.audit_logs for insert to authenticated 
  with check (public.is_admin(auth.uid()));

commit;
