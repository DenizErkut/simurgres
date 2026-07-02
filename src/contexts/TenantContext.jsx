/**
 * TenantContext — Aktif tenant'ı uygulama genelinde yönetir
 * 
 * Subdomain'den tenant slug'ı okur:
 *   anteplioglu.simurgres.com → slug = 'anteplioglu'
 *   localhost:5173 → slug = 'default' (geliştirme)
 */
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const TenantCtx = createContext(null)

function slugBul() {
  const host = window.location.hostname
  // localhost veya simurgres.vercel.app → default
  if (host === 'localhost' || host.includes('vercel.app') || host.includes('simurgres.com') === false) {
    return 'default'
  }
  // anteplioglu.simurgres.com → 'anteplioglu'
  return host.split('.')[0]
}

export function TenantProvider({ children }) {
  const [tenant, setTenant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hata, setHata] = useState(null)

  useEffect(() => {
    const slug = slugBul()
    supabase
      .from('tenants')
      .select('*')
      .eq('slug', slug)
      .eq('aktif', true)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setHata(`Tenant bulunamadı: ${slug}`)
        } else {
          setTenant(data)
        }
        setLoading(false)
      })
  }, [])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:32, marginBottom:12 }}>🔄</div>
        <div style={{ color:'#888' }}>Yükleniyor...</div>
      </div>
    </div>
  )

  if (hata) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
      <div style={{ textAlign:'center', color:'#D85A30' }}>
        <div style={{ fontSize:32, marginBottom:12 }}>⚠️</div>
        <div>{hata}</div>
      </div>
    </div>
  )

  return <TenantCtx.Provider value={tenant}>{children}</TenantCtx.Provider>
}

export function useTenant() {
  return useContext(TenantCtx)
}
