import { supabase } from './supabase'

// Getir API — POS Entegrasyonu
// Dok: https://developers.getir.com/food/api-documentation
// Auth: API Key tabanlı (Bearer token)
// Webhook: Getir panel → POS Entegrasyonu → Secret Key oluştur → webhook URL gir

const GETIR_BASE = 'https://api.getir.com/food'

// ─── AYARLAR ─────────────────────────────────────────────────────────────────
async function getAyarlar() {
  const { data } = await supabase
    .from('entegrasyon_ayarlari')
    .select('ayarlar, aktif')
    .eq('platform', 'getir')
    .single()
  return data || {}
}

// ─── API İSTEĞİ ──────────────────────────────────────────────────────────────
async function getirRequest(method, path, body = null) {
  const { ayarlar } = await getAyarlar()
  if (!ayarlar?.api_key) throw new Error('Getir API Key eksik')

  const res = await fetch(`${GETIR_BASE}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${ayarlar.api_key}`,
      'Content-Type': 'application/json',
      'x-application-name': 'SimurgRes'
    },
    body: body ? JSON.stringify(body) : null
  })

  if (res.status === 204) return null
  const data = await res.json()
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`)
  return data
}

// ─── SİPARİŞ İŞLEMLERİ ───────────────────────────────────────────────────────

// Sipariş onayla
export async function getirSiparisiOnayla(orderId, estimatedTime = 30) {
  return getirRequest('POST', `/v2/orders/${orderId}/confirm`, {
    estimatedDeliveryTime: estimatedTime
  })
}

// Siparişi hazır işaretle
export async function getirSiparisiHazirla(orderId) {
  return getirRequest('POST', `/v2/orders/${orderId}/ready`)
}

// Siparişi iptal et
export async function getirSiparisiIptalEt(orderId, neden) {
  return getirRequest('POST', `/v2/orders/${orderId}/cancel`, {
    cancellationReason: neden || 'RESTAURANT_CANCELLED'
  })
}

// Restoran durumu
export async function getirRestoranDurumu() {
  return getirRequest('GET', '/v2/restaurant/status')
}

export async function getirRestoranAc() {
  return getirRequest('POST', '/v2/restaurant/open')
}

export async function getirRestoranKapat(suredk = 60) {
  return getirRequest('POST', '/v2/restaurant/close', {
    durationInMinutes: suredk
  })
}

// ─── WEBHOOK İŞLEME ──────────────────────────────────────────────────────────
// Getir webhook payload → SimurgRes sipariş
export async function getirWebhookIsle(payload) {
  try {
    const orderId = payload.id || payload.orderId
    const durum = mapGetirDurum(payload.status)

    // Mevcut kayıt var mı?
    const { data: mevcut } = await supabase
      .from('platform_siparisler')
      .select('id, siparis_id')
      .eq('platform_order_id', orderId)
      .single()

    const siparisData = {
      platform: 'getir',
      platform_order_id: orderId,
      platform_order_code: payload.orderCode || payload.shortCode,
      durum,
      ham_veri: payload,
      musteri_ad: payload.client?.name || payload.customer?.name,
      musteri_telefon: payload.client?.phone || payload.customer?.phone,
      teslimat_adresi: formatAdres(payload.deliveryAddress),
      siparis_tutari: hesaplaToplam(payload.items || payload.products),
      odeme_yontemi: payload.paymentMethod,
      notlar: payload.note || payload.clientNote,
      tahmini_teslimat: payload.estimatedDeliveryTime
    }

    let platformSiparisId

    if (mevcut) {
      await supabase.from('platform_siparisler').update(siparisData).eq('id', mevcut.id)
      platformSiparisId = mevcut.id
    } else {
      const { data: yeni } = await supabase
        .from('platform_siparisler').insert(siparisData).select().single()
      platformSiparisId = yeni.id

      if (durum === 'RECEIVED') {
        await getirSimurgResSiparisOlustur(payload, platformSiparisId)
      }
    }

    return { ok: true, id: platformSiparisId }
  } catch (e) {
    console.error('Getir webhook hatası:', e)
    return { ok: false, error: e.message }
  }
}

function mapGetirDurum(status) {
  const MAP = {
    'NEW': 'RECEIVED',
    'CONFIRMED': 'READY_FOR_PICKUP',
    'PICKED_UP': 'DISPATCHED',
    'DELIVERED': 'DELIVERED',
    'CANCELLED': 'CANCELLED',
    // Alternatif format
    'new': 'RECEIVED',
    'confirmed': 'READY_FOR_PICKUP',
    'picked_up': 'DISPATCHED',
    'delivered': 'DELIVERED',
    'cancelled': 'CANCELLED',
  }
  return MAP[status] || status
}

function formatAdres(addr) {
  if (!addr) return null
  if (typeof addr === 'string') return addr
  return [addr.streetName, addr.buildingNumber, addr.district, addr.city]
    .filter(Boolean).join(', ')
}

function hesaplaToplam(items = []) {
  return items.reduce((acc, item) => {
    const fiyat = item.price || item.unitPrice || 0
    const adet = item.quantity || item.count || 1
    return acc + fiyat * adet
  }, 0)
}

async function getirSimurgResSiparisOlustur(payload, platformSiparisId) {
  const items = payload.items || payload.products || []
  const masaNo = `GT-${payload.orderCode || payload.shortCode || payload.id?.slice(-6)}`

  const kalemler = items.map(item => ({
    urun_id: null,
    urun_ad: item.name,
    urun_fiyat: item.price || item.unitPrice || 0,
    adet: item.quantity || item.count || 1,
    notlar: item.note || null,
    durum: 'bekliyor'
  }))

  const toplam = kalemler.reduce((a, k) => a + k.urun_fiyat * k.adet, 0)
  const kdv_tutar = +(toplam * 0.1).toFixed(2)

  const { data: siparis } = await supabase.from('siparisler').insert({
    masa_id: null,
    masa_no: masaNo,
    tur: 'paket',
    durum: 'acik',
    notlar: payload.note || payload.clientNote,
    toplam,
    kdv_tutar,
    genel_toplam: +(toplam + kdv_tutar).toFixed(2)
  }).select().single()

  if (siparis) {
    await supabase.from('siparis_kalemleri').insert(
      kalemler.map(k => ({ ...k, siparis_id: siparis.id }))
    )
    await supabase.from('kds_bildirimler').insert({
      siparis_id: siparis.id,
      masa_no: masaNo,
      durum: 'yeni'
    })
    await supabase.from('platform_siparisler')
      .update({ siparis_id: siparis.id })
      .eq('id', platformSiparisId)
  }
}
