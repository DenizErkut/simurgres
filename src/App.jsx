import { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth, ROL } from './contexts/AuthContext'
import { IzinProvider, useIzin } from './contexts/IzinContext'
import { PinOnayProvider } from './contexts/PinOnayContext'
import { TenantProvider, useTenant } from './contexts/TenantContext'
import { setTenantId } from './lib/supabase_tenant'
import LoginPage from './pages/LoginPage'
import GarsonPage from './pages/GarsonPage'
import KDSPage from './pages/KDSPage'
import KasiyerPage from './pages/KasiyerPage'
import DashboardPage from './pages/DashboardPage'
import MenuPage from './pages/MenuPage'
import FiyatGuncellePage from './pages/FiyatGuncellePage'
import KullanicilarPage from './pages/KullanicilarPage'
import YonetimPage from './pages/YonetimPage'
import YemeksepetPage from './pages/YemeksepetPage'
import GetirPage from './pages/GetirPage'
import TrendyolPage from './pages/TrendyolPage'
import MigrosPage from './pages/MigrosPage'
import OKCPage from './pages/OKCPage'
import YaziciPage from './pages/YaziciPage'
import YaziciYonlendirmePage from './pages/YaziciYonlendirmePage'
import FaturaPage from './pages/FaturaPage'
import StokPage from './pages/StokPage'
import CariPage from './pages/CariPage'
import QRYonetimPage from './pages/QRYonetimPage'
import QRMenuPage from './pages/QRMenuPage'
import ZRaporuPage from './pages/ZRaporuPage'
import RecetePage from './pages/RecetePage'
import HizliSatisPage from './pages/HizliSatisPage'
import './index.css'

const ROL_RENK   = { garson: '#1D9E75', kasiyer: '#BA7517', yonetici: '#D85A30' }
const ROL_ETIKET = { garson: 'Garson',  kasiyer: 'Kasiyer', yonetici: 'Yönetici' }

