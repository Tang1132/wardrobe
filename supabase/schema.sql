-- ============================================================
--  电子衣橱 · Supabase 初始化脚本
--  使用方式：Supabase Dashboard → SQL Editor → 粘贴整段 → Run
--  脚本可重复执行（幂等）
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. 衣物表 clothes
-- ------------------------------------------------------------
create table if not exists public.clothes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name         text not null,
  category     text not null default '其他',
  seasons      text[] not null default '{四季}',
  color        text,
  notes        text,
  image_path   text,
  thumb_path   text,
  is_favorite  boolean not null default false,
  created_at   timestamptz not null default now()
);

-- 兼容旧库：补充缩略图与多季节字段
alter table public.clothes add column if not exists thumb_path text;
alter table public.clothes add column if not exists seasons text[] not null default '{四季}';

-- 旧库迁移：把单季节 season 转成 seasons 数组后删除旧列
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'clothes' and column_name = 'season'
  ) then
    execute 'update public.clothes set seasons = array[season] where season is not null';
    execute 'alter table public.clothes drop column season';
  end if;
end $$;

-- 已下线的字段：品牌 / 购买价格 / 购买日期 / 标签
alter table public.clothes drop column if exists brand;
alter table public.clothes drop column if exists price;
alter table public.clothes drop column if exists purchased_at;
alter table public.clothes drop column if exists tags;

-- 约束：分类新增 背心 / 开衫
alter table public.clothes drop constraint if exists clothes_category_check;
alter table public.clothes add constraint clothes_category_check
  check (category in ('上衣', '背心', '开衫', '裤子', '外套', '裙装', '鞋靴', '配饰', '其他'));

-- 约束：季节取值合法（数组，可多选）
alter table public.clothes drop constraint if exists clothes_seasons_check;
alter table public.clothes add constraint clothes_seasons_check
  check (seasons <@ array['春', '夏', '秋', '冬', '四季']::text[]);

create index if not exists clothes_user_id_idx on public.clothes (user_id);
create index if not exists clothes_category_idx on public.clothes (user_id, category);

-- ------------------------------------------------------------
-- 2. 穿搭表 outfits
-- ------------------------------------------------------------
create table if not exists public.outfits (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null,
  notes      text,
  tags       text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists outfits_user_id_idx on public.outfits (user_id);

-- 3. 穿搭-衣物 关联表（多对多）
create table if not exists public.outfit_items (
  outfit_id uuid not null references public.outfits (id) on delete cascade,
  cloth_id  uuid not null references public.clothes (id) on delete cascade,
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  primary key (outfit_id, cloth_id)
);

create index if not exists outfit_items_cloth_idx on public.outfit_items (cloth_id);

-- ------------------------------------------------------------
-- 4. 穿着日历表 wear_logs（每人每天记录一套穿搭）
-- ------------------------------------------------------------
create table if not exists public.wear_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  outfit_id  uuid references public.outfits (id) on delete set null,
  worn_on    date not null default current_date,
  note       text,
  created_at timestamptz not null default now(),
  unique (user_id, worn_on)
);

create index if not exists wear_logs_user_date_idx on public.wear_logs (user_id, worn_on);

-- ============================================================
-- 5. 行级安全策略 RLS
-- ============================================================
alter table public.clothes     enable row level security;
alter table public.outfits     enable row level security;
alter table public.outfit_items enable row level security;
alter table public.wear_logs   enable row level security;

-- clothes
drop policy if exists "clothes_select_own" on public.clothes;
drop policy if exists "clothes_insert_own" on public.clothes;
drop policy if exists "clothes_update_own" on public.clothes;
drop policy if exists "clothes_delete_own" on public.clothes;

create policy "clothes_select_own" on public.clothes
  for select to authenticated using (auth.uid() = user_id);
create policy "clothes_insert_own" on public.clothes
  for insert to authenticated with check (auth.uid() = user_id);
