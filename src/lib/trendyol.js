import { supabase } from './supabase'

// Trendyol Partner API
// Auth: Basic Authentication (supplierId:apiKey base64)
// Dok: https://developers.trendyol.com
// Base: https://apigw.trendyol.com/integration

const TY_BASE = 'https://apigw.trendyol.com/integration'

async function getAyarlar() {
  const { data } = await supabase
    .from('entegrasyon_ayarlari')
    .select('ayarlar, aktif')
    .eq('platform', 'trendyol')
    .single()
  return data || {}
}

async function tyRequest(method, path, body = null) {
  const { ayarlar } = await getAyarlar()
  if (!ayarlar?.api_key || !ayarlar?.api_secret || !ayarlar?.seller_id) {
    throw new Error('Trendyol API bilgileri eksik')
  }

  // Basic Auth: Base64(apiKey:apiSecret)
  const credentials = btoa(`${ayarlar.api_key}:${ayarlar.api_secret}`)
  const userAgent = `${ayarlar.seller_id} - SimurgRes`

  const res = await fetch(`${TY_BASE}${path}`, {
    method,
    headers: {
      'Authorization': `Basic ${credentials}`,
      'User-Agent': userAgent,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : null
  })

  if (res.status === 204) return null
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.message || data?.errors?.[0]?.message || `HTTP ${res.status}`)
  return data
}

// ─── SİPARİŞ OKUMA ───────────────────────────────────────────────────────────
export async function tyGetSiparisler(status = 'Created', page = 0, size = 50) {
  const { ayarlar } = await getAyarlar()
  const sellerId = ayarlar?.seller_id
  if (!sellerId) throw new Error('Seller ID eksik')

  const params = new URLSearchParams({
    status,
    page: String(page),
    size: String(size),
    orderByField: 'PackageLastModifiedDate',
    orderByDirection: 'DESC'
  })

  return tyRequest('GET', `/order/sellers/${sellerId}/orders?${params}`)
}

// Belirli bir sipariş paketi
export async function tyGetSiparis(packageId) {
  const { ayarlar } = await getAyarlar()
  return tyRequest('GET', `/order/sellers/${ayarlar.seller_id}/orders?shipmentPackageIds=${packageId}`)
}

// ─── DURUM GÜNCELLEME ────────────────────────────────────────────────────────
// Picking = İşleme alındı
export async function tySiparisiIslemAl(packageId, lines) {
  const { ayarlar } = await getAyarlar()
  return tyRequest('PUT', `/order/sellers/${ayarlar.seller_id}/shipment-packages/${packageId}`, {
    lines,
    params: {},
    status: 'Picking'
  })
}

// Invoiced = Hazırlandı / Fatura kesildi
export async function tySiparisiHazirla(packageId, lines, invoiceNumber) {
  const { ayarlar } = await getAyarlar()
  return tyRequest('PUT', `/order/sellers/${ayarlar.seller_id}/shipment-packages/${packageId}`, {
    lines,
    params: invoiceNumber ? { invoiceNumber } : {},
    status: 'Invoiced'
  })
}

// ─── İPTAL ───────────────────────────────────────────────────────────────────
// Trendyol'da marketplace siparişlerinde iptal supplier tarafından yapılamaz
// Stok yoksa "UnSupplied" bildirimi yapılır
export async function tySiparisiTedarikEdememe(packageId, lines) {
  const { ayarlar } = await getAyarlar()
  return tyRequest('PUT', `/order/sellers/${ayarlar.seller_id}/shipment-packages/${packageId}`, {
    lines,
    params: {},
    status: 'UnSupplied'
  })
}

