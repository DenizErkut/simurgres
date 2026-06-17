import { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { ChefHat, ShoppingBag, CreditCard, BarChart2, UtensilsCrossed, Users, LogOut, Settings, Truck, Printer } from 'lucide-react'
import { AuthProvider, useAuth, ROL } from './contexts/AuthContext'
import { IzinProvider } from './contexts/IzinContext'
import LoginPage from './pages/LoginPage'
import GarsonPage from './pages/GarsonPage'
import KDSPage from './pages/KDSPage'
import KasiyerPage from './pages/KasiyerPage'
import DashboardPage from './pages/DashboardPage'
import MenuPage from './pages/MenuPage'
import KullanicilarPage from './pages/KullanicilarPage'
import YonetimPage from './pages/YonetimPage'
import YemeksepetPage from './pages/YemeksepetPage'
import GetirPage from './pages/GetirPage'
import TrendyolPage from './pages/TrendyolPage'
import MigrosPage from './pages/MigrosPage'
import OKCPage from './pages/OKCPage'
import YaziciPage from './pages/YaziciPage'
import './index.css'

// Rol bazlı ekran tanımları
const TUM_EKRANLAR = [
  {
    id: 'garson', label: 'Garson', icon: UtensilsCrossed,
    component: GarsonPage,
    roller: [ROL.GARSON, ROL.KASIYER, ROL.YONETICI],
    renk: '#1D9E75', bg: '#E1F5EE'
  },
  {
    id: 'kds', label: 'Mutfak', icon: ChefHat,
    component: KDSPage,
    roller: [ROL.GARSON, ROL.KASIYER, ROL.YONETICI],
    renk: '#D85A30', bg: '#FAECE7'
  },
  {
    id: 'kasiyer', label: 'Kasiyer', icon: CreditCard,
    component: KasiyerPage,
    roller: [ROL.KASIYER, ROL.YONETICI],
    renk: '#BA7517', bg: '#FAEEDA'
  },
  {
    id: 'menu', label: 'Menü', icon: ShoppingBag,
    component: MenuPage,
    roller: [ROL.YONETICI],
    renk: '#534AB7', bg: '#EEEDFE'
  },
  {
    id: 'rapor', label: 'Rapor', icon: BarChart2,
    component: DashboardPage,
    roller: [ROL.YONETICI],
    renk: '#185FA5', bg: '#E6F1FB'
  },
  {
    id: 'yonetim', label: 'Yönetim', icon: Settings,
    component: YonetimPage,
    roller: [ROL.YONETICI],
    renk: '#6b6b6b', bg: '#f1efe8'
  },
  {
    id: 'yemeksepeti', label: 'Yemeksepeti', icon: Truck,
    component: YemeksepetPage,
    roller: [ROL.KASIYER, ROL.YONETICI],
    renk: '#FA0050', bg: '#FFEBF0'
  },
  {
    id: 'getir', label: 'Getir', icon: Truck,
    component: GetirPage,
    roller: [ROL.KASIYER, ROL.YONETICI],
    renk: '#5d3ebc', bg: '#EEEDFE'
  },
  {
    id: 'trendyol', label: 'Trendyol', icon: Truck,
    component: TrendyolPage,
    roller: [ROL.KASIYER, ROL.YONETICI],
    renk: '#f27a1a', bg: '#FEF3E7'
  },
  {
    id: 'migros', label: 'Migros', icon: Truck,
    component: MigrosPage,
    roller: [ROL.KASIYER, ROL.YONETICI],
    renk: '#E4002B', bg: '#FDECED'
  },
  {
    id: 'okc', label: 'ÖKC / ECR', icon: Printer,
    component: OKCPage,
    roller: [ROL.YONETICI],
    renk: '#444441', bg: '#F1EFE8'
  },
  {
    id: 'yazici', label: 'Yazıcılar', icon: Printer,
    component: YaziciPage,
    roller: [ROL.YONETICI],
    renk: '#185FA5', bg: '#E6F1FB'
  },
]


const ROL_RENK = {
  garson: '#1D9E75',
  kasiyer: '#BA7517',
  yonetici: '#D85A30'
}

const ROL_ETIKET = {
  garson: 'Garson',
  kasiyer: 'Kasiyer',
  yonetici: 'Yönetici'
}

function Clock() {
  const [saat, setSaat] = useState('')
  useEffect(() => {
    const g = () => setSaat(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }))
    g(); const id = setInterval(g, 10000); return () => clearInterval(id)
  }, [])
  return <span className="topbar-clock">{saat}</span>
}

function AppInner() {
  const { kullanici, yukleniyor, cikisYap } = useAuth()
  const [aktif, setAktif] = useState(null)

  // Kullanıcının görebileceği ekranlar
  const gorunurEkranlar = kullanici
    ? TUM_EKRANLAR.filter(e => e.roller.includes(kullanici.rol))
    : []

  // İlk erişilebilir ekranı seç
  useEffect(() => {
    if (gorunurEkranlar.length > 0 && !aktif) {
      setAktif(gorunurEkranlar[0].id)
    }
  }, [kullanici])

  // Rol değişiminde geçersiz ekran varsa sıfırla
  useEffect(() => {
    if (aktif && !gorunurEkranlar.find(e => e.id === aktif)) {
      setAktif(gorunurEkranlar[0]?.id || null)
    }
  }, [kullanici?.rol])

  if (yukleniyor) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>SimurgRes yükleniyor...</div>
        </div>
      </div>
    )
  }

  if (!kullanici) return <LoginPage />

  const AktifEkran = gorunurEkranlar.find(e => e.id === aktif)?.component

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="logo">
          <span className="logo-dot" />
          SimurgRes
        </div>

        <nav className="nav">
          {gorunurEkranlar.map(({ id, label, icon: Icon, renk, bg }) => (
            <button key={id}
              onClick={() => setAktif(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 16px',
                borderRadius: 'var(--radius)',
                border: aktif === id ? `1.5px solid ${renk}` : '1.5px solid transparent',
                background: aktif === id ? bg : 'transparent',
                cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
                fontWeight: aktif === id ? 600 : 400,
                color: aktif === id ? renk : 'var(--text2)',
                transition: 'all .15s'
              }}
              onMouseEnter={e => { if (aktif !== id) { e.currentTarget.style.background = bg; e.currentTarget.style.color = renk }}}
              onMouseLeave={e => { if (aktif !== id) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text2)' }}}>
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Clock />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'var(--accent-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 600, color: 'var(--accent)'
            }}>
              {kullanici.ad_soyad?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{kullanici.ad_soyad || kullanici.email}</div>
              <div style={{ fontSize: 11, color: ROL_RENK[kullanici.rol] || 'var(--text2)' }}>
                {ROL_ETIKET[kullanici.rol] || kullanici.rol}
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={cikisYap} title="Çıkış Yap"
              style={{ padding: '5px 7px' }}>
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      <main className="page-content">
        {AktifEkran ? <AktifEkran /> : (
          <div className="empty-state">
            <p>Erişim yetkiniz yok</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <IzinProvider>
      <Toaster position="bottom-right" toastOptions={{
        duration: 3000,
        style: { fontFamily: 'Inter, sans-serif', fontSize: 13 }
      }} />
      <AppInner />
      </IzinProvider>
    </AuthProvider>
  )
}
