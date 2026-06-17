import { useState } from 'react'
import { AuthProvider, useAuth } from './lib/AuthContext'
import AuthPage from './pages/AuthPage'
import StockPage from './pages/StockPage'
import ProductsPage from './pages/ProductsPage'
import NewDeliveryPage from './pages/NewDeliveryPage'
import RequestsPage from './pages/RequestsPage'
import NotificationsPage from './pages/NotificationsPage'
import SampleTrackingPage from './pages/SampleTrackingPage'
import ShipmentsPage from './pages/ShipmentsPage'
import ReportsPage from './pages/ReportsPage'
import StaffPage from './pages/StaffPage'
import { DeliveriesPage, DeliveryDetailPage, ProfilePage, CustomersPage } from './pages/Pages'
import { useIncomingRequests, useNotifications } from './hooks/useWarehouse'
import './index.css'

// Every feature as a section on the one page.
// `heavy: true` sections start collapsed so the page can load.
function buildSections(isAdmin) {
  return [
    { id: 'deliveries', label: 'Sample Delivery Forms', icon: '📋', heavy: false },
    { id: 'alerts',     label: 'Alerts',                icon: '🔔', heavy: false },
    { id: 'requests',   label: 'Sample Requests',       icon: '📩', heavy: false },
    { id: 'stock',      label: 'Stock Manager',         icon: '📦', heavy: true },
    { id: 'products',   label: 'Products',              icon: '🧴', heavy: true },
    { id: 'customers',  label: 'Customer Book',         icon: '🏢', heavy: true },
    { id: 'shipments',  label: 'Shipments',             icon: '✈️', heavy: true },
    { id: 'reports',    label: 'Reports',               icon: '📊', heavy: true },
    { id: 'tracking',   label: 'Sample Tracking',       icon: '🔄', heavy: true },
    ...(isAdmin ? [{ id: 'staff', label: 'Staff Directory', icon: '👥', heavy: true }] : []),
    { id: 'profile',    label: 'My Profile',            icon: '👤', heavy: false },
  ]
}

function Shell() {
  const { session, profile } = useAuth()
  const [view, setView]         = useState('list')   // list | new | detail
  const [detailId, setDetailId] = useState(null)

  const isAdmin = profile?.role === 'admin'
  const sections = buildSections(isAdmin)

  // Track which sections are open. Heavy ones start closed.
  const [open, setOpen] = useState(() => {
    const init = {}
    sections.forEach(s => { init[s.id] = !s.heavy })
    return init
  })
  const toggle = (id) => setOpen(o => ({ ...o, [id]: !o[id] }))

  // Badges
  const { requests } = useIncomingRequests()
  const { notifications } = useNotifications()
  const myEmail = (profile?.email || '').toLowerCase()
  const pendingReq = requests.filter(r => (r.owner_email || '').toLowerCase() === myEmail && r.status === 'pending').length
  const unreadAlerts = notifications.filter(n => !n.read).length

  if (session === undefined) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!session) return <AuthPage />

  // Delivery form flows open as full overlays (own back button)
  if (view === 'new') return (
    <div className="min-h-screen bg-slate-100 font-sans max-w-sm mx-auto">
      <NewDeliveryPage onSaved={() => setView('list')} onBack={() => setView('list')} />
    </div>
  )
  if (view === 'detail') return (
    <div className="min-h-screen bg-slate-100 font-sans max-w-sm mx-auto">
      <DeliveryDetailPage id={detailId} onBack={() => setView('list')} />
    </div>
  )

  function renderBody(id) {
    switch (id) {
      case 'deliveries': return <DeliveriesPage onNew={() => setView('new')} onView={did => { setDetailId(did); setView('detail') }} />
      case 'alerts':     return <NotificationsPage />
      case 'requests':   return <RequestsPage />
      case 'stock':      return <StockPage />
      case 'products':   return <ProductsPage />
      case 'customers':  return <CustomersPage />
      case 'shipments':  return <ShipmentsPage />
      case 'reports':    return <ReportsPage />
      case 'tracking':   return <SampleTrackingPage />
      case 'staff':      return <StaffPage />
      case 'profile':    return <ProfilePage />
      default: return null
    }
  }

  function badgeFor(id) {
    if (id === 'alerts' && unreadAlerts > 0) return unreadAlerts
    if (id === 'requests' && pendingReq > 0) return pendingReq
    return 0
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans max-w-sm mx-auto pb-16">
      {/* Header */}
      <header className="brand-header px-5 pt-12 pb-6 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center card-lift">
              <span className="display text-xl font-extrabold text-slate-900">K</span>
            </div>
            <div>
              <p className="text-sky-300/80 text-[10px] eyebrow">KAWA International</p>
              <h1 className="text-white text-xl font-bold display leading-tight">Warehouse</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-full pl-2.5 pr-3 py-1.5 ring-1 ring-white/10">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" title="Live" />
            <span className="text-slate-100 text-xs font-medium">{profile?.full_name?.split(' ')[0] ?? ''}</span>
          </div>
        </div>
      </header>

      {/* All features stacked as collapsible sections */}
      <main className="px-3 pt-3 space-y-3">
        {sections.map(s => {
          const isOpen = open[s.id]
          const badge = badgeFor(s.id)
          return (
            <section key={s.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <button onClick={() => toggle(s.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
                <span className="text-xl">{s.icon}</span>
                <span className="flex-1 text-sm font-semibold text-slate-900">{s.label}</span>
                {badge > 0 && (
                  <span className="bg-red-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">{badge}</span>
                )}
                <span className={`text-slate-300 transition-transform ${isOpen ? 'rotate-90' : ''}`}>›</span>
              </button>
              {isOpen && (
                <div className="border-t border-gray-100">
                  {renderBody(s.id)}
                </div>
              )}
            </section>
          )
        })}
      </main>
    </div>
  )
}

export default function App() {
  return <AuthProvider><Shell /></AuthProvider>
}
