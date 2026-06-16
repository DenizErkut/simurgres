-- ================================================
-- SimurgRes — Granüler İzin Sistemi
-- Supabase SQL Editor'da çalıştırın
-- ================================================

-- İzin tanımları tablosu
CREATE TABLE IF NOT EXISTS izin_tanimlari (
  id text PRIMARY KEY,
  grup text NOT NULL,
  label text NOT NULL,
  aciklama text,
  sira integer DEFAULT 0
);

-- Kullanıcı izinleri (kullanici_id + izin_id = unique)
CREATE TABLE IF NOT EXISTS kullanici_izinleri (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  kullanici_id uuid REFERENCES kullanicilar(id) ON DELETE CASCADE,
  izin_id text REFERENCES izin_tanimlari(id) ON DELETE CASCADE,
  aktif boolean DEFAULT true,
  UNIQUE(kullanici_id, izin_id)
);

-- RLS
ALTER TABLE izin_tanimlari ENABLE ROW LEVEL SECURITY;
ALTER TABLE kullanici_izinleri ENABLE ROW LEVEL SECURITY;
CREATE POLICY "herkes_okur_izin_tanim" ON izin_tanimlari FOR SELECT USING (true);
CREATE POLICY "herkes_izin" ON kullanici_izinleri FOR ALL USING (true) WITH CHECK (true);

-- ─── İZİN TANIMLARI ───────────────────────────────────────────────────────────
INSERT INTO izin_tanimlari (id, grup, label, aciklama, sira) VALUES
  -- SİPARİŞ
  ('siparis_al',         'Sipariş',   'Sipariş alma',              'Masaya yeni sipariş ekleyebilir', 1),
  ('siparis_iptal',      'Sipariş',   'Sipariş iptali',            'Mutfağa gönderilmiş siparişi iptal edebilir', 2),
  ('kalem_sil',          'Sipariş',   'Kalem silme',               'Sepetten ürün silebilir', 3),
  ('not_ekle',           'Sipariş',   'Sipariş notu',              'Siparişe not ekleyebilir', 4),

  -- ÖDEME
  ('hesap_kapat',        'Ödeme',     'Hesap kapatma',             'Ödeme alıp adisyonu kapatabilir', 10),
  ('indirim_uygula',     'Ödeme',     'İndirim uygulama',          'Adisyona yüzde veya sabit indirim yapabilir', 11),
  ('iade_al',            'Ödeme',     'İade alma',                 'Ödeme iadesi yapabilir', 12),
  ('ucretsiz_urun',      'Ödeme',     'Ücretsiz ürün',             'Ürünü ücretsiz olarak işaretleyebilir', 13),
  ('nakit_odeme',        'Ödeme',     'Nakit ödeme',               'Nakit ödeme alabilir', 14),
  ('kart_odeme',         'Ödeme',     'Kredi kartı ödemesi',       'Kart ile ödeme alabilir', 15),
  ('cari_odeme',         'Ödeme',     'Cari hesap ödemesi',        'Cari hesaba yazabilir', 16),
  ('bolunmus_odeme',     'Ödeme',     'Bölünmüş ödeme',            'Birden fazla yöntemle ödeme alabilir', 17),

  -- TRANSFER
  ('masa_transfer',      'Transfer',  'Masa transferi',            'Siparişi başka masaya taşıyabilir', 20),
  ('urun_transfer',      'Transfer',  'Ürün transferi',            'Masadan masaya ürün aktarabilir', 21),
  ('masa_birlestir',     'Transfer',  'Masa birleştirme',          'İki masanın adisyonunu birleştirebilir', 22),

  -- MUTFAK
  ('kds_goruntule',      'Mutfak',    'Mutfak ekranı',             'KDS ekranını görebilir', 30),
  ('kds_durum_guncelle', 'Mutfak',    'Sipariş durumu güncelleme', 'Siparişi hazırlandı / hazır yapabilir', 31),
  ('kds_iptal',          'Mutfak',    'Mutfak iptali',             'Mutfaktan sipariş iptal edebilir', 32),

  -- RAPOR
  ('rapor_gunluk',       'Rapor',     'Günlük rapor',              'Bugünün raporunu görebilir', 40),
  ('rapor_haftalik',     'Rapor',     'Haftalık rapor',            'Geçmiş raporlara erişebilir', 41),
  ('rapor_kasa',         'Rapor',     'Kasa raporu',               'Ödeme yöntemi dağılımını görebilir', 42),
  ('rapor_ciro',         'Rapor',     'Ciro detayı',               'Gelir detaylarını görebilir', 43),

  -- YÖNETİM
  ('menu_duzenle',       'Yönetim',   'Menü düzenleme',            'Ürün ekleyip fiyat değiştirebilir', 50),
  ('masa_yonet',         'Yönetim',   'Masa yönetimi',             'Masa ekleyip silebilir', 51),
  ('kullanici_yonet',    'Yönetim',   'Kullanıcı yönetimi',        'Kullanıcı ekleyip düzenleyebilir', 52),
  ('sistem_ayarlari',    'Yönetim',   'Sistem ayarları',           'Genel ayarlara erişebilir', 53)

