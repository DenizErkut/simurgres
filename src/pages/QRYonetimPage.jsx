/**
 * QR Menü Yönetimi — Her masa için QR kodu görüntüle/indir
 * Sol menü → Sistem → QR Menü
 */
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { QrCode, Download, RefreshCw, ExternalLink } from 'lucide-react'

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://simurgres.vercel.app'

export default function QRYonetimPage() {
  const [masalar, setMasalar] = useState([])
  const [salonlar, setSalonlar] = useState([])
  const [aktifSalon, setAktifSalon] = useState(null)
  const [loading, setLoading] = useState(true)
  const [yenileniyor, setYenileniyor] = useState(null)

  const yukle = useCallback(async () => {
    const [{ data: s }, { data: m }] = await Promise.all([
      supabase.from('salonlar').select('*').eq('aktif', true).order('sira'),
      supabase.from('masalar').select('*').eq('aktif', true).order('no')
    ])
    setSalonlar(s || [])
    setMasalar(m || [])
    setAktifSalon(s?.[0]?.id || null)
    setLoading(false)
  }, [])

  useEffect(() => { yukle() }, [yukle])

  // Token yenile (QR değişir)
  const tokenYenile = async (masaId) => {
    setYenileniyor(masaId)
    const yeniToken = crypto.randomUUID()
    const { error } = await supabase.from('masalar').update({ qr_token: yeniToken }).eq('id', masaId)
    if (error) toast.error('Hata: ' + error.message)
    else { toast.success('QR kodu yenilendi'); yukle() }
    setYenileniyor(null)
  }

  // QR kod SVG oluştur (native — kütüphane olmadan)
  const qrSVG = (text, size = 200) => {
    // Google Charts API URL — kütüphane olmadan
    return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(text)}&size=${size}x${size}&margin=10&format=svg&color=2C2C28&bgcolor=FAF9F7`
  }

  const filtreli = masalar.filter(m => !aktifSalon || m.salon_id === aktifSalon)

  const menuURL = (token) => `${BASE_URL}/menu/${token}`

  const qrIndir = async (masa) => {
    const url = menuURL(masa.qr_token)
    const imgUrl = qrSVG(url, 400)
    const a = document.createElement('a')
    a.href = imgUrl
    a.download = `QR_Masa_${masa.no}.svg`
    a.target = '_blank'
    a.click()
    toast.success(`Masa ${masa.no} QR kodu indiriliyor...`)
  }

  const tumunuIndir = () => {
    filtreli.forEach((m, i) => {
      if (!m.qr_token) return
      setTimeout(() => qrIndir(m), i * 300)
    })
  }

  if (loading) return <div className="loading-center"><div className="spinner" /></div>

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div>
          <div style={{ fontWeight:700, fontSize:15, display:'flex', alignItems:'center', gap:8 }}>
            <QrCode size={16} /> QR Menü Yönetimi
          </div>
          <div style={{ fontSize:12, color:'var(--text2)', marginTop:2 }}>
            Her masanın QR kodunu müşteriler menüyü görüntülemek için tarar
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={tumunuIndir}>
          <Download size={13} /> Tümünü İndir
        </button>
      </div>

      {/* Yasal uyarı */}
      <div style={{ background:'#FFF7ED', border:'1px solid #FED7AA', borderRadius:'var(--radius)', padding:'10px 14px', marginBottom:14, fontSize:12, color:'#92400E' }}>
        ⚠️ <strong>1 Temmuz 2026 düzenlemesi:</strong> Kalori, besin değerleri ve alerjen bilgileri menüde zorunlu. QR menü bu bilgileri otomatik gösterir. Ürünlerin besin değerlerini <strong>Menü → Ürünler</strong> ekranından giriniz.
      </div>

      {/* Salon filtresi */}
      <div className="pill-tabs" style={{ marginBottom:14 }}>
        {salonlar.map(s => (
          <button key={s.id} className={`pill ${aktifSalon===s.id?'active':''}`} onClick={() => setAktifSalon(s.id)}>
            {s.ad} ({masalar.filter(m=>m.salon_id===s.id).length})
          </button>
        ))}
      </div>

      {/* QR grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px,1fr))', gap:12 }}>
        {filtreli.map(m => {
          const url = m.qr_token ? menuURL(m.qr_token) : null
          return (
            <div key={m.id} className="card" style={{ padding:14, textAlign:'center' }}>
              <div style={{ fontWeight:700, fontSize:14, marginBottom:10 }}>Masa {m.no}</div>

              {url ? (
                <>
                  <img src={qrSVG(url, 160)} alt={`QR Masa ${m.no}`}
                    style={{ width:160, height:160, borderRadius:8, border:'1px solid var(--border)' }} />
                  <div style={{ fontSize:10, color:'var(--text3)', marginTop:8, wordBreak:'break-all' }}>
                    /menu/{m.qr_token?.slice(0,8)}...
                  </div>
                  <div style={{ display:'flex', gap:5, marginTop:10, justifyContent:'center' }}>
                    <button className="btn btn-ghost btn-sm" title="İndir" onClick={() => qrIndir(m)}>
                      <Download size={12} />
                    </button>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" title="Önizle">
                      <ExternalLink size={12} />
                    </a>
                    <button className="btn btn-ghost btn-sm" title="QR Kodunu Yenile (eski QR geçersiz olur)"
                      onClick={() => tokenYenile(m.id)} disabled={yenileniyor===m.id}>
                      <RefreshCw size={12} style={{ animation: yenileniyor===m.id ? 'spin .6s linear infinite' : 'none' }} />
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ padding:20, color:'var(--text3)', fontSize:12 }}>
                  <div style={{ marginBottom:8 }}>Token yok</div>
                  <button className="btn btn-ghost btn-sm" onClick={() => tokenYenile(m.id)}>Oluştur</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
