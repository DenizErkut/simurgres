import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import {
  Printer, Plus, Edit2, Trash2, Wifi, WifiOff,
  CheckCircle, AlertCircle, Settings, Star,
  ToggleRight, ToggleLeft, Monitor, Usb, Network,
  RefreshCw, FileText, Zap
} from 'lucide-react'

// Bridge URL — her zaman localhost
const BRIDGE_URL = 'http://127.0.0.1:7779'

const YAZICI_TIPLERI = [
  {
    id: 'network',
    label: 'Network (IP)',
    icon: Network,
    aciklama: 'Ethernet veya WiFi bağlı yazıcı. En yaygın yöntem.',
    renk: '#1D9E75',
    parametreler: [
      { key: 'ip', label: 'IP Adresi', tip: 'text', placeholder: '192.168.1.200', gerekli: true },
      { key: 'port', label: 'Port', tip: 'number', placeholder: '9100', varsayilan: 9100 }
    ]
  },
  {
    id: 'usb_windows',
    label: 'USB (Windows Yazıcı)',
    icon: Usb,
    aciklama: 'Windows\'a kurulu USB yazıcı. Paylaşım adı veya tam adı girin.',
    renk: '#185FA5',
    parametreler: [
      { key: 'adres', label: 'Yazıcı Adı', tip: 'text', placeholder: 'EPSON_TM_T88', gerekli: true }
    ]
  },
  {
    id: 'raw_port',
    label: 'USB RAW Port',
    icon: Usb,
    aciklama: 'USB yazıcı COM/LPT port üzerinden. (LPT1, COM3 vb.)',
    renk: '#534AB7',
    parametreler: [
      { key: 'adres', label: 'Port', tip: 'text', placeholder: 'LPT1 veya COM3', gerekli: true }
    ]
  }
]

const ROL_ETIKET = {
  fis: '🧾 Fiş',
  siparis: '🍽️ Sipariş',
  x_raporu: '📊 X Raporu',
  z_raporu: '📈 Z Raporu',
  test: '🔧 Test'
}

// ─── YAZICI FORMU ─────────────────────────────────────────────────────────────
function YaziciModal({ yazici, sistemYazicilari, onKaydet, onKapat }) {
  const [form, setForm] = useState(yazici || {
    ad: '', tip: 'network', ip: '', port: 9100,
    adres: '', aktif: true, varsayilan: false,
    roller: ['fis']
  })

  const tipInfo = YAZICI_TIPLERI.find(t => t.id === form.tip)

  const rolToggle = (rol) => {
    setForm(f => ({
      ...f,
      roller: f.roller?.includes(rol)
        ? f.roller.filter(r => r !== rol)
        : [...(f.roller || []), rol]
    }))
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onKapat()}>
      <div className="modal" style={{ width: 480 }}>
        <div className="modal-title">
          {yazici ? 'Yazıcı Düzenle' : 'Yazıcı Ekle'}
        </div>

        {/* Tip seçimi */}
        <div className="form-row">
          <label>Bağlantı Tipi</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {YAZICI_TIPLERI.map(t => (
              <button key={t.id} onClick={() => setForm(f => ({ ...f, tip: t.id }))}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderRadius: 'var(--radius)',
                  border: form.tip === t.id ? `2px solid ${t.renk}` : '0.5px solid var(--border)',
                  background: form.tip === t.id ? t.renk + '12' : 'transparent',
                  cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left'
                }}>
                <t.icon size={16} color={form.tip === t.id ? t.renk : 'var(--text2)'} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: form.tip === t.id ? 600 : 400, color: form.tip === t.id ? t.renk : 'var(--text)' }}>
                    {t.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>{t.aciklama}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="form-row">
          <label>Yazıcı Adı</label>
          <input value={form.ad} onChange={e => setForm(f => ({ ...f, ad: e.target.value }))}
            placeholder="Fiş Yazıcısı, Mutfak Yazıcısı..." />
        </div>

        {/* Dinamik parametreler */}
        {tipInfo?.parametreler.map(p => (
          <div key={p.key} className="form-row">
            <label>{p.label}</label>
            {p.key === 'adres' && sistemYazicilari.length > 0 ? (
              <select value={form[p.key] || ''} onChange={e => setForm(f => ({ ...f, [p.key]: e.target.value }))}>
                <option value="">Elle girin...</option>
                {sistemYazicilari.map(y => <option key={y.ad} value={y.ad}>{y.ad} ({y.port})</option>)}
              </select>
            ) : (
              <input type={p.tip || 'text'} placeholder={p.placeholder}
                value={form[p.key] || p.varsayilan || ''}
                onChange={e => setForm(f => ({ ...f, [p.key]: p.tip === 'number' ? parseInt(e.target.value) || '' : e.target.value }))} />
            )}
          </div>
        ))}

        {/* Roller */}
        <div className="form-row">
          <label>Bu yazıcının görevleri</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Object.entries(ROL_ETIKET).map(([rol, etiket]) => (
              <button key={rol} onClick={() => rolToggle(rol)}
                className={`pill ${form.roller?.includes(rol) ? 'active' : ''}`}>
                {etiket}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 20, marginBottom: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={form.aktif} onChange={e => setForm(f => ({ ...f, aktif: e.target.checked }))} />
            Aktif
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={form.varsayilan} onChange={e => setForm(f => ({ ...f, varsayilan: e.target.checked }))} />
            Varsayılan (rol eşleşmezse kullan)
          </label>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onKapat}>İptal</button>
          <button className="btn btn-primary" onClick={() => onKaydet(form)}>Kaydet</button>
        </div>
      </div>
    </div>
  )
}

