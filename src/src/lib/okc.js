import { supabase } from './supabase'

// ─── CİHAZ TANIMLARI ─────────────────────────────────────────────────────────
export const OKC_MARKALAR = {
  ingenico: {
    ad: 'Ingenico', logo: '🟧',
    modeller: ['IDE280', 'IWE280', 'MOVE5000F', 'PAX A910SF', 'iSelf TT'],
    protokol: 'gmp3',
    baglanti: ['tcp', 'usb'],
    varsayilanPort: 9001,
    aciklama: 'GMP3 protokolü ile TCP/IP veya USB bağlantı. Swagger: http://{IP}:{PORT}/swagger',
    parametreler: [
      { key: 'ip_adresi', label: 'IP Adresi', tip: 'text', gerekli: true, placeholder: '192.168.1.100' },
      { key: 'port', label: 'Port', tip: 'number', gerekli: true, placeholder: '9001', varsayilan: 9001 },
      { key: 'sicil_no', label: 'Sicil No', tip: 'text', gerekli: false, placeholder: 'Yazarkasa sicil numarası' },
    ]
  },
  hugin: {
    ad: 'Hugin', logo: '🟦',
    modeller: ['VX675', 'FT202', 'FP300', 'T300', 'FP500', 'HX3000'],
    protokol: 'hugin',
    baglanti: ['serial', 'usb', 'tcp'],
    varsayilanPort: 2000,
    aciklama: 'RS-232 Serial veya USB bağlantı. Baud rate 9600 veya 19200.',
    parametreler: [
      { key: 'baglanti_tipi', label: 'Bağlantı Tipi', tip: 'select', secenekler: ['serial', 'usb', 'tcp'], gerekli: true },
      { key: 'com_port', label: 'COM Port', tip: 'text', gerekli: false, placeholder: 'COM3', kosul: 'serial' },
      { key: 'baud_rate', label: 'Baud Rate', tip: 'select', secenekler: ['9600', '19200', '38400', '115200'], varsayilan: '9600', kosul: 'serial' },
      { key: 'ip_adresi', label: 'IP Adresi', tip: 'text', gerekli: false, placeholder: '192.168.1.101', kosul: 'tcp' },
      { key: 'port', label: 'Port', tip: 'number', gerekli: false, placeholder: '2000', varsayilan: 2000, kosul: 'tcp' },
    ]
  },
  inpos: {
    ad: 'InPOS', logo: '🟩',
    modeller: ['M530', 'M520', 'M500', 'MP500'],
    protokol: 'inpos',
    baglanti: ['tcp', 'usb', 'serial'],
    varsayilanPort: 9100,
    aciklama: 'TCP/IP veya USB bağlantı. InPOS REST API üzerinden iletişim.',
    parametreler: [
      { key: 'ip_adresi', label: 'IP Adresi', tip: 'text', gerekli: true, placeholder: '192.168.1.102' },
      { key: 'port', label: 'Port', tip: 'number', gerekli: true, placeholder: '9100', varsayilan: 9100 },
      { key: 'seri_no', label: 'Seri No', tip: 'text', gerekli: false, placeholder: 'Cihaz seri numarası' },
    ]
  },
  pavo: {
    ad: 'Pavo', logo: '🟪',
    modeller: ['N86', 'N6', 'GMU', 'Smart'],
    protokol: 'pavo',
    baglanti: ['tcp', 'wifi'],
    varsayilanPort: 8080,
    aciklama: 'WiFi veya Ethernet bağlantı. HTTP REST API.',
    parametreler: [
      { key: 'ip_adresi', label: 'IP Adresi', tip: 'text', gerekli: true, placeholder: '192.168.1.103' },
      { key: 'port', label: 'Port', tip: 'number', gerekli: true, placeholder: '8080', varsayilan: 8080 },
    ]
  },
  beko: {
    ad: 'Beko', logo: '🔵',
    modeller: ['x30TR', '300TR', 'GMU300', 'Smart'],
    protokol: 'generic',
    baglanti: ['serial', 'usb'],
    varsayilanPort: null,
    aciklama: 'RS-232 veya USB seri bağlantı. COM port üzerinden iletişim.',
    parametreler: [
      { key: 'com_port', label: 'COM Port', tip: 'text', gerekli: true, placeholder: 'COM3' },
      { key: 'baud_rate', label: 'Baud Rate', tip: 'select', secenekler: ['9600', '19200', '38400'], varsayilan: '9600' },
    ]
  },
  verifone: {
    ad: 'Verifone', logo: '⬛',
    modeller: ['MX915', 'VX680', 'VX820', 'P400'],
    protokol: 'verifone',
    baglanti: ['tcp', 'serial'],
    varsayilanPort: 8765,
    aciklama: 'TCP/IP veya RS-232. Verifone ComServer üzerinden bağlantı.',
    parametreler: [
      { key: 'ip_adresi', label: 'IP Adresi', tip: 'text', gerekli: true, placeholder: '192.168.1.104' },
      { key: 'port', label: 'Port', tip: 'number', gerekli: true, placeholder: '8765', varsayilan: 8765 },
      { key: 'ayarlar.comserver_url', label: 'ComServer URL', tip: 'text', gerekli: false, placeholder: 'http://localhost:8765' },
    ]
  },
  vera: {
    ad: 'Vera', logo: '🟡',
    modeller: ['Delta', 'Plus', 'Smart'],
    protokol: 'gmp3',
    baglanti: ['tcp', 'wifi'],
    varsayilanPort: 9001,
    aciklama: 'GMP3 protokolü. TCP/IP veya WiFi bağlantı.',
    parametreler: [
      { key: 'ip_adresi', label: 'IP Adresi', tip: 'text', gerekli: true, placeholder: '192.168.1.105' },
      { key: 'port', label: 'Port', tip: 'number', gerekli: true, placeholder: '9001', varsayilan: 9001 },
    ]
  },
  odeal: {
    ad: 'Ödeal', logo: '🔶',
    modeller: ['Smart POS', 'Mini', 'Mobil'],
    protokol: 'generic',
    baglanti: ['wifi', 'tcp'],
    varsayilanPort: 8080,
    aciklama: 'REST API üzerinden ödeme ve fiş. WiFi bağlantı.',
    parametreler: [
      { key: 'ip_adresi', label: 'IP Adresi', tip: 'text', gerekli: true, placeholder: '192.168.1.106' },
      { key: 'port', label: 'Port', tip: 'number', gerekli: true, placeholder: '8080', varsayilan: 8080 },
      { key: 'ayarlar.merchant_id', label: 'Merchant ID', tip: 'text', gerekli: false },
    ]
  },
}