// ─── NAV YAPISI ──────────────────────────────────────────────
const NAV = [
  {
    grup: 'Operasyon',
    roller: [ROL.GARSON, ROL.KASIYER, ROL.YONETICI],
    items: [
      { id: 'garson',  label: 'Garson',  icon: 'ti-tools-kitchen-2', component: GarsonPage,  roller: [ROL.GARSON, ROL.KASIYER, ROL.YONETICI], renk: '#D85A30', bg: '#FAECE7' },
      { id: 'kds',     label: 'Mutfak',  icon: 'ti-chef-hat',        component: KDSPage,     roller: [ROL.GARSON, ROL.KASIYER, ROL.YONETICI], renk: '#1D9E75', bg: '#E1F5EE' },
      { id: 'kasiyer', label: 'Kasiyer', icon: 'ti-credit-card',     component: KasiyerPage, roller: [ROL.KASIYER, ROL.YONETICI],              renk: '#BA7517', bg: '#FAEEDA' },
      { id: 'hizlisatis', label: 'Hızlı Satış', icon: 'ti-shopping-cart', component: HizliSatisPage, roller: [ROL.KASIYER, ROL.YONETICI],       renk: '#06B6D4', bg: '#E0F7FB' },
    ]
  },
  {
    grup: 'Platformlar',
    roller: [ROL.KASIYER, ROL.YONETICI],
    items: [
      { id: 'yemeksepeti', label: 'Yemeksepeti', icon: 'ti-bike',         component: YemeksepetPage, roller: [ROL.KASIYER, ROL.YONETICI], renk: '#FA0050', bg: '#FFEBF0' },
      { id: 'getir',       label: 'Getir',        icon: 'ti-motorbike',    component: GetirPage,      roller: [ROL.KASIYER, ROL.YONETICI], renk: '#5d3ebc', bg: '#EEEDFE' },
      { id: 'trendyol',    label: 'Trendyol',     icon: 'ti-shopping-bag', component: TrendyolPage,   roller: [ROL.KASIYER, ROL.YONETICI], renk: '#f27a1a', bg: '#FEF3E7' },
      { id: 'migros',      label: 'Migros',        icon: 'ti-basket',       component: MigrosPage,     roller: [ROL.KASIYER, ROL.YONETICI], renk: '#E4002B', bg: '#FDECED' },
    ]
  },
  {
    grup: 'Raporlar',
    roller: [ROL.GARSON, ROL.KASIYER, ROL.YONETICI],
    izin: 'rapor_gunluk',
    items: [
      { id: 'rapor',    label: 'Günlük Rapor', icon: 'ti-chart-bar',    component: DashboardPage, roller: [ROL.GARSON, ROL.KASIYER, ROL.YONETICI], renk: '#185FA5', bg: '#E6F1FB', izin: 'rapor_gunluk' },
      { id: 'z_raporu', label: 'Z Raporu',     icon: 'ti-file-invoice', component: ZRaporuPage,   roller: [ROL.GARSON, ROL.KASIYER, ROL.YONETICI], renk: '#D85A30', bg: '#FAECE7', izin: 'rapor_gunluk' },
    ]
  },
  {
    grup: 'Menü',
    roller: [ROL.GARSON, ROL.KASIYER, ROL.YONETICI],
    izin: 'menu_duzenle',
    items: [
      { id: 'menu',   label: 'Ürünler',         icon: 'ti-soup',             component: MenuPage,          roller: [ROL.GARSON, ROL.KASIYER, ROL.YONETICI], renk: '#534AB7', bg: '#EEEDFE', izin: 'menu_duzenle' },
      { id: 'fiyat',  label: 'Fiyat Güncelle',  icon: 'ti-currency-lira',    component: FiyatGuncellePage, roller: [ROL.YONETICI],                           renk: '#BA7517', bg: '#FBF1E3', izin: null },
      { id: 'recete', label: 'Reçeteler',        icon: 'ti-git-branch',       component: RecetePage,        roller: [ROL.GARSON, ROL.KASIYER, ROL.YONETICI], renk: '#534AB7', bg: '#EEEDFE', izin: 'recete_goruntule' },
    ]
  },
  {
    grup: 'Stok',
    roller: [ROL.GARSON, ROL.KASIYER, ROL.YONETICI],
    izin: 'stok_goruntule',
    items: [
      { id: 'stok',   label: 'Stok Durumu',  icon: 'ti-package',      component: StokPage,      roller: [ROL.GARSON, ROL.KASIYER, ROL.YONETICI], renk: '#639922', bg: '#EAF3DE', izin: 'stok_goruntule' },
      { id: 'fatura', label: 'Fatura Girişi', icon: 'ti-file-invoice', component: FaturaPage,    roller: [ROL.GARSON, ROL.KASIYER, ROL.YONETICI], renk: '#639922', bg: '#EAF3DE', izin: 'fatura_goruntule' },
      { id: 'cari',   label: 'Cari Hesaplar', icon: 'ti-users',        component: CariPage,      roller: [ROL.YONETICI],                           renk: '#534AB7', bg: '#EEEBFA', izin: null },
      { id: 'qr',     label: 'QR Menü',       icon: 'ti-qrcode',       component: QRYonetimPage, roller: [ROL.YONETICI],                           renk: '#1D9E75', bg: '#E3F5EE', izin: null },
    ]
  },
  {
    grup: 'Sistem',
    roller: [ROL.YONETICI],
    items: [
      { id: 'yonetim',            label: 'Salonlar & Masalar', icon: 'ti-layout-sidebar', component: YonetimPage,           roller: [ROL.YONETICI], renk: '#444441', bg: '#F1EFE8' },
      { id: 'kullanicilar',       label: 'Kullanıcılar',       icon: 'ti-users',          component: KullanicilarPage,      roller: [ROL.YONETICI], renk: '#444441', bg: '#F1EFE8' },
      { id: 'yazici',             label: 'Yazıcılar',          icon: 'ti-printer',        component: YaziciPage,            roller: [ROL.YONETICI], renk: '#185FA5', bg: '#E6F1FB' },
      { id: 'yazici_yonlendirme', label: 'Yönlendirme',        icon: 'ti-arrow-fork',     component: YaziciYonlendirmePage, roller: [ROL.YONETICI], renk: '#185FA5', bg: '#E6F1FB' },
      { id: 'okc',                label: 'ÖKC / ECR',          icon: 'ti-device-desktop', component: OKCPage,               roller: [ROL.YONETICI], renk: '#444441', bg: '#F1EFE8' },
    ]
  },
]

