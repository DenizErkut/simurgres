import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { raporlarGelismisApi } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { FileText, Printer, Lock, CheckCircle, Clock, TrendingUp, CreditCard, Banknote, Smartphone, AlertTriangle } from 'lucide-react'

const para = (v) => `${(v||0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`
const simdi = () => new Date().toLocaleString('tr-TR')
const bugunStr = () => new Date().toISOString().split('T')[0]

export default function ZRaporuPage() {
  const { kullanici } = useAuth()
  const [ozet, setOzet] = useState(null)
  const [topSatan, setTopSatan] = useState([])
  const [kategoriSatis, setKategoriSatis] = useState([])
  const [acikMasalar, setAcikMasalar] = useState([])
  const [zLog, setZLog] = useState([])
  const [loading, setLoading] = useState(true)
  const [kapatiliyor, setKapatiliyor] = useState(false)
  const [kasaAcik, setKasaAcik] = useState(true)

  const yukle = useCallback(async () => {
    setLoading(true)
    const bugun = new Date(); bugun.setHours(0,0,0,0)
    const yarin = new Date(bugun); yarin.setDate(yarin.getDate()+1)

    const [oz, top, kat, acik, log] = await Promise.all([
      raporlarGelismisApi.araliklarOzet(bugun.toISOString(), yarin.toISOString()),
      raporlarGelismisApi.topSatanGelismis(bugun.toISOString(), yarin.toISOString(), 20),
      raporlarGelismisApi.kategoriBazliSatis(bugun.toISOString(), yarin.toISOString()),
      supabase.from('siparisler').select('masa_no, genel_toplam').eq('durum', 'acik'),
      supabase.from('z_raporu_log').select('*').order('created_at', { ascending: false }).limit(10)
    ])

    setOzet(oz)
    setTopSatan(top)
    setKategoriSatis(kat)
    setAcikMasalar(acik.data || [])
    setZLog(log.data || [])

    // Bugün kasa açık mı?
    const { data: kasaKaydi } = await supabase.from('kasa_ozetleri')
      .select('durum').eq('tarih', bugunStr()).single()
    setKasaAcik(kasaKaydi?.durum !== 'kapali')
    setLoading(false)
  }, [])

  useEffect(() => { yukle() }, [yukle])

  // Z Raporu PDF oluştur
  const zRaporuPDFOlustur = (oz, topSat, katSat, raporNo, kapatan) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const W = 210, sayfa_y = { y: 0 }

    // ── HEADER ──
    doc.setFillColor(44, 44, 40)
    doc.rect(0, 0, W, 30, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18); doc.setFont('helvetica', 'bold')
    doc.text('SimurgRes', 14, 13)
    doc.setFontSize(10); doc.setFont('helvetica', 'normal')
    doc.text('Z RAPORU - GUN SONU OZETI', 14, 21)
    doc.text(`No: Z-${String(raporNo).padStart(4,'0')}`, W - 14, 13, { align: 'right' })
    doc.text(simdi(), W - 14, 21, { align: 'right' })

    let y = 38

    // ── UYARI: Açık masa varsa ──
    if (acikMasalar.length > 0) {
      doc.setFillColor(254, 243, 199)
      doc.roundedRect(14, y, W - 28, 12, 2, 2, 'F')
      doc.setTextColor(146, 64, 14)
      doc.setFontSize(9); doc.setFont('helvetica', 'bold')
      doc.text(`UYARI: ${acikMasalar.length} acik masa hesabi kapanmadan Z raporu alindi!`, 18, y + 7)
      y += 16
    }

    // ── ÖZET KUTUSU ──
    doc.setFillColor(216, 90, 48)
    doc.roundedRect(14, y, W - 28, 8, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10); doc.setFont('helvetica', 'bold')
    doc.text('KASA OZETI', 18, y + 5.5)
    y += 12

    const ozetSatirlar = [
      ['BRUT CIRO (KDV Dahil)', para(oz.toplam)],
      ['KDV Toplami (%10 ic KDV)', para(oz.toplam * 10 / 110)],
      ['NET CIRO (KDV Haric)', para(oz.toplam * 100 / 110)],
      ['Siparis Sayisi', String(oz.siparisSayisi)],
      ['Ortalama Adisyon', para(oz.ort)],
    ]

    ozetSatirlar.forEach(([label, val]) => {
      doc.setTextColor(44, 44, 40)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
      doc.text(label, 18, y)
      doc.setFont('helvetica', 'bold')
      doc.text(val, W - 14, y, { align: 'right' })
      doc.setDrawColor(220, 220, 216)
      doc.line(14, y + 2, W - 14, y + 2)
      y += 9
    })

    y += 4

    // ── ÖDEME DAĞILIMI ──
    doc.setFillColor(216, 90, 48)
    doc.roundedRect(14, y, W - 28, 8, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10); doc.setFont('helvetica', 'bold')
    doc.text('ODEME DAGILIMI', 18, y + 5.5)
    y += 12

    const odemeler = [
      ['Nakit', oz.nakit, oz.toplam],
      ['Kredi Karti', oz.kart, oz.toplam],
      ['Online / Diger', oz.online, oz.toplam],
      ['Platform Siparisleri', oz.paket, oz.toplam],
    ]
    odemeler.forEach(([label, tutar, gen]) => {
      const pay = gen ? ((tutar / gen) * 100).toFixed(1) : '0.0'
      doc.setTextColor(44, 44, 40)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
      doc.text(label, 18, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(120, 120, 116)
      doc.text(`%${pay}`, 130, y)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(44, 44, 40)
      doc.text(para(tutar), W - 14, y, { align: 'right' })
      doc.setDrawColor(220, 220, 216)
      doc.line(14, y + 2, W - 14, y + 2)
      y += 9
    })

    y += 6

    // ── EN ÇOK SATANLAR ──
    autoTable(doc, {
      startY: y,
      head: [['#', 'Urun', 'Adet', 'Ciro', 'Pay %']],
      body: topSat.slice(0, 15).map((u, i) => [
        i + 1, u.ad, u.adet, para(u.toplam),
        oz.toplam ? `%${((u.toplam/oz.toplam)*100).toFixed(1)}` : '%0'
      ]),
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [44, 44, 40], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 247, 245] },
      columnStyles: { 0: {cellWidth: 8}, 2: {halign:'center'}, 3: {halign:'right'}, 4: {halign:'center'} },
      margin: { left: 14, right: 14 },
      didDrawPage: (data) => { y = data.cursor.y }
    })
    y = doc.lastAutoTable.finalY + 8

    // ── KATEGORİ DAĞILIMI ──
    if (katSat.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [['Kategori', 'Adet', 'Ciro', 'Pay %']],
        body: katSat.map(k => [
          `${k.emoji} ${k.ad}`, k.adet, para(k.toplam),
          oz.toplam ? `%${((k.toplam/oz.toplam)*100).toFixed(1)}` : '%0'
        ]),
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [44, 44, 40], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [248, 247, 245] },
        columnStyles: { 1: {halign:'center'}, 2: {halign:'right'}, 3: {halign:'center'} },
        margin: { left: 14, right: 14 },
      })
      y = doc.lastAutoTable.finalY + 10
    }

    // ── ALT BİLGİ ──
    if (y > 250) { doc.addPage(); y = 20 }
    doc.setDrawColor(216, 90, 48)
    doc.setLineWidth(0.5)
    doc.line(14, y, W - 14, y)
    y += 8
    doc.setFontSize(9); doc.setFont('helvetica', 'normal')
    doc.setTextColor(120, 120, 116)
    doc.text(`Raporu Alan: ${kapatan || kullanici?.ad_soyad || 'Yonetici'}`, 14, y)
    doc.text(`Tarih/Saat: ${simdi()}`, W - 14, y, { align: 'right' })
    y += 7
    doc.text('Bu belge elektronik ortamda olusturulmustur. Imza gerekmez.', 14, y)

    // ── FOOTER (tüm sayfalara) ──
    const toplamSayfa = doc.internal.getNumberOfPages()
    for (let i = 1; i <= toplamSayfa; i++) {
      doc.setPage(i)
      doc.setFontSize(7); doc.setTextColor(180, 180, 176)
      doc.text(`SimurgRes Z Raporu No: Z-${String(raporNo).padStart(4,'0')} | Sayfa ${i}/${toplamSayfa}`, 105, 291, { align: 'center' })
    }

    return doc
  }

  // Z Raporu Kapat ve PDF oluştur
  const zRaporuAl = async () => {
    if (!kasaAcik) { toast.error('Bugün zaten Z raporu alındı'); return }
    if (acikMasalar.length > 0) {
      const devam = window.confirm(`${acikMasalar.length} açık masa var!\nYine de Z raporu almak istiyor musunuz?`)
      if (!devam) return
    }

    setKapatiliyor(true)
    try {
      // Rapor no
      const { count } = await supabase.from('z_raporu_log').select('*', { count: 'exact', head: true })
      const raporNo = (count || 0) + 1

      // Kasa özeti kaydet
      const bugun = new Date(); bugun.setHours(0,0,0,0)
      const yarin = new Date(bugun); yarin.setDate(yarin.getDate()+1)

      await supabase.from('kasa_ozetleri').upsert({
        tarih: bugunStr(),
        toplam_ciro: ozet.toplam,
        toplam_siparis: ozet.siparisSayisi,
        nakit: ozet.nakit,
        kart: ozet.kart,
        online: ozet.online,
        platform_ciro: ozet.paket,
        kdv_toplam: +(ozet.toplam * 10 / 110).toFixed(2),
        kapanis_saati: new Date().toISOString(),
        kapatan_kullanici_id: kullanici?.id,
        durum: 'kapali'
      }, { onConflict: 'tarih' })

      // Z log kaydet
      await supabase.from('z_raporu_log').insert({
        tarih: bugunStr(),
        toplam_ciro: ozet.toplam,
        kdv_toplam: +(ozet.toplam * 10 / 110).toFixed(2),
        nakit: ozet.nakit,
        kart: ozet.kart,
        online: ozet.online,
        platform: ozet.paket,
        siparis_sayisi: ozet.siparisSayisi,
        kapatan_id: kullanici?.id,
        kapatan_ad: kullanici?.ad_soyad
      })

      // PDF oluştur ve indir
      const doc = zRaporuPDFOlustur(ozet, topSatan, kategoriSatis, raporNo, kullanici?.ad_soyad)
      doc.save(`SimurgRes_Z_Raporu_${bugunStr()}_No${raporNo}.pdf`)

      toast.success(`Z Raporu alındı ve kaydedildi — No: Z-${String(raporNo).padStart(4,'0')}`)
      setKasaAcik(false)
      yukle()
    } catch (e) {
      toast.error('Z raporu hatası: ' + e.message)
    }
    setKapatiliyor(false)
  }

  // Sadece PDF indir (kasayı kapatmaz)
  const sadeceIndir = async () => {
    const { count } = await supabase.from('z_raporu_log').select('*', { count: 'exact', head: true })
    const doc = zRaporuPDFOlustur(ozet, topSatan, kategoriSatis, (count||0) + 1, kullanici?.ad_soyad)
    doc.save(`SimurgRes_Z_Raporu_Onizleme_${bugunStr()}.pdf`)
    toast.success('Önizleme PDF indirildi')
  }

  if (loading) return <div className="loading-center"><div className="spinner" /></div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Z Raporu — Gün Sonu</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
            {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={sadeceIndir}>
            <FileText size={13} /> Önizleme PDF
          </button>
          <button
            className="btn btn-primary"
            onClick={zRaporuAl}
            disabled={kapatiliyor || !kasaAcik}
            style={{ background: kasaAcik ? 'var(--red)' : 'var(--surface2)', borderColor: kasaAcik ? 'var(--red)' : 'var(--border)' }}>
            <Lock size={13} />
            {kapatiliyor ? 'Kapatılıyor...' : kasaAcik ? 'Z Raporu Al & Kasayı Kapat' : '✓ Bugün Alındı'}
          </button>
        </div>
      </div>

      {/* Açık masa uyarısı */}
      {acikMasalar.length > 0 && (
        <div style={{ background: 'var(--amber-light)', border: '1px solid var(--amber)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#633806', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={15} />
          <strong>{acikMasalar.length} açık masa</strong> var — ideal olarak tüm masalar kapatıldıktan sonra Z raporu alınmalı.
          {acikMasalar.map(m => <span key={m.masa_no} style={{ background: '#fff', padding: '1px 8px', borderRadius: 10, marginLeft: 4, fontSize: 12 }}>{m.masa_no}</span>)}
        </div>
      )}

      {/* Kasa durumu */}
      {!kasaAcik && (
        <div style={{ background: 'var(--green-light)', border: '1px solid var(--green)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#085041', display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle size={15} /> Bugün Z raporu alındı — kasa kapatıldı.
        </div>
      )}

      {/* Özet kartlar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px,1fr))', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Brüt Ciro', val: para(ozet?.toplam), icon: TrendingUp, renk: '#1D9E75' },
          { label: 'KDV (iç %10)', val: para((ozet?.toplam||0) * 10 / 110), icon: FileText, renk: '#534AB7' },
          { label: 'Net Ciro', val: para((ozet?.toplam||0) * 100 / 110), icon: TrendingUp, renk: '#185FA5' },
          { label: 'Sipariş Sayısı', val: ozet?.siparisSayisi, icon: FileText, renk: '#BA7517' },
          { label: 'Nakit', val: para(ozet?.nakit), icon: Banknote, renk: '#1D9E75' },
          { label: 'Kredi Kartı', val: para(ozet?.kart), icon: CreditCard, renk: '#D85A30' },
          { label: 'Online/Diğer', val: para(ozet?.online), icon: Smartphone, renk: '#534AB7' },
          { label: 'Platform', val: para(ozet?.paket), icon: TrendingUp, renk: '#E4002B' },
        ].map(k => (
          <div key={k.label} className="stat-kart" style={{ borderLeft: `3px solid ${k.renk}` }}>
            <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <k.icon size={10} color={k.renk} />{k.label}
            </div>
            <div className="stat-val" style={{ color: k.renk, fontSize: 15 }}>{k.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        {/* En çok satanlar */}
        <div className="card">
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>En Çok Satan Ürünler</div>
          {topSatan.slice(0, 12).map((u, i) => (
            <div key={u.ad} style={{ display: 'flex', gap: 8, padding: '5px 0', borderBottom: '0.5px solid var(--border)', fontSize: 12 }}>
              <span style={{ width: 16, color: 'var(--text3)', flexShrink: 0 }}>{i+1}</span>
              <span style={{ flex: 1 }}>{u.ad}</span>
              <span style={{ color: 'var(--text2)', marginRight: 4 }}>{u.adet}x</span>
              <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{para(u.toplam)}</span>
            </div>
          ))}
        </div>

        {/* Kategori dağılımı */}
        <div className="card">
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Kategori Dağılımı</div>
          {kategoriSatis.map((k, i) => {
            const renkler = ['#D85A30','#1D9E75','#185FA5','#BA7517','#534AB7','#639922','#E4002B','#888']
            const pay = ozet?.toplam ? (k.toplam / ozet.toplam * 100).toFixed(1) : 0
            return (
              <div key={k.ad} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                  <span>{k.emoji} {k.ad} ({k.adet} adet)</span>
                  <span style={{ fontWeight: 600 }}>{para(k.toplam)} <span style={{ color: 'var(--text3)', fontWeight: 400 }}>%{pay}</span></span>
                </div>
                <div style={{ height: 5, borderRadius: 3, background: 'var(--surface2)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: renkler[i % renkler.length], width: `${pay}%`, borderRadius: 3 }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Geçmiş Z raporları */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', fontWeight: 600, fontSize: 13, borderBottom: '0.5px solid var(--border)' }}>
          Geçmiş Z Raporları
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ paddingLeft: 16 }}>Rapor No</th>
              <th>Tarih</th>
              <th>Sipariş</th>
              <th>Nakit</th>
              <th>Kart</th>
              <th>KDV</th>
              <th>Brüt Ciro</th>
              <th style={{ paddingRight: 16 }}>Kapatan</th>
            </tr>
          </thead>
          <tbody>
            {zLog.map((z, i) => (
              <tr key={z.id}>
                <td style={{ paddingLeft: 16, fontWeight: 600, color: 'var(--accent)' }}>
                  Z-{String(zLog.length - i).padStart(4, '0')}
                </td>
                <td style={{ fontSize: 12 }}>{new Date(z.tarih).toLocaleDateString('tr-TR')}</td>
                <td>{z.siparis_sayisi}</td>
                <td>{para(z.nakit)}</td>
                <td>{para(z.kart)}</td>
                <td style={{ color: 'var(--text2)' }}>{para(z.kdv_toplam)}</td>
                <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{para(z.toplam_ciro)}</td>
                <td style={{ paddingRight: 16, fontSize: 12, color: 'var(--text2)' }}>{z.kapatan_ad || '—'}</td>
              </tr>
            ))}
            {zLog.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--text3)' }}>Henüz Z raporu alınmamış</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