// ─── DB OPERASYONLARI ─────────────────────────────────────────────────────────
export const okcApi = {
  async getAll() {
    const { data, error } = await supabase.from('okc_cihazlar').select('*').order('created_at')
    if (error) throw error
    return data || []
  },
  async getAktif() {
    const { data } = await supabase.from('okc_cihazlar').select('*').eq('aktif', true).order('varsayilan', { ascending: false })
    return data || []
  },
  async getVarsayilan() {
    const { data } = await supabase.from('okc_cihazlar').select('*').eq('aktif', true).eq('varsayilan', true).single()
    return data
  },
  async ekle(cihaz) {
    const { data, error } = await supabase.from('okc_cihazlar').insert(cihaz).select().single()
    if (error) throw error
    return data
  },
  async guncelle(id, updates) {
    const { error } = await supabase.from('okc_cihazlar').update(updates).eq('id', id)
    if (error) throw error
  },
  async sil(id) {
    const { error } = await supabase.from('okc_cihazlar').delete().eq('id', id)
    if (error) throw error
  },
  async varsayilanYap(id) {
    await supabase.from('okc_cihazlar').update({ varsayilan: false }).neq('id', id)
    await supabase.from('okc_cihazlar').update({ varsayilan: true }).eq('id', id)
  },
  async islemKaydet(islem) {
    const { data } = await supabase.from('okc_islemler').insert(islem).select().single()
    return data
  },
  async getIslemler(siparisId) {
    const { data } = await supabase.from('okc_islemler').select('*, okc_cihazlar(ad, marka)').eq('siparis_id', siparisId).order('created_at', { ascending: false })
    return data || []
  }
}

