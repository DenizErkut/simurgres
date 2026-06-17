-- ================================================
-- SimurgRes — Ürün Özellikleri & Seçenekler
-- ================================================

-- Ürün seçenek grupları (Cola → İçerik, Pizza → Boy)
CREATE TABLE IF NOT EXISTS urun_secenekler (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  urun_id uuid REFERENCES urunler(id) ON DELETE CASCADE,
  kategori_id uuid REFERENCES kategoriler(id) ON DELETE CASCADE,
  grup_ad text NOT NULL,          -- "İçerik", "Boy", "Pişirme"
  zorunlu boolean DEFAULT false,   -- Seçim zorunlu mu?
  coklu_secim boolean DEFAULT false, -- Birden fazla seçilebilir mi?
  sira integer DEFAULT 0,
  aktif boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Seçenek değerleri (Diet, Zero, Normal)
CREATE TABLE IF NOT EXISTS urun_secenekler_deger (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  secenekler_id uuid REFERENCES urun_secenekler(id) ON DELETE CASCADE,
  deger text NOT NULL,              -- "Diet", "Zero", "Az Yağlı"
  fiyat_fark numeric(10,2) DEFAULT 0, -- Fiyat farkı (0 = ücretsiz)
  varsayilan boolean DEFAULT false,
  sira integer DEFAULT 0,
  aktif boolean DEFAULT true
);

-- Sipariş kalemi özellikleri (seçilen değerler)
CREATE TABLE IF NOT EXISTS siparis_kalem_ozellikler (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  siparis_kalem_id uuid REFERENCES siparis_kalemleri(id) ON DELETE CASCADE,
  grup_ad text NOT NULL,
  deger text NOT NULL,
  fiyat_fark numeric(10,2) DEFAULT 0
);

-- RLS
ALTER TABLE urun_secenekler ENABLE ROW LEVEL SECURITY;
ALTER TABLE urun_secenekler_deger ENABLE ROW LEVEL SECURITY;
ALTER TABLE siparis_kalem_ozellikler ENABLE ROW LEVEL SECURITY;
CREATE POLICY "herkes_secenekler" ON urun_secenekler FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "herkes_secenekler_deger" ON urun_secenekler_deger FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "herkes_kalem_ozellik" ON siparis_kalem_ozellikler FOR ALL USING (true) WITH CHECK (true);

-- Index
CREATE INDEX IF NOT EXISTS idx_secenekler_urun ON urun_secenekler(urun_id);
CREATE INDEX IF NOT EXISTS idx_secenekler_kat ON urun_secenekler(kategori_id);
CREATE INDEX IF NOT EXISTS idx_secenekler_deger ON urun_secenekler_deger(secenekler_id);
CREATE INDEX IF NOT EXISTS idx_kalem_ozellik ON siparis_kalem_ozellikler(siparis_kalem_id);
