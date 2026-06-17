import { useState, useEffect, useCallback } from 'react'
import { raporlarApi } from '../lib/supabase'
import toast from 'react-hot-toast'
import { TrendingUp, ShoppingBag, Receipt, Users } from 'lucide-react'

export default function DashboardPage() {
  const [ozet, setOzet] = useState(null)
  const [saatlik, setSaatlik] = useState([])
  const [topSatan, setTopSatan] = useState([])
  const [loading, setLoading] = useState(true)

  const yukle = useCallback(async () => {
    try {
      const [o, s, t] = await Promise.all([
        raporlarApi.bugunOzet(),
        raporlarApi.saatlikCiro(),
        raporlarApi.topSatan()
      ])
      setOzet(o)
      setSaatlik(s)
      setTopSatan(t)
    } catch (e) {
      toast.error('Rapor verileri yüklenemedi')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { yukle() }, [yukle])

  if (loading) return <div className="loading-center"><div className="spinner" /><span>Rapor hazırlanıyor...</span></div>

  const maks = Math.max(...saatlik.map(s => s.ciro), 1)
  const tarih = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 14, fontWeight: 500 }}>{tarih} Raporu</span>
        <button className="btn btn-ghost btn-sm" onClick={yukle}>Yenile</button>
      </div>

      {/* STAT KARTLAR */}
      <div className="stat-grid">
        <div className="stat-kart">
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <TrendingUp size={12} /> Günlük Ciro
          </div>
          <div className="stat-val">₺{ozet?.totalCiro?.toLocaleString('tr-TR') || '0'}</div>
          <div className="stat-sub">Bugün toplam</div>
        </div>
        <div className="stat-kart">
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <ShoppingBag size={12} /> Sipariş Sayısı
          </div>
          <div className="stat-val">{ozet?.toplamSiparis || 0}</div>
          <div className="stat-sub">Tamamlanan</div>
        </div>
        <div className="stat-kart">
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Receipt size={12} /> Ort. Adisyon
          </div>
          <div className="stat-val">₺{ozet?.ortAdisyon || 0}</div>
          <div className="stat-sub">Sipariş başına</div>
        </div>
        <div className="stat-kart">
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Users size={12} /> Ödeme Dağılımı
          </div>
          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              ['Nakit', ozet?.nakit],
              ['Kart', ozet?.kart],
              ['Online', ozet?.online]
            ].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--text2)' }}>{l}</span>
                <span style={{ fontWeight: 500 }}>₺{(v || 0).toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {/* SAATLİK GRAFİK */}
        <div className="card">
          <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 4 }}>Saatlik Ciro</div>
          {saatlik.every(s => s.ciro === 0) ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)', fontSize: 13 }}>
              Henüz bugün kapatılmış sipariş yok
            </div>
          ) : (
            <div className="chart-wrap">
              {saatlik.map(s => (
                <div key={s.saat} className="chart-col">
                  <div className="chart-bar" style={{ height: `${Math.round(s.ciro / maks * 100)}%` }} />
                  <div className="chart-lbl">{s.saat}:00</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* EN ÇOK SATAN */}
        <div className="card">
          <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 10 }}>En Çok Satan Ürünler</div>
          {topSatan.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)', fontSize: 13 }}>
              Henüz satış yok
            </div>
          ) : (
            topSatan.map((u, i) => (
              <div key={u.ad} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '0.5px solid var(--border)', fontSize: 13 }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--text2)', flexShrink: 0 }}>
                  {i + 1}
                </span>
                <span style={{ flex: 1 }}>{u.ad}</span>
                <span style={{ color: 'var(--text2)', fontSize: 12 }}>{u.adet}x</span>
                <span style={{ color: 'var(--accent)', fontWeight: 500 }}>₺{u.toplam.toFixed(0)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
