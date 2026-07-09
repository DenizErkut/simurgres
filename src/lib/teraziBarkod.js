// ============================================================
// Tartılı (terazi) barkod çözücü
// Yapı: [flag(2)][ürün kodu(5)][değer(5)][kontrol(1)] = 13 hane
// Örn: 29 00010 01500 4  → ürün 00010, 1500 gram (1.5 kg)
// ============================================================

// Ayarları entegrasyon_ayarlari'ndan çeker
export async function teraziAyarGetir(supabase) {
  try {
    const { data } = await supabase
      .from('entegrasyon_ayarlari')
      .select('aktif, ayarlar')
      .eq('platform', 'terazi_barkod')
      .single()
    if (!data) return { aktif: false, flags: ['27', '28', '29'], mod: 'gramaj' }
    return {
      aktif: data.aktif,
      flags: data.ayarlar?.flags || ['27', '28', '29'],
      mod: data.ayarlar?.mod || 'gramaj',
    }
  } catch {
    return { aktif: false, flags: ['27', '28', '29'], mod: 'gramaj' }
  }
}

/**
 * Barkodu çöz. Tartılı barkodsa {tip:'tarti', teraziKodu, agirlikKg} döner.
 * Değilse {tip:'normal', barkod} döner.
 * @param {string} barkod - okunan ham barkod
 * @param {object} ayar - { flags:[], mod:'gramaj' }
 */
export function barkodCoz(barkod, ayar) {
  const b = String(barkod).trim()
  const flags = ayar?.flags || ['27', '28', '29']
  const mod = ayar?.mod || 'gramaj'

  // 13 hane ve tümü rakam mı, ön ek tanımlı flag'lerden biri mi?
  if (b.length === 13 && /^\d{13}$/.test(b) && flags.includes(b.slice(0, 2))) {
    const teraziKodu = b.slice(2, 7)      // 5 hane ürün kodu
    const degerRaw   = b.slice(7, 12)     // 5 hane değer
    const deger      = parseInt(degerRaw, 10)

    if (mod === 'gramaj') {
      // değer = gram → kg
      return { tip: 'tarti', teraziKodu, agirlikKg: +(deger / 1000).toFixed(3), tutar: null }
    } else {
      // mod = 'tutar' → değer = kuruş (00.00 TL). Ağırlık bilinmez, tutar sabit.
      return { tip: 'tarti', teraziKodu, agirlikKg: null, tutar: +(deger / 100).toFixed(2) }
    }
  }

  // Tartılı değil — normal barkod
  return { tip: 'normal', barkod: b }
}
