import { supabase } from './supabase'

// Migros Yemek (Alacarte) POS Entegrasyonu
// Panel: https://restoran.migrosonline.com
// Auth: API Key (Bearer)
// Kimlikler: API Key + Store Group ID + Store ID
// Webhook tabanlı — Migros sipariş gelince POST atar

const MY_BASE = 'https://api.migrosonline.com'

async function getAyarlar() {
  const { data } = await supabase
    .from('entegrasyon_ayarlari')
    .select('ayarlar, aktif')
    .eq('platform', 'migros')
    .single()
  return data || {}
}

async function migrosRequest(method, path, body = null) {
  const { ayarlar } = await getAyarlar()
  if (!ayarlar?.api_key) throw new Error('Migros API Key eksik')
  const res = await fetch(`${MY_BASE}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${ayarlar.api_key}`,
      'x-store-group-id': ayarlar.store_group_id || '',
      'x-store-id': ayarlar.store_id || '',
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: body ? JSON.stringify(body) : null
  })
  if (res.status === 204) return null
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.message || data?.error || `HTTP ${res.status}`)
  return data
}

export async function migrosGetSiparisler() {
  const { ayarlar } = await getAyarlar()
  return migrosRequest('GET',
    `/api/v1/orders?storeGroupId=${ayarlar.store_group_id}&storeId=${ayarlar.store_id}&status=NEW&limit=50`
  )
}

export async function migrosSiparisiOnayla(orderId, tahminiSure = 30) {
  return migrosRequest('PUT', `/api/v1/orders/${orderId}/status`, {
    status: 'ACCEPTED', estimatedDeliveryTime: tahminiSure
  })
}

export async function migrosSiparisiHazirla(orderId) {
  return migrosRequest('PUT', `/api/v1/orders/${orderId}/status`, { status: 'READY' })
}

export async function migrosSiparisiIptalEt(orderId, neden) {
  return migrosRequest('PUT', `/api/v1/orders/${orderId}/status`, {
    status: 'CANCELLED', cancellationReason: neden || 'RESTAURANT_CANCELLED'
  })
}

export async function migrosRestoranDurumu() {
  return migrosRequest('GET', '/api/v1/restaurant/status')
}

export async function migrosRestoranAc() {
  return migrosRequest('PUT', '/api/v1/restaurant/status', { status: 'OPEN' })
}

export async function migrosRestoranKapat(suredk = 60) {
  return migrosRequest('PUT', '/api/v1/restaurant/status', { status: 'CLOSED', closureMinutes: suredk })
}

export async function migrosWebhookIsle(payload) {
  try {
    const orderId = String(payload.orderId || payload.id || payload.order?.id)
    const durum = mapMigrosDurum(payload.status || payload.orderStatus)
    const items = payload.items || payload.orderItems || payload.products || []
    const { data: mevcut } = await supabase.from('platform_siparisler')
      .select('id').eq('platform_order_id', orderId).single()

    const siparisData = {
      platform: 'migros', platform_order_id: orderId,
      platform_order_code: payload.orderCode || orderId.slice(-6),
      durum, ham_veri: payload,
      musteri_ad: formatMusteriAd(payload),
      musteri_telefon: payload.customer?.phone || null,
      teslimat_adresi: formatMigrosAdres(payload),
      siparis_tutari: hesaplaMigrosToplam(items, payload),
      odeme_yontemi: payload.paymentMethod || payload.payment?.type || 'Online',
      notlar: payload.note || payload.customerNote || null,
    }

    let platformSiparisId
    if (mevcut) {
      await supabase.from('platform_siparisler').update(siparisData).eq('id', mevcut.id)
      platformSiparisId = mevcut.id
    } else {
      const { data: yeni } = await supabase.from('platform_siparisler').insert(siparisData).select().single()
      platformSiparisId = yeni.id
      if (durum === 'RECEIVED') await migrosSimurgResSiparisOlustur(payload, platformSiparisId, items)
    }
    return { ok: true, id: platformSiparisId }
  } catch (e) {
    console.error('Migros webhook hatası:', e)
    return { ok: false, error: e.message }
  }
}

