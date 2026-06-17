import { useState, useEffect, useCallback } from 'react'
import { siparislerApi, realtimeApi, masalarApi } from '../lib/supabase'
import { supabase } from '../lib/supabase'
import { useIzin } from '../contexts/IzinContext'
import toast from 'react-hot-toast'
import {
  CreditCard, Smartphone, Banknote, FileText,
  CheckCircle, Percent, RotateCcw, ArrowRightLeft,
  GitMerge, X, Plus, Trash2, Users, Divide
} from 'lucide-react'

const TUM_ODEME = [
  { label: 'Nakit',       icon: Banknote,    izin: 'nakit_odeme' },
  { label: 'Kredi Kartı', icon: CreditCard,  izin: 'kart_odeme'  },
  { label: 'Online',      icon: Smartphone,  izin: null           },
  { label: 'Cari Hesap',  icon: FileText,    izin: 'cari_odeme'  },
]

// ─── BÖLÜNMÜŞ ÖDEME MODALİ ───────────────────────────────────────────────────
function BolunmusOdemeModal({ genel, onOde, onKapat, izinliOdemeler }) {
  const [satirlar, setSatirlar] = useState([
    { id: 1, yontem: izinliOdemeler[0]?.label || 'Nakit', tutar: '' }
  ])

  const toplamGirilen = satirlar.reduce((a, s) => a + (parseFloat(s.tutar) || 0), 0)
  const kalan = +(genel - toplamGirilen).toFixed(2)

  const satirEkle = () => setSatirlar(p => [...p, { id: Date.now(), yontem: izinliOdemeler[0]?.label || 'Nakit', tutar: '' }])
  const satirSil = (id) => setSatirlar(p => p.filter(s => s.id !== id))
  const satirGuncelle = (id, alan, deger) => setSatirlar(p => p.map(s => s.id === id ? { ...s, [alan]: deger } : s))
  const kalanDoldur = (id) => satirGuncelle(id, 'tutar', kalan > 0 ? String(kalan.toFixed(2)) : '0')

  const gecerli = Math.abs(kalan) < 0.01 && satirlar.every(s => parseFloat(s.tutar) > 0)

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onKapat()}>
      <div className="modal" style={{ width: 420 }}>
        <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Divide size={15} /> Bölünmüş Ödeme
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface2)', borderRadius: 'var(--radius)', marginBottom: 14, fontSize: 13 }}>
          <span style={{ color: 'var(--text2)' }}>Genel Toplam</span>
          <span style={{ fontWeight: 700 }}>₺{genel.toFixed(2)}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {satirlar.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <select value={s.yontem} onChange={e => satirGuncelle(s.id, 'yontem', e.target.value)}
                style={{ width: 130, flexShrink: 0 }}>
                {izinliOdemeler.map(o => <option key={o.label}>{o.label}</option>)}
              </select>
              <input type="number" placeholder="0.00" value={s.tutar}
                onChange={e => satirGuncelle(s.id, 'tutar', e.target.value)}
                style={{ flex: 1 }} />
              {i === satirlar.length - 1 && kalan > 0 && (
                <button className="btn btn-ghost btn-sm" onClick={() => kalanDoldur(s.id)}
                  style={{ whiteSpace: 'nowrap', fontSize: 11 }}>
                  ₺{kalan.toFixed(2)} kalan
                </button>
              )}
              {satirlar.length > 1 && (
                <button className="btn btn-ghost btn-sm" onClick={() => satirSil(s.id)}>
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>

        <button className="btn btn-ghost btn-sm" onClick={satirEkle} style={{ width: '100%', marginBottom: 12 }}>
          <Plus size={12} /> Ödeme yöntemi ekle
        </button>

        <div style={{
          display: 'flex', justifyContent: 'space-between', padding: '10px 12px',
          borderRadius: 'var(--radius)', marginBottom: 12, fontSize: 13,
          background: Math.abs(kalan) < 0.01 ? 'var(--green-light)' : kalan < 0 ? 'var(--red-light)' : 'var(--amber-light)',
          color: Math.abs(kalan) < 0.01 ? '#085041' : kalan < 0 ? 'var(--red)' : '#633806'
        }}>
          <span>{kalan > 0 ? 'Eksik' : kalan < 0 ? 'Fazla' : '✓ Tam'}</span>
          <span style={{ fontWeight: 700 }}>{kalan !== 0 ? `₺${Math.abs(kalan).toFixed(2)}` : 'Tamam'}</span>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onKapat}>İptal</button>
          <button className="btn btn-primary" disabled={!gecerli}
            onClick={() => onOde(satirlar.map(s => ({ yontem: s.yontem, tutar: parseFloat(s.tutar) })))}>
            <CheckCircle size={13} /> Ödemeyi Tamamla
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── ALMAN USULÜ (HERKES KENDİ PAYINI ÖDER) ──────────────────────────────────
function AlmanUsulModal({ siparis, genel, onOde, onKapat, izinliOdemeler }) {
  const kalemler = siparis?.siparis_kalemleri || []
  // Gruplu kalemler
  const gruplu = Object.values(kalemler.reduce((acc, k) => {
    if (acc[k.urun_ad]) acc[k.urun_ad].adet += k.adet
    else acc[k.urun_ad] = { ...k }
    return acc
  }, {}))

  const [kisiler, setKisiler] = useState([
    { id: 1, ad: 'Kişi 1', secimler: {}, odendi: false, yontem: izinliOdemeler[0]?.label || 'Nakit' }
  ])

  const kisiEkle = () => {
    const n = kisiler.length + 1
    setKisiler(p => [...p, { id: Date.now(), ad: `Kişi ${n}`, secimler: {}, odendi: false, yontem: izinliOdemeler[0]?.label || 'Nakit' }])
  }
  const kisiSil = (id) => setKisiler(p => p.filter(k => k.id !== id))

  const secimDegistir = (kisiId, urunAd, adet) => {
    setKisiler(p => p.map(k => k.id === kisiId ? { ...k, secimler: { ...k.secimler, [urunAd]: Math.max(0, adet) } } : k))
  }

  const kisiToplam = (kisi) => {
    return gruplu.reduce((acc, u) => {
      const adet = kisi.secimler[u.urun_ad] || 0
      return acc + u.urun_fiyat * adet
    }, 0)
  }

  // Her üründen kaç adet seçildi
  const seciliAdet = (urunAd) => kisiler.reduce((a, k) => a + (k.secimler[urunAd] || 0), 0)
  const kalanAdet = (u) => u.adet - seciliAdet(u.urun_ad)

  const tumAtanmis = gruplu.every(u => kalanAdet(u) === 0)
  const toplamOdenen = kisiler.reduce((a, k) => a + kisiToplam(k), 0)

  const kisiOde = (kisiId) => {
    setKisiler(p => p.map(k => k.id === kisiId ? { ...k, odendi: true } : k))
    const kisi = kisiler.find(k => k.id === kisiId)
    toast.success(`${kisi.ad} ödedi — ₺${kisiToplam(kisi).toFixed(2)} (${kisi.yontem})`)
  }

  const hepsiniTamamla = () => {
    // Sadece ödendi işaretlenenler + toplamı sıfır olmayanlar
    const odemeler = kisiler
      .filter(k => k.odendi && kisiToplam(k) > 0)
      .map(k => ({ yontem: k.yontem, tutar: kisiToplam(k) }))
    
    // Ödenmemiş kişiler varsa onları da varsayılan yöntemle ekle
    kisiler.filter(k => !k.odendi && kisiToplam(k) > 0).forEach(k => {
      odemeler.push({ yontem: k.yontem, tutar: kisiToplam(k) })
    })
    
    onOde(odemeler)
  }

  const hepsiOdedi = kisiler.every(k => k.odendi || kisiToplam(k) === 0)

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onKapat()}>
      <div className="modal" style={{ width: 560, maxHeight: '85vh' }}>
        <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={15} /> Alman Usulü — Herkes Kendi Payını Öder
        </div>

        {/* Ürün listesi ve dağıtım */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 8 }}>Ürün Dağıtımı</div>
          <div style={{ maxHeight: 200, overflowY: 'auto', border: '0.5px solid var(--border)', borderRadius: 'var(--radius)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--surface2)' }}>
                  <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 500, color: 'var(--text2)' }}>Ürün</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', color: 'var(--text2)', fontWeight: 500 }}>Kalan</th>
                  {kisiler.map(k => (
                    <th key={k.id} style={{ padding: '6px 8px', textAlign: 'center', color: k.odendi ? 'var(--green)' : 'var(--text2)', fontWeight: 500, minWidth: 70 }}>
                      {k.ad}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gruplu.map(u => (
                  <tr key={u.urun_ad} style={{ borderTop: '0.5px solid var(--border)' }}>
                    <td style={{ padding: '6px 10px' }}>
                      <div>{u.urun_ad}</div>
                      <div style={{ color: 'var(--text3)', fontSize: 11 }}>₺{u.urun_fiyat} x{u.adet}</div>
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                      <span style={{
                        background: kalanAdet(u) === 0 ? 'var(--green-light)' : 'var(--amber-light)',
                        color: kalanAdet(u) === 0 ? '#085041' : '#633806',
                        padding: '1px 7px', borderRadius: 10, fontSize: 11, fontWeight: 600
                      }}>
                        {kalanAdet(u)}
                      </span>
                    </td>
                    {kisiler.map(k => (
                      <td key={k.id} style={{ padding: '4px 6px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'center' }}>
                          <button className="adet-btn" style={{ width: 32, height: 32, fontSize: 16 }}
                            onClick={() => secimDegistir(k.id, u.urun_ad, (k.secimler[u.urun_ad] || 0) - 1)}
                            disabled={k.odendi}>−</button>
                          <span style={{ fontSize: 14, minWidth: 22, textAlign: 'center', fontWeight: 600 }}>
                            {k.secimler[u.urun_ad] || 0}
                          </span>
                          <button className="adet-btn" style={{ width: 32, height: 32, fontSize: 16 }}
                            onClick={() => secimDegistir(k.id, u.urun_ad, (k.secimler[u.urun_ad] || 0) + 1)}
                            disabled={k.odendi || kalanAdet(u) <= 0}>+</button>
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!tumAtanmis && (
            <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 6 }}>
              ⚠️ Bazı ürünler henüz kişilere atanmadı
            </div>
          )}
        </div>

        {/* Kişi ödemeleri */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)' }}>Kişi Ödemeleri</div>
          {kisiler.map(k => {
            const toplam = kisiToplam(k)
            return (
              <div key={k.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '14px 14px', borderRadius: 'var(--radius)',
                border: k.odendi ? '2px solid var(--green)' : '1px solid var(--border)',
                background: k.odendi ? 'var(--green-light)' : 'var(--surface2)',
                opacity: toplam === 0 ? .5 : 1, flexWrap: 'wrap'
              }}>
                <input value={k.ad} onChange={e => setKisiler(p => p.map(x => x.id === k.id ? { ...x, ad: e.target.value } : x))}
                  style={{ width: 100, padding: '8px 10px', fontSize: 13, background: 'transparent', border: '1px solid var(--border-md)', borderRadius: 6 }}
                  disabled={k.odendi} />
                <select value={k.yontem} onChange={e => setKisiler(p => p.map(x => x.id === k.id ? { ...x, yontem: e.target.value } : x))}
                  style={{ width: 130, padding: '8px 10px', fontSize: 13 }} disabled={k.odendi}>
                  {izinliOdemeler.map(o => <option key={o.label}>{o.label}</option>)}
                </select>
                <div style={{ flex: 1, fontSize: 16, fontWeight: 700, color: k.odendi ? '#085041' : 'var(--accent)', textAlign: 'right', minWidth: 80 }}>
                  ₺{toplam.toFixed(2)}
                </div>
                {!k.odendi ? (
                  <>
                    <button onClick={() => kisiOde(k.id)} disabled={toplam === 0}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '10px 18px', borderRadius: 8, border: 'none',
                        background: toplam === 0 ? 'var(--surface)' : 'var(--green)',
                        color: '#fff', fontWeight: 600, fontSize: 14,
                        cursor: toplam === 0 ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit', whiteSpace: 'nowrap',
                        touchAction: 'manipulation'
                      }}>
                      <CheckCircle size={15} /> Ödedi
                    </button>
                    {kisiler.length > 1 && (
                      <button onClick={() => kisiSil(k.id)}
                        style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--red)', fontFamily: 'inherit' }}>
                        <Trash2 size={15} />
                      </button>
                    )}
                  </>
                ) : (
                  <span style={{ fontSize: 13, color: '#085041', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle size={14} /> Ödendi
                  </span>
                )}
              </div>
            )
          })}
          <button className="btn btn-ghost" onClick={kisiEkle} style={{ width: '100%', padding: '10px 0', fontSize: 13 }}>
            <Plus size={14} /> Kişi Ekle
          </button>
        </div>

        {/* Toplam özet */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface2)', borderRadius: 'var(--radius)', fontSize: 13, marginBottom: 12 }}>
          <span style={{ color: 'var(--text2)' }}>Toplam / Ödenecek</span>
          <span>
            <span style={{ color: 'var(--green)', fontWeight: 600 }}>₺{toplamOdenen.toFixed(2)}</span>
            <span style={{ color: 'var(--text3)' }}> / ₺{genel.toFixed(2)}</span>
          </span>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onKapat}>İptal</button>
          <button className="btn btn-primary"
            disabled={toplamOdenen === 0 && !hepsiOdedi}
            onClick={hepsiniTamamla}
            style={{ opacity: hepsiOdedi ? 1 : 0.8 }}>
            <CheckCircle size={13} />
            {hepsiOdedi ? 'Hesabı Kapat' : `Hesabı Kapat (₺${(genel - toplamOdenen).toFixed(2)} kalan)`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── İNDİRİM MODALİ ──────────────────────────────────────────────────────────
function IndirimModal({ toplam, onUygula, onKapat }) {
  const [tip, setTip] = useState('yuzde')
  const [deger, setDeger] = useState('')
  const hesap = tip === 'yuzde' ? toplam * (parseFloat(deger) / 100) : parseFloat(deger) || 0
  const sonuc = Math.max(0, toplam - hesap)

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onKapat()}>
      <div className="modal" style={{ width: 340 }}>
        <div className="modal-title">İndirim Uygula</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {['yuzde', 'sabit'].map(t => (
            <button key={t} className={`pill ${tip === t ? 'active' : ''}`} onClick={() => { setTip(t); setDeger('') }}>
              {t === 'yuzde' ? '% Yüzde' : '₺ Sabit Tutar'}
            </button>
          ))}
        </div>
        <div className="form-row">
          <label>{tip === 'yuzde' ? 'İndirim Oranı (%)' : 'İndirim Tutarı (₺)'}</label>
          <input type="number" min={0} max={tip === 'yuzde' ? 100 : toplam}
            value={deger} onChange={e => setDeger(e.target.value)} placeholder={tip === 'yuzde' ? '10' : '50'} autoFocus />
        </div>
        {deger && (
          <div style={{ background: 'var(--green-light)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 12, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text2)' }}>İndirim</span>
              <span style={{ color: 'var(--red)', fontWeight: 600 }}>-₺{hesap.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ color: 'var(--text2)' }}>Yeni Toplam</span>
              <span style={{ fontWeight: 700, fontSize: 15 }}>₺{sonuc.toFixed(2)}</span>
            </div>
          </div>
        )}
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onKapat}>İptal</button>
          <button className="btn btn-primary" disabled={!deger || parseFloat(deger) <= 0}
            onClick={() => onUygula({ tip, deger: parseFloat(deger), hesap, sonuc })}>
            Uygula
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── MASA TRANSFERİ ───────────────────────────────────────────────────────────
function MasaTransferModal({ mevcutSiparis, onTransfer, onKapat }) {
  const [masalar, setMasalar] = useState([])
  const [secili, setSecili] = useState(null)

  useEffect(() => {
    masalarApi.getAll().then(data =>
      setMasalar((data || []).filter(m => m.durum === 'bos' && m.id !== mevcutSiparis?.masa_id))
    )
  }, [mevcutSiparis])

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onKapat()}>
      <div className="modal" style={{ width: 380 }}>
        <div className="modal-title">Masa Transferi</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>
          <strong>{mevcutSiparis?.masa_no}</strong> masasındaki siparişi taşıyacağınız boş masayı seçin:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px,1fr))', gap: 8, maxHeight: 240, overflowY: 'auto', marginBottom: 16 }}>
          {masalar.map(m => (
            <div key={m.id} onClick={() => setSecili(m)} className="masa-kart"
              style={{ border: secili?.id === m.id ? '2px solid var(--accent)' : undefined }}>
              <div className="masa-no">{m.no}</div>
              <div className="masa-alt">{m.salonlar?.ad}</div>
            </div>
          ))}
          {masalar.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text3)', padding: 24, fontSize: 13 }}>Boş masa yok</div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onKapat}>İptal</button>
          <button className="btn btn-primary" disabled={!secili} onClick={() => onTransfer(secili)}>
            <ArrowRightLeft size={13} /> Transferi Onayla
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── MASA BİRLEŞTİRME ────────────────────────────────────────────────────────
function MasaBirlestirModal({ mevcutSiparis, onBirlestir, onKapat }) {
  const [acikSiparisler, setAcikSiparisler] = useState([])
  const [secili, setSecili] = useState(null)

  useEffect(() => {
    siparislerApi.getAcikSiparisler().then(data =>
      setAcikSiparisler((data || []).filter(s => s.id !== mevcutSiparis?.id))
    )
  }, [mevcutSiparis])

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onKapat()}>
      <div className="modal" style={{ width: 380 }}>
        <div className="modal-title">Masa Birleştir</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>
          <strong>{mevcutSiparis?.masa_no}</strong> ile birleştirilecek masayı seçin:
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto', marginBottom: 16 }}>
          {acikSiparisler.map(s => {
            const top = (s.siparis_kalemleri || []).reduce((a, k) => a + k.urun_fiyat * k.adet, 0)
            return (
              <div key={s.id} onClick={() => setSecili(s)} className="card-sm"
                style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  border: secili?.id === s.id ? '2px solid var(--accent)' : undefined }}>
                <div><div style={{ fontWeight: 600 }}>{s.masa_no}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>{s.siparis_kalemleri?.length} kalem</div></div>
                <div style={{ fontWeight: 600, color: 'var(--accent)' }}>₺{top}</div>
              </div>
            )
          })}
          {acikSiparisler.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 24, fontSize: 13 }}>Başka açık masa yok</div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onKapat}>İptal</button>
          <button className="btn btn-primary" disabled={!secili} onClick={() => onBirlestir(secili)}>
            <GitMerge size={13} /> Birleştir
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── İADE MODALİ ─────────────────────────────────────────────────────────────
function IadeModal({ siparis, onIade, onKapat }) {
  const [seciliKalemler, setSeciliKalemler] = useState({})
  const kalemler = Object.values((siparis?.siparis_kalemleri || []).reduce((acc, k) => {
    if (acc[k.urun_ad]) { acc[k.urun_ad].adet += k.adet; if (!acc[k.urun_ad].ids) acc[k.urun_ad].ids = [k.id]; acc[k.urun_ad].ids.push(k.id) }
    else acc[k.urun_ad] = { ...k, ids: [k.id] }
    return acc
  }, {}))

  const adetDegistir = (k, adet) => {
    setSeciliKalemler(prev => ({ ...prev, [k.id]: Math.max(0, Math.min(adet, k.adet)) }))
  }

  const toplamIade = (siparis?.siparis_kalemleri || [])
    .filter(k => seciliKalemler[k.id] > 0)
    .reduce((a, k) => a + k.urun_fiyat * (seciliKalemler[k.id] || 0), 0)

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onKapat()}>
      <div className="modal" style={{ width: 400 }}>
        <div className="modal-title">İade Al</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>İade edilecek ürünleri ve adetleri seçin:</div>
        <div style={{ maxHeight: 260, overflowY: 'auto', marginBottom: 12 }}>
          {(siparis?.siparis_kalemleri || []).map(k => (
            <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '0.5px solid var(--border)' }}>
              <div style={{ flex: 1, fontSize: 13 }}>
                <div>{k.urun_ad}</div>
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>₺{k.urun_fiyat} · max {k.adet}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button className="adet-btn" onClick={() => adetDegistir(k, (seciliKalemler[k.id] || 0) - 1)}>−</button>
                <span style={{ fontSize: 15, minWidth: 28, textAlign: 'center', fontWeight: 600 }}>{seciliKalemler[k.id] || 0}</span>
                <button className="adet-btn" onClick={() => adetDegistir(k, (seciliKalemler[k.id] || 0) + 1)}>+</button>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, minWidth: 56, textAlign: 'right', color: 'var(--red)' }}>
                -₺{(k.urun_fiyat * (seciliKalemler[k.id] || 0)).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
        {toplamIade > 0 && (
          <div style={{ background: 'var(--red-light)', borderRadius: 'var(--radius)', padding: '10px 14px', fontSize: 13, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
              <span>Toplam İade Tutarı</span>
              <span style={{ color: 'var(--red)' }}>-₺{toplamIade.toFixed(2)}</span>
            </div>
          </div>
        )}
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onKapat}>İptal</button>
          <button className="btn btn-primary" disabled={toplamIade === 0}
            onClick={() => onIade({ kalemler: seciliKalemler, tutar: toplamIade })}
            style={{ background: 'var(--red)', borderColor: 'var(--red)' }}>
            <RotateCcw size={13} /> İadeyi Onayla
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── ANA SAYFA ────────────────────────────────────────────────────────────────
export default function KasiyerPage() {
  const [siparisler, setSiparisler] = useState([])
  const [secili, setSecili] = useState(null)
  const [odemeYontemi, setOdemeYontemi] = useState('Nakit')
  const [loading, setLoading] = useState(true)
  const [odemeYapiliyor, setOdemeYapiliyor] = useState(false)
  const [indirim, setIndirim] = useState(null)
  const [modal, setModal] = useState(null)
  const { izinVar } = useIzin()

  const yukle = useCallback(async () => {
    try {
      const data = await siparislerApi.getAcikSiparisler()
      setSiparisler(data)
    } catch { toast.error('Siparişler yüklenemedi') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    yukle()
    const sub = realtimeApi.siparislerSubscribe(yukle)
    return () => realtimeApi.unsubscribe(sub)
  }, [yukle])

  const hesabiKapat = async (odemeSatirlari) => {
    if (!secili) return
    setOdemeYapiliyor(true)
    try {
      // Bölünmüş / Alman usulü ödemelerde ilk yöntemi ana kaydet, diğerleri not olarak
      const anaYontem = Array.isArray(odemeSatirlari)
        ? odemeSatirlari.map(s => `${s.yontem} ₺${s.tutar.toFixed(2)}`).join(' + ')
        : odemeYontemi

      await siparislerApi.kapat(secili.id, { odemeYontemi: anaYontem, masaId: secili.masa_id })
      toast.success(`${secili.masa_no} hesabı kapatıldı`)
      setSecili(null); setIndirim(null); setModal(null)
      await yukle()
    } catch { toast.error('Hesap kapatılamadı') }
    finally { setOdemeYapiliyor(false) }
  }

  const masaTransfer = async (hedefMasa) => {
    try {
      await supabase.from('siparisler').update({ masa_id: hedefMasa.id, masa_no: hedefMasa.no }).eq('id', secili.id)
      await masalarApi.updateDurum(hedefMasa.id, 'dolu')
      await masalarApi.updateDurum(secili.masa_id, 'bos')
      toast.success(`${secili.masa_no} → ${hedefMasa.no} transferi tamamlandı`)
      setModal(null); setSecili(null); yukle()
    } catch { toast.error('Transfer başarısız') }
  }

  const masaBirlestir = async (hedefSiparis) => {
    try {
      await supabase.from('siparis_kalemleri').update({ siparis_id: secili.id }).eq('siparis_id', hedefSiparis.id)
      await supabase.from('kds_bildirimler').update({ siparis_id: secili.id }).eq('siparis_id', hedefSiparis.id)
      await supabase.from('siparisler').update({ durum: 'iptal' }).eq('id', hedefSiparis.id)
      await masalarApi.updateDurum(hedefSiparis.masa_id, 'bos')
      toast.success(`${hedefSiparis.masa_no} ile birleştirildi`)
      setModal(null); setSecili(null); yukle()
    } catch { toast.error('Birleştirme başarısız') }
  }

  const iadeUygula = async ({ kalemler: seciliKalemler, tutar }) => {
    if (!secili) return
    try {
      for (const [kalemId, iadeMiktar] of Object.entries(seciliKalemler)) {
        if (!iadeMiktar) continue
        const kalem = (secili.siparis_kalemleri || []).find(k => k.id === kalemId)
        if (!kalem) continue
        if (iadeMiktar >= kalem.adet) {
          await supabase.from('siparis_kalemleri').delete().eq('id', kalemId)
        } else {
          await supabase.from('siparis_kalemleri').update({ adet: kalem.adet - iadeMiktar }).eq('id', kalemId)
        }
      }
      const { data: kalanKalemler } = await supabase.from('siparis_kalemleri').select('urun_fiyat, adet').eq('siparis_id', secili.id)
      if (!kalanKalemler || kalanKalemler.length === 0) {
        await supabase.from('siparisler').update({ durum: 'iptal' }).eq('id', secili.id)
        await masalarApi.updateDurum(secili.masa_id, 'bos')
        toast.success(`Tüm ürünler iade edildi`)
        setModal(null); setSecili(null); setIndirim(null); await yukle(); return
      }
      const yeniToplam = kalanKalemler.reduce((a, k) => a + k.urun_fiyat * k.adet, 0)
      const yeniKdv = +(yeniToplam * 0.1).toFixed(2)
      await supabase.from('siparisler').update({ toplam: yeniToplam, kdv_tutar: yeniKdv, genel_toplam: +(yeniToplam + yeniKdv).toFixed(2) }).eq('id', secili.id)
      toast.success(`₺${tutar.toFixed(2)} iade yapıldı`)
      setModal(null); setIndirim(null)
      const guncellenmis = await siparislerApi.getAcikSiparisler()
      setSiparisler(guncellenmis)
      setSecili(guncellenmis.find(s => s.id === secili.id) || null)
    } catch (e) { toast.error('İade başarısız: ' + e.message) }
  }

  const indirimUygula = (data) => { setIndirim(data); setModal(null); toast.success('İndirim uygulandı') }

  const kalemler = secili?.siparis_kalemleri || []
  const ara = kalemler.reduce((a, k) => a + k.urun_fiyat * k.adet, 0)
  const indirimTutar = indirim ? indirim.hesap : 0
  const indirimliAra = ara - indirimTutar
  const kdv = +(indirimliAra * 0.1).toFixed(2)
  const genel = +(indirimliAra + kdv).toFixed(2)

  const izinliOdemeler = TUM_ODEME.filter(m => !m.izin || izinVar(m.izin))

  const aksiyonlar = [
    { id: 'indirim',   izin: 'indirim_uygula', label: 'İndirim',        icon: Percent,        renk: 'var(--green)',  bg: 'var(--green-light)'  },
    { id: 'iade',      izin: 'iade_al',         label: 'İade Al',        icon: RotateCcw,      renk: 'var(--red)',    bg: 'var(--red-light)'    },
    { id: 'transfer',  izin: 'masa_transfer',   label: 'Masa Transferi', icon: ArrowRightLeft, renk: '#534AB7',       bg: '#EEEDFE'             },
    { id: 'birlestir', izin: 'masa_birlestir',  label: 'Birleştir',      icon: GitMerge,       renk: '#185FA5',       bg: '#E6F1FB'             },
    { id: 'bolunmus',  izin: 'bolunmus_odeme',  label: 'Bölünmüş Ödeme',icon: Divide,         renk: '#BA7517',       bg: '#FAEEDA'             },
    { id: 'alman',     izin: 'bolunmus_odeme',  label: 'Alman Usulü',   icon: Users,          renk: '#534AB7',       bg: '#EEEDFE'             },
  ].filter(a => izinVar(a.izin))

  if (loading) return <div className="loading-center"><div className="spinner" /></div>

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 12 }}>
      {/* Açık masalar */}
      <div>
        <div className="sec-title">Açık Masalar ({siparisler.length})</div>
        {siparisler.length === 0 ? (
          <div className="empty-state">
            <CheckCircle size={40} style={{ margin: '0 auto 12px', opacity: .3, display: 'block' }} />
            <p>Açık masa yok</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {siparisler.map(s => {
              const top = (s.siparis_kalemleri || []).reduce((a, k) => a + k.urun_fiyat * k.adet, 0)
              const sure = Math.floor((Date.now() - new Date(s.created_at).getTime()) / 60000)
              return (
                <div key={s.id} className="card-sm" style={{
                  cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  border: secili?.id === s.id ? '1.5px solid var(--accent)' : '0.5px solid var(--border)',
                  transition: 'all .15s'
                }} onClick={() => { setSecili(s); setIndirim(null) }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{s.masa_no}</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                      {sure} dk · {s.siparis_kalemleri?.length || 0} kalem
                      {s.tur === 'paket' && <span className="badge badge-gray" style={{ marginLeft: 6 }}>📦 Paket</span>}
                    </div>
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--accent)', fontSize: 15 }}>₺{top}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Ödeme paneli */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, height: 'fit-content' }}>
        {!secili ? (
          <div className="empty-state"><p>← Masa seçerek hesabı görüntüleyin</p></div>
        ) : (
          <>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{secili.masa_no} · Hesap</div>

            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {kalemler.map(k => (
                <div key={k.id} className="hesap-satir">
                  <span>{k.urun_ad} <span style={{ color: 'var(--text2)', fontSize: 12 }}>x{k.adet}</span></span>
                  <span style={{ fontWeight: 500 }}>₺{k.urun_fiyat * k.adet}</span>
                </div>
              ))}
            </div>

            <div className="divider" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text2)' }}>
                <span>Ara Toplam</span><span>₺{ara}</span>
              </div>
              {indirim && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--red)' }}>
                  <span>İndirim ({indirim.tip === 'yuzde' ? `%${indirim.deger}` : `₺${indirim.deger}`})</span>
                  <span style={{ fontWeight: 600 }}>-₺{indirimTutar.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text2)' }}>
                <span>KDV (%10)</span><span>₺{kdv}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, color: 'var(--accent)', marginTop: 4 }}>
                <span>Genel Toplam</span><span>₺{genel}</span>
              </div>
            </div>

            {/* Aksiyon butonları */}
            {aksiyonlar.length > 0 && (
              <>
                <div className="divider" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {aksiyonlar.map(a => (
                    <button key={a.id} onClick={() => setModal(a.id)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                        padding: '7px 0', borderRadius: 'var(--radius)',
                        border: `1px solid ${a.renk}`, background: a.bg,
                        color: a.renk, fontWeight: 500, fontSize: 11,
                        cursor: 'pointer', fontFamily: 'inherit'
                      }}>
                      <a.icon size={12} /> {a.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="divider" />
            <div className="sec-title">Ödeme yöntemi</div>
            {izinliOdemeler.length > 0 ? (
              <div className="odeme-btn-grid">
                {izinliOdemeler.map(({ label, icon: Icon }) => (
                  <button key={label} className={`odeme-yontem-btn ${odemeYontemi === label ? 'secili' : ''}`}
                    onClick={() => setOdemeYontemi(label)}>
                    <Icon size={13} /> {label}
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '8px 0' }}>
                Ödeme alma yetkiniz yok
              </div>
            )}

            <button className="btn btn-primary btn-full"
              onClick={() => hesabiKapat(null)}
              disabled={odemeYapiliyor || !izinVar('hesap_kapat') || izinliOdemeler.length === 0}>
              <CheckCircle size={14} />
              {!izinVar('hesap_kapat') ? 'Yetkiniz yok' : odemeYapiliyor ? 'Kapatılıyor...' : 'Hesabı Kapat'}
            </button>
          </>
        )}
      </div>

      {/* Modaller */}
      {modal === 'indirim' && <IndirimModal toplam={ara} onUygula={indirimUygula} onKapat={() => setModal(null)} />}
      {modal === 'iade' && secili && <IadeModal siparis={secili} onIade={iadeUygula} onKapat={() => setModal(null)} />}
      {modal === 'transfer' && secili && <MasaTransferModal mevcutSiparis={secili} onTransfer={masaTransfer} onKapat={() => setModal(null)} />}
      {modal === 'birlestir' && secili && <MasaBirlestirModal mevcutSiparis={secili} onBirlestir={masaBirlestir} onKapat={() => setModal(null)} />}
      {modal === 'bolunmus' && secili && (
        <BolunmusOdemeModal genel={genel} izinliOdemeler={izinliOdemeler}
          onOde={(satirlar) => hesabiKapat(satirlar)} onKapat={() => setModal(null)} />
      )}
      {modal === 'alman' && secili && (
        <AlmanUsulModal siparis={secili} genel={genel} izinliOdemeler={izinliOdemeler}
          onOde={(odemeler) => hesabiKapat(odemeler)} onKapat={() => setModal(null)} />
      )}
    </div>
  )
}
