-- Supabase 用テーブル定義（supabase SQL エディタなどで実行してください）

create table if not exists public.lost_items (
  id uuid primary key default gen_random_uuid(),
  management_number text not null,
  status text not null check (status in ('保管中', '警察へ', '返還', '廃棄')),
  found_at timestamptz not null,
  category text not null,
  location text not null,
  name text not null,
  description text,
  face_photo_url text,
  photo_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_lost_items_status on public.lost_items(status);
create index if not exists idx_lost_items_found_at on public.lost_items(found_at);

