import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useIzin } from '../contexts/IzinContext'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2, Search, X, TrendingUp, TrendingDown, Phone, Mail, MapPin, FileText, Users } from 'lucide-react'

const para = (v) => `₺${(v||0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const TUR_LABEL = { musteri: 'Müşteri', tedarikci: 'Tedarikçi', personel: 'Personel', diger: 'Diğer' }
const TUR_RENK = { musteri: '#1D9E75', tedarikci: '#185FA5', personel: '#534AB7', diger: '#888780' }
const TUR_EMOJI = { musteri: '🧑‍🤝‍🧑', tedarikci: '🚚', personel: '👤', diger: '📋' }

function CariModal({ cari, onKaydet, onKapat }) {
  const [form, setForm] = useState(cari || {
    tur: 'musteri', unvan: '', yetkili_ad: '', telefon: '', email: '',
    adres: '', vergi_no: '', vergi_dairesi: '', iban: '', notlar: ''
  })
  const [yukleniyor, setYukleniyor] = useState(false)

  const kaydet = async () => {
    if (!form.unvan) { toast.error('Ünvan/Ad zorunlu'); return }
    setYukleniyor(true)
    try {
      await onKaydet({
        tur: form.tur, unvan: form.unvan, yetkili_ad: form.yetkili_ad || null,
        telefon: form.telefon || null, email: form.email || null, adres: form.adres || null,
        vergi_no: form.vergi_no || null, vergi_dairesi: form.vergi_dairesi || null,
        iban: form.iban || null, notlar: form.notlar || null
      })
    } finally { setYukleniyor(false) }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onKapat()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-title">{cari ? 'Cari Düzenle' : 'Yeni Cari Hesap'}</div>

        <div className="form-row">
          <label>Cari Türü</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {Object.entries(TUR_LABEL).map(([key, label]) => (
              <button key={key} type="button"
                onClick={() => setForm(f => ({ ...f, tur: key }))}
                className={`pill ${form.tur === key ? 'active' : ''}`}
                style={{ flex: 1, fontSize: 12 }}>
                {TUR_EMOJI[key]} {label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-row">
          <label>{form.tur === 'personel' ? 'Ad Soyad *' : 'Ünvan / Firma Adı *'}</label>
          <input value={form.unvan} onChange={e => setForm(f => ({ ...f, unvan: e.target.value }))}
            placeholder={form.tur === 'personel' ? 'Ahmet Yılmaz' : 'ABC Gıda Ltd. Şti.'} />
        </div>

        {form.tur !== 'personel' && (
          <div className="form-row">
            <label>Yetkili Kişi</label>
            <input value={form.yetkili_ad || ''} onChange={e => setForm(f => ({ ...f, yetkili_ad: e.target.value }))} placeholder="İletişim kişisi" />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-row">
            <label>Telefon</label>
            <input value={form.telefon || ''} onChange={e => setForm(f => ({ ...f, telefon: e.target.value }))} placeholder="0532 xxx xx xx" />
          </div>
          <div className="form-row">
            <label>E-posta</label>
            <input value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="ornek@firma.com" />
          </div>
        </div>

        <div className="form-row">
          <label>Adres</label>
          <textarea rows={2} value={form.adres || ''} onChange={e => setForm(f => ({ ...f, adres: e.target.value }))} placeholder="Adres..." />
        </div>

        {form.tur !== 'personel' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-row">
              <label>Vergi No</label>
              <input value={form.vergi_no || ''} onChange={e => setForm(f => ({ ...f, vergi_no: e.target.value }))} />
            </div>
            <div className="form-row">
              <label>Vergi Dairesi</label>
              <input value={form.vergi_dairesi || ''} onChange={e => setForm(f => ({ ...f, vergi_dairesi: e.target.value }))} />
            </div>
          </div>
        )}

        <div className="form-row">
          <label>IBAN</label>
          <input value={form.iban || ''} onChange={e => setForm(f => ({ ...f, iban: e.target.value }))} placeholder="TR.." />
        </div>

        <div className="form-row">
          <label>Notlar</label>
          <textarea rows={2} value={form.notlar || ''} onChange={e => setForm(f => ({ ...f, notlar: e.target.value }))} />
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onKapat}>İptal</button>
          <button className="btn btn-primary" onClick={kaydet} disabled={yukleniyor}>
            {yukleniyor ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  )
}

function HareketModal({ cari, onKaydet, onKapat }) {
  const [tip, setTip] = useState('tahsilat')
  const [tutar, setTutar] = useState('')
  const [aciklama, setAciklama] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)

  const TIP_BILGI = {
    borc: { label: 'Borç Ekle (cari bize borçlandı)', renk: 'var(--red)', isaret: '+' },
    alacak: { label: 'Alacak Ekle (biz cariye borçlandık)', renk: 'var(--amber)', isaret: '-' },
    tahsilat: { label: 'Tahsilat (cariden para aldık)', renk: 'var(--green)', isaret: '-' },
    odeme: { label: 'Ödeme (cariye para verdik)', renk: 'var(--blue)', isaret: '+' },
  }

  const kaydet = async () => {
    const t = parseFloat(tutar)
    if (!t || t <= 0) { toast.error('Geçerli tutar girin'); return }
    setYukleniyor(true)
    try { await onKaydet(tip, t, aciklama) }
    finally { setYukleniyor(false) }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onKapat()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-title">{cari.unvan} — Hareket Ekle</div>
        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>
          Güncel Bakiye: <strong style={{ color: cari.bakiye >= 0 ? 'var(--green)' : 'var(--red)' }}>{para(cari.bakiye)}</strong>
          {cari.bakiye > 0 && ' (cari size borçlu)'}
          {cari.bakiye < 0 && ' (siz cariye borçlusunuz)'}
        </div>

        <div className="form-row">
          <label>Hareket Türü</label>
          <select value={tip} onChange={e => setTip(e.target.value)}>
            {Object.entries(TIP_BILGI).map(([key, info]) => (
              <option key={key} value={key}>{info.label}</option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <label>Tutar (₺)</label>
          <input type="number" value={tutar} onChange={e => setTutar(e.target.value)} placeholder="0.00" autoFocus />
        </div>

        <div className="form-row">
          <label>Açıklama</label>
          <input value={aciklama} onChange={e => setAciklama(e.target.value)} placeholder="İsteğe bağlı not..." />
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onKapat}>İptal</button>
          <button className="btn btn-primary" onClick={kaydet} disabled={yukleniyor}>
            {yukleniyor ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CariPage() {
  const { izinVar } = useIzin()
  const { kullanici } = useAuth()
  const [cariler, setCariler] = useState([])
  const [loading, setLoading] = useState(true)
  const [aktifTur, setAktifTur] = useState('tumu')
  const [aramaMetni, setAramaMetni] = useState('')
  const [modal, setModal] = useState(null)
  const [hareketModal, setHareketModal] = useState(null)
  const [detayAcik, setDetayAcik] = useState(null)
  const [hareketler, setHareketler] = useState([])

  const yukle = useCallback(async () => {
    const { data } = await supabase.from('cariler').select('*').eq('aktif', true).order('unvan')
    setCariler(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { yukle() }, [yukle])

  const hareketleriYukle = async (cariId) => {
    const { data } = await supabase.from('cari_hareketleri')
      .select('*').eq('cari_id', cariId).order('created_at', { ascending: false }).limit(50)
    setHareketler(data || [])
  }

  const cariKaydet = async (form) => {
    try {
      if (modal.cari) {
        const { error } = await supabase.from('cariler').update(form).eq('id', modal.cari.id)
        if (error) throw error
        toast.success('Cari güncellendi')
      } else {
        const { error } = await supabase.from('cariler').insert({ ...form, bakiye: 0 })
        if (error) throw error
        toast.success('Cari hesap oluşturuldu')
      }
      setModal(null); yukle()
    } catch (e) { toast.error('Hata: ' + e.message) }
  }

  const cariSil = async (cari) => {
    if (!window.confirm(`"${cari.unvan}" cari hesabını silmek istiyor musunuz?`)) return
    await supabase.from('cariler').update({ aktif: false }).eq('id', cari.id)
    toast.success('Cari hesap silindi')
    yukle()
  }

  const hareketEkle = async (tip, tutar, aciklama) => {
    const cari = hareketModal
    const isaretler = { borc: 1, alacak: -1, tahsilat: -1, odeme: 1 }
    const etki = tutar * isaretler[tip]
    const yeniBakiye = +(cari.bakiye + etki).toFixed(2)

    try {
      await supabase.from('cariler').update({ bakiye: yeniBakiye }).eq('id', cari.id)
      await supabase.from('cari_hareketleri').insert({
        cari_id: cari.id, hareket_tipi: tip, tutar,
        aciklama: aciklama || null, kaynak: 'manuel',
        onceki_bakiye: cari.bakiye, sonraki_bakiye: yeniBakiye,
        yapan_kullanici_id: kullanici?.id
      })
      toast.success('Hareket kaydedildi')
      setHareketModal(null); yukle()
      if (detayAcik === cari.id) hareketleriYukle(cari.id)
    } catch (e) { toast.error('Hata: ' + e.message) }
  }

  const detayAc = (cari) => {
    if (detayAcik === cari.id) { setDetayAcik(null); return }
    setDetayAcik(cari.id)
    hareketleriYukle(cari.id)
  }

  const filtreli = cariler.filter(c =>
    (aktifTur === 'tumu' || c.tur === aktifTur) &&
    (c.unvan?.toLowerCase().includes(aramaMetni.toLowerCase()) || c.telefon?.includes(aramaMetni))
  )

  const turSayilari = { tumu: cariler.length }
  Object.keys(TUR_LABEL).forEach(t => turSayilari[t] = cariler.filter(c => c.tur === t).length)

  if (!izinVar('cari_goruntule') && false) return ( // izin sistemi henüz cari_goruntule tanımlamadıysa varsayılan açık
    <div className="empty-state"><p>Bu sayfayı görüntüleme yetkiniz yok</p></div>
  )

  if (loading) return <div className="loading-center"><div className="spinner" /></div>

  const toplamAlacak = cariler.filter(c => c.bakiye > 0).reduce((a, c) => a + c.bakiye, 0)
  const toplamBorc = cariler.filter(c => c.bakiye < 0).reduce((a, c) => a + Math.abs(c.bakiye), 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={16} /> Cari Hesaplar
          </div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{cariler.length} cari hesap</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ cari: null })}>
          <Plus size={14} /> Yeni Cari
        </button>
      </div>

      {/* Özet kartlar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
        <div className="stat-kart" style={{ borderLeft: '3px solid var(--green)' }}>
          <div className="stat-label">Toplam Alacak</div>
          <div className="stat-val" style={{ color: 'var(--green)' }}>{para(toplamAlacak)}</div>
          <div className="stat-sub">Cariler size borçlu</div>
        </div>
        <div className="stat-kart" style={{ borderLeft: '3px solid var(--red)' }}>
          <div className="stat-label">Toplam Borç</div>
          <div className="stat-val" style={{ color: 'var(--red)' }}>{para(toplamBorc)}</div>
          <div className="stat-sub">Cariye borçlusunuz</div>
        </div>
        <div className="stat-kart">
          <div className="stat-label">Net Bakiye</div>
          <div className="stat-val" style={{ color: (toplamAlacak - toplamBorc) >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {para(toplamAlacak - toplamBorc)}
          </div>
        </div>
        <div className="stat-kart">
          <div className="stat-label">Aktif Cari</div>
          <div className="stat-val">{cariler.length}</div>
        </div>
      </div>

      {/* Tür filtreleri */}
      <div className="pill-tabs" style={{ marginBottom: 12 }}>
        <button className={`pill ${aktifTur === 'tumu' ? 'active' : ''}`} onClick={() => setAktifTur('tumu')}>
          Tümü ({turSayilari.tumu})
        </button>
        {Object.entries(TUR_LABEL).map(([key, label]) => (
          <button key={key} className={`pill ${aktifTur === key ? 'active' : ''}`} onClick={() => setAktifTur(key)}>
            {TUR_EMOJI[key]} {label} ({turSayilari[key]})
          </button>
        ))}
      </div>

      {/* Arama */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
        <input value={aramaMetni} onChange={e => setAramaMetni(e.target.value)}
          placeholder="Cari adı veya telefon ara..." style={{ paddingLeft: 32 }} />
      </div>

      {/* Cari listesi */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtreli.map(c => (
          <div key={c.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', cursor: 'pointer', gap: 12 }}
              onClick={() => detayAc(c)}>
              <div style={{
                width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                background: TUR_RENK[c.tur] + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16
              }}>
                {TUR_EMOJI[c.tur]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{c.unvan}</div>
                <div style={{ fontSize: 11, color: 'var(--text2)', display: 'flex', gap: 10, marginTop: 2 }}>
                  <span style={{ color: TUR_RENK[c.tur] }}>{TUR_LABEL[c.tur]}</span>
                  {c.telefon && <span><Phone size={10} style={{ display: 'inline', marginRight: 2 }} />{c.telefon}</span>}
                  {c.yetkili_ad && <span>👤 {c.yetkili_ad}</span>}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>Bakiye</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: c.bakiye > 0 ? 'var(--green)' : c.bakiye < 0 ? 'var(--red)' : 'var(--text2)' }}>
                  {para(c.bakiye)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                <button className="btn btn-ghost btn-sm" title="Hareket Ekle" onClick={() => setHareketModal(c)}>
                  <TrendingUp size={12} />
                </button>
                <button className="btn btn-ghost btn-sm" title="Düzenle" onClick={() => setModal({ cari: c })}>
                  <Edit2 size={12} />
                </button>
                <button className="btn btn-ghost btn-sm" title="Sil" style={{ color: 'var(--red)' }} onClick={() => cariSil(c)}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>

            {/* Detay açılır panel */}
            {detayAcik === c.id && (
              <div style={{ padding: '0 16px 14px', background: 'var(--surface2)', borderTop: '0.5px solid var(--border)' }}>
                {(c.adres || c.email || c.vergi_no) && (
                  <div style={{ display: 'flex', gap: 16, padding: '10px 0', fontSize: 12, color: 'var(--text2)', flexWrap: 'wrap' }}>
                    {c.email && <span><Mail size={11} style={{ display: 'inline', marginRight: 3 }} />{c.email}</span>}
                    {c.adres && <span><MapPin size={11} style={{ display: 'inline', marginRight: 3 }} />{c.adres}</span>}
                    {c.vergi_no && <span><FileText size={11} style={{ display: 'inline', marginRight: 3 }} />VKN: {c.vergi_no} {c.vergi_dairesi}</span>}
                  </div>
                )}
                <div style={{ fontWeight: 600, fontSize: 12, marginTop: 8, marginBottom: 6 }}>Son Hareketler</div>
                {hareketler.length === 0 ? (
                  <div style={{ color: 'var(--text3)', fontSize: 12, padding: '8px 0' }}>Henüz hareket yok</div>
                ) : (
                  <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                    {hareketler.map(h => (
                      <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '0.5px solid var(--border)', fontSize: 12 }}>
                        <span style={{ color: 'var(--text2)' }}>
                          {new Date(h.created_at).toLocaleDateString('tr-TR')} — {
                            { borc: 'Borç', alacak: 'Alacak', tahsilat: 'Tahsilat', odeme: 'Ödeme' }[h.hareket_tipi]
                          }
                          {h.aciklama && ` · ${h.aciklama}`}
                        </span>
                        <span style={{ fontWeight: 600, color: ['borc','odeme'].includes(h.hareket_tipi) ? 'var(--green)' : 'var(--red)' }}>
                          {['borc','odeme'].includes(h.hareket_tipi) ? '+' : '-'}{para(h.tutar)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {filtreli.length === 0 && (
          <div className="empty-state"><p>Cari hesap bulunamadı</p></div>
        )}
      </div>

      {modal && (
        <CariModal cari={modal.cari} onKaydet={cariKaydet} onKapat={() => setModal(null)} />
      )}
      {hareketModal && (
        <HareketModal cari={hareketModal} onKaydet={hareketEkle} onKapat={() => setHareketModal(null)} />
      )}
    </div>
  )
}