// ─── FİŞ GÖNDERME (Cihaza göre protokol seçimi) ─────────────────────────────
export async function okcFisGonder(cihaz, siparis, odemeYontemi = 'Nakit') {
  const marka = OKC_MARKALAR[cihaz.marka]
  if (!marka) throw new Error(`Bilinmeyen cihaz markası: ${cihaz.marka}`)

  const fis = {
    fisNo: Date.now().toString(),
    tarih: new Date().toISOString(),
    kalemler: (siparis.siparis_kalemleri || []).map(k => ({
      ad: k.urun_ad,
      miktar: k.adet,
      birimFiyat: k.urun_fiyat,
      toplam: k.urun_fiyat * k.adet,
      kdvOrani: 10
    })),
    araToplam: siparis.toplam,
    kdv: siparis.kdv_tutar,
    genelToplam: siparis.genel_toplam,
    odemeYontemi,
    masaNo: siparis.masa_no
  }

  let sonuc
  switch (cihaz.protokol) {
    case 'gmp3':    sonuc = await gmp3FisGonder(cihaz, fis); break
    case 'hugin':   sonuc = await huginFisGonder(cihaz, fis); break
    case 'inpos':   sonuc = await inposFisGonder(cihaz, fis); break
    case 'pavo':    sonuc = await pavoFisGonder(cihaz, fis); break
    case 'verifone':sonuc = await verifoneFisGonder(cihaz, fis); break
    default:        sonuc = await genericFisGonder(cihaz, fis)
  }

  await okcApi.islemKaydet({
    cihaz_id: cihaz.id, siparis_id: siparis.id,
    islem_tipi: 'satis', durum: sonuc.basarili ? 'basarili' : 'hata',
    toplam: siparis.genel_toplam, fis_no: sonuc.fisNo,
    hata_mesaji: sonuc.hata || null, ham_yanit: sonuc
  })

  return sonuc
}

// ─── GMP3 (Ingenico, Vera) ────────────────────────────────────────────────────
async function gmp3FisGonder(cihaz, fis) {
  const baseUrl = `http://${cihaz.ip_adresi}:${cihaz.port}`
  try {
    // GMP3 REST API — Swagger: http://{ip}:{port}/swagger/ui/index
    const payload = {
      Header: { CommandType: 'PrintReceipt', SequenceNumber: fis.fisNo },
      Receipt: {
        ReceiptType: 'Sale',
        Payments: [{ PaymentType: fis.odemeYontemi === 'Nakit' ? 'Cash' : 'CreditCard', Amount: fis.genelToplam }],
        Items: fis.kalemler.map(k => ({
          Description: k.ad, Quantity: k.miktar,
          UnitPrice: k.birimFiyat, TaxRate: k.kdvOrani
        }))
      }
    }
    const res = await fetch(`${baseUrl}/api/PrintReceipt`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(15000)
    })
    const data = await res.json()
    return { basarili: res.ok, fisNo: data.ReceiptNumber || fis.fisNo, ham: data }
  } catch (e) {
    return { basarili: false, hata: e.message }
  }
}

// ─── HUGİN ───────────────────────────────────────────────────────────────────
async function huginFisGonder(cihaz, fis) {
  // Hugin TCP/IP modu — JSON komut protokolü
  try {
    if (cihaz.baglanti_tipi === 'tcp') {
      const res = await fetch(`http://${cihaz.ip_adresi}:${cihaz.port}/api/receipt`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'SALE', amount: fis.genelToplam,
          paymentType: fis.odemeYontemi === 'Nakit' ? 1 : 2,
          items: fis.kalemler.map(k => ({ name: k.ad, qty: k.miktar, price: k.birimFiyat, vat: k.kdvOrani }))
        }), signal: AbortSignal.timeout(15000)
      })
      const data = await res.json()
      return { basarili: data.success, fisNo: data.receiptNo || fis.fisNo, ham: data }
    }
    // USB/Serial — direkten bağlanamayız (OS sürücüsü gerekir)
    return { basarili: false, hata: 'USB/Serial bağlantısı masaüstü uygulaması gerektirir. Lütfen TCP/IP modunu kullanın.' }
  } catch (e) {
    return { basarili: false, hata: e.message }
  }
}

// ─── İNPOS ───────────────────────────────────────────────────────────────────
async function inposFisGonder(cihaz, fis) {
  try {
    const res = await fetch(`http://${cihaz.ip_adresi}:${cihaz.port}/pos/receipt`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactionType: 'SALE', totalAmount: fis.genelToplam,
        paymentMethod: fis.odemeYontemi === 'Nakit' ? 'CASH' : 'CARD',
        lineItems: fis.kalemler.map(k => ({ itemName: k.ad, quantity: k.miktar, unitPrice: k.birimFiyat, vatRate: k.kdvOrani }))
      }), signal: AbortSignal.timeout(15000)
    })
    const data = await res.json()
    return { basarili: data.status === 'OK' || data.success, fisNo: data.receiptNumber || fis.fisNo, ham: data }
  } catch (e) {
    return { basarili: false, hata: e.message }
  }
}

