import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ─── AUTH ─────────────────────────────────────────────────────────────────────
export const authApi = {
  async girisYap(email, sifre) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: sifre })
    if (error) throw error
    return data
  },

  async cikisYap() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  async mevcutKullanici() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data: profil } = await supabase
      .from('kullanici_profiller')
      .select('*')
      .eq('id', user.id)
      .single()
    return profil ? { ...user, ...profil } : user
  },

  onAuthChange(callback) {
    return supabase.auth.onAuthStateChange(callback)
  }
}

// ─── KULLANICI YÖNETİMİ (Yönetici) ───────────────────────────────────────────
export const kullaniciApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('kullanici_profiller')
      .select('*')
      .order('created_at')
    if (error) throw error
    return data
  },

  async updateRol(id, rol) {
    const { error } = await supabase
      .from('kullanici_profiller')
      .update({ rol })
      .eq('id', id)
    if (error) throw error
  },

  async toggleAktif(id, aktif) {
    const { error } = await supabase
      .from('kullanici_profiller')
      .update({ aktif })
      .eq('id', id)
    if (error) throw error
  },

  async davetGonder(email, adSoyad, rol) {
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { ad_soyad: adSoyad, rol }
    })
    if (error) throw error
    return data
  }
}

// ─── SALONLAR ────────────────────────────────────────────────────────────────
export const salonlarApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('salonlar')
      .select('*')
      .eq('aktif', true)
      .order('sira')
    if (error) throw error
    return data
  }
}

// ─── MASALAR ─────────────────────────────────────────────────────────────────
export const masalarApi = {
  async getBySalon(salonId) {
    const { data, error } = await supabase
      .from('masalar')
      .select('*, salonlar(ad)')
      .eq('salon_id', salonId)
      .eq('aktif', true)
      .order('no')
    if (error) throw error
    return data
  },

  async getAll() {
    const { data, error } = await supabase
      .from('masalar')
      .select('*, salonlar(ad)')
      .eq('aktif', true)
      .order('no')
    if (error) throw error
    return data
  },

  async updateDurum(masaId, durum) {
    const { error } = await supabase
      .from('masalar')
      .update({ durum })
      .eq('id', masaId)
    if (error) throw error
  }
}

// ─── KATEGORİLER ─────────────────────────────────────────────────────────────
export const kategorilerApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('kategoriler')
      .select('*')
      .eq('aktif', true)
      .order('sira')
    if (error) throw error
    return data
  }
}

// ─── ÜRÜNLER ─────────────────────────────────────────────────────────────────
export const urunlerApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('urunler')
      .select('*, kategoriler(ad, emoji)')
      .eq('aktif', true)
      .order('ad')
    if (error) throw error
    return data
  },

  async create(urun) {
    const { data, error } = await supabase
      .from('urunler')
      .insert(urun)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id, updates) {
    const { error } = await supabase
      .from('urunler')
      .update(updates)
      .eq('id', id)
    if (error) throw error
  },

  async toggleAktif(id, aktif) {
    const { error } = await supabase
      .from('urunler')
      .update({ aktif })
      .eq('id', id)
    if (error) throw error
  }
}