ON CONFLICT (id) DO NOTHING;

-- ─── VARSAYILAN İZİNLER ───────────────────────────────────────────────────────
-- Garson varsayılan izinleri
CREATE OR REPLACE FUNCTION garson_varsayilan_izinler(p_kullanici_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO kullanici_izinleri (kullanici_id, izin_id, aktif)
  VALUES
    (p_kullanici_id, 'siparis_al',         true),
    (p_kullanici_id, 'kalem_sil',          true),
    (p_kullanici_id, 'not_ekle',           true),
    (p_kullanici_id, 'kds_goruntule',      true),
    (p_kullanici_id, 'siparis_iptal',      false),
    (p_kullanici_id, 'hesap_kapat',        false),
    (p_kullanici_id, 'indirim_uygula',     false),
    (p_kullanici_id, 'iade_al',            false),
    (p_kullanici_id, 'ucretsiz_urun',      false),
    (p_kullanici_id, 'masa_transfer',      false),
    (p_kullanici_id, 'urun_transfer',      false),
    (p_kullanici_id, 'masa_birlestir',     false),
    (p_kullanici_id, 'nakit_odeme',        false),
    (p_kullanici_id, 'kart_odeme',         false),
    (p_kullanici_id, 'cari_odeme',         false),
    (p_kullanici_id, 'bolunmus_odeme',     false),
    (p_kullanici_id, 'kds_durum_guncelle', true),
    (p_kullanici_id, 'kds_iptal',          false),
    (p_kullanici_id, 'rapor_gunluk',       false),
    (p_kullanici_id, 'rapor_haftalik',     false),
    (p_kullanici_id, 'rapor_kasa',         false),
    (p_kullanici_id, 'rapor_ciro',         false),
    (p_kullanici_id, 'menu_duzenle',       false),
    (p_kullanici_id, 'masa_yonet',         false),
    (p_kullanici_id, 'kullanici_yonet',    false),
    (p_kullanici_id, 'sistem_ayarlari',    false)
  ON CONFLICT (kullanici_id, izin_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Kasiyer varsayılan izinleri
CREATE OR REPLACE FUNCTION kasiyer_varsayilan_izinler(p_kullanici_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO kullanici_izinleri (kullanici_id, izin_id, aktif)
  VALUES
    (p_kullanici_id, 'siparis_al',         true),
    (p_kullanici_id, 'kalem_sil',          true),
    (p_kullanici_id, 'not_ekle',           true),
    (p_kullanici_id, 'siparis_iptal',      true),
    (p_kullanici_id, 'hesap_kapat',        true),
    (p_kullanici_id, 'indirim_uygula',     false),
    (p_kullanici_id, 'iade_al',            true),
    (p_kullanici_id, 'ucretsiz_urun',      false),
    (p_kullanici_id, 'masa_transfer',      true),
    (p_kullanici_id, 'urun_transfer',      true),
    (p_kullanici_id, 'masa_birlestir',     true),
    (p_kullanici_id, 'nakit_odeme',        true),
    (p_kullanici_id, 'kart_odeme',         true),
    (p_kullanici_id, 'cari_odeme',         false),
    (p_kullanici_id, 'bolunmus_odeme',     true),
    (p_kullanici_id, 'kds_goruntule',      true),
    (p_kullanici_id, 'kds_durum_guncelle', true),
    (p_kullanici_id, 'kds_iptal',          false),
    (p_kullanici_id, 'rapor_gunluk',       true),
    (p_kullanici_id, 'rapor_haftalik',     false),
    (p_kullanici_id, 'rapor_kasa',         true),
    (p_kullanici_id, 'rapor_ciro',         false),
    (p_kullanici_id, 'menu_duzenle',       false),
    (p_kullanici_id, 'masa_yonet',         false),
    (p_kullanici_id, 'kullanici_yonet',    false),
    (p_kullanici_id, 'sistem_ayarlari',    false)
  ON CONFLICT (kullanici_id, izin_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Yönetici: tüm izinler açık
CREATE OR REPLACE FUNCTION yonetici_varsayilan_izinler(p_kullanici_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO kullanici_izinleri (kullanici_id, izin_id, aktif)
  SELECT p_kullanici_id, id, true FROM izin_tanimlari
  ON CONFLICT (kullanici_id, izin_id) DO UPDATE SET aktif = true;
END;
$$ LANGUAGE plpgsql;

-- Mevcut kullanıcılara varsayılan izinleri ata
DO $$
DECLARE k RECORD;
BEGIN
  FOR k IN SELECT id, rol FROM kullanicilar LOOP
    IF k.rol = 'garson' THEN PERFORM garson_varsayilan_izinler(k.id);
    ELSIF k.rol = 'kasiyer' THEN PERFORM kasiyer_varsayilan_izinler(k.id);
    ELSIF k.rol = 'yonetici' THEN PERFORM yonetici_varsayilan_izinler(k.id);
    END IF;
  END LOOP;
END $$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE kullanici_izinleri;
