import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useIzin } from '../contexts/IzinContext'
import toast from 'react-hot-toast'
import { Plus, Edit2, AlertTriangle, TrendingDown, TrendingUp, Package, Search } from 'lucide-react'

function HammaddeModal({ hammadde, onKaydet, onKapat }) {
  const [form, setForm] = useState(hammadde || {
    ad: '', kategori: 'genel', birim: 'kg', min_stok: 0, maliyet_fiyat: 0, kdv_orani: 10
  })
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onKapat()}>
      <div className="modal" style={{ width: 400 }}>
        <div className="modal-title">{hammadde ? 'Hammadde Düzenle' : 'Yeni Hammadde'}</div>
        <div className="form-row"><label>Ad</label><input value={form.ad} onChange={e => setForm(f => ({ ...f, ad: e.target.value }))} placeholder="Un, Yağ, Et..." /></div>
        <div className="form-grid">
          <div className="form-row">
            <label>Kategori</label>
            <select value={form.kategori} onChange={e => setForm(f => ({ ...f, kategori: e.target.value }))}>
              {['genel','et_balik','sebze_meyve','icecek','baharat','ambalaj','temizlik'].map(k => <option key={k} value={k}>{k.replace(/_/g,' ')}</option>)}
            </select>
          </div>
          <div className="form-row">
            <label>Birim</label>
            <select value={form.birim} onChange={e => setForm(f => ({ ...f, birim: e.target.value }))}>
              {['kg','lt','adet','gr','ml','paket','kutu','deste'].map(b => <option key={b}>{b}</option>)}
            </select>
          </div>
          <div className="form-row">
            <label>Min. Stok</label>
            <input type="number" value={form.min_stok} onChange={e => setForm(f => ({ ...f, min_stok: parseFloat(e.target.value)||0 }))} />
          </div>
          <div className="form-row">
            <label>Maliyet Fiyatı</label>
            <input type="number" value={form.maliyet_fiyat} onChange={e => setForm(f => ({ ...f, maliyet_fiyat: parseFloat(e.target.value)||0 }))} />
          </div>
          <div className="form-row">
            <label>KDV %</label>
            <select value={form.kdv_orani} onChange={e => setForm(f => ({ ...f, kdv_orani: parseInt(e.target.value) }))}>
              {[0,1,8,10,18,20].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onKapat}>İptal</button>
          <button className="btn btn-primary" onClick={() => onKaydet(form)}>Kaydet</button>
        </div>
      </div>
    </div>
  )
}