// ─── SİPARİŞLER ──────────────────────────────────────────────────────────────
export const siparislerApi = {
  async create(siparis, kalemler) {
    // 1. Aynı masa için açık sipariş var mı?
    let hedefSiparis = null
    if (siparis.masa_id) {
      const { data: mevcutlar } = await supabase
        .from('siparisler')
        .select('*')
        .eq('masa_id', siparis.masa_id)
        .eq('durum', 'acik')
        .order('created_at', { ascending: false })
        .limit(1)
      if (mevcutlar && mevcutlar.length > 0) hedefSiparis = mevcutlar[0]
    }

    // 2. Yoksa yeni sipariş oluştur
    if (!hedefSiparis) {
      const { data: yeni, error: sipErr } = await supabase
        .from('siparisler')
        .insert(siparis)
        .select()
        .single()
      if (sipErr) throw sipErr
      hedefSiparis = yeni
      if (siparis.masa_id) await masalarApi.updateDurum(siparis.masa_id, 'dolu')
    }

    // 3. Yeni kalemleri ekle
    const kalemlerVeri = kalemler.map(k => ({
      siparis_id: hedefSiparis.id,
      urun_id: k.urun_id,
      urun_ad: k.urun_ad,
      urun_fiyat: k.urun_fiyat,
      adet: k.adet,
      notlar: k.notlar || null,
      durum: 'bekliyor'
    }))
    const { error: kalemErr } = await supabase
      .from('siparis_kalemleri')
      .insert(kalemlerVeri)
    if (kalemErr) throw kalemErr

    // 4. Toplam güncelle
    const { data: tumKalemler } = await supabase
      .from('siparis_kalemleri')
      .select('urun_fiyat, adet')
      .eq('siparis_id', hedefSiparis.id)
    if (tumKalemler) {
      const toplam = tumKalemler.reduce((a, k) => a + k.urun_fiyat * k.adet, 0)
      const kdv_tutar = +(toplam * 10 / 110).toFixed(2)  // iç KDV (fiyatlar zaten KDV dahil)
      await supabase.from('siparisler').update({
        toplam, kdv_tutar, genel_toplam: +(toplam + kdv_tutar).toFixed(2)
      }).eq('id', hedefSiparis.id)
    }

    // 5. KDS — aynı sipariş için tek kart
    const { data: mevcutKds } = await supabase
      .from('kds_bildirimler')
      .select('id')
      .eq('siparis_id', hedefSiparis.id)
      .in('durum', ['yeni', 'hazirlaniyor'])
      .limit(1)

    if (mevcutKds && mevcutKds.length > 0) {
      await supabase.from('kds_bildirimler')
        .update({ durum: 'yeni', updated_at: new Date().toISOString() })
        .eq('id', mevcutKds[0].id)
    } else {
      await supabase.from('kds_bildirimler').insert({
        siparis_id: hedefSiparis.id,
        masa_no: siparis.masa_no,
        durum: 'yeni'
      })
    }

    return hedefSiparis
  },

  async getAcikSiparisler() {
    const { data, error } = await supabase
      .from('siparisler')
      .select(`*, masalar(no, salonlar(ad)), siparis_kalemleri(*)`)
      .eq('durum', 'acik')
      .order('created_at')
    if (error) throw error
    return data
  },

  async getByMasa(masaId) {
    const { data, error } = await supabase
      .from('siparisler')
      .select(`*, siparis_kalemleri(*)`)
      .eq('masa_id', masaId)
      .eq('durum', 'acik')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (error && error.code !== 'PGRST116') throw error
    return data || null
  },

  async kapat(siparisId, { odemeYontemi, masaId }) {
    // Önce siparişin var olduğunu doğrula
    const { data: mevcut } = await supabase
      .from('siparisler')
      .select('id, durum, masa_id')
      .eq('id', siparisId)
      .single()

    if (!mevcut) throw new Error('Sipariş bulunamadı: ' + siparisId)

    const { data, error } = await supabase
      .from('siparisler')
      .update({ durum: 'odendi', odeme_yontemi: odemeYontemi })
      .eq('id', siparisId)
      .select('id, durum')

    if (error) throw new Error('Güncelleme hatası: ' + error.message)
    if (!data || data.length === 0) throw new Error('Satır güncellenemedi')

    // Masa id'si varsa masayı boşalt
    const hedefMasaId = masaId || mevcut.masa_id
    if (hedefMasaId) await masalarApi.updateDurum(hedefMasaId, 'bos')

    // ── STOK DÜŞME: Sipariş kalemlerinin reçetesinden hammaddeleri düş ──
    try {
      await stokApi.siparistenStokDus(siparisId)
    } catch (stokHata) {
      // Stok hatası siparişi iptal etmesin — sadece logla
      console.warn('Stok düşme hatası:', stokHata.message)
    }

    return data[0]
  },

  async toplamHesapla(kalemler) {
    const toplam = kalemler.reduce((acc, k) => acc + k.urun_fiyat * k.adet, 0)
    // Fiyatlar KDV dahil — iç KDV hesabı (sadece fiş/rapor için)
    const kdv_tutar = +(toplam * 10 / 110).toFixed(2)
    return { toplam, kdv_tutar, genel_toplam: toplam }
  }
}

// ─── KDS ─────────────────────────────────────────────────────────────────────
export const kdsApi = {
  async getAktif() {
    const { data, error } = await supabase
      .from('kds_bildirimler')
      .select(`*, siparisler(masa_no, tur, siparis_kalemleri(id, urun_ad, adet, notlar, durum))`)
      .in('durum', ['yeni', 'hazirlaniyor'])
      .order('created_at')
    if (error) throw error
    return data
  },

  async updateDurum(kdsId, durum) {
    const { error } = await supabase
      .from('kds_bildirimler')
      .update({ durum })
      .eq('id', kdsId)
    if (error) throw error
  }
}

// ─── RAPORLAR ────────────────────────────────────────────────────────────────
// ─── STOK API ─────────────────────────────────────────────────────────────────
export const stokApi = {

  // Sipariş kapandığında reçetedeki hammaddeleri stoktan düş
  async siparistenStokDus(siparisId) {
    // 1. Sipariş kalemlerini çek (urun_id + adet)
    const { data: kalemler, error: kalemErr } = await supabase
      .from('siparis_kalemleri')
      .select('urun_id, adet')
      .eq('siparis_id', siparisId)

    if (kalemErr) throw kalemErr
    if (!kalemler || kalemler.length === 0) return

    // 2. Her kalem için reçeteyi çek ve stok düş
    for (const kalem of kalemler) {
      if (!kalem.urun_id) continue

      const { data: receteler } = await supabase
        .from('receteler')
        .select('hammadde_id, miktar, fire_orani')
        .eq('urun_id', kalem.urun_id)

      if (!receteler || receteler.length === 0) continue

      for (const r of receteler) {
        // Fire dahil net tüketim = miktar × (1 + fire/100) × adet
        const netMiktar = r.miktar * (1 + (r.fire_orani || 0) / 100) * kalem.adet

        // Mevcut stoku çek
        const { data: hammadde } = await supabase
          .from('hammaddeler')
          .select('stok_miktari, ad')
          .eq('id', r.hammadde_id)
          .single()

        if (!hammadde) continue

        const yeniStok = Math.max(0, (hammadde.stok_miktari || 0) - netMiktar)

        // Stoku güncelle
        await supabase.from('hammaddeler')
          .update({ stok_miktari: yeniStok })
          .eq('id', r.hammadde_id)

        // Hareket logu
        await supabase.from('stok_hareketleri').insert({
          hammadde_id: r.hammadde_id,
          hareket_tipi: 'cikis',
          miktar: netMiktar,
          onceki_stok: hammadde.stok_miktari || 0,
          sonraki_stok: yeniStok,
          kaynak: 'siparis',
          kaynak_id: siparisId,
          notlar: `Sipariş kapatma — ${kalem.adet} porsiyon`
        })
      }
    }
  }
}

