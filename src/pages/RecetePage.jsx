import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useIzin } from '../contexts/IzinContext'
import toast from 'react-hot-toast'
import { Plus, Trash2, ChefHat, Search, Calculator } from 'lucide-react'

export default function RecetePage() {
  const { izinVar } = useIzin()
  const [urunler, setUrunler] = useState([])
  const [hammaddeler, setHammaddeler] = useState([])
  const [receteler, setReceteler] = useState([])
  const [seciliUrun, setSeciliUrun] = useState(null)
  const [urunRecetesi, setUrunRecetesi] = useState([])
  const [loading, setLoading] = useState(true)
  const [arama, setArama] = useState('')
  const [yeniKalem, setYeniKalem] = useState({ hammadde_id: '', miktar: '', birim: 'kg', fire_orani: 0 })

  const yukle = useCallback(async () => {
    const [{ data: u }, { data: h }, { data: r }] = await Promise.all([
      supabase.from('urunler').select('*, kategoriler(ad, emoji)').eq('aktif', true).order('ad'),
      supabase.from('hammaddeler').select('*').eq('aktif', true).order('ad'),
      supabase.from('receteler').select('*, hammaddeler(ad, birim, maliyet_fiyat), urunler(ad, fiyat)')
    ])
    setUrunler(u || [])
    setHammaddeler(h || [])
    setReceteler(r || [])
    setLoading(false)
  }, [])

  useEffect(() => { yukle() }, [yukle])

  const urunSec = (urun) => {
    setSeciliUrun(urun)
    setUrunRecetesi(receteler.filter(r => r.urun_id === urun.id))
  }

  const kalemEkle = async () => {
    if (!seciliUrun || !yeniKalem.hammadde_id || !yeniKalem.miktar) {
      toast.error('Hammadde ve miktar zorunlu'); return
    }
    const hm = hammaddeler.find(h => h.id === yeniKalem.hammadde_id)
    try {
      await supabase.from('receteler').upsert({
        urun_id: seciliUrun.id,
        hammadde_id: yeniKalem.hammadde_id,
        miktar: parseFloat(yeniKalem.miktar),
        birim: yeniKalem.birim || hm?.birim || 'kg',
        fire_orani: parseFloat(yeniKalem.fire_orani) || 0
      }, { onConflict: 'urun_id,hammadde_id' })
      toast.success('Reçete güncellendi')
      setYeniKalem({ hammadde_id: '', miktar: '', birim: 'kg', fire_orani: 0 })
      yukle(); urunSec(seciliUrun)
    } catch (e) { toast.error(e.message) }
  }

  const kalemSil = async (id) => {
    await supabase.from('receteler').delete().eq('id', id)
    toast.success('Silindi'); yukle()
    if (seciliUrun) urunSec(seciliUrun)
  }

  // Maliyet hesapla
  const urunMaliyeti = (urunId) => {
    return receteler
      .filter(r => r.urun_id === urunId)
      .reduce((a, r) => a + (r.miktar * (r.hammaddeler?.maliyet_fiyat || 0) * (1 + (r.fire_orani || 0) / 100)), 0)
  }

  const filtreli = urunler.filter(u => u.ad.toLowerCase().includes(arama.toLowerCase()))

  if (!izinVar('recete_goruntule')) return <div className="empty-state"><p>Bu sayfayı görüntüleme yetkiniz yok</p></div>
  if (loading) return <div className="loading-center"><div className="spinner" /></div>

  const seciliMaliyet = seciliUrun ? urunMaliyeti(seciliUrun.id) : 0
  const seciliKarMarji = seciliUrun ? ((seciliUrun.fiyat - seciliMaliyet) / seciliUrun.fiyat * 100) : 0

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 12, height: '100%' }}>
      {/* Ürün listesi */}
      <div>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Ürünler</div>
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input value={arama} onChange={e => setArama(e.target.value)} placeholder="Ürün ara..." style={{ paddingLeft: 28, fontSize: 12 }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
          {filtreli.map(u => {
            const maliyet = urunMaliyeti(u.id)
            const receteSayisi = receteler.filter(r => r.urun_id === u.id).length
            return (
              <div key={u.id} onClick={() => urunSec(u)}
                className="card-sm" style={{
                  cursor: 'pointer', padding: '10px 12px',
                  border: seciliUrun?.id === u.id ? '1.5px solid var(--accent)' : '0.5px solid var(--border)',
                  background: seciliUrun?.id === u.id ? 'var(--accent-light)' : 'var(--surface)'
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: seciliUrun?.id === u.id ? 600 : 400 }}>{u.emoji} {u.ad}</span>
                  <span className={`badge ${receteSayisi > 0 ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: 10 }}>
                    {receteSayisi > 0 ? `${receteSayisi} malz.` : 'Reçete yok'}
                  </span>
                </div>
                {maliyet > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 3 }}>
                    Maliyet: ₺{maliyet.toFixed(2)} · Satış: ₺{u.fiyat}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Reçete detayı */}
      <div>
        {!seciliUrun ? (
          <div className="empty-state" style={{ marginTop: 60 }}>
            <ChefHat size={40} style={{ margin: '0 auto 12px', opacity: .3, display: 'block' }} />
            <p>← Reçete düzenlemek için ürün seçin</p>
          </div>
        ) : (
          <>
            {/* Ürün başlık + maliyet analizi */}
            <div className="card" style={{ marginBottom: 12, padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{seciliUrun.emoji} {seciliUrun.ad}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{seciliUrun.kategoriler?.emoji} {seciliUrun.kategoriler?.ad}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>Satış Fiyatı</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>₺{seciliUrun.fiyat}</div>
                </div>
              </div>
              {seciliMaliyet > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 12 }}>
                  {[
                    { label: 'Hammadde Maliyeti', val: `₺${seciliMaliyet.toFixed(2)}`, renk: 'var(--accent)' },
                    { label: 'Kar', val: `₺${(seciliUrun.fiyat - seciliMaliyet).toFixed(2)}`, renk: 'var(--green)' },
                    { label: 'Kar Marjı', val: `%${seciliKarMarji.toFixed(1)}`, renk: seciliKarMarji > 60 ? 'var(--green)' : seciliKarMarji > 30 ? 'var(--amber)' : 'var(--red)' }
                  ].map(s => (
                    <div key={s.label} style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: '8px 12px' }}>
                      <div style={{ fontSize: 11, color: 'var(--text2)' }}>{s.label}</div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: s.renk, marginTop: 2 }}>{s.val}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reçete kalemleri */}
            <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 8 }}>Hammadde Listesi</div>
            {urunRecetesi.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text3)', fontSize: 13, background: 'var(--surface)', borderRadius: 'var(--radius)', marginBottom: 12 }}>
                Henüz hammadde eklenmemiş
              </div>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 12 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ paddingLeft: 16 }}>Hammadde</th>
                      <th>Miktar</th>
                      <th>Fire %</th>
                      <th>Net Miktar</th>
                      <th>Birim Maliyet</th>
                      <th>Toplam Maliyet</th>
                      <th style={{ paddingRight: 16 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {urunRecetesi.map(r => {
                      const netMiktar = r.miktar * (1 + (r.fire_orani || 0) / 100)
                      const maliyet = netMiktar * (r.hammaddeler?.maliyet_fiyat || 0)
                      return (
                        <tr key={r.id}>
                          <td style={{ paddingLeft: 16, fontWeight: 500 }}>{r.hammaddeler?.ad}</td>
                          <td>{r.miktar} {r.birim}</td>
                          <td style={{ color: r.fire_orani > 0 ? 'var(--amber)' : 'var(--text3)', fontSize: 12 }}>
                            {r.fire_orani > 0 ? `%${r.fire_orani}` : '—'}
                          </td>
                          <td style={{ fontSize: 12 }}>{netMiktar.toFixed(3)} {r.birim}</td>
                          <td style={{ fontSize: 12, color: 'var(--text2)' }}>₺{r.hammaddeler?.maliyet_fiyat}/{r.hammaddeler?.birim}</td>
                          <td style={{ fontWeight: 600, color: 'var(--accent)' }}>₺{maliyet.toFixed(2)}</td>
                          <td style={{ paddingRight: 16 }}>
                            {izinVar('recete_duzenle') && (
                              <button className="btn btn-ghost btn-sm" onClick={() => kalemSil(r.id)} style={{ color: 'var(--red)' }}>
                                <Trash2 size={12} />
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Yeni kalem ekle */}
            {izinVar('recete_duzenle') && (
              <div className="card" style={{ padding: '14px 16px' }}>
                <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 10 }}>Hammadde Ekle</div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 8, alignItems: 'flex-end' }}>
                  <div className="form-row" style={{ marginBottom: 0 }}>
                    <label>Hammadde</label>
                    <select value={yeniKalem.hammadde_id} onChange={e => {
                      const hm = hammaddeler.find(h => h.id === e.target.value)
                      setYeniKalem(f => ({ ...f, hammadde_id: e.target.value, birim: hm?.birim || 'kg' }))
                    }}>
                      <option value="">Seçin...</option>
                      {hammaddeler.map(h => <option key={h.id} value={h.id}>{h.ad} (₺{h.maliyet_fiyat}/{h.birim})</option>)}
                    </select>
                  </div>
                  <div className="form-row" style={{ marginBottom: 0 }}>
                    <label>Miktar</label>
                    <input type="number" placeholder="0.5" value={yeniKalem.miktar} onChange={e => setYeniKalem(f => ({ ...f, miktar: e.target.value }))} />
                  </div>
                  <div className="form-row" style={{ marginBottom: 0 }}>
                    <label>Birim</label>
                    <select value={yeniKalem.birim} onChange={e => setYeniKalem(f => ({ ...f, birim: e.target.value }))}>
                      {['kg','lt','adet','gr','ml','paket'].map(b => <option key={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="form-row" style={{ marginBottom: 0 }}>
                    <label>Fire %</label>
                    <input type="number" placeholder="0" value={yeniKalem.fire_orani} onChange={e => setYeniKalem(f => ({ ...f, fire_orani: e.target.value }))} />
                  </div>
                  <button className="btn btn-primary" onClick={kalemEkle} style={{ alignSelf: 'flex-end' }}>
                    <Plus size={13} /> Ekle
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
