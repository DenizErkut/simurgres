/**
 * resimUtils.js — Tarayıcı tarafında resim sıkıştırma + Supabase Storage yükleme
 * Canvas API kullanır, ekstra kütüphane gerektirmez
 */
import { supabase } from './supabase'

const MAX_KB = 800         // Hedef max dosya boyutu (KB)
const MAX_BOYUT = 1200     // Max genişlik/yükseklik (px)
const KALITE_BASLANGIC = 0.85

/**
 * Resmi sıkıştırır: önce boyutunu küçültür, sonra JPEG kalitesini düşürür
 * @param {File} dosya — kullanıcının seçtiği dosya
 * @param {number} maxKB — hedef maksimum KB (varsayılan 800)
 * @returns {Blob} — sıkıştırılmış JPEG blob
 */
export async function resimSikistir(dosya, maxKB = MAX_KB) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        // 1. Boyutlandır
        let { width, height } = img
        if (width > MAX_BOYUT || height > MAX_BOYUT) {
          const oran = Math.min(MAX_BOYUT / width, MAX_BOYUT / height)
          width = Math.round(width * oran)
          height = Math.round(height * oran)
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)

        // 2. Kalite döngüsü — hedef boyuta gelene kadar düşür
        let kalite = KALITE_BASLANGIC
        const dene = () => {
          canvas.toBlob(blob => {
            if (!blob) { reject(new Error('Canvas blob hatası')); return }
            const kb = blob.size / 1024
            if (kb <= maxKB || kalite <= 0.3) {
              resolve(blob)
            } else {
              kalite -= 0.1
              dene()
            }
          }, 'image/jpeg', kalite)
        }
        dene()
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(dosya)
  })
}

/**
 * Resmi Supabase Storage'a yükler ve public URL döner
 * @param {Blob|File} blob
 * @param {string} klasor — örn: 'urunler'
 * @returns {{ url: string, path: string, boyutKB: number }}
 */
export async function resimYukle(blob, klasor = 'urunler') {
  const uzanti = 'jpg'
  const dosyaAdi = `${klasor}/${Date.now()}_${Math.random().toString(36).slice(2)}.${uzanti}`

  const { data, error } = await supabase.storage
    .from('urun-resimleri')
    .upload(dosyaAdi, blob, {
      contentType: 'image/jpeg',
      cacheControl: '3600',
      upsert: false
    })

  if (error) throw new Error('Yükleme hatası: ' + error.message)

  const { data: { publicUrl } } = supabase.storage
    .from('urun-resimleri')
    .getPublicUrl(data.path)

  return {
    url: publicUrl,
    path: data.path,
    boyutKB: Math.round(blob.size / 1024)
  }
}

/**
 * Storage'dan resim sil
 * @param {string} url — public URL
 */
export async function resimSil(url) {
  try {
    // URL'den path çıkar
    const path = url.split('/urun-resimleri/')[1]
    if (!path) return
    await supabase.storage.from('urun-resimleri').remove([path])
  } catch (e) {
    console.warn('Resim silme hatası:', e.message)
  }
}

/**
 * Tek adımda: sıkıştır + yükle
 */
export async function resimSikistirVeYukle(dosya, klasor = 'urunler', maxKB = MAX_KB) {
  const sikistirilmis = await resimSikistir(dosya, maxKB)
  return resimYukle(sikistirilmis, klasor)
}
