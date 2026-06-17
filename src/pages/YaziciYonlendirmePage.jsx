import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import {
  Plus, Trash2, ChevronDown, ChevronUp,
  Printer, Tag, Package, Layout, Truck, Star
} from 'lucide-react'

const KURAL_TIPLERI = [
  { id: 'kategori', label: 'Kategori',    icon: Tag,     renk: '#1D9E75', aciklama: 'Belirli kategorideki ürünler bu yazıcıya gider' },
  { id: 'urun',     label: 'Ürün',        icon: Package, renk: '#534AB7', aciklama: 'Belirli bir ürün her zaman bu yazıcıya gider' },
  { id: 'salon',    label: 'Salon',       icon: Layout,  renk: '#BA7517', aciklama: 'Belirli salondan gelen siparişler bu yazıcıya gider' },
  { id: 'tur',      label: 'Sipariş Türü',icon: Truck,   renk: '#185FA5', aciklama: 'Masa / Paket / Gel-Al ayrımı' },
  { id: 'varsayilan',label: 'Varsayılan', icon: Star,    renk: '#D85A30', aciklama: 'Hiçbir kural eşleşmezse bu yazıcı kullanılır' },
]

const SIPARIS_TURLERI = [
  { id: 'masa',   label: '🪑 Masa Servisi' },
  { id: 'paket',  label: '📦 Paket Servis' },
  { id: 'gel_al', label: '🚶 Gel-Al' },
]