// ─── ANA SAYFA ────────────────────────────────────────────────────────────────
export default function YaziciPage() {
  const [bridgeDurum, setBridgeDurum] = useState(null)
  const [yazicilar, setYazicilar] = useState([])
  const [sistemYazicilari, setSistemYazicilari] = useState([])
  const [kuyruk, setKuyruk] = useState([])
  const [modal, setModal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [supabaseAyar, setSupabaseAyar] = useState({ url: '', key: '' })
  const [ayarAcik, setAyarAcik] = useState(false)

  const bridgeKontrol = useCallback(async () => {
    try {
      const res = await fetch(`${BRIDGE_URL}/api/durum`, { signal: AbortSignal.timeout(2000) })
      const data = await res.json()
      setBridgeDurum(data)
      return true
    } catch {
      setBridgeDurum(null)
      return false
    }
  }, [])

  const yazicilariYukle = useCallback(async () => {
    try {
      const res = await fetch(`${BRIDGE_URL}/api/yazicilar`, { signal: AbortSignal.timeout(3000) })
      const data = await res.json()
      setYazicilar(data)
    } catch { setYazicilar([]) }
  }, [])

  const sistemYazicilariniYukle = useCallback(async () => {
    try {
      const res = await fetch(`${BRIDGE_URL}/api/sistem-yazicilari`, { signal: AbortSignal.timeout(3000) })
      const data = await res.json()
      setSistemYazicilari(data.yazicilar || [])
    } catch { setSistemYazicilari([]) }
  }, [])

  const kuyrukYukle = useCallback(async () => {
    const { data } = await supabase.from('yazici_kuyruk')
      .select('*').order('created_at', { ascending: false }).limit(20)
    setKuyruk(data || [])
  }, [])

  const yukle = useCallback(async () => {
    await bridgeKontrol()
    await yazicilariYukle()
    await sistemYazicilariniYukle()
    await kuyrukYukle()
    setLoading(false)
  }, [bridgeKontrol, yazicilariYukle, sistemYazicilariniYukle, kuyrukYukle])

  useEffect(() => {
    yukle()
    const interval = setInterval(bridgeKontrol, 10000)
    // Kuyruk realtime
    const sub = supabase.channel('yazici-kuyruk-ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'yazici_kuyruk' }, kuyrukYukle)
      .subscribe()
    return () => { clearInterval(interval); supabase.removeChannel(sub) }
  }, [yukle, bridgeKontrol, kuyrukYukle])

  const yaziciKaydet = async (form) => {
    try {
      if (modal.yazici) {
        await fetch(`${BRIDGE_URL}/api/yazicilar/${modal.yazici.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        })
        toast.success('Yazıcı güncellendi')
      } else {
        await fetch(`${BRIDGE_URL}/api/yazicilar`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        })
        toast.success('Yazıcı eklendi')
      }
      setModal(null)
      yazicilariYukle()
    } catch { toast.error('Bridge servisine bağlanılamadı') }
  }

  const yaziciSil = async (id) => {
    if (!confirm('Yazıcıyı silmek istiyor musunuz?')) return
    await fetch(`${BRIDGE_URL}/api/yazicilar/${id}`, { method: 'DELETE' })
    toast.success('Silindi')
    yazicilariYukle()
  }

  const testFisGonder = async (yazici) => {
    try {
      const res = await fetch(`${BRIDGE_URL}/api/yazicilar/${yazici.id}/test`, { method: 'POST' })
      const data = await res.json()
      if (data.ok) toast.success('Test fişi gönderildi!')
      else toast.error('Hata: ' + data.hata)
    } catch { toast.error('Bridge servisine bağlanılamadı') }
  }

  const supabaseAyarKaydet = async () => {
    try {
      await fetch(`${BRIDGE_URL}/api/ayarlar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supabase_url: supabaseAyar.url, supabase_key: supabaseAyar.key })
      })
      toast.success('Ayarlar kaydedildi, bridge yeniden bağlandı')
      setAyarAcik(false)
      setTimeout(bridgeKontrol, 2000)
    } catch { toast.error('Bridge servisine bağlanılamadı') }
  }

  // Supabase'den yazdır
  const supabasedenYazdir = async (tur, veri) => {
    await supabase.from('yazici_kuyruk').insert({ tur, veri, durum: 'bekliyor' })
    toast.success('Yazdırma kuyruğuna eklendi')
    kuyrukYukle()
  }

  if (loading) return <div className="loading-center"><div className="spinner" /></div>

  return (
    <div>
      {/* Bridge Durum Banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', borderRadius: 'var(--radius-lg)', marginBottom: 16,
        background: bridgeDurum ? 'var(--green-light)' : 'var(--red-light)',
        border: `1px solid ${bridgeDurum ? 'var(--green)' : 'var(--red)'}`
      }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: bridgeDurum ? 'var(--green)' : 'var(--red)', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          {bridgeDurum ? (
            <div>
              <span style={{ fontWeight: 600, color: '#085041' }}>Bridge Servisi Aktif</span>
              <span style={{ fontSize: 12, color: '#1D9E75', marginLeft: 10 }}>
                {bridgeDurum.aktif_yazicilar}/{bridgeDurum.yazici_sayisi} yazıcı · localhost:7779
              </span>
            </div>
          ) : (
            <div>
              <span style={{ fontWeight: 600, color: 'var(--red)' }}>Bridge Servisi Çalışmıyor</span>
              <span style={{ fontSize: 12, color: 'var(--red)', marginLeft: 10 }}>
                Bilgisayarda bridge servisini başlatın
              </span>
            </div>
          )}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={yukle}><RefreshCw size={13} /></button>
        <button className="btn btn-ghost btn-sm" onClick={() => setAyarAcik(a => !a)}>
          <Settings size={13} /> Supabase Ayarı
        </button>
      </div>

      {/* Supabase ayar paneli */}
      {ayarAcik && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Bridge → Supabase Bağlantısı</div>
          <div className="form-row">
            <label>Supabase URL</label>
            <input value={supabaseAyar.url} onChange={e => setSupabaseAyar(s => ({ ...s, url: e.target.value }))}
              placeholder="https://xxx.supabase.co" />
          </div>
          <div className="form-row">
            <label>Anon Key</label>
            <input type="password" value={supabaseAyar.key} onChange={e => setSupabaseAyar(s => ({ ...s, key: e.target.value }))}
              placeholder="eyJ..." />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={supabaseAyarKaydet}>Kaydet</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setAyarAcik(false)}>İptal</button>
          </div>
        </div>
      )}

      {!bridgeDurum && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid var(--amber)' }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10, color: 'var(--amber)' }}>
            🖨️ Bridge Servisini Nasıl Başlatırsınız?
          </div>
          <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 2 }}>
            1. <code style={{ background: 'var(--surface2)', padding: '1px 6px', borderRadius: 4 }}>simurgres-bridge.zip</code> dosyasını indirin ve bir klasöre çıkartın<br/>
            2. <code style={{ background: 'var(--surface2)', padding: '1px 6px', borderRadius: 4 }}>config.json</code> dosyasını Supabase bilgilerinizle düzenleyin<br/>
            3. Klasörde terminali açıp çalıştırın:
          </div>
          <div style={{ background: '#1a1a1a', color: '#5DCAA5', padding: '10px 14px', borderRadius: 'var(--radius)', fontFamily: 'monospace', fontSize: 12, marginTop: 8 }}>
            npm install<br/>
            npm start<br/>
            <span style={{ color: '#888' }}># veya Windows servisi olarak:</span><br/>
            node install-service.js
          </div>
        </div>
      )}

      {/* Yazıcı listesi */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>Yazıcılar ({yazicilar.length})</div>
        <button className="btn btn-primary btn-sm" onClick={() => setModal({ yazici: null })}
          disabled={!bridgeDurum}>
          <Plus size={13} /> Yazıcı Ekle
        </button>
      </div>

      {yazicilar.length === 0 ? (
        <div className="empty-state" style={{ marginBottom: 16 }}>
          <Printer size={36} style={{ margin: '0 auto 10px', opacity: .3, display: 'block' }} />
          <p>{bridgeDurum ? 'Henüz yazıcı eklenmemiş' : 'Bridge servisi çalışmıyor'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {yazicilar.map(y => {
            const tipInfo = YAZICI_TIPLERI.find(t => t.id === y.tip)
            return (
              <div key={y.id} className="card-sm" style={{
                display: 'flex', alignItems: 'center', gap: 12,
                borderLeft: `3px solid ${y.aktif ? tipInfo?.renk || 'var(--green)' : 'var(--border)'}`,
                opacity: y.aktif ? 1 : .5
              }}>
                {tipInfo && <tipInfo.icon size={18} color={tipInfo.renk} />}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{y.ad}</span>
                    {y.varsayilan && <span style={{ background: 'var(--amber-light)', color: 'var(--amber)', padding: '1px 7px', borderRadius: 10, fontSize: 10, fontWeight: 600 }}>Varsayılan</span>}
                    {!y.aktif && <span className="badge badge-gray" style={{ fontSize: 10 }}>Pasif</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2, display: 'flex', gap: 8 }}>
                    <span>{tipInfo?.label}</span>
                    {y.ip && <span>📍 {y.ip}:{y.port}</span>}
                    {y.adres && <span>🔌 {y.adres}</span>}
                    <span>{(y.roller || []).map(r => ROL_ETIKET[r]).join(' · ')}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => testFisGonder(y)} title="Test Fişi">
                    <Zap size={12} />
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setModal({ yazici: y })}>
                    <Edit2 size={12} />
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => yaziciSil(y.id)} style={{ color: 'var(--red)' }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Yazdırma Kuyruğu */}
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>
        Son Yazdırma İşlemleri
        <button className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }} onClick={kuyrukYukle}>
          <RefreshCw size={12} />
        </button>
      </div>

      {kuyruk.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center', padding: 24 }}>Henüz işlem yok</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 16 }}>Tür</th>
                <th>Durum</th>
                <th>Zaman</th>
                <th style={{ paddingRight: 16 }}>Hata</th>
              </tr>
            </thead>
            <tbody>
              {kuyruk.map(k => (
                <tr key={k.id}>
                  <td style={{ paddingLeft: 16 }}>{ROL_ETIKET[k.tur] || k.tur}</td>
                  <td>
                    <span className={`badge ${
                      k.durum === 'tamamlandi' ? 'badge-green' :
                      k.durum === 'hata' ? 'badge-red' :
                      k.durum === 'bekliyor' ? 'badge-amber' : 'badge-gray'
                    }`}>
                      {k.durum === 'tamamlandi' ? '✓ Tamamlandı' :
                       k.durum === 'hata' ? '✗ Hata' :
                       k.durum === 'bekliyor' ? '⏳ Bekliyor' : k.durum}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text2)' }}>
                    {new Date(k.created_at).toLocaleTimeString('tr-TR')}
                  </td>
                  <td style={{ paddingRight: 16, fontSize: 12, color: 'var(--red)' }}>
                    {k.hata_mesaji || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <YaziciModal
          yazici={modal.yazici}
          sistemYazicilari={sistemYazicilari}
          onKaydet={yaziciKaydet}
          onKapat={() => setModal(null)}
        />
      )}
    </div>
  )
}
