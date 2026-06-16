import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const IzinContext = createContext({})

export function IzinProvider({ children }) {
  const { kullanici } = useAuth()
  const [izinler, setIzinler] = useState({})
  const [yukleniyor, setYukleniyor] = useState(true)

  const yukle = useCallback(async () => {
    if (!kullanici?.id) { setIzinler({}); setYukleniyor(false); return }
    const { data } = await supabase
      .from('kullanici_izinleri')
      .select('izin_id, aktif')
      .eq('kullanici_id', kullanici.id)
    const map = {}
    ;(data || []).forEach(i => { map[i.izin_id] = i.aktif })
    setIzinler(map)
    setYukleniyor(false)
  }, [kullanici?.id])

  useEffect(() => { yukle() }, [yukle])

  // izin(id) → true/false
  const izinVar = useCallback((izinId) => {
    if (kullanici?.rol === 'yonetici') return true // yönetici her zaman tam yetkili
    return izinler[izinId] === true
  }, [izinler, kullanici?.rol])

  return (
    <IzinContext.Provider value={{ izinler, izinVar, yukleniyor, yenile: yukle }}>
      {children}
    </IzinContext.Provider>
  )
}

export function useIzin() {
  return useContext(IzinContext)
}

// Kullanışlı hook - tek izin kontrolü
export function useIzinKontrol(izinId) {
  const { izinVar } = useIzin()
  return izinVar(izinId)
}
