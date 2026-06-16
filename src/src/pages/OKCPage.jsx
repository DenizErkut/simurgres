import { useState, useEffect, useCallback } from 'react'
import { okcApi, OKC_MARKALAR, okcBaglantiTest, okcRaporAl, okcFisGonder } from '../lib/okc'
import toast from 'react-hot-toast'
import {
  Plus, Edit2, Trash2, Wifi, WifiOff, Star, StarOff,
  ToggleRight, ToggleLeft, CheckCircle, AlertCircle,
  Printer, FileText, Zap, Settings, ChevronDown, ChevronUp
} from 'lucide-react'

const PROTOKOL_RENK = {
  gmp3: '#1D9E75', hugin: '#185FA5', inpos: '#639922',
  pavo: '#534AB7', verifone: '#444441', generic: '#888780'
}

const BAGLANTI_ICON = { tcp: '🌐', usb: '🔌', serial: '📡', wifi: '📶' }

// ─── CİHAZ FORMU ─────────────────────────────────────────────────────────────
function CihazModal({ cihaz, onKaydet, onKapat }) {
  const [form, setForm] = useState(cihaz || {
    ad: '', marka: 'ingenico', model: '', baglanti_tipi: 'tcp',
    protokol: 'gmp3', ip_adresi: '', port: 9001,
    com_port: '', baud_rate: 115200, sicil_no: '', seri_no: '',
    aktif: true, varsayilan: false, ayarlar: {}
  })
  const [yukleniyor, setYukleniyor] = useState(false)
  const [test, setTest] = useState(null)

  const markaInfo = OKC_MARKALAR[form.marka]

  const markaSecildi = (marka) => {
    const info = OKC_MARKALAR[marka]
    setForm(f => ({
      ...f, marka,
      protokol: info.protokol,
      baglanti_tipi: info.baglanti[0],
      port: info.varsayilanPort || 9001,
      model: ''
    }))
    setTest(null)
  }

  const baglantiTest = async () => {
    setYukleniyor(true); setTest(null)
    const sonuc = await okcBaglantiTest(form)
    setTest(sonuc)
    setYukleniyor(false)
  }

  const kaydet = async () => {
    if (!form.ad || !form.marka) { toast.error('Cihaz adı ve marka zorunlu'); return }
    setYukleniyor(true)
    try { await onKaydet(form) } finally { setYukleniyor(false) }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onKapat()}>
      <div className="modal" style={{ width: 560 }}>
        <div className="modal-title">{cihaz ? 'Cihaz Düzenle' : 'Yeni ÖKC/ECR Cihaz'}</div>

        {/* Marka seçimi */}
        <div className="form-row">
          <label>Marka</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {Object.entries(OKC_MARKALAR).map(([key, info]) => (
              <button key={key} onClick={() => markaSecildi(key)}
                style={{
                  padding: '10px 6px', borderRadius: 'var(--radius)',
                  border: form.marka === key ? `2px solid ${PROTOKOL_RENK[info.protokol]}` : '0.5px solid var(--border)',
                  background: form.marka === key ? PROTOKOL_RENK[info.protokol] + '15' : 'transparent',
                  cursor: 'pointer', fontFamily: 'inherit', fontSize: 12,
                  fontWeight: form.marka === key ? 600 : 400,
                  color: form.marka === key ? PROTOKOL_RENK[info.protokol] : 'var(--text2)',
                  textAlign: 'center'
                }}>
                <div style={{ fontSize: 18, marginBottom: 3 }}>{info.logo}</div>
                {info.ad}
              </button>
            ))}
          </div>
        </div>

        {markaInfo && (
          <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>
            {markaInfo.aciklama}
          </div>
        )}

        <div className="form-grid">
          <div className="form-row">
            <label>Cihaz Adı</label>
            <input value={form.ad} onChange={e => setForm(f => ({ ...f, ad: e.target.value }))}
              placeholder={`${markaInfo?.ad || ''} Yazarkasa`} />
          </div>
          <div className="form-row">
            <label>Model</label>
            <select value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))}>
              <option value="">Seçin...</option>
              {markaInfo?.modeller.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {/* Dinamik parametreler */}
        {markaInfo?.parametreler.map(param => {
          if (param.kosul && form.baglanti_tipi !== param.kosul) return null
          return (
            <div key={param.key} className="form-row">
              <label>{param.label} {param.gerekli && <span style={{ color: 'var(--red)' }}>*</span>}</label>
              {param.tip === 'select' ? (
                <select value={form[param.key] || param.varsayilan || ''}
                  onChange={e => setForm(f => ({ ...f, [param.key]: e.target.value }))}>
                  {param.secenekler?.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <input type={param.tip} placeholder={param.placeholder}
                  value={form[param.key] || ''}
                  onChange={e => setForm(f => ({ ...f, [param.key]: param.tip === 'number' ? parseInt(e.target.value) || '' : e.target.value }))} />
              )}
            </div>
          )
        })}

        <div className="form-grid">
          <div className="form-row">
            <label>Sicil No</label>
            <input value={form.sicil_no || ''} placeholder="Yazarkasa sicil no"
              onChange={e => setForm(f => ({ ...f, sicil_no: e.target.value }))} />
          </div>
          <div className="form-row">
            <label>Seri No</label>
            <input value={form.seri_no || ''} placeholder="Cihaz seri no"
              onChange={e => setForm(f => ({ ...f, seri_no: e.target.value }))} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.aktif} onChange={e => setForm(f => ({ ...f, aktif: e.target.checked }))} />
            <span style={{ fontSize: 13 }}>Aktif</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.varsayilan} onChange={e => setForm(f => ({ ...f, varsayilan: e.target.checked }))} />
            <span style={{ fontSize: 13 }}>Varsayılan cihaz</span>
          </label>
        </div>

        {test && (
          <div style={{
            padding: '10px 14px', borderRadius: 'var(--radius)', marginBottom: 12, fontSize: 13,
            background: test.basarili ? 'var(--green-light)' : 'var(--red-light)',
            color: test.basarili ? '#085041' : 'var(--red)',
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            {test.basarili ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
            {test.basarili ? (test.mesaj || 'Bağlantı başarılı!') : (test.hata || 'Bağlanamadı')}
          </div>
        )}

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={baglantiTest} disabled={yukleniyor || !form.ip_adresi}>
            <Wifi size={13} /> Test Et
          </button>
          <button className="btn btn-ghost" onClick={onKapat}>İptal</button>
          <button className="btn btn-primary" onClick={kaydet} disabled={yukleniyor}>
            {yukleniyor ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── CİHAZ KARTI ─────────────────────────────────────────────────────────────
function CihazKarti({ cihaz, onDuzenle, onSil, onVarsayilan, onTest, onRapor }) {
  const [acik, setAcik] = useState(false)
  const [test, setTest] = useState(null)
  const [testYuk, setTestYuk] = useState(false)
  const markaInfo = OKC_MARKALAR[cihaz.marka]
  const protokolRenk = PROTOKOL_RENK[cihaz.protokol] || '#888'

  const cihazTest = async () => {
    setTestYuk(true); setTest(null)
    const sonuc = await okcBaglantiTest(cihaz)
    setTest(sonuc)
    setTestYuk(false)
    toast(sonuc.basarili ? `✓ ${cihaz.ad} bağlantısı başarılı` : `✗ ${cihaz.ad}: ${sonuc.hata}`, {
      icon: sonuc.basarili ? '✅' : '❌'
    })
  }

  return (
    <div className="card" style={{
      padding: 0, overflow: 'hidden',
      borderLeft: `4px solid ${protokolRenk}`,
      opacity: cihaz.aktif ? 1 : 0.5
    }}>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 24 }}>{markaInfo?.logo || '🖨️'}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{cihaz.ad}</span>
            {cihaz.varsayilan && (
              <span style={{ background: '#FAEEDA', color: '#BA7517', padding: '1px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                ⭐ Varsayılan
              </span>
            )}
            {!cihaz.aktif && <span className="badge badge-gray">Pasif</span>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 3, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ color: protokolRenk, fontWeight: 500 }}>{markaInfo?.ad}</span>
            {cihaz.model && <span>{cihaz.model}</span>}
            <span>{BAGLANTI_ICON[cihaz.baglanti_tipi]} {cihaz.baglanti_tipi?.toUpperCase()}</span>
            {cihaz.ip_adresi && <span>📍 {cihaz.ip_adresi}:{cihaz.port}</span>}
            {cihaz.com_port && <span>🔌 {cihaz.com_port}</span>}
          </div>
          {test && (
            <div style={{ fontSize: 11, marginTop: 4, color: test.basarili ? 'var(--green)' : 'var(--red)' }}>
              {test.basarili ? '● Bağlı' : `● ${test.hata}`}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={cihazTest} disabled={testYuk} title="Bağlantı Test">
            {testYuk ? <div className="spinner" style={{ width: 12, height: 12 }} /> : <Wifi size={13} />}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setAcik(a => !a)} title="Detay">
            {acik ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => onDuzenle(cihaz)} title="Düzenle">
            <Edit2 size={13} />
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => onSil(cihaz.id)} title="Sil"
            style={{ color: 'var(--red)' }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {acik && (
        <div style={{ padding: '0 16px 14px', borderTop: '0.5px solid var(--border)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
            {[
              ['Protokol', cihaz.protokol?.toUpperCase()],
              ['Sicil No', cihaz.sicil_no || '—'],
              ['Seri No', cihaz.seri_no || '—'],
            ].map(([l,v]) => (
              <div key={l} style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: '8px 10px' }}>
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>{l}</div>
                <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{v}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {!cihaz.varsayilan && (
              <button className="btn btn-ghost btn-sm" onClick={() => onVarsayilan(cihaz.id)}>
                <Star size={12} /> Varsayılan Yap
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => onRapor(cihaz, 'X')}>
              <FileText size={12} /> X Raporu
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => onRapor(cihaz, 'Z')}>
              <FileText size={12} /> Z Raporu
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => onTest(cihaz)}>
              <Printer size={12} /> Test Fişi
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── ANA SAYFA ────────────────────────────────────────────────────────────────
export default function OKCPage() {
  const [cihazlar, setCihazlar] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)

  const yukle = useCallback(async () => {
    try { setCihazlar(await okcApi.getAll()) }
    catch { toast.error('Cihazlar yüklenemedi') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { yukle() }, [yukle])

  const kaydet = async (form) => {
    try {
      if (modal.cihaz) await okcApi.guncelle(modal.cihaz.id, form)
      else await okcApi.ekle(form)
      toast.success(modal.cihaz ? 'Cihaz güncellendi' : 'Cihaz eklendi')
      setModal(null); yukle()
    } catch (e) { toast.error('Kaydedilemedi: ' + e.message) }
  }

  const sil = async (id) => {
    if (!confirm('Bu cihazı silmek istiyor musunuz?')) return
    await okcApi.sil(id)
    toast.success('Silindi'); yukle()
  }

  const varsayilanYap = async (id) => {
    await okcApi.varsayilanYap(id)
    toast.success('Varsayılan cihaz güncellendi'); yukle()
  }

  const testFisGonder = async (cihaz) => {
    toast('Test fişi gönderiliyor...', { icon: '🖨️' })
    
    const sonuc = await okcFisGonder(cihaz, {
      id: 'test', masa_no: 'TEST', toplam: 10, kdv_tutar: 1, genel_toplam: 11,
      siparis_kalemleri: [{ urun_ad: 'Test Ürün', adet: 1, urun_fiyat: 10 }]
    }, 'Nakit')
    if (sonuc.basarili) toast.success('Test fişi başarıyla gönderildi!')
    else toast.error('Test fişi gönderilemedi: ' + sonuc.hata)
  }

  const rapor = async (cihaz, tip) => {
    toast(`${tip} raporu alınıyor...`, { icon: '📄' })
    const sonuc = await okcRaporAl(cihaz, tip)
    if (sonuc.basarili) toast.success(`${tip} raporu alındı`)
    else toast.error(`Rapor alınamadı: ${sonuc.hata}`)
  }

  const aktifSayisi = cihazlar.filter(c => c.aktif).length
  const varsayilanCihaz = cihazlar.find(c => c.varsayilan)

  if (loading) return <div className="loading-center"><div className="spinner" /></div>

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>ÖKC / ECR Cihaz Yönetimi</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
            {cihazlar.length} cihaz · {aktifSayisi} aktif
            {varsayilanCihaz && <span style={{ marginLeft: 8 }}>· Varsayılan: <strong>{varsayilanCihaz.ad}</strong></span>}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ cihaz: null })}>
          <Plus size={14} /> Cihaz Ekle
        </button>
      </div>

      {/* Desteklenen markalar özeti */}
      <div className="card" style={{ marginBottom: 16, padding: '12px 16px' }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 10 }}>
          Desteklenen ÖKC / ECR Cihazlar
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(OKC_MARKALAR).map(([key, info]) => (
            <div key={key} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 'var(--radius)',
              border: `0.5px solid ${PROTOKOL_RENK[info.protokol]}20`,
              background: PROTOKOL_RENK[info.protokol] + '08'
            }}>
              <span>{info.logo}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: PROTOKOL_RENK[info.protokol] }}>{info.ad}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>{info.modeller.slice(0,2).join(', ')}{info.modeller.length > 2 && '...'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Protokol bilgisi */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { ad: 'GMP3', aciklama: 'Ingenico, Vera', renk: '#1D9E75', icon: '🟧' },
          { ad: 'TCP/IP REST', aciklama: 'InPOS, Pavo, Ödeal', renk: '#534AB7', icon: '🌐' },
          { ad: 'Hugin Protokol', aciklama: 'Hugin serisi', renk: '#185FA5', icon: '🟦' },
          { ad: 'Serial/USB', aciklama: 'Beko, Hugin eski', renk: '#888', icon: '🔌' },
        ].map(p => (
          <div key={p.ad} className="card-sm" style={{ borderLeft: `3px solid ${p.renk}` }}>
            <div style={{ fontSize: 16, marginBottom: 4 }}>{p.icon}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: p.renk }}>{p.ad}</div>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{p.aciklama}</div>
          </div>
        ))}
      </div>

      {/* Cihaz listesi */}
      {cihazlar.length === 0 ? (
        <div className="empty-state">
          <Printer size={40} style={{ margin: '0 auto 12px', opacity: .3, display: 'block' }} />
          <p>Henüz cihaz eklenmemiş</p>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setModal({ cihaz: null })}>
            <Plus size={13} /> İlk Cihazı Ekle
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {cihazlar.map(c => (
            <CihazKarti key={c.id} cihaz={c}
              onDuzenle={c => setModal({ cihaz: c })}
              onSil={sil} onVarsayilan={varsayilanYap}
              onTest={testFisGonder} onRapor={rapor} />
          ))}
        </div>
      )}

      {/* Uyarı notu */}
      <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--amber-light)', borderRadius: 'var(--radius)', fontSize: 12, color: '#633806' }}>
        <strong>⚠️ Önemli Not:</strong> USB ve Serial (RS-232) bağlantılar doğrudan tarayıcıdan erişilemez.
        Bu cihazlar için yerel bir köprü servisi (bridge) kurulması gerekir. TCP/IP (Ethernet/WiFi) bağlantılı cihazlar
        doğrudan bu panel üzerinden kontrol edilebilir. Cihazınızın IP'sini sabitlemeyi unutmayın.
      </div>

      {modal && (
        <CihazModal cihaz={modal.cihaz} onKaydet={kaydet} onKapat={() => setModal(null)} />
      )}
    </div>
  )
}
