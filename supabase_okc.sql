-- ÖKC/ECR Cihaz Entegrasyon Tabloları
CREATE TABLE IF NOT EXISTS okc_cihazlar (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ad text NOT NULL,
  marka text NOT NULL,
  model text,
  baglanti_tipi text DEFAULT 'tcp' CHECK (baglanti_tipi IN ('tcp','usb','serial','wifi')),
  protokol text DEFAULT 'gmp3' CHECK (protokol IN ('gmp3','hugin','inpos','verifone','pavo','generic')),
  ip_adresi text,
  port integer DEFAULT 9001,
  com_port text,
  baud_rate integer DEFAULT 115200,
  sicil_no text,
  seri_no text,
  aktif boolean DEFAULT true,
  varsayilan boolean DEFAULT false,
  ayarlar jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS okc_islemler (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  cihaz_id uuid REFERENCES okc_cihazlar(id) ON DELETE SET NULL,
  siparis_id uuid REFERENCES siparisler(id) ON DELETE SET NULL,
  islem_tipi text CHECK (islem_tipi IN ('satis','iade','iptal','x_raporu','z_raporu','test')),
  durum text DEFAULT 'bekliyor' CHECK (durum IN ('bekliyor','gonderildi','basarili','hata')),
  toplam numeric(10,2),
  fis_no text,
  hata_mesaji text,
  ham_yanit jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE okc_cihazlar ENABLE ROW LEVEL SECURITY;
ALTER TABLE okc_islemler ENABLE ROW LEVEL SECURITY;
CREATE POLICY "herkes_okc_cihaz" ON okc_cihazlar FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "herkes_okc_islem" ON okc_islemler FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER okc_cihazlar_updated_at
  BEFORE UPDATE ON okc_cihazlar
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
