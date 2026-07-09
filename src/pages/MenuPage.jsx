import { useState, useEffect, useCallback } from 'react'
import { urunlerApi, kategorilerApi } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Plus, Edit2, ToggleLeft, ToggleRight } from 'lucide-react'
import ResimYukleyici from './ResimYukleyici'
import { supabase } from '../lib/supabase'

function UrunModal({ urun, kategoriler, yazicilar, onKaydet, onKapat }) {
  const [form, setForm] = useState(urun || { ad: '', fiyat: '', emoji: '🍽️', kategori_id: kategoriler[0]?.id || '', aciklama: '', aktif: true, yazici_id: '' })
  const [anaResim, setAnaResim] = useState(urun?.resim_url || null)
  const [galeri, setGaleri] = useState([])
  const [galeriYuklendi, setGaleriYuklendi] = useState(false)

  // Galeri resimlerini yükle (sadece kayıtlı ürünler için)
  useEffect(() => {
    if (urun?.id && !galeriYuklendi) {
      supabase.from('urun_resimleri')
        .select('id, url, sira, boyut_kb')
        .eq('urun_id', urun.id)
        .gt('sira', 0)
        .order('sira')
        .then(({ data }) => { setGaleri(data || []); setGaleriYuklendi(true) })
    }
  }, [urun?.id, galeriYuklendi])

  const kaydet = async () => {
    if (!form.ad || !form.fiyat) { toast.error('Ad ve fiyat zorunlu'); return }
    // Sadece urunler tablosunda var olan kolonları gönder (join'den gelen
    // 'kategoriler' nesnesi gibi ekstra alanlar update'i bozuyordu)
    const temizForm = {
      ad: form.ad,
      fiyat: parseFloat(form.fiyat),
      emoji: form.emoji,
      kategori_id: form.kategori_id,
      aciklama: form.aciklama || null,
      yazici_id: form.yazici_id || null,
      resim_url: form.resim_url !== undefined ? form.resim_url : (urun?.resim_url || null),
      kalori:        form.kalori        ? parseFloat(form.kalori)        : null,
      porsiyon_gram: form.porsiyon_gram ? parseInt(form.porsiyon_gram)   : null,
      protein:       form.protein       ? parseFloat(form.protein)       : null,
      yag:           form.yag           ? parseFloat(form.yag)           : null,
      doymus_yag:    form.doymus_yag    ? parseFloat(form.doymus_yag)    : null,
      karbonhidrat:  form.karbonhidrat  ? parseFloat(form.karbonhidrat)  : null,
      seker:         form.seker         ? parseFloat(form.seker)         : null,
      tuz:           form.tuz           ? parseFloat(form.tuz)           : null,
      alerjenler:    form.alerjenler    || [],
      vejetaryen:    !!form.vejetaryen,
      vegan:         !!form.vegan,
      glutensiz:     !!form.glutensiz,
      laktozsuz:     !!form.laktozsuz,
      // ── Hızlı satış / stok kalemi alanları ──
      hizli_satis:   !!form.hizli_satis,
      barkod:        form.barkod || null,
      terazi_kodu:   form.terazi_kodu || null,
      birim:         form.birim || 'adet',
      kdv_perakende: form.kdv_perakende ? parseFloat(form.kdv_perakende) : null,
      kdv_toptan:    form.kdv_toptan    ? parseFloat(form.kdv_toptan)    : null,
      stok_takip:    !!form.stok_takip,
      stok_adet:     form.stok_adet !== '' && form.stok_adet != null ? parseFloat(form.stok_adet) : 0,
    }
    await onKaydet(temizForm)
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onKapat()}>
      <div className="modal">
        <div className="modal-title">{urun ? 'Ürün Düzenle' : 'Yeni Ürün'}</div>
        <div className="form-grid">
          <div className="form-row">
            <label>Emoji</label>
            <input value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))} style={{ width: 60 }} />
          </div>
          <div className="form-row">
            <label>Fiyat (₺)</label>
            <input type="number" value={form.fiyat} onChange={e => setForm(f => ({ ...f, fiyat: e.target.value }))} />
            <span style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3, display: 'block' }}>
              -1 girilirse: garson sipariş anında fiyatı kendisi belirler (açık fiyat)
            </span>
          </div>
        </div>
        <div className="form-row">
          <label>Ürün Adı</label>
          <input value={form.ad} onChange={e => setForm(f => ({ ...f, ad: e.target.value }))} placeholder="Izgara Köfte" />
        </div>
        <div className="form-row">
          <label>Kategori</label>
          <select value={form.kategori_id} onChange={e => setForm(f => ({ ...f, kategori_id: e.target.value }))}>
            {kategoriler
              .filter(k => form.hizli_satis
                ? (k.tip === 'hizli_satis' || k.tip === 'ikisi')
                : (k.tip === 'restoran' || k.tip === 'ikisi' || !k.tip))
              .map(k => <option key={k.id} value={k.id}>{k.emoji} {k.ad}</option>)}
          </select>
          <span style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3, display: 'block' }}>
            {form.hizli_satis ? 'Hızlı satış kategorileri gösteriliyor' : 'Restoran kategorileri gösteriliyor'}
          </span>
        </div>
        <div className="form-row">
          <label>Açıklama</label>
          <textarea rows={2} value={form.aciklama || ''} onChange={e => setForm(f => ({ ...f, aciklama: e.target.value }))} placeholder="Kısa açıklama..." />
        </div>

        {/* ── HIZLI SATIŞ / STOK KALEMİ ── */}
        <div style={{ borderTop: '0.5px solid var(--border)', margin: '14px 0 10px', paddingTop: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
            <input type="checkbox" checked={!!form.hizli_satis}
              onChange={e => setForm(f => ({ ...f, hizli_satis: e.target.checked }))} />
            🛒 Hızlı Satış Ürünü (tezgahta doğrudan satılır — stok kalemi)
          </label>
          <span style={{ fontSize: 11, color: 'var(--text2)', marginTop: 3, display: 'block', marginLeft: 24 }}>
            İşaretlenirse Hızlı Satış ekranında görünür. Su, kola, paket kahve gibi hazır mamuller için.
          </span>
        </div>

        {form.hizli_satis && (
          <>
            <div className="form-grid">
              <div className="form-row">
                <label>Barkod</label>
                <input value={form.barkod || ''} onChange={e => setForm(f => ({ ...f, barkod: e.target.value }))} placeholder="Okut veya yaz" />
              </div>
              <div className="form-row">
                <label>Birim</label>
                <select value={form.birim || 'adet'} onChange={e => setForm(f => ({ ...f, birim: e.target.value }))}>
                  <option value="adet">Adet</option>
                  <option value="kg">Kilogram (kg) — tartılı</option>
                </select>
              </div>
            </div>
            {form.birim === 'kg' && (
              <div className="form-row">
                <label>Terazi Kodu (5 haneli)</label>
                <input value={form.terazi_kodu || ''} maxLength={5}
                  onChange={e => setForm(f => ({ ...f, terazi_kodu: e.target.value.replace(/\D/g, '').slice(0, 5) }))}
                  placeholder="örn. 00010" />
                <span style={{ fontSize: 11, color: 'var(--text2)', marginTop: 3, display: 'block' }}>
                  Tartılı barkodun ortasındaki ürün kodu. Terazide bu ürüne atadığın kod ile aynı olmalı.
                </span>
              </div>
            )}
            <div className="form-grid">
              <div className="form-row">
                <label>KDV Perakende (%)</label>
                <input type="number" value={form.kdv_perakende ?? ''} onChange={e => setForm(f => ({ ...f, kdv_perakende: e.target.value }))} placeholder="örn. 10" />
              </div>
              <div className="form-row">
                <label>KDV Toptan (%)</label>
                <input type="number" value={form.kdv_toptan ?? ''} onChange={e => setForm(f => ({ ...f, kdv_toptan: e.target.value }))} placeholder="örn. 1" />
              </div>
            </div>
            <div className="form-row">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={!!form.stok_takip}
                  onChange={e => setForm(f => ({ ...f, stok_takip: e.target.checked }))} />
                Stok takibi yap (satılınca düşsün, biterse uyarsın)
              </label>
            </div>
            {form.stok_takip && (
              <div className="form-row">
                <label>Mevcut Stok ({form.birim === 'kg' ? 'kg' : 'adet'})</label>
                <input type="number" step={form.birim === 'kg' ? '0.001' : '1'}
                  value={form.stok_adet ?? ''} onChange={e => setForm(f => ({ ...f, stok_adet: e.target.value }))} placeholder="0" />
              </div>
            )}
          </>
        )}

        {yazicilar.length > 0 && (
          <div className="form-row">
            <label>Yazıcı Yönlendirme</label>
            <select value={form.yazici_id || ''} onChange={e => setForm(f => ({ ...f, yazici_id: e.target.value }))}>
              <option value="">Kategori kuralını kullan (varsayılan)</option>
              {yazicilar.map(y => <option key={y.id} value={y.id}>{y.ad} — {y.ip}:{y.port}</option>)}
            </select>
            <span style={{ fontSize: 11, color: 'var(--text2)', marginTop: 3, display: 'block' }}>
              Bu ürün her zaman seçilen yazıcıya gider (kategori kuralını ezer)
            </span>
          </div>
        )}

        {/* ── RESİM YÖNETİMİ ── */}
        <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <ResimYukleyici
            urunId={urun?.id}
            mevcutUrl={anaResim}
            galeri={galeri}
            onAnaResim={url => { setAnaResim(url); setForm(f => ({ ...f, resim_url: url })) }}
            onGaleriGuncelle={setGaleri}
            sadeceTek={false}
            maxKB={800}
          />
        </div>

        {/* ── BESİN DEĞERLERİ — 1 Tem. 2026 Zorunlu ── */}
        <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', marginBottom: 10 }}>
            🥗 Besin Değerleri <span style={{ fontWeight:400, color:'var(--text3)' }}>(1 Tem. 2026 zorunlu)</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
            {[
              { key:'kalori',        label:'Kalori (kcal)' },
              { key:'porsiyon_gram', label:'Porsiyon (g)'  },
              { key:'protein',       label:'Protein (g)'   },
              { key:'yag',           label:'Yağ (g)'       },
              { key:'doymus_yag',    label:'Doymuş Yağ (g)'},
              { key:'karbonhidrat',  label:'Karbonhidrat (g)'},
              { key:'seker',         label:'Şeker (g)'     },
              { key:'tuz',           label:'Tuz (g)'       },
            ].map(a => (
              <div key={a.key}>
                <label style={{ fontSize:10, color:'var(--text2)' }}>{a.label}</label>
                <input type="number" step="0.1" value={form[a.key] || ''}
                  onChange={e => setForm(f => ({...f, [a.key]: e.target.value}))}
                  style={{ fontSize:12, padding:'4px 6px' }} placeholder="—" />
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize:10, color:'var(--text2)', display:'block', marginBottom:5 }}>Alerjenler (⚠️ zorunlu işaretleme)</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
              {[['gluten','Gluten'],['sut','Süt'],['yumurta','Yumurta'],['balik','Balık'],
                ['kabuklu_deniz','Kabuklu Deniz'],['yer_fistigi','Yer Fıstığı'],['soya','Soya'],
                ['findik','Fındık'],['kereviz','Kereviz'],['hardal','Hardal'],
                ['susam','Susam'],['kukurtdioksit','SO₂/Sülfit']].map(([k, l]) => {
                const sec = (form.alerjenler||[]).includes(k)
                return <button key={k} type="button" onClick={() => setForm(f => ({
                    ...f, alerjenler: sec ? (f.alerjenler||[]).filter(a=>a!==k) : [...(f.alerjenler||[]),k]
                  }))} style={{
                  padding:'2px 8px', borderRadius:14, fontSize:11, cursor:'pointer',
                  background: sec ? 'var(--red-light)' : 'var(--surface2)',
                  color: sec ? 'var(--red)' : 'var(--text3)',
                  border: sec ? '1px solid var(--red)' : '1px solid var(--border)',
                  fontWeight: sec ? 600 : 400
                }}>{sec?'⚠️ ':''}{l}</button>
              })}
            </div>
          </div>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            {[['vejetaryen','🌿 Vejetaryen'],['vegan','🌱 Vegan'],['glutensiz','🚫G Glutensiz'],['laktozsuz','🥛 Laktozsuz']].map(([k,l]) => (
              <label key={k} style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, cursor:'pointer' }}>
                <input type="checkbox" checked={!!form[k]} onChange={e => setForm(f=>({...f,[k]:e.target.checked}))} />
                {l}
              </label>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onKapat}>İptal</button>
          <button className="btn btn-primary" onClick={kaydet}>Kaydet</button>
        </div>
      </div>
    </div>
  )
}

export default function MenuPage() {
  const [urunler, setUrunler] = useState([])
  const [kategoriler, setKategoriler] = useState([])
  const [aktifKat, setAktifKat] = useState('tumu')
  const [modal, setModal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [yazicilar, setYazicilar] = useState([])

  const yukle = useCallback(async () => {
    try {
      const [u, k] = await Promise.all([urunlerApi.getAll(), kategorilerApi.getAll()])
      setUrunler(u)
      setKategoriler(k)
      // Bridge'den yazıcıları çek
      try {
        const res = await fetch('http://127.0.0.1:7779/api/yazicilar', { signal: AbortSignal.timeout(2000) })
        setYazicilar(await res.json())
      } catch { setYazicilar([]) }
    } catch (e) {
      toast.error('Menü yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { yukle() }, [yukle])

  const kaydet = async (form) => {
    try {
      if (modal.urun) {
        await urunlerApi.update(modal.urun.id, form)
        toast.success('Ürün güncellendi')
      } else {
        await urunlerApi.create(form)
        toast.success('Ürün eklendi')
      }
      setModal(null)
      yukle()
    } catch (e) {
      toast.error('Kaydedilemedi: ' + e.message)
    }
  }

  const toggleAktif = async (urun) => {
    try {
      await urunlerApi.toggleAktif(urun.id, !urun.aktif)
      toast.success(urun.aktif ? 'Ürün pasife alındı' : 'Ürün aktif edildi')
      yukle()
    } catch (e) {
      toast.error('Güncellenemedi')
    }
  }

  const filtreli = aktifKat === 'tumu' ? urunler : urunler.filter(u => u.kategori_id === aktifKat)

  if (loading) return <div className="loading-center"><div className="spinner" /><span>Menü yükleniyor...</span></div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="pill-tabs">
          <button className={`pill ${aktifKat === 'tumu' ? 'active' : ''}`} onClick={() => setAktifKat('tumu')}>
            Tümü ({urunler.length})
          </button>
          {kategoriler.map(k => (
            <button key={k.id} className={`pill ${aktifKat === k.id ? 'active' : ''}`}
              onClick={() => setAktifKat(k.id)}>
              {k.emoji} {k.ad} ({urunler.filter(u => u.kategori_id === k.id).length})
            </button>
          ))}
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setModal({ urun: null })}>
          <Plus size={13} /> Ürün Ekle
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ paddingLeft: 16 }}>Ürün</th>
              <th>Kategori</th>
              <th>Fiyat</th>
              <th>Durum</th>
              <th style={{ paddingRight: 16 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtreli.map(u => (
              <tr key={u.id}>
                <td style={{ paddingLeft: 16 }}>
                  <span style={{ fontSize: 18, marginRight: 8 }}>{u.emoji}</span>
                  <span style={{ fontWeight: 500 }}>{u.ad}</span>
                  {u.aciklama && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{u.aciklama}</div>}
                </td>
                <td>
                  <span className="badge badge-gray">
                    {u.kategoriler?.emoji} {u.kategoriler?.ad || '-'}
                  </span>
                </td>
                <td style={{ fontWeight: 600 }}>₺{u.fiyat}</td>
                <td>
                  <span className={`badge ${u.aktif ? 'badge-green' : 'badge-gray'}`}>
                    {u.aktif ? 'Aktif' : 'Pasif'}
                  </span>
                </td>
                <td style={{ paddingRight: 16 }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setModal({ urun: u })}>
                      <Edit2 size={12} /> Düzenle
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => toggleAktif(u)}>
                      {u.aktif ? <ToggleRight size={14} color="var(--green)" /> : <ToggleLeft size={14} color="var(--text3)" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <UrunModal
          urun={modal.urun}
          kategoriler={kategoriler}
          yazicilar={yazicilar}
          onKaydet={kaydet}
          onKapat={() => setModal(null)}
        />
      )}
    </div>
  )
}
