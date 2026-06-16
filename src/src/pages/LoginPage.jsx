import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const ROL_RENK = { garson: '#1D9E75', kasiyer: '#BA7517', yonetici: '#D85A30' }
const ROL_ETIKET = { garson: 'Garson', kasiyer: 'Kasiyer', yonetici: 'Yönetici' }

export default function LoginPage() {
  const { girisYap } = useAuth()
  const [kullanicilar, setKullanicilar] = useState([])
  const [secili, setSecili] = useState(null)
  const [pin, setPin] = useState('')
  const [hata, setHata] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)

  useEffect(() => {
    supabase.from('kullanicilar')
      .select('id, kullanici_adi, ad_soyad, rol, renk, emoji, aktif')
      .eq('aktif', true)
      .order('rol')
      .then(({ data }) => setKullanicilar(data || []))
  }, [])

  const kullaniciSec = (k) => {
    setSecili(k)
    setPin('')
    setHata('')
  }

  const pinGir = async (rakam) => {
    if (yukleniyor) return
    const yeniPin = pin + rakam
    setPin(yeniPin)
    setHata('')
    if (yeniPin.length === 4) {
      setYukleniyor(true)
      try {
        await girisYap(secili.id, yeniPin)
        toast.success(`Hoş geldin, ${secili.ad_soyad}!`)
      } catch {
        setHata('PIN hatalı, tekrar deneyin')
        setPin('')
      } finally {
        setYukleniyor(false)
      }
    }
  }

  const pinSil = () => { setPin(p => p.slice(0, -1)); setHata('') }
  const geriDon = () => { setSecili(null); setPin(''); setHata('') }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', background: 'var(--accent)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26, marginBottom: 10
        }}>🍽️</div>
        <div style={{ fontSize: 24, fontWeight: 700 }}>SimurgRes</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>Restoran Yönetim Sistemi</div>
      </div>

      {!secili ? (
        /* KULLANICI SEÇİM EKRANI */
        <div style={{ width: '100%', maxWidth: 480 }}>
          <div style={{ fontSize: 13, color: 'var(--text2)', textAlign: 'center', marginBottom: 16 }}>
            Giriş yapmak için hesabınızı seçin
          </div>
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 8,
            maxHeight: 380, overflowY: 'auto',
            padding: '4px 2px'
          }}>
            {kullanicilar.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 32 }}>
                Kullanıcı yükleniyor...
              </div>
            ) : (
              kullanicilar.map(k => (
                <button key={k.id} onClick={() => kullaniciSec(k)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 18px',
                    background: 'var(--surface)',
                    border: '0.5px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    cursor: 'pointer',
                    transition: 'all .15s',
                    textAlign: 'left',
                    fontFamily: 'inherit'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = k.renk || 'var(--accent)'
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}>
                  {/* Avatar */}
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: k.renk + '22',
                    border: `2px solid ${k.renk}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, flexShrink: 0
                  }}>
                    {k.emoji}
                  </div>
                  {/* Bilgi */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>{k.ad_soyad}</div>
                    <div style={{ fontSize: 12, color: k.renk || 'var(--text2)', marginTop: 2 }}>
                      {ROL_ETIKET[k.rol] || k.rol}
                    </div>
                  </div>
                  <div style={{ fontSize: 18, color: 'var(--text3)' }}>›</div>
                </button>
              ))
            )}
          </div>
        </div>
      ) : (
        /* PIN GİRİŞ EKRANI */
        <div style={{ width: '100%', maxWidth: 320 }}>
          {/* Seçili kullanıcı */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: (secili.renk || '#D85A30') + '22',
              border: `3px solid ${secili.renk || '#D85A30'}`,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, marginBottom: 10
            }}>
              {secili.emoji}
            </div>
            <div style={{ fontWeight: 700, fontSize: 17 }}>{secili.ad_soyad}</div>
            <div style={{ fontSize: 12, color: secili.renk, marginTop: 3 }}>
              {ROL_ETIKET[secili.rol]}
            </div>
          </div>

          {/* PIN göstergesi */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 24 }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{
                width: 16, height: 16, borderRadius: '50%',
                background: i < pin.length ? (secili.renk || 'var(--accent)') : 'var(--border-md)',
                transition: 'background .15s'
              }} />
            ))}
          </div>

          {hata && (
            <div style={{
              background: 'var(--red-light)', color: 'var(--red)',
              padding: '8px 12px', borderRadius: 'var(--radius)',
              fontSize: 13, textAlign: 'center', marginBottom: 16
            }}>
              {hata}
            </div>
          )}

          {/* PIN klavye */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {[1,2,3,4,5,6,7,8,9].map(n => (
              <button key={n} onClick={() => pinGir(String(n))}
                disabled={pin.length >= 4 || yukleniyor}
                style={{
                  padding: '18px 0', fontSize: 20, fontWeight: 600,
                  background: 'var(--surface)', border: '0.5px solid var(--border)',
                  borderRadius: 'var(--radius-lg)', cursor: 'pointer',
                  fontFamily: 'inherit', color: 'var(--text)',
                  transition: 'all .1s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}>
                {n}
              </button>
            ))}
            {/* Geri dön */}
            <button onClick={geriDon}
              style={{
                padding: '18px 0', fontSize: 13, color: 'var(--text2)',
                background: 'transparent', border: '0.5px solid var(--border)',
                borderRadius: 'var(--radius-lg)', cursor: 'pointer', fontFamily: 'inherit'
              }}>
              ← Geri
            </button>
            {/* 0 */}
            <button onClick={() => pinGir('0')}
              disabled={pin.length >= 4 || yukleniyor}
              style={{
                padding: '18px 0', fontSize: 20, fontWeight: 600,
                background: 'var(--surface)', border: '0.5px solid var(--border)',
                borderRadius: 'var(--radius-lg)', cursor: 'pointer',
                fontFamily: 'inherit', color: 'var(--text)'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}>
              0
            </button>
            {/* Sil */}
            <button onClick={pinSil}
              style={{
                padding: '18px 0', fontSize: 18, color: 'var(--text2)',
                background: 'transparent', border: '0.5px solid var(--border)',
                borderRadius: 'var(--radius-lg)', cursor: 'pointer', fontFamily: 'inherit'
              }}>
              ⌫
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