export const raporlarApi = {
  async bugunOzet() {
    const bugun = new Date(); bugun.setHours(0,0,0,0)
    const yarin = new Date(bugun); yarin.setDate(yarin.getDate() + 1)
    const { data, error } = await supabase
      .from('siparisler')
      .select('genel_toplam, odeme_yontemi, created_at')
      .eq('durum', 'odendi')
      .gte('created_at', bugun.toISOString())
      .lt('created_at', yarin.toISOString())
    if (error) throw error
    const totalCiro = data.reduce((a, s) => a + (s.genel_toplam || 0), 0)
    const nakit = data.filter(s => s.odeme_yontemi === 'Nakit').reduce((a, s) => a + s.genel_toplam, 0)
    const kart = data.filter(s => s.odeme_yontemi === 'Kredi Kartı').reduce((a, s) => a + s.genel_toplam, 0)
    const online = data.filter(s => s.odeme_yontemi === 'Online').reduce((a, s) => a + s.genel_toplam, 0)
    return {
      totalCiro: +totalCiro.toFixed(2),
      toplamSiparis: data.length,
      ortAdisyon: data.length ? +(totalCiro / data.length).toFixed(2) : 0,
      nakit: +nakit.toFixed(2),
      kart: +kart.toFixed(2),
      online: +online.toFixed(2)
    }
  },

  async saatlikCiro() {
    const bugun = new Date(); bugun.setHours(0,0,0,0)
    const { data, error } = await supabase
      .from('siparisler')
      .select('genel_toplam, created_at')
      .eq('durum', 'odendi')
      .gte('created_at', bugun.toISOString())
    if (error) throw error
    const saatler = {}
    for (let h = 9; h <= 22; h++) saatler[h] = 0
    data.forEach(s => {
      const h = new Date(s.created_at).getHours()
      if (saatler[h] !== undefined) saatler[h] += s.genel_toplam || 0
    })
    return Object.entries(saatler).map(([saat, ciro]) => ({ saat: +saat, ciro: +ciro.toFixed(2) }))
  },

  async topSatan() {
    const bugun = new Date(); bugun.setHours(0,0,0,0)
    const { data, error } = await supabase
      .from('siparis_kalemleri')
      .select('urun_ad, urun_fiyat, adet, siparisler!inner(created_at, durum)')
      .eq('siparisler.durum', 'odendi')
      .gte('siparisler.created_at', bugun.toISOString())
    if (error) throw error
    const grup = {}
    data.forEach(k => {
      if (!grup[k.urun_ad]) grup[k.urun_ad] = { ad: k.urun_ad, adet: 0, toplam: 0 }
      grup[k.urun_ad].adet += k.adet
      grup[k.urun_ad].toplam += k.urun_fiyat * k.adet
    })
    return Object.values(grup).sort((a, b) => b.adet - a.adet).slice(0, 8)
  }
}

