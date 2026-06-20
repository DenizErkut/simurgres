import { useState, useEffect, useCallback, useMemo } from 'react'
import { urunlerApi, kategorilerApi } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Save, RotateCcw, TrendingUp, TrendingDown, Percent, Search } from 'lucide-react'

const para = (v) => `₺${(v||0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function FiyatGuncellePage() {
  const [urunler, setUrunler] = useState([])
  const [kategoriler, setKategoriler] = useState([])
  const [aktifKat, setAktifKat] = useState('tumu')
  const [yeniFiyatlar, setYeniFiyatlar] = useState({}) // urun_id -> string değer (input içeriği)
  const [aramaMetni, setAramaMetni] = useState('')
  const [loading, setLoading] = useState(true)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [topluYuzde, setTopluYuzde] = useState('')

  const yukle = useCallback(async () => {
    setLoading(true)
    const [u, k] = await Promise.all([urunlerApi.getAll(), kategorilerApi.getAll()])
    setUrunler(u || [])
    setKategoriler(k || [])
    setYeniFiyatlar({})
    setLoading(false)
  }, [])

  useEffect(() => { yukle() }, [yukle])

  const filtreli = useMemo(() => {
    return urunler
      .filter(u => aktifKat === 'tumu' || u.kategori_id === aktifKat)
      .filter(u => u.ad.toLowerCase().includes(aramaMetni.toLowerCase()))
      .sort((a, b) => a.ad.localeCompare(b.ad, 'tr'))
  }, [urunler, aktifKat, aramaMetni])

  const fiyatDegistir = (urunId, deger) => {
    setYeniFiyatlar(prev => ({ ...prev, [urunId]: deger }))
  }

  const yuzdeHesapla = (eskiFiyat, yeniDeger) => {
    if (yeniDeger === '' || yeniDeger === undefined) return null
    const yeni = parseFloat(yeniDeger)
    if (isNaN(yeni) || eskiFiyat === 0) return null
    return ((yeni - eskiFiyat) / eskiFiyat) * 100
  }

  // Bu kategorideki tüm ürünlere toplu yüzde uygula
  const topluUygula = () => {
    const yuzde = parseFloat(topluYuzde)
    if (isNaN(yuzde)) { toast.error('Geçerli bir yüzde girin'); return }
    const guncellenecekler = {}
    filtreli.forEach(u => {
      const yeniFiyat = u.fiyat * (1 + yuzde / 100)
      guncellenecekler[u.id] = (Math.round(yeniFiyat * 100) / 100).toFixed(2)
    })
    setYeniFiyatlar(prev => ({ ...prev, ...guncellenecekler }))
    toast.success(`${filtreli.length} ürüne %${yuzde} uygulandı (henüz kaydedilmedi)`)
  }

  // Sadece bu görünümdeki değişiklikleri temizle
  const sifirla = () => {
    const temizlenecek = { ...yeniFiyatlar }
    filtreli.forEach(u => delete temizlenecek[u.id])
    setYeniFiyatlar(temizlenecek)
  }

  const degisikSayisi = useMemo(() => {
    return Object.entries(yeniFiyatlar).filter(([id, val]) => {
      if (val === '') return false
      const urun = urunler.find(u => u.id === id)
      if (!urun) return false
      const yeni = parseFloat(val)
      return !isNaN(yeni) && yeni !== urun.fiyat
    }).length
  }, [yeniFiyatlar, urunler])

  const kaydet = async () => {
    const degisiklikler = Object.entries(yeniFiyatlar)
      .map(([id, val]) => {
        const urun = urunler.find(u => u.id === id)
        const yeni = parseFloat(val)
        if (!urun || val === '' || isNaN(yeni) || yeni === urun.fiyat || yeni < 0) return null
        return { id, fiyat: yeni, ad: urun.ad }
      })
      .filter(Boolean)

    if (degisiklikler.length === 0) { toast.error('Kaydedilecek bir değişiklik yok'); return }

    setKaydediliyor(true)
    try {
      const sonuclar = await urunlerApi.topluFiyatGuncelle(degisiklikler)
      const basarisizlar = sonuclar.filter(s => !s.basarili)
      if (basarisizlar.length > 0) {
        toast.error(`${basarisizlar.length} ürün güncellenemedi`)
      } else {
        toast.success(`${degisiklikler.length} ürünün fiyatı güncellendi`)
      }
      await yukle()
    } catch (e) {
      toast.error('Hata: ' + e.message)
    } finally {
      setKaydediliyor(false)
    }
  }

  if (loading) return <div className="loading-center"><div className="spinner" /></div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Fiyat Güncelleme</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
            {urunler.length} ürün {degisikSayisi > 0 && <span style={{ color: 'var(--accent)', fontWeight: 600 }}> · {degisikSayisi} değişiklik bekliyor</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {degisikSayisi > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={sifirla}>
              <RotateCcw size={13} /> Bu Görünümü Sıfırla
            </button>
          )}
          <button className="btn btn-primary" onClick={kaydet} disabled={kaydediliyor || degisikSayisi === 0}>
            <Save size={14} /> {kaydediliyor ? 'Kaydediliyor...' : `Kaydet (${degisikSayisi})`}
          </button>
        </div>
      </div>

      {/* Kategori sekmeleri */}
      <div className="pill-tabs" style={{ marginBottom: 12 }}>
        <button className={`pill ${aktifKat === 'tumu' ? 'active' : ''}`} onClick={() => setAktifKat('tumu')}>
          Tümü ({urunler.length})
        </button>
        {kategoriler.map(k => {
          const sayi = urunler.filter(u => u.kategori_id === k.id).length
          return (
            <button key={k.id} className={`pill ${aktifKat === k.id ? 'active' : ''}`} onClick={() => setAktifKat(k.id)}>
              {k.emoji} {k.ad} ({sayi})
            </button>
          )
        })}
      </div>

      {/* Arama + Toplu yüzde uygulama */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input value={aramaMetni} onChange={e => setAramaMetni(e.target.value)}
            placeholder="Ürün ara..." style={{ paddingLeft: 32, width: '100%' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface2)', padding: '6px 10px', borderRadius: 'var(--radius)' }}>
          <Percent size={13} color="var(--text2)" />
          <input type="number" value={topluYuzde} onChange={e => setTopluYuzde(e.target.value)}
            placeholder="örn. 10 veya -5" style={{ width: 90, border: 'none', background: 'transparent', padding: '2px 4px' }} />
          <button className="btn btn-ghost btn-sm" onClick={topluUygula} disabled={topluYuzde === ''}>
            Görünüme Uygula
          </button>
        </div>
      </div>

      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 10, padding: '8px 12px', background: 'var(--surface2)', borderRadius: 'var(--radius)' }}>
        💡 Yeni fiyat kutusuna değer yazın veya kategori için toplu yüzde uygulayın. Hiçbir değişiklik <strong>"Kaydet"</strong>e basana kadar veritabanına yazılmaz.
      </div>

      {/* Tablo */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ paddingLeft: 16 }}>Ürün</th>
              <th>Kategori</th>
              <th style={{ textAlign: 'right' }}>Eski Fiyat</th>
              <th style={{ textAlign: 'center', width: 160 }}>Yeni Fiyat</th>
              <th style={{ textAlign: 'center', paddingRight: 16 }}>Değişim</th>
            </tr>
          </thead>
          <tbody>
            {filtreli.map(u => {
              const yeniVal = yeniFiyatlar[u.id] ?? ''
              const yuzde = yuzdeHesapla(u.fiyat, yeniVal)
              const degisti = yuzde !== null && yuzde !== 0
              return (
                <tr key={u.id} style={degisti ? { background: yuzde > 0 ? 'var(--green-light)' : 'var(--red-light)' } : undefined}>
                  <td style={{ paddingLeft: 16, fontWeight: 500 }}>
                    {u.emoji} {u.ad}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text2)' }}>
                    {u.kategoriler?.emoji} {u.kategoriler?.ad}
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--text2)' }}>{para(u.fiyat)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: 12 }}>₺</span>
                      <input
                        type="number"
                        value={yeniVal}
                        onChange={e => fiyatDegistir(u.id, e.target.value)}
                        placeholder={u.fiyat.toFixed(2)}
                        style={{
                          width: 110, textAlign: 'right', paddingLeft: 18,
                          fontWeight: degisti ? 700 : 400,
                          borderColor: degisti ? (yuzde > 0 ? 'var(--green)' : 'var(--red)') : undefined
                        }}
                      />
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', paddingRight: 16 }}>
                    {yuzde !== null ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                        background: yuzde > 0 ? 'var(--green-light)' : yuzde < 0 ? 'var(--red-light)' : 'var(--surface2)',
                        color: yuzde > 0 ? '#085041' : yuzde < 0 ? 'var(--red)' : 'var(--text3)'
                      }}>
                        {yuzde > 0 ? <TrendingUp size={11} /> : yuzde < 0 ? <TrendingDown size={11} /> : null}
                        {yuzde > 0 ? '+' : ''}{yuzde.toFixed(1)}%
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text3)', fontSize: 12 }}>—</span>
                    )}
                  </td>
                </tr>
              )
            })}
            {filtreli.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text3)' }}>Ürün bulunamadı</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Alt sabit kaydet barı (değişiklik varken) */}
      {degisikSayisi > 0 && (
        <div style={{
          position: 'sticky', bottom: 12, marginTop: 14,
          background: 'var(--surface)', border: '1px solid var(--accent)',
          borderRadius: 'var(--radius-lg)', padding: '12px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>
            <strong style={{ color: 'var(--accent)' }}>{degisikSayisi}</strong> üründe fiyat değişikliği bekliyor
          </span>
          <button className="btn btn-primary" onClick={kaydet} disabled={kaydediliyor}>
            <Save size={14} /> {kaydediliyor ? 'Kaydediliyor...' : 'Tümünü Kaydet'}
          </button>
        </div>
      )}
    </div>
  )
}
