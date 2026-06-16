import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import {
  tySiparisiIslemAl, tySiparisiHazirla,
  tySiparisiTedarikEdememe, tySiparisleriSenkronize
} from '../lib/trendyol'
import toast from 'react-hot-toast'
import {
  Settings, Wifi, WifiOff, RefreshCw, Check, X,
  Package, Clock, ChevronDown, ChevronUp,
  CheckCircle, AlertCircle, RotateCcw, Truck
} from 'lucide-react'

const DURUM_RENK = {
  RECEIVED:         { label: 'Yeni',       bg: '#E1F5EE', text: '#085041', border: '#1D9E75' },
  READY_FOR_PICKUP: { label: 'İşlemde',    bg: '#FAEEDA', text: '#633806', border: '#BA7517' },
  DISPATCHED:       { label: 'Kargoda',    bg: '#E6F1FB', text: '#0C447C', border: '#185FA5' },
  DELIVERED:        { label: 'Teslim',     bg: '#EAF3DE', text: '#27500A', border: '#639922' },
  CANCELLED:        { label: 'İptal',      bg: '#FCEBEB', text: '#791F1F', border: '#E24B4A' },
}

// ─── AYARLAR ──────────────────────────────────────────────────────────────────
function AyarlarPanel({ ayarlar, onKaydet }) {
  const [form, setForm] = useState(ayarlar)
  const [test, setTest] = useState(null)
  const [testYuk, setTestYuk] = useState(false)

  const baglantiTest = async () => {
    setTestYuk(true); setTest(null)
    try {
      const { yeni, toplam } = await tySiparisleriSenkronize()
      setTest({ ok: true, mesaj: `Bağlantı başarılı! ${toplam} sipariş kontrol edildi, ${yeni} yeni.` })
    } catch (e) {
      setTest({ ok: false, mesaj: e.message })
    } finally { setTestYuk(false) }
  }

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Settings size={15} /> API Bağlantı Ayarları
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div className="form-row">
          <label>Seller ID (Satıcı No)</label>
          <input value={form.seller_id || ''} placeholder="Örn: 123456"
            onChange={e => setForm(f => ({ ...f, seller_id: e.target.value }))} />
        </div>
        <div className="form-row" style={{ gridColumn: '1/-1' }}>
          <label>API Key</label>
          <input value={form.api_key || ''} type="password" placeholder="Hesap Bilgilerim → Entegrasyon Bilgileri"
            onChange={e => setForm(f => ({ ...f, api_key: e.target.value }))} />
        </div>
        <div className="form-row" style={{ gridColumn: '1/-1' }}>
          <label>API Secret Key</label>
          <input value={form.api_secret || ''} type="password" placeholder="••••••••"
            onChange={e => setForm(f => ({ ...f, api_secret: e.target.value }))} />
        </div>
      </div>

      <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: '12px 14px', fontSize: 12, marginBottom: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Nereden Alınır?</div>
        <div style={{ color: 'var(--text2)', lineHeight: 2 }}>
          Trendyol Satıcı Paneli → <strong>Hesabım → Hesap Bilgilerim → Entegrasyon Bilgileri</strong><br/>
          ⚠️ Bilgilere yalnızca <strong>master user (admin rolü)</strong> ile giriş yapınca erişilebilir.<br/>
          <br/>
          <strong>Çalışma prensibi:</strong> Sistem her {' '}
          <strong>60 saniyede bir</strong> Trendyol API'sini sorgular ve yeni Created siparişleri çeker (polling).
        </div>
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
        <button className="btn btn-ghost" onClick={baglantiTest} disabled={testYuk}>
          <Wifi size={13} /> {testYuk ? 'Bağlanıyor...' : 'Test Et & Senkronize Et'}
        </button>
        <button className="btn btn-primary" onClick={() => onKaydet(form)}>Kaydet</button>
      </div>
    </div>
  )
}

