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
