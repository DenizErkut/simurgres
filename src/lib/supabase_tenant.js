/**
 * supabase_tenant.js
 * 
 * Mevcut supabase.js'i değiştirmeden tenant izolasyonu sağlar.
 * Supabase client'ını proxy'leyerek tüm sorgulara otomatik
 * tenant_id filtresi ekler.
 * 
 * Kullanım: supabase.js'te import değişikliği yok.
 * Sadece createClient yerine createTenantClient kullan.
 */
import { createClient } from '@supabase/supabase-js'

let _tenantId = null

export function setTenantId(id) {
  _tenantId = id
}

export function getTenantId() {
  return _tenantId
}

// Tenant_id gerektirmeyen tablolar
// (global config, auth tabloları, public tablolar)
const TENANT_EXEMPT = new Set([
  'tenants',
  'kullanici_profiller',
  'izin_tanimlari',        // global izin tanımları
])

// Sadece SELECT'te tenant filtresi gereken tablolar
// (INSERT/UPDATE zaten tenant_id alıyor)
const TENANT_TABLES = new Set([
  'salonlar', 'masalar', 'kategoriler', 'urunler',
  'siparisler', 'siparis_kalemleri', 'kds_bildirimler',
  'kasa_ozetleri', 'kullanicilar', 'kullanici_izinleri',
  'pin_override_log', 'platform_siparisler', 'yazici_kuyruk',
  'yazici_yonlendirmeler', 'hammaddeler', 'stok_hareketleri',
  'receteler', 'faturalar', 'fatura_kalemleri', 'tedarikciler',
  'z_raporu_log', 'cariler', 'cari_hareketleri', 'urun_resimleri',
  'qr_ziyaretler', 'okc_cihazlar', 'okc_islemler',
  'entegrasyon_ayarlari', 'urun_secenekler', 'urun_secenekler_deger',
  'siparis_kalem_ozellikler',
])

/**
 * Tenant-aware from() — mevcut supabase.from() ile aynı API
 * SELECT sorgularına otomatik .eq('tenant_id', tenantId) ekler
 * INSERT/UPDATE'e otomatik tenant_id ekler
 */
export function tenantFrom(supabaseClient, tablo) {
  const builder = supabaseClient.from(tablo)
  
  if (!_tenantId || TENANT_EXEMPT.has(tablo) || !TENANT_TABLES.has(tablo)) {
    return builder
  }

  // Orijinal metodları proxy'le
  const originalSelect = builder.select.bind(builder)
  const originalInsert = builder.insert.bind(builder)
  const originalUpdate = builder.update.bind(builder)
  const originalDelete = builder.delete.bind(builder)
  const originalUpsert = builder.upsert.bind(builder)

  builder.select = (cols = '*') => {
    return originalSelect(cols).eq('tenant_id', _tenantId)
  }

  builder.insert = (data) => {
    const withTenant = Array.isArray(data)
      ? data.map(d => ({ ...d, tenant_id: _tenantId }))
      : { ...data, tenant_id: _tenantId }
    return originalInsert(withTenant)
  }

  builder.update = (data) => {
    return originalUpdate(data).eq('tenant_id', _tenantId)
  }

  builder.delete = () => {
    return originalDelete().eq('tenant_id', _tenantId)
  }

  builder.upsert = (data, opts) => {
    const withTenant = Array.isArray(data)
      ? data.map(d => ({ ...d, tenant_id: _tenantId }))
      : { ...data, tenant_id: _tenantId }
    return originalUpsert(withTenant, opts)
  }

  return builder
}