// ─── SAAT ────────────────────────────────────────────────────
function Clock() {
  const [saat, setSaat] = useState('')
  useEffect(() => {
    const g = () => setSaat(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }))
    g(); const id = setInterval(g, 10000); return () => clearInterval(id)
  }, [])
  return <span style={{ fontSize: 12, color: 'var(--text2)', fontVariantNumeric: 'tabular-nums' }}>{saat}</span>
}

// ─── SIDEBAR ─────────────────────────────────────────────────
function Sidebar({ aktif, setAktif, kullanici, menuAcik }) {
  const { izinVar } = useIzin()
  const { cikisYap } = useAuth()
  const [acikGruplar, setAcikGruplar] = useState({ Raporlar: true, Menü: true, Stok: false, Sistem: false })
  const grupToggle = (g) => setAcikGruplar(p => ({ ...p, [g]: !p[g] }))

  return (
    <div style={{
      width: 220, background: 'var(--surface)', borderRight: '0.5px solid var(--border)',
      display: 'flex', flexDirection: 'column', height: '100vh', flexShrink: 0, overflow: 'hidden'
    }} className={`sidebar ${menuAcik ? 'sidebar-acik' : ''}`}>

      {/* Logo */}
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
        <img src="/icon-192.png" alt="Q" style={{ width: 30, height: 30, borderRadius: 7, objectFit: 'cover', flexShrink: 0 }} />
        <span style={{ fontSize: 15, fontWeight: 700, color: '#0A2342' }}>Quapos</span>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
        {NAV.map(grup => {
          if (!grup.roller.includes(kullanici.rol)) return null
          if (grup.izin && kullanici.rol !== ROL.YONETICI && !izinVar(grup.izin)) return null

          const gorunurItems = grup.items.filter(item =>
            item.roller.includes(kullanici.rol) &&
            (!item.izin || kullanici.rol === ROL.YONETICI || izinVar(item.izin))
          )
          if (gorunurItems.length === 0) return null

          const yonetimGrubu = ['Raporlar','Menü','Stok','Sistem'].includes(grup.grup)

          return (
            <div key={grup.grup} style={{ marginBottom: 2 }}>
              <button
                onClick={() => yonetimGrubu && grupToggle(grup.grup)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', padding: '6px 14px 3px',
                  background: 'transparent', border: 'none', cursor: yonetimGrubu ? 'pointer' : 'default',
                  fontFamily: 'inherit'
                }}>
                <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', flex: 1, textAlign: 'left' }}>
                  {grup.grup}
                </span>
                {yonetimGrubu && (
                  <i className={`ti ${acikGruplar[grup.grup] ? 'ti-chevron-down' : 'ti-chevron-right'}`}
                    style={{ fontSize: 12, color: 'var(--text3)' }} />
                )}
              </button>

              {(!yonetimGrubu || acikGruplar[grup.grup]) && gorunurItems.map(item => {
                const isActive = aktif === item.id
                return (
                  <button key={item.id}
                    onClick={() => setAktif(item.id)}
                    style={{
                      width: 'calc(100% - 12px)', margin: '1px 6px',
                      display: 'flex', alignItems: 'center', gap: 9,
                      padding: '7px 10px', borderRadius: 6, border: 'none',
                      background: isActive ? item.bg : 'transparent',
                      cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
                      fontWeight: isActive ? 500 : 400,
                      color: isActive ? item.renk : 'var(--text2)',
                      transition: 'all .12s', textAlign: 'left'
                    }}
                    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text)' }}}
                    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text2)' }}}>
                    <i className={`ti ${item.icon}`} style={{ fontSize: 16, width: 18, textAlign: 'center', flexShrink: 0 }} />
                    {item.label}
                  </button>
                )
              })}

              {['Operasyon','Platformlar'].includes(grup.grup) && (
                <div style={{ height: '0.5px', background: 'var(--border)', margin: '6px 0' }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Kullanıcı alanı */}
      <div style={{ borderTop: '0.5px solid var(--border)', flexShrink: 0 }}>
        <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 600, color: 'var(--accent)', flexShrink: 0
          }}>
            {kullanici.ad_soyad?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {kullanici.ad_soyad}
            </div>
            <div style={{ fontSize: 11, color: ROL_RENK[kullanici.rol] }}>{ROL_ETIKET[kullanici.rol]}</div>
          </div>
          <Clock />
        </div>
        <div style={{ padding: '0 8px 8px' }}>
          <button
            onClick={() => { if (window.confirm('Çıkış yapmak istiyor musunuz?')) cikisYap() }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '7px 0', borderRadius: 6, border: '0.5px solid var(--border-md)',
              background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 12, color: 'var(--text2)', transition: 'all .12s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--red-light)'; e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.borderColor = 'var(--red)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text2)'; e.currentTarget.style.borderColor = 'var(--border-md)' }}>
            <i className="ti ti-logout" style={{ fontSize: 14 }} />
            Çıkış Yap
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── UYGULAMA İÇERİĞİ ────────────────────────────────────────
function AppInner() {
  const { kullanici, yukleniyor } = useAuth()
  const { izinVar } = useIzin()
  const [aktif, setAktif] = useState(null)
  const [menuAcik, setMenuAcik] = useState(false)

  useEffect(() => {
    if (!kullanici || aktif) return
    for (const grup of NAV) {
      for (const item of grup.items) {
        if (item.roller.includes(kullanici.rol)) { setAktif(item.id); return }
      }
    }
  }, [kullanici])

  if (yukleniyor) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 12px' }} />
        <div style={{ fontSize: 13, color: 'var(--text2)' }}>Quapos yükleniyor...</div>
      </div>
    </div>
  )

  if (!kullanici) return <LoginPage />

  let AktifEkran = null
  for (const grup of NAV) {
    const item = grup.items.find(i => i.id === aktif)
    if (item) { AktifEkran = item.component; break }
  }

  const mobilSekimDegistir = (id) => { setAktif(id); setMenuAcik(false) }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {menuAcik && (
        <div onClick={() => setMenuAcik(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 90, display: 'none'
        }} className="mobil-overlay" />
      )}

      <Sidebar aktif={aktif} setAktif={mobilSekimDegistir} kullanici={kullanici} menuAcik={menuAcik} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="mobil-topbar">
          <button onClick={() => setMenuAcik(a => !a)} className="hamburger-btn">
            <span /><span /><span />
          </button>
          <span style={{ fontWeight: 600, fontSize: 15 }}>Quapos</span>
          <div style={{ width: 36 }} />
        </div>

        <main style={{ flex: 1, overflow: 'auto', padding: 'var(--page-padding, 16px)', background: 'var(--bg)' }}>
          {AktifEkran ? <AktifEkran /> : <div className="empty-state"><p>Erişim yetkiniz yok</p></div>}
        </main>
      </div>
    </div>
  )
}

// ─── TENANT KATMANI ───────────────────────────────────────────
function AppIleTenant() {
  const tenant = useTenant()

  useEffect(() => {
    if (tenant?.id) setTenantId(tenant.id)
  }, [tenant?.id])

  // QR menü — public route, auth gerektirmez
  if (window.location.pathname.startsWith('/menu/')) {
    return <QRMenuPage />
  }

  return (
    <AuthProvider>
      <IzinProvider>
        <PinOnayProvider>
          <Toaster
            position="bottom-right"
            toastOptions={{ duration: 3000, style: { fontFamily: 'Inter, sans-serif', fontSize: 13 } }}
          />
          <AppInner />
        </PinOnayProvider>
      </IzinProvider>
    </AuthProvider>
  )
}

// ─── ROOT ─────────────────────────────────────────────────────
export default function App() {
  return (
    <TenantProvider>
      <AppIleTenant />
    </TenantProvider>
  )
}
