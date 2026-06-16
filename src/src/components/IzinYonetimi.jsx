import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { Shield, ChevronDown, ChevronUp, Check, X } from 'lucide-react'

const GRUP_RENK = {
  'Sipariş':  { bg: '#E1F5EE', border: '#1D9E75', text: '#085041' },
  'Ödeme':    { bg: '#FAEEDA', border: '#BA7517', text: '#633806' },
  'Transfer': { bg: '#EEEDFE', border: '#534AB7', text: '#3C3489' },
  'Mutfak':   { bg: '#FAECE7', border: '#D85A30', text: '#993C1D' },
  'Rapor':    { bg: '#E6F1FB', border: '#185FA5', text: '#0C447C' },
  'Yönetim':  { bg: '#F1EFE8', border: '#888780', text: '#444441' },
}

export default function IzinYonetimi({ kullanici, onKapat }) {
  const { kullanici: ben } = useAuth()
  const [tanimlar, setTanimlar] = useState([])
  const [kullaniciIzinleri, setKullaniciIzinleri] = useState({})
  const [yukleniyor, setYukleniyor] = useState(true)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [acikGruplar, setAcikGruplar] = useState({})

  const yukle = useCallback(async () => {
    setYukleniyor(true)
    const [{ data: tanim }, { data: izin }] = await Promise.all([
      supabase.from('izin_tanimlari').select('*').order('sira'),
      supabase.from('kullanici_izinleri').select('izin_id, aktif').eq('kullanici_id', kullanici.id)
    ])
    setTanimlar(tanim || [])
    const map = {}
    ;(izin || []).forEach(i => { map[i.izin_id] = i.aktif })
    setKullaniciIzinleri(map)
    // Tüm grupları açık başlat
    const gruplar = {}
    ;(tanim || []).forEach(t => { gruplar[t.grup] = true })
    setAcikGruplar(gruplar)
    setYukleniyor(false)
  }, [kullanici.id])

  useEffect(() => { yukle() }, [yukle])

  const izinDegistir = async (izinId, deger) => {
    setKullaniciIzinleri(prev => ({ ...prev, [izinId]: deger }))
    const { error } = await supabase
      .from('kullanici_izinleri')
      .upsert({ kullanici_id: kullanici.id, izin_id: izinId, aktif: deger },
        { onConflict: 'kullanici_id,izin_id' })
    if (error) {
      toast.error('Kaydedilemedi')
      setKullaniciIzinleri(prev => ({ ...prev, [izinId]: !deger }))
    }
  }

  const grubaTumunuAc = async (grup, deger) => {
    const gruptakiler = tanimlar.filter(t => t.grup === grup)
    const yeniMap = { ...kullaniciIzinleri }
    gruptakiler.forEach(t => { yeniMap[t.id] = deger })
    setKullaniciIzinleri(yeniMap)
    setKaydediliyor(true)
    await Promise.all(gruptakiler.map(t =>
      supabase.from('kullanici_izinleri')
        .upsert({ kullanici_id: kullanici.id, izin_id: t.id, aktif: deger },
          { onConflict: 'kullanici_id,izin_id' })
    ))
    setKaydediliyor(false)
    toast.success(`${grup} grubu ${deger ? 'açıldı' : 'kapatıldı'}`)
  }

  const hepsiniAc = async (deger) => {
    const yeniMap = {}
    tanimlar.forEach(t => { yeniMap[t.id] = deger })
    setKullaniciIzinleri(yeniMap)
    setKaydediliyor(true)
    await Promise.all(tanimlar.map(t =>
      supabase.from('kullanici_izinleri')
        .upsert({ kullanici_id: kullanici.id, izin_id: t.id, aktif: deger },
          { onConflict: 'kullanici_id,izin_id' })
    ))
    setKaydediliyor(false)
    toast.success(deger ? 'Tüm izinler açıldı' : 'Tüm izinler kapatıldı')
  }

  // Gruplara ayır
  const gruplar = {}
  tanimlar.forEach(t => {
    if (!gruplar[t.grup]) gruplar[t.grup] = []
    gruplar[t.grup].push(t)
  })

  const aktifSayisi = Object.values(kullaniciIzinleri).filter(Boolean).length

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onKapat()}>
      <div className="modal" style={{ width: 720, maxWidth: '96vw', maxHeight: '92vh', padding: 24 }}>
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
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button className="btn btn-sm" onClick={() => hepsiniAc(true)} disabled={kaydediliyor}
              style={{ fontSize: 11, padding: '4px 10px' }}>
              <Check size={11} /> Tümünü Aç
            </button>
            <button className="btn btn-sm" onClick={() => hepsiniAc(false)} disabled={kaydediliyor}
              style={{ fontSize: 11, padding: '4px 10px' }}>
              <X size={11} /> Tümünü Kapat
            </button>
          </div>
        </div>

        {yukleniyor ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '70vh', overflowY: 'auto', paddingRight: 4 }}>
            {Object.entries(gruplar).map(([grup, izinListesi]) => {
              const renk = GRUP_RENK[grup] || GRUP_RENK['Yönetim']
              const acik = acikGruplar[grup]
              const grupAktif = izinListesi.filter(i => kullaniciIzinleri[i.id]).length
              return (
                <div key={grup} style={{ border: `0.5px solid ${renk.border}`, borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                  {/* Grup başlık */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 16px', background: renk.bg, cursor: 'pointer'
                  }} onClick={() => setAcikGruplar(p => ({ ...p, [grup]: !p[grup] }))}>
                    <Shield size={14} color={renk.border} />
                    <span style={{ fontWeight: 700, fontSize: 14, color: renk.text, flex: 1 }}>{grup}</span>
                    <span style={{ fontSize: 11, color: renk.border }}>
                      {grupAktif}/{izinListesi.length}
                    </span>
                    <button className="btn btn-sm" onClick={e => { e.stopPropagation(); grubaTumunuAc(grup, true) }}
                      style={{ fontSize: 10, padding: '2px 8px', background: renk.border, color: '#fff', border: 'none' }}>
                      Tümü Aç
                    </button>
                    <button className="btn btn-sm" onClick={e => { e.stopPropagation(); grubaTumunuAc(grup, false) }}
                      style={{ fontSize: 10, padding: '2px 8px' }}>
                      Kapat
                    </button>
                    {acik ? <ChevronUp size={14} color={renk.text} /> : <ChevronDown size={14} color={renk.text} />}
                  </div>

                  {/* İzin listesi */}
                  {acik && (
                    <div style={{ padding: '8px 0' }}>
                      {izinListesi.map(izin => {
                        const aktif = kullaniciIzinleri[izin.id] === true
                        return (
                          <div key={izin.id}
                            onClick={() => izinDegistir(izin.id, !aktif)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 14,
                              padding: '11px 16px', cursor: 'pointer', transition: 'background .1s',
                              borderBottom: '0.5px solid var(--border)'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            {/* Toggle */}
                            <div style={{
                              width: 44, height: 24, borderRadius: 12,
                              background: aktif ? renk.border : '#d0d0d0',
                              position: 'relative', transition: 'background .25s', flexShrink: 0,
                              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.15)'
                            }}>
                              <div style={{
                                width: 20, height: 20, borderRadius: '50%', background: '#fff',
                                position: 'absolute', top: 2,
                                left: aktif ? 22 : 2, transition: 'left .25s',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                              }} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 14, fontWeight: aktif ? 600 : 400, color: aktif ? 'var(--text)' : 'var(--text2)' }}>
                                {izin.label}
                              </div>
                              {izin.aciklama && (
                                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>{izin.aciklama}</div>
                              )}
                            </div>
                            <div style={{
                              width: 20, height: 20, borderRadius: '50%',
                              background: aktif ? renk.bg : 'var(--surface2)',
                              border: `1.5px solid ${aktif ? renk.border : 'var(--border-md)'}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                              {aktif && <Check size={11} color={renk.border} />}
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
