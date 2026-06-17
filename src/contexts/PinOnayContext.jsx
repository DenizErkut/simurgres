/**
 * PinOnayContext — Manager Override / PIN Doğrulama Sistemi
 * 
 * Kullanım:
 *   const { pinOnayla } = usePinOnay()
 *   
 *   // İzin kontrolü + gerekirse PIN sor
 *   const onaylandi = await pinOnayla('siparis_iptal', { masaNo: 'M5' })
 *   if (onaylandi) { // işlemi yap }
 */
import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const PinOnayContext = createContext({})

export function PinOnayProvider({ children }) {
  const { kullanici } = useAuth()
  const [modal, setModal] = useState(null)
  // { izinId, detay, resolve, reject, mod: 'override'|'zorunlu' }

  // İzin kontrol + PIN sor
  const pinOnayla = useCallback(async (izinId, detay = {}) => {
    return new Promise(async (resolve) => {
      // Kullanıcının iznini ve sifre_zorunlu durumunu çek
      const { data: izinKaydi } = await supabase
        .from('kullanici_izinleri')
        .select('aktif, sifre_zorunlu')
        .eq('kullanici_id', kullanici.id)
        .eq('izin_id', izinId)
        .single()

      const izinAktif = kullanici.rol === 'yonetici' || izinKaydi?.aktif === true
      const sifreZorunlu = izinKaydi?.sifre_zorunlu === true

      if (izinAktif && !sifreZorunlu) {
        // Yetki var, şifre zorunlu değil → direkt onayla
        resolve({ onaylandi: true, onaylayan: kullanici })
        return
      }

      // PIN modal aç
      setModal({
        izinId,
        detay,
        mod: izinAktif ? 'zorunlu' : 'override',
        // zorunlu: yetkisi var ama şifre isteniyor
        // override: yetkisi yok, yetkili birinin şifresi lazım
        resolve: async (onaylayan) => {
          setModal(null)
          if (!onaylayan) { resolve({ onaylandi: false }); return }

          // Log kaydet
          await supabase.from('pin_override_log').insert({
            islem: izinId,
            yapan_kullanici_id: kullanici.id,
            onaylayan_kullanici_id: onaylayan.id,
            masa_no: detay.masaNo || null,
            detay
          }).catch(() => {})

          resolve({ onaylandi: true, onaylayan })
        }
      })
    })
  }, [kullanici])

  return (
    <PinOnayContext.Provider value={{ pinOnayla }}>
      {children}
      {modal && <PinModal modal={modal} />}
    </PinOnayContext.Provider>
  )
}

export function usePinOnay() {
  return useContext(PinOnayContext)
}

// ─── PIN MODAL ────────────────────────────────────────────────────────────────
const IZIN_LABEL = {
  siparis_iptal: 'Sipariş İptal',
  indirim_uygula: 'İndirim Uygula',
  iade_al: 'İade Al',
  hesap_kapat: 'Hesap Kapat',
  masa_transfer: 'Masa Transferi',
  masa_birlestir: 'Masa Birleştirme',
  bolunmus_odeme: 'Bölünmüş Ödeme',
  stok_giris: 'Stok Girişi',
  fatura_giris: 'Fatura Girişi',
  menu_duzenle: 'Menü Düzenleme',
  urun_sil: 'Ürün Silme',
  rapor_gunluk: 'Raporlar',
}

function PinModal({ modal }) {
  const [pin, setPin] = useState('')
  const [hata, setHata] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)

  const islemLabel = IZIN_LABEL[modal.izinId] || modal.izinId

  const tus = (val) => {
    if (val === '⌫') { setPin(p => p.slice(0, -1)); setHata(''); return }
    if (pin.length >= 4) return
    const yeni = pin + val
    setPin(yeni)
    if (yeni.length === 4) dogrula(yeni)
  }

  const dogrula = async (girilenpIn) => {
    setYukleniyor(true); setHata('')
    try {
      // Önce bu kullanıcının PIN'i mi?
      const { data: kendiKontrol } = await supabase
        .from('kullanicilar')
        .select('id, ad_soyad, rol')
        .eq('pin', girilenpIn)
        .eq('id', modal.mod === 'zorunlu' ? modal.resolve.__kullanici_id || '' : '')
        .single()

      // Herhangi bir yetkili kullanıcının PIN'i
      const { data: kullanicilar } = await supabase
        .from('kullanicilar')
        .select('id, ad_soyad, rol, pin')
        .eq('aktif', true)

      // Override modda: yönetici veya o izne sahip biri
      // Zorunlu modda: herhangi bir kullanıcı (kendisi dahil)
      const eslesen = (kullanicilar || []).find(k => {
        if (k.pin !== girilenpIn) return false
        if (modal.mod === 'zorunlu') return true // kendisi ya da herhangi biri
        // override: yönetici veya o izne sahip biri
        return k.rol === 'yonetici'
      })

      if (eslesen) {
        modal.resolve(eslesen)
      } else {
        setHata(modal.mod === 'override' ? 'Yetkili PIN\'i geçersiz' : 'Hatalı PIN')
        setPin('')
      }
    } catch {
      setHata('Doğrulama hatası')
      setPin('')
    }
    setYukleniyor(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: 'var(--surface)', borderRadius: 16, padding: '28px 24px',
        width: 320, boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        {/* Başlık */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>
            {modal.mod === 'override' ? '🔐' : '🔑'}
          </div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>
            {modal.mod === 'override' ? 'Yönetici Onayı Gerekli' : 'PIN Doğrulama'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
            {modal.mod === 'override'
              ? `"${islemLabel}" için yönetici PIN'i girin`
              : `"${islemLabel}" için PIN doğrulayın`}
          </div>
          {modal.detay?.masaNo && (
            <div style={{ marginTop: 6, background: 'var(--surface2)', borderRadius: 8, padding: '4px 12px', display: 'inline-block', fontSize: 12, fontWeight: 500 }}>
              {modal.detay.masaNo}
            </div>
          )}
        </div>

        {/* PIN göstergesi */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              width: 14, height: 14, borderRadius: '50%',
              background: i < pin.length ? 'var(--accent)' : 'var(--border-md)',
              transition: 'all .15s'
            }} />
          ))}
        </div>

        {/* Hata */}
        {hata && (
          <div style={{ textAlign: 'center', color: 'var(--red)', fontSize: 12, marginBottom: 10, fontWeight: 500 }}>
            {hata}
          </div>
        )}

        {/* Tuş takımı */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((t, i) => (
            t === '' ? <div key={i} /> :
            <button key={i} onClick={() => tus(t)} disabled={yukleniyor}
              style={{
                padding: '16px', fontSize: 20, fontWeight: 500,
                borderRadius: 10, border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', touchAction: 'manipulation',
                background: t === '⌫' ? 'var(--surface2)' : 'var(--surface2)',
                color: 'var(--text)', transition: 'all .1s',
                userSelect: 'none'
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.93)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}>
              {t}
            </button>
          ))}
        </div>

        {/* İptal */}
        <button onClick={() => modal.resolve(null)}
          style={{
            width: '100%', padding: '12px', borderRadius: 10, border: '1px solid var(--border-md)',
            background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 13, color: 'var(--text2)'
          }}>
          İptal
        </button>
      </div>
    </div>
  )
}
