/**
 * QR Menü — Müşterinin telefonunda açılan dijital menü
 * URL: /menu/:token
 * Token: masalar.qr_token kolonundan
 */
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const ALERJEN_LABEL = {
  gluten:'Gluten', sut:'Süt', yumurta:'Yumurta', balik:'Balık',
  kabuklu_deniz:'Kabuklu Deniz Ürünleri', yer_fistigi:'Yer Fıstığı',
  soya:'Soya', findik:'Fındık/Kuruyemiş', kereviz:'Kereviz',
  hardal:'Hardal', susam:'Susam', kukurtdioksit:'Kükürt Dioksit'
}

function BesinBadge({ urun }) {
  if (!urun.kalori) return null
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:6 }}>
      {[
        { label:`${urun.kalori} kcal`, renk:'#D85A30', bold:true },
        urun.protein      && { label:`P: ${urun.protein}g`,       renk:'#1D9E75' },
        urun.yag          && { label:`Y: ${urun.yag}g`,           renk:'#BA7517' },
        urun.karbonhidrat && { label:`K: ${urun.karbonhidrat}g`,  renk:'#185FA5' },
      ].filter(Boolean).map((b,i) => (
        <span key={i} style={{
          fontSize:10, padding:'2px 7px', borderRadius:10,
          background: b.renk+'18', color: b.renk,
          fontWeight: b.bold ? 700 : 500, border:`1px solid ${b.renk}30`
        }}>{b.label}</span>
      ))}
    </div>
  )
}

function AlerjenList({ alerjenler }) {
  if (!alerjenler?.length) return null
  return (
    <div style={{ marginTop:5, display:'flex', flexWrap:'wrap', gap:3 }}>
      {alerjenler.map(a => (
        <span key={a} style={{
          fontSize:9, padding:'1px 6px', borderRadius:8,
          background:'#FEF3C7', color:'#92400E', border:'1px solid #FDE68A'
        }}>⚠️ {ALERJEN_LABEL[a] || a}</span>
      ))}
    </div>
  )
}

function DiyetEtiket({ urun }) {
  const etiketler = []
  if (urun.vegan)      etiketler.push({ emoji:'🌱', label:'Vegan',       renk:'#639922' })
  if (urun.vejetaryen && !urun.vegan) etiketler.push({ emoji:'🌿', label:'Vejetaryen', renk:'#1D9E75' })
  if (urun.glutensiz)  etiketler.push({ emoji:'🚫G', label:'Glutensiz',  renk:'#534AB7' })
  if (urun.laktozsuz)  etiketler.push({ emoji:'🥛', label:'Laktozsuz',   renk:'#185FA5' })
  if (!etiketler.length) return null
  return (
    <div style={{ display:'flex', gap:4, marginTop:4 }}>
      {etiketler.map(e => (
        <span key={e.label} style={{
          fontSize:9, padding:'2px 7px', borderRadius:10,
          background:e.renk+'15', color:e.renk, border:`1px solid ${e.renk}30`
        }}>{e.emoji} {e.label}</span>
      ))}
    </div>
  )
}

