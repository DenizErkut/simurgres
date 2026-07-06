import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const ROL_RENK   = { garson: '#1D9E75', kasiyer: '#BA7517', yonetici: '#D85A30' }
const ROL_ETIKET = { garson: 'Garson',  kasiyer: 'Kasiyer', yonetici: 'Yönetici' }

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
      .order('ad_soyad')
      .then(({ data }) => setKullanicilar(data || []))
  }, [])

  const pinGir = (rakam) => {
    if (pin.length >= 4 || yukleniyor) return
    const yeniPin = pin + rakam
    setPin(yeniPin)
    setHata('')
    if (yeniPin.length === 4) girisYapPIN(yeniPin)
  }

  const girisYapPIN = async (girilenPin) => {
    setYukleniyor(true)
    const basarili = await girisYap(secili.id, girilenPin)
    if (!basarili) { setHata('Hatalı PIN'); setPin('') }
    setYukleniyor(false)
  }

  const pinSil = () => { setPin(p => p.slice(0, -1)); setHata('') }
  const geriDon = () => { setSecili(null); setPin(''); setHata('') }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 20
    }}>
      {/* Logo — tam Quapos logosu */}
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <img src="/quapos_logo_ana.png" alt="Quapos"
          style={{ width: 120, height: 120, objectFit: 'contain' }}
          onError={e => { e.target.src = '/icon-192.png' }} />
        <div style={{ fontWeight: 700, fontSize: 22, color: '#0A2342', marginTop: 8 }}>Quapos</div>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
          Mutfaktan masaya, her şey kontrolde.
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 440 }}>
        {!secili ? (
          /* Kullanıcı seçim ekranı */
          <div>
            <div style={{ fontSize: 13, color: 'var(--text2)', textAlign: 'center', marginBottom: 16 }}>
              Giriş yapmak için hesabınızı seçin
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {kullanicilar.map(k => (
                <button key={k.id} onClick={() => setSecili(k)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 16px', background: 'var(--surface)',
                    border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)',
                    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                    transition: 'all .12s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.borderColor = ROL_RENK[k.rol] }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: (k.renk || ROL_RENK[k.rol]) + '20',
                    border: `2px solid ${k.renk || ROL_RENK[k.rol]}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, flexShrink: 0
                  }}>{k.emoji || '👤'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>{k.ad_soyad}</div>
                    <div style={{ fontSize: 12, color: k.renk || ROL_RENK[k.rol], marginTop: 2 }}>
                      {ROL_ETIKET[k.rol]}
                    </div>
                  </div>
                  <span style={{ color: 'var(--text3)', fontSize: 18 }}>›</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* PIN girişi */
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{
                width: 60, height: 60, borderRadius: '50%', margin: '0 auto 10px',
                background: (secili.renk || ROL_RENK[secili.rol]) + '20',
                border: `2px solid ${secili.renk || ROL_RENK[secili.rol]}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28
              }}>{secili.emoji || '👤'}</div>
              <div style={{ fontWeight: 700, fontSize: 17 }}>{secili.ad_soyad}</div>
              <div style={{ fontSize: 12, color: secili.renk, marginTop: 3 }}>{ROL_ETIKET[secili.rol]}</div>
            </div>

            {/* PIN göstergesi */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 24 }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{
                  width: 16, height: 16, borderRadius: '50%',
                  background: i < pin.length ? (secili.renk || 'var(--accent)') : 'var(--border-md)',
                  transition: 'background .15s'
                }} />
              ))}
            </div>

            {hata && (
              <div style={{ background: 'var(--red-light)', color: 'var(--red)', padding: '8px 12px', borderRadius: 'var(--radius)', fontSize: 13, marginBottom: 16 }}>
                {hata}
              </div>
            )}

            {/* PIN klavyesi */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, maxWidth: 280, margin: '0 auto' }}>
              {['1','2','3','4','5','6','7','8','9'].map(r => (
                <button key={r} onClick={() => pinGir(r)}
                  disabled={pin.length >= 4 || yukleniyor}
                  style={{
                    padding: '18px 0', fontSize: 20, fontWeight: 600,
                    background: 'var(--surface)', border: '0.5px solid var(--border)',
                    borderRadius: 'var(--radius-lg)', cursor: 'pointer',
                    fontFamily: 'inherit', color: 'var(--text)'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}>
                  {r}
                </button>
              ))}
              <button onClick={geriDon}
                style={{ padding: '18px 0', fontSize: 13, color: 'var(--text2)', background: 'transparent', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', cursor: 'pointer', fontFamily: 'inherit' }}>
                ← Geri
              </button>
              <button onClick={() => pinGir('0')}
                disabled={pin.length >= 4 || yukleniyor}
                style={{ padding: '18px 0', fontSize: 20, fontWeight: 600, background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}>
                0
              </button>
              <button onClick={pinSil}
                style={{ padding: '18px 0', fontSize: 18, color: 'var(--text2)', background: 'transparent', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', cursor: 'pointer', fontFamily: 'inherit' }}>
                ⌫
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
