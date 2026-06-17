import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useIzin } from '../contexts/IzinContext'
import toast from 'react-hot-toast'
import { Plus, Trash2, CheckCircle, FileText, ChevronDown, ChevronUp, Search } from 'lucide-react'

function FaturaForm({ tedarikciler, hammaddeler, onKaydet, onIptal }) {
  const [form, setForm] = useState({
    fatura_no: '', tedarikci_id: '', tedarikci_ad: '',
    tarih: new Date().toISOString().split('T')[0],
    vade_tarihi: '', notlar: '', durum: 'odenmedi'
  })
  const [kalemler, setKalemler] = useState([
    { hammadde_id: '', hammadde_ad: '', miktar: '', birim: 'kg', birim_fiyat: '', kdv_orani: 10 }
  ])
  const [yukleniyor, setYukleniyor] = useState(false)

  const kalemGuncelle = (i, alan, deger) => {
    setKalemler(prev => prev.map((k, idx) => {
      if (idx !== i) return k
      const guncellendi = { ...k, [alan]: deger }
      if (alan === 'hammadde_id') {
        const hm = hammaddeler.find(h => h.id === deger)
        if (hm) { guncellendi.hammadde_ad = hm.ad; guncellendi.birim = hm.birim; guncellendi.kdv_orani = hm.kdv_orani || 10 }
      }
      return guncellendi
    }))
  }

  const kalemEkle = () => setKalemler(p => [...p, { hammadde_id: '', hammadde_ad: '', miktar: '', birim: 'kg', birim_fiyat: '', kdv_orani: 10 }])
  const kalemSil = (i) => setKalemler(p => p.filter((_, idx) => idx !== i))

  const satirToplam = (k) => (parseFloat(k.miktar) || 0) * (parseFloat(k.birim_fiyat) || 0)
  const satirKdv = (k) => satirToplam(k) * ((k.kdv_orani || 0) / 100)
  const genelToplam = kalemler.reduce((a, k) => a + satirToplam(k), 0)
  const kdvToplam = kalemler.reduce((a, k) => a + satirKdv(k), 0)

  const kaydet = async () => {
    if (!form.fatura_no) { toast.error('Fatura no zorunlu'); return }
    if (kalemler.some(k => !k.hammadde_ad || !k.miktar || !k.birim_fiyat)) {
      toast.error('Tüm kalem alanlarını doldurun'); return
    }
    setYukleniyor(true)
    try {
      await onKaydet({
        fatura: { ...form, tedarikci_ad: form.tedarikci_id ? tedarikciler.find(t => t.id === form.tedarikci_id)?.ad : form.tedarikci_ad, toplam: genelToplam, kdv_toplam: kdvToplam, genel_toplam: genelToplam + kdvToplam },
        kalemler: kalemler.map(k => ({ ...k, toplam: satirToplam(k) }))
      })
    } finally { setYukleniyor(false) }
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div className="form-row">
          <label>Fatura No *</label>
          <input value={form.fatura_no} onChange={e => setForm(f => ({ ...f, fatura_no: e.target.value }))} placeholder="F-2026-001" />
        </div>
        <div className="form-row">
          <label>Tarih</label>
          <input type="date" value={form.tarih} onChange={e => setForm(f => ({ ...f, tarih: e.target.value }))} />
        </div>
        <div className="form-row">
          <label>Vade Tarihi</label>
          <input type="date" value={form.vade_tarihi} onChange={e => setForm(f => ({ ...f, vade_tarihi: e.target.value }))} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div className="form-row">
          <label>Tedarikçi</label>
          <select value={form.tedarikci_id} onChange={e => setForm(f => ({ ...f, tedarikci_id: e.target.value }))}>
            <option value="">Seçin veya yazın...</option>
            {tedarikciler.map(t => <option key={t.id} value={t.id}>{t.ad}</option>)}
          </select>
        </div>
        {!form.tedarikci_id && (
          <div className="form-row">
            <label>Tedarikçi Adı (manuel)</label>
            <input value={form.tedarikci_ad} onChange={e => setForm(f => ({ ...f, tedarikci_ad: e.target.value }))} placeholder="Tedarikçi adı..." />
          </div>
        )}
        <div className="form-row">
          <label>Ödeme Durumu</label>
          <select value={form.durum} onChange={e => setForm(f => ({ ...f, durum: e.target.value }))}>
            <option value="odenmedi">Ödenmedi</option>
            <option value="kismi">Kısmi Ödendi</option>
            <option value="odendi">Ödendi</option>
          </select>
        </div>
      </div>

      {/* Kalemler */}
      <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 8 }}>Fatura Kalemleri</div>
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 12 }}>
        <table className="data-table" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ paddingLeft: 12, width: '30%' }}>Hammadde</th>
              <th style={{ width: '12%' }}>Miktar</th>
              <th style={{ width: '10%' }}>Birim</th>
              <th style={{ width: '14%' }}>Birim Fiyat</th>
              <th style={{ width: '8%' }}>KDV %</th>
              <th style={{ width: '14%' }}>Toplam</th>
              <th style={{ width: '6%', paddingRight: 12 }}></th>
            </tr>
          </thead>
          <tbody>
            {kalemler.map((k, i) => (
              <tr key={i}>
                <td style={{ paddingLeft: 12, paddingTop: 6, paddingBottom: 6 }}>
                  <select value={k.hammadde_id} onChange={e => kalemGuncelle(i, 'hammadde_id', e.target.value)} style={{ width: '100%' }}>
                    <option value="">Seçin...</option>
                    {hammaddeler.map(h => <option key={h.id} value={h.id}>{h.ad}</option>)}
                  </select>
                  {!k.hammadde_id && (
                    <input value={k.hammadde_ad} onChange={e => kalemGuncelle(i, 'hammadde_ad', e.target.value)}
                      placeholder="veya yazın..." style={{ width: '100%', marginTop: 4, fontSize: 11 }} />
                  )}
                </td>
                <td><input type="number" value={k.miktar} onChange={e => kalemGuncelle(i, 'miktar', e.target.value)} style={{ width: '100%' }} /></td>
                <td>
                  <select value={k.birim} onChange={e => kalemGuncelle(i, 'birim', e.target.value)} style={{ width: '100%' }}>
                    {['kg','lt','adet','gr','ml','paket','kutu','deste'].map(b => <option key={b}>{b}</option>)}
                  </select>
                </td>
                <td><input type="number" value={k.birim_fiyat} onChange={e => kalemGuncelle(i, 'birim_fiyat', e.target.value)} style={{ width: '100%' }} /></td>
                <td>
                  <select value={k.kdv_orani} onChange={e => kalemGuncelle(i, 'kdv_orani', parseInt(e.target.value))} style={{ width: '100%' }}>
                    {[0,1,8,10,18,20].map(r => <option key={r} value={r}>%{r}</option>)}
                  </select>
                </td>
                <td style={{ fontWeight: 500, color: 'var(--accent)' }}>₺{satirToplam(k).toFixed(2)}</td>
                <td style={{ paddingRight: 12 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => kalemSil(i)} disabled={kalemler.length === 1} style={{ color: 'var(--red)' }}>
                    <Trash2 size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <button className="btn btn-ghost btn-sm" onClick={kalemEkle}><Plus size={13} /> Kalem Ekle</button>
        <div style={{ textAlign: 'right', fontSize: 13 }}>
          <div style={{ color: 'var(--text2)' }}>Ara Toplam: <strong>₺{genelToplam.toFixed(2)}</strong></div>
          <div style={{ color: 'var(--text2)' }}>KDV: <strong>₺{kdvToplam.toFixed(2)}</strong></div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)', marginTop: 4 }}>
            Genel Toplam: ₺{(genelToplam + kdvToplam).toFixed(2)}
          </div>
        </div>
      </div>

      <div className="form-row" style={{ marginTop: 12 }}>
        <label>Notlar</label>
        <textarea rows={2} value={form.notlar} onChange={e => setForm(f => ({ ...f, notlar: e.target.value }))} placeholder="Fatura notu..." />
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
        <button className="btn btn-ghost" onClick={onIptal}>İptal</button>
        <button className="btn btn-primary" onClick={kaydet} disabled={yukleniyor}>
          <CheckCircle size={13} /> {yukleniyor ? 'Kaydediliyor...' : 'Faturayı Kaydet'}
        </button>
      </div>
    </div>
  )
}

export default function FaturaPage() {
  const { izinVar } = useIzin()
  const [faturalar, setFaturalar] = useState([])
  const [tedarikciler, setTedarikciler] = useState([])
  const [hammaddeler, setHammaddeler] = useState([])
  const [loading, setLoading] = useState(true)
  const [yeniForm, setYeniForm] = useState(false)
  const [aramaMetni, setAramaMetni] = useState('')
  const [acikFatura, setAcikFatura] = useState(null)

  const yukle = useCallback(async () => {
    const [{ data: f }, { data: t }, { data: h }] = await Promise.all([
      supabase.from('faturalar').select('*, fatura_kalemleri(*)').order('tarih', { ascending: false }),
      supabase.from('tedarikciler').select('*').eq('aktif', true),
      supabase.from('hammaddeler').select('*').eq('aktif', true).order('ad')
    ])
    setFaturalar(f || [])
    setTedarikciler(t || [])
    setHammaddeler(h || [])
    setLoading(false)
  }, [])

  useEffect(() => { yukle() }, [yukle])

  const faturaKaydet = async ({ fatura, kalemler }) => {
    try {
      const { data: yeni, error } = await supabase.from('faturalar').insert(fatura).select().single()
      if (error) throw error
      await supabase.from('fatura_kalemleri').insert(kalemler.map(k => ({ ...k, fatura_id: yeni.id })))
      // Stok güncelle
      for (const k of kalemler) {
        if (k.hammadde_id) {
          const { data: hm } = await supabase.from('hammaddeler').select('stok_miktari').eq('id', k.hammadde_id).single()
          const yeniStok = (hm?.stok_miktari || 0) + parseFloat(k.miktar)
          await supabase.from('hammaddeler').update({ stok_miktari: yeniStok }).eq('id', k.hammadde_id)
          await supabase.from('stok_hareketleri').insert({
            hammadde_id: k.hammadde_id, hareket_tipi: 'giris',
            miktar: parseFloat(k.miktar), onceki_stok: hm?.stok_miktari || 0,
            sonraki_stok: yeniStok, kaynak: 'fatura', kaynak_id: yeni.id
          })
        }
      }
      toast.success('Fatura kaydedildi, stok güncellendi')
      setYeniForm(false); yukle()
    } catch (e) { toast.error('Hata: ' + e.message) }
  }

  const durumRenk = { odenmedi: 'badge-red', kismi: 'badge-amber', odendi: 'badge-green' }
  const durumLabel = { odenmedi: 'Ödenmedi', kismi: 'Kısmi', odendi: 'Ödendi' }

  const filtreli = faturalar.filter(f =>
    f.fatura_no?.toLowerCase().includes(aramaMetni.toLowerCase()) ||
    f.tedarikci_ad?.toLowerCase().includes(aramaMetni.toLowerCase())
  )

  if (!izinVar('fatura_goruntule')) return (
    <div className="empty-state"><p>Bu sayfayı görüntüleme yetkiniz yok</p></div>
  )

  if (loading) return <div className="loading-center"><div className="spinner" /></div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Fatura Girişi</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{faturalar.length} fatura</div>
        </div>
        {izinVar('fatura_giris') && !yeniForm && (
          <button className="btn btn-primary" onClick={() => setYeniForm(true)}>
            <Plus size={14} /> Yeni Fatura
          </button>
        )}
      </div>

      {yeniForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={15} /> Yeni Alış Faturası
          </div>
          <FaturaForm tedarikciler={tedarikciler} hammaddeler={hammaddeler}
            onKaydet={faturaKaydet} onIptal={() => setYeniForm(false)} />
        </div>
      )}

      {/* Arama */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
        <input value={aramaMetni} onChange={e => setAramaMetni(e.target.value)}
          placeholder="Fatura no veya tedarikçi ara..." style={{ paddingLeft: 32 }} />
      </div>

      {/* Özet kartlar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Toplam Fatura', val: faturalar.length, renk: 'var(--text)' },
          { label: 'Ödenmedi', val: faturalar.filter(f => f.durum === 'odenmedi').length, renk: 'var(--red)' },
          { label: 'Bu Ay Gider', val: `₺${faturalar.filter(f => new Date(f.tarih).getMonth() === new Date().getMonth()).reduce((a,f) => a + (f.genel_toplam||0), 0).toFixed(0)}`, renk: 'var(--accent)' },
          { label: 'Bekleyen Tutar', val: `₺${faturalar.filter(f => f.durum !== 'odendi').reduce((a,f) => a + (f.genel_toplam||0), 0).toFixed(0)}`, renk: 'var(--red)' },
        ].map(s => (
          <div key={s.label} className="stat-kart">
            <div className="stat-label">{s.label}</div>
            <div className="stat-val" style={{ color: s.renk }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Fatura listesi */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ paddingLeft: 16 }}>Fatura No</th>
              <th>Tedarikçi</th>
              <th>Tarih</th>
              <th>Vade</th>
              <th>Tutar</th>
              <th>Durum</th>
              <th style={{ paddingRight: 16 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtreli.map(f => (
              <>
                <tr key={f.id} style={{ cursor: 'pointer' }} onClick={() => setAcikFatura(acikFatura === f.id ? null : f.id)}>
                  <td style={{ paddingLeft: 16, fontWeight: 500 }}>{f.fatura_no}</td>
                  <td>{f.tedarikci_ad || '—'}</td>
                  <td style={{ fontSize: 12 }}>{new Date(f.tarih).toLocaleDateString('tr-TR')}</td>
                  <td style={{ fontSize: 12, color: f.vade_tarihi && new Date(f.vade_tarihi) < new Date() && f.durum !== 'odendi' ? 'var(--red)' : 'var(--text2)' }}>
                    {f.vade_tarihi ? new Date(f.vade_tarihi).toLocaleDateString('tr-TR') : '—'}
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--accent)' }}>₺{f.genel_toplam?.toFixed(2)}</td>
                  <td><span className={`badge ${durumRenk[f.durum]}`}>{durumLabel[f.durum]}</span></td>
                  <td style={{ paddingRight: 16 }}>{acikFatura === f.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</td>
                </tr>
                {acikFatura === f.id && (
                  <tr key={f.id + '_detail'}>
                    <td colSpan={7} style={{ padding: '0 16px 12px', background: 'var(--surface2)' }}>
                      <table style={{ width: '100%', fontSize: 12, marginTop: 8 }}>
                        <thead>
                          <tr style={{ color: 'var(--text2)' }}>
                            <th style={{ textAlign: 'left', padding: '4px 0', fontWeight: 500 }}>Ürün</th>
                            <th style={{ textAlign: 'right', fontWeight: 500 }}>Miktar</th>
                            <th style={{ textAlign: 'right', fontWeight: 500 }}>Birim Fiyat</th>
                            <th style={{ textAlign: 'right', fontWeight: 500 }}>KDV</th>
                            <th style={{ textAlign: 'right', fontWeight: 500 }}>Toplam</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(f.fatura_kalemleri || []).map(k => (
                            <tr key={k.id}>
                              <td style={{ padding: '3px 0' }}>{k.hammadde_ad}</td>
                              <td style={{ textAlign: 'right' }}>{k.miktar} {k.birim}</td>
                              <td style={{ textAlign: 'right' }}>₺{k.birim_fiyat}</td>
                              <td style={{ textAlign: 'right' }}>%{k.kdv_orani}</td>
                              <td style={{ textAlign: 'right', fontWeight: 500 }}>₺{k.toplam?.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {f.notlar && <div style={{ marginTop: 8, color: 'var(--text2)', fontSize: 12 }}>Not: {f.notlar}</div>}
                    </td>
                  </tr>
                )}
              </>
            ))}
            {filtreli.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text3)' }}>Fatura bulunamadı</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
