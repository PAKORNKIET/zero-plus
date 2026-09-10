-- ============================================================
-- Zero+ database schema
-- Run this in Supabase: Dashboard > SQL Editor > New query > paste > Run
-- Matches the ERD discussed: profiles, categories, products, orders,
-- payment_slips, downloads, reviews, wishlist.
--
-- This version is idempotent — safe to run more than once. If a
-- previous run got partway through and failed, just run the whole
-- file again; every statement below skips cleanly if its object
-- already exists instead of erroring.
-- ============================================================

-- Needed for gen_random_uuid()
create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- profiles
-- Extends Supabase's built-in auth.users (which handles email,
-- Google, Discord login already) with the store-specific fields.
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text,
  avatar_url text,
  bio text,
  role text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever someone signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (new.id, split_part(new.email, '@', 1), split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------
-- categories (self-referencing for sub-categories, e.g.
-- Java Edition > Mods, per the original DALi Store spec)
-- ------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  sort_order int not null default 0,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_categories_parent on public.categories(parent_id);

-- ------------------------------------------------------------
-- products
-- ------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  price numeric(12,2) not null default 0,
  is_free boolean not null default false,
  version text,
  tags text[] not null default '{}',
  cover_image_url text,
  gallery_urls text[] not null default '{}',
  video_url text,
  file_url text,              -- private R2 object key, never public
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_hidden on public.products(is_hidden);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at
  before update on public.products
  for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- orders
-- status maps directly to what pages/api/verify-payment.js decides:
--   'pending'  = needs manual review (wrong amount / wrong account / not a valid slip)
--   'paid'     = SlipOK auto-confirmed
--   'rejected' = duplicate slip (code 1012) — treated as likely fraud, not a normal pending case
-- ------------------------------------------------------------
do $$ begin
  create type order_status as enum ('pending', 'paid', 'rejected');
exception when duplicate_object then null;
end $$;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,   -- human-friendly, e.g. "Z-1042"
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id),
  amount numeric(12,2) not null,
  method text not null,                -- 'bank_transfer' | 'promptpay' | 'truemoney'
  status order_status not null default 'pending',
  slip_image_url text,
  slipok_code int,                     -- SlipOK error code, if not auto-confirmed
  slipok_message text,
  resolved_by uuid references public.profiles(id), -- which admin approved/rejected manually
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_orders_user on public.orders(user_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_product on public.orders(product_id);

-- Auto-generate a readable order_number like "Z-1000", "Z-1001", ...
create sequence if not exists public.order_number_seq start 1000;
create or replace function public.set_order_number()
returns trigger as $$
begin
  if new.order_number is null then
    new.order_number := 'Z-' || nextval('public.order_number_seq');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists orders_set_number on public.orders;
create trigger orders_set_number
  before insert on public.orders
  for each row execute procedure public.set_order_number();

-- ------------------------------------------------------------
-- payment_slips
-- Extra safety net alongside SlipOK's own log:true duplicate check —
-- stores every confirmed transRef so a second layer catches reuse
-- even if a request to SlipOK ever goes out without log:true by mistake.
-- ------------------------------------------------------------
create table if not exists public.payment_slips (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  trans_ref text not null unique,
  raw_response jsonb,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- downloads
-- What a user is actually entitled to download — separate from orders
-- so a future free giveaway or manual grant doesn't need a fake order.
-- ------------------------------------------------------------
create table if not exists public.downloads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id),
  order_id uuid references public.orders(id),
  unlocked_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists idx_downloads_user on public.downloads(user_id);

-- ------------------------------------------------------------
-- reviews — only buyers can review (enforced via RLS below,
-- checked against the downloads table)
-- ------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists idx_reviews_product on public.reviews(product_id);

-- ------------------------------------------------------------
-- wishlist
-- ------------------------------------------------------------
create table if not exists public.wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);


-- ============================================================
-- Row Level Security
-- Default: nothing is accessible until a policy explicitly allows it.
-- The backend (pages/api/verify-payment.js etc.) uses the Supabase
-- service role key, which bypasses RLS entirely — these policies only
-- govern what the browser can do directly with the anon/user key.
-- ============================================================

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.payment_slips enable row level security;
alter table public.downloads enable row level security;
alter table public.reviews enable row level security;
alter table public.wishlist enable row level security;

-- Helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- profiles: anyone can view a profile (needed for review author names
-- etc.), but you can only edit your own row; admins can edit any.
drop policy if exists "profiles are publicly viewable" on public.profiles;
create policy "profiles are publicly viewable"
  on public.profiles for select using (true);
drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
  on public.profiles for update using (auth.uid() = id);
drop policy if exists "admins can update any profile" on public.profiles;
create policy "admins can update any profile"
  on public.profiles for update using (public.is_admin());

-- categories: public read of visible categories; only admins write.
drop policy if exists "visible categories are public" on public.categories;
create policy "visible categories are public"
  on public.categories for select using (not hidden or public.is_admin());
drop policy if exists "admins manage categories" on public.categories;
create policy "admins manage categories"
  on public.categories for all using (public.is_admin());

-- products: public read of visible products; only admins write.
drop policy if exists "visible products are public" on public.products;
create policy "visible products are public"
  on public.products for select using (not is_hidden or public.is_admin());
drop policy if exists "admins manage products" on public.products;
create policy "admins manage products"
  on public.products for all using (public.is_admin());

-- orders: users see only their own orders; admins see all.
-- No insert/update policy for regular users on purpose — orders are
-- only ever created/updated by the backend via the service role key
-- in pages/api/verify-payment.js, so a customer can never fake their
-- own order status to 'paid' by calling the Supabase client directly.
drop policy if exists "users view own orders" on public.orders;
create policy "users view own orders"
  on public.orders for select using (auth.uid() = user_id);
drop policy if exists "admins view all orders" on public.orders;
create policy "admins view all orders"
  on public.orders for select using (public.is_admin());
drop policy if exists "admins update orders" on public.orders;
create policy "admins update orders"
  on public.orders for update using (public.is_admin());

-- payment_slips: no client-facing policy at all — backend/service-role
-- only. Regular users and even admins-via-browser get zero access;
-- admins review orders through the orders table instead.

-- downloads: users see their own; admins see all. Insert is backend-only.
drop policy if exists "users view own downloads" on public.downloads;
create policy "users view own downloads"
  on public.downloads for select using (auth.uid() = user_id);
drop policy if exists "admins view all downloads" on public.downloads;
create policy "admins view all downloads"
  on public.downloads for select using (public.is_admin());

-- reviews: public can read non-hidden reviews; a user can post a review
-- only for a product they actually have a download record for — this
-- is the "only buyers can review" rule from the original spec, enforced
-- at the database level instead of just in frontend UI.
drop policy if exists "visible reviews are public" on public.reviews;
create policy "visible reviews are public"
  on public.reviews for select using (not is_hidden or public.is_admin());
drop policy if exists "buyers can review purchased products" on public.reviews;
create policy "buyers can review purchased products"
  on public.reviews for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.downloads
      where downloads.user_id = auth.uid()
        and downloads.product_id = reviews.product_id
    )
  );
drop policy if exists "users edit own reviews" on public.reviews;
create policy "users edit own reviews"
  on public.reviews for update using (auth.uid() = user_id);
drop policy if exists "admins moderate reviews" on public.reviews;
create policy "admins moderate reviews"
  on public.reviews for all using (public.is_admin());

-- wishlist: fully private to each user.
drop policy if exists "users manage own wishlist" on public.wishlist;
create policy "users manage own wishlist"
  on public.wishlist for all using (auth.uid() = user_id);


-- ============================================================
-- Table-level GRANTs
-- RLS policies alone are not enough — Postgres checks table-level
-- privileges FIRST, then RLS policies filter which rows are visible.
-- This only matters because "Automatically expose new tables" was
-- turned off during project setup (the right call security-wise), which
-- means these grants don't happen automatically and must be explicit.
-- Without this section, every query returns "permission denied" even
-- though the RLS policies above are all correct.
-- ============================================================

grant usage on schema public to anon, authenticated;

grant select, update on public.profiles to anon, authenticated;
grant select, insert, update, delete on public.categories to anon, authenticated;
grant select, insert, update, delete on public.products to anon, authenticated;
grant select, insert, update on public.orders to authenticated;
grant select on public.downloads to authenticated;
grant select, insert, update, delete on public.reviews to anon, authenticated;
grant select, insert, update, delete on public.wishlist to authenticated;

grant execute on function public.is_admin() to anon, authenticated;

-- public.payment_slips intentionally gets NO grant here — stays
-- accessible only to the service role (used server-side), matching the
-- "no client-facing policy at all" note above.
