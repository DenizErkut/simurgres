# SimurgRes — Kurulum & Yayınlama Rehberi

## 1. Gereksinimler
- Node.js 18+
- Supabase hesabı (supabase.com — ücretsiz)
- GitHub hesabı (deployment için)

---

## 2. Supabase Kurulumu

### 2a. Proje Oluştur
1. https://supabase.com → New Project
2. Proje adı: `simurgres`, bölge: Frankfurt (eu-central-1)
3. Güçlü şifre belirleyin

### 2b. Veritabanı Tablolarını Oluştur
Supabase → SQL Editor'da sırasıyla çalıştırın:
1. `supabase_schema.sql` → Ana tablolar
2. `supabase_custom_auth.sql` → Kullanıcı sistemi
3. `supabase_permissions.sql` → İzin sistemi
4. `supabase_entegrasyon.sql` → Platform entegrasyonları (YS, Getir, Trendyol, Migros)
5. `supabase_okc.sql` → ÖKC cihaz tabloları

### 2c. API Bilgilerini Al
Supabase → Settings → API:
- **Project URL** → `VITE_SUPABASE_URL`
- **anon/public key** → `VITE_SUPABASE_ANON_KEY`

---

## 3. Yerel Geliştirme

```bash
git clone https://github.com/KULLANICI/simurgres.git
cd simurgres
npm install
cp .env.example .env
# .env içine Supabase bilgilerini girin
npm run dev
# → http://localhost:5173
```

---

## 4. Vercel ile Yayınlama (Önerilen — Ücretsiz)

### 4a. GitHub'a Yükle
```bash
git init
git add .
git commit -m "SimurgRes v1.0"
git remote add origin https://github.com/KULLANICI/simurgres.git
git push -u origin main
```

### 4b. Vercel'e Deploy Et
1. https://vercel.com → New Project → GitHub repoyu seçin
2. Framework: **Vite** (otomatik algılar)
3. Environment Variables ekleyin:
   - `VITE_SUPABASE_URL` = `https://xxx.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `eyJ...`
4. **Deploy** tıklayın → ~2 dakikada canlı!

### 4c. Custom Domain (opsiyonel)
Vercel → Project → Settings → Domains → alan adınızı ekleyin

---

## 5. Netlify ile Yayınlama (Alternatif)

```bash
npm run build
npx netlify-cli deploy --prod --dir=dist
```

Veya Netlify dashboard → New site → GitHub repo seçin → Environment variables ekleyin.

---

## 6. Supabase Realtime Ayarı

Supabase → Database → Replication:
Şu tablolar için INSERT+UPDATE+DELETE aktif olmalı:
- `masalar`, `siparisler`, `siparis_kalemleri`
- `kds_bildirimler`, `platform_siparisler`

---

## 7. İlk Kullanım

1. Uygulamayı açın → Giriş ekranı gelir
2. Varsayılan yönetici: **admin / PIN: 1234**
3. Yönetim → Kullanıcılar → PIN'leri değiştirin
4. Yönetim → Salonlar & Masalar → Kendi masa düzeninizi kurun
5. Menü → Kategoriler ve ürünleri ekleyin

---

## 8. Modüller

| Sekme | Rol | Açıklama |
|-------|-----|----------|
| Garson | Garson+ | Masa seçimi, sipariş alma, transfer |
| Mutfak | Garson+ | KDS - realtime sipariş takip |
| Kasiyer | Kasiyer+ | Ödeme, iade, bölünmüş ödeme, Alman usulü |
| Menü | Yönetici | Ürün & kategori yönetimi |
| Rapor | Yönetici | Günlük ciro, saatlik grafik, top ürünler |
| Yönetim | Yönetici | Salon/masa, kullanıcı, izin yönetimi |
| Yemeksepeti | Kasiyer+ | Platform siparişleri (webhook) |
| Getir | Kasiyer+ | Platform siparişleri (webhook) |
| Trendyol | Kasiyer+ | Platform siparişleri (polling 60sn) |
| Migros | Kasiyer+ | Platform siparişleri (webhook+polling) |
| ÖKC / ECR | Yönetici | 8 marka yazarkasa entegrasyonu |

---

## 9. Vercel Otomatik Deploy

`main` branch'e push yapınca Vercel otomatik deploy eder.
Ortalama deploy süresi: **45 saniye**.

