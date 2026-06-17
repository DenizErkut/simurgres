import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { Shield, ChevronDown, ChevronUp, Check, X, Lock } from 'lucide-react'

const GRUP_RENK = {
  'Sipariş':  { bg: '#E1F5EE', border: '#1D9E75', text: '#085041' },
  'Ödeme':    { bg: '#FAEEDA', border: '#BA7517', text: '#633806' },
  'Transfer': { bg: '#EEEDFE', border: '#534AB7', text: '#3C3489' },
  'Mutfak':   { bg: '#FAECE7', border: '#D85A30', text: '#993C1D' },
  'Rapor':    { bg: '#E6F1FB', border: '#185FA5', text: '#0C447C' },
  'Yönetim':  { bg: '#F1EFE8', border: '#888780', text: '#444441' },
  'Stok':     { bg: '#EAF3DE', border: '#639922', text: '#27500A' },
}

export default function IzinYonetimi({ kullanici, onKapat }) {
  const { kullanici: ben } = useAuth()
  const [tanimlar, setTanimlar] = useState([])
  const [izinMap, setIzinMap] = useState({})     // izin_id -> { aktif, sifre_zorunlu }
  const [yukleniyor, setYukleniyor] = useState(true)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [acikGruplar, setAcikGruplar] = useState({})

  const yukle = useCallback(async () => {
    setYukleniyor(true)
    const [{ data: tanim }, { data: izin }] = await Promise.all([
      supabase.from('izin_tanimlari').select('*').order('sira'),
      supabase.from('kullanici_izinleri')
        .select('izin_id, aktif, sifre_zorunlu')
        .eq('kullanici_id', kullanici.id)
    ])
    setTanimlar(tanim || [])
    const map = {}
    ;(izin || []).forEach(i => {
      map[i.izin_id] = { aktif: i.aktif, sifre_zorunlu: i.sifre_zorunlu || false }
    })
    setIzinMap(map)
    const gruplar = {}
    ;(tanim || []).forEach(t => { gruplar[t.grup] = true })
    setAcikGruplar(gruplar)
    setYukleniyor(false)
  }, [kullanici.id])

  useEffect(() => { yukle() }, [yukle])

  const kaydet = async (izinId, alan, deger) => {
    setIzinMap(prev => ({
      ...prev,
      [izinId]: { ...(prev[izinId] || {}), [alan]: deger }
    }))
    const mevcut = izinMap[izinId] || {}
    const yeni = { ...mevcut, [alan]: deger }
    const { error } = await supabase.from('kullanici_izinleri')
      .upsert({
        kullanici_id: kullanici.id, izin_id: izinId,
        aktif: yeni.aktif ?? false,
        sifre_zorunlu: yeni.sifre_zorunlu ?? false
      }, { onConflict: 'kullanici_id,izin_id' })
    if (error) {
      toast.error('Kaydedilemedi')
      setIzinMap(prev => ({ ...prev, [izinId]: mevcut }))
    }
  }

  const grubaTumunuAyarla = async (grup, alan, deger) => {
    const gruptakiler = tanimlar.filter(t => t.grup === grup)
    const yeniMap = { ...izinMap }
    gruptakiler.forEach(t => {
      yeniMap[t.id] = { ...(yeniMap[t.id] || {}), [alan]: deger }
    })
    setIzinMap(yeniMap)
    setKaydediliyor(true)
    await Promise.all(gruptakiler.map(t => {
      const mevcut = izinMap[t.id] || {}
      return supabase.from('kullanici_izinleri').upsert({
        kullanici_id: kullanici.id, izin_id: t.id,
        aktif: alan === 'aktif' ? deger : (mevcut.aktif ?? false),
        sifre_zorunlu: alan === 'sifre_zorunlu' ? deger : (mevcut.sifre_zorunlu ?? false)
      }, { onConflict: 'kullanici_id,izin_id' })
    }))
    setKaydediliyor(false)
    toast.success(`${grup}: ${alan === 'sifre_zorunlu' ? (deger ? 'Şifre zorunlu' : 'Şifre zorunlu kaldırıldı') : (deger ? 'Tümü açıldı' : 'Tümü kapatıldı')}`)
  }

  const hepsiniAyarla = async (deger) => {
    const yeniMap = {}
    tanimlar.forEach(t => { yeniMap[t.id] = { ...(izinMap[t.id] || {}), aktif: deger } })
    setIzinMap(yeniMap)
    setKaydediliyor(true)
    await Promise.all(tanimlar.map(t =>
      supabase.from('kullanici_izinleri').upsert({
        kullanici_id: kullanici.id, izin_id: t.id,
        aktif: deger, sifre_zorunlu: izinMap[t.id]?.sifre_zorunlu ?? false
      }, { onConflict: 'kullanici_id,izin_id' })
    ))
    setKaydediliyor(false)
    toast.success(deger ? 'Tüm izinler açıldı' : 'Tüm izinler kapatıldı')
  }

  const gruplar = {}
  tanimlar.forEach(t => {
    if (!gruplar[t.grup]) gruplar[t.grup] = []
    gruplar[t.grup].push(t)
  })

  const aktifSayisi = Object.values(izinMap).filter(v => v.aktif).length
  const sifreZorunluSayisi = Object.values(izinMap).filter(v => v.sifre_zorunlu).length

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onKapat()}>
      <div className="modal" style={{ width: 780, maxWidth: '96vw', maxHeight: '92vh', padding: 24 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: (kullanici.renk || '#D85A30') + '22',
            border: `2px solid ${kullanici.renk || '#D85A30'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
          }}>
            {kullanici.emoji}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{kullanici.ad_soyad}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>
              @{kullanici.kullanici_adi} · {aktifSayisi}/{tanimlar.length} izin aktif
              {sifreZorunluSayisi > 0 && <span style={{ marginLeft: 6, color: '#BA7517' }}>· 🔒 {sifreZorunluSayisi} şifre zorunlu</span>}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button className="btn btn-sm" onClick={() => hepsiniAyarla(true)} disabled={kaydediliyor}
              style={{ fontSize: 11, padding: '4px 10px' }}>
              <Check size={11} /> Tümünü Aç
            </button>
            <button className="btn btn-sm" onClick={() => hepsiniAyarla(false)} disabled={kaydediliyor}
              style={{ fontSize: 11, padding: '4px 10px' }}>
              <X size={11} /> Tümünü Kapat
            </button>
          </div>
        </div>

        {/* Sütun başlıkları */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 110px', gap: 8, padding: '6px 16px', fontSize: 11, fontWeight: 600, color: 'var(--text3)', borderBottom: '0.5px solid var(--border)', marginBottom: 6 }}>
          <span>İzin</span>
          <span style={{ textAlign: 'center' }}>Aktif</span>
          <span style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Lock size={10} /> Şifre Zorunlu
          </span>
        </div>

        {yukleniyor ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '65vh', overflowY: 'auto', paddingRight: 4 }}>
            {Object.entries(gruplar).map(([grup, izinListesi]) => {
              const renk = GRUP_RENK[grup] || GRUP_RENK['Yönetim']
              const acik = acikGruplar[grup]
              const grupAktif = izinListesi.filter(i => izinMap[i.id]?.aktif).length
              const grupSifre = izinListesi.filter(i => izinMap[i.id]?.sifre_zorunlu).length
              return (
                <div key={grup} style={{ border: `0.5px solid ${renk.border}`, borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 16px', background: renk.bg, cursor: 'pointer'
                  }} onClick={() => setAcikGruplar(p => ({ ...p, [grup]: !p[grup] }))}>
                    <Shield size={13} color={renk.border} />
                    <span style={{ fontWeight: 700, fontSize: 13, color: renk.text, flex: 1 }}>{grup}</span>
                    <span style={{ fontSize: 11, color: renk.border }}>{grupAktif}/{izinListesi.length}</span>
                    {grupSifre > 0 && <span style={{ fontSize: 10, color: '#BA7517' }}>🔒{grupSifre}</span>}
                    <button className="btn btn-sm" onClick={e => { e.stopPropagation(); grubaTumunuAyarla(grup, 'aktif', true) }}
                      style={{ fontSize: 10, padding: '2px 8px', background: renk.border, color: '#fff', border: 'none' }}>Aç</button>
                    <button className="btn btn-sm" onClick={e => { e.stopPropagation(); grubaTumunuAyarla(grup, 'aktif', false) }}
                      style={{ fontSize: 10, padding: '2px 8px' }}>Kapat</button>
                    <button className="btn btn-sm" onClick={e => { e.stopPropagation(); grubaTumunuAyarla(grup, 'sifre_zorunlu', true) }}
                      style={{ fontSize: 10, padding: '2px 8px', background: '#BA7517', color: '#fff', border: 'none' }}>
                      🔒 Hepsine Şifre
                    </button>
                    {acik ? <ChevronUp size={13} color={renk.text} /> : <ChevronDown size={13} color={renk.text} />}
                  </div>

                  {acik && (
                    <div>
                      {izinListesi.map(izin => {
                        const kaydi = izinMap[izin.id] || {}
                        const aktif = kaydi.aktif === true
                        const sifreZorunlu = kaydi.sifre_zorunlu === true
                        return (
                          <div key={izin.id} style={{
                            display: 'grid', gridTemplateColumns: '1fr 90px 110px',
                            alignItems: 'center', gap: 8,
                            padding: '10px 16px', borderBottom: '0.5px solid var(--border)',
                            background: sifreZorunlu ? '#FFFBF0' : 'transparent'
                          }}>
                            {/* İzin adı */}
                            <div>
                              <div style={{ fontSize: 13, fontWeight: aktif ? 600 : 400, color: aktif ? 'var(--text)' : 'var(--text2)' }}>
                                {sifreZorunlu && <span style={{ marginRight: 5 }}>🔒</span>}
                                {izin.label}
                              </div>
                              {izin.aciklama && (
                                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{izin.aciklama}</div>
                              )}
                            </div>

                            {/* Aktif toggle */}
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                              <div onClick={() => kaydet(izin.id, 'aktif', !aktif)}
                                style={{
                                  width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
                                  background: aktif ? renk.border : '#d0d0d0',
                                  position: 'relative', transition: 'background .2s', flexShrink: 0
                                }}>
                                <div style={{
                                  width: 20, height: 20, borderRadius: '50%', background: '#fff',
                                  position: 'absolute', top: 2,
                                  left: aktif ? 22 : 2, transition: 'left .2s',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                }} />
                              </div>
                            </div>

                            {/* Şifre Zorunlu toggle */}
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                              <button
                                onClick={() => kaydet(izin.id, 'sifre_zorunlu', !sifreZorunlu)}
                                title={sifreZorunlu ? 'Şifre zorunluluğunu kaldır' : 'Bu işlem için şifre istesin'}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 4,
                                  padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
                                  border: `1.5px solid ${sifreZorunlu ? '#BA7517' : 'var(--border-md)'}`,
                                  background: sifreZorunlu ? '#FAEEDA' : 'transparent',
                                  color: sifreZorunlu ? '#633806' : 'var(--text3)',
                                  fontFamily: 'inherit', fontSize: 11, fontWeight: sifreZorunlu ? 600 : 400,
                                  transition: 'all .15s'
                                }}>
                                <Lock size={10} />
                                {sifreZorunlu ? 'Zorunlu' : 'Opsiyonel'}
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Açıklama */}
        <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--surface2)', borderRadius: 'var(--radius)', fontSize: 12, color: 'var(--text2)' }}>
          <strong>🔒 Şifre Zorunlu:</strong> Bu seçenek işaretliyse, kullanıcının yetkisi olsa bile işlem sırasında PIN girişi istenir. Yetkisi yoksa zaten yönetici PIN'i istenir.
        </div>

        <div className="modal-footer" style={{ marginTop: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>
            {kaydediliyor ? 'Kaydediliyor...' : 'Değişiklikler otomatik kaydedilir'}
          </span>
          <button className="btn btn-primary" onClick={onKapat}>Kapat</button>
        </div>
      </div>
    </div>
  )
}