export default function StokPage() {
  const { izinVar } = useIzin()
  const [hammaddeler, setHammaddeler] = useState([])
  const [hareketler, setHareketler] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [sekme, setSekme] = useState('stok')
  const [arama, setArama] = useState('')

  const yukle = useCallback(async () => {
    const [{ data: h }, { data: hr }] = await Promise.all([
      supabase.from('hammaddeler').select('*').eq('aktif', true).order('ad'),
      supabase.from('stok_hareketleri').select('*, hammaddeler(ad, birim)').order('created_at', { ascending: false }).limit(50)
    ])
    setHammaddeler(h || [])
    setHareketler(hr || [])
    setLoading(false)
  }, [])

  useEffect(() => { yukle() }, [yukle])

  const kaydet = async (form) => {
    try {
      if (modal.hammadde) await supabase.from('hammaddeler').update(form).eq('id', modal.hammadde.id)
      else await supabase.from('hammaddeler').insert(form)
      toast.success(modal.hammadde ? 'Güncellendi' : 'Eklendi')
      setModal(null); yukle()
    } catch (e) { toast.error(e.message) }
  }

  const stokDuzelt = async (hammadde, miktar, tip) => {
    const yeni = Math.max(0, hammadde.stok_miktari + miktar)
    await supabase.from('hammaddeler').update({ stok_miktari: yeni }).eq('id', hammadde.id)
    await supabase.from('stok_hareketleri').insert({
      hammadde_id: hammadde.id, hareket_tipi: tip,
      miktar: Math.abs(miktar), onceki_stok: hammadde.stok_miktari, sonraki_stok: yeni, kaynak: 'manuel'
    })
    toast.success('Stok güncellendi'); yukle()
  }

  const kritikStoklar = hammaddeler.filter(h => h.stok_miktari <= h.min_stok && h.min_stok > 0)
  const filtreli = hammaddeler.filter(h => h.ad.toLowerCase().includes(arama.toLowerCase()))

  if (!izinVar('stok_goruntule')) return <div className="empty-state"><p>Bu sayfayı görüntüleme yetkiniz yok</p></div>
  if (loading) return <div className="loading-center"><div className="spinner" /></div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Stok Yönetimi</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{hammaddeler.length} hammadde · {kritikStoklar.length} kritik</div>
        </div>
        {izinVar('stok_giris') && (
          <button className="btn btn-primary" onClick={() => setModal({ hammadde: null })}>
            <Plus size={14} /> Hammadde Ekle
          </button>
        )}
      </div>

      {/* Kritik stok uyarısı */}
      {kritikStoklar.length > 0 && (
        <div style={{ background: 'var(--red-light)', border: '1px solid var(--red)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 14, fontSize: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--red)', fontWeight: 600, marginBottom: 6 }}>
            <AlertTriangle size={14} /> {kritikStoklar.length} ürün kritik stok seviyesinde!
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {kritikStoklar.map(h => (
              <span key={h.id} style={{ background: 'white', padding: '2px 10px', borderRadius: 20, fontSize: 12, color: 'var(--red)' }}>
                {h.ad}: {h.stok_miktari} {h.birim}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* İstatistikler */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Toplam Hammadde', val: hammaddeler.length, icon: Package, renk: 'var(--text)' },
          { label: 'Kritik Stok', val: kritikStoklar.length, icon: AlertTriangle, renk: 'var(--red)' },
          { label: 'Toplam Stok Değeri', val: `₺${hammaddeler.reduce((a, h) => a + (h.stok_miktari * h.maliyet_fiyat), 0).toFixed(0)}`, icon: TrendingUp, renk: 'var(--green)' },
          { label: 'Bugün Hareket', val: hareketler.filter(h => new Date(h.created_at).toDateString() === new Date().toDateString()).length, icon: TrendingDown, renk: 'var(--accent)' },
        ].map(s => (
          <div key={s.label} className="stat-kart">
            <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}><s.icon size={12} />{s.label}</div>
            <div className="stat-val" style={{ color: s.renk }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Sekmeler */}
      <div className="pill-tabs" style={{ marginBottom: 12 }}>
        <button className={`pill ${sekme === 'stok' ? 'active' : ''}`} onClick={() => setSekme('stok')}>📦 Stok Durumu</button>
        <button className={`pill ${sekme === 'hareketler' ? 'active' : ''}`} onClick={() => setSekme('hareketler')}>📋 Hareketler</button>
      </div>

      {sekme === 'stok' && (
        <>
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
            <input value={arama} onChange={e => setArama(e.target.value)} placeholder="Hammadde ara..." style={{ paddingLeft: 32 }} />
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 16 }}>Hammadde</th>
                  <th>Kategori</th>
                  <th>Stok</th>
                  <th>Min. Stok</th>
                  <th>Maliyet</th>
                  <th>Stok Değeri</th>
                  <th style={{ paddingRight: 16 }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filtreli.map(h => {
                  const kritik = h.stok_miktari <= h.min_stok && h.min_stok > 0
                  return (
                    <tr key={h.id}>
                      <td style={{ paddingLeft: 16 }}>
                        <div style={{ fontWeight: 500 }}>{h.ad}</div>
                        {kritik && <span style={{ fontSize: 10, color: 'var(--red)' }}>⚠️ Kritik</span>}
                      </td>
                      <td><span className="badge badge-gray" style={{ fontSize: 10 }}>{h.kategori}</span></td>
                      <td>
                        <span style={{ fontWeight: 600, color: kritik ? 'var(--red)' : 'var(--text)' }}>
                          {h.stok_miktari} {h.birim}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text2)', fontSize: 12 }}>{h.min_stok} {h.birim}</td>
                      <td style={{ fontSize: 12 }}>₺{h.maliyet_fiyat}/{h.birim}</td>
                      <td style={{ fontSize: 12, fontWeight: 500 }}>₺{(h.stok_miktari * h.maliyet_fiyat).toFixed(2)}</td>
                      <td style={{ paddingRight: 16 }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {izinVar('stok_giris') && (
                            <>
                              <button className="btn btn-ghost btn-sm" title="Stok Ekle"
                                onClick={() => { const m = parseFloat(prompt(`${h.ad} - Kaç ${h.birim} eklensin?`) || 0); if (m > 0) stokDuzelt(h, m, 'giris') }}>
                                <TrendingUp size={12} />
                              </button>
                              <button className="btn btn-ghost btn-sm" title="Stok Çıkar"
                                onClick={() => { const m = parseFloat(prompt(`${h.ad} - Kaç ${h.birim} çıkarılsın?`) || 0); if (m > 0) stokDuzelt(h, -m, 'cikis') }}>
                                <TrendingDown size={12} />
                              </button>
                            </>
                          )}
                          <button className="btn btn-ghost btn-sm" onClick={() => setModal({ hammadde: h })}><Edit2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {sekme === 'hareketler' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 16 }}>Hammadde</th>
                <th>Tür</th>
                <th>Miktar</th>
                <th>Önceki</th>
                <th>Sonraki</th>
                <th>Kaynak</th>
                <th style={{ paddingRight: 16 }}>Tarih</th>
              </tr>
            </thead>
            <tbody>
              {hareketler.map(h => (
                <tr key={h.id}>
                  <td style={{ paddingLeft: 16, fontWeight: 500 }}>{h.hammaddeler?.ad || '—'}</td>
                  <td>
                    <span className={`badge ${h.hareket_tipi === 'giris' ? 'badge-green' : h.hareket_tipi === 'cikis' ? 'badge-red' : 'badge-gray'}`}>
                      {h.hareket_tipi}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{h.miktar} {h.hammaddeler?.birim}</td>
                  <td style={{ fontSize: 12, color: 'var(--text2)' }}>{h.onceki_stok}</td>
                  <td style={{ fontSize: 12 }}>{h.sonraki_stok}</td>
                  <td style={{ fontSize: 12, color: 'var(--text2)' }}>{h.kaynak}</td>
                  <td style={{ paddingRight: 16, fontSize: 12, color: 'var(--text2)' }}>
                    {new Date(h.created_at).toLocaleString('tr-TR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && <HammaddeModal hammadde={modal.hammadde} onKaydet={kaydet} onKapat={() => setModal(null)} />}
    </div>
  )
}