export async function migrosSiparisleriSenkronize() {
  const data = await migrosGetSiparisler()
  const siparisler = data?.orders || data?.content || []
  let yeni = 0
  for (const order of siparisler) {
    const orderId = String(order.orderId || order.id)
    const { data: mevcut } = await supabase.from('platform_siparisler')
      .select('id').eq('platform_order_id', orderId).single()
    if (!mevcut) {
      const items = order.items || order.orderItems || []
      const { data: eklendi } = await supabase.from('platform_siparisler').insert({
        platform: 'migros', platform_order_id: orderId,
        platform_order_code: order.orderCode || orderId.slice(-6),
        durum: 'RECEIVED', ham_veri: order,
        musteri_ad: formatMusteriAd(order),
        teslimat_adresi: formatMigrosAdres(order),
        siparis_tutari: hesaplaMigrosToplam(items, order),
        odeme_yontemi: order.paymentMethod || 'Online',
        notlar: order.note || null
      }).select().single()
      if (eklendi) { await migrosSimurgResSiparisOlustur(order, eklendi.id, items); yeni++ }
    }
  }
  return { yeni, toplam: siparisler.length }
}

function mapMigrosDurum(status) {
  const MAP = {
    'NEW':'RECEIVED','ACCEPTED':'READY_FOR_PICKUP','READY':'READY_FOR_PICKUP',
    'PICKED_UP':'DISPATCHED','ON_THE_WAY':'DISPATCHED',
    'DELIVERED':'DELIVERED','CANCELLED':'CANCELLED','REJECTED':'CANCELLED'
  }
  return MAP[status] || MAP[status?.toUpperCase()] || status
}

function formatMusteriAd(p) {
  if (p.customer?.firstName) return `${p.customer.firstName} ${p.customer.lastName || ''}`.trim()
  return p.customer?.name || p.deliveryInfo?.name || null
}

function formatMigrosAdres(p) {
  const addr = p.deliveryAddress || p.address || p.customer?.address
  if (!addr) return null
  if (typeof addr === 'string') return addr
  return [addr.street, addr.buildingNo, addr.district, addr.city].filter(Boolean).join(', ')
}

function hesaplaMigrosToplam(items, p) {
  if (p.totalPrice) return p.totalPrice
  if (p.orderTotal) return p.orderTotal
  return items.reduce((a, item) => a + (item.price || item.unitPrice || 0) * (item.quantity || 1), 0)
}

async function migrosSimurgResSiparisOlustur(payload, platformSiparisId, items) {
  const masaNo = `MY-${payload.orderCode || String(payload.id || '').slice(-6)}`
  const kalemler = items.map(item => ({
    urun_id: null,
    urun_ad: item.name || item.productName || 'Ürün',
    urun_fiyat: item.price || item.unitPrice || 0,
    adet: item.quantity || item.count || 1,
    notlar: item.note || item.specialRequest || null,
    durum: 'bekliyor'
  }))
  const toplam = kalemler.reduce((a, k) => a + k.urun_fiyat * k.adet, 0)
  const kdv_tutar = +(toplam * 10 / 110).toFixed(2)  // iç KDV
  const { data: siparis } = await supabase.from('siparisler').insert({
    masa_no: masaNo, tur: 'paket', durum: 'acik',
    notlar: payload.note || null, toplam, kdv_tutar,
    genel_toplam: +(toplam)  // KDV dahil
  }).select().single()
  if (siparis) {
    await supabase.from('siparis_kalemleri').insert(kalemler.map(k => ({ ...k, siparis_id: siparis.id })))
    await supabase.from('kds_bildirimler').insert({ siparis_id: siparis.id, masa_no: masaNo, durum: 'yeni' })
    await supabase.from('platform_siparisler').update({ siparis_id: siparis.id }).eq('id', platformSiparisId)
  }
}
