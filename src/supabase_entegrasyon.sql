-- ================================================
-- SimurgRes — Yemeksepeti Entegrasyonu
-- Supabase SQL Editor'da çalıştırın
-- ================================================

-- Entegrasyon ayarları tablosu
CREATE TABLE IF NOT EXISTS entegrasyon_ayarlari (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform text NOT NULL UNIQUE,  -- 'yemeksepeti', 'getir' vb.
  aktif boolean DEFAULT false,
  ayarlar jsonb DEFAULT '{}'::jsonb,  -- client_id, client_secret, chain_id, vendor_id
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Platform siparişleri (Yemeksepeti'den gelen)
CREATE TABLE IF NOT EXISTS platform_siparisler (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform text NOT NULL,
  platform_order_id text NOT NULL UNIQUE,
  platform_order_code text,
  durum text DEFAULT 'RECEIVED',
  siparis_id uuid REFERENCES siparisler(id) ON DELETE SET NULL,
  ham_veri jsonb,  -- Yemeksepeti'nin gönderdiği tüm data
  musteri_ad text,
  musteri_telefon text,
  teslimat_adresi text,
  siparis_tutari numeric(10,2),
  odeme_yontemi text,
  notlar text,
  tahmini_teslimat timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE entegrasyon_ayarlari ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_siparisler ENABLE ROW LEVEL SECURITY;
CREATE POLICY "herkes_entegrasyon" ON entegrasyon_ayarlari FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "herkes_platform_siparis" ON platform_siparisler FOR ALL USING (true) WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE platform_siparisler;

-- Yemeksepeti ayarı başlangıç kaydı
INSERT INTO entegrasyon_ayarlari (platform, aktif, ayarlar) VALUES
('yemeksepeti', false, '{"client_id":"","client_secret":"","chain_id":"","vendor_id":"","access_token":"","token_expires_at":0}')
ON CONFLICT (platform) DO NOTHING;

-- updated_at trigger
CREATE TRIGGER platform_siparisler_updated_at
  BEFORE UPDATE ON platform_siparisler
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER entegrasyon_updated_at
  BEFORE UPDATE ON entegrasyon_ayarlari
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_platform_siparis_platform ON platform_siparisler(platform);
CREATE INDEX IF NOT EXISTS idx_platform_siparis_durum ON platform_siparisler(durum);
CREATE INDEX IF NOT EXISTS idx_platform_siparis_created ON platform_siparisler(created_at);

-- Getir entegrasyon kaydı ekle
INSERT INTO entegrasyon_ayarlari (platform, aktif, ayarlar) VALUES
('getir', false, '{"api_key":"","restaurant_id":""}')
ON CONFLICT (platform) DO NOTHING;

-- Trendyol entegrasyon kaydı
INSERT INTO entegrasyon_ayarlari (platform, aktif, ayarlar) VALUES
('trendyol', false, '{"seller_id":"","api_key":"","api_secret":""}')
ON CONFLICT (platform) DO NOTHING;