// ─── REALTIME ────────────────────────────────────────────────────────────────
export const realtimeApi = {
  masalarSubscribe(cb) {
    return supabase.channel('masalar-ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'masalar' }, cb)
      .subscribe()
  },
  kdsSubscribe(cb) {
    return supabase.channel('kds-ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kds_bildirimler' }, cb)
      .subscribe()
  },
  siparislerSubscribe(cb) {
    return supabase.channel('siparisler-ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'siparisler' }, cb)
      .subscribe()
  },
  unsubscribe(channel) {
    supabase.removeChannel(channel)
  }
}

// ─── GENİŞLETİLMİŞ RAPORLAR ──────────────────────────────────────────────────
export const raporlarGelismisApi = {

  // Tarih aralığı özeti
  async araliklarOzet(baslangic, bitis, kategoriId = null) {
    if (kategoriId) {
      // Kategori filtresi varsa kalem bazlı hesapla
      const { data: kalemler } = await supabase.from('siparis_kalemleri')
        .select('urun_fiyat, adet, urunler!inner(kategori_id), siparisler!inner(genel_toplam, odeme_yontemi, created_at, tur, durum, id)')
        .eq('siparisler.durum', 'odendi')
        .eq('urunler.kategori_id', kategoriId)
        .gte('siparisler.created_at', baslangic)
        .lt('siparisler.created_at', bitis)

      const toplam = (kalemler||[]).reduce((a,k) => a + k.urun_fiyat * k.adet, 0)
      const siparisIdSet = new Set((kalemler||[]).map(k => k.siparisler.id))
      // Ödeme dağılımı için sipariş bazlı oranlama yapmak karmaşık; basitçe kalem toplamını nakite ata, diğerlerini 0 göster
      return {
        toplam: +toplam.toFixed(2), siparisSayisi: siparisIdSet.size,
        ort: siparisIdSet.size ? +(toplam/siparisIdSet.size).toFixed(2) : 0,
        nakit: 0, kart: 0, online: 0, paket: 0, masa: +toplam.toFixed(2),
        kategoriFiltreli: true
      }
    }
    const { data } = await supabase.from('siparisler')
      .select('genel_toplam, odeme_yontemi, created_at, masa_no, tur')
      .eq('durum', 'odendi')
      .gte('created_at', baslangic).lt('created_at', bitis)
    const toplam = data?.reduce((a, s) => a + (s.genel_toplam || 0), 0) || 0
    const nakit = data?.filter(s => s.odeme_yontemi?.includes('Nakit')).reduce((a,s) => a+(s.genel_toplam||0), 0) || 0
    const kart  = data?.filter(s => s.odeme_yontemi?.includes('Kredi')).reduce((a,s) => a+(s.genel_toplam||0), 0) || 0
    const online = data?.filter(s => s.odeme_yontemi?.includes('Online')).reduce((a,s) => a+(s.genel_toplam||0), 0) || 0
    const paket = data?.filter(s => s.tur === 'paket').reduce((a,s) => a+(s.genel_toplam||0), 0) || 0
    return {
      toplam: +toplam.toFixed(2), siparisSayisi: data?.length || 0,
      ort: data?.length ? +(toplam/data.length).toFixed(2) : 0,
      nakit: +nakit.toFixed(2), kart: +kart.toFixed(2),
      online: +online.toFixed(2), paket: +paket.toFixed(2),
      masa: +(toplam-paket).toFixed(2)
    }
  },

  // Saatlik ciro (düzeltilmiş — odeme_zamani veya created_at)
  async saatlikCiroGelismis(tarih) {
    const gun = tarih ? new Date(tarih) : new Date()
    gun.setHours(0,0,0,0)
    const ertesi = new Date(gun); ertesi.setDate(ertesi.getDate()+1)
    const { data } = await supabase.from('siparisler')
      .select('genel_toplam, created_at')
      .eq('durum', 'odendi')
      .gte('created_at', gun.toISOString())
      .lt('created_at', ertesi.toISOString())
    const saatler = {}
    for (let h = 8; h <= 23; h++) saatler[h] = 0
    ;(data || []).forEach(s => {
      const h = new Date(s.created_at).getHours()
      if (saatler[h] !== undefined) saatler[h] += s.genel_toplam || 0
    })
    return Object.entries(saatler).map(([saat, ciro]) => ({ saat: +saat, ciro: +ciro.toFixed(2) }))
  },

  // Haftalık / aylık trend (son N gün)
  async gunlukTrend(gunSayisi = 14) {
    const bitis = new Date(); bitis.setHours(23,59,59,999)
    const baslangic = new Date(); baslangic.setDate(baslangic.getDate() - gunSayisi + 1); baslangic.setHours(0,0,0,0)
    const { data } = await supabase.from('siparisler')
      .select('genel_toplam, created_at')
      .eq('durum', 'odendi')
      .gte('created_at', baslangic.toISOString())
      .lte('created_at', bitis.toISOString())
    const gunler = {}
    for (let i = 0; i < gunSayisi; i++) {
      const d = new Date(baslangic); d.setDate(d.getDate()+i)
      const key = d.toISOString().split('T')[0]
      gunler[key] = { tarih: key, ciro: 0, siparis: 0 }
    }
    ;(data || []).forEach(s => {
      const key = new Date(s.created_at).toISOString().split('T')[0]
      if (gunler[key]) { gunler[key].ciro += s.genel_toplam||0; gunler[key].siparis++ }
    })
    return Object.values(gunler).map(g => ({ ...g, ciro: +g.ciro.toFixed(2) }))
  },

  // Kategori bazlı satış analizi
  async kategoriBazliSatis(baslangic, bitis, kategoriId = null) {
    let q = supabase.from('siparis_kalemleri')
      .select('urun_ad, urun_fiyat, adet, urunler!inner(kategori_id, kategoriler(ad, emoji)), siparisler!inner(created_at, durum)')
      .eq('siparisler.durum', 'odendi')
      .gte('siparisler.created_at', baslangic)
      .lt('siparisler.created_at', bitis)
    if (kategoriId) q = q.eq('urunler.kategori_id', kategoriId)
    const { data } = await q
    const kategoriler = {}
    ;(data || []).forEach(k => {
      const kat = k.urunler?.kategoriler?.ad || 'Diğer'
      const emoji = k.urunler?.kategoriler?.emoji || '🍽️'
      if (!kategoriler[kat]) kategoriler[kat] = { ad: kat, emoji, toplam: 0, adet: 0 }
      kategoriler[kat].toplam += k.urun_fiyat * k.adet
      kategoriler[kat].adet += k.adet
    })
    return Object.values(kategoriler).sort((a,b) => b.toplam - a.toplam)
  },

  // En çok satan ürünler (tarih aralıklı)
  async topSatanGelismis(baslangic, bitis, limit = 15, kategoriId = null) {
    let q = supabase.from('siparis_kalemleri')
      .select('urun_ad, urun_fiyat, adet, urun_id, urunler!inner(kategori_id), siparisler!inner(created_at, durum)')
      .eq('siparisler.durum', 'odendi')
      .gte('siparisler.created_at', baslangic)
      .lt('siparisler.created_at', bitis)
    if (kategoriId) q = q.eq('urunler.kategori_id', kategoriId)
    const { data } = await q
    const grup = {}
    ;(data || []).forEach(k => {
      if (!grup[k.urun_ad]) grup[k.urun_ad] = { ad: k.urun_ad, adet: 0, toplam: 0 }
      grup[k.urun_ad].adet += k.adet
      grup[k.urun_ad].toplam += k.urun_fiyat * k.adet
    })
    return Object.values(grup).sort((a,b) => b.adet - a.adet).slice(0, limit)
  },

  // İade raporu
  async iadeRaporu(baslangic, bitis) {
    const { data } = await supabase.from('stok_hareketleri')
      .select('*')
      .eq('hareket_tipi', 'iade')
      .gte('created_at', baslangic).lt('created_at', bitis)
      .order('created_at', { ascending: false })
    return data || []
  },

  // Masa transfer / birleştirme logları
  async islemLoglari(baslangic, bitis) {
    const { data } = await supabase.from('pin_override_log')
      .select('*, kullanicilar!yapan_kullanici_id(ad_soyad, kullanici_adi), onaylayan:kullanicilar!onaylayan_kullanici_id(ad_soyad)')
      .gte('created_at', baslangic).lt('created_at', bitis)
      .order('created_at', { ascending: false })
    return data || []
  },

  // Tüm sipariş hareketleri (genel log)
  async siparisLog(baslangic, bitis) {
    const { data } = await supabase.from('siparisler')
      .select('id, masa_no, durum, genel_toplam, odeme_yontemi, tur, created_at')
      .gte('created_at', baslangic).lt('created_at', bitis)
      .order('created_at', { ascending: false })
      .limit(500)
    return data || []
  },

  // Stok durum raporu
  async stokDurum() {
    const { data } = await supabase.from('hammaddeler')
      .select('*').eq('aktif', true).order('stok_miktari')
    return (data || []).map(h => ({
      ...h,
      stokDeger: +(h.stok_miktari * h.maliyet_fiyat).toFixed(2),
      kritik: h.stok_miktari <= h.min_stok && h.min_stok > 0
    }))
  },

  // Stok hareket raporu
  async stokHareketRaporu(baslangic, bitis) {
    const { data } = await supabase.from('stok_hareketleri')
      .select('*, hammaddeler(ad, birim, maliyet_fiyat)')
      .gte('created_at', baslangic).lt('created_at', bitis)
      .order('created_at', { ascending: false })
    return data || []
  },

  // Fatura özeti
  async faturaOzeti(baslangic, bitis) {
    const { data } = await supabase.from('faturalar')
      .select('*, fatura_kalemleri(count)')
      .gte('tarih', baslangic.split('T')[0]).lte('tarih', bitis.split('T')[0])
      .order('tarih', { ascending: false })
    const toplam = (data||[]).reduce((a,f) => a+(f.genel_toplam||0), 0)
    const odenmemis = (data||[]).filter(f=>f.durum==='odenmedi').reduce((a,f) => a+(f.genel_toplam||0), 0)
    return { faturalar: data||[], toplam, odenmemis }
  },

  // Masa performansı
  async masaPerformans(baslangic, bitis, kategoriId = null) {
    if (kategoriId) {
      // Kategori filtreliyse kalem bazlı hesapla
      const { data: kalemler } = await supabase.from('siparis_kalemleri')
        .select('urun_fiyat, adet, urunler!inner(kategori_id), siparisler!inner(masa_no, created_at, durum)')
        .eq('siparisler.durum', 'odendi')
        .eq('urunler.kategori_id', kategoriId)
        .gte('siparisler.created_at', baslangic)
        .lt('siparisler.created_at', bitis)
        .not('siparisler.masa_no', 'like', 'YS-%').not('siparisler.masa_no', 'like', 'GT-%')
        .not('siparisler.masa_no', 'like', 'TY-%').not('siparisler.masa_no', 'like', 'MY-%')

      const masalar = {}
      const setler = {}
      ;(kalemler||[]).forEach(k => {
        const masaNo = k.siparisler?.masa_no?.split(' ·')[0] || k.siparisler?.masa_no
        if (!masalar[masaNo]) { masalar[masaNo] = { masaNo, siparis: 0, toplam: 0 }; setler[masaNo] = new Set() }
        masalar[masaNo].toplam += (k.urun_fiyat||0) * (k.adet||1)
        const sid = k.siparisler?.created_at
        if (!setler[masaNo].has(sid)) { setler[masaNo].add(sid); masalar[masaNo].siparis++ }
      })
      return Object.values(masalar)
        .map(m => ({ ...m, ort: m.siparis ? +(m.toplam/m.siparis).toFixed(2) : 0, toplam: +m.toplam.toFixed(2) }))
        .sort((a,b) => b.toplam - a.toplam)
    }

    const { data } = await supabase.from('siparisler')
      .select('masa_no, genel_toplam, created_at')
      .eq('durum', 'odendi').not('masa_no', 'like', 'YS-%').not('masa_no', 'like', 'GT-%')
      .not('masa_no', 'like', 'TY-%').not('masa_no', 'like', 'MY-%')
      .gte('created_at', baslangic).lt('created_at', bitis)
    const masalar = {}
    ;(data||[]).forEach(s => {
      const masaNo = s.masa_no?.split(' ·')[0] || s.masa_no
      if (!masalar[masaNo]) masalar[masaNo] = { masaNo, siparis: 0, toplam: 0 }
      masalar[masaNo].siparis++
      masalar[masaNo].toplam += s.genel_toplam||0
    })
    return Object.values(masalar)
      .map(m => ({ ...m, ort: +(m.toplam/m.siparis).toFixed(2), toplam: +m.toplam.toFixed(2) }))
      .sort((a,b) => b.toplam - a.toplam)
  },

  // Platform karşılaştırması


  // Stok Karlılık Raporu
  async karlilikRaporu(baslangic, bitis, kategoriId = null) {
    // 1. Dönemdeki tüm satılan sipariş kalemleri (ürün bazlı)
    let satisQ = supabase
      .from('siparis_kalemleri')
      .select('urun_id, urun_ad, urun_fiyat, adet, urunler(kategori_id, kategoriler(ad, emoji)), siparisler!inner(created_at, durum)')
      .eq('siparisler.durum', 'odendi')
      .gte('siparisler.created_at', baslangic)
      .lt('siparisler.created_at', bitis)
    if (kategoriId) satisQ = satisQ.eq('urunler.kategori_id', kategoriId)
    const { data: satislar, error: satisErr } = await satisQ
    if (satisErr) console.error('Karlılık raporu satış hatası:', satisErr)

    // 2. Tüm reçeteler (hangi üründe hangi hammadde ne kadar)
    const { data: receteler } = await supabase
      .from('receteler')
      .select('urun_id, hammadde_id, miktar, fire_orani, hammaddeler(id, ad, maliyet_fiyat, birim)')

    // 3. Hammadde başına AĞIRLIKLI ORTALAMA GİRİŞ MALİYETİ — fatura kalemlerinden hesapla
    //    Tüm zamanların fatura geçmişi kullanılır (sadece seçili döneme ait fatura değil),
    //    çünkü elindeki stok genelde daha önceki alımlardan gelir.
    const { data: faturaKalemleri } = await supabase
      .from('fatura_kalemleri')
      .select('hammadde_id, miktar, birim_fiyat, created_at')
      .not('hammadde_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(2000)

    // Ağırlıklı ortalama: toplam_tutar / toplam_miktar (hammadde bazlı)
    const ortalamaMaliyet = {} // hammadde_id -> { agirlikliOrtalama, sonGirisFiyati, faturaSayisi }
    const hmGruplar = {}
    ;(faturaKalemleri || []).forEach(fk => {
      if (!hmGruplar[fk.hammadde_id]) hmGruplar[fk.hammadde_id] = []
      hmGruplar[fk.hammadde_id].push(fk)
    })
    Object.entries(hmGruplar).forEach(([hmId, kalemler]) => {
      const toplamTutar = kalemler.reduce((a, k) => a + (k.miktar * k.birim_fiyat), 0)
      const toplamMiktar = kalemler.reduce((a, k) => a + k.miktar, 0)
      ortalamaMaliyet[hmId] = {
        agirlikliOrtalama: toplamMiktar > 0 ? +(toplamTutar / toplamMiktar).toFixed(4) : 0,
        sonGirisFiyati: kalemler[0]?.birim_fiyat || 0, // en yeni fatura (created_at desc sıralı)
        faturaSayisi: kalemler.length
      }
    })

    // Hammadde maliyetini bul: önce fatura ortalaması, yoksa hammaddeler.maliyet_fiyat (fallback)
    const hammaddeMaliyetiBul = (hammadde) => {
      if (!hammadde) return { maliyet: 0, kaynak: 'yok' }
      const fatura = ortalamaMaliyet[hammadde.id]
      if (fatura && fatura.faturaSayisi > 0) {
        return { maliyet: fatura.agirlikliOrtalama, kaynak: 'fatura', faturaSayisi: fatura.faturaSayisi }
      }
      return { maliyet: hammadde.maliyet_fiyat || 0, kaynak: 'manuel' }
    }

    // 4. Reçeteleri urun_id bazlı grupla
    const receteMap = {}
    ;(receteler || []).forEach(r => {
      if (!receteMap[r.urun_id]) receteMap[r.urun_id] = []
      receteMap[r.urun_id].push(r)
    })

    // 6. Ürün bazlı satış grupla
    const urunler = {}
    ;(satislar || []).forEach(s => {
      const key = s.urun_id || s.urun_ad
      if (!urunler[key]) {
        urunler[key] = {
          urun_id: s.urun_id,
          ad: s.urun_ad,
          kategori: s.urunler?.kategoriler?.ad || 'Diğer',
          kategoriEmoji: s.urunler?.kategoriler?.emoji || '🍽️',
          kdvOrani: 10, // sistem genelinde sabit iç KDV oranı
          satirSayisi: 0,
          toplamAdet: 0,
          toplamSatisTutar: 0,  // KDV dahil
        }
      }
      urunler[key].toplamAdet += s.adet || 1
      urunler[key].toplamSatisTutar += (s.urun_fiyat || 0) * (s.adet || 1)
      urunler[key].satirSayisi++
    })

    // 7. Her ürün için hammadde maliyeti hesapla
    const sonuclar = Object.values(urunler).map(u => {
      const kdvOrani = u.kdvOrani || 10
      const satirSatisKDVDahil = u.toplamSatisTutar
      const satirSatisKDVHaric = +(satirSatisKDVDahil * 100 / (100 + kdvOrani)).toFixed(2)
      const satirKDV = +(satirSatisKDVDahil - satirSatisKDVHaric).toFixed(2)

      // Reçete maliyeti (1 porsiyon) — fatura ağırlıklı ortalama maliyetinden
      const recete = receteMap[u.urun_id] || []
      let faturaKaynakli = recete.length > 0
      const porsiyonMaliyet = recete.reduce((a, r) => {
        const { maliyet, kaynak } = hammaddeMaliyetiBul(r.hammaddeler)
        if (kaynak !== 'fatura') faturaKaynakli = false
        const netMiktar = r.miktar * (1 + (r.fire_orani || 0) / 100)
        return a + maliyet * netMiktar
      }, 0)

      const toplamMaliyet = +(porsiyonMaliyet * u.toplamAdet).toFixed(2)
      const birimSatisFiyati = u.toplamAdet ? +(u.toplamSatisTutar / u.toplamAdet).toFixed(2) : 0
      const birimSatisKDVHaric = +(birimSatisFiyati * 100 / (100 + kdvOrani)).toFixed(2)

      const brutKar = +(satirSatisKDVHaric - toplamMaliyet).toFixed(2)
      const brutKarMarji = satirSatisKDVHaric > 0 ? +((brutKar / satirSatisKDVHaric) * 100).toFixed(1) : 0
      const kdvDahilKar = +(satirSatisKDVDahil - toplamMaliyet).toFixed(2)

      return {
        ...u,
        maliyetKaynagi: recete.length === 0 ? 'yok' : faturaKaynakli ? 'fatura' : 'karma', // karma: bazı hammaddeler hiç fatura görmemiş, manuel fiyat kullanıldı
        satirSatisKDVDahil: +satirSatisKDVDahil.toFixed(2),
        satirSatisKDVHaric: +satirSatisKDVHaric.toFixed(2),
        satirKDV: +satirKDV.toFixed(2),
        porsiyonMaliyet: +porsiyonMaliyet.toFixed(2),
        toplamMaliyet,
        birimSatisFiyati,
        birimSatisKDVHaric,
        brutKar,
        brutKarMarji,
        kdvDahilKar,
        receteSayisi: recete.length,
      }
    })

    // Özet
    const toplamSatisKDVDahil = sonuclar.reduce((a, u) => a + u.satirSatisKDVDahil, 0)
    const toplamSatisKDVHaric = sonuclar.reduce((a, u) => a + u.satirSatisKDVHaric, 0)
    const toplamKDV = sonuclar.reduce((a, u) => a + u.satirKDV, 0)
    const toplamMaliyet = sonuclar.reduce((a, u) => a + u.toplamMaliyet, 0)
    const toplamBrutKar = sonuclar.reduce((a, u) => a + u.brutKar, 0)
    const genelKarMarji = toplamSatisKDVHaric > 0 ? +((toplamBrutKar / toplamSatisKDVHaric) * 100).toFixed(1) : 0

    return {
      urunler: sonuclar.sort((a, b) => b.brutKar - a.brutKar),
      ozet: {
        toplamSatisKDVDahil: +toplamSatisKDVDahil.toFixed(2),
        toplamSatisKDVHaric: +toplamSatisKDVHaric.toFixed(2),
        toplamKDV: +toplamKDV.toFixed(2),
        toplamMaliyet: +toplamMaliyet.toFixed(2),
        toplamBrutKar: +toplamBrutKar.toFixed(2),
        genelKarMarji,
      }
    }
  },
  // Garson bazlı satış raporu
  async garsonRaporu(baslangic, bitis, kategoriId = null) {
    // Sipariş bazlı ciro (kategori filtresi yoksa)
    const { data: siparisler } = await supabase.from('siparisler')
      .select('garson_id, garson_ad, garson, genel_toplam, created_at, masa_no, tur')
      .eq('durum', 'odendi')
      .gte('created_at', baslangic).lt('created_at', bitis)

    // Kalem bazlı satış (ürün + kategori detayı)
    let kq = supabase.from('siparis_kalemleri')
      .select('urun_ad, urun_fiyat, adet, urunler!inner(kategori_id, kategoriler(ad,emoji)), siparisler!inner(garson_id, garson_ad, garson, created_at, durum)')
      .eq('siparisler.durum', 'odendi')
      .gte('siparisler.created_at', baslangic)
      .lt('siparisler.created_at', bitis)
    if (kategoriId) kq = kq.eq('urunler.kategori_id', kategoriId)
    const { data: kalemler } = await kq

    // Garson bazlı gruplama
    const garsonlar = {}

    if (!kategoriId) {
      // Ciro topla (kategori filtresi yoksa sipariş bazlı)
      ;(siparisler || []).forEach(s => {
        const gid = s.garson_id || s.garson_ad || 'bilinmiyor'
        const gad = s.garson_ad || s.garson || 'İsim Yok'
        if (!garsonlar[gid]) {
          garsonlar[gid] = {
            id: gid, ad: gad,
            siparisSayisi: 0, toplam: 0,
            urunler: {}, kategoriler: {},
            saatDagilim: Array(24).fill(0)
          }
        }
        garsonlar[gid].siparisSayisi++
        garsonlar[gid].toplam += s.genel_toplam || 0
        const saat = new Date(s.created_at).getHours()
        garsonlar[gid].saatDagilim[saat]++
      })
    } else {
      // Kategori filtreliyse: ciro ve sipariş sayısını kalemlerden türet
      const siparisSetleri = {}
      ;(kalemler || []).forEach(k => {
        const gid = k.siparisler?.garson_id || k.siparisler?.garson_ad || 'bilinmiyor'
        const gad = k.siparisler?.garson_ad || k.siparisler?.garson || 'İsim Yok'
        if (!garsonlar[gid]) {
          garsonlar[gid] = { id: gid, ad: gad, siparisSayisi: 0, toplam: 0, urunler: {}, kategoriler: {}, saatDagilim: Array(24).fill(0) }
          siparisSetleri[gid] = new Set()
        }
        garsonlar[gid].toplam += (k.urun_fiyat||0) * (k.adet||1)
        const sId = k.siparisler?.created_at + gid
        if (!siparisSetleri[gid].has(sId)) { siparisSetleri[gid].add(sId); garsonlar[gid].siparisSayisi++ }
        const saat = new Date(k.siparisler?.created_at).getHours()
        garsonlar[gid].saatDagilim[saat]++
      })
    }

    // Ürün & kategori topla
    ;(kalemler || []).forEach(k => {
      const gid = k.siparisler?.garson_id || k.siparisler?.garson_ad || 'bilinmiyor'
      const gad = k.siparisler?.garson_ad || k.siparisler?.garson || 'İsim Yok'
      if (!garsonlar[gid]) {
        garsonlar[gid] = { id: gid, ad: gad, siparisSayisi: 0, toplam: 0, urunler: {}, kategoriler: {}, saatDagilim: Array(24).fill(0) }
      }
      const g = garsonlar[gid]
      // Ürün
      if (!g.urunler[k.urun_ad]) g.urunler[k.urun_ad] = { ad: k.urun_ad, adet: 0, toplam: 0 }
      g.urunler[k.urun_ad].adet += k.adet || 1
      g.urunler[k.urun_ad].toplam += (k.urun_fiyat || 0) * (k.adet || 1)
      // Kategori
      const kat = k.urunler?.kategoriler?.ad || 'Diğer'
      const emoji = k.urunler?.kategoriler?.emoji || '🍽️'
      if (!g.kategoriler[kat]) g.kategoriler[kat] = { ad: kat, emoji, adet: 0, toplam: 0 }
      g.kategoriler[kat].adet += k.adet || 1
      g.kategoriler[kat].toplam += (k.urun_fiyat || 0) * (k.adet || 1)
    })

    // Normalize et
    const genelToplam = Object.values(garsonlar).reduce((a, g) => a + g.toplam, 0)
    return Object.values(garsonlar).map(g => ({
      ...g,
      toplam: +g.toplam.toFixed(2),
      ort: g.siparisSayisi ? +(g.toplam / g.siparisSayisi).toFixed(2) : 0,
      pay: genelToplam ? +((g.toplam / genelToplam) * 100).toFixed(1) : 0,
      urunler: Object.values(g.urunler).sort((a, b) => b.adet - a.adet).slice(0, 10),
      kategoriler: Object.values(g.kategoriler).sort((a, b) => b.toplam - a.toplam)
    })).sort((a, b) => b.toplam - a.toplam)
  },

  async platformKarsilastirma(baslangic, bitis) {
    const { data } = await supabase.from('platform_siparisler')
      .select('platform, siparis_tutari, durum, created_at')
      .gte('created_at', baslangic).lt('created_at', bitis)
    const platformlar = {}
    ;(data||[]).forEach(s => {
      if (!platformlar[s.platform]) platformlar[s.platform] = { platform: s.platform, siparis: 0, toplam: 0, teslim: 0, iptal: 0 }
      platformlar[s.platform].siparis++
      platformlar[s.platform].toplam += s.siparis_tutari||0
      if (s.durum === 'DELIVERED') platformlar[s.platform].teslim++
      if (s.durum === 'CANCELLED') platformlar[s.platform].iptal++
    })
    return Object.values(platformlar)
  }
}
