/**
 * SimurgRes — Rapor Export Modülü
 * Desteklenen formatlar: PDF, Excel (XLSX), CSV, Word (DOCX)
 */
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, AlignmentType, BorderStyle, WidthType } from 'docx'
import { saveAs } from 'file-saver'

const RENK = {
  turuncu: [216, 90, 48],
  koyu: [44, 44, 40],
  gri: [120, 120, 116],
  acik: [248, 247, 245],
  beyaz: [255, 255, 255],
}

const para = (v) => `${(v||0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`
const tarih = () => new Date().toLocaleDateString('tr-TR')
const dosyaAdi = (ad, uzanti) => `SimurgRes_${ad}_${new Date().toISOString().split('T')[0]}.${uzanti}`

// ─── PDF EXPORT ──────────────────────────────────────────────────────────────
function pdfBaslik(doc, baslik, altBaslik = '') {
  // Header bar
  doc.setFillColor(...RENK.turuncu)
  doc.rect(0, 0, 210, 22, 'F')
  doc.setTextColor(...RENK.beyaz)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('SimurgRes', 14, 14)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(tarih(), 196, 14, { align: 'right' })

  // Başlık
  doc.setTextColor(...RENK.koyu)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(baslik, 14, 34)

  if (altBaslik) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...RENK.gri)
    doc.text(altBaslik, 14, 42)
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(...RENK.gri)
    doc.text(`SimurgRes - ${tarih()} - Sayfa ${i}/${pageCount}`, 105, 290, { align: 'center' })
  }
}

function ozetKutusu(doc, y, ozet) {
  const kutular = [
    ['Toplam Ciro', para(ozet.toplam)],
    ['Sipariş Sayısı', String(ozet.siparisSayisi)],
    ['Ort. Adisyon', para(ozet.ort)],
    ['Nakit', para(ozet.nakit)],
    ['Kart', para(ozet.kart)],
  ]
  const w = 38, h = 16, gap = 2
  kutular.forEach(([label, val], i) => {
    const x = 14 + i * (w + gap)
    doc.setFillColor(...RENK.acik)
    doc.roundedRect(x, y, w, h, 2, 2, 'F')
    doc.setTextColor(...RENK.gri)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(label, x + 3, y + 5)
    doc.setTextColor(...RENK.turuncu)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(val, x + 3, y + 12)
  })
  return y + h + 6
}

// Günlük Rapor PDF
export function exportGunlukPDF(ozet, topSatan, saatlik, baslik) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  let y = 50

  pdfBaslik(doc, baslik || 'Gunluk Rapor', tarih())
  y = ozetKutusu(doc, y, ozet)
  y += 4

  // En çok satanlar tablosu
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...RENK.koyu)
  doc.text('En Cok Satan Urunler', 14, y)
  y += 4

  autoTable(doc, {
    startY: y,
    head: [['#', 'Urun', 'Adet', 'Ciro']],
    body: topSatan.map((u, i) => [i + 1, u.ad, u.adet, para(u.toplam)]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: RENK.turuncu, textColor: RENK.beyaz, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: RENK.acik },
    columnStyles: { 0: { cellWidth: 10 }, 2: { halign: 'center' }, 3: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  })
  y = doc.lastAutoTable.finalY + 8

  // Saatlik tablo
  if (saatlik?.length) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Saatlik Ciro Dagilimi', 14, y)
    y += 4
    autoTable(doc, {
      startY: y,
      head: [['Saat', 'Ciro']],
      body: saatlik.filter(s => s.ciro > 0).map(s => [`${s.saat}:00`, para(s.ciro)]),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: RENK.turuncu, textColor: RENK.beyaz },
      columnStyles: { 1: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    })
  }

  pdfBaslik(doc, baslik || 'Gunluk Rapor', tarih())
  doc.save(dosyaAdi('Gunluk_Rapor', 'pdf'))
}

// Garson Raporu PDF
export function exportGarsonPDF(garsonlar, baslik) {
  const doc = new jsPDF()
  pdfBaslik(doc, 'Garson Bazli Rapor', baslik)

  let y = 50
  autoTable(doc, {
    startY: y,
    head: [['Garson', 'Siparis', 'Toplam Ciro', 'Ort. Adisyon', 'Ciro Payi']],
    body: garsonlar.map(g => [g.ad, g.siparisSayisi, para(g.toplam), para(g.ort), `%${g.pay}`]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: RENK.turuncu, textColor: RENK.beyaz, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: RENK.acik },
    columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'center' } },
    margin: { left: 14, right: 14 },
  })
  y = doc.lastAutoTable.finalY + 10

  // Her garson için ürün detayı
  garsonlar.forEach(g => {
    if (g.urunler.length === 0) return
    if (y > 240) { doc.addPage(); y = 20 }
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...RENK.koyu)
    doc.text(`${g.ad} - En Cok Satilan Urunler`, 14, y)
    y += 4
    autoTable(doc, {
      startY: y,
      head: [['Urun', 'Adet', 'Ciro']],
      body: g.urunler.slice(0, 5).map(u => [u.ad, u.adet, para(u.toplam)]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [100, 100, 96], textColor: RENK.beyaz },
      margin: { left: 14, right: 14 },
    })
    y = doc.lastAutoTable.finalY + 6
  })

  pdfBaslik(doc, 'Garson Bazli Rapor', baslik)
  doc.save(dosyaAdi('Garson_Raporu', 'pdf'))
}

