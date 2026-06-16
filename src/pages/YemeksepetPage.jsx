import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  getToken, ysGetSiparisler, ysSiparisiOnayla,
  ysSiparisiIptalEt, ysGetOutletDurum, ysOutletAc, ysOutletKapat,
  webhookSiparisiIsle
} from '../lib/yemeksepeti'
import toast from 'react-hot-toast'
import {
  Settings, Wifi, WifiOff, RefreshCw, Check, X,
  Package, Clock, CheckCircle, AlertCircle, Store, ChevronDown, ChevronUp
} from 'lucide-react'

const DURUM_RENK = {
  RECEIVED:        { label: 'Yeni',      bg: '#E1F5EE', text: '#085041', border: '#1D9E75' },
  READY_FOR_PICKUP:{ label: 'Hazır',     bg: '#FAEEDA', text: '#633806', border: '#BA7517' },
  DISPATCHED:      { label: 'Yolda',     bg: '#E6F1FB', text: '#0C447C', border: '#185FA5' },
  DELIVERED:       { label: 'Teslim',    bg: '#EAF3DE', text: '#27500A', border: '#639922' },
  CANCELLED:       { label: 'İptal',     bg: '#FCEBEB', text: '#791F1F', border: '#E24B4A' },
}

// ─── AYARLAR PANELİ ──────────────────────────────────────────────────────────
function AyarlarPanel({ ayarlar, onKaydet }) {
  const [form, setForm] = useState(ayarlar)
  const [test, setTest] = useState(null)
  const [testYukleniyor, setTestYukleniyor] = useState(false)

  const baglantiTest = async () => {
    setTestYukleniyor(true); setTest(null)
    try {
      await getToken()
      setTest({ ok: true, mesaj: 'Bağlantı başarılı! Token alındı.' })
    } catch (e) {
      setTest({ ok: false, mesaj: e.message })
    } finally { setTestYukleniyor(false) }
  }

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Settings size={15} /> API Bağlantı Ayarları
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div className="form-row">
          <label>Client ID</label>
          <input value={form.client_id || ''} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
            placeholder="ys_client_..." type="password" />
        </div>
        <div className="form-row">
          <label>Client Secret</label>
          <input value={form.client_secret || ''} onChange={e => setForm(f => ({ ...f, client_secret: e.target.value }))}
            placeholder="••••••••" type="password" />
        </div>
        <div className="form-row">
          <label>Chain ID</label>
          <input value={form.chain_id || ''} onChange={e => setForm(f => ({ ...f, chain_id: e.target.value }))}
            placeholder="chain_123" />
        </div>
        <div className="form-row">
          <label>Vendor ID</label>
          <input value={form.vendor_id || ''} onChange={e => setForm(f => ({ ...f, vendor_id: e.target.value }))}
            placeholder="vendor_456" />
        </div>
      </div>

      <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: '10px 14px', fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>
        <strong>Webhook URL'iniz:</strong>
        <div style={{ fontFamily: 'monospace', marginTop: 4, padding: '6px 10px', background: 'var(--surface)', borderRadius: 4, fontSize: 11, wordBreak: 'break-all' }}>
          {window.location.origin}/api/yemeksepeti-webhook
        </div>
        Bu URL'yi Yemeksepeti Partner Portal'ında webhook olarak tanımlayın.
      </div>

      {test && (
        <div style={{
          padding: '10px 14px', borderRadius: 'var(--radius)', marginBottom: 12, fontSize: 13,
          background: test.ok ? 'var(--green-light)' : 'var(--red-light)',
          color: test.ok ? '#085041' : 'var(--red)',
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          {test.ok ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          {test.mesaj}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-ghost" onClick={baglantiTest} disabled={testYukleniyor}>
          <Wifi size={13} /> {testYukleniyor ? 'Test ediliyor...' : 'Bağlantı Test Et'}
        </button>
        <button className="btn btn-primary" onClick={() => onKaydet(form)}>
          Kaydet
        </button>
      </div>
    </div>
  )
}

// ─── OUTLET DURUMU ────────────────────────────────────────────────────────────
function OutletPanel({ aktif }) {
  const [durum, setDurum] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(false)

  const yukle = async () => {
    if (!aktif) return
    try {
      const d = await ysGetOutletDurum()
      setDurum(d)
    } catch (e) { console.error(e) }
  }

  useEffect(() => { yukle() }, [aktif])

  const durumDegistir = async (ac) => {
    setYukleniyor(true)
    try {
      if (ac) await ysOutletAc()
      else await ysOutletKapat(60)
      toast.success(ac ? 'İşletme açıldı' : 'İşletme kapatıldı (60 dk)')
      yukle()
    } catch (e) { toast.error(e.message) }
    finally { setYukleniyor(false) }
  }

  if (!aktif) return null

  const acik = durum?.status === 'OPEN'

  return (
    <div className="card" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 16 }}>
      <Store size={18} color={acik ? 'var(--green)' : 'var(--red)'} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>Yemeksepeti İşletme Durumu</div>
        <div style={{ fontSize: 12, color: acik ? 'var(--green)' : 'var(--red)', marginTop: 2 }}>
          {durum ? (acik ? '● Açık — Sipariş alınıyor' : '● Kapalı') : 'Yükleniyor...'}
        </div>
      </div>
      <button className={`btn ${acik ? 'btn-ghost' : 'btn-success'} btn-sm`}
        onClick={() => durumDegistir(!acik)} disabled={yukleniyor}>
        {acik ? <><WifiOff size={12} /> Kapat</> : <><Wifi size={12} /> Aç</>}
      </button>
    </div>
  )
}

// ─── SİPARİŞ KARTI ───────────────────────────────────────────────────────────
function SiparisKarti({ ps, onOnayla, onIptal }) {
  const [acik, setAcik] = useState(true)
  const durum = DURUM_RENK[ps.durum] || DURUM_RENK.RECEIVED
  const ysOrder = ps.ham_veri || {}
  const kalemler = ysOrder.items || []

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', borderLeft: `4px solid ${durum.border}` }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
        onClick={() => setAcik(a => !a)}>
        <div style={{ background: durum.bg, color: durum.text, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
          {durum.label}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>#{ps.platform_order_code || ps.platform_order_id?.slice(-6)}</div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>
            {ps.musteri_ad} · ₺{ps.siparis_tutari?.toFixed(2)}
            {ps.created_at && ` · ${Math.floor((Date.now() - new Date(ps.created_at).getTime()) / 60000)} dk önce`}
          </div>
        </div>
        {acik ? <ChevronUp size={14} color="var(--text2)" /> : <ChevronDown size={14} color="var(--text2)" />}
      </div>

      {/* Detay */}
      {acik && (
        <div style={{ padding: '0 16px 14px', borderTop: '0.5px solid var(--border)' }}>
          {/* Müşteri */}
          {(ps.musteri_ad || ps.teslimat_adresi) && (
            <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: '8px 12px', marginTop: 10, fontSize: 12 }}>
              {ps.musteri_ad && <div><strong>Müşteri:</strong> {ps.musteri_ad}</div>}
              {ps.teslimat_adresi && <div style={{ color: 'var(--text2)', marginTop: 2 }}><strong>Adres:</strong> {ps.teslimat_adresi}</div>}
              {ps.notlar && <div style={{ color: 'var(--amber)', marginTop: 2 }}><strong>Not:</strong> {ps.notlar}</div>}
            </div>
          )}

          {/* Kalemler */}
          <div style={{ marginTop: 10 }}>
            {kalemler.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '0.5px solid var(--border)', fontSize: 13 }}>
                <span>{item.name} {item.instructions && <span style={{ fontSize: 11, color: 'var(--amber)' }}>({item.instructions})</span>}</span>
                <span style={{ fontWeight: 500 }}>₺{item.pricing?.unit_price || 0}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontWeight: 700, fontSize: 14, color: 'var(--accent)' }}>
              <span>Toplam</span><span>₺{ps.siparis_tutari?.toFixed(2)}</span>
            </div>
          </div>

          {/* Aksiyonlar */}
          {ps.durum === 'RECEIVED' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn btn-success btn-sm" style={{ flex: 1 }} onClick={() => onOnayla(ps)}>
                <Check size={13} /> Onayla
              </button>
              <button className="btn btn-sm" onClick={() => onIptal(ps)}
                style={{ flex: 1, border: '1px solid var(--red)', color: 'var(--red)', background: 'var(--red-light)' }}>
                <X size={13} /> Reddet
              </button>
            </div>
          )}
          {ps.durum === 'READY_FOR_PICKUP' && (
            <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--amber-light)', borderRadius: 'var(--radius)', fontSize: 12, color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={13} /> Kurye bekleniyor...
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── ANA SAYFA ────────────────────────────────────────────────────────────────
export default function YemeksepetPage() {
  const [ayarlar, setAyarlar] = useState({})
  const [entAktif, setEntAktif] = useState(false)
  const [siparisler, setSiparisler] = useState([])
  const [loading, setLoading] = useState(true)
  const [yenileniyor, setYenileniyor] = useState(false)
  const [ayarlarAcik, setAyarlarAcik] = useState(false)
  const [filtre, setFiltre] = useState('aktif')

  const yukle = useCallback(async () => {
    const { data: ent } = await supabase.from('entegrasyon_ayarlari')
      .select('*').eq('platform', 'yemeksepeti').single()
    if (ent) { setAyarlar(ent.ayarlar || {}); setEntAktif(ent.aktif) }

    const { data: ps } = await supabase.from('platform_siparisler')
      .select('*').eq('platform', 'yemeksepeti')
      .order('created_at', { ascending: false }).limit(100)
    setSiparisler(ps || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    yukle()
    // Realtime — yeni sipariş gelince otomatik güncelle
    const sub = supabase.channel('ys-siparisler')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_siparisler' }, yukle)
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [yukle])

  const ayarlariKaydet = async (form) => {
    await supabase.from('entegrasyon_ayarlari').update({ ayarlar: form }).eq('platform', 'yemeksepeti')
    setAyarlar(form)
    toast.success('Ayarlar kaydedildi')
  }

  const entegrasyonToggle = async () => {
    const yeni = !entAktif
    await supabase.from('entegrasyon_ayarlari').update({ aktif: yeni }).eq('platform', 'yemeksepeti')
    setEntAktif(yeni)
    toast.success(yeni ? 'Entegrasyon aktif edildi' : 'Entegrasyon durduruldu')
  }

  const yenile = async () => {
    if (!entAktif) return
    setYenileniyor(true)
    try {
      const ysOrders = await ysGetSiparisler()
      for (const order of (ysOrders?.orders || [])) {
        await webhookSiparisiIsle(order)
      }
      await yukle()
      toast.success('Siparişler güncellendi')
    } catch (e) { toast.error(e.message) }
    finally { setYenileniyor(false) }
  }

  const onayla = async (ps) => {
    try {
      const items = (ps.ham_veri?.items || []).map(i => ({ id: i._id, sku: i.sku, status: 'ACCEPTED' }))
      await ysSiparisiOnayla(ps.platform_order_id, items)
      await supabase.from('platform_siparisler').update({ durum: 'READY_FOR_PICKUP' }).eq('id', ps.id)
      toast.success(`#${ps.platform_order_code} onaylandı`)
      yukle()
    } catch (e) { toast.error(e.message) }
  }

  const iptalEt = async (ps) => {
    try {
      const items = (ps.ham_veri?.items || []).map(i => ({ id: i._id, sku: i.sku, status: 'CANCELLED' }))
      await ysSiparisiIptalEt(ps.platform_order_id, items, 'RESTAURANT_CANCELLED')
      await supabase.from('platform_siparisler').update({ durum: 'CANCELLED' }).eq('id', ps.id)
      toast.success(`#${ps.platform_order_code} iptal edildi`)
      yukle()
    } catch (e) { toast.error(e.message) }
  }

  const filtreli = siparisler.filter(ps => {
    if (filtre === 'aktif') return ['RECEIVED', 'READY_FOR_PICKUP', 'DISPATCHED'].includes(ps.durum)
    if (filtre === 'tamamlandi') return ps.durum === 'DELIVERED'
    if (filtre === 'iptal') return ps.durum === 'CANCELLED'
    return true
  })

  const bekleyen = siparisler.filter(s => s.durum === 'RECEIVED').length

  if (loading) return <div className="loading-center"><div className="spinner" /></div>

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: '#FA0050', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
          🍽️
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Yemeksepeti Entegrasyonu</div>
          <div style={{ fontSize: 12, color: entAktif ? 'var(--green)' : 'var(--text3)', marginTop: 1 }}>
            {entAktif ? '● Aktif — Siparişler alınıyor' : '○ Pasif'}
            {bekleyen > 0 && <span style={{ marginLeft: 8, background: '#FA0050', color: '#fff', padding: '1px 7px', borderRadius: 10, fontSize: 11 }}>{bekleyen} yeni</span>}
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setAyarlarAcik(a => !a)}>
          <Settings size={13} /> Ayarlar
        </button>
        <button className={`btn btn-sm ${entAktif ? 'btn-ghost' : 'btn-success'}`} onClick={entegrasyonToggle}>
          {entAktif ? <><WifiOff size={12} /> Durdur</> : <><Wifi size={12} /> Başlat</>}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={yenile} disabled={!entAktif || yenileniyor}>
          <RefreshCw size={13} style={{ animation: yenileniyor ? 'spin .6s linear infinite' : 'none' }} />
          {yenileniyor ? 'Yenileniyor...' : 'Yenile'}
        </button>
      </div>

      {/* Ayarlar */}
      {ayarlarAcik && <AyarlarPanel ayarlar={ayarlar} onKaydet={ayarlariKaydet} />}

      {/* Outlet durumu */}
      <OutletPanel aktif={entAktif} />

      {/* İstatistikler */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Bugün Toplam', val: siparisler.filter(s => new Date(s.created_at).toDateString() === new Date().toDateString()).length, renk: '#FA0050' },
          { label: 'Bekleyen', val: bekleyen, renk: 'var(--amber)' },
          { label: 'Hazır / Yolda', val: siparisler.filter(s => ['READY_FOR_PICKUP','DISPATCHED'].includes(s.durum)).length, renk: 'var(--green)' },
          { label: 'Teslim Edildi', val: siparisler.filter(s => s.durum === 'DELIVERED').length, renk: '#185FA5' },
        ].map(s => (
          <div key={s.label} className="stat-kart" style={{ borderLeft: `3px solid ${s.renk}` }}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-val" style={{ color: s.renk }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Filtre */}
      <div className="pill-tabs" style={{ marginBottom: 14 }}>
        {[['aktif','Aktif'],['tamamlandi','Teslim Edildi'],['iptal','İptal'],['tumu','Tümü']].map(([id,label]) => (
          <button key={id} className={`pill ${filtre === id ? 'active' : ''}`} onClick={() => setFiltre(id)}>{label}</button>
        ))}
      </div>

      {/* Sipariş listesi */}
      {filtreli.length === 0 ? (
        <div className="empty-state">
          <Package size={40} style={{ margin: '0 auto 12px', opacity: .3, display: 'block' }} />
          <p>{entAktif ? 'Sipariş bekleniyor...' : 'Entegrasyonu başlatın'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtreli.map(ps => (
            <SiparisKarti key={ps.id} ps={ps} onOnayla={onayla} onIptal={iptalEt} />
          ))}
        </div>
      )}
    </div>
  )
}
