-- ============================================================
-- Zero+ seed data
-- Run in Supabase SQL Editor, after schema.sql
-- Real categories from the original spec + 3 of your actual mods as
-- sample products (not filler placeholder text) so the Home page has
-- something real to render once it's converted from the mockup.
-- ============================================================

-- ------------------------------------------------------------
-- Categories
-- ------------------------------------------------------------
insert into public.categories (name, slug, sort_order) values
  ('Java Edition', 'java-edition', 1),
  ('Bedrock Edition', 'bedrock-edition', 2),
  ('Website', 'website', 3),
  ('Free Downloads', 'free-downloads', 4)
on conflict (slug) do nothing;

insert into public.categories (name, slug, parent_id, sort_order)
select 'Mods', 'java-mods', id, 1 from public.categories where slug = 'java-edition'
on conflict (slug) do nothing;

insert into public.categories (name, slug, parent_id, sort_order)
select 'Models', 'java-models', id, 2 from public.categories where slug = 'java-edition'
on conflict (slug) do nothing;

insert into public.categories (name, slug, parent_id, sort_order)
select 'Emotes', 'java-emotes', id, 3 from public.categories where slug = 'java-edition'
on conflict (slug) do nothing;

insert into public.categories (name, slug, parent_id, sort_order)
select 'Add-ons', 'bedrock-addons', id, 1 from public.categories where slug = 'bedrock-edition'
on conflict (slug) do nothing;

insert into public.categories (name, slug, parent_id, sort_order)
select 'Models', 'bedrock-models', id, 2 from public.categories where slug = 'bedrock-edition'
on conflict (slug) do nothing;

insert into public.categories (name, slug, parent_id, sort_order)
select 'Resource Packs', 'bedrock-resource-packs', id, 3 from public.categories where slug = 'bedrock-edition'
on conflict (slug) do nothing;

insert into public.categories (name, slug, parent_id, sort_order)
select 'Website Templates', 'website-templates', id, 1 from public.categories where slug = 'website'
on conflict (slug) do nothing;

-- ------------------------------------------------------------
-- Products — 3 of your real mods, priced to match the mockup
-- ------------------------------------------------------------
insert into public.products (category_id, name, slug, description, price, version, tags)
select
  id,
  'VCN Nickname — Voice Overlay Nicknames',
  'vcn-nickname',
  'PlasmoVoice addon for custom voice-overlay nicknames, with cross-server nickname storage and full color customization.',
  149,
  'v2.1.13',
  array['Forge', '1.20.1', 'PlasmoVoice']
from public.categories where slug = 'java-mods'
on conflict (slug) do nothing;

insert into public.products (category_id, name, slug, description, price, version, tags)
select
  id,
  'SwordClash — EpicFight QTE',
  'swordclash',
  'Anime-style sword clash QTE mechanics integrating with the EpicFight mod.',
  199,
  'v1.0',
  array['Forge', '1.20.1', 'EpicFight']
from public.categories where slug = 'java-mods'
on conflict (slug) do nothing;

insert into public.products (category_id, name, slug, description, price, version, tags)
select
  id,
  'ZeroFX — Particle Toggle',
  'zerofx',
  'Toggle-on-demand AAA particle effects with a custom animated toast notification system.',
  79,
  'v1.0',
  array['Forge', 'Mixin']
from public.categories where slug = 'java-mods'
on conflict (slug) do nothing;

-- Quick sanity check — run this after the inserts above to confirm:
-- select p.name, p.price, c.name as category from public.products p
-- join public.categories c on c.id = p.category_id;