// Stok Raporu PDF
export function exportStokPDF(stoklar) {
  const doc = new jsPDF()
  pdfBaslik(doc, 'Stok Durum Raporu', tarih())

  const kritikler = stoklar.filter(s => s.kritik)
  if (kritikler.length > 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...RENK.turuncu)
    doc.text(`UYARI: ${kritikler.length} urun kritik stok seviyesinde!`, 14, 50)
  }

  autoTable(doc, {
    startY: 56,
    head: [['Hammadde', 'Kategori', 'Stok', 'Birim', 'Min. Stok', 'Maliyet', 'Stok Degeri', 'Durum']],
    body: stoklar.map(s => [
      s.ad, s.kategori, s.stok_miktari, s.birim,
      s.min_stok, para(s.maliyet_fiyat), para(s.stokDeger),
      s.kritik ? 'KRITIK' : 'Normal'
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: RENK.turuncu, textColor: RENK.beyaz },
    alternateRowStyles: { fillColor: RENK.acik },
    didParseCell: (data) => {
      if (data.column.index === 7 && data.cell.raw === 'KRITIK') {
        data.cell.styles.textColor = [200, 50, 50]
        data.cell.styles.fontStyle = 'bold'
      }
    },
    margin: { left: 14, right: 14 },
  })

  const toplam = stoklar.reduce((a, s) => a + s.stokDeger, 0)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...RENK.koyu)
  doc.text(`Toplam Stok Degeri: ${para(toplam)}`, 14, doc.lastAutoTable.finalY + 8)

  pdfBaslik(doc, 'Stok Durum Raporu', tarih())
  doc.save(dosyaAdi('Stok_Raporu', 'pdf'))
}

// ─── EXCEL EXPORT ─────────────────────────────────────────────────────────────
export function exportExcel(veriler, sayfalar, dosyaIsim) {
  const wb = XLSX.utils.book_new()

  sayfalar.forEach(({ isim, satirlar, basliklar }) => {
    const ws = XLSX.utils.aoa_to_sheet([
      [`SimurgRes - ${isim}`, '', '', tarih()],
      [],
      basliklar,
      ...satirlar
    ])

    // Sütun genişlikleri
    ws['!cols'] = basliklar.map(b => ({ wch: Math.max(b.length + 4, 12) }))

    // Başlık satırı stili (sadece xlsx destekler)
    const headerRow = 3
    basliklar.forEach((_, ci) => {
      const cell = XLSX.utils.encode_cell({ r: headerRow - 1, c: ci })
      if (ws[cell]) {
        ws[cell].s = {
          fill: { fgColor: { rgb: 'D85A30' } },
          font: { bold: true, color: { rgb: 'FFFFFF' } }
        }
      }
    })

    XLSX.utils.book_append_sheet(wb, ws, isim.substring(0, 31))
  })

  XLSX.writeFile(wb, dosyaAdi(dosyaIsim || 'Rapor', 'xlsx'))
}

// Günlük rapor Excel
export function exportGunlukExcel(ozet, topSatan, saatlik, gunluk, baslik) {
  exportExcel(null, [
    {
      isim: 'Ozet',
      basliklar: ['Metrik', 'Deger'],
      satirlar: [
        ['Toplam Ciro', para(ozet.toplam)],
        ['Siparis Sayisi', ozet.siparisSayisi],
        ['Ort. Adisyon', para(ozet.ort)],
        ['Nakit', para(ozet.nakit)],
        ['Kredi Karti', para(ozet.kart)],
        ['Online', para(ozet.online)],
        ['Platform Cirosu', para(ozet.paket)],
      ]
    },
    {
      isim: 'En Cok Satanlar',
      basliklar: ['Sira', 'Urun', 'Adet', 'Ciro'],
      satirlar: topSatan.map((u, i) => [i + 1, u.ad, u.adet, para(u.toplam)])
    },
    ...(saatlik?.length ? [{
      isim: 'Saatlik Ciro',
      basliklar: ['Saat', 'Ciro'],
      satirlar: saatlik.map(s => [`${s.saat}:00`, para(s.ciro)])
    }] : []),
    ...(gunluk?.length ? [{
      isim: 'Gunluk Trend',
      basliklar: ['Tarih', 'Siparis Sayisi', 'Ciro'],
      satirlar: gunluk.map(g => [g.tarih, g.siparis, para(g.ciro)])
    }] : []),
  ], baslik || 'Gunluk_Rapor')
}

