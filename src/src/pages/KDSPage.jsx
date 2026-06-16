import { useState, useEffect, useCallback } from 'react'
import { kdsApi, realtimeApi } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Clock, CheckCircle, Flame } from 'lucide-react'

function Sure({ createdAt }) {
  const [dk, setDk] = useState(0)
  useEffect(() => {
    const hesapla = () => {
      const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)
      setDk(diff)
    }
    hesapla()
    const id = setInterval(hesapla, 30000)
    return () => clearInterval(id)
  }, [createdAt])
  return (
    <span className={`kds-kart-sure ${dk >= 15 ? 'h' : ''}`}
      style={dk >= 20 ? { color: '#c0392b', fontWeight: 600 } : {}}>
      <Clock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
      {dk} dk
    </span>
  )
}

export default function KDSPage() {
  const [siparisler, setSiparisler] = useState([])
  const [loading, setLoading] = useState(true)
  const [tamamlanan, setTamamlanan] = useState(0)

  const yukle = useCallback(async () => {
    try {
      const data = await kdsApi.getAktif()
      setSiparisler(data)
    } catch (e) {
      toast.error('KDS verileri yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    yukle()
    const sub = realtimeApi.kdsSubscribe(yukle)
    return () => realtimeApi.unsubscribe(sub)
  }, [yukle])

  const durumDegistir = async (kds, yeniDurum) => {
    try {
      await kdsApi.updateDurum(kds.id, yeniDurum)
      if (yeniDurum === 'hazir') {
        setTamamlanan(t => t + 1)
        toast.success(`${kds.masa_no} siparişi hazır! 🍽️`)
      }
      await yukle()
    } catch (e) {
      toast.error('Durum güncellenemedi')
    }
  }

  const bekleyen = siparisler.filter(s => s.durum === 'yeni').length
  const hazirlanan = siparisler.filter(s => s.durum === 'hazirlaniyor').length

  if (loading) return <div className="loading-center"><div className="spinner" /><span>Mutfak yükleniyor...</span></div>

  return (
    <div>
      {/* İstatistik bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        {[
          { label: 'Bekleyen', val: bekleyen, color: '#5DCAA5', bg: '#E1F5EE' },
          { label: 'Hazırlanan', val: hazirlanan, color: '#BA7517', bg: '#FAEEDA' },
          { label: 'Tamamlanan', val: tamamlanan, color: '#1D9E75', bg: '#E1F5EE' }
        ].map(s => (
          <div key={s.label} className="stat-kart" style={{ flex: 1, textAlign: 'center', borderLeft: `3px solid ${s.color}` }}>
            <div style={{ fontSize: 24, fontWeight: 600, color: s.color }}>{s.val}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {siparisler.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 60 }}>
          <CheckCircle size={48} style={{ margin: '0 auto 12px', opacity: .3, display: 'block' }} />
          <p>Bekleyen sipariş yok — Mutfak müsait!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {siparisler.map(kds => {
            const yeni = kds.durum === 'yeni'
            const kalemler = kds.siparisler?.siparis_kalemleri || []
            return (
              <div key={kds.id} className="kds-kart">
                <div className={yeni ? 'kds-header-yeni' : 'kds-header-hazirlaniyor'}>
                  <div>
                    <div className={`kds-kart-masa ${yeni ? '' : 'h'}`}>
                      {kds.masa_no}
                      {kds.siparisler?.tur === 'paket' && (
                        <span style={{ fontSize: 10, marginLeft: 6, opacity: .8 }}>📦 Paket</span>
                      )}
                    </div>
                  </div>
                  <Sure createdAt={kds.created_at} />
                </div>

                <div className="kds-kart-body">
                  {Object.values(
                    kalemler.reduce((acc, k) => {
                      const key = k.urun_ad
                      if (acc[key]) acc[key].adet += k.adet
                      else acc[key] = { ...k }
                      return acc
                    }, {})
                  ).map(k => (
                    <div key={k.urun_ad} className="kds-urun-satir">
                      <span className="kds-adet-badge">{k.adet}</span>
                      <span style={{ flex: 1 }}>{k.urun_ad}</span>
                      {k.notlar && <span style={{ fontSize: 10, color: 'var(--text2)', fontStyle: 'italic' }}>{k.notlar}</span>}
                    </div>
                  ))}
                </div>

                <div className="kds-kart-footer">
                  {yeni ? (
                    <button className="btn btn-sm" style={{ flex: 1 }}
                      onClick={() => durumDegistir(kds, 'hazirlaniyor')}>
                      <Flame size={12} /> Hazırlanıyor
                    </button>
                  ) : (
                    <button className="btn btn-sm" style={{ flex: 1, opacity: .5 }} disabled>
                      <Flame size={12} /> Hazırlanıyor
                    </button>
                  )}
                  <button className="btn btn-success btn-sm" style={{ flex: 1 }}
                    onClick={() => durumDegistir(kds, 'hazir')}>
                    <CheckCircle size={12} /> Hazır ✓
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
