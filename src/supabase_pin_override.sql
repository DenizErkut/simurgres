-- ================================================
-- SimurgRes — PIN Override / Şifre Zorunlu Sistemi
-- ================================================

-- izin_tanimlari tablosuna sifre_zorunlu kolonu ekle
ALTER TABLE izin_tanimlari ADD COLUMN IF NOT EXISTS sifre_zorunlu boolean DEFAULT false;

-- kullanici_izinleri tablosuna da sifre_zorunlu ekle (kullanıcı bazlı override)
ALTER TABLE kullanici_izinleri ADD COLUMN IF NOT EXISTS sifre_zorunlu boolean DEFAULT false;

-- PIN override log tablosu
CREATE TABLE IF NOT EXISTS pin_override_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  islem text NOT NULL,
  yapan_kullanici_id uuid REFERENCES kullanicilar(id) ON DELETE SET NULL,
  onaylayan_kullanici_id uuid REFERENCES kullanicilar(id) ON DELETE SET NULL,
  masa_no text,
  detay jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pin_override_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "herkes_pin_log" ON pin_override_log FOR ALL USING (true) WITH CHECK (true);
