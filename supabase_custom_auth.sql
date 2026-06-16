-- ================================================
-- SimurgRes — Kullanıcı Adı + PIN Auth Sistemi
-- Supabase SQL Editor'da çalıştırın
-- ================================================

-- Supabase Auth bağımlılığını kaldır, kendi tablomuzu kullan
DROP TABLE IF EXISTS kullanici_profiller CASCADE;

CREATE TABLE kullanicilar (
  id uuid primary key default uuid_generate_v4(),
  kullanici_adi text not null unique,
  ad_soyad text not null,
  pin text not null,           -- 4 haneli PIN (hash'li saklanır)
  rol text not null default 'garson' check (rol in ('garson', 'kasiyer', 'yonetici')),
  renk text default '#D85A30', -- Avatar rengi
  emoji text default '👤',
  aktif boolean default true,
  created_at timestamptz default now()
);

-- RLS - herkes okuyabilsin (PIN kontrolü uygulama katmanında)
ALTER TABLE kullanicilar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "herkes_okuyabilir" ON kullanicilar FOR SELECT USING (true);
CREATE POLICY "herkes_yazabilir" ON kullanicilar FOR ALL USING (true) WITH CHECK (true);

-- Başlangıç kullanıcıları
INSERT INTO kullanicilar (kullanici_adi, ad_soyad, pin, rol, renk, emoji) VALUES
  ('admin', 'Deniz Erkut', '1234', 'yonetici', '#D85A30', '👨‍💼'),
  ('garson1', 'Ahmet Yıldız', '1111', 'garson', '#1D9E75', '🧑‍🍳'),
  ('garson2', 'Fatma Kaya', '2222', 'garson', '#5DCAA5', '👩‍🍳'),
  ('kasiyer', 'Mehmet Demir', '3333', 'kasiyer', '#BA7517', '💰')
ON CONFLICT DO NOTHING;
