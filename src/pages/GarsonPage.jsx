import { useState, useEffect, useCallback } from 'react'
import { salonlarApi, masalarApi, kategorilerApi, urunlerApi, siparislerApi, realtimeApi } from '../lib/supabase'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useIzin } from '../contexts/IzinContext'
import { usePinOnay } from '../contexts/PinOnayContext'
import toast from 'react-hot-toast'
import { ShoppingCart, Send, Trash2, ChefHat, ArrowRightLeft, X, ClipboardList } from 'lucide-react'

// ─── MEVCUT SİPARİŞ GÖRÜNTÜLEME ──────────────────────────────────────────────
function MevcutSiparisPanel({ siparis }) {
  if (!siparis) return null
  const kalemler = siparis.siparis_kalemleri || []
  const toplam = kalemler.reduce((a, k) => a + k.urun_fiyat * k.adet, 0)
  const gruplu = Object.values(kalemler.reduce((acc, k) => {
    if (acc[k.urun_ad]) acc[k.urun_ad].adet += k.adet
    else acc[k.urun_ad] = { ...k }
    return acc
  }, {}))

  return (
    <div style={{ background: 'var(--amber-light)', borderRadius: 'var(--radius)', border: '0.5px solid #e8c47a', padding: '10px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 12, fontWeight: 600, color: 'var(--amber)' }}>
        <ClipboardList size={13} /> Masadaki Mevcut Sipariş
      </div>
      <div style={{ maxHeight: 130, overflowY: 'auto' }}>
        {gruplu.map(k => (
          <div key={k.urun_ad} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
            <span style={{ color: 'var(--text)' }}>{k.urun_ad} <span style={{ color: 'var(--text2)' }}>x{k.adet}</span></span>
            <span style={{ fontWeight: 500 }}>₺{k.urun_fiyat * k.adet}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 13, fontWeight: 700, color: 'var(--amber)' }}>
        <span>Toplam</span><span>₺{toplam}</span>
      </div>
    </div>
  )
}

// ─── ÜRÜN TRANSFERİ MODALİ ───────────────────────────────────────────────────
function UrunTransferModal({ mevcutSiparis, onTransfer, onKapat }) {
  const [hedefSiparis, setHedefSiparis] = useState(null)
  const [acikSiparisler, setAcikSiparisler] = useState([])
  const [seciliUrunler, setSeciliUrunler] = useState({})
  const kalemler = Object.values((mevcutSiparis?.siparis_kalemleri || []).reduce((acc, k) => {
    if (acc[k.urun_ad]) { acc[k.urun_ad].adet += k.adet; acc[k.urun_ad].ids = [...(acc[k.urun_ad].ids||[k.id]), k.id] }
    else acc[k.urun_ad] = { ...k, ids: [k.id] }
    return acc
  }, {}))

  useEffect(() => {
    siparislerApi.getAcikSiparisler().then(data =>
      setAcikSiparisler((data || []).filter(s => s.id !== mevcutSiparis?.id))
    )
  }, [mevcutSiparis])

  const adetDegistir = (urunAd, adet) => {
    const max = kalemler.find(k => k.urun_ad === urunAd)?.adet || 1
    setSeciliUrunler(p => ({ ...p, [urunAd]: Math.max(0, Math.min(adet, max)) }))
  }

  const toplamSecili = Object.values(seciliUrunler).some(v => v > 0)

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onKapat()}>
      <div className="modal" style={{ width: 460 }}>
        <div className="modal-title">Ürün Transferi — {mevcutSiparis?.masa_no}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 8 }}>Taşınacak ürünler</div>
            {kalemler.map(k => (
              <div key={k.urun_ad} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '0.5px solid var(--border)' }}>
                <span style={{ flex: 1, fontSize: 12 }}>{k.urun_ad}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button className="adet-btn" onClick={() => adetDegistir(k.urun_ad, (seciliUrunler[k.urun_ad]||0)-1)}>−</button>
                  <span style={{ fontSize: 12, minWidth: 18, textAlign: 'center' }}>{seciliUrunler[k.urun_ad]||0}</span>
                  <button className="adet-btn" onClick={() => adetDegistir(k.urun_ad, (seciliUrunler[k.urun_ad]||0)+1)}>+</button>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text3)', minWidth: 24 }}>/{k.adet}</span>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 8 }}>Hedef masa</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 220, overflowY: 'auto' }}>
              {acikSiparisler.map(s => (
                <div key={s.id} onClick={() => setHedefSiparis(s)} className="card-sm"
                  style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    border: hedefSiparis?.id === s.id ? '2px solid var(--accent)' : undefined }}>
                  <span style={{ fontWeight: 600 }}>{s.masa_no}</span>
                  <span style={{ fontSize: 11, color: 'var(--text2)' }}>{s.siparis_kalemleri?.length} ürün</span>
                </div>
              ))}
              {acikSiparisler.length === 0 && <div style={{ fontSize: 12, color: 'var(--text3)', padding: '12px 0', textAlign: 'center' }}>Açık başka masa yok</div>}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onKapat}>İptal</button>
          <button className="btn btn-primary" disabled={!hedefSiparis || !toplamSecili}
            onClick={() => onTransfer({ hedefSiparis, seciliUrunler, kalemler })}>
            <ArrowRightLeft size={13} /> Transferi Onayla
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── SİPARİŞ İPTAL MODALİ ────────────────────────────────────────────────────
function IptalModal({ siparis, onIptal, onKapat }) {
  const [neden, setNeden] = useState('')
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onKapat()}>
      <div className="modal" style={{ width: 360 }}>
        <div className="modal-title" style={{ color: 'var(--red)' }}>Siparişi İptal Et</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14 }}>
          <strong>{siparis?.masa_no}</strong> masasının siparişi iptal edilecek.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {['Müşteri vazgeçti', 'Yanlış sipariş', 'Stok yok', 'Diğer'].map(n => (
            <button key={n} onClick={() => setNeden(n)} style={{
              padding: '9px 14px', borderRadius: 'var(--radius)', textAlign: 'left',
              border: neden === n ? '1.5px solid var(--red)' : '0.5px solid var(--border)',
              background: neden === n ? 'var(--red-light)' : 'transparent',
              color: neden === n ? 'var(--red)' : 'var(--text)',
              cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: neden === n ? 500 : 400
            }}>{n}</button>
          ))}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onKapat}>Vazgeç</button>
          <button disabled={!neden} onClick={() => onIptal(neden)}
            style={{ padding: '8px 16px', borderRadius: 'var(--radius)', background: neden ? 'var(--red)' : 'var(--border)', color: '#fff', border: 'none', cursor: neden ? 'pointer' : 'not-allowed', fontFamily: 'inherit', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <X size={13} /> İptal Et
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── ANA SAYFA ────────────────────────────────────────────────────────────────
export default function GarsonPage() {
  const [salonlar, setSalonlar] = useState([])
  const [masalar, setMasalar] = useState([])
  const [kategoriler, setKategoriler] = useState([])
  const [urunler, setUrunler] = useState([])
  const [aktifSalon, setAktifSalon] = useState(null)
  const [aktifKat, setAktifKat] = useState('tumu')
  const [seciliMasa, setSeciliMasa] = useState(null)
  const [mevcutSiparis, setMevcutSiparis] = useState(null)
  const [sepet, setSepet] = useState([])
  const [loading, setLoading] = useState(true)
  const [gonderiyor, setGonderiyor] = useState(false)
  const [masaIsim, setMasaIsim] = useState('')       // isimle masa açma
  const [notModal, setNotModal] = useState(null)     // { urun, resolve }
  const [mobilEkran, setMobilEkran] = useState('masa') // 'masa' | 'siparis'
  const [sepetNotlar, setSepetNotlar] = useState({}) // id -> not
  const [modal, setModal] = useState(null)
  const { izinVar } = useIzin()
  const { kullanici } = useAuth()
  const { pinOnayla } = usePinOnay()

  const masalariYukle = useCallback(async (salon) => {
    if (!salon) return
    const m = await masalarApi.getBySalon(salon.id)
    setMasalar(m)
  }, [])

  const yukle = useCallback(async () => {
    try {
      const [s, k, u] = await Promise.all([salonlarApi.getAll(), kategorilerApi.getAll(), urunlerApi.getAll()])
      setSalonlar(s); setKategoriler(k); setUrunler(u)
      if (s.length > 0) { setAktifSalon(s[0]); await masalariYukle(s[0]) }
    } catch { toast.error('Veriler yüklenemedi') }
    finally { setLoading(false) }
  }, [masalariYukle])

  useEffect(() => {
    yukle()
    const sub = realtimeApi.masalarSubscribe(() => {
      setAktifSalon(prev => { if (prev) masalariYukle(prev); return prev })
    })
    return () => realtimeApi.unsubscribe(sub)
  }, [yukle, masalariYukle])

  const salonDegistir = async (salon) => {
    setAktifSalon(salon); setSeciliMasa(null); setSepet([]); setMevcutSiparis(null)
    await masalariYukle(salon)
  }

  const masaSec = async (masa) => {
    setSeciliMasa(masa); setSepet([]); setMasaIsim(masa.musteri_isim || '')
    if (window.innerWidth <= 768) setMobilEkran('siparis')
    if (masa.durum === 'dolu') {
      const siparis = await siparislerApi.getByMasa(masa.id)
      setMevcutSiparis(siparis)
    } else {
      setMevcutSiparis(null)
    }
  }

  const urunEkle = (urun, not = null) => {
    setSepet(prev => {
      const mevcut = prev.find(s => s.id === urun.id && !not)
      if (mevcut && !not) return prev.map(s => s.id === urun.id ? { ...s, adet: s.adet + 1 } : s)
      const yeniId = `${urun.id}_${Date.now()}`
      return [...prev, { _uid: not ? yeniId : urun.id, id: urun.id, ad: urun.ad, fiyat: urun.fiyat, adet: 1, emoji: urun.emoji || '🍽️', not: not || '' }]
    })
  }

  const urunEkleNot = (urun) => {
    // Not gerektirecek şekilde ekle — modal aç
    setNotModal({ urun })
  }

  const adetDegistir = (uid, delta) => {
    setSepet(prev => prev.map(s => (s._uid || s.id) === uid ? { ...s, adet: s.adet + delta } : s).filter(s => s.adet > 0))
  }

  const siparisiGonder = async () => {
    if (!seciliMasa || sepet.length === 0) return
    setGonderiyor(true)
    try {
      const { toplam, kdv_tutar, genel_toplam } = await siparislerApi.toplamHesapla(
        sepet.map(s => ({ urun_fiyat: s.fiyat, adet: s.adet }))
      )
      const masaNo = masaIsim ? `${seciliMasa.no} · ${masaIsim}` : seciliMasa.no
      await siparislerApi.create(
        {
          masa_id: seciliMasa.id, masa_no: masaNo,
          tur: aktifSalon?.ad?.includes('Paket') ? 'paket' : 'masa',
          toplam, kdv_tutar, genel_toplam,
          garson_id: kullanici?.id || null,
          garson_ad: kullanici?.ad_soyad || kullanici?.kullanici_adi || null
        },
        sepet.map(s => ({ urun_id: s.id, urun_ad: s.ad, urun_fiyat: s.fiyat, adet: s.adet, notlar: s.not || null }))
      )
      toast.success(`${seciliMasa.no} siparişi mutfağa gönderildi!`)
      setSepet([]); setSeciliMasa(null); setMevcutSiparis(null)
      await masalariYukle(aktifSalon)
    } catch { toast.error('Sipariş gönderilemedi') }
    finally { setGonderiyor(false) }
  }

  const siparisiIptalEt = async (neden) => {
    if (!mevcutSiparis) return
    // PIN doğrulama
    const { onaylandi } = await pinOnayla('siparis_iptal', { masaNo: seciliMasa?.no })
    if (!onaylandi) return
    try {
      await supabase.from('siparisler').update({ durum: 'iptal' }).eq('id', mevcutSiparis.id)
      await masalarApi.updateDurum(seciliMasa.id, 'bos')
      toast.success(`${seciliMasa.no} siparişi iptal — ${neden}`)
      setModal(null); setSeciliMasa(null); setSepet([]); setMevcutSiparis(null)
      await masalariYukle(aktifSalon)
    } catch { toast.error('İptal başarısız') }
  }

  const urunTransferEt = async ({ hedefSiparis, seciliUrunler, kalemler }) => {
    try {
      const tumKalemler = mevcutSiparis.siparis_kalemleri || []
      let masaBosaldi = true

      for (const [urunAd, miktar] of Object.entries(seciliUrunler)) {
        if (!miktar) continue
        // Bu ürüne ait DB kalemleri
        const dbKalemler = tumKalemler.filter(k => k.urun_ad === urunAd)
        let kalanMiktar = miktar

        for (const dbK of dbKalemler) {
          if (kalanMiktar <= 0) break
          const tasinan = Math.min(kalanMiktar, dbK.adet)
          if (tasinan === dbK.adet) {
            // Tamamını taşı
            await supabase.from('siparis_kalemleri')
              .update({ siparis_id: hedefSiparis.id }).eq('id', dbK.id)
          } else {
            // Kısmi taşıma
            await supabase.from('siparis_kalemleri')
              .insert({ siparis_id: hedefSiparis.id, urun_id: dbK.urun_id, urun_ad: dbK.urun_ad, urun_fiyat: dbK.urun_fiyat, adet: tasinan, durum: 'bekliyor' })
            await supabase.from('siparis_kalemleri')
              .update({ adet: dbK.adet - tasinan }).eq('id', dbK.id)
          }
          kalanMiktar -= tasinan
        }
      }

      // Masada kalan kalem var mı kontrol et
      const { data: kalanlar } = await supabase
        .from('siparis_kalemleri')
        .select('id')
        .eq('siparis_id', mevcutSiparis.id)

      if (!kalanlar || kalanlar.length === 0) {
        // Masa tamamen boşaldı
        await supabase.from('siparisler').update({ durum: 'iptal' }).eq('id', mevcutSiparis.id)
        await masalarApi.updateDurum(seciliMasa.id, 'bos')
        toast.success(`${seciliMasa.no} → ${hedefSiparis.masa_no} transfer tamamlandı, masa boşaltıldı`)
      } else {
        toast.success(`Seçilen ürünler ${hedefSiparis.masa_no} masasına taşındı`)
      }

      setModal(null); setSeciliMasa(null); setSepet([]); setMevcutSiparis(null)
      await masalariYukle(aktifSalon)
    } catch (e) { toast.error('Transfer başarısız: ' + e.message) }
  }

  // İzne göre aksiyon butonları — sadece dolu masa seçilince ve izin varsa
  const aksiyonlar = [
    { id: 'iptal',    izin: 'siparis_iptal', label: 'Siparişi İptal', icon: X,              renk: 'var(--red)', bg: 'var(--red-light)' },
    { id: 'transfer', izin: 'urun_transfer', label: 'Ürün Transferi', icon: ArrowRightLeft,  renk: '#534AB7',    bg: '#EEEDFE'          },
  ].filter(a => izinVar(a.izin))

  const filtreliUrunler = aktifKat === 'tumu' ? urunler : urunler.filter(u => u.kategori_id === aktifKat)
  const sepetToplam = sepet.reduce((acc, s) => acc + s.fiyat * s.adet, 0)
  const masaDolu = seciliMasa?.durum === 'dolu' && mevcutSiparis

  if (loading) return <div className="loading-center"><div className="spinner" /><span>Yükleniyor...</span></div>

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, height: '100%' }} className="garson-grid">
      {/* SOL: MASALAR */}
      <div>
        <div className="pill-tabs" style={{ marginBottom: 12 }}>
          {salonlar.map(s => (
            <button key={s.id} className={`pill ${aktifSalon?.id === s.id ? 'active' : ''}`} onClick={() => salonDegistir(s)}>
              {s.ad}
            </button>
          ))}
        </div>
        <div className="masa-grid">
          {masalar.map(m => (
            <div key={m.id}
              className={`masa-kart ${m.durum === 'dolu' ? 'dolu' : ''} ${seciliMasa?.id === m.id ? 'secili' : ''}`}
              onClick={() => masaSec(m)}
              style={m.renk && m.durum !== 'dolu' && seciliMasa?.id !== m.id ? {
                borderTop: `3px solid ${m.renk}`,
                background: m.renk + '18',
                borderColor: m.renk + '60'
              } : undefined}>
              <div className="masa-no" style={m.renk && m.durum !== 'dolu' && seciliMasa?.id !== m.id ? { color: m.renk } : undefined}>{m.no}</div>
              <div className="masa-alt">{m.musteri_isim || (m.durum === 'dolu' ? 'Dolu' : 'Boş')}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
          {[['#f5f4f0','#aaa','Boş'],['#FAEEDA','#e8c47a','Dolu'],['#D85A30','#D85A30','Seçili']].map(([bg,border,label]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text2)' }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: bg, border: `0.5px solid ${border}` }} />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* SAĞ: SİPARİŞ PANELİ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} className={`garson-sag ${mobilEkran === 'siparis' ? 'aktif' : ''}`}>
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setMobilEkran('masa')} className="btn btn-ghost btn-sm mobil-geri"
                style={{ display: 'none' }}>
                ← Masalar
              </button>
              <span style={{ fontWeight: 600, fontSize: 14 }}>
                {seciliMasa ? `${seciliMasa.no} · ${masaDolu ? 'Dolu' : 'Yeni'}` : 'Masa seçin'}
              </span>
            </div>
            <ChefHat size={16} color="var(--text2)" />
          </div>
          {seciliMasa && !masaDolu && (
            <input
              value={masaIsim}
              onChange={e => setMasaIsim(e.target.value)}
              placeholder="Müşteri adı (opsiyonel)"
              inputMode="text"
              style={{ fontSize: 13, padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border-md)', width: '100%' }}
            />
          )}

          {!seciliMasa ? (
            <div className="empty-state"><p>← Sipariş için masa seçin</p></div>
          ) : (
            <>
              {/* Mevcut sipariş göster */}
              {masaDolu && <MevcutSiparisPanel siparis={mevcutSiparis} />}

              {/* Aksiyon butonları — sadece dolu masa + izin varsa */}
              {masaDolu && aksiyonlar.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: aksiyonlar.length === 1 ? '1fr' : '1fr 1fr', gap: 6 }}>
                  {aksiyonlar.map(a => (
                    <button key={a.id} onClick={() => setModal(a.id)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                        padding: '7px 0', borderRadius: 'var(--radius)',
                        border: `1px solid ${a.renk}`, background: a.bg,
                        color: a.renk, fontWeight: 500, fontSize: 12,
                        cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s'
                      }}>
                      <a.icon size={12} /> {a.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Yeni ürün ekle — izin varsa */}
              {izinVar('siparis_al') ? (
                <>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)' }}>
                    {masaDolu ? 'Ek Sipariş Ekle' : 'Sipariş Al'}
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    <button className={`pill ${aktifKat === 'tumu' ? 'active' : ''}`} onClick={() => setAktifKat('tumu')}>Tümü</button>
                    {kategoriler.map(k => (
                      <button key={k.id} className={`pill ${aktifKat === k.id ? 'active' : ''}`} onClick={() => setAktifKat(k.id)}>
                        {k.emoji} {k.ad}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, overflowY: 'auto', flex: 1 }}>
                    {filtreliUrunler.map(u => {
                      const adet = sepet.find(s => s.id === u.id)?.adet || 0
                      return (
                        <div key={u.id}
                          onClick={() => urunEkle(u)}
                          onContextMenu={e => { e.preventDefault(); urunEkleNot(u) }}
                          style={{ padding: '10px 10px', borderRadius: 'var(--radius)', border: `1.5px solid ${adet > 0 ? 'var(--accent)' : 'var(--border)'}`, background: adet > 0 ? 'var(--accent-light)' : 'var(--surface2)', cursor: 'pointer', transition: 'all .15s', position: 'relative', userSelect: 'none', WebkitTapHighlightColor: 'transparent' }}
                          onMouseEnter={e => { if (!adet) e.currentTarget.style.borderColor = 'var(--accent)' }}
                          onMouseLeave={e => { if (!adet) e.currentTarget.style.borderColor = 'var(--border)' }}>
                          {adet > 0 && (
                            <span style={{ position: 'absolute', top: 6, right: 6, background: 'var(--accent)', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{adet}</span>
                          )}
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{u.emoji} {u.ad}</div>
                          <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 3, fontWeight: 600 }}>₺{u.fiyat}</div>
                          {adet > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }} onClick={e => e.stopPropagation()}>
                              <button className="adet-btn" style={{ width: 34, height: 34, fontSize: 18 }}
                                onClick={e => { e.stopPropagation(); adetDegistir(u.id, -1) }}>−</button>
                              <span style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: 16 }}>{adet}</span>
                              <button className="adet-btn" style={{ width: 34, height: 34, fontSize: 18 }}
                                onClick={e => { e.stopPropagation(); urunEkle(u) }}>+</button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </>
              ) : (
                !masaDolu && (
                  <div style={{ padding: 12, background: 'var(--red-light)', borderRadius: 'var(--radius)', fontSize: 12, color: 'var(--red)', textAlign: 'center' }}>
                    Sipariş alma yetkiniz yok
                  </div>
                )
              )}
            </>
          )}
        </div>

        {/* SEPET */}
        {seciliMasa && sepet.length > 0 && izinVar('siparis_al') && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500 }}>
              <ShoppingCart size={14} />
              {masaDolu ? 'Ek Sipariş' : 'Sepet'} <span className="badge badge-accent">{sepet.length}</span>
            </div>
            <div style={{ maxHeight: 150, overflowY: 'auto' }}>
              {sepet.map(s => (
                <div key={s.id} className="sepet-item">
                  <div className="sepet-ad">
                    <div>{s.emoji} {s.ad}</div>
                    {s.not && <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 2 }}>📝 {s.not}</div>}
                  </div>
                  <div className="adet-ctrl">
                    <button className="adet-btn" onClick={() => adetDegistir(s.id, -1)}>−</button>
                    <span style={{ fontSize: 15, fontWeight: 600, minWidth: 28, textAlign: 'center' }}>{s.adet}</span>
                    <button className="adet-btn" onClick={() => adetDegistir(s.id, 1)}>+</button>
                  </div>
                  <span className="sepet-fiyat">₺{s.fiyat * s.adet}</span>
                </div>
              ))}
            </div>
            <div className="divider" style={{ margin: '2px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
              <span>Toplam</span><span>₺{sepetToplam}</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setSepet([])} title="Temizle">
                <Trash2 size={13} />
              </button>
              <button className="btn btn-primary btn-full btn-sm" onClick={siparisiGonder} disabled={gonderiyor}>
                <Send size={13} />
                {gonderiyor ? 'Gönderiliyor...' : 'Mutfağa Gönder'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modaller */}
      {modal === 'iptal' && mevcutSiparis && (
        <IptalModal siparis={mevcutSiparis} onIptal={siparisiIptalEt} onKapat={() => setModal(null)} />
      )}
      {modal === 'transfer' && mevcutSiparis && (
        <UrunTransferModal mevcutSiparis={mevcutSiparis} onTransfer={urunTransferEt} onKapat={() => setModal(null)} />
      )}
    </div>
  )
}
