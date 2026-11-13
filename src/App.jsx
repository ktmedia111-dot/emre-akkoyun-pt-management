import { useEffect, useMemo, useState } from 'react'
import {
  Activity, Apple, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, CalendarDays,
  Check, ChevronDown, ChevronLeft, ChevronRight, CircleDollarSign, Clock3,
  Dumbbell, Ellipsis, FileText, Filter, LayoutDashboard, LogOut, Menu, Plus,
  Search, ShieldCheck, SlidersHorizontal, Sparkles, Users, X,
} from 'lucide-react'
import { hasSupabaseConfig, supabase } from './lib/supabase'

const sampleStudents = [
  { id:'s1', full_name:'Zeynep Kaya', email:'zeynep.kaya@gmail.com', phone:'', status:'active', goal:'Yağ yakımı', start_weight:72.4, target_weight:64, joined_on:'2025-08-14' },
  { id:'s2', full_name:'Mert Yılmaz', email:'mert.yilmaz@gmail.com', phone:'', status:'active', goal:'Kas kazanımı', start_weight:78.2, target_weight:83, joined_on:'2025-09-02' },
  { id:'s3', full_name:'Elif Demir', email:'elif.demir@gmail.com', phone:'', status:'active', goal:'Güç ve kondisyon', start_weight:61.8, target_weight:60, joined_on:'2025-09-18' },
  { id:'s4', full_name:'Can Arslan', email:'can.arslan@gmail.com', phone:'', status:'inactive', goal:'Genel sağlık', start_weight:91, target_weight:82, joined_on:'2025-10-01' },
  { id:'s5', full_name:'Derya Şahin', email:'derya.sahin@gmail.com', phone:'', status:'active', goal:'Yağ yakımı', start_weight:68.5, target_weight:60, joined_on:'2025-10-19' },
]
const sampleAppointments = [
  { id:'a1', time:'09:00', name:'Zeynep Kaya', type:'Alt vücut · Kuvvet', status:'completed', initials:'ZK', color:'peach' },
  { id:'a2', time:'10:30', name:'Mert Yılmaz', type:'Üst vücut · Hipertrofi', status:'next', initials:'MY', color:'lavender' },
  { id:'a3', time:'13:00', name:'Elif Demir', type:'Kondisyon · HIIT', status:'scheduled', initials:'ED', color:'mint' },
  { id:'a4', time:'15:30', name:'Derya Şahin', type:'Full body · Mobilite', status:'scheduled', initials:'DŞ', color:'butter' },
]
const navItems = [
  { label:'Genel Bakış', icon:LayoutDashboard }, { label:'Öğrenciler', icon:Users },
  { label:'Antrenman', icon:Dumbbell }, { label:'Beslenme', icon:Apple },
  { label:'Gelişim', icon:Activity }, { label:'Takvim', icon:CalendarDays },
  { label:'Finans', icon:CircleDollarSign },
]
const money = value => new Intl.NumberFormat('tr-TR', { style:'currency', currency:'TRY', maximumFractionDigits:0 }).format(Number(value || 0))
const initials = name => (name || '').split(' ').map(x=>x[0]).slice(0,2).join('').toLocaleUpperCase('tr-TR')
const fmtDate = value => value ? new Intl.DateTimeFormat('tr-TR',{day:'numeric',month:'short'}).format(new Date(value+'T12:00:00')) : '—'