// ─── WEBHOOK İŞLEME ──────────────────────────────────────────────────────────
// Not: Trendyol Marketplace webhookları kargo siparişleri içindir (gıda değil)
// Trendyol Yemek ayrı bir platform — bu entegrasyon Trendyol Marketplace içindir
// Polling ile sipariş çekme daha yaygın kullanılır
export async function tyWebhookIsle(payload) {
  try {
    const packageId = String(payload.shipmentPackageId || payload.id)
    const status = payload.shipmentPackageStatus || payload.status

    const { data: mevcut } = await supabase
      .from('platform_siparisler')
      .select('id')
      .eq('platform_order_id', packageId)
      .single()

    const siparisData = {
      platform: 'trendyol',
      platform_order_id: packageId,
      platform_order_code: String(payload.orderNumber || packageId),
      durum: mapTrendyolDurum(status),
      ham_veri: payload,
      musteri_ad: `${payload.customerFirstName || ''} ${payload.customerLastName || ''}`.trim(),
      musteri_telefon: null,
      teslimat_adresi: formatTyAdres(payload.shipmentAddress),
      siparis_tutari: payload.packageTotalPrice || payload.packageGrossAmount,
      odeme_yontemi: 'Trendyol',
      notlar: null,
      tahmini_teslimat: payload.estimatedDeliveryEndDate
        ? new Date(payload.estimatedDeliveryEndDate).toISOString() : null
    }

    let platformSiparisId

    if (mevcut) {
      await supabase.from('platform_siparisler').update(siparisData).eq('id', mevcut.id)
      platformSiparisId = mevcut.id
    } else {
      const { data: yeni } = await supabase
        .from('platform_siparisler').insert(siparisData).select().single()
      platformSiparisId = yeni.id

      if (siparisData.durum === 'RECEIVED') {
        await tySimurgResSiparisOlustur(payload, platformSiparisId)
      }
    }

    return { ok: true, id: platformSiparisId }
  } catch (e) {
    console.error('Trendyol webhook hatası:', e)
    return { ok: false, error: e.message }
  }
}

// Polling ile yeni siparişleri çek ve DB'ye kaydet
export async function tySiparisleriSenkronize() {
  const siparisler = await tyGetSiparisler('Created')
  const content = siparisler?.content || []
  let yeni = 0

  for (const pkg of content) {
    const packageId = String(pkg.shipmentPackageId)
    const { data: mevcut } = await supabase
      .from('platform_siparisler')
      .select('id')
      .eq('platform_order_id', packageId)
      .single()

    if (!mevcut) {
      const { data: eklendi } = await supabase.from('platform_siparisler').insert({
        platform: 'trendyol',
        platform_order_id: packageId,
        platform_order_code: String(pkg.orderNumber),
        durum: 'RECEIVED',
        ham_veri: pkg,
        musteri_ad: `${pkg.customerFirstName || ''} ${pkg.customerLastName || ''}`.trim(),
        teslimat_adresi: formatTyAdres(pkg.shipmentAddress),
        siparis_tutari: pkg.packageTotalPrice || pkg.packageGrossAmount,
        odeme_yontemi: 'Trendyol',
        tahmini_teslimat: pkg.estimatedDeliveryEndDate
          ? new Date(pkg.estimatedDeliveryEndDate).toISOString() : null
      }).select().single()

      if (eklendi) {
        await tySimurgResSiparisOlustur(pkg, eklendi.id)
        yeni++
      }
    }
  }
  return { yeni, toplam: content.length }
}

function mapTrendyolDurum(status) {
  const MAP = {
    'Created': 'RECEIVED',
    'Picking': 'READY_FOR_PICKUP',
    'Invoiced': 'READY_FOR_PICKUP',
    'Shipped': 'DISPATCHED',
    'Delivered': 'DELIVERED',
    'Cancelled': 'CANCELLED',
    'UnSupplied': 'CANCELLED',
    'Returned': 'CANCELLED',
  }
  return MAP[status] || status
}

function formatTyAdres(addr) {
  if (!addr) return null
  return [
    addr.address1,
    addr.district,
    addr.city,
    addr.postalCode
  ].filter(Boolean).join(', ')
}

async function tySimurgResSiparisOlustur(pkg, platformSiparisId) {
  const lines = pkg.lines || []
  const masaNo = `TY-${pkg.orderNumber}`

  const kalemler = lines.map(line => ({
    urun_id: null,
    urun_ad: line.productName?.substring(0, 100) || 'Ürün',
    urun_fiyat: line.lineUnitPrice || line.lineGrossAmount || 0,
    adet: line.quantity || 1,
    notlar: null,
    durum: 'bekliyor'
  }))

  const toplam = kalemler.reduce((a, k) => a + k.urun_fiyat * k.adet, 0)
  const kdv_tutar = +(toplam * 10 / 110).toFixed(2)  // iç KDV

  const { data: siparis } = await supabase.from('siparisler').insert({
    masa_no: masaNo,
    tur: 'paket',
    durum: 'acik',
    toplam,
    kdv_tutar,
    genel_toplam: +(toplam)  // KDV dahil
  }).select().single()

  if (siparis) {
    await supabase.from('siparis_kalemleri').insert(
      kalemler.map(k => ({ ...k, siparis_id: siparis.id }))
    )
    await supabase.from('kds_bildirimler').insert({
      siparis_id: siparis.id, masa_no: masaNo, durum: 'yeni'
    })
    await supabase.from('platform_siparisler')
      .update({ siparis_id: siparis.id })
      .eq('id', platformSiparisId)
  }
}
