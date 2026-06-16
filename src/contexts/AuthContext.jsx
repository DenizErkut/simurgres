import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [kullanici, setKullanici] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(true)

  useEffect(() => {
    // Session'dan kullanıcıyı geri yükle
    const kayitli = localStorage.getItem('simurgres_user')
    if (kayitli) {
      try { setKullanici(JSON.parse(kayitli)) } catch {}
    }
    setYukleniyor(false)
  }, [])

  const girisYap = async (kullaniciId, pin) => {
    const { data, error } = await supabase
      .from('kullanicilar')
      .select('*')
      .eq('id', kullaniciId)
      .eq('pin', pin)
      .eq('aktif', true)
      .single()
    if (error || !data) throw new Error('PIN hatalı')
    const { pin: _, ...guvenliData } = data
    setKullanici(guvenliData)
    localStorage.setItem('simurgres_user', JSON.stringify(guvenliData))
    return guvenliData
  }

  const cikisYap = () => {
    setKullanici(null)
    localStorage.removeItem('simurgres_user')
  }

  return (
    <AuthContext.Provider value={{ kullanici, yukleniyor, girisYap, cikisYap }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

export const ROL = { GARSON: 'garson', KASIYER: 'kasiyer', YONETICI: 'yonetici' }