// ─── PAVO ─────────────────────────────────────────────────────────────────────
async function pavoFisGonder(cihaz, fis) {
  try {
    const res = await fetch(`http://${cihaz.ip_adresi}:${cihaz.port}/api/v1/sale`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Math.round(fis.genelToplam * 100),
        currency: 'TRY', paymentType: fis.odemeYontemi === 'Nakit' ? 'CASH' : 'CREDIT',
        items: fis.kalemler.map(k => ({ name: k.ad, amount: Math.round(k.toplam * 100), vatRate: k.kdvOrani }))
      }), signal: AbortSignal.timeout(15000)
    })
    const data = await res.json()
    return { basarili: data.resultCode === '00' || data.success, fisNo: data.transactionId || fis.fisNo, ham: data }
  } catch (e) {
    return { basarili: false, hata: e.message }
  }
}

// ─── VERİFONE ─────────────────────────────────────────────────────────────────
async function verifoneFisGonder(cihaz, fis) {
  const url = cihaz.ayarlar?.comserver_url || `http://${cihaz.ip_adresi}:${cihaz.port}`
  try {
    const res = await fetch(`${url}/api/pos/transaction`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactionType: 'PURCHASE', amount: fis.genelToplam.toFixed(2),
        paymentType: fis.odemeYontemi === 'Nakit' ? 'CASH' : 'CARD',
        receiptItems: fis.kalemler
      }), signal: AbortSignal.timeout(15000)
    })
    const data = await res.json()
    return { basarili: data.responseCode === '00', fisNo: data.referenceNumber || fis.fisNo, ham: data }
  } catch (e) {
    return { basarili: false, hata: e.message }
  }
}

// ─── GENERİK (Beko, Ödeal vb.) ───────────────────────────────────────────────
async function genericFisGonder(cihaz, fis) {
  try {
    const baseUrl = cihaz.ip_adresi
      ? `http://${cihaz.ip_adresi}:${cihaz.port}`
      : null
    if (!baseUrl) return { basarili: false, hata: 'Bağlantı adresi tanımlı değil. USB/Serial bağlantı masaüstü uygulaması gerektirir.' }
    const res = await fetch(`${baseUrl}/api/receipt`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: fis.genelToplam, items: fis.kalemler }),
      signal: AbortSignal.timeout(15000)
    })
    const data = await res.json()
    return { basarili: res.ok, fisNo: data.receiptNo || fis.fisNo, ham: data }
  } catch (e) {
    return { basarili: false, hata: e.message }
  }
}

// ─── BAĞLANTI TESTİ ───────────────────────────────────────────────────────────
export async function okcBaglantiTest(cihaz) {
  if (!cihaz.ip_adresi) return { basarili: false, hata: 'IP adresi girilmedi' }
  try {
    const baseUrl = `http://${cihaz.ip_adresi}:${cihaz.port}`
    const endpoint = cihaz.protokol === 'gmp3' ? '/api/Ping' : '/api/status'
    const res = await fetch(`${baseUrl}${endpoint}`, { signal: AbortSignal.timeout(5000) })
    return { basarili: res.ok || res.status < 500, mesaj: res.ok ? 'Bağlantı başarılı!' : `HTTP ${res.status}` }
  } catch (e) {
    return { basarili: false, hata: `Bağlanamadı: ${e.message}` }
  }
}

// X/Z Raporu
export async function okcRaporAl(cihaz, tip = 'X') {
  try {
    const baseUrl = `http://${cihaz.ip_adresi}:${cihaz.port}`
    const endpoint = cihaz.protokol === 'gmp3' ? `/api/${tip}Report` : `/api/report/${tip.toLowerCase()}`
    const res = await fetch(baseUrl + endpoint, { method: 'POST', signal: AbortSignal.timeout(30000) })
    const data = await res.json()
    await okcApi.islemKaydet({
      cihaz_id: cihaz.id, islem_tipi: tip === 'X' ? 'x_raporu' : 'z_raporu',
      durum: res.ok ? 'basarili' : 'hata', ham_yanit: data
    })
    return { basarili: res.ok, ham: data }
  } catch (e) {
    return { basarili: false, hata: e.message }
  }
}
