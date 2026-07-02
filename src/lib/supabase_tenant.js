/**
 * supabase_tenant.js — Tenant-aware Supabase query helper
 * 
 * Kullanım:
 *   import { tq } from '../lib/supabase_tenant'
 *   const { data } = await tq('urunler').select('*')
 *   // otomatik .eq('tenant_id', aktifTenantId) ekler
 */
import { supabase } from './supabase'

let _tenantId = null

export function setTenantId(id) {
  _tenantId = id
}

export function getTenantId() {
  return _tenantId
}

/**
 * Tenant filtreli sorgu başlatıcı
 * supabase.from() ile aynı API, otomatik tenant filtresi ekler
 */
export function tq(tablo) {
  if (!_tenantId) throw new Error('Tenant ID set edilmemiş')
  return {
    select: (cols = '*') =>
      supabase.from(tablo).select(cols).eq('tenant_id', _tenantId),
    insert: (data) => {
      const kayit = Array.isArray(data)
        ? data.map(d => ({ ...d, tenant_id: _tenantId }))
        : { ...data, tenant_id: _tenantId }
      return supabase.from(tablo).insert(kayit)
    },
    update: (data) =>
      supabase.from(tablo).update(data).eq('tenant_id', _tenantId),
    delete: () =>
      supabase.from(tablo).delete().eq('tenant_id', _tenantId),
    upsert: (data, opts) => {
      const kayit = Array.isArray(data)
        ? data.map(d => ({ ...d, tenant_id: _tenantId }))
        : { ...data, tenant_id: _tenantId }
      return supabase.from(tablo).upsert(kayit, opts)
    }
  }
}