function YonlendirmeModal({ yazicilar, kategoriler, urunler, salonlar, onKaydet, onKapat }) {
  const [form, setForm] = useState({
    yazici_id: yazicilar[0]?.id || '',
    kural_turu: 'kategori',
    kategori_id: '',
    urun_id: '',
    salon_id: '',
    siparis_turu: 'masa',
    oncelik: 0,
    aciklama: ''
  })

  const kuralTip = KURAL_TIPLERI.find(k => k.id === form.kural_turu)

  const kaydet = () => {
    if (!form.yazici_id) { toast.error('Yazıcı seçin'); return }
    if (form.kural_turu === 'kategori' && !form.kategori_id) { toast.error('Kategori seçin'); return }
    if (form.kural_turu === 'urun' && !form.urun_id) { toast.error('Ürün seçin'); return }
    if (form.kural_turu === 'salon' && !form.salon_id) { toast.error('Salon seçin'); return }
    onKaydet(form)
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onKapat()}>
      <div className="modal" style={{ width: 480 }}>
        <div className="modal-title">Yönlendirme Kuralı Ekle</div>

        {/* Yazıcı seç */}
        <div className="form-row">
          <label>Yazıcı <span style={{ color: 'var(--red)' }}>*</span></label>
          <select value={form.yazici_id} onChange={e => setForm(f => ({ ...f, yazici_id: e.target.value }))}>
            <option value="">Seçin...</option>
            {yazicilar.map(y => <option key={y.id} value={y.id}>{y.ad} — {y.ip}:{y.port}</option>)}
          </select>
        </div>

        {/* Kural türü */}
        <div className="form-row">
          <label>Kural Türü</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {KURAL_TIPLERI.map(k => (
              <button key={k.id} onClick={() => setForm(f => ({ ...f, kural_turu: k.id }))}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '9px 12px', borderRadius: 'var(--radius)',
                  border: form.kural_turu === k.id ? `2px solid ${k.renk}` : '0.5px solid var(--border)',
                  background: form.kural_turu === k.id ? k.renk + '12' : 'transparent',
                  cursor: 'pointer', fontFamily: 'inherit', fontSize: 12,
                  fontWeight: form.kural_turu === k.id ? 600 : 400,
                  color: form.kural_turu === k.id ? k.renk : 'var(--text2)',
                  textAlign: 'left'
                }}>
                <k.icon size={14} />
                {k.label}
              </button>
            ))}
          </div>
          {kuralTip && (
            <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 6, padding: '6px 10px', background: 'var(--surface2)', borderRadius: 'var(--radius)' }}>
              {kuralTip.aciklama}
            </div>
          )}
        </div>

        {/* Kural değeri */}
        {form.kural_turu === 'kategori' && (
          <div className="form-row">
            <label>Kategori <span style={{ color: 'var(--red)' }}>*</span></label>
            <select value={form.kategori_id} onChange={e => setForm(f => ({ ...f, kategori_id: e.target.value }))}>
              <option value="">Seçin...</option>
              {kategoriler.map(k => <option key={k.id} value={k.id}>{k.emoji} {k.ad}</option>)}
            </select>
          </div>
        )}

        {form.kural_turu === 'urun' && (
          <div className="form-row">
            <label>Ürün <span style={{ color: 'var(--red)' }}>*</span></label>
            <select value={form.urun_id} onChange={e => setForm(f => ({ ...f, urun_id: e.target.value }))}>
              <option value="">Seçin...</option>
              {kategoriler.map(kat => (
                <optgroup key={kat.id} label={`${kat.emoji} ${kat.ad}`}>
                  {urunler.filter(u => u.kategori_id === kat.id).map(u => (
                    <option key={u.id} value={u.id}>{u.emoji} {u.ad} — ₺{u.fiyat}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        )}

        {form.kural_turu === 'salon' && (
          <div className="form-row">
            <label>Salon <span style={{ color: 'var(--red)' }}>*</span></label>
            <select value={form.salon_id} onChange={e => setForm(f => ({ ...f, salon_id: e.target.value }))}>
              <option value="">Seçin...</option>
              {salonlar.map(s => <option key={s.id} value={s.id}>{s.ad}</option>)}
            </select>
          </div>
        )}

        {form.kural_turu === 'tur' && (
          <div className="form-row">
            <label>Sipariş Türü</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {SIPARIS_TURLERI.map(t => (
                <button key={t.id} onClick={() => setForm(f => ({ ...f, siparis_turu: t.id }))}
                  className={`pill ${form.siparis_turu === t.id ? 'active' : ''}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="form-grid">
          <div className="form-row">
            <label>Öncelik</label>
            <input type="number" min={0} max={100} value={form.oncelik}
              onChange={e => setForm(f => ({ ...f, oncelik: parseInt(e.target.value) || 0 }))} />
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>Yüksek sayı = önce uygulanır</span>
          </div>
          <div className="form-row">
            <label>Açıklama (opsiyonel)</label>
            <input value={form.aciklama} onChange={e => setForm(f => ({ ...f, aciklama: e.target.value }))}
              placeholder="Örn: İçecekler bar yazıcısına" />
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

// Kural özet etiketi
function KuralEtiket({ kural, kategoriler, urunler, salonlar }) {
  if (kural.kural_turu === 'kategori') {
    const kat = kategoriler.find(k => k.id === kural.kategori_id)
    return <span>{kat?.emoji} {kat?.ad || '?'}</span>
  }
  if (kural.kural_turu === 'urun') {
    const urun = urunler.find(u => u.id === kural.urun_id)
    return <span>{urun?.emoji} {urun?.ad || '?'}</span>
  }
  if (kural.kural_turu === 'salon') {
    const salon = salonlar.find(s => s.id === kural.salon_id)
    return <span>🏠 {salon?.ad || '?'}</span>
  }
  if (kural.kural_turu === 'tur') {
    return <span>{SIPARIS_TURLERI.find(t => t.id === kural.siparis_turu)?.label}</span>
  }
  return <span>⭐ Varsayılan</span>
}

export default function YaziciYonlendirmePage() {
  const [yazicilar, setYazicilar] = useState([])
  const [kategoriler, setKategoriler] = useState([])
  const [urunler, setUrunler] = useState([])
  const [salonlar, setSalonlar] = useState([])
  const [kurallar, setKurallar] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [bridgeAktif, setBridgeAktif] = useState(false)

  const yukle = useCallback(async () => {
    try {
      // Bridge'den yazıcıları çek
      try {
        const res = await fetch('http://127.0.0.1:7779/api/yazicilar', { signal: AbortSignal.timeout(2000) })
        const data = await res.json()
        setYazicilar(data || [])
        setBridgeAktif(true)
      } catch { setBridgeAktif(false) }

      const [{ data: kat }, { data: urn }, { data: sal }, { data: kur }] = await Promise.all([
        supabase.from('kategoriler').select('*').eq('aktif', true).order('sira'),
        supabase.from('urunler').select('*').eq('aktif', true).order('ad'),
        supabase.from('salonlar').select('*').eq('aktif', true).order('sira'),
        supabase.from('yazici_yonlendirmeler').select('*').order('oncelik', { ascending: false })
      ])
      setKategoriler(kat || [])
      setUrunler(urn || [])
      setSalonlar(sal || [])
      setKurallar(kur || [])
    } catch (e) { toast.error('Veriler yüklenemedi') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { yukle() }, [yukle])

  const kaydet = async (form) => {
    try {
      await supabase.from('yazici_yonlendirmeler').insert({
        ...form,
        kategori_id: form.kural_turu === 'kategori' ? form.kategori_id : null,
        urun_id: form.kural_turu === 'urun' ? form.urun_id : null,
        salon_id: form.kural_turu === 'salon' ? form.salon_id : null,
        siparis_turu: form.kural_turu === 'tur' ? form.siparis_turu : null,
      })
      toast.success('Kural eklendi')
      setModal(false)
      yukle()
    } catch (e) { toast.error('Kaydedilemedi: ' + e.message) }
  }

  const sil = async (id) => {
    if (!confirm('Bu kuralı silmek istiyor musunuz?')) return
    await supabase.from('yazici_yonlendirmeler').delete().eq('id', id)
    toast.success('Silindi')
    yukle()
  }

  const toggle = async (kural) => {
    await supabase.from('yazici_yonlendirmeler').update({ aktif: !kural.aktif }).eq('id', kural.id)
    yukle()
  }

  // Yazıcıya göre grupla
  const yaziciGruplari = yazicilar.map(y => ({
    ...y,
    kurallar: kurallar.filter(k => k.yazici_id === y.id)
  }))

  const atanmamisKurallar = kurallar.filter(k => !yazicilar.find(y => y.id === k.yazici_id))

  if (loading) return <div className="loading-center"><div className="spinner" /></div>

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Yazıcı Yönlendirme Kuralları</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
            {kurallar.length} kural · Hangi ürün/kategori hangi yazıcıya gidecek
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)} disabled={!bridgeAktif}>
          <Plus size={14} /> Kural Ekle
        </button>
      </div>

      {!bridgeAktif && (
        <div style={{ padding: '12px 16px', background: 'var(--red-light)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--red)', marginBottom: 16 }}>
          ⚠️ Bridge servisi çalışmıyor — yazıcı listesi alınamıyor. <code>npm start</code> ile başlatın.
        </div>
      )}

      {/* Öncelik açıklaması */}
      <div className="card" style={{ marginBottom: 16, padding: '12px 16px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>📋 Kural Öncelik Sırası</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: 'var(--text2)', flexWrap: 'wrap' }}>
          <span style={{ background: '#534AB7', color: '#fff', padding: '2px 10px', borderRadius: 10 }}>1. Ürün</span>
          <span>→</span>
          <span style={{ background: '#1D9E75', color: '#fff', padding: '2px 10px', borderRadius: 10 }}>2. Kategori</span>
          <span>→</span>
          <span style={{ background: '#185FA5', color: '#fff', padding: '2px 10px', borderRadius: 10 }}>3. Salon</span>
          <span>→</span>
          <span style={{ background: '#BA7517', color: '#fff', padding: '2px 10px', borderRadius: 10 }}>4. Sipariş Türü</span>
          <span>→</span>
          <span style={{ background: '#D85A30', color: '#fff', padding: '2px 10px', borderRadius: 10 }}>5. Varsayılan</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>
          Her kalem için en spesifik kural uygulanır. Örnek: "Künefe" için önce ürün kuralı, yoksa kategori kuralı, yoksa varsayılan.
        </div>
      </div>

      {/* Yazıcı başlıkları altında kurallar */}
      {yaziciGruplari.map(y => {
        const kuralRenk = y.kurallar.length > 0 ? 'var(--green)' : 'var(--border-md)'
        return (
          <div key={y.id} className="card" style={{ marginBottom: 12, padding: 0, overflow: 'hidden', borderLeft: `4px solid ${kuralRenk}` }}>
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface2)' }}>
              <Printer size={16} color={kuralRenk} />
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{y.ad}</span>
                <span style={{ fontSize: 11, color: 'var(--text2)', marginLeft: 8 }}>
                  {y.tip} · {y.ip}:{y.port}
                </span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text2)' }}>{y.kurallar.length} kural</span>
            </div>

            {y.kurallar.length === 0 ? (
              <div style={{ padding: '16px', fontSize: 13, color: 'var(--text3)', textAlign: 'center' }}>
                Bu yazıcıya henüz kural atanmamış
              </div>
            ) : (
              <div>
                {y.kurallar.sort((a, b) => b.oncelik - a.oncelik).map(k => {
                  const tip = KURAL_TIPLERI.find(t => t.id === k.kural_turu)
                  return (
                    <div key={k.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 16px', borderTop: '0.5px solid var(--border)',
                      opacity: k.aktif ? 1 : .5
                    }}>
                      {tip && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                          background: tip.renk + '15', color: tip.renk
                        }}>
                          <tip.icon size={10} /> {tip.label}
                        </span>
                      )}
                      <span style={{ flex: 1, fontSize: 13 }}>
                        <KuralEtiket kural={k} kategoriler={kategoriler} urunler={urunler} salonlar={salonlar} />
                        {k.aciklama && <span style={{ color: 'var(--text3)', fontSize: 11, marginLeft: 8 }}>— {k.aciklama}</span>}
                      </span>
                      {k.oncelik > 0 && (
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>Öncelik: {k.oncelik}</span>
                      )}
                      <button className="btn btn-ghost btn-sm" onClick={() => toggle(k)}
                        style={{ fontSize: 11 }}>
                        {k.aktif ? '✓ Aktif' : '○ Pasif'}
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => sil(k.id)}
                        style={{ color: 'var(--red)' }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {/* Yazıcısı silinmiş kurallar */}
      {atanmamisKurallar.length > 0 && (
        <div className="card" style={{ borderLeft: '4px solid var(--red)', padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', background: 'var(--red-light)', fontSize: 12, color: 'var(--red)', fontWeight: 600 }}>
            ⚠️ Yazıcısı silinmiş kurallar
          </div>
          {atanmamisKurallar.map(k => (
            <div key={k.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', borderTop: '0.5px solid var(--border)', gap: 10 }}>
              <span style={{ flex: 1, fontSize: 13, color: 'var(--text2)' }}>Kural ID: {k.id.slice(-8)}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => sil(k.id)} style={{ color: 'var(--red)' }}>
                <Trash2 size={12} /> Sil
              </button>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <YonlendirmeModal
          yazicilar={yazicilar}
          kategoriler={kategoriler}
          urunler={urunler}
          salonlar={salonlar}
          onKaydet={kaydet}
          onKapat={() => setModal(false)}
        />
      )}
    </div>
  )
}
