import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { UserPlus, Shield, ToggleRight, ToggleLeft, Edit2 } from 'lucide-react'
import IzinYonetimi from '../components/IzinYonetimi'

const ROL_ETIKET = { garson: 'Garson', kasiyer: 'Kasiyer', yonetici: 'Yönetici' }
const EMOJILER = ['👨‍💼','👩‍💼','🧑‍🍳','👨‍🍳','👩‍🍳','💰','🧑‍💻','👨‍💻','👩‍💻','🙋','🙋‍♀️','😊']
const RENKLER = ['#D85A30','#1D9E75','#5DCAA5','#BA7517','#534AB7','#D4537E','#378ADD','#639922']

function KullaniciModal({ kullanici, onKaydet, onKapat }) {
  const [form, setForm] = useState(kullanici || {
    kullanici_adi: '', ad_soyad: '', pin: '', rol: 'garson',
    renk: '#1D9E75', emoji: '🧑‍🍳', aktif: true
  })
  const [yukleniyor, setYukleniyor] = useState(false)

  const kaydet = async () => {
    if (!form.kullanici_adi || !form.ad_soyad || !form.pin) {
      toast.error('Tüm alanlar gerekli'); return
    }
    if (form.pin.length !== 4 || !/^\d+$/.test(form.pin)) {
      toast.error('PIN 4 haneli rakam olmalı'); return
    }
    setYukleniyor(true)
    try { await onKaydet(form) } finally { setYukleniyor(false) }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onKapat()}>
      <div className="modal">
        <div className="modal-title">{kullanici ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}</div>

        {/* Avatar önizleme */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: form.renk + '22', border: `3px solid ${form.renk}`,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 28
          }}>
            {form.emoji}
          </div>
        </div>

        {/* Emoji seç */}
        <div className="form-row">
          <label>Emoji</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {EMOJILER.map(e => (
              <button key={e} onClick={() => setForm(f => ({ ...f, emoji: e }))}
                style={{
                  width: 36, height: 36, fontSize: 20, borderRadius: 'var(--radius)',
                  border: form.emoji === e ? `2px solid ${form.renk}` : '0.5px solid var(--border)',
                  background: form.emoji === e ? form.renk + '22' : 'transparent', cursor: 'pointer'
                }}>
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Renk seç */}
        <div className="form-row">
          <label>Renk</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {RENKLER.map(r => (
              <button key={r} onClick={() => setForm(f => ({ ...f, renk: r }))}
                style={{
                  width: 28, height: 28, borderRadius: '50%', background: r, border: 'none',
                  cursor: 'pointer', outline: form.renk === r ? `3px solid ${r}` : 'none',
                  outlineOffset: 2
                }} />
            ))}
          </div>
        </div>

        <div className="form-grid">
          <div className="form-row">
            <label>Ad Soyad</label>
            <input value={form.ad_soyad} onChange={e => setForm(f => ({ ...f, ad_soyad: e.target.value }))}
              placeholder="Ali Yılmaz" />
          </div>
          <div className="form-row">
            <label>Kullanıcı Adı</label>
            <input value={form.kullanici_adi} onChange={e => setForm(f => ({ ...f, kullanici_adi: e.target.value }))}
              placeholder="ali" />
          </div>
        </div>

        <div className="form-grid">
          <div className="form-row">
            <label>PIN (4 rakam)</label>
            <input type="password" maxLength={4} value={form.pin}
              onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
              placeholder="••••" />
          </div>
          <div className="form-row">
            <label>Rol</label>
            <select value={form.rol} onChange={e => setForm(f => ({ ...f, rol: e.target.value }))}>
              <option value="garson">Garson</option>
              <option value="kasiyer">Kasiyer</option>
              <option value="yonetici">Yönetici</option>
            </select>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onKapat}>İptal</button>
          <button className="btn btn-primary" onClick={kaydet} disabled={yukleniyor}>
            {yukleniyor ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function KullanicilarPage({ embedded = false }) {
  const { kullanici: ben } = useAuth()
  
  // Sadece yönetici
  if (ben?.rol !== 'yonetici') {
    return (
      <div className="empty-state" style={{ marginTop: 60 }}>
        <p>Bu sayfayı görüntüleme yetkiniz yok</p>
      </div>
    )
  }
  const [kullanicilar, setKullanicilar] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [izinModal, setIzinModal] = useState(null)

  const yukle = useCallback(async () => {
    try {
      const { data } = await supabase.from('kullanicilar')
        .select('id, kullanici_adi, ad_soyad, rol, renk, emoji, aktif, created_at')
        .order('created_at')
      setKullanicilar(data || [])
    } catch { toast.error('Kullanıcılar yüklenemedi') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { yukle() }, [yukle])

  const kaydet = async (form) => {
    try {
      if (modal.kullanici) {
        const { error } = await supabase.from('kullanicilar').update(form).eq('id', modal.kullanici.id)
        if (error) throw error
        toast.success('Kullanıcı güncellendi')
      } else {
        const { error } = await supabase.from('kullanicilar').insert(form)
        if (error) {
          if (error.code === '23505') toast.error('Bu kullanıcı adı zaten var')
          else throw error
          return
        }
        toast.success('Kullanıcı eklendi')
      }
      setModal(null)
      yukle()
    } catch (e) { toast.error('Kaydedilemedi: ' + e.message) }
  }

  const toggleAktif = async (k) => {
    if (k.id === ben?.id) { toast.error('Kendinizi pasife alamazsınız'); return }
    await supabase.from('kullanicilar').update({ aktif: !k.aktif }).eq('id', k.id)
    toast.success(k.aktif ? 'Pasife alındı' : 'Aktif edildi')
    yukle()
  }

  if (loading) return <div className="loading-center"><div className="spinner" /></div>

  return (
    <div>
      {!embedded && (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Kullanıcı Yönetimi</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{kullanicilar.length} kullanıcı</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setModal({ kullanici: null })}>
          <UserPlus size={13} /> Kullanıcı Ekle
        </button>
      </div>
      )}
      {embedded && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
          <button className="btn btn-primary btn-sm" onClick={() => setModal({ kullanici: null })}>
            <UserPlus size={13} /> Kullanıcı Ekle
          </button>
        </div>
      )}

      {/* Kullanıcı kartları */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginBottom: 16 }}>
        {kullanicilar.map(k => (
          <div key={k.id} className="card" style={{
            opacity: k.aktif ? 1 : .5,
            borderLeft: `3px solid ${k.renk || 'var(--accent)'}`,
            padding: '14px 16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: (k.renk || '#D85A30') + '22',
                border: `2px solid ${k.renk || '#D85A30'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
              }}>
                {k.emoji}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{k.ad_soyad}</div>
                <div style={{ fontSize: 11, color: k.renk }}>{ROL_ETIKET[k.rol]}</div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>
              @{k.kullanici_adi}
              {k.id === ben?.id && <span style={{ marginLeft: 6, color: 'var(--text3)' }}>(Siz)</span>}
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <button className="btn btn-ghost btn-sm" style={{ flex: 1 }}
                onClick={() => setModal({ kullanici: k })}>
                <Edit2 size={12} /> Düzenle
              </button>
              <button className="btn btn-primary btn-sm" style={{ flex: 1, fontSize: 11 }}
                onClick={() => setIzinModal(k)}>
                <Shield size={11} /> İzinler
              </button>
              <button className="btn btn-ghost btn-sm"
                onClick={() => toggleAktif(k)} disabled={k.id === ben?.id}>
                {k.aktif ? <ToggleRight size={15} color="var(--green)" /> : <ToggleLeft size={15} color="var(--text3)" />}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Rol yetkileri */}
      <div className="card" style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Shield size={14} color="var(--accent)" />
          <span style={{ fontWeight: 500, fontSize: 13 }}>Rol Yetkileri</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, fontSize: 12 }}>
          {[
            { rol: 'Garson', color: '#1D9E75', yetki: ['Masa görüntüleme', 'Sipariş alma', 'Mutfak ekranı'] },
            { rol: 'Kasiyer', color: '#BA7517', yetki: ['Garson yetkileri', 'Hesap kapatma', 'Ödeme alma'] },
            { rol: 'Yönetici', color: '#D85A30', yetki: ['Tüm yetkiler', 'Menü yönetimi', 'Raporlar', 'Kullanıcı yönetimi'] }
          ].map(r => (
            <div key={r.rol} style={{
              padding: '10px 12px', background: 'var(--surface2)',
              borderRadius: 'var(--radius)', borderLeft: `3px solid ${r.color}`
            }}>
              <div style={{ fontWeight: 600, marginBottom: 6, color: r.color }}>{r.rol}</div>
              {r.yetki.map(y => <div key={y} style={{ color: 'var(--text2)', lineHeight: 1.8 }}>· {y}</div>)}
            </div>
          ))}
        </div>
      </div>

      {modal && <KullaniciModal kullanici={modal.kullanici} onKaydet={kaydet} onKapat={() => setModal(null)} />}
      {izinModal && <IzinYonetimi kullanici={izinModal} onKapat={() => setIzinModal(null)} />}
    </div>
  )
}
