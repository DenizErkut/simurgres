import { useState, useEffect, useCallback } from 'react'
import { urunlerApi, kategorilerApi } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Plus, Edit2, ToggleLeft, ToggleRight } from 'lucide-react'

function UrunModal({ urun, kategoriler, yazicilar, onKaydet, onKapat }) {
  const [form, setForm] = useState(urun || { ad: '', fiyat: '', emoji: '🍽️', kategori_id: kategoriler[0]?.id || '', aciklama: '', aktif: true, yazici_id: '' })

  const kaydet = async () => {
    if (!form.ad || !form.fiyat) { toast.error('Ad ve fiyat zorunlu'); return }
    await onKaydet({ ...form, fiyat: parseFloat(form.fiyat) })
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onKapat()}>
      <div className="modal">
        <div className="modal-title">{urun ? 'Ürün Düzenle' : 'Yeni Ürün'}</div>
        <div className="form-grid">
          <div className="form-row">
            <label>Emoji</label>
            <input value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))} style={{ width: 60 }} />
          </div>
          <div className="form-row">
            <label>Fiyat (₺)</label>
            <input type="number" value={form.fiyat} onChange={e => setForm(f => ({ ...f, fiyat: e.target.value }))} />
          </div>
        </div>
        <div className="form-row">
          <label>Ürün Adı</label>
          <input value={form.ad} onChange={e => setForm(f => ({ ...f, ad: e.target.value }))} placeholder="Izgara Köfte" />
        </div>
        <div className="form-row">
          <label>Kategori</label>
          <select value={form.kategori_id} onChange={e => setForm(f => ({ ...f, kategori_id: e.target.value }))}>
            {kategoriler.map(k => <option key={k.id} value={k.id}>{k.emoji} {k.ad}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label>Açıklama</label>
          <textarea rows={2} value={form.aciklama || ''} onChange={e => setForm(f => ({ ...f, aciklama: e.target.value }))} placeholder="Kısa açıklama..." />
        </div>
        {yazicilar.length > 0 && (
          <div className="form-row">
            <label>Yazıcı Yönlendirme</label>
            <select value={form.yazici_id || ''} onChange={e => setForm(f => ({ ...f, yazici_id: e.target.value }))}>
              <option value="">Kategori kuralını kullan (varsayılan)</option>
              {yazicilar.map(y => <option key={y.id} value={y.id}>{y.ad} — {y.ip}:{y.port}</option>)}
            </select>
            <span style={{ fontSize: 11, color: 'var(--text2)', marginTop: 3, display: 'block' }}>
              Bu ürün her zaman seçilen yazıcıya gider (kategori kuralını ezer)
            </span>
          </div>
        )}
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onKapat}>İptal</button>
          <button className="btn btn-primary" onClick={kaydet}>Kaydet</button>
        </div>
      </div>
    </div>
  )
}

export default function MenuPage() {
  const [urunler, setUrunler] = useState([])
  const [kategoriler, setKategoriler] = useState([])
  const [aktifKat, setAktifKat] = useState('tumu')
  const [modal, setModal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [yazicilar, setYazicilar] = useState([])

  const yukle = useCallback(async () => {
    try {
      const [u, k] = await Promise.all([urunlerApi.getAll(), kategorilerApi.getAll()])
      setUrunler(u)
      setKategoriler(k)
      // Bridge'den yazıcıları çek
      try {
        const res = await fetch('http://127.0.0.1:7779/api/yazicilar', { signal: AbortSignal.timeout(2000) })
        setYazicilar(await res.json())
      } catch { setYazicilar([]) }
    } catch (e) {
      toast.error('Menü yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { yukle() }, [yukle])

  const kaydet = async (form) => {
    try {
      if (modal.urun) {
        await urunlerApi.update(modal.urun.id, form)
        toast.success('Ürün güncellendi')
      } else {
        await urunlerApi.create(form)
        toast.success('Ürün eklendi')
      }
      setModal(null)
      yukle()
    } catch (e) {
      toast.error('Kaydedilemedi')
    }
  }

  const toggleAktif = async (urun) => {
    try {
      await urunlerApi.toggleAktif(urun.id, !urun.aktif)
      toast.success(urun.aktif ? 'Ürün pasife alındı' : 'Ürün aktif edildi')
      yukle()
    } catch (e) {
      toast.error('Güncellenemedi')
    }
  }

  const filtreli = aktifKat === 'tumu' ? urunler : urunler.filter(u => u.kategori_id === aktifKat)

  if (loading) return <div className="loading-center"><div className="spinner" /><span>Menü yükleniyor...</span></div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="pill-tabs">
          <button className={`pill ${aktifKat === 'tumu' ? 'active' : ''}`} onClick={() => setAktifKat('tumu')}>
            Tümü ({urunler.length})
          </button>
          {kategoriler.map(k => (
            <button key={k.id} className={`pill ${aktifKat === k.id ? 'active' : ''}`}
              onClick={() => setAktifKat(k.id)}>
              {k.emoji} {k.ad} ({urunler.filter(u => u.kategori_id === k.id).length})
            </button>
          ))}
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setModal({ urun: null })}>
          <Plus size={13} /> Ürün Ekle
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ paddingLeft: 16 }}>Ürün</th>
              <th>Kategori</th>
              <th>Fiyat</th>
              <th>Durum</th>
              <th style={{ paddingRight: 16 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtreli.map(u => (
              <tr key={u.id}>
                <td style={{ paddingLeft: 16 }}>
                  <span style={{ fontSize: 18, marginRight: 8 }}>{u.emoji}</span>
                  <span style={{ fontWeight: 500 }}>{u.ad}</span>
                  {u.aciklama && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{u.aciklama}</div>}
                </td>
                <td>
                  <span className="badge badge-gray">
                    {u.kategoriler?.emoji} {u.kategoriler?.ad || '-'}
                  </span>
                </td>
                <td style={{ fontWeight: 600 }}>₺{u.fiyat}</td>
                <td>
                  <span className={`badge ${u.aktif ? 'badge-green' : 'badge-gray'}`}>
                    {u.aktif ? 'Aktif' : 'Pasif'}
                  </span>
                </td>
                <td style={{ paddingRight: 16 }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setModal({ urun: u })}>
                      <Edit2 size={12} /> Düzenle
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => toggleAktif(u)}>
                      {u.aktif ? <ToggleRight size={14} color="var(--green)" /> : <ToggleLeft size={14} color="var(--text3)" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <UrunModal
          urun={modal.urun}
          kategoriler={kategoriler}
          yazicilar={yazicilar}
          onKaydet={kaydet}
          onKapat={() => setModal(null)}
        />
      )}
    </div>
  )
}
