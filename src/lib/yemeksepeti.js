import { supabase } from './supabase'

const YS_BASE = 'https://yemeksepeti.partner.deliveryhero.io'

// ─── TOKEN YÖNETİMİ ──────────────────────────────────────────────────────────
let tokenCache = { token: null, expiresAt: 0 }

async function getAyarlar() {
  const { data } = await supabase
    .from('entegrasyon_ayarlari')
    .select('ayarlar')
    .eq('platform', 'yemeksepeti')
    .single()
  return data?.ayarlar || {}
}

async function saveToken(token, expiresIn) {
  const expiresAt = Date.now() + (expiresIn - 60) * 1000 // 60sn erken expire
  tokenCache = { token, expiresAt }
  const { data: mevcut } = await supabase
    .from('entegrasyon_ayarlari')
    .select('ayarlar')
    .eq('platform', 'yemeksepeti')
    .single()
  await supabase.from('entegrasyon_ayarlari').update({
    ayarlar: { ...mevcut?.ayarlar, access_token: token, token_expires_at: expiresAt }
  }).eq('platform', 'yemeksepeti')
}

export async function getToken() {
  // Cache'de geçerli token var mı?
  if (tokenCache.token && Date.now() < tokenCache.expiresAt) return tokenCache.token

  const ayarlar = await getAyarlar()

  // DB'de kayıtlı token var mı?
  if (ayarlar.access_token && ayarlar.token_expires_at > Date.now()) {
    tokenCache = { token: ayarlar.access_token, expiresAt: ayarlar.token_expires_at }
    return ayarlar.access_token
  }

  // Yeni token al
  if (!ayarlar.client_id || !ayarlar.client_secret) throw new Error('Yemeksepeti credentials eksik')

  const res = await fetch(`${YS_BASE}/v2/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: ayarlar.client_id,
      client_secret: ayarlar.client_secret
    })
  })

  if (!res.ok) throw new Error(`Token alınamadı: ${res.status}`)
  const data = await res.json()
  await saveToken(data.access_token, data.expires_in)
  return data.access_token
}

async function ysRequest(method, path, body = null) {
  const token = await getToken()
  const ayarlar = await getAyarlar()
  const url = `${YS_BASE}${path}`
    .replace('{chain_id}', ayarlar.chain_id)
    .replace('{vendor_id}', ayarlar.vendor_id)

  const res = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : null
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `HTTP ${res.status}`)
  }
  return res.status === 204 ? null : res.json()
}

// ─── SİPARİŞ FONKSİYONLARI ──────────────────────────────────────────────────

// Sipariş detayı getir
export async function ysGetSiparis(orderId) {
  const ayarlar = await getAyarlar()
  return ysRequest('GET', `/v2/chains/${ayarlar.chain_id}/orders/${orderId}`)
}

// Siparişleri listele (son 50)
export async function ysGetSiparisler() {
  return ysRequest('GET', '/v2/chains/{chain_id}/vendors/{vendor_id}/orders?limit=50')
}

// Sipariş durumu güncelle
export async function ysUpdateDurum(orderId, status, items = []) {
  const ayarlar = await getAyarlar()
  return ysRequest('PUT', `/v2/chains/${ayarlar.chain_id}/orders/${orderId}`, {
    order_id: orderId,
    status,
    items
  })
}

// Siparişi onayla (RECEIVED → READY_FOR_PICKUP)
export async function ysSiparisiOnayla(orderId, items) {
  return ysUpdateDurum(orderId, 'READY_FOR_PICKUP', items)
}

// Siparişi iptal et
export async function ysSiparisiIptalEt(orderId, items, neden) {
  return ysUpdateDurum(orderId, 'CANCELLED', items.map(i => ({
    ...i,
    status: 'CANCELLED',
    cancellation: { reason: neden || 'RESTAURANT_CANCELLED' }
  })))
}

// Outlet durumu
export async function ysGetOutletDurum() {
  return ysRequest('GET', '/v2/chains/{chain_id}/vendors/{vendor_id}/status')
}

export async function ysOutletAc() {
  return ysRequest('PUT', '/v2/chains/{chain_id}/vendors/{vendor_id}/status', { status: 'OPEN' })
}

export async function ysOutletKapat(suredk = 60) {
  return ysRequest('PUT', '/v2/chains/{chain_id}/vendors/{vendor_id}/status', {
    status: 'CLOSED',
    temporary_closure_minutes: suredk
  })
}

// ─── WEBHOOK İŞLEME ──────────────────────────────────────────────────────────
// Yemeksepeti webhook gelince çağrılır — siparişi DB'ye kaydeder ve SimurgRes'e ekler
export async function webhookSiparisiIsle(ysOrder) {
  try {
    // 1. Platform siparişi kaydet
    const { data: mevcut } = await supabase
      .from('platform_siparisler')
      .select('id')
      .eq('platform_order_id', ysOrder.order_id)
      .single()

    const siparisData = {
      platform: 'yemeksepeti',
      platform_order_id: ysOrder.order_id,
      platform_order_code: ysOrder.order_code,
      durum: ysOrder.status,
      ham_veri: ysOrder,
      musteri_ad: ysOrder.customer?.name,
      musteri_telefon: ysOrder.customer?.phone,
      teslimat_adresi: ysOrder.customer?.delivery_address?.formatted_address,
      siparis_tutari: ysOrder.items?.reduce((a, i) => a + (i.pricing?.total || 0), 0),
      odeme_yontemi: ysOrder.payment?.type,
      notlar: ysOrder.comment,
      tahmini_teslimat: ysOrder.promised_for
    }

    let platformSiparisId

    if (mevcut) {
      // Güncelle
      await supabase.from('platform_siparisler').update(siparisData).eq('id', mevcut.id)
      platformSiparisId = mevcut.id
    } else {
      // Yeni sipariş — SimurgRes'e de ekle
      const { data: yeni } = await supabase.from('platform_siparisler').insert(siparisData).select().single()
      platformSiparisId = yeni.id

      if (ysOrder.status === 'RECEIVED') {
        await simurgResSiparisOlustur(ysOrder, platformSiparisId)
      }
    }

    return { ok: true, id: platformSiparisId }
  } catch (e) {
    console.error('Webhook işleme hatası:', e)
    return { ok: false, error: e.message }
  }
}

// Yemeksepeti siparişini SimurgRes siparişine çevir
async function simurgResSiparisOlustur(ysOrder, platformSiparisId) {
  // Paket servisi için uygun masa bul veya oluştur
  const { data: paketMasa } = await supabase
    .from('masalar')
    .select('id, no')
    .ilike('no', 'YS%')
    .limit(1)
    .single()

  const masaId = paketMasa?.id || null
  const masaNo = `YS-${ysOrder.order_code}`

  // Kalemleri çevir
  const kalemler = (ysOrder.items || []).map(item => ({
    urun_id: null, // SKU eşleşmesi yapılabilir
    urun_ad: item.name,
    urun_fiyat: item.pricing?.unit_price || 0,
    adet: 1,
    notlar: item.instructions || null,
    durum: 'bekliyor'
  }))

  const toplam = kalemler.reduce((a, k) => a + k.urun_fiyat * k.adet, 0)
  const kdv_tutar = +(toplam * 10 / 110).toFixed(2)  // iç KDV

  const { data: siparis } = await supabase.from('siparisler').insert({
    masa_id: masaId,
    masa_no: masaNo,
    tur: 'paket',
    durum: 'acik',
    notlar: ysOrder.comment,
    toplam,
    kdv_tutar,
    genel_toplam: +(toplam)  // KDV dahil
  }).select().single()

  if (siparis) {
    // Kalemleri ekle
    await supabase.from('siparis_kalemleri').insert(
      kalemler.map(k => ({ ...k, siparis_id: siparis.id }))
    )
    // KDS bildirimi
    await supabase.from('kds_bildirimler').insert({
      siparis_id: siparis.id,
      masa_no: masaNo,
      durum: 'yeni'
    })
    // Platform siparişini güncelle
    await supabase.from('platform_siparisler')
      .update({ siparis_id: siparis.id })
      .eq('id', platformSiparisId)
  }
}