// Garson raporu Excel
export function exportGarsonExcel(garsonlar, baslik) {
  exportExcel(null, [
    {
      isim: 'Garson Ozeti',
      basliklar: ['Garson', 'Siparis', 'Toplam Ciro', 'Ort. Adisyon', 'Ciro Payi'],
      satirlar: garsonlar.map(g => [g.ad, g.siparisSayisi, para(g.toplam), para(g.ort), `%${g.pay}`])
    },
    ...garsonlar.map(g => ({
      isim: g.ad.substring(0, 28),
      basliklar: ['Urun', 'Adet', 'Ciro'],
      satirlar: g.urunler.map(u => [u.ad, u.adet, para(u.toplam)])
    }))
  ], 'Garson_Raporu')
}

// Stok Excel
export function exportStokExcel(stoklar) {
  exportExcel(null, [{
    isim: 'Stok Durumu',
    basliklar: ['Hammadde', 'Kategori', 'Stok', 'Birim', 'Min. Stok', 'Maliyet', 'Stok Degeri', 'Durum'],
    satirlar: stoklar.map(s => [
      s.ad, s.kategori, s.stok_miktari, s.birim,
      s.min_stok, para(s.maliyet_fiyat), para(s.stokDeger),
      s.kritik ? 'KRITIK' : 'Normal'
    ])
  }], 'Stok_Raporu')
}

// İşlem Logu Excel
export function exportLogExcel(log) {
  exportExcel(null, [{
    isim: 'Islem Logu',
    basliklar: ['Tarih', 'Saat', 'Masa', 'Tur', 'Tutar', 'Odeme', 'Durum'],
    satirlar: log.map(s => [
      new Date(s.created_at).toLocaleDateString('tr-TR'),
      new Date(s.created_at).toLocaleTimeString('tr-TR'),
      s.masa_no, s.tur, para(s.genel_toplam),
      s.odeme_yontemi || '-', s.durum
    ])
  }], 'Islem_Logu')
}

// ─── CSV EXPORT ───────────────────────────────────────────────────────────────
export function exportCSV(basliklar, satirlar, isim) {
  const BOM = '\uFEFF' // UTF-8 BOM for Excel
  const rows = [basliklar, ...satirlar]
    .map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(';'))
    .join('\n')
  const blob = new Blob([BOM + rows], { type: 'text/csv;charset=utf-8;' })
  saveAs(blob, dosyaAdi(isim, 'csv'))
}

// ─── WORD (DOCX) EXPORT ───────────────────────────────────────────────────────
export async function exportWordRapor(ozet, topSatan, garsonlar, baslik) {
  const tablo = (basliklar, satirlar) => new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: basliklar.map(b => new TableCell({
          shading: { fill: 'D85A30' },
          children: [new Paragraph({ children: [new TextRun({ text: b, bold: true, color: 'FFFFFF', size: 18 })] })],
        }))
      }),
      ...satirlar.map((s, si) => new TableRow({
        children: s.map(c => new TableCell({
          shading: si % 2 === 0 ? undefined : { fill: 'F8F7F5' },
          children: [new Paragraph({ children: [new TextRun({ text: String(c || ''), size: 18 })] })],
        }))
      }))
    ]
  })

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ text: 'SimurgRes', heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER }),
        new Paragraph({ text: baslik || 'Rapor', heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ text: `Olusturulma: ${tarih()}`, children: [new TextRun({ text: `Olusturulma: ${tarih()}`, color: '888880', size: 18 })] }),
        new Paragraph(''),

        new Paragraph({ text: 'Ozet Bilgiler', heading: HeadingLevel.HEADING_2 }),
        tablo(
          ['Metrik', 'Deger'],
          [
            ['Toplam Ciro', para(ozet.toplam)],
            ['Siparis Sayisi', String(ozet.siparisSayisi)],
            ['Ort. Adisyon', para(ozet.ort)],
            ['Nakit', para(ozet.nakit)],
            ['Kredi Karti', para(ozet.kart)],
          ]
        ),
        new Paragraph(''),

        ...(topSatan?.length ? [
          new Paragraph({ text: 'En Cok Satan Urunler', heading: HeadingLevel.HEADING_2 }),
          tablo(
            ['Urun', 'Adet', 'Ciro'],
            topSatan.map(u => [u.ad, String(u.adet), para(u.toplam)])
          ),
          new Paragraph(''),
        ] : []),

        ...(garsonlar?.length ? [
          new Paragraph({ text: 'Garson Performansi', heading: HeadingLevel.HEADING_2 }),
          tablo(
            ['Garson', 'Siparis', 'Toplam', 'Pay'],
            garsonlar.map(g => [g.ad, String(g.siparisSayisi), para(g.toplam), `%${g.pay}`])
          ),
        ] : []),
      ]
    }]
  })

  const blob = await Packer.toBlob(doc)
  saveAs(blob, dosyaAdi('Rapor', 'docx'))
}
