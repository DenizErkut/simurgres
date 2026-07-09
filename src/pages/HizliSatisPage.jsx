import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { urunlerApi, kategorilerApi, siparislerApi } from '../lib/supabase'
import { useIzin } from '../contexts/IzinContext'
import toast from 'react-hot-toast'
import {
  Search, Banknote, CreditCard, Smartphone, Plus, Minus,
  Trash2, X, ShoppingCart, CheckCircle, Delete
} from 'lucide-react'

// Hızlı satışta kullanılabilecek ödeme yöntemleri (izinle filtrelenir)
const ODEME_YONTEMLERI = [
  { label: 'Nakit',       icon: Banknote,   izin: 'nakit_odeme' },
  { label: 'Kredi Kartı', icon: CreditCard, izin: 'kart_odeme'  },
  { label: 'Online',      icon: Smartphone, izin: null          },
]

export default function HizliSatisPage() {
  const { izinVarMi } = useIzin?.() || { izinVarMi: () => true }

  const [urunler, setUrunler]         = useState([])
  const [kategoriler, setKategoriler] = useState([])
  const [aktifKat, setAktifKat]       = useState('hepsi')
  const [arama, setArama]             = useState('')
  const [sepet, setSepet]             = useState([]) // { urun_id, urun_ad, urun_fiyat, adet }
  const [yukleniyor, setYukleniyor]   = useState(true)
  const [odemeModal, setOdemeModal]   = useState(false)
  const [isleniyor, setIsleniyor]     = useState(false)
  const aramaRef = useRef(null)

  // İzinli ödeme yöntemleri
  const izinliOdemeler = useMemo(
    () => ODEME_YONTEMLERI.filter(o => !o.izin || izinVarMi(o.izin)),
    [izinVarMi]
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

  // ─── Filtrelenmiş ürünler ─────────────────────────────────────
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

  // ─── Sepet işlemleri ──────────────────────────────────────────
  const sepeteEkle = useCallback((urun) => {
    setSepet(prev => {
      const mevcut = prev.find(s => s.urun_id === urun.id)
      if (mevcut) {
        return prev.map(s => s.urun_id === urun.id ? { ...s, adet: s.adet + 1 } : s)
      }
      return [...prev, {
        urun_id: urun.id,
        urun_ad: urun.ad,
        urun_fiyat: Number(urun.fiyat),
        adet: 1,
      }]
    })
  }, [])

  const adetDegistir = (urun_id, delta) => {
    setSepet(prev => prev
      .map(s => s.urun_id === urun_id ? { ...s, adet: s.adet + delta } : s)
      .filter(s => s.adet > 0)
    )
  }

  const kalemSil = (urun_id) => setSepet(prev => prev.filter(s => s.urun_id !== urun_id))
  const sepetiBosalt = () => setSepet([])

  const toplam = useMemo(
    () => sepet.reduce((a, s) => a + s.urun_fiyat * s.adet, 0),
    [sepet]
  )
  const toplamAdet = useMemo(() => sepet.reduce((a, s) => a + s.adet, 0), [sepet])

  // ─── Barkod / arama Enter: tek eşleşme varsa direkt sepete ────
  const aramaEnter = (e) => {
    if (e.key !== 'Enter') return
    if (filtreli.length === 1) {
      sepeteEkle(filtreli[0])
      setArama('')
    } else if (filtreli.length > 1 && arama.trim()) {
      // İsimle birebir eşleşme varsa onu al
      const tam = filtreli.find(u => u.ad.toLowerCase() === arama.toLowerCase().trim())
      if (tam) { sepeteEkle(tam); setArama('') }
    }
  }

  // ─── Ödeme (siparişi tek seferde oluştur + kapat) ─────────────
  const odemeYap = async (yontem) => {
    if (sepet.length === 0) return
    setIsleniyor(true)
    try {
      // 1. Sipariş oluştur (masasız — gel_al türünde hızlı satış)
      const siparis = await siparislerApi.create(
        {
          masa_id: null,
          masa_no: 'HIZLI',
          tur: 'gel_al',
          garson: 'Hızlı Satış',
        },
        sepet.map(s => ({
          urun_id: s.urun_id,
          urun_ad: s.urun_ad,
          urun_fiyat: s.urun_fiyat,
          adet: s.adet,
        }))
      )
      // 2. Anında kapat
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

      {/* ═══════════ SOL: ÜRÜN IZGARASI ═══════════ */}
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>

        {/* Arama / barkod */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input
            ref={aramaRef}
            autoFocus
            value={arama}
            onChange={e => setArama(e.target.value)}
            onKeyDown={aramaEnter}
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

        {/* Kategori sekmeleri */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', paddingBottom: 4, flexShrink: 0 }}>
          <KatButon aktif={aktifKat === 'hepsi'} onClick={() => setAktifKat('hepsi')} label="Tümü" emoji="🗂️" />
          {kategoriler.map(k => (
            <KatButon key={k.id} aktif={aktifKat === k.id} onClick={() => setAktifKat(k.id)} label={k.ad} emoji={k.emoji} />
          ))}
        </div>

        {/* Ürün grid */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {filtreli.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 40, fontSize: 14 }}>
              Ürün bulunamadı
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
              {filtreli.map(u => (
                <button key={u.id} onClick={() => sepeteEkle(u)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'space-between',
                    minHeight: 92, padding: 12, borderRadius: 'var(--radius, 10px)',
                    border: '0.5px solid var(--border)', background: 'var(--surface)',
                    cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                    transition: 'transform .05s, box-shadow .15s', touchAction: 'manipulation',
                  }}
                  onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
                  onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{u.emoji || '🍽️'}</div>
                  <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.25, color: 'var(--text)' }}>{u.ad}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
                    ₺{Number(u.fiyat).toFixed(2)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════ SAĞ: SEPET ═══════════ */}
      <div style={{
        display: 'flex', flexDirection: 'column', minHeight: 0,
        background: 'var(--surface)', borderRadius: 'var(--radius-lg, 14px)',
        border: '0.5px solid var(--border)', overflow: 'hidden'
      }}>
        {/* Başlık */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '0.5px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 15 }}>
            <ShoppingCart size={17} /> Sepet
            {toplamAdet > 0 && (
              <span style={{ fontSize: 12, background: 'var(--accent-light)', color: 'var(--accent)', borderRadius: 20, padding: '2px 8px', fontWeight: 600 }}>
                {toplamAdet}
              </span>
            )}
          </div>
          {sepet.length > 0 && (
            <button onClick={sepetiBosalt} className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }}>
              <Trash2 size={13} /> Temizle
            </button>
          )}
        </div>

        {/* Kalemler */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: sepet.length ? 8 : 0 }}>
          {sepet.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', gap: 8, padding: 20 }}>
              <ShoppingCart size={32} strokeWidth={1.2} />
              <span style={{ fontSize: 13 }}>Ürün seçin</span>
            </div>
          ) : (
            sepet.map(s => (
              <div key={s.urun_id} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 8px',
                borderRadius: 'var(--radius, 10px)',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.urun_ad}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', fontVariantNumeric: 'tabular-nums' }}>
                    ₺{s.urun_fiyat.toFixed(2)} × {s.adet} = <strong style={{ color: 'var(--text)' }}>₺{(s.urun_fiyat * s.adet).toFixed(2)}</strong>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <button onClick={() => adetDegistir(s.urun_id, -1)} className="btn-adet"><Minus size={13} /></button>
                  <span style={{ minWidth: 22, textAlign: 'center', fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{s.adet}</span>
                  <button onClick={() => adetDegistir(s.urun_id, +1)} className="btn-adet"><Plus size={13} /></button>
                  <button onClick={() => kalemSil(s.urun_id)} className="btn-adet" style={{ color: 'var(--red)', marginLeft: 2 }}><Trash2 size={13} /></button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Toplam + öde */}
        <div style={{ borderTop: '0.5px solid var(--border)', padding: 16, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text2)' }}>Toplam</span>
            <span style={{ fontSize: 26, fontWeight: 700, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>
              ₺{toplam.toFixed(2)}
            </span>
          </div>
          <button
            className="btn btn-primary"
            disabled={sepet.length === 0}
            onClick={() => setOdemeModal(true)}
            style={{ width: '100%', padding: '13px', fontSize: 15, justifyContent: 'center' }}
          >
            <CheckCircle size={16} /> Ödeme Al
          </button>
        </div>
      </div>

      {/* ═══════════ ÖDEME MODALİ ═══════════ */}
      {odemeModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setOdemeModal(false)}>
          <div className="modal" style={{ width: 360 }}>
            <div className="modal-title">Ödeme Yöntemi</div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', padding: '10px 12px',
              background: 'var(--surface2)', borderRadius: 'var(--radius)', marginBottom: 14
            }}>
              <span style={{ color: 'var(--text2)', fontSize: 13 }}>Tahsil edilecek</span>
              <span style={{ fontWeight: 700, fontSize: 16 }}>₺{toplam.toFixed(2)}</span>
            </div>
            <div style={{ display: 'grid', gap: 8, marginBottom: 8 }}>
              {izinliOdemeler.map(o => {
                const Icon = o.icon
                return (
                  <button key={o.label}
                    className="btn"
                    disabled={isleniyor}
                    onClick={() => odemeYap(o.label)}
                    style={{
                      padding: '15px', fontSize: 15, justifyContent: 'flex-start', gap: 12,
                      border: '0.5px solid var(--border)', background: 'var(--surface)',
                    }}>
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

      {/* Küçük yerel stiller */}
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

// ─── Kategori butonu ───────────────────────────────────────────
function KatButon({ aktif, onClick, label, emoji }) {
  return (
    <button onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
        borderRadius: 20, border: '0.5px solid var(--border)', cursor: 'pointer',
        whiteSpace: 'nowrap', fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
        background: aktif ? 'var(--accent)' : 'var(--surface)',
        color: aktif ? '#fff' : 'var(--text2)',
        flexShrink: 0, touchAction: 'manipulation',
      }}>
      <span>{emoji || '🍽️'}</span> {label}
    </button>
  )
}