export default function App(){
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [authReady, setAuthReady] = useState(!hasSupabaseConfig)
  const [recoveryMode, setRecoveryMode] = useState(false)
  const [students, setStudents] = useState([])
  const [payments, setPayments] = useState([])
  const [appointments, setAppointments] = useState(sampleAppointments)
  const [loading, setLoading] = useState(false)
  const [activePage, setActivePage] = useState('Genel Bakış')
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState('Bu ay')
  const [showAdd, setShowAdd] = useState(false)
  const [notice, setNotice] = useState('')
  const [mobileNav, setMobileNav] = useState(false)

  useEffect(()=>{
    if(!supabase){
      try { setStudents(JSON.parse(localStorage.getItem('pt-demo-students')) || sampleStudents) }
      catch { setStudents(sampleStudents) }
      try { setPayments(JSON.parse(localStorage.getItem('pt-demo-payments')) || []) }
      catch { setPayments([]) }
      return
    }
    let alive = true
    supabase.auth.getSession().then(({data})=>{ if(alive){ setSession(data.session); setAuthReady(true) } })
    const {data:{subscription}} = supabase.auth.onAuthStateChange((event,next)=>{
      if(event === 'PASSWORD_RECOVERY') setRecoveryMode(true)
      setSession(next)
      setAuthReady(true)
    })
    return ()=>{ alive=false; subscription.unsubscribe() }
  },[])

  useEffect(()=>{
    if(!supabase || !session) return
    let alive=true
    setLoading(true)
    const load = async()=>{
      const [{data:pr,error:prError},{data:st,error:stError},{data:pay,error:payError},{data:ap,error:apError}] = await Promise.all([
        supabase.from('profiles').select('full_name,role,avatar_url').eq('id',session.user.id).single(),
        supabase.from('students').select('*').order('created_at',{ascending:false}),
        supabase.from('payments').select('id,student_id,description,amount,status,due_date,paid_at,created_at,students(full_name)').order('created_at',{ascending:false}).limit(100),
        supabase.from('appointments').select('id,student_id,starts_at,ends_at,status,notes,students(full_name)').gte('starts_at',new Date(new Date().setHours(0,0,0,0)).toISOString()).order('starts_at').limit(6),
      ])
      if(!alive)return
      if(prError){setNotice(prError.message);setProfile(null)} else setProfile(pr)
      if(!stError)setStudents(st||[]); else setNotice(stError.message)
      if(!payError)setPayments((pay||[]).map(p=>({id:p.id,name:p.students?.full_name||'Öğrenci',date:p.due_date?fmtDate(p.due_date):'—',description:p.description,amount:p.amount,status:p.status,paid_at:p.paid_at,created_at:p.created_at,initials:initials(p.students?.full_name||''),color:'mint'})))
      if(!apError)setAppointments((ap||[]).map(a=>({id:a.id,time:new Date(a.starts_at).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'}),name:a.students?.full_name||'Öğrenci',type:a.notes||'Özel antrenman',status:a.status,initials:initials(a.students?.full_name||''),color:'peach'})))
      setLoading(false)
    }
    load()
    return ()=>{alive=false}
  },[session])

  useEffect(()=>{ if(!notice)return; const t=setTimeout(()=>setNotice(''),4500); return ()=>clearTimeout(t) },[notice])

  const activeStudents = students.filter(s=>s.status==='active').length
  const visibleStudents = useMemo(()=>students.filter(s=>`${s.full_name} ${s.email||''} ${s.goal||''}`.toLocaleLowerCase('tr-TR').includes(search.toLocaleLowerCase('tr-TR'))),[students,search])
  const dueTotal = payments.filter(p=>p.status==='pending'||p.status==='overdue').reduce((n,p)=>n+Number(p.amount||0),0)
  const receivedTotal = payments.filter(p=>p.status==='paid').reduce((n,p)=>n+Number(p.amount||0),0)

  async function createStudent(form){
    const record={...form, status:'active', joined_on:new Date().toISOString().slice(0,10)}
    if(supabase){
      const {data,error}=await supabase.from('students').insert(record).select().single()
      if(error){setNotice(error.message);return}
      setStudents([data,...students])
    } else {
      record.id=crypto.randomUUID()
      const updated=[record,...students]
      setStudents(updated); localStorage.setItem('pt-demo-students',JSON.stringify(updated))
      setNotice('Öğrenci demo modunda kaydedildi. Kalıcı kayıt için Supabase bağlantısını tamamla.')
    }
    setShowAdd(false)
  }

  async function signOut(){ if(supabase) await supabase.auth.signOut(); setSession(null); setProfile(null) }

  if(hasSupabaseConfig && recoveryMode) return <PasswordRecovery onComplete={()=>setRecoveryMode(false)} />
  if(hasSupabaseConfig && !authReady) return <div className="loading-screen"><span className="loader"/>Oturum kontrol ediliyor…</div>
  if(hasSupabaseConfig && !session) return <LoginScreen />
  if(hasSupabaseConfig && session && profile && profile.role!=='admin') return <StudentView user={session.user} profile={profile} onSignOut={signOut} />
  if(hasSupabaseConfig && session && !profile) return <div className="loading-screen"><div className="setup-card"><ShieldCheck size={26}/><h2>Hesap erişimi bekleniyor</h2><p>Hesabınız henüz bir PT profiline bağlanmadı. Emre yöneticiyse Supabase profiles tablosunda rolü admin olarak ayarlanmalı. Öğrenci erişimi için profil, öğrenci kaydıyla eşleştirilmelidir.</p><button className="btn-primary" onClick={signOut}>Çıkış yap</button></div></div>

  return <div className="app-shell">
    {mobileNav&&<button aria-label="Menüyü kapat" className="mobile-scrim" onClick={()=>setMobileNav(false)} />}
    <aside className={`sidebar ${mobileNav?'sidebar-open':''}`}>
      <div className="brand"><div className="brand-mark"><Activity size={20}/></div><div><strong>EMRE AKKOYUN</strong><span>PERSONAL TRAINER</span></div><button className="icon-btn mobile-close" onClick={()=>setMobileNav(false)}><X size={17}/></button></div>
      <div className="workspace-label">ÇALIŞMA ALANI</div>
      <nav className="nav-list">{navItems.map(({label,icon:Icon})=><button key={label} className={`nav-item ${activePage===label?'active':''}`} onClick={()=>{setActivePage(label);setMobileNav(false)}}><Icon size={18}/><span>{label}</span>{label==='Öğrenciler'&&<em>{students.length}</em>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="coach-card"><div className="coach-icon"><Sparkles size={17}/></div><strong>Bir sonraki seviyeye</strong><p>Öğrenci gelişimini düzenli ölçümle takip et.</p><button onClick={()=>setActivePage('Gelişim')}>Gelişim raporları <ArrowRight size={14}/></button></div><div className="user-mini"><div className="avatar avatar-coach">EA</div><div className="user-label"><strong>{profile?.full_name||'Emre Akkoyun'}</strong><span>{profile?.role==='admin'?'Yönetici':'PT Koçu'}</span></div><button className="icon-btn" title="Oturumu kapat" onClick={signOut}><LogOut size={16}/></button></div></div>
    </aside>
    <main className="main-content">
      <header className="topbar"><button className="icon-btn menu-toggle" onClick={()=>setMobileNav(true)} aria-label="Menüyü aç"><Menu size={20}/></button><div className="breadcrumb"><span>PT Yönetimi</span><ChevronRight size={14}/><strong>{activePage}</strong></div><div className="topbar-right"><span className={`connection ${hasSupabaseConfig?'connected':''}`}><i/>{hasSupabaseConfig?'Supabase bağlı':'Önizleme modu'}</span><button className="icon-btn notification-btn" aria-label="Bildirimler"><Bell size={18}/><i/></button><div className="avatar avatar-coach top-avatar">EA</div></div></header>
      <div className="page-wrap">
        <div className="welcome-row"><div><div className="eyebrow">13 KASIM 2026 · PERŞEMBE</div><h1>{activePage==='Genel Bakış'?'Günaydın, Emre':activePage}<span className="wave">{activePage==='Genel Bakış'?' ☀':''}</span></h1><p>{activePage==='Genel Bakış'?'Bugün öğrencilerin için güzel bir gün. İşte stüdyondaki son durum.':'Öğrenci süreçlerini tek yerden takip et ve yönet.'}</p></div><div className="welcome-actions"><button className="btn-quiet" onClick={()=>setNotice('Rapor özeti hazır olduğunda burada görüntülenecek.')}><FileText size={16}/> Rapor al</button><button className="btn-primary" onClick={()=>setShowAdd(true)}><Plus size={17}/> Öğrenci ekle</button></div></div>
        {!hasSupabaseConfig&&<div className="demo-banner"><div><Sparkles size={16}/><span><strong>Önizleme modu:</strong> örnek veriler gösteriliyor. Supabase bağlantısı eklenince kayıtlar veritabanına kaydolur.</span></div><button onClick={()=>setNotice('Kurulum adımları için README.md dosyasını aç.')}>Kurulumu gör <ArrowRight size={14}/></button></div>}
        {notice&&<div className="toast"><Check size={16}/>{notice}<button onClick={()=>setNotice('')}><X size={15}/></button></div>}
        {activePage==='Öğrenciler'?<StudentsPage students={visibleStudents} query={search} setQuery={setSearch} onAdd={()=>setShowAdd(true)} onOpen={s=>setNotice(`${s.full_name} profili yakında açılacak.`)}/>:activePage==='Genel Bakış'?<Dashboard students={students} activeStudents={activeStudents} payments={payments} appointments={appointments} receivedTotal={receivedTotal} dueTotal={dueTotal} period={period} setPeriod={setPeriod} loading={loading} onOpenStudents={()=>setActivePage('Öğrenciler')} onOpenCalendar={()=>setActivePage('Takvim')} onOpenFinances={()=>setActivePage('Finans')}/>:<ModulePage page={activePage} students={students} appointments={appointments} payments={payments} onAdd={()=>setShowAdd(true)} onNotice={setNotice}/>}
      </div>
      <footer className="footer"><span>© 2026 Emre Akkoyun PT Management</span><span><i/> Tüm sistemler çalışıyor</span></footer>
    </main>
    {showAdd&&<AddStudentModal onClose={()=>setShowAdd(false)} onSave={createStudent}/>}
  </div>
}

function LoginScreen(){
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [working,setWorking]=useState(false); const [error,setError]=useState('')
  async function login(e){e.preventDefault();setWorking(true);setError('');const {error}=await supabase.auth.signInWithPassword({email,password});if(error)setError(error.message);setWorking(false)}
  async function reset(){if(!email){setError('Önce e-posta adresini yaz.');return}setWorking(true);const redirectTo=`${window.location.origin}${import.meta.env.BASE_URL}`;const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo});setError(error?error.message:'Şifre belirleme bağlantısı e-posta adresine gönderildi.');setWorking(false)}
  return <div className="login-page"><div className="login-visual"><div className="brand"><div className="brand-mark"><Activity size={20}/></div><div><strong>EMRE AKKOYUN</strong><span>PERSONAL TRAINER</span></div></div><div className="login-art"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-sun"/><Activity size={220} strokeWidth={0.7}/><span>STRENGTH<br/>IN EVERY<br/>STEP.</span></div><div className="login-caption"><span>01 / 03</span><p>Her hedef, doğru<br/>planla başlar.</p></div></div><div className="login-form-wrap"><form className="login-form" onSubmit={login}><div className="eyebrow">HOŞ GELDİN</div><h1>Hesabına giriş yap</h1><p>Antrenman yolculuğuna kaldığın yerden devam et.</p><label>E-posta adresi<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="ornek@email.com" required autoComplete="email"/></label><label>Şifre<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password"/></label>{error&&<div className="form-error">{error}</div>}<button className="btn-primary login-submit" disabled={working}>{working?'Giriş yapılıyor…':'Giriş yap'} <ArrowRight size={16}/></button><button type="button" className="text-link" onClick={reset}>Şifremi unuttum</button><div className="secure-note"><ShieldCheck size={15}/> Hesabın güvenli Supabase girişiyle korunuyor.</div></form><div className="login-footer">© 2026 Emre Akkoyun <span>·</span> Gizlilik ve kullanım</div></div></div>
}

function PasswordRecovery({onComplete}){
  const [password,setPassword]=useState('')
  const [confirm,setConfirm]=useState('')
  const [working,setWorking]=useState(false)
  const [error,setError]=useState('')
  const [saved,setSaved]=useState(false)
  async function submit(e){
    e.preventDefault(); setError('')
    if(password.length<8){setError('Şifren en az 8 karakter olmalı.');return}
    if(password!==confirm){setError('Şifreler eşleşmiyor.');return}
    setWorking(true)
    const {error:saveError}=await supabase.auth.updateUser({password})
    if(saveError)setError(saveError.message);else setSaved(true)
    setWorking(false)
  }
  return <div className="recovery-page"><div className="recovery-brand"><div className="brand-mark"><Activity size={20}/></div><div><strong>EMRE AKKOYUN</strong><span>PERSONAL TRAINER</span></div></div><form className="recovery-card" onSubmit={submit}><div className="eyebrow">HESAP GÜVENLİĞİ</div><h1>Yeni şifreni belirle</h1><p>Belirleyeceğin şifreyle masaüstü ve mobil cihazlardan giriş yapabilirsin.</p>{!saved?<><label>Yeni şifre<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="En az 8 karakter" minLength={8} required autoComplete="new-password"/></label><label>Şifreyi tekrar yaz<input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Yeni şifreni doğrula" required autoComplete="new-password"/></label>{error&&<div className="form-error">{error}</div>}<button className="btn-primary recovery-submit" disabled={working}>{working?'Kaydediliyor…':'Şifreyi kaydet'} <ArrowRight size={16}/></button></>:<><div className="recovery-success"><Check size={17}/> Şifren kaydedildi. Artık mobil ve masaüstünde kullanabilirsin.</div><button type="button" className="btn-primary recovery-submit" onClick={onComplete}>Uygulamaya geç <ArrowRight size={16}/></button></>}</form><div className="recovery-footer">© 2026 Emre Akkoyun PT Management</div></div>
}

function Dashboard({students,activeStudents,payments,appointments,receivedTotal,dueTotal,period,setPeriod,loading,onOpenStudents,onOpenCalendar,onOpenFinances}){
 const currentWeekStart=new Date();currentWeekStart.setHours(0,0,0,0);currentWeekStart.setDate(currentWeekStart.getDate()-((currentWeekStart.getDay()+6)%7))
 const weeklyIncome=Array.from({length:12},(_,index)=>{const start=new Date(currentWeekStart);start.setDate(start.getDate()-(11-index)*7);const end=new Date(start);end.setDate(end.getDate()+7);const amount=payments.filter(p=>p.status==='paid'&&(p.paid_at||p.created_at)&&new Date(p.paid_at||p.created_at)>=start&&new Date(p.paid_at||p.created_at)<end).reduce((sum,p)=>sum+Number(p.amount||0),0);return{start,amount}})
 const max=Math.max(1,...weeklyIncome.map(w=>w.amount))
 const hasWeeklyIncome=weeklyIncome.some(w=>w.amount>0)
 const weekdays=['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];
 return <>
  <section className="stats-grid">
   <StatCard icon={Users} label="Toplam öğrenci" value={String(students.length).padStart(2,'0')} note={<><span className="up-pill"><ArrowUpRight size={12}/> 12%</span><span>geçen aya göre</span></>} tone="mint"/>
   <StatCard icon={CircleDollarSign} label="Toplam tahsilat" value={money(receivedTotal)} note={<><span className="neutral-pill">{payments.filter(p=>p.status==='paid').length} kayıt</span><span>{receivedTotal?'tahsil edildi':'henüz tahsilat yok'}</span></>} tone="gold"/>
   <StatCard icon={CalendarDays} label="Bugünkü seanslar" value={String(appointments.length).padStart(2,'0')} note={<><span className="neutral-pill">{appointments.filter(a=>a.status==='completed').length} tamamlandı</span></>} tone="lavender"/>
   <StatCard icon={Clock3} label="Bekleyen ödeme" value={money(dueTotal)} note={<><span className={dueTotal?'down-pill':'neutral-pill'}>{dueTotal?'Takip et':'0 kayıt'}</span><span>{dueTotal?'ödenmemiş bakiye':'bekleyen borç yok'}</span></>} tone="rose"/>
  </section>
  <section className="overview-grid">
   <div className="panel growth-panel"><div className="panel-head"><div><div className="panel-kicker">GENEL PERFORMANS</div><h2>Gelir görünümü</h2><p>Son 12 haftadaki tahsilatların</p></div><button className="select-btn" onClick={()=>setPeriod(period==='Bu ay'?'Son 3 ay':'Bu ay')}>{period}<ChevronDown size={14}/></button></div><div className="chart-summary"><strong>{money(receivedTotal)}</strong><span className="chart-change"><CircleDollarSign size={14}/>{payments.filter(p=>p.status==='paid').length} tahsilat</span></div>{hasWeeklyIncome?<><div className="chart"><div className="chart-y"><span>{money(max)}</span><span>{money(max*2/3)}</span><span>{money(max/3)}</span><span>₺0</span></div><div className="chart-area"><div className="chart-gridlines"><i/><i/><i/><i/></div><div className="bars">{weeklyIncome.map((week,i)=><div className="bar-col" key={i}><span className="bar" style={{height:`${Math.max(5,week.amount/max*90)}%`}}/><span className="bar-label">{week.start.toLocaleDateString('tr-TR',{month:'short',day:'numeric'})}</span></div>)}</div></div></div><div className="chart-legend"><span><i className="legend-dot current"/>Haftalık tahsilat</span></div></>:<div className="revenue-empty"><div className="empty-illustration"><CircleDollarSign size={24}/></div><strong>Henüz gelir kaydı yok</strong><span>Ödeme eklediğinde tahsilat grafiğin burada oluşacak.</span></div>}</div>
   <div className="panel appointments-panel"><div className="panel-head compact"><div><div className="panel-kicker">13 KASIM, PERŞEMBE</div><h2>Günün seansları</h2></div><button className="icon-btn" onClick={onOpenCalendar} aria-label="Takvimi aç"><ArrowRight size={17}/></button></div><div className="date-strip"><button aria-label="Önceki gün"><ChevronLeft size={16}/></button>{['11','12','13','14','15','16','17'].map((d,i)=><button className={d==='13'?'selected':''} key={d}><span>{['Sal','Çar','Per','Cum','Cmt','Paz','Pzt'][i]}</span><b>{d}</b></button>)}<button aria-label="Sonraki gün"><ChevronRight size={16}/></button></div><div className="appointment-list">{appointments.slice(0,4).map(a=><AppointmentRow key={a.id} item={a}/>)}</div><button className="panel-link" onClick={onOpenCalendar}>Tüm takvimi görüntüle <ArrowRight size={14}/></button></div>
  </section>
  <section className="bottom-grid"><div className="panel students-panel"><div className="panel-head"><div><div className="panel-kicker">ÖĞRENCİ TAKİBİ</div><h2>Öğrencilerin</h2><p>Aktif öğrenci ilerlemesi</p></div><button className="panel-link inline" onClick={onOpenStudents}>Tümünü gör <ArrowRight size={14}/></button></div><div className="student-table-wrap"><table className="student-table"><thead><tr><th>ÖĞRENCİ</th><th>HEDEF</th><th>İLERLEME</th><th>DURUM</th></tr></thead><tbody>{students.slice(0,4).map((s,i)=><tr key={s.id}><td><div className="person-cell"><div className={`avatar avatar-${['peach','lavender','mint','butter'][i%4]}`}>{initials(s.full_name)}</div><div><strong>{s.full_name}</strong><span>{s.email||'PT öğrencisi'}</span></div></div></td><td><span className="goal-tag">{s.goal||'Genel sağlık'}</span></td><td><div className="progress-cell"><div className="progress-line"><i style={{width:`${[68,42,83,56][i]}%`}}/></div><span>{[68,42,83,56][i]}%</span></div></td><td><span className={`status ${s.status==='active'?'status-active':'status-inactive'}`}><i/>{s.status==='active'?'Aktif':'Pasif'}</span></td></tr>)}</tbody></table>{!students.length&&<EmptyState text="Henüz öğrenci kaydı yok."/>}</div><div className="student-list-footer"><span><b>{activeStudents}</b> aktif öğrenci</span><button onClick={onOpenStudents}>Öğrenci yönetimine git <ArrowRight size={14}/></button></div></div>
   <div className="panel payments-panel"><div className="panel-head compact"><div><div className="panel-kicker">FİNANSAL DURUM</div><h2>Son ödemeler</h2></div><button className="icon-btn" onClick={onOpenFinances} aria-label="Finans sayfası"><ArrowRight size={17}/></button></div><div className="payments-total"><div><span>Toplam tahsilat</span><strong>{money(receivedTotal)}</strong></div><div className="total-icon"><CircleDollarSign size={20}/></div></div><div className="payment-list">{payments.slice(0,3).map(p=><div className="payment-row" key={p.id}><div className={`avatar avatar-${p.color||'mint'}`}>{p.initials||initials(p.name)}</div><div className="payment-person"><strong>{p.name}</strong><span>{p.description} · {p.date}</span></div><div className="payment-value"><strong>{money(p.amount)}</strong><span className={`payment-state ${p.status==='paid'?'paid':''}`}>{p.status==='paid'?'Ödendi':'Bekliyor'}</span></div></div>)}{!payments.length&&<EmptyState text="Henüz ödeme kaydı yok."/>}</div><button className="panel-link" onClick={onOpenFinances}>Finans özetini gör <ArrowRight size={14}/></button></div></section>
 </>
}
function StatCard({icon:Icon,label,value,note,tone}){return <article className="stat-card"><div className="stat-top"><span>{label}</span><span className={`stat-icon ${tone}`}><Icon size={17}/></span></div><strong className="stat-value">{value}</strong><div className="stat-note">{note}</div><div className="stat-sparkline"><svg viewBox="0 0 110 28" preserveAspectRatio="none"><path d="M0 20 C13 18 15 22 24 15 S38 12 45 16 S57 20 66 11 S80 12 87 7 S100 11 110 2" fill="none" stroke="currentColor" strokeWidth="2"/></svg></div></article>}
function AppointmentRow({item}){return <div className={`appointment-row ${item.status==='next'?'next':''}`}><div className="appointment-time">{item.time}</div><div className="appointment-track"><i/></div><div className={`avatar avatar-${item.color}`}>{item.initials}</div><div className="appointment-info"><strong>{item.name}</strong><span>{item.type}</span></div>{item.status==='completed'?<span className="done-mark"><Check size={13}/></span>:item.status==='next'?<span className="now-tag">SIRADAKİ</span>:<button className="icon-btn dots-btn" aria-label="Seans seçenekleri"><Ellipsis size={17}/></button>}</div>}
function StudentsPage({students,query,setQuery,onAdd,onOpen}){return <div className="panel directory-panel"><div className="directory-head"><div><div className="panel-kicker">ÖĞRENCİ YÖNETİMİ</div><h2>Tüm öğrenciler <span>{students.length}</span></h2><p>Öğrenci kayıtlarını ve hedeflerini yönet.</p></div><button className="btn-primary" onClick={onAdd}><Plus size={17}/> Öğrenci ekle</button></div><div className="table-toolbar"><div className="search-box"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="İsim, e-posta veya hedef ara…"/></div><button className="filter-btn"><SlidersHorizontal size={16}/> Filtrele</button><button className="filter-btn only-icon"><Filter size={16}/></button></div><div className="directory-table-wrap"><table className="student-table directory-table"><thead><tr><th>ÖĞRENCİ</th><th>HEDEF</th><th>BAŞLANGIÇ</th><th>HEDEF KİLO</th><th>KAYIT TARİHİ</th><th>DURUM</th><th></th></tr></thead><tbody>{students.map((s,i)=><tr key={s.id} onClick={()=>onOpen(s)}><td><div className="person-cell"><div className={`avatar avatar-${['peach','lavender','mint','butter'][i%4]}`}>{initials(s.full_name)}</div><div><strong>{s.full_name}</strong><span>{s.email||'E-posta eklenmedi'}</span></div></div></td><td><span className="goal-tag">{s.goal||'Genel sağlık'}</span></td><td>{s.start_weight?`${s.start_weight} kg`:'—'}</td><td>{s.target_weight?`${s.target_weight} kg`:'—'}</td><td>{fmtDate(s.joined_on)}</td><td><span className={`status ${s.status==='active'?'status-active':'status-inactive'}`}><i/>{s.status==='active'?'Aktif':'Pasif'}</span></td><td><button className="icon-btn" aria-label="Öğrenci işlemleri"><Ellipsis size={17}/></button></td></tr>)}</tbody></table>{students.length===0&&<EmptyState text={query?'Aramana uygun öğrenci bulunamadı.':'Henüz öğrenci yok. İlk kaydı ekleyerek başlayabilirsin.'}/>}</div><div className="table-bottom"><span>Toplam <strong>{students.length}</strong> öğrenci</span><div><button className="page-btn" disabled><ChevronLeft size={15}/></button><button className="page-number">1</button><button className="page-btn" disabled><ChevronRight size={15}/></button></div></div></div>}
function ModulePage({page,students,appointments,payments,onAdd,onNotice}){
 const info={Antrenman:{icon:Dumbbell,title:'Antrenman planları',desc:'Kişiye özel haftalık programlar ve tamamlanan seanslar.',empty:'Öğrencilerin için antrenman programları burada görünecek.'},Beslenme:{icon:Apple,title:'Beslenme planları',desc:'Kalori, makro ve öğün planlarını yönet.',empty:'Henüz beslenme planı oluşturulmadı.'},Gelişim:{icon:Activity,title:'Gelişim takibi',desc:'Ölçüm geçmişi, vücut kompozisyonu ve fotoğraflar.',empty:'Ölçüm eklenen öğrencilerin gelişim grafikleri burada olacak.'},Takvim:{icon:CalendarDays,title:'Seans takvimi',desc:'Planlanan ve tamamlanan PT seansları.',empty:'Henüz takvim kaydı yok.'},Finans:{icon:CircleDollarSign,title:'Finans ve ödemeler',desc:'Paket satışları, tahsilatlar ve bekleyen ödemeler.',empty:'Henüz finans kaydı yok.'}}[page]||{icon:Activity,title:page,desc:'',empty:'Bu modül için kayıt bulunamadı.'};const Icon=info.icon
 return <div className="panel module-panel"><div className="module-title"><div className={`module-icon tone-${page==='Finans'?'gold':page==='Beslenme'?'mint':'lavender'}`}><Icon size={21}/></div><div><div className="panel-kicker">EMRE AKKOYUN · PT</div><h2>{info.title}</h2><p>{info.desc}</p></div><button className="btn-primary" onClick={()=>page==='Finans'?onNotice('Yeni ödeme kaydı, öğrenci profili içinden eklenebilir.'):onAdd()}><Plus size={16}/>{page==='Finans'?'Ödeme ekle':page==='Takvim'?'Seans ekle':'Yeni kayıt'}</button></div>{page==='Takvim'&&appointments.length>0?<div className="module-items">{appointments.map(a=><AppointmentRow key={a.id} item={a}/>)}</div>:page==='Finans'&&payments.length>0?<div className="module-items">{payments.map(p=><div className="payment-row" key={p.id}><div className={`avatar avatar-${p.color||'mint'}`}>{p.initials||initials(p.name)}</div><div className="payment-person"><strong>{p.name}</strong><span>{p.description} · {p.date}</span></div><div className="payment-value"><strong>{money(p.amount)}</strong><span className={`payment-state ${p.status==='paid'?'paid':''}`}>{p.status==='paid'?'Ödendi':'Bekliyor'}</span></div></div>)}</div>:<div className="module-empty"><div className="empty-illustration"><Icon size={27}/><span><Sparkles size={13}/></span></div><h3>{info.empty}</h3><p>{students.length?`${students.length} öğrenci için kayıt ekleyebilirsin.`:'Önce bir öğrenci ekleyerek başlayabilirsin.'}</p><button className="btn-quiet" onClick={()=>page==='Takvim'?onNotice('Seans oluşturma formu yakında eklenecek.'):page==='Finans'?onNotice('Ödeme eklemek için öğrenci profili adımını kullan.'):onAdd()}><Plus size={15}/>{page==='Takvim'?'Seans planla':page==='Finans'?'Ödeme kaydı ekle':'Öğrenci ekle'}</button></div>}</div>
}
function AddStudentModal({onClose,onSave}){const [form,setForm]=useState({full_name:'',email:'',phone:'',goal:'Yağ yakımı',start_weight:'',target_weight:''});const [saving,setSaving]=useState(false);function set(k,v){setForm(f=>({...f,[k]:v}))}async function submit(e){e.preventDefault();setSaving(true);await onSave({...form,start_weight:form.start_weight?Number(form.start_weight):null,target_weight:form.target_weight?Number(form.target_weight):null});setSaving(false)}return <div className="modal-scrim" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><form className="modal" onSubmit={submit}><div className="modal-head"><div><div className="panel-kicker">ÖĞRENCİ KAYDI</div><h2>Yeni öğrenci ekle</h2><p>Temel bilgileri gir, profilini daha sonra genişletebilirsin.</p></div><button type="button" className="icon-btn" onClick={onClose} aria-label="Kapat"><X size={18}/></button></div><div className="form-grid"><label className="full-field">Ad soyad<input autoFocus required value={form.full_name} onChange={e=>set('full_name',e.target.value)} placeholder="Örn. Ayşe Yılmaz"/></label><label>E-posta<input type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="ornek@email.com"/></label><label>Telefon<input type="tel" value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="05XX XXX XX XX"/></label><label className="full-field">Ana hedef<select value={form.goal} onChange={e=>set('goal',e.target.value)}><option>Yağ yakımı</option><option>Kas kazanımı</option><option>Güç ve kondisyon</option><option>Genel sağlık</option><option>Esneklik ve mobilite</option></select></label><label>Başlangıç kilosu (kg)<input type="number" min="0" step="0.1" value={form.start_weight} onChange={e=>set('start_weight',e.target.value)} placeholder="70"/></label><label>Hedef kilosu (kg)<input type="number" min="0" step="0.1" value={form.target_weight} onChange={e=>set('target_weight',e.target.value)} placeholder="65"/></label></div><div className="modal-actions"><button className="btn-quiet" type="button" onClick={onClose}>Vazgeç</button><button className="btn-primary" disabled={saving}>{saving?'Kaydediliyor…':<><Plus size={16}/> Öğrenciyi kaydet</>}</button></div></form></div>}
function StudentView({user,profile,onSignOut}){const [student,setStudent]=useState(null);const [plans,setPlans]=useState([]);const [measurements,setMeasurements]=useState([]);const [error,setError]=useState('');useEffect(()=>{let alive=true;(async()=>{const {data:st,error:e}=await supabase.from('students').select('*').eq('profile_id',user.id).single();if(!alive)return;if(e){setError('Öğrenci profili henüz hesabınla eşleştirilmemiş. Antrenörünle iletişime geç.');return}setStudent(st);const [w,m]=await Promise.all([supabase.from('workout_plans').select('*').eq('student_id',st.id).eq('active',true),supabase.from('measurements').select('*').eq('student_id',st.id).order('measured_on',{ascending:false}).limit(6)]);if(alive){setPlans(w.data||[]);setMeasurements(m.data||[])}})();return()=>{alive=false}},[user.id]);return <div className="student-portal"><header className="portal-header"><div className="brand"><div className="brand-mark"><Activity size={20}/></div><div><strong>EMRE AKKOYUN</strong><span>ÖĞRENCİ PORTALI</span></div></div><button className="btn-quiet" onClick={onSignOut}><LogOut size={16}/> Çıkış yap</button></header><main className="portal-main"><div className="eyebrow">KİŞİSEL ALANIN</div><h1>Merhaba, {profile.full_name||user.email?.split('@')[0]} 👋</h1><p className="portal-lead">Antrenman yolculuğundaki gelişmeleri buradan takip et.</p>{error?<div className="panel portal-error"><ShieldCheck size={22}/><p>{error}</p></div>:!student?<div className="loading-screen"><span className="loader"/>Profilin yükleniyor…</div>:<><div className="portal-stats"><div className="panel"><span>Başlangıç kilosu</span><strong>{student.start_weight||'—'} <small>kg</small></strong></div><div className="panel"><span>Hedef kilo</span><strong>{student.target_weight||'—'} <small>kg</small></strong></div><div className="panel"><span>Aktif program</span><strong>{plans.length} <small>plan</small></strong></div></div><div className="portal-grid"><section className="panel"><div className="panel-head"><div><div className="panel-kicker">HAFTALIK PLANIN</div><h2>Antrenman programı</h2></div></div>{plans.length?plans.map(p=><div className="portal-workout" key={p.id}><div><Dumbbell size={18}/><strong>{p.title}</strong></div>{Array.isArray(p.exercises)&&p.exercises.map((x,i)=><p key={i}>{x.name||x.exercise||JSON.stringify(x)}{x.sets?` · ${x.sets} set` :''}{x.reps?` × ${x.reps}`:''}</p>)}</div>):<EmptyState text="Henüz aktif program eklenmedi."/>}</section><section className="panel"><div className="panel-head"><div><div className="panel-kicker">SON ÖLÇÜMLER</div><h2>Gelişim geçmişi</h2></div></div>{measurements.length?measurements.map(m=><div className="measurement-row" key={m.id}><span>{fmtDate(m.measured_on)}</span><strong>{m.weight_kg?`${m.weight_kg} kg`:'Ölçüm'}</strong>{m.body_fat_pct!=null&&<em>%{m.body_fat_pct} yağ</em>}</div>):<EmptyState text="İlk ölçümün eklendiğinde burada görebilirsin."/>}</section></div></>}</main></div>}
function EmptyState({text}){return <div className="empty-state"><div><FileText size={18}/></div><span>{text}</span></div>}
