import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { urunlerApi, kategorilerApi, siparislerApi } from '../lib/supabase'
import { useIzin } from '../contexts/IzinContext'
import toast from 'react-hot-toast'
import {
  Search, Banknote, CreditCard, Smartphone, Plus, Minus,
  Trash2, X, ShoppingCart, CheckCircle, Scale, Hash, Usb
} from 'lucide-react'

// Ödeme yöntemleri (izinle filtrelenir)
const ODEME_YONTEMLERI = [
  { label: 'Nakit',       icon: Banknote,   izin: 'nakit_odeme' },
  { label: 'Kredi Kartı', icon: CreditCard, izin: 'kart_odeme'  },
  { label: 'Online',      icon: Smartphone, izin: null          },
]

const KG = 'kg'

export default function HizliSatisPage() {
  const { izinVar } = useIzin()

  const [urunler, setUrunler]         = useState([])
  const [kategoriler, setKategoriler] = useState([])
  const [aktifKat, setAktifKat]       = useState('hepsi')
  const [arama, setArama]             = useState('')
  const [sepet, setSepet]             = useState([]) // { key, urun_id, urun_ad, urun_fiyat, adet, birim }
  const [yukleniyor, setYukleniyor]   = useState(true)
  const [odemeModal, setOdemeModal]   = useState(false)
  const [isleniyor, setIsleniyor]     = useState(false)
  const [miktarModal, setMiktarModal] = useState(null) // { urun, mod: 'adet'|'kg' }
  const aramaRef = useRef(null)

  const izinliOdemeler = useMemo(
    () => ODEME_YONTEMLERI.filter(o => !o.izin || izinVar(o.izin)),
    [izinVar]
  )

  // ─── Veri yükle ───────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [u, k] = await Promise.all([urunlerApi.getAll(), kategorilerApi.getAll()])
        setUrunler(u)
        setKategoriler(k)
      } catch (e) {
        toast.error('Ürünler yüklenemedi: ' + e.message)
      } finally {
        setYukleniyor(false)
      }
    })()
  }, [])

  // ─── Filtre ───────────────────────────────────────────────────
  const filtreli = useMemo(() => {
    let list = urunler
    if (aktifKat !== 'hepsi') list = list.filter(u => u.kategori_id === aktifKat)
    if (arama.trim()) {
      const q = arama.toLowerCase().trim()
      list = list.filter(u =>
        u.ad.toLowerCase().includes(q) ||
        (u.barkod && String(u.barkod).includes(q))
      )
    }
    return list
  }, [urunler, aktifKat, arama])

  // ─── Sepet ────────────────────────────────────────────────────
  // Ürün tıklandığında: kg ise ağırlık modalı, adet ise +1 (miktar modalı uzun basışla)
  const urunTikla = useCallback((urun) => {
    if (urun.birim === KG) {
      setMiktarModal({ urun, mod: 'kg' })
    } else {
      adetEkle(urun, 1)
    }
  }, [])

  // Adetli ürünü sepete ekle/artır
  const adetEkle = (urun, ekAdet) => {
    setSepet(prev => {
      const mevcut = prev.find(s => s.urun_id === urun.id && s.birim !== KG)
      if (mevcut) {
        return prev.map(s => s.urun_id === urun.id && s.birim !== KG
          ? { ...s, adet: s.adet + ekAdet } : s)
      }
      return [...prev, {
        key: urun.id,
        urun_id: urun.id,
        urun_ad: urun.ad,
        urun_fiyat: Number(urun.fiyat),
        adet: ekAdet,
        birim: urun.birim || 'adet',
      }]
    })
  }

  // Adetli ürünü belirli miktara AYARLA (miktar girişinden)
  const adetAyarla = (urun, yeniAdet) => {
    if (yeniAdet <= 0) return
    setSepet(prev => {
      const mevcut = prev.find(s => s.urun_id === urun.id && s.birim !== KG)
      if (mevcut) {
        return prev.map(s => s.urun_id === urun.id && s.birim !== KG
          ? { ...s, adet: yeniAdet } : s)
      }
      return [...prev, {
        key: urun.id, urun_id: urun.id, urun_ad: urun.ad,
        urun_fiyat: Number(urun.fiyat), adet: yeniAdet, birim: 'adet',
      }]
    })
  }

  // Ağırlıklı (kg) ürünü sepete ekle — her tartım ayrı satır
  const agirlikEkle = (urun, kg) => {
    if (kg <= 0) return
    setSepet(prev => [...prev, {
      key: `${urun.id}_${Date.now()}`, // her tartım benzersiz satır
      urun_id: urun.id,
      urun_ad: urun.ad,
      urun_fiyat: Number(urun.fiyat), // TL/kg
      adet: kg,                       // ondalık ağırlık
      birim: KG,
    }])
  }

  const adetDegistir = (key, delta) => {
    setSepet(prev => prev
      .map(s => s.key === key ? { ...s, adet: +(s.adet + delta).toFixed(3) } : s)
      .filter(s => s.adet > 0)
    )
  }

  const kalemSil = (key) => setSepet(prev => prev.filter(s => s.key !== key))
  const sepetiBosalt = () => setSepet([])

  const toplam = useMemo(
    () => sepet.reduce((a, s) => a + s.urun_fiyat * s.adet, 0),
    [sepet]
  )
  const kalemSayisi = sepet.length

  // ─── Arama/barkod Enter ───────────────────────────────────────
  const aramaEnter = (e) => {
    if (e.key !== 'Enter') return
    let hedef = null
    if (filtreli.length === 1) hedef = filtreli[0]
    else if (filtreli.length > 1 && arama.trim()) {
      hedef = filtreli.find(u => u.ad.toLowerCase() === arama.toLowerCase().trim())
    }
    if (hedef) { urunTikla(hedef); setArama('') }
  }

  // ─── Ödeme ────────────────────────────────────────────────────
  const odemeYap = async (yontem) => {
    if (sepet.length === 0) return
    setIsleniyor(true)
    try {
      const siparis = await siparislerApi.create(
        { masa_id: null, masa_no: 'HIZLI', tur: 'gel_al', garson: 'Hızlı Satış' },
        sepet.map(s => ({
          urun_id: s.urun_id,
          urun_ad: s.birim === KG ? `${s.urun_ad} (${s.adet.toFixed(3)} kg)` : s.urun_ad,
          urun_fiyat: s.urun_fiyat,
          adet: s.adet,
        }))
      )
      await siparislerApi.kapat(siparis.id, { odemeYontemi: yontem, masaId: null })
      toast.success(`Satış tamamlandı ✓ — ₺${toplam.toFixed(2)} (${yontem})`)
      setSepet([])
      setOdemeModal(false)
      aramaRef.current?.focus()
    } catch (e) {
      toast.error('Satış hatası: ' + e.message)
    } finally {
      setIsleniyor(false)
    }
  }

  if (yukleniyor) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text2)' }}>Yükleniyor…</div>
  }

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16,
      height: 'calc(100vh - 120px)', padding: 'var(--page-padding, 16px)'
    }}>

      {/* ═══════════ SOL: ÜRÜNLER ═══════════ */}
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* Arama */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input
            ref={aramaRef} autoFocus value={arama}
            onChange={e => setArama(e.target.value)} onKeyDown={aramaEnter}
            placeholder="Ürün ara veya barkod okut…"
            style={{ width: '100%', padding: '11px 12px 11px 38px', fontSize: 15 }}
          />
          {arama && (
            <button onClick={() => setArama('')}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
              <X size={16} />
            </button>
          )}
        </div>

        {/* Kategoriler */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', paddingBottom: 4, flexShrink: 0 }}>
          <KatButon aktif={aktifKat === 'hepsi'} onClick={() => setAktifKat('hepsi')} label="Tümü" emoji="🗂️" />
          {kategoriler.map(k => (
            <KatButon key={k.id} aktif={aktifKat === k.id} onClick={() => setAktifKat(k.id)} label={k.ad} emoji={k.emoji} />
          ))}
        </div>

        {/* Ürün grid */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {filtreli.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 40, fontSize: 14 }}>Ürün bulunamadı</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
              {filtreli.map(u => {
                const kg = u.birim === KG
                return (
                  <button key={u.id}
                    onClick={() => urunTikla(u)}
                    onContextMenu={(e) => { e.preventDefault(); if (!kg) setMiktarModal({ urun: u, mod: 'adet' }) }}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'space-between',
                      minHeight: 92, padding: 12, borderRadius: 'var(--radius, 10px)',
                      border: kg ? '1px solid var(--accent)' : '0.5px solid var(--border)',
                      background: 'var(--surface)', cursor: 'pointer', textAlign: 'left',
                      fontFamily: 'inherit', position: 'relative', touchAction: 'manipulation',
                    }}
                    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
                    onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                    {kg && (
                      <span style={{ position: 'absolute', top: 8, right: 8, display: 'flex', alignItems: 'center', gap: 2,
                        fontSize: 10, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-light)', borderRadius: 6, padding: '2px 5px' }}>
                        <Scale size={10} /> kg
                      </span>
                    )}
                    <div style={{ fontSize: 22, marginBottom: 4 }}>{u.emoji || '🍽️'}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.25, color: 'var(--text)' }}>{u.ad}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
                      ₺{Number(u.fiyat).toFixed(2)}{kg ? '/kg' : ''}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 10, textAlign: 'center' }}>
            İpucu: Adetli ürüne sağ tık (uzun bas) → miktar gir. Kg ürüne dokun → ağırlık gir.
          </div>
        </div>
      </div>

      {/* ═══════════ SAĞ: SEPET ═══════════ */}
      <div style={{
        display: 'flex', flexDirection: 'column', minHeight: 0,
        background: 'var(--surface)', borderRadius: 'var(--radius-lg, 14px)',
        border: '0.5px solid var(--border)', overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '0.5px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 15 }}>
            <ShoppingCart size={17} /> Sepet
            {kalemSayisi > 0 && (
              <span style={{ fontSize: 12, background: 'var(--accent-light)', color: 'var(--accent)', borderRadius: 20, padding: '2px 8px', fontWeight: 600 }}>
                {kalemSayisi}
              </span>
            )}
          </div>
          {sepet.length > 0 && (
            <button onClick={sepetiBosalt} className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }}>
              <Trash2 size={13} /> Temizle
            </button>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: sepet.length ? 8 : 0 }}>
          {sepet.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', gap: 8, padding: 20 }}>
              <ShoppingCart size={32} strokeWidth={1.2} />
              <span style={{ fontSize: 13 }}>Ürün seçin</span>
            </div>
          ) : (
            sepet.map(s => {
              const kg = s.birim === KG
              return (
                <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 8px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {kg && <Scale size={11} style={{ display: 'inline', marginRight: 3, color: 'var(--accent)' }} />}
                      {s.urun_ad}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', fontVariantNumeric: 'tabular-nums' }}>
                      ₺{s.urun_fiyat.toFixed(2)}{kg ? '/kg' : ''} × {kg ? `${s.adet.toFixed(3)} kg` : s.adet} = <strong style={{ color: 'var(--text)' }}>₺{(s.urun_fiyat * s.adet).toFixed(2)}</strong>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    {!kg && (
                      <>
                        <button onClick={() => adetDegistir(s.key, -1)} className="btn-adet"><Minus size={13} /></button>
                        <span style={{ minWidth: 22, textAlign: 'center', fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{s.adet}</span>
                        <button onClick={() => adetDegistir(s.key, +1)} className="btn-adet"><Plus size={13} /></button>
                      </>
                    )}
                    {kg && (
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', minWidth: 60, textAlign: 'right' }}>{s.adet.toFixed(3)} kg</span>
                    )}
                    <button onClick={() => kalemSil(s.key)} className="btn-adet" style={{ color: 'var(--red)', marginLeft: 2 }}><Trash2 size={13} /></button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div style={{ borderTop: '0.5px solid var(--border)', padding: 16, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text2)' }}>Toplam</span>
            <span style={{ fontSize: 26, fontWeight: 700, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>₺{toplam.toFixed(2)}</span>
          </div>
          <button className="btn btn-primary" disabled={sepet.length === 0}
            onClick={() => setOdemeModal(true)}
            style={{ width: '100%', padding: '13px', fontSize: 15, justifyContent: 'center' }}>
            <CheckCircle size={16} /> Ödeme Al
          </button>
        </div>
      </div>

      {/* ═══════════ MİKTAR / AĞIRLIK MODALI ═══════════ */}
      {miktarModal && (
        <MiktarModal
          urun={miktarModal.urun}
          mod={miktarModal.mod}
          onKapat={() => setMiktarModal(null)}
          onOnayAdet={(sayi) => { adetAyarla(miktarModal.urun, sayi); setMiktarModal(null) }}
          onOnayKg={(kg) => { agirlikEkle(miktarModal.urun, kg); setMiktarModal(null) }}
        />
      )}

      {/* ═══════════ ÖDEME MODALI ═══════════ */}
      {odemeModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setOdemeModal(false)}>
          <div className="modal" style={{ width: 360 }}>
            <div className="modal-title">Ödeme Yöntemi</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--surface2)', borderRadius: 'var(--radius)', marginBottom: 14 }}>
              <span style={{ color: 'var(--text2)', fontSize: 13 }}>Tahsil edilecek</span>
              <span style={{ fontWeight: 700, fontSize: 16 }}>₺{toplam.toFixed(2)}</span>
            </div>
            <div style={{ display: 'grid', gap: 8, marginBottom: 8 }}>
              {izinliOdemeler.map(o => {
                const Icon = o.icon
                return (
                  <button key={o.label} className="btn" disabled={isleniyor}
                    onClick={() => odemeYap(o.label)}
                    style={{ padding: '15px', fontSize: 15, justifyContent: 'flex-start', gap: 12, border: '0.5px solid var(--border)', background: 'var(--surface)' }}>
                    <Icon size={19} /> {o.label}
                  </button>
                )
              })}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setOdemeModal(false)} disabled={isleniyor}>İptal</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .btn-adet {
          width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center;
          border: 0.5px solid var(--border); background: var(--surface2); border-radius: 8px;
          cursor: pointer; color: var(--text); font-family: inherit; touch-action: manipulation;
        }
        .btn-adet:active { transform: scale(0.92); }
      `}</style>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// MİKTAR / AĞIRLIK GİRİŞ MODALI
// ═══════════════════════════════════════════════════════════════
function MiktarModal({ urun, mod, onKapat, onOnayAdet, onOnayKg }) {
  const kg = mod === 'kg'
  const [deger, setDeger] = useState('')
  const [baskulBagli, setBaskulBagli] = useState(false)
  const [baskulHata, setBaskulHata] = useState('')
  const portRef = useRef(null)
  const readerRef = useRef(null)

  const sayi = parseFloat(deger.replace(',', '.')) || 0
  const tutar = kg ? sayi * Number(urun.fiyat) : 0

  const tiklat = (val) => {
    if (val === 'C') { setDeger(''); return }
    if (val === '⌫') { setDeger(p => p.slice(0, -1)); return }
    if (val === '.') { if (deger.includes('.')) return; setDeger(p => (p || '0') + '.'); return }
    setDeger(p => {
      const yeni = (p || '') + val
      // kg: max 3 ondalık, adet: tam sayı
      if (kg && yeni.includes('.') && yeni.split('.')[1]?.length > 3) return p
      if (!kg && yeni.includes('.')) return p
      return yeni
    })
  }

  const onayla = () => {
    if (sayi <= 0) return
    if (kg) onOnayKg(+sayi.toFixed(3))
    else onOnayAdet(Math.round(sayi))
  }

  // ─── Web Serial baskül bağlantısı ─────────────────────────────
  // Not: Baskül protokolü markaya göre değişir. Aşağıdaki genel bir
  // ASCII satır ayrıştırıcıdır: gelen veriden ilk ondalıklı sayıyı çeker.
  // Kendi baskül modelin belliyse regex'i ona göre daraltırız.
  const baskuleBaglan = async () => {
    setBaskulHata('')
    if (!('serial' in navigator)) {
      setBaskulHata('Tarayıcı Web Serial desteklemiyor (Chrome/Edge gerekli)')
      return
    }
    try {
      const port = await navigator.serial.requestPort()
      await port.open({ baudRate: 9600 }) // çoğu baskül 9600; modele göre değişebilir
      portRef.current = port
      setBaskulBagli(true)

      const textDecoder = new TextDecoderStream()
      port.readable.pipeTo(textDecoder.writable).catch(() => {})
      const reader = textDecoder.readable.getReader()
      readerRef.current = reader

      let tampon = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        tampon += value
        // Satır bazlı: baskül genelde her tartımı newline ile gönderir
        const satirlar = tampon.split(/[\r\n]+/)
        tampon = satirlar.pop() || ''
        for (const satir of satirlar) {
          const m = satir.match(/(\d+[.,]\d+)/) // ilk ondalıklı sayı = ağırlık
          if (m) setDeger(m[1].replace(',', '.'))
        }
      }
    } catch (e) {
      setBaskulHata('Bağlantı hatası: ' + (e?.message || e))
      setBaskulBagli(false)
    }
  }

  // Modal kapanınca portu kapat
  useEffect(() => {
    return () => {
      try { readerRef.current?.cancel() } catch {}
      try { portRef.current?.close() } catch {}
    }
  }, [])

  const tuslar = ['7','8','9','4','5','6','1','2','3', kg ? '.' : 'C','0','⌫']

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onKapat()}>
      <div className="modal" style={{ width: 340 }}>
        <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {kg ? <Scale size={15} /> : <Hash size={15} />}
          {urun.ad} — {kg ? 'Ağırlık (kg)' : 'Miktar (adet)'}
        </div>

        {/* Değer göstergesi */}
        <div style={{ textAlign: 'center', padding: '14px 0', marginBottom: 12, background: 'var(--surface2)', borderRadius: 'var(--radius)' }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>
            {deger || '0'}{kg ? ' kg' : ''}
          </div>
          {kg && sayi > 0 && (
            <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>
              {sayi.toFixed(3)} kg × ₺{Number(urun.fiyat).toFixed(2)} = <strong>₺{tutar.toFixed(2)}</strong>
            </div>
          )}
        </div>

        {/* Baskül butonu (sadece kg) */}
        {kg && (
          <div style={{ marginBottom: 10 }}>
            <button className="btn" onClick={baskuleBaglan} disabled={baskulBagli}
              style={{ width: '100%', gap: 8, border: '0.5px solid var(--border)', background: baskulBagli ? 'var(--green-light)' : 'var(--surface)', color: baskulBagli ? 'var(--green)' : 'var(--text)' }}>
              <Usb size={15} /> {baskulBagli ? 'Baskül bağlı — tartım okunuyor' : 'Basküle Bağlan'}
            </button>
            {baskulHata && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4, textAlign: 'center' }}>{baskulHata}</div>}
          </div>
        )}

        {/* Sayısal klavye */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
          {tuslar.map(t => (
            <button key={t} onClick={() => tiklat(t)}
              style={{
                padding: 16, fontSize: 20, fontWeight: 500, borderRadius: 12,
                border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                background: t === 'C' ? 'var(--red-light)' : 'var(--surface2)',
                color: t === 'C' ? 'var(--red)' : 'var(--text)', touchAction: 'manipulation',
              }}>
              {t}
            </button>
          ))}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onKapat}>İptal</button>
          <button className="btn btn-primary" disabled={sayi <= 0} onClick={onayla}>
            <Plus size={13} /> Sepete Ekle
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Kategori butonu ───────────────────────────────────────────
function KatButon({ aktif, onClick, label, emoji }) {
  return (
    <button onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
        borderRadius: 20, border: '0.5px solid var(--border)', cursor: 'pointer',
        whiteSpace: 'nowrap', fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
        background: aktif ? 'var(--accent)' : 'var(--surface)',
        color: aktif ? '#fff' : 'var(--text2)', flexShrink: 0, touchAction: 'manipulation',
      }}>
      <span>{emoji || '🍽️'}</span> {label}
    </button>
  )
}