create policy "clothes_update_own" on public.clothes
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "clothes_delete_own" on public.clothes
  for delete to authenticated using (auth.uid() = user_id);

-- outfits
drop policy if exists "outfits_select_own" on public.outfits;
drop policy if exists "outfits_insert_own" on public.outfits;
drop policy if exists "outfits_update_own" on public.outfits;
drop policy if exists "outfits_delete_own" on public.outfits;

create policy "outfits_select_own" on public.outfits
  for select to authenticated using (auth.uid() = user_id);
create policy "outfits_insert_own" on public.outfits
  for insert to authenticated with check (auth.uid() = user_id);
create policy "outfits_update_own" on public.outfits
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "outfits_delete_own" on public.outfits
  for delete to authenticated using (auth.uid() = user_id);

-- outfit_items
drop policy if exists "outfit_items_select_own" on public.outfit_items;
drop policy if exists "outfit_items_insert_own" on public.outfit_items;
drop policy if exists "outfit_items_update_own" on public.outfit_items;
drop policy if exists "outfit_items_delete_own" on public.outfit_items;

create policy "outfit_items_select_own" on public.outfit_items
  for select to authenticated using (auth.uid() = user_id);
create policy "outfit_items_insert_own" on public.outfit_items
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.clothes c where c.id = cloth_id and c.user_id = auth.uid())
    and exists (select 1 from public.outfits o where o.id = outfit_id and o.user_id = auth.uid())
  );
create policy "outfit_items_update_own" on public.outfit_items
  for update to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.clothes c where c.id = cloth_id and c.user_id = auth.uid())
    and exists (select 1 from public.outfits o where o.id = outfit_id and o.user_id = auth.uid())
  );
create policy "outfit_items_delete_own" on public.outfit_items
  for delete to authenticated using (auth.uid() = user_id);

-- wear_logs
drop policy if exists "wear_logs_select_own" on public.wear_logs;
drop policy if exists "wear_logs_insert_own" on public.wear_logs;
drop policy if exists "wear_logs_update_own" on public.wear_logs;
drop policy if exists "wear_logs_delete_own" on public.wear_logs;

create policy "wear_logs_select_own" on public.wear_logs
  for select to authenticated using (auth.uid() = user_id);
create policy "wear_logs_insert_own" on public.wear_logs
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and (
      outfit_id is null
      or exists (select 1 from public.outfits o where o.id = outfit_id and o.user_id = auth.uid())
    )
  );
create policy "wear_logs_update_own" on public.wear_logs
  for update to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      outfit_id is null
      or exists (select 1 from public.outfits o where o.id = outfit_id and o.user_id = auth.uid())
    )
  );
create policy "wear_logs_delete_own" on public.wear_logs
  for delete to authenticated using (auth.uid() = user_id);

-- 授予 authenticated 角色表权限（RLS 仍然生效）
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.clothes      to authenticated;
grant select, insert, update, delete on public.outfits      to authenticated;
grant select, insert, update, delete on public.outfit_items to authenticated;
grant select, insert, update, delete on public.wear_logs    to authenticated;

-- ============================================================
-- 6. Storage Bucket：clothing-images
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'clothing-images',
  'clothing-images',
  true,
  10485760, -- 10MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
  set public = true,
      file_size_limit = 10485760,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

-- 公开读取（图片通过 public URL 展示）
drop policy if exists "clothing_images_public_read" on storage.objects;
create policy "clothing_images_public_read" on storage.objects
  for select using (bucket_id = 'clothing-images');

-- 仅允许在「自己的 uid 目录」下上传 / 覆盖 / 删除
drop policy if exists "clothing_images_insert_own" on storage.objects;
create policy "clothing_images_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'clothing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "clothing_images_update_own" on storage.objects;
create policy "clothing_images_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'clothing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "clothing_images_delete_own" on storage.objects;
create policy "clothing_images_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'clothing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