// ─── SİPARİŞ KARTI ───────────────────────────────────────────────────────────
function SiparisKarti({ ps, onIslemAl, onHazirla, onIptal }) {
  const [acik, setAcik] = useState(true)
  const durum = DURUM_RENK[ps.durum] || DURUM_RENK.RECEIVED
  const pkg = ps.ham_veri || {}
  const lines = pkg.lines || []
  const sure = Math.floor((Date.now() - new Date(ps.created_at).getTime()) / 60000)

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', borderLeft: `4px solid ${durum.border}` }}>
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
        onClick={() => setAcik(a => !a)}>
        <div style={{ background: durum.bg, color: durum.text, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
          {durum.label}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>
            #{ps.platform_order_code}
            <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 8 }}>Paket: {ps.platform_order_id}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>
            {ps.musteri_ad} · ₺{ps.siparis_tutari?.toFixed(2)} · {sure} dk önce
            {pkg.cargoProviderName && ` · ${pkg.cargoProviderName}`}
          </div>
        </div>
        {acik ? <ChevronUp size={14} color="var(--text2)" /> : <ChevronDown size={14} color="var(--text2)" />}
      </div>

      {acik && (
        <div style={{ padding: '0 16px 14px', borderTop: '0.5px solid var(--border)' }}>
          {/* Müşteri & teslimat */}
          {(ps.musteri_ad || ps.teslimat_adresi) && (
            <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: '8px 12px', marginTop: 10, fontSize: 12 }}>
              {ps.musteri_ad && <div><strong>Müşteri:</strong> {ps.musteri_ad}</div>}
              {ps.teslimat_adresi && <div style={{ color: 'var(--text2)', marginTop: 2 }}><strong>Adres:</strong> {ps.teslimat_adresi}</div>}
              {pkg.cargoTrackingNumber && (
                <div style={{ marginTop: 2 }}>
                  <strong>Kargo Takip:</strong>
                  <a href={pkg.cargoTrackingLink} target="_blank" rel="noreferrer"
                    style={{ color: 'var(--accent)', marginLeft: 4 }}>
                    {pkg.cargoTrackingNumber}
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Ürünler */}
          <div style={{ marginTop: 10 }}>
            {lines.map((line, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '0.5px solid var(--border)', fontSize: 13 }}>
                <span style={{ flex: 1, paddingRight: 8 }}>
                  {line.productName?.substring(0, 60)}
                  {line.productName?.length > 60 && '...'}
                  <span style={{ color: 'var(--text2)', fontSize: 11 }}> x{line.quantity}</span>
                </span>
                <span style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                  ₺{((line.lineUnitPrice || 0) * (line.quantity || 1)).toFixed(2)}
                </span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontWeight: 700, fontSize: 14, color: '#f27a1a' }}>
              <span>Toplam</span>
              <span>₺{ps.siparis_tutari?.toFixed(2)}</span>
            </div>
          </div>

          {/* Aksiyonlar */}
          {ps.durum === 'RECEIVED' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn btn-success btn-sm" style={{ flex: 1 }} onClick={() => onIslemAl(ps)}>
                <Check size={13} /> İşleme Al (Picking)
              </button>
              <button className="btn btn-sm" onClick={() => onIptal(ps)}
                style={{ border: '1px solid var(--red)', color: 'var(--red)', background: 'var(--red-light)' }}>
                <X size={13} /> Tedarik Edilemedi
              </button>
            </div>
          )}
          {ps.durum === 'READY_FOR_PICKUP' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <div style={{ flex: 1, padding: '8px 12px', background: 'var(--amber-light)', borderRadius: 'var(--radius)', fontSize: 12, color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={13} /> Hazırlanıyor...
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => onHazirla(ps)}>
                <Truck size={13} /> Kargoya Ver
              </button>
            </div>
          )}
          {ps.durum === 'DISPATCHED' && (
            <div style={{ marginTop: 10, padding: '8px 12px', background: '#E6F1FB', borderRadius: 'var(--radius)', fontSize: 12, color: '#0C447C', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Truck size={13} /> Kargoya verildi — teslim bekleniyor
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── ANA SAYFA ────────────────────────────────────────────────────────────────
export default function TrendyolPage() {
  const [ayarlar, setAyarlar] = useState({})
  const [entAktif, setEntAktif] = useState(false)
  const [siparisler, setSiparisler] = useState([])
  const [loading, setLoading] = useState(true)
  const [senkronize, setSenkronize] = useState(false)
  const [ayarlarAcik, setAyarlarAcik] = useState(false)
  const [filtre, setFiltre] = useState('aktif')
  const [sonSenkron, setSonSenkron] = useState(null)
  const pollingRef = useRef(null)

  const yukle = useCallback(async () => {
    const { data: ent } = await supabase.from('entegrasyon_ayarlari')
      .select('*').eq('platform', 'trendyol').single()
    if (ent) { setAyarlar(ent.ayarlar || {}); setEntAktif(ent.aktif) }

    const { data: ps } = await supabase.from('platform_siparisler')
      .select('*').eq('platform', 'trendyol')
      .order('created_at', { ascending: false }).limit(200)
    setSiparisler(ps || [])
    setLoading(false)
  }, [])

  const senkronizeEt = useCallback(async (sessiz = false) => {
    if (!sessiz) setSenkronize(true)
    try {
      const { yeni, toplam } = await tySiparisleriSenkronize()
      setSonSenkron(new Date())
      if (yeni > 0) {
        toast.success(`${yeni} yeni Trendyol siparişi`)
        yukle()
      }
    } catch (e) {
      if (!sessiz) toast.error('Senkronizasyon hatası: ' + e.message)
    } finally {
      if (!sessiz) setSenkronize(false)
    }
  }, [yukle])

  useEffect(() => {
    yukle()
    const sub = supabase.channel('ty-siparisler')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_siparisler',
        filter: 'platform=eq.trendyol' }, yukle)
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [yukle])

  // Polling — her 60 saniyede senkronize et
  useEffect(() => {
    if (entAktif) {
      pollingRef.current = setInterval(() => senkronizeEt(true), 60000)
    }
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [entAktif, senkronizeEt])

  const ayarlariKaydet = async (form) => {
    await supabase.from('entegrasyon_ayarlari').upsert(
      { platform: 'trendyol', ayarlar: form, aktif: entAktif },
      { onConflict: 'platform' }
    )
    setAyarlar(form)
    toast.success('Ayarlar kaydedildi')
  }

  const entegrasyonToggle = async () => {
    const yeni = !entAktif
    await supabase.from('entegrasyon_ayarlari').update({ aktif: yeni }).eq('platform', 'trendyol')
    setEntAktif(yeni)
    toast.success(yeni ? 'Trendyol entegrasyonu aktif — polling başladı' : 'Trendyol entegrasyonu durduruldu')
  }

  const islemAl = async (ps) => {
    try {
      const lines = (ps.ham_veri?.lines || []).map(l => ({ lineId: l.lineId, quantity: l.quantity }))
      await tySiparisiIslemAl(ps.platform_order_id, lines)
      await supabase.from('platform_siparisler').update({ durum: 'READY_FOR_PICKUP' }).eq('id', ps.id)
      toast.success(`#${ps.platform_order_code} işleme alındı`)
      yukle()
    } catch (e) { toast.error(e.message) }
  }

  const hazirla = async (ps) => {
    try {
      const lines = (ps.ham_veri?.lines || []).map(l => ({ lineId: l.lineId, quantity: l.quantity }))
      await tySiparisiHazirla(ps.platform_order_id, lines)
      await supabase.from('platform_siparisler').update({ durum: 'DISPATCHED' }).eq('id', ps.id)
      toast.success(`#${ps.platform_order_code} kargoya verildi`)
      yukle()
    } catch (e) { toast.error(e.message) }
  }

  const iptalEt = async (ps) => {
    try {
      const lines = (ps.ham_veri?.lines || []).map(l => ({ lineId: l.lineId, quantity: l.quantity }))
      await tySiparisiTedarikEdememe(ps.platform_order_id, lines)
      await supabase.from('platform_siparisler').update({ durum: 'CANCELLED' }).eq('id', ps.id)
      toast.success(`#${ps.platform_order_code} tedarik edilemedi bildirimi gönderildi`)
      yukle()
    } catch (e) { toast.error(e.message) }
  }

  const bekleyen = siparisler.filter(s => s.durum === 'RECEIVED').length

  const filtreli = siparisler.filter(ps => {
    if (filtre === 'aktif') return ['RECEIVED', 'READY_FOR_PICKUP', 'DISPATCHED'].includes(ps.durum)
    if (filtre === 'teslim') return ps.durum === 'DELIVERED'
    if (filtre === 'iptal') return ps.durum === 'CANCELLED'
    return true
  })

  if (loading) return <div className="loading-center"><div className="spinner" /></div>

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f27a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
          🛒
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Trendyol Entegrasyonu</div>
          <div style={{ fontSize: 12, marginTop: 1 }}>
            <span style={{ color: entAktif ? 'var(--green)' : 'var(--text3)' }}>
              {entAktif ? '● Aktif — Polling açık' : '○ Pasif'}
            </span>
            {sonSenkron && (
              <span style={{ color: 'var(--text3)', marginLeft: 8 }}>
                Son: {sonSenkron.toLocaleTimeString('tr-TR')}
              </span>
            )}
            {bekleyen > 0 && (
              <span style={{ marginLeft: 8, background: '#f27a1a', color: '#fff', padding: '1px 7px', borderRadius: 10, fontSize: 11 }}>
                {bekleyen} yeni
              </span>
            )}
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setAyarlarAcik(a => !a)}>
          <Settings size={13} /> Ayarlar
        </button>
        <button className={`btn btn-sm ${entAktif ? 'btn-ghost' : 'btn-success'}`} onClick={entegrasyonToggle}>
          {entAktif ? <><WifiOff size={12} /> Durdur</> : <><Wifi size={12} /> Başlat</>}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => senkronizeEt(false)} disabled={senkronize}>
          <RefreshCw size={13} style={{ animation: senkronize ? 'spin .6s linear infinite' : 'none' }} />
          {senkronize ? 'Çekiyor...' : 'Şimdi Çek'}
        </button>
      </div>

      {ayarlarAcik && <AyarlarPanel ayarlar={ayarlar} onKaydet={ayarlariKaydet} />}

      {/* İstatistikler */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Bugün Toplam', val: siparisler.filter(s => new Date(s.created_at).toDateString() === new Date().toDateString()).length, renk: '#f27a1a' },
          { label: 'Bekleyen', val: bekleyen, renk: 'var(--amber)' },
          { label: 'İşlemde / Kargoda', val: siparisler.filter(s => ['READY_FOR_PICKUP','DISPATCHED'].includes(s.durum)).length, renk: 'var(--green)' },
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
        {[['aktif','Aktif'],['teslim','Teslim Edildi'],['iptal','İptal'],['tumu','Tümü']].map(([id,label]) => (
          <button key={id} className={`pill ${filtre === id ? 'active' : ''}`} onClick={() => setFiltre(id)}>{label}</button>
        ))}
      </div>

      {filtreli.length === 0 ? (
        <div className="empty-state">
          <Package size={40} style={{ margin: '0 auto 12px', opacity: .3, display: 'block' }} />
          <p>{entAktif ? 'Sipariş bekleniyor...' : 'Entegrasyonu başlatın'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtreli.map(ps => (
            <SiparisKarti key={ps.id} ps={ps}
              onIslemAl={islemAl} onHazirla={hazirla} onIptal={iptalEt} />
          ))}
        </div>
      )}
    </div>
  )
}
