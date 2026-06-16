-- ================================================
-- ADİSYON PRO - Supabase Veritabanı Şeması
-- Supabase Dashboard > SQL Editor'da çalıştırın
-- ================================================

-- UUID uzantısı (Supabase'de varsayılan gelir)
create extension if not exists "uuid-ossp";

-- ================================================
-- 1. SALONLAR
-- ================================================
create table if not exists salonlar (
  id uuid primary key default uuid_generate_v4(),
  ad text not null,
  sira integer default 0,
  aktif boolean default true,
  created_at timestamptz default now()
);

-- ================================================
-- 2. MASALAR
-- ================================================
create table if not exists masalar (
  id uuid primary key default uuid_generate_v4(),
  salon_id uuid references salonlar(id) on delete cascade,
  no text not null,
  kapasite integer default 4,
  durum text default 'bos' check (durum in ('bos','dolu','rezerve','temizleniyor')),
  aktif boolean default true,
  created_at timestamptz default now()
);

-- ================================================
-- 3. KATEGORİLER
-- ================================================
create table if not exists kategoriler (
  id uuid primary key default uuid_generate_v4(),
  ad text not null,
  emoji text default '🍽️',
  sira integer default 0,
  aktif boolean default true,
  created_at timestamptz default now()
);

-- ================================================
-- 4. ÜRÜNLER
-- ================================================
create table if not exists urunler (
  id uuid primary key default uuid_generate_v4(),
  kategori_id uuid references kategoriler(id) on delete set null,
  ad text not null,
  aciklama text,
  fiyat numeric(10,2) not null default 0,
  resim_url text,
  emoji text default '🍽️',
  stok_takip boolean default false,
  stok_adet integer default 0,
  aktif boolean default true,
  created_at timestamptz default now()
);

-- ================================================
-- 5. SİPARİŞLER
-- ================================================
create table if not exists siparisler (
  id uuid primary key default uuid_generate_v4(),
  masa_id uuid references masalar(id) on delete set null,
  masa_no text,           -- masa silinse bile kayıt kalsın
  tur text default 'masa' check (tur in ('masa','paket','gel_al')),
  durum text default 'acik' check (durum in ('acik','odendi','iptal')),
  notlar text,
  garson text,
  toplam numeric(10,2) default 0,
  kdv_tutar numeric(10,2) default 0,
  genel_toplam numeric(10,2) default 0,
  odeme_yontemi text,
  odeme_zamani timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ================================================
-- 6. SİPARİŞ KALEMLERİ
-- ================================================
create table if not exists siparis_kalemleri (
  id uuid primary key default uuid_generate_v4(),
  siparis_id uuid references siparisler(id) on delete cascade,
  urun_id uuid references urunler(id) on delete set null,
  urun_ad text not null,    -- ürün silinse bile ad kalsın
  urun_fiyat numeric(10,2) not null,
  adet integer not null default 1,
  notlar text,
  durum text default 'bekliyor' check (durum in ('bekliyor','hazirlaniyor','hazir','iptal')),
  created_at timestamptz default now()
);

-- ================================================
-- 7. KDS (MUTFAK) BİLDİRİMLERİ - Realtime için
-- ================================================
create table if not exists kds_bildirimler (
  id uuid primary key default uuid_generate_v4(),
  siparis_id uuid references siparisler(id) on delete cascade,
  masa_no text,
  durum text default 'yeni' check (durum in ('yeni','hazirlaniyor','hazir')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ================================================
-- 8. GÜNLÜK KASA ÖZETI (Raporlama)
-- ================================================
create table if not exists kasa_ozetleri (
  id uuid primary key default uuid_generate_v4(),
  tarih date not null unique,
  toplam_ciro numeric(10,2) default 0,
  toplam_siparis integer default 0,
  nakit numeric(10,2) default 0,
  kart numeric(10,2) default 0,
  online numeric(10,2) default 0,
  cari numeric(10,2) default 0,
  created_at timestamptz default now()
);

-- ================================================
-- INDEX'LER (Performans)
-- ================================================
create index if not exists idx_masalar_salon on masalar(salon_id);
create index if not exists idx_masalar_durum on masalar(durum);
create index if not exists idx_siparisler_masa on siparisler(masa_id);
create index if not exists idx_siparisler_durum on siparisler(durum);
create index if not exists idx_siparisler_created on siparisler(created_at);
create index if not exists idx_siparis_kalemleri_siparis on siparis_kalemleri(siparis_id);
create index if not exists idx_siparis_kalemleri_durum on siparis_kalemleri(durum);
create index if not exists idx_urunler_kategori on urunler(kategori_id);
create index if not exists idx_kds_durum on kds_bildirimler(durum);

-- ================================================
-- UPDATED_AT OTOMATİK GÜNCELLEME
-- ================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger siparisler_updated_at
  before update on siparisler
  for each row execute function update_updated_at();

create trigger kds_updated_at
  before update on kds_bildirimler
  for each row execute function update_updated_at();

-- ================================================
-- REALTIME ETKİNLEŞTİR
-- ================================================
alter publication supabase_realtime add table siparisler;
alter publication supabase_realtime add table siparis_kalemleri;
alter publication supabase_realtime add table kds_bildirimler;
alter publication supabase_realtime add table masalar;

-- ================================================
-- ÖRNEK VERİ
-- ================================================

-- Salonlar
insert into salonlar (ad, sira) values
  ('İç Salon', 1),
  ('Teras', 2),
  ('Paket Servis', 3)
on conflict do nothing;

-- Masalar (İç Salon için)
do $$
declare
  salon_ic uuid;
  salon_teras uuid;
  salon_paket uuid;
begin
  select id into salon_ic from salonlar where ad = 'İç Salon' limit 1;
  select id into salon_teras from salonlar where ad = 'Teras' limit 1;
  select id into salon_paket from salonlar where ad = 'Paket Servis' limit 1;

  -- İç Salon masaları
  for i in 1..10 loop
    insert into masalar (salon_id, no, kapasite)
    values (salon_ic, 'M' || i, 4)
    on conflict do nothing;
  end loop;

  -- Teras masaları
  for i in 1..6 loop
    insert into masalar (salon_id, no, kapasite)
    values (salon_teras, 'T' || i, 4)
    on conflict do nothing;
  end loop;

  -- Paket
  for i in 1..3 loop
    insert into masalar (salon_id, no, kapasite)
    values (salon_paket, 'P' || i, 1)
    on conflict do nothing;
  end loop;
end $$;

-- Kategoriler
insert into kategoriler (ad, emoji, sira) values
  ('Başlangıç', '🥗', 1),
  ('Çorbalar', '🍲', 2),
  ('Ana Yemek', '🍖', 3),
  ('Pide & Lahmacun', '🫓', 4),
  ('Salatalar', '🥙', 5),
  ('İçecekler', '🥤', 6),
  ('Tatlılar', '🍮', 7)
on conflict do nothing;

-- Ürünler
do $$
declare
  k_baslangic uuid; k_corba uuid; k_ana uuid;
  k_pide uuid; k_salata uuid; k_icecek uuid; k_tatli uuid;
begin
  select id into k_baslangic from kategoriler where ad = 'Başlangıç';
  select id into k_corba from kategoriler where ad = 'Çorbalar';
  select id into k_ana from kategoriler where ad = 'Ana Yemek';
  select id into k_pide from kategoriler where ad = 'Pide & Lahmacun';
  select id into k_salata from kategoriler where ad = 'Salatalar';
  select id into k_icecek from kategoriler where ad = 'İçecekler';
  select id into k_tatli from kategoriler where ad = 'Tatlılar';

  insert into urunler (kategori_id, ad, fiyat, emoji) values
    (k_baslangic, 'Humus', 65, '🫙'),
    (k_baslangic, 'Ezme', 55, '🌶️'),
    (k_baslangic, 'Cacık', 50, '🥒'),
    (k_corba, 'Mercimek Çorbası', 45, '🍲'),
    (k_corba, 'Domates Çorbası', 45, '🍅'),
    (k_ana, 'Izgara Köfte', 185, '🥩'),
    (k_ana, 'Tavuk Şiş', 165, '🍗'),
    (k_ana, 'Kuzu Tandır', 225, '🍖'),
    (k_ana, 'Vegetarian Makarna', 145, '🍝'),
    (k_pide, 'Kıymalı Pide', 120, '🫓'),
    (k_pide, 'Kaşarlı Pide', 110, '🧀'),
    (k_pide, 'Lahmacun', 85, '🫓'),
    (k_salata, 'Çoban Salata', 65, '🥗'),
    (k_salata, 'Mevsim Salata', 75, '🥬'),
    (k_icecek, 'Ayran', 25, '🥛'),
    (k_icecek, 'Çay', 15, '🍵'),
    (k_icecek, 'Türk Kahvesi', 55, '☕'),
    (k_icecek, 'Limonata', 45, '🍋'),
    (k_icecek, 'Kola', 40, '🥤'),
    (k_tatli, 'Künefe', 95, '🍯'),
    (k_tatli, 'Sütlaç', 75, '🍮'),
    (k_tatli, 'Baklava (2 dilim)', 85, '🥐')
  on conflict do nothing;
end $$;

-- RLS (Row Level Security) - Tüm tablolara erişim izni (anon key ile)
-- NOT: Production'da auth.uid() ile kısıtlayın
alter table salonlar enable row level security;
alter table masalar enable row level security;
alter table kategoriler enable row level security;
alter table urunler enable row level security;
alter table siparisler enable row level security;
alter table siparis_kalemleri enable row level security;
alter table kds_bildirimler enable row level security;
alter table kasa_ozetleri enable row level security;

-- Geliştirme için tüm işlemlere izin ver (sonra kısıtlanacak)
create policy "anon_all_salonlar" on salonlar for all using (true) with check (true);
create policy "anon_all_masalar" on masalar for all using (true) with check (true);
create policy "anon_all_kategoriler" on kategoriler for all using (true) with check (true);
create policy "anon_all_urunler" on urunler for all using (true) with check (true);
create policy "anon_all_siparisler" on siparisler for all using (true) with check (true);
create policy "anon_all_kalemleri" on siparis_kalemleri for all using (true) with check (true);
create policy "anon_all_kds" on kds_bildirimler for all using (true) with check (true);
create policy "anon_all_kasa" on kasa_ozetleri for all using (true) with check (true);
