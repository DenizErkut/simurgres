import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2, ToggleRight, ToggleLeft, Users, Layout, Tag, ChevronRight } from 'lucide-react'

// ─── SALON YÖNETİMİ ──────────────────────────────────────────────────────────
function SalonYonetimi() {
  const [salonlar, setSalonlar] = useState([])
  const [yeni, setYeni] = useState('')
  const [duzenle, setDuzenle] = useState(null)

  const yukle = useCallback(async () => {
    const { data } = await supabase.from('salonlar').select('*').order('sira')
    setSalonlar(data || [])
  }, [])

  useEffect(() => { yukle() }, [yukle])

  const ekle = async () => {
    if (!yeni.trim()) return
    const { error } = await supabase.from('salonlar').insert({ ad: yeni.trim(), sira: salonlar.length + 1 })
    if (error) { toast.error('Eklenemedi'); return }
    toast.success('Salon eklendi')
    setYeni('')
    yukle()
  }

  const guncelle = async (id, ad) => {
    await supabase.from('salonlar').update({ ad }).eq('id', id)
    toast.success('Güncellendi')
    setDuzenle(null)
    yukle()
  }

  const toggleAktif = async (s) => {
    await supabase.from('salonlar').update({ aktif: !s.aktif }).eq('id', s.id)
    yukle()
  }

  const sil = async (id) => {
    if (!confirm('Bu salonu silmek istediğinizden emin misiniz? Bağlı masalar da silinecek.')) return
    await supabase.from('salonlar').delete().eq('id', id)
    toast.success('Salon silindi')
    yukle()
  }

  return (
    <div>
      {/* Yeni salon ekle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input placeholder="Yeni salon adı (örn: Bahçe)" value={yeni}
          onChange={e => setYeni(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && ekle()}
          style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={ekle}>
          <Plus size={14} /> Ekle
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {salonlar.map(s => (
          <div key={s.id} className="card-sm" style={{
            display: 'flex', alignItems: 'center', gap: 10,
            opacity: s.aktif ? 1 : .5
          }}>
            <div style={{ fontSize: 16, width: 28, textAlign: 'center' }}>🏠</div>
            {duzenle === s.id ? (
              <input defaultValue={s.ad} autoFocus style={{ flex: 1, padding: '4px 8px' }}
                onBlur={e => guncelle(s.id, e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') guncelle(s.id, e.target.value); if (e.key === 'Escape') setDuzenle(null) }} />
            ) : (
              <span style={{ flex: 1, fontWeight: 500 }}>{s.ad}</span>
            )}
            <span className={`badge ${s.aktif ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: 10 }}>
              {s.aktif ? 'Aktif' : 'Pasif'}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => setDuzenle(s.id)}><Edit2 size={12} /></button>
            <button className="btn btn-ghost btn-sm" onClick={() => toggleAktif(s)}>
              {s.aktif ? <ToggleRight size={15} color="var(--green)" /> : <ToggleLeft size={15} color="var(--text3)" />}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => sil(s.id)}
              style={{ color: 'var(--red)' }}><Trash2 size={12} /></button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── MASA YÖNETİMİ ────────────────────────────────────────────────────────────
function MasaYonetimi() {
  const [salonlar, setSalonlar] = useState([])
  const [masalar, setMasalar] = useState([])
  const [seciliSalon, setSeciliSalon] = useState(null)
  const [yeniMasa, setYeniMasa] = useState({ no: '', kapasite: 4 })
  const [duzenle, setDuzenle] = useState(null)

  const yukle = useCallback(async () => {
    const { data: s } = await supabase.from('salonlar').select('*').eq('aktif', true).order('sira')
    setSalonlar(s || [])
    if (!seciliSalon && s && s.length > 0) setSeciliSalon(s[0])
  }, [seciliSalon])

  const masaYukle = useCallback(async () => {
    if (!seciliSalon) return
    const { data } = await supabase.from('masalar').select('*').eq('salon_id', seciliSalon.id).order('no')
    setMasalar(data || [])
  }, [seciliSalon])

  useEffect(() => { yukle() }, [yukle])
  useEffect(() => { masaYukle() }, [masaYukle])

  const masaEkle = async () => {
    if (!yeniMasa.no.trim() || !seciliSalon) return
    const { error } = await supabase.from('masalar').insert({
      salon_id: seciliSalon.id, no: yeniMasa.no.trim(),
      kapasite: parseInt(yeniMasa.kapasite) || 4
    })
    if (error) { toast.error(error.message); return }
    toast.success('Masa eklendi')
    setYeniMasa({ no: '', kapasite: 4 })
    masaYukle()
  }

  const masaSil = async (id) => {
    if (!confirm('Bu masayı silmek istiyor musunuz?')) return
    await supabase.from('masalar').delete().eq('id', id)
    toast.success('Masa silindi')
    masaYukle()
  }

  const masaGuncelle = async (id, updates) => {
    const { error } = await supabase.from('masalar').update(updates).eq('id', id)
    if (error) { toast.error('Güncelleme hatası: ' + error.message); return }
    if (!updates.renk && updates.renk !== null) setDuzenle(null)
    masaYukle()
  }

  const toggleAktif = async (m) => {
    await supabase.from('masalar').update({ aktif: !m.aktif }).eq('id', m.id)
    masaYukle()
  }

  // Toplu masa ekle
  const topluEkle = async () => {
    if (!seciliSalon) return
    const adet = parseInt(prompt('Kaç masa eklensin?', '5'))
    if (!adet || adet < 1) return
    const kapasite = parseInt(prompt('Kapasite?', '4')) || 4
    
    // Mevcut masaların numaralarından en büyüğünü bul, ardışık devam et
    const prefix = seciliSalon.ad.charAt(0).toUpperCase()
    const mevcutNolar = masalar
      .map(m => parseInt(m.no.replace(/^\D+/, '')))
      .filter(n => !isNaN(n))
    const baslangic = mevcutNolar.length > 0 ? Math.max(...mevcutNolar) + 1 : 1
    
    const eklenecekler = Array.from({ length: adet }, (_, i) => ({
      salon_id: seciliSalon.id,
      no: `${prefix}${baslangic + i}`,
      kapasite,
      sira: masalar.length + i + 1
    }))
    await supabase.from('masalar').insert(eklenecekler)
    toast.success(`${adet} masa eklendi: ${prefix}${baslangic} – ${prefix}${baslangic + adet - 1}`)
    masaYukle()
  }

  return (
    <div>
      {/* Salon seç */}
      <div className="pill-tabs" style={{ marginBottom: 14 }}>
        {salonlar.map(s => (
          <button key={s.id} className={`pill ${seciliSalon?.id === s.id ? 'active' : ''}`}
            onClick={() => setSeciliSalon(s)}>
            {s.ad}
          </button>
        ))}
      </div>

      {seciliSalon && (
        <>
          {/* Yeni masa ekle */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label>Masa No</label>
              <input placeholder="M11" value={yeniMasa.no}
                onChange={e => setYeniMasa(f => ({ ...f, no: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && masaEkle()} />
            </div>
            <div style={{ width: 100 }}>
              <label>Kapasite</label>
              <input type="number" min={1} max={20} value={yeniMasa.kapasite}
                onChange={e => setYeniMasa(f => ({ ...f, kapasite: e.target.value }))} />
            </div>
            <button className="btn btn-primary" onClick={masaEkle}><Plus size={14} /> Ekle</button>
            <button className="btn btn-ghost" onClick={topluEkle} style={{ whiteSpace: 'nowrap' }}>
              Toplu Ekle
            </button>
          </div>

          {/* Masa listesi */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
            {masalar.map(m => (
              <div key={m.id} className="card-sm" style={{
                opacity: m.aktif ? 1 : .45,
                borderLeft: m.renk ? `4px solid ${m.renk}` : m.durum === 'dolu' ? '3px solid var(--amber)' : '3px solid var(--border)',
                borderTop: m.renk ? `2px solid ${m.renk}20` : undefined
              }}>
                {duzenle === m.id ? (
                  <input defaultValue={m.no} autoFocus
                    style={{ width: '100%', fontWeight: 700, fontSize: 15, marginBottom: 6 }}
                    onBlur={e => masaGuncelle(m.id, { no: e.target.value })}
                    onKeyDown={e => { if (e.key === 'Enter') masaGuncelle(m.id, { no: e.target.value }); if (e.key === 'Escape') setDuzenle(null) }} />
                ) : (
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{m.no}</div>
                )}
                <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 6 }}>
                  {m.kapasite} kişilik · <span style={{ color: m.durum === 'dolu' ? 'var(--amber)' : 'var(--green)' }}>
                    {m.durum === 'dolu' ? 'Dolu' : 'Boş'}
                  </span>
                </div>
                {/* Renk seçici — yatay scroll */}
                <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 3, marginBottom: 6, scrollbarWidth: 'none' }}>
                  {[null,'#D85A30','#1D9E75','#185FA5','#BA7517','#534AB7','#639922','#E4002B','#f27a1a','#5d3ebc','#888780','#FF6B6B','#4ECDC4','#45B7D1'].map((renk, i) => (
                    <div key={i}
                      onClick={e => { e.stopPropagation(); masaGuncelle(m.id, { renk }) }}
                      title={renk || 'Renk yok'}
                      style={{
                        width: 18, height: 18, borderRadius: 4, cursor: 'pointer', flexShrink: 0,
                        background: renk || '#fff',
                        border: m.renk === renk
                          ? '2.5px solid #222'
                          : renk ? '1px solid rgba(0,0,0,.15)' : '1px solid var(--border-md)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                      {!renk && <span style={{ fontSize: 9, color: '#aaa', lineHeight: 1 }}>✕</span>}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1, padding: '4px 0' }}
                    onClick={() => setDuzenle(m.id)}><Edit2 size={11} /></button>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1, padding: '4px 0' }}
                    onClick={() => toggleAktif(m)}>
                    {m.aktif ? <ToggleRight size={13} color="var(--green)" /> : <ToggleLeft size={13} color="var(--text3)" />}
                  </button>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1, padding: '4px 0', color: 'var(--red)' }}
                    onClick={() => masaSil(m.id)} disabled={m.durum === 'dolu'}>
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 10 }}>
            {masalar.length} masa · Dolu masalar silinemez
          </div>
        </>
      )}
    </div>
  )
}

// ─── KATEGORİ YÖNETİMİ ───────────────────────────────────────────────────────
function KategoriYonetimi() {
  const [kategoriler, setKategoriler] = useState([])
  const [yeni, setYeni] = useState({ ad: '', emoji: '🍽️', tip: 'restoran' })
  const [duzenle, setDuzenle] = useState(null)
  const [yazicilar, setYazicilar] = useState([])
  const [katYazici, setKatYazici] = useState({}) // kategori_id -> yazici_id

  const yukle = useCallback(async () => {
    const { data } = await supabase.from('kategoriler').select('*').order('sira')
    setKategoriler(data || [])
    // Yazıcıları çek
    try {
      const res = await fetch('http://127.0.0.1:7779/api/yazicilar', { signal: AbortSignal.timeout(2000) })
      setYazicilar(await res.json())
    } catch { setYazicilar([]) }
    // Mevcut kategori yazıcı kurallarını çek
    const { data: kurallar } = await supabase
      .from('yazici_yonlendirmeler')
      .select('*')
      .eq('kural_turu', 'kategori')
      .eq('aktif', true)
    if (kurallar) {
      const map = {}
      kurallar.forEach(k => { map[k.kategori_id] = k.yazici_id })
      setKatYazici(map)
    }
  }, [])

  const kategoriYaziciDegistir = async (kategoriId, yaziciId) => {
    // Eski kuralı sil
    await supabase.from('yazici_yonlendirmeler')
      .delete()
      .eq('kural_turu', 'kategori')
      .eq('kategori_id', kategoriId)
    // Yeni kural ekle
    if (yaziciId) {
      await supabase.from('yazici_yonlendirmeler').insert({
        yazici_id: yaziciId,
        kural_turu: 'kategori',
        kategori_id: kategoriId,
        oncelik: 10,
        aktif: true,
        aciklama: 'Menü sayfasından atandı'
      })
    }
    setKatYazici(prev => ({ ...prev, [kategoriId]: yaziciId }))
    toast.success(yaziciId ? 'Yazıcı atandı' : 'Yazıcı kaldırıldı')
  }

  useEffect(() => { yukle() }, [yukle])

  const ekle = async () => {
    if (!yeni.ad.trim()) return
    await supabase.from('kategoriler').insert({ ad: yeni.ad, emoji: yeni.emoji, tip: yeni.tip || 'restoran', sira: kategoriler.length + 1 })
    toast.success('Kategori eklendi')
    setYeni({ ad: '', emoji: '🍽️', tip: 'restoran' })
    yukle()
  }

  const sil = async (id) => {
    if (!confirm('Bu kategoriyi silmek istiyor musunuz?')) return
    await supabase.from('kategoriler').delete().eq('id', id)
    toast.success('Silindi'); yukle()
  }

  const toggleAktif = async (k) => {
    await supabase.from('kategoriler').update({ aktif: !k.aktif }).eq('id', k.id)
    yukle()
  }

  const guncelle = async (id, updates) => {
    await supabase.from('kategoriler').update(updates).eq('id', id)
    setDuzenle(null); yukle()
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'flex-end' }}>
        <div style={{ width: 60 }}>
          <label>Emoji</label>
          <input value={yeni.emoji} onChange={e => setYeni(f => ({ ...f, emoji: e.target.value }))} style={{ textAlign: 'center', fontSize: 18 }} />
        </div>
        <div style={{ flex: 1 }}>
          <label>Kategori Adı</label>
          <input placeholder="İçecekler" value={yeni.ad}
            onChange={e => setYeni(f => ({ ...f, ad: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && ekle()} />
        </div>
        <div style={{ width: 150 }}>
          <label>Nerede görünsün</label>
          <select value={yeni.tip} onChange={e => setYeni(f => ({ ...f, tip: e.target.value }))}>
            <option value="restoran">🍽️ Restoran</option>
            <option value="hizli_satis">🛒 Hızlı Satış</option>
            <option value="ikisi">🔁 İkisi</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={ekle}><Plus size={14} /> Ekle</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {kategoriler.map((k, i) => (
          <div key={k.id} className="card-sm" style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: k.aktif ? 1 : .5 }}>
            <div style={{ fontSize: 20, width: 32, textAlign: 'center' }}>{k.emoji}</div>
            {duzenle === k.id ? (
              <input defaultValue={k.ad} autoFocus style={{ flex: 1 }}
                onBlur={e => guncelle(k.id, { ad: e.target.value })}
                onKeyDown={e => { if (e.key === 'Enter') guncelle(k.id, { ad: e.target.value }); if (e.key === 'Escape') setDuzenle(null) }} />
            ) : (
              <span style={{ flex: 1, fontWeight: 500 }}>{k.ad}</span>
            )}
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>Sıra: {i + 1}</span>
            <select
              value={k.tip || 'restoran'}
              onChange={e => guncelle(k.id, { tip: e.target.value })}
              style={{ fontSize: 11, padding: '3px 6px', width: 130,
                border: '0.5px solid var(--border-md)', borderRadius: 'var(--radius)' }}
              title="Bu kategori nerede görünsün">
              <option value="restoran">🍽️ Restoran</option>
              <option value="hizli_satis">🛒 Hızlı Satış</option>
              <option value="ikisi">🔁 İkisi</option>
            </select>
            {yazicilar.length > 0 && (
              <select
                value={katYazici[k.id] || ''}
                onChange={e => kategoriYaziciDegistir(k.id, e.target.value)}
                style={{ fontSize: 11, padding: '3px 6px', width: 140,
                  color: katYazici[k.id] ? 'var(--green)' : 'var(--text3)',
                  border: katYazici[k.id] ? '1px solid var(--green)' : '0.5px solid var(--border-md)',
                  borderRadius: 'var(--radius)' }}
                title="Bu kategorinin yazıcısı">
                <option value="">🖨️ Yazıcı seç</option>
                {yazicilar.map(y => <option key={y.id} value={y.id}>🖨️ {y.ad}</option>)}
              </select>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => setDuzenle(k.id)}><Edit2 size={12} /></button>
            <button className="btn btn-ghost btn-sm" onClick={() => toggleAktif(k)}>
              {k.aktif ? <ToggleRight size={15} color="var(--green)" /> : <ToggleLeft size={15} color="var(--text3)" />}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => sil(k.id)} style={{ color: 'var(--red)' }}>
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── ANA SAYFA ────────────────────────────────────────────────────────────────
const SEKMELER = [
  { id: 'masalar', label: 'Salonlar & Masalar', icon: Layout },
  { id: 'kategoriler', label: 'Kategoriler', icon: Tag },
  { id: 'kullanicilar', label: 'Kullanıcılar', icon: Users },
]

export default function YonetimPage() {
  const [aktif, setAktif] = useState('masalar')

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {SEKMELER.map(({ id, label, icon: Icon }) => (
          <button key={id}
            onClick={() => setAktif(id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '8px 16px', borderRadius: 'var(--radius)',
              border: aktif === id ? '1.5px solid #6b6b6b' : '1.5px solid var(--border)',
              background: aktif === id ? '#f1efe8' : 'var(--surface)',
              cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
              fontWeight: aktif === id ? 600 : 400,
              color: aktif === id ? '#444' : 'var(--text2)',
              transition: 'all .15s'
            }}>
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      <div className="card">
        {aktif === 'masalar' && (
          <>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Salon & Masa Yönetimi</div>
            <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>Salonlar</div>
            <SalonYonetimi />
            <div className="divider" style={{ margin: '20px 0' }} />
            <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>Masalar</div>
            <MasaYonetimi />
          </>
        )}
        {aktif === 'kategoriler' && (
          <>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Kategori Yönetimi</div>
            <KategoriYonetimi />
          </>
        )}
        {aktif === 'kullanicilar' && (
          <>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Kullanıcı Yönetimi</div>
            {/* KullanicilarPage içeriğini burada import etmek yerine dinamik yükle */}
            <KullanicilarIcerik />
          </>
        )}
      </div>
    </div>
  )
}

// Kullanıcı yönetimini inline olarak ekle
import KullanicilarPage from './KullanicilarPage'
function KullanicilarIcerik() {
  return <KullanicilarPage embedded />
}
