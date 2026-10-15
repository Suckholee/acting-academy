-- 김정태 연기아카데미 Supabase CMS & 상담 관리 마이그레이션

-- 1. CMS 사이트 콘텐츠 테이블
create table if not exists public.academy_cms (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  revision bigint not null default 0,
  updated_at timestamptz not null default now()
);

-- 초기 기본 행 생성
insert into public.academy_cms(key, value)
values ('pages', '{}'::jsonb)
on conflict (key) do nothing;

-- RLS 활성화
alter table public.academy_cms enable row level security;

-- 누구나 사이트 콘텐츠를 읽을 수 있도록 허용 (anon, authenticated)
create policy "Allow public read access on academy_cms"
  on public.academy_cms for select
  using (true);

-- 관리자 라이브 편집 저장을 위한 수정/삽입 허용
create policy "Allow all updates on academy_cms"
  on public.academy_cms for update
  using (true)
  with check (true);

create policy "Allow all inserts on academy_cms"
  on public.academy_cms for insert
  with check (true);

-- 2. 상담 신청 내역 테이블
create table if not exists public.academy_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  purposes jsonb not null default '[]'::jsonb,
  courses jsonb not null default '[]'::jsonb,
  consent boolean not null default true,
  status text not null default '신규',
  memo text not null default '',
  created_at timestamptz not null default now()
);

-- RLS 활성화
alter table public.academy_inquiries enable row level security;

-- 방문자가 상담 신청 폼을 등록할 수 있도록 허용 (anon insert)
create policy "Allow public insert on academy_inquiries"
  on public.academy_inquiries for insert
  with check (true);

-- 관리 패널에서 상담 내역을 조회/수정할 수 있도록 허용
create policy "Allow public select on academy_inquiries"
  on public.academy_inquiries for select
  using (true);

create policy "Allow public update on academy_inquiries"
  on public.academy_inquiries for update
  using (true)
  with check (true);

-- 3. 이미지 미디어 버킷 설정
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'academy-site-media',
  'academy-site-media',
  true,
  5242880, -- 5MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
on conflict (id) do nothing;

-- 스토리지 public 읽기 및 업로드 허용 정책
create policy "Public Access on academy-site-media"
  on storage.objects for select
  using (bucket_id = 'academy-site-media');

create policy "Public Upload on academy-site-media"
  on storage.objects for insert
  with check (bucket_id = 'academy-site-media');

create policy "Public Update on academy-site-media"
  on storage.objects for update
  using (bucket_id = 'academy-site-media');