export default function QRMenuPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hata, setHata] = useState(null)
  const [aktifKat, setAktifKat] = useState(null)
  const [aramaMetni, setAramaMetni] = useState('')
  const [seciliUrun, setSeciliUrun] = useState(null)

  const token = window.location.pathname.split('/menu/')[1]?.split('?')[0]

  useEffect(() => {
    const yukle = async () => {
      if (!token) { setHata('Geçersiz QR kodu'); setLoading(false); return }

      // QR token ile masayı bul
      const { data: masa } = await supabase.from('masalar')
        .select('id, no, salon_id, salonlar(ad)')
        .eq('qr_token', token).single()

      if (!masa) { setHata('Bu QR kodu geçersiz veya süresi dolmuş'); setLoading(false); return }

      // Ziyaret logu
      await supabase.from('qr_ziyaretler').insert({ masa_id: masa.id, qr_token: token })

      // Menüyü çek (aktif kategoriler + aktif ürünler)
      const { data: kategoriler } = await supabase.from('kategoriler')
        .select('*').eq('aktif', true).order('sira')

      const { data: urunler } = await supabase.from('urunler')
        .select('*').eq('aktif', true).neq('fiyat', -1).order('ad')

      // Ürün resimlerini yükle
      const urunIdler = (urunler||[]).map(u => u.id)
      let galeriMap = {}
      if (urunIdler.length > 0) {
        const { data: resimler } = await supabase.from('urun_resimleri')
          .select('urun_id, url, sira')
          .in('urun_id', urunIdler)
          .gt('sira', 0)
          .order('sira')
        ;(resimler||[]).forEach(r => {
          if (!galeriMap[r.urun_id]) galeriMap[r.urun_id] = []
          galeriMap[r.urun_id].push(r.url)
        })
      }

      setData({ masa, kategoriler: kategoriler||[], urunler: urunler||[], galeriMap })
      setAktifKat(kategoriler?.[0]?.id || null)
      setLoading(false)
    }
    yukle()
  }, [token])

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#FAF9F7' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:32, marginBottom:12 }}>🍽️</div>
        <div style={{ color:'#888', fontSize:14 }}>Menü yükleniyor...</div>
      </div>
    </div>
  )

  if (hata) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#FAF9F7' }}>
      <div style={{ textAlign:'center', padding:32 }}>
        <div style={{ fontSize:40 }}>❌</div>
        <div style={{ color:'#888', marginTop:12 }}>{hata}</div>
      </div>
    </div>
  )

  const { masa, kategoriler, urunler, galeriMap = {} } = data

  const filtreli = urunler
    .filter(u => !aktifKat || u.kategori_id === aktifKat)
    .filter(u => !aramaMetni || u.ad.toLowerCase().includes(aramaMetni.toLowerCase()))

  return (
    <div style={{ minHeight:'100vh', background:'#FAF9F7', fontFamily:'system-ui,-apple-system,sans-serif' }}>
      {/* Header */}
      <div style={{ background:'#2C2C28', color:'#fff', padding:'16px 20px', position:'sticky', top:0, zIndex:50 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontWeight:700, fontSize:18 }}>SimurgRes</div>
            <div style={{ fontSize:12, color:'#aaa', marginTop:1 }}>
              {masa.salonlar?.ad} · Masa {masa.no}
            </div>
          </div>
          <div style={{ fontSize:28 }}>🍽️</div>
        </div>
        {/* Arama */}
        <div style={{ marginTop:12, position:'relative' }}>
          <input value={aramaMetni} onChange={e => setAramaMetni(e.target.value)}
            placeholder="Menüde ara..." style={{
              width:'100%', boxSizing:'border-box',
              background:'rgba(255,255,255,.12)', border:'none',
              borderRadius:10, padding:'8px 14px', color:'#fff',
              fontSize:14, outline:'none'
            }} />
          {aramaMetni && (
            <button onClick={() => setAramaMetni('')}
              style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#aaa', cursor:'pointer', fontSize:16 }}>✕</button>
          )}
        </div>
      </div>

      {/* Kategori sekmeleri */}
      <div style={{ overflowX:'auto', background:'#fff', borderBottom:'1px solid #eee', scrollbarWidth:'none' }}>
        <div style={{ display:'flex', gap:0, minWidth:'max-content' }}>
          <button onClick={() => setAktifKat(null)}
            style={{ padding:'10px 16px', border:'none', background:'none', cursor:'pointer',
              fontSize:13, fontWeight: !aktifKat ? 700 : 400,
              color: !aktifKat ? '#D85A30' : '#555',
              borderBottom: !aktifKat ? '2px solid #D85A30' : '2px solid transparent' }}>
            Tümü
          </button>
          {kategoriler.map(k => (
            <button key={k.id} onClick={() => setAktifKat(k.id)}
              style={{ padding:'10px 16px', border:'none', background:'none', cursor:'pointer',
                fontSize:13, fontWeight: aktifKat===k.id ? 700 : 400,
                color: aktifKat===k.id ? '#D85A30' : '#555', whiteSpace:'nowrap',
                borderBottom: aktifKat===k.id ? '2px solid #D85A30' : '2px solid transparent' }}>
              {k.emoji} {k.ad}
            </button>
          ))}
        </div>
      </div>

      {/* Yasal bilgilendirme */}
      <div style={{ background:'#FFF7ED', borderBottom:'1px solid #FED7AA', padding:'8px 16px', fontSize:11, color:'#9A3412', display:'flex', gap:6, alignItems:'center' }}>
        <span>ℹ️</span>
        Kalori ve besin değerleri ortalama değerlerdir. Alerjenler ⚠️ ile işaretlenmiştir.
      </div>

      {/* Ürün listesi */}
      <div style={{ padding:'12px 16px', maxWidth:640, margin:'0 auto' }}>
        {filtreli.length === 0 && (
          <div style={{ textAlign:'center', padding:40, color:'#aaa' }}>Ürün bulunamadı</div>
        )}
        {filtreli.map(u => (
          <div key={u.id} onClick={() => setSeciliUrun(u)}
            style={{ background:'#fff', borderRadius:12, marginBottom:12,
              overflow:'hidden',
              boxShadow:'0 1px 4px rgba(0,0,0,.06)', cursor:'pointer',
              border:'1px solid #eee', transition:'transform .1s, box-shadow .1s' }}
            onTouchStart={e => e.currentTarget.style.transform='scale(.98)'}
            onTouchEnd={e => e.currentTarget.style.transform='scale(1)'}>
            {/* Ana resim */}
            {u.resim_url && (
              <div style={{ height:140, overflow:'hidden', marginBottom:0 }}>
                <img src={u.resim_url} alt={u.ad}
                  style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              </div>
            )}
            <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:14 }}>
              {u.emoji && <span style={{ fontSize:28, flexShrink:0 }}>{u.emoji}</span>}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:600, fontSize:15, color:'#1a1a1a' }}>{u.ad}</div>
                {u.aciklama && (
                  <div style={{ fontSize:12, color:'#888', marginTop:2, lineHeight:1.4 }}>{u.aciklama}</div>
                )}
                <BesinBadge urun={u} />
                <AlerjenList alerjenler={u.alerjenler} />
                <DiyetEtiket urun={u} />
              </div>
              <div style={{ fontWeight:700, fontSize:16, color:'#D85A30', flexShrink:0 }}>
                ₺{u.fiyat}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ textAlign:'center', padding:'20px 16px 32px', color:'#bbb', fontSize:11 }}>
        Bu dijital menü yasal besin değeri bilgilendirmesi kapsamında sunulmaktadır.<br/>
        Tüm değerler porsiyon başınadır.
      </div>

      {/* Ürün detay modal */}
      {seciliUrun && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', zIndex:100, display:'flex', alignItems:'flex-end' }}
          onClick={e => e.target===e.currentTarget && setSeciliUrun(null)}>
          <div style={{ background:'#fff', width:'100%', borderRadius:'20px 20px 0 0', padding:20, maxHeight:'80vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                <span style={{ fontSize:36 }}>{seciliUrun.emoji}</span>
                <div>
                  <div style={{ fontWeight:700, fontSize:18 }}>{seciliUrun.ad}</div>
                  <div style={{ fontSize:18, color:'#D85A30', fontWeight:700 }}>₺{seciliUrun.fiyat}</div>
                </div>
              </div>
              <button onClick={() => setSeciliUrun(null)} style={{ background:'#f5f5f5', border:'none', borderRadius:'50%', width:34, height:34, cursor:'pointer', fontSize:16 }}>✕</button>
            </div>

            {/* Ana resim */}
            {seciliUrun.resim_url && (
              <div style={{ borderRadius:10, overflow:'hidden', marginBottom:14, height:200 }}>
                <img src={seciliUrun.resim_url} alt={seciliUrun.ad}
                  style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              </div>
            )}

            {/* Galeri resimleri */}
            {galeriMap[seciliUrun.id]?.length > 0 && (
              <div style={{ display:'flex', gap:8, overflowX:'auto', marginBottom:14, paddingBottom:4, scrollbarWidth:'none' }}>
                {galeriMap[seciliUrun.id].map((url, i) => (
                  <img key={i} src={url} alt={`Galeri ${i+1}`}
                    style={{ width:90, height:70, objectFit:'cover', borderRadius:8, flexShrink:0, border:'1px solid #eee' }} />
                ))}
              </div>
            )}

            {seciliUrun.aciklama && (
              <p style={{ color:'#555', fontSize:14, lineHeight:1.5, marginBottom:14 }}>{seciliUrun.aciklama}</p>
            )}

            {/* Besin değerleri tablosu */}
            {seciliUrun.kalori && (
              <div style={{ background:'#FAF9F7', borderRadius:10, padding:14, marginBottom:14 }}>
                <div style={{ fontWeight:600, fontSize:13, marginBottom:10, color:'#D85A30' }}>
                  🥗 Besin Değerleri {seciliUrun.porsiyon_gram && <span style={{ fontWeight:400, color:'#888', fontSize:11 }}>({seciliUrun.porsiyon_gram}g porsiyon)</span>}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {[
                    { label:'Enerji',         val: seciliUrun.kalori,       birim:'kcal', bold:true },
                    { label:'Protein',         val: seciliUrun.protein,      birim:'g' },
                    { label:'Yağ',             val: seciliUrun.yag,          birim:'g' },
                    { label:'  - Doymuş Yağ', val: seciliUrun.doymus_yag,   birim:'g' },
                    { label:'Karbonhidrat',    val: seciliUrun.karbonhidrat, birim:'g' },
                    { label:'  - Şeker',       val: seciliUrun.seker,        birim:'g' },
                    { label:'Tuz',             val: seciliUrun.tuz,          birim:'g' },
                  ].filter(r => r.val != null).map((r,i) => (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'4px 0', borderBottom:'1px solid #eee' }}>
                      <span style={{ color:'#666' }}>{r.label}</span>
                      <span style={{ fontWeight: r.bold ? 700 : 500, color: r.bold ? '#D85A30' : '#222' }}>
                        {r.val} {r.birim}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Alerjenler */}
            {seciliUrun.alerjenler?.length > 0 && (
              <div style={{ background:'#FFF7ED', borderRadius:10, padding:14, marginBottom:14, border:'1px solid #FED7AA' }}>
                <div style={{ fontWeight:600, fontSize:13, marginBottom:8, color:'#92400E' }}>⚠️ Alerjen Bilgisi</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                  {seciliUrun.alerjenler.map(a => (
                    <span key={a} style={{ background:'#fff', border:'1px solid #F59E0B', borderRadius:8, padding:'3px 10px', fontSize:12, color:'#92400E', fontWeight:500 }}>
                      {ALERJEN_LABEL[a] || a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Diyet etiketleri */}
            <DiyetEtiket urun={seciliUrun} />
          </div>
        </div>
      )}
    </div>
  )
}
