/**
 * ResimYukleyici — Sürükle-bırak veya tıkla resim yükle
 * Ana resim + çoklu galeri resmi desteği
 *
 * Props:
 *   urunId       — ürün ID (kayıtlı ürün için)
 *   mevcutUrl    — ana resim URL'i (varsa göster)
 *   galeri       — mevcut galeri resimleri [{id, url, sira}]
 *   onAnaResim   — (url) => void — ana resim değişince
 *   onGaleriGuncelle — ([{id,url,sira}]) => void
 *   sadeceTek    — sadece 1 resim (garson view için)
 *   maxKB        — varsayılan 800
 */
import { useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { resimSikistirVeYukle, resimSil } from '../lib/resimUtils'
import toast from 'react-hot-toast'
import { ImagePlus, X, GripVertical, Star, Loader } from 'lucide-react'

export default function ResimYukleyici({
  urunId, mevcutUrl, galeri = [], onAnaResim, onGaleriGuncelle,
  sadeceTek = false, maxKB = 800
}) {
  const [yukleniyor, setYukleniyor] = useState(false)
  const [surukle, setSurukle] = useState(false)
  const inputRef = useRef()

  const dosyaIsle = useCallback(async (dosyalar) => {
    if (!dosyalar?.length) return
    const izinlenenTipler = ['image/jpeg','image/jpg','image/png','image/webp']
    
    for (const dosya of Array.from(dosyalar)) {
      if (!izinlenenTipler.includes(dosya.type)) {
        toast.error(`${dosya.name}: Sadece JPG, PNG, WebP kabul edilir`)
        continue
      }
      const maxMB = maxKB / 1024
      if (dosya.size > maxKB * 1024 * 3) { // 3x veriyoruz çünkü sıkıştırılacak
        // Çok büyük değilse devam et — yine de sıkıştırılacak
      }

      setYukleniyor(true)
      try {
        const onBildirim = `${dosya.name} sıkıştırılıyor...`
        const toastId = toast.loading(onBildirim)
        
        const { url, boyutKB } = await resimSikistirVeYukle(dosya, 'urunler', maxKB)
        toast.dismiss(toastId)

        if (sadeceTek || !mevcutUrl) {
          // Ana resim
          if (mevcutUrl) await resimSil(mevcutUrl)
          
          if (urunId) {
            await supabase.from('urunler').update({ resim_url: url }).eq('id', urunId)
            // urun_resimleri'ne de ekle (sira=0)
            await supabase.from('urun_resimleri')
              .delete().eq('urun_id', urunId).eq('sira', 0)
            await supabase.from('urun_resimleri').insert({
              urun_id: urunId, url, sira: 0, boyut_kb: boyutKB
            })
          }
          onAnaResim?.(url)
          toast.success(`Ana resim yüklendi (${boyutKB} KB)`)
        } else {
          // Galeri resmi
          const yeniSira = galeri.length
          let yeniKayd = null
          
          if (urunId) {
            const { data } = await supabase.from('urun_resimleri').insert({
              urun_id: urunId, url, sira: yeniSira, boyut_kb: boyutKB
            }).select().single()
            yeniKayd = data
          }
          
          onGaleriGuncelle?.([...galeri, { id: yeniKayd?.id, url, sira: yeniSira }])
          toast.success(`Galeri resmi eklendi (${boyutKB} KB)`)
        }
        
        if (sadeceTek) break // Tek resim modunda ilk dosyadan sonra dur
      } catch (e) {
        toast.error('Resim yüklenemedi: ' + e.message)
      } finally {
        setYukleniyor(false)
      }
    }
  }, [urunId, mevcutUrl, galeri, onAnaResim, onGaleriGuncelle, sadeceTek, maxKB])

  const galeriSil = async (item) => {
    await resimSil(item.url)
    if (urunId && item.id) {
      await supabase.from('urun_resimleri').delete().eq('id', item.id)
    }
    const yeniGaleri = galeri.filter(g => g.id !== item.id)
    onGaleriGuncelle?.(yeniGaleri)
    toast.success('Resim silindi')
  }

  const anaResimSil = async () => {
    if (!mevcutUrl) return
    await resimSil(mevcutUrl)
    if (urunId) {
      await supabase.from('urunler').update({ resim_url: null }).eq('id', urunId)
      await supabase.from('urun_resimleri').delete().eq('urun_id', urunId).eq('sira', 0)
    }
    onAnaResim?.(null)
    toast.success('Ana resim silindi')
  }

  const galeriOnaYap = async (item) => {
    // Galeri resmini ana resim yap
    const eskiAna = mevcutUrl
    
    if (urunId) {
      await supabase.from('urunler').update({ resim_url: item.url }).eq('id', urunId)
      // Eski ana resmi galeri'ye (sira=galeri.length)
      if (eskiAna) {
        const { data: eski } = await supabase.from('urun_resimleri')
          .select('id').eq('urun_id', urunId).eq('sira', 0).single()
        if (eski) await supabase.from('urun_resimleri').update({ sira: galeri.length }).eq('id', eski.id)
      }
      if (item.id) await supabase.from('urun_resimleri').update({ sira: 0 }).eq('id', item.id)
    }
    
    const yeniGaleri = galeri
      .filter(g => g.id !== item.id)
      .concat(eskiAna ? [{ id: null, url: eskiAna, sira: galeri.length }] : [])
    
    onAnaResim?.(item.url)
    onGaleriGuncelle?.(yeniGaleri)
    toast.success('Ana resim güncellendi')
  }

  return (
    <div>
      {/* Ana resim */}
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 11, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>
          Ana Resim <span style={{ color: 'var(--text3)' }}>({maxKB}KB max, garson ekranında görünür)</span>
        </label>

        {mevcutUrl ? (
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img src={mevcutUrl} alt="Ana resim"
              style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 8, border: '2px solid var(--accent)' }} />
            <button onClick={anaResimSil}
              style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%',
                background: 'var(--red)', color: '#fff', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>
              <X size={10} />
            </button>
          </div>
        ) : (
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setSurukle(true) }}
            onDragLeave={() => setSurukle(false)}
            onDrop={e => { e.preventDefault(); setSurukle(false); dosyaIsle(e.dataTransfer.files) }}
            style={{
              width: 120, height: 90, borderRadius: 8, cursor: 'pointer',
              border: `2px dashed ${surukle ? 'var(--accent)' : 'var(--border)'}`,
              background: surukle ? 'var(--accent-light)' : 'var(--surface2)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4
            }}>
            {yukleniyor
              ? <Loader size={20} style={{ animation: 'spin .6s linear infinite' }} color="var(--accent)" />
              : <><ImagePlus size={20} color="var(--text3)" /><span style={{ fontSize: 10, color: 'var(--text3)' }}>Resim Ekle</span></>
            }
          </div>
        )}
      </div>

      {/* Galeri (sadeceTek değilse) */}
      {!sadeceTek && (
        <div>
          <label style={{ fontSize: 11, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>
            Galeri Resimleri <span style={{ color: 'var(--text3)' }}>(QR menüde görünür, max 5 resim)</span>
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {galeri.map(item => (
              <div key={item.id || item.url} style={{ position: 'relative' }}>
                <img src={item.url} alt="Galeri"
                  style={{ width: 72, height: 54, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
                <button onClick={() => galeriSil(item)}
                  style={{ position: 'absolute', top: -5, right: -5, width: 16, height: 16, borderRadius: '50%',
                    background: 'var(--red)', color: '#fff', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={9} />
                </button>
                <button onClick={() => galeriOnaYap(item)} title="Ana resim yap"
                  style={{ position: 'absolute', bottom: -5, right: -5, width: 16, height: 16, borderRadius: '50%',
                    background: 'var(--amber)', color: '#fff', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Star size={8} />
                </button>
              </div>
            ))}
            {galeri.length < 5 && (
              <div onClick={() => inputRef.current?.click()} style={{
                width: 72, height: 54, borderRadius: 6, cursor: 'pointer',
                border: '2px dashed var(--border)', background: 'var(--surface2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {yukleniyor
                  ? <Loader size={14} style={{ animation: 'spin .6s linear infinite' }} color="var(--accent)" />
                  : <ImagePlus size={14} color="var(--text3)" />
                }
              </div>
            )}
          </div>
        </div>
      )}

      <input ref={inputRef} type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        multiple={!sadeceTek}
        style={{ display: 'none' }}
        onChange={e => { dosyaIsle(e.target.files); e.target.value = '' }} />
    </div>
  )
}
