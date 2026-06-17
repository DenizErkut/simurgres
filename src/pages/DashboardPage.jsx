import { useState, useEffect, useCallback } from 'react'
import { raporlarApi, raporlarGelismisApi } from '../lib/supabase'
import toast from 'react-hot-toast'
import {
  TrendingUp, ShoppingBag, Receipt, CreditCard, BarChart2,
  Package, FileText, RefreshCw, ChevronDown, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Truck, Star
} from 'lucide-react'

// ─── YARDIMCI ────────────────────────────────────────────────────────────────
const para = (v) => `₺${(v||0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const tarihStr = (d) => new Date(d).toLocaleDateString('tr-TR', { day:'2-digit', month:'2-digit', year:'numeric' })
const saatStr = (d) => new Date(d).toLocaleTimeString('tr-TR', { hour:'2-digit', minute:'2-digit' })

// ─── BAR GRAFİK ──────────────────────────────────────────────────────────────
function BarGrafik({ veri, renk = '#D85A30', yLabel = 'ciro', height = 160 }) {
  const maks = Math.max(...veri.map(v => v[yLabel]), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height, paddingTop: 20, position: 'relative' }}>
      {/* Y ekseni çizgileri */}
      {[0,.25,.5,.75,1].map(p => (
        <div key={p} style={{
          position: 'absolute', left: 0, right: 0, bottom: p * height,
          borderTop: `0.5px solid var(--border)`, fontSize: 9, color: 'var(--text3)',
          paddingLeft: 2, display: 'flex', alignItems: 'center'
        }}>
          {maks > 0 && <span style={{ background: 'var(--surface)', paddingRight: 3, fontSize: 9 }}>
            {p > 0 ? `₺${Math.round(maks * p).toLocaleString('tr-TR')}` : ''}
          </span>}
        </div>
      ))}
      {veri.map((d, i) => {
        const pct = maks ? d[yLabel] / maks : 0
        const barH = Math.max(pct * height, d[yLabel] > 0 ? 3 : 0)
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative' }}>
            {d[yLabel] > 0 && (
              <div style={{ position: 'absolute', bottom: barH + 3, fontSize: 8, color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                {d[yLabel] >= 1000 ? `${(d[yLabel]/1000).toFixed(1)}k` : d[yLabel]}
              </div>
            )}
            <div style={{
              width: '80%', height: barH,
              background: d[yLabel] > 0 ? renk : 'var(--border)',
              borderRadius: '3px 3px 0 0', transition: 'height .3s',
              opacity: d[yLabel] > 0 ? 1 : 0.3,
              minHeight: d[yLabel] > 0 ? 3 : 1
            }} />
          </div>
        )
      })}
    </div>
  )
}

// ─── SEKME BUTONLARI ──────────────────────────────────────────────────────────
function Sekmeler({ aktif, onChange }) {
  const sekmeler = [
    { id: 'bugun',    label: 'Bugün' },
    { id: 'hafta',   label: 'Bu Hafta' },
    { id: 'ay',      label: 'Bu Ay' },
    { id: 'urun',    label: 'Ürün Analizi' },
    { id: 'kategori',label: 'Kategori' },
    { id: 'masa',    label: 'Masa Performans' },
    { id: 'platform',label: 'Platform' },
    { id: 'stok',    label: 'Stok' },
    { id: 'fatura',  label: 'Faturalar' },
    { id: 'garson',  label: 'Garson Raporu' },
    { id: 'log',     label: 'İşlem Logu' },
  ]
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 16 }}>
      {sekmeler.map(s => (
        <button key={s.id} onClick={() => onChange(s.id)}
          className={`pill ${aktif === s.id ? 'active' : ''}`}>
          {s.label}
        </button>
      ))}
    </div>
  )
}

// ─── TARIH SEÇİCİ ────────────────────────────────────────────────────────────
function TarihSec({ baslangic, bitis, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
      <input type="date" value={baslangic} onChange={e => onChange(e.target.value, bitis)}
        style={{ fontSize: 12, padding: '5px 8px' }} />
      <span style={{ fontSize: 12, color: 'var(--text2)' }}>—</span>
      <input type="date" value={bitis} onChange={e => onChange(baslangic, e.target.value)}
        style={{ fontSize: 12, padding: '5px 8px' }} />
    </div>
  )
}

// ─── ÖZET KARTLAR ────────────────────────────────────────────────────────────
function OzetKartlar({ ozet }) {
  if (!ozet) return null
  const kartlar = [
    { label: 'Toplam Ciro', val: para(ozet.toplam), alt: `${ozet.siparisSayisi} sipariş`, icon: TrendingUp, renk: '#1D9E75' },
    { label: 'Ort. Adisyon', val: para(ozet.ort), alt: 'Sipariş başına', icon: Receipt, renk: '#185FA5' },
    { label: 'Nakit', val: para(ozet.nakit), alt: `%${ozet.toplam ? ((ozet.nakit/ozet.toplam)*100).toFixed(0) : 0}`, icon: CreditCard, renk: '#639922' },
    { label: 'Kart', val: para(ozet.kart), alt: `%${ozet.toplam ? ((ozet.kart/ozet.toplam)*100).toFixed(0) : 0}`, icon: CreditCard, renk: '#BA7517' },
    { label: 'Online/Diğer', val: para(ozet.online), alt: `%${ozet.toplam ? ((ozet.online/ozet.toplam)*100).toFixed(0) : 0}`, icon: CreditCard, renk: '#534AB7' },
    { label: 'Platform Cirosu', val: para(ozet.paket), alt: 'YS+Getir+Trendyol+Migros', icon: Truck, renk: '#D85A30' },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: 10, marginBottom: 16 }}>
      {kartlar.map(k => (
        <div key={k.label} className="stat-kart" style={{ borderLeft: `3px solid ${k.renk}` }}>
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <k.icon size={11} color={k.renk} /> {k.label}
          </div>
          <div className="stat-val" style={{ color: k.renk, fontSize: 18 }}>{k.val}</div>
          <div className="stat-sub">{k.alt}</div>
        </div>
      ))}
    </div>
  )
}

// ─── ANA SAYFA ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [sekme, setSekme] = useState('bugun')
  const [loading, setLoading] = useState(false)
  const [ozet, setOzet] = useState(null)
  const [saatlik, setSaatlik] = useState([])
  const [gunluk, setGunluk] = useState([])
  const [topSatan, setTopSatan] = useState([])
  const [kategoriler, setKategoriler] = useState([])
  const [masaPerf, setMasaPerf] = useState([])
  const [platformlar, setPlatformlar] = useState([])
  const [stoklar, setStoklar] = useState([])
  const [faturalar, setFaturalar] = useState(null)
  const [log, setLog] = useState([])
  const [garsonlar, setGarsonlar] = useState([])
  const [seciliGarson, setSeciliGarson] = useState(null)

  // Tarih aralıkları
  const bugun = new Date(); bugun.setHours(0,0,0,0)
  const yarin = new Date(bugun); yarin.setDate(yarin.getDate()+1)
  const haftaBas = new Date(bugun); haftaBas.setDate(haftaBas.getDate() - haftaBas.getDay() + 1)
  const ayBas = new Date(bugun); ayBas.setDate(1)

  const [ozelBas, setOzelBas] = useState(bugun.toISOString().split('T')[0])
  const [ozelBit, setOzelBit] = useState(yarin.toISOString().split('T')[0])

  const tarihAralik = useCallback(() => {
    if (sekme === 'bugun') return [bugun.toISOString(), yarin.toISOString()]
    if (sekme === 'hafta') return [haftaBas.toISOString(), yarin.toISOString()]
    if (sekme === 'ay') return [ayBas.toISOString(), yarin.toISOString()]
    return [`${ozelBas}T00:00:00`, `${ozelBit}T23:59:59`]
  }, [sekme, ozelBas, ozelBit])

  const yukle = useCallback(async () => {
    setLoading(true)
    const [bas, bit] = tarihAralik()
    try {
      const [oz, sat, saat, gun, kat, masa, plat, stok, fat, loglar, gars] = await Promise.all([
        raporlarGelismisApi.araliklarOzet(bas, bit),
        raporlarGelismisApi.topSatanGelismis(bas, bit),
        raporlarGelismisApi.saatlikCiroGelismis(sekme === 'bugun' ? null : undefined),
        raporlarGelismisApi.gunlukTrend(sekme === 'hafta' ? 7 : sekme === 'ay' ? 30 : 14),
        raporlarGelismisApi.kategoriBazliSatis(bas, bit),
        raporlarGelismisApi.masaPerformans(bas, bit),
        raporlarGelismisApi.platformKarsilastirma(bas, bit),
        raporlarGelismisApi.stokDurum(),
        raporlarGelismisApi.faturaOzeti(bas, bit),
        raporlarGelismisApi.siparisLog(bas, bit),
        raporlarGelismisApi.garsonRaporu(bas, bit),
      ])
      setOzet(oz); setTopSatan(sat); setSaatlik(saat); setGunluk(gun)
      setKategoriler(kat); setMasaPerf(masa); setPlatformlar(plat)
      setStoklar(stok); setFaturalar(fat); setLog(loglar)
      setGarsonlar(gars); setSeciliGarson(gars[0] || null)
    } catch (e) { toast.error('Rapor hatası: ' + e.message) }
    finally { setLoading(false) }
  }, [tarihAralik, sekme])

  useEffect(() => { yukle() }, [yukle])

  const baslik = {
    bugun: `${new Date().toLocaleDateString('tr-TR', {day:'numeric',month:'long',year:'numeric'})} Raporu`,
    hafta: 'Bu Hafta Raporu',
    ay: `${new Date().toLocaleDateString('tr-TR', {month:'long',year:'numeric'})} Raporu`,
    urun: 'Ürün Analizi',
    kategori: 'Kategori Bazlı Satış',
    masa: 'Masa Performansı',
    platform: 'Platform Karşılaştırması',
    stok: 'Stok Durumu',
    fatura: 'Fatura Raporu',
    garson: 'Garson Bazlı Rapor',
    log: 'İşlem Logu',
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>{baslik[sekme] || 'Raporlar'}</span>
        <button className="btn btn-ghost btn-sm" onClick={yukle} disabled={loading}>
          <RefreshCw size={13} style={{ animation: loading ? 'spin .6s linear infinite' : 'none' }} />
          {loading ? 'Yükleniyor...' : 'Yenile'}
        </button>
      </div>

      <Sekmeler aktif={sekme} onChange={s => setSekme(s)} />

      {/* Özet kartlar — tüm sekmelerde */}
      {['bugun','hafta','ay','urun','kategori','masa','platform','garson'].includes(sekme) && (
        <OzetKartlar ozet={ozet} />
      )}

      {/* ── BUGÜN SEKMESİ ── */}
      {sekme === 'bugun' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* Saatlik Ciro */}
          <div className="card">
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Saatlik Ciro</div>
            <BarGrafik veri={saatlik} yLabel="ciro" height={150} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              {saatlik.filter((_,i) => i % 3 === 0).map(s => (
                <span key={s.saat} style={{ fontSize: 10, color: 'var(--text3)' }}>{s.saat}:00</span>
              ))}
            </div>
          </div>

          {/* En çok satan */}
          <div className="card">
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>En Çok Satan Ürünler</div>
            {topSatan.map((u, i) => (
              <div key={u.ad} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '0.5px solid var(--border)' }}>
                <span style={{ width: 18, fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>{i+1}</span>
                <span style={{ flex: 1, fontSize: 13 }}>{u.ad}</span>
                <span style={{ fontSize: 12, color: 'var(--text2)', marginRight: 6 }}>{u.adet}x</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{para(u.toplam)}</span>
              </div>
            ))}
            {topSatan.length === 0 && <div style={{ color: 'var(--text3)', fontSize: 13 }}>Veri yok</div>}
          </div>
        </div>
      )}

      {/* ── HAFTA / AY SEKMESİ ── */}
      {['hafta','ay'].includes(sekme) && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          <div className="card">
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>
              Günlük Ciro Trendi
            </div>
            <BarGrafik veri={gunluk} yLabel="ciro" height={160} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              {gunluk.filter((_,i) => sekme === 'hafta' || i % 5 === 0).map(g => (
                <span key={g.tarih} style={{ fontSize: 9, color: 'var(--text3)' }}>
                  {new Date(g.tarih).toLocaleDateString('tr-TR', {day:'numeric',month:'numeric'})}
                </span>
              ))}
            </div>
          </div>

          <div className="card">
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Özet</div>
            {gunluk.map(g => (
              <div key={g.tarih} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '0.5px solid var(--border)', fontSize: 12 }}>
                <span style={{ color: 'var(--text2)' }}>{tarihStr(g.tarih)}</span>
                <span style={{ color: 'var(--text2)', marginRight: 8 }}>{g.siparis} sip.</span>
                <span style={{ fontWeight: 600, color: g.ciro > 0 ? 'var(--accent)' : 'var(--text3)' }}>{para(g.ciro)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ÜRÜN ANALİZİ ── */}
      {sekme === 'urun' && (
        <div className="card">
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Top Ürünler</div>
          {topSatan.length === 0 ? <div style={{ color: 'var(--text3)' }}>Seçilen tarih aralığında veri yok</div> : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 12 }}>#</th>
                  <th>Ürün</th>
                  <th>Adet</th>
                  <th>Ciro</th>
                  <th style={{ paddingRight: 12 }}>Pay %</th>
                </tr>
              </thead>
              <tbody>
                {topSatan.map((u, i) => (
                  <tr key={u.ad}>
                    <td style={{ paddingLeft: 12, color: 'var(--text3)' }}>{i+1}</td>
                    <td style={{ fontWeight: 500 }}>{u.ad}</td>
                    <td>{u.adet}</td>
                    <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{para(u.toplam)}</td>
                    <td style={{ paddingRight: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ height: 6, borderRadius: 3, background: 'var(--accent)', width: ozet?.toplam ? `${Math.min((u.toplam/ozet.toplam)*100,100)}%` : 0, minWidth: 2, maxWidth: 80 }} />
                        <span style={{ fontSize: 11, color: 'var(--text2)' }}>
                          {ozet?.toplam ? ((u.toplam/ozet.toplam)*100).toFixed(1) : 0}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── KATEGORİ ── */}
      {sekme === 'kategori' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="card">
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Kategori Bazlı Satış</div>
            {kategoriler.map(k => (
              <div key={k.ad} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                  <span>{k.emoji} {k.ad}</span>
                  <span style={{ fontWeight: 600 }}>{para(k.toplam)} <span style={{ color: 'var(--text2)', fontWeight: 400 }}>({k.adet} adet)</span></span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: 'var(--surface2)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 4, background: 'var(--accent)',
                    width: ozet?.toplam ? `${Math.min((k.toplam/ozet.toplam)*100, 100)}%` : 0,
                    transition: 'width .5s'
                  }} />
                </div>
              </div>
            ))}
            {kategoriler.length === 0 && <div style={{ color: 'var(--text3)' }}>Veri yok</div>}
          </div>
          <div className="card">
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Pasta Dağılım</div>
            {kategoriler.slice(0,6).map((k,i) => {
              const renkler = ['#D85A30','#1D9E75','#185FA5','#BA7517','#534AB7','#639922']
              return (
                <div key={k.ad} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 2, background: renkler[i], flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12 }}>{k.emoji} {k.ad}</span>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>
                    {ozet?.toplam ? ((k.toplam/ozet.toplam)*100).toFixed(1) : 0}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── MASA PERFORMANS ── */}
      {sekme === 'masa' && (
        <div className="card">
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Masa Performansı</div>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 12 }}>#</th>
                <th>Masa</th>
                <th>Sipariş</th>
                <th>Toplam Ciro</th>
                <th style={{ paddingRight: 12 }}>Ort. Adisyon</th>
              </tr>
            </thead>
            <tbody>
              {masaPerf.map((m, i) => (
                <tr key={m.masaNo}>
                  <td style={{ paddingLeft: 12, color: 'var(--text3)' }}>{i+1}</td>
                  <td style={{ fontWeight: 500 }}>{m.masaNo}</td>
                  <td>{m.siparis}</td>
                  <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{para(m.toplam)}</td>
                  <td style={{ paddingRight: 12 }}>{para(m.ort)}</td>
                </tr>
              ))}
              {masaPerf.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--text3)' }}>Veri yok</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* ── PLATFORM ── */}
      {sekme === 'platform' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {platformlar.length === 0 ? (
            <div className="card" style={{ gridColumn: '1/-1' }}>
              <div style={{ color: 'var(--text3)', textAlign: 'center', padding: 24 }}>Veri yok</div>
            </div>
          ) : platformlar.map(p => {
            const renkler = { yemeksepeti: '#FA0050', getir: '#5d3ebc', trendyol: '#f27a1a', migros: '#e63946' }
            const renk = renkler[p.platform] || 'var(--accent)'
            return (
              <div key={p.platform} className="card" style={{ borderLeft: `4px solid ${renk}` }}>
                <div style={{ fontWeight: 700, fontSize: 14, textTransform: 'capitalize', marginBottom: 10 }}>{p.platform}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: renk }}>{para(p.toplam)}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12 }}>
                  <span style={{ color: 'var(--text2)' }}>{p.siparis} sipariş</span>
                  <span style={{ color: 'var(--green)' }}>{p.teslim} teslim</span>
                  <span style={{ color: 'var(--red)' }}>{p.iptal} iptal</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── STOK ── */}
      {sekme === 'stok' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* Kritik stoklar */}
          <div className="card">
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={14} color="var(--red)" /> Kritik Stok Durumu
            </div>
            {stoklar.filter(s => s.kritik).length === 0 ? (
              <div style={{ color: 'var(--green)', fontSize: 13 }}>✓ Tüm stoklar yeterli</div>
            ) : stoklar.filter(s => s.kritik).map(s => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '0.5px solid var(--border)', fontSize: 13 }}>
                <span style={{ color: 'var(--red)', fontWeight: 500 }}>{s.ad}</span>
                <span>{s.stok_miktari} {s.birim} <span style={{ color: 'var(--text3)' }}>/ min {s.min_stok}</span></span>
              </div>
            ))}
          </div>
          {/* Tüm stoklar */}
          <div className="card">
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>
              Stok Değeri: <span style={{ color: 'var(--accent)' }}>{para(stoklar.reduce((a,s) => a+s.stokDeger, 0))}</span>
            </div>
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {stoklar.map(s => (
                <div key={s.id} style={{ display: 'flex', gap: 8, padding: '5px 0', borderBottom: '0.5px solid var(--border)', fontSize: 12 }}>
                  <span style={{ flex: 1, color: s.kritik ? 'var(--red)' : 'var(--text)' }}>{s.kritik && '⚠️ '}{s.ad}</span>
                  <span style={{ color: 'var(--text2)' }}>{s.stok_miktari} {s.birim}</span>
                  <span style={{ fontWeight: 500 }}>{para(s.stokDeger)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── FATURA ── */}
      {sekme === 'fatura' && faturalar && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
            {[
              { label: 'Toplam Alış', val: para(faturalar.toplam), renk: 'var(--accent)' },
              { label: 'Ödenmemiş', val: para(faturalar.odenmemis), renk: 'var(--red)' },
              { label: 'Fatura Sayısı', val: faturalar.faturalar.length, renk: 'var(--text)' },
            ].map(k => (
              <div key={k.label} className="stat-kart" style={{ borderLeft: `3px solid ${k.renk}` }}>
                <div className="stat-label">{k.label}</div>
                <div className="stat-val" style={{ color: k.renk }}>{k.val}</div>
              </div>
            ))}
          </div>
          <div className="card" style={{ padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 12 }}>Fatura No</th>
                  <th>Tedarikçi</th>
                  <th>Tarih</th>
                  <th>Tutar</th>
                  <th style={{ paddingRight: 12 }}>Durum</th>
                </tr>
              </thead>
              <tbody>
                {faturalar.faturalar.map(f => (
                  <tr key={f.id}>
                    <td style={{ paddingLeft: 12, fontWeight: 500 }}>{f.fatura_no}</td>
                    <td>{f.tedarikci_ad || '—'}</td>
                    <td style={{ fontSize: 12 }}>{tarihStr(f.tarih)}</td>
                    <td style={{ fontWeight: 600 }}>{para(f.genel_toplam)}</td>
                    <td style={{ paddingRight: 12 }}>
                      <span className={`badge ${f.durum === 'odendi' ? 'badge-green' : f.durum === 'kismi' ? 'badge-amber' : 'badge-red'}`}>
                        {f.durum === 'odendi' ? 'Ödendi' : f.durum === 'kismi' ? 'Kısmi' : 'Ödenmedi'}
                      </span>
                    </td>
                  </tr>
                ))}
                {faturalar.faturalar.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--text3)' }}>Fatura yok</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* ── GARSON RAPORU ── */}
      {sekme === 'garson' && (
        <div>
          {garsonlar.length === 0 ? (
            <div className="empty-state">
              <BarChart2 size={36} style={{ margin: '0 auto 10px', opacity: .3, display: 'block' }} />
              <p>Henüz garson bazlı veri yok — siparişlerde garson kaydı tutulmaya başlanmalı</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 12 }}>
              {/* Sol: Garson listesi */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {garsonlar.map(g => (
                  <div key={g.id} onClick={() => setSeciliGarson(g)}
                    className="card-sm" style={{
                      cursor: 'pointer', padding: '12px 14px',
                      border: seciliGarson?.id === g.id ? '2px solid var(--accent)' : '1px solid var(--border)',
                      background: seciliGarson?.id === g.id ? 'var(--accent-light)' : 'var(--surface)'
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: 'var(--accent-light)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 15, fontWeight: 700, color: 'var(--accent)', flexShrink: 0
                      }}>
                        {g.ad === 'İsim Yok' ? '?' : g.ad?.charAt(0)?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.ad}</div>
                        <div style={{ fontSize: 11, color: 'var(--text2)' }}>{g.siparisSayisi} sipariş</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--text3)' }}>Ciro</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>{para(g.toplam)}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 10, color: 'var(--text3)' }}>Ciro Payı</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: g.pay > 30 ? 'var(--green)' : 'var(--text)' }}>%{g.pay}</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 8, height: 4, borderRadius: 2, background: 'var(--surface2)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: 'var(--accent)', width: `${g.pay}%`, borderRadius: 2, transition: 'width .4s' }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Sağ: Seçili garson detayı */}
              {seciliGarson && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Özet kartlar */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                    {[
                      { label: 'Toplam Ciro', val: para(seciliGarson.toplam), renk: 'var(--accent)' },
                      { label: 'Sipariş Sayısı', val: seciliGarson.siparisSayisi, renk: '#185FA5' },
                      { label: 'Ort. Adisyon', val: para(seciliGarson.ort), renk: '#1D9E75' },
                      { label: 'Ciro Payı', val: `%${seciliGarson.pay}`, renk: '#BA7517' },
                    ].map(k => (
                      <div key={k.label} className="stat-kart" style={{ borderLeft: `3px solid ${k.renk}` }}>
                        <div className="stat-label">{k.label}</div>
                        <div className="stat-val" style={{ color: k.renk, fontSize: 18 }}>{k.val}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {/* En çok sattığı ürünler */}
                    <div className="card">
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>
                        En Çok Sattığı Ürünler
                      </div>
                      {seciliGarson.urunler.map((u, i) => (
                        <div key={u.ad} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '0.5px solid var(--border)' }}>
                          <span style={{ width: 18, fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>{i+1}</span>
                          <span style={{ flex: 1, fontSize: 13 }}>{u.ad}</span>
                          <span style={{ fontSize: 12, color: 'var(--text2)', marginRight: 6 }}>{u.adet}x</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{para(u.toplam)}</span>
                        </div>
                      ))}
                      {seciliGarson.urunler.length === 0 && <div style={{ color: 'var(--text3)', fontSize: 12 }}>Veri yok</div>}
                    </div>

                    {/* Kategori dağılımı */}
                    <div className="card">
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>
                        Kategori Dağılımı
                      </div>
                      {seciliGarson.kategoriler.map((k, i) => {
                        const renkler = ['#D85A30','#1D9E75','#185FA5','#BA7517','#534AB7','#639922']
                        const renk = renkler[i % renkler.length]
                        const pay = seciliGarson.toplam ? (k.toplam / seciliGarson.toplam * 100).toFixed(1) : 0
                        return (
                          <div key={k.ad} style={{ marginBottom: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 12 }}>
                              <span>{k.emoji} {k.ad} <span style={{ color: 'var(--text3)' }}>({k.adet} adet)</span></span>
                              <span style={{ fontWeight: 600 }}>{para(k.toplam)} <span style={{ color: 'var(--text3)' }}>%{pay}</span></span>
                            </div>
                            <div style={{ height: 6, borderRadius: 3, background: 'var(--surface2)', overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: 3, background: renk, width: `${pay}%`, transition: 'width .4s' }} />
                            </div>
                          </div>
                        )
                      })}
                      {seciliGarson.kategoriler.length === 0 && <div style={{ color: 'var(--text3)', fontSize: 12 }}>Veri yok</div>}
                    </div>
                  </div>

                  {/* Saat dağılımı */}
                  <div className="card">
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Saatlik Sipariş Dağılımı</div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
                      {seciliGarson.saatDagilim.slice(8, 23).map((adet, i) => {
                        const maks = Math.max(...seciliGarson.saatDagilim, 1)
                        return (
                          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 3 }}>
                            <div style={{
                              width: '80%', height: maks ? (adet/maks)*70 : 0,
                              background: adet > 0 ? 'var(--accent)' : 'var(--border)',
                              borderRadius: '2px 2px 0 0', minHeight: adet > 0 ? 3 : 1
                            }} />
                            <span style={{ fontSize: 9, color: 'var(--text3)' }}>{i+8}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── İŞLEM LOGU ── */}
      {sekme === 'log' && (
        <div>
          <div style={{ marginBottom: 10, fontSize: 12, color: 'var(--text2)' }}>
            Son {log.length} sipariş işlemi
          </div>
          <div className="card" style={{ padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 12 }}>Zaman</th>
                  <th>Masa</th>
                  <th>Tür</th>
                  <th>Tutar</th>
                  <th>Ödeme</th>
                  <th style={{ paddingRight: 12 }}>Durum</th>
                </tr>
              </thead>
              <tbody>
                {log.map(s => (
                  <tr key={s.id}>
                    <td style={{ paddingLeft: 12, fontSize: 11, color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                      {tarihStr(s.created_at)} {saatStr(s.created_at)}
                    </td>
                    <td style={{ fontWeight: 500 }}>{s.masa_no}</td>
                    <td>
                      <span className={`badge ${s.tur === 'paket' ? 'badge-amber' : 'badge-gray'}`} style={{ fontSize: 10 }}>
                        {s.tur === 'paket' ? '📦 Paket' : '🪑 Masa'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{para(s.genel_toplam)}</td>
                    <td style={{ fontSize: 12, color: 'var(--text2)' }}>{s.odeme_yontemi || '—'}</td>
                    <td style={{ paddingRight: 12 }}>
                      <span className={`badge ${s.durum === 'odendi' ? 'badge-green' : s.durum === 'iptal' ? 'badge-red' : 'badge-amber'}`} style={{ fontSize: 10 }}>
                        {s.durum}
                      </span>
                    </td>
                  </tr>
                ))}
                {log.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--text3)' }}>Kayıt yok</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
