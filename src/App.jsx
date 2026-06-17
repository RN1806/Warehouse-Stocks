import { useState, Component } from 'react'
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

class SectionBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div className="px-4 py-6 text-sm text-red-600 bg-red-50 m-4 rounded-xl">
          This page couldn't load. {String(this.state.error?.message || '')}
        </div>
      )
    }
    return this.props.children
  }
}

function buildMenu(isAdmin) {
  return [
    { id: 'deliveries', label: 'Sample Delivery Forms', icon: '📋', desc: 'Create & track delivery forms' },
    { id: 'alerts',     label: 'Alerts',                icon: '🔔', desc: 'Low stock & notifications' },
    { id: 'requests',   label: 'Sample Requests',       icon: '📩', desc: 'Approve & track product requests' },
    { id: 'stock',      label: 'Stock Manager',         icon: '📦', desc: 'Stock in / out / adjust' },
    { id: 'products',   label: 'Products',              icon: '🧴', desc: 'Browse the catalogue' },
    { id: 'customers',  label: 'Customer Book',         icon: '🏢', desc: 'Customer address book' },
    { id: 'shipments',  label: 'Shipments',             icon: '✈️', desc: 'Abroad orders & tracking' },
    { id: 'reports',    label: 'Reports',               icon: '📊', desc: 'Stock import by industry' },
    { id: 'tracking',   label: 'Sample Tracking',       icon: '🔄', desc: 'In/out by supplier & product' },
    ...(isAdmin ? [{ id: 'staff', label: 'Staff Directory', icon: '👥', desc: 'Manage staff roles' }] : []),
    { id: 'profile',    label: 'My Profile',            icon: '👤', desc: 'Your account & info' },
  ]
}

const TITLES = {
  deliveries: 'Sample Delivery', alerts: 'Alerts', requests: 'Sample Requests',
  stock: 'Stock Manager', products: 'Products', customers: 'Customer Book',
  shipments: 'Shipments', reports: 'Reports', tracking: 'Sample Tracking',
  staff: 'Staff Directory', profile: 'My Profile',
}

function Shell() {
  const { session, profile } = useAuth()
  const [tab, setTab]           = useState(null)   // null = home menu
  const [view, setView]         = useState('list') // list | new | detail
  const [detailId, setDetailId] = useState(null)

  const isAdmin = profile?.role === 'admin'
  const menu = buildMenu(isAdmin)

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

  // Delivery sub-flows (full screen, own back)
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
    if (id === 'alerts') return unreadAlerts
    if (id === 'requests') return pendingReq
    return 0
  }

  // ── A feature is open: show it full-screen with a back header ──
  if (tab) {
    return (
      <div className="min-h-screen bg-slate-100 font-sans max-w-sm mx-auto">
        <header className="brand-header px-4 pt-12 pb-4 sticky top-0 z-20 flex items-center gap-3">
          <button onClick={() => setTab(null)}
            className="w-9 h-9 rounded-xl bg-white/10 ring-1 ring-white/15 flex items-center justify-center text-white text-lg">←</button>
          <h1 className="text-white text-lg font-bold display">{TITLES[tab]}</h1>
        </header>
        <main>
          <SectionBoundary>{renderBody(tab)}</SectionBoundary>
        </main>
      </div>
    )
  }

  // ── Home menu ──
  return (
    <div className="min-h-screen bg-slate-100 font-sans max-w-sm mx-auto pb-8">
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

      <main className="px-3 pt-3 space-y-2">
        {menu.map(m => {
          const badge = badgeFor(m.id)
          return (
            <button key={m.id} onClick={() => setTab(m.id)}
              className="w-full flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-4 text-left card-lift">
              <span className="text-2xl">{m.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">{m.label}</p>
                <p className="text-xs text-gray-400">{m.desc}</p>
              </div>
              {badge > 0 && (
                <span className="bg-red-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">{badge}</span>
              )}
              <span className="text-gray-300 text-lg">›</span>
            </button>
          )
        })}
      </main>
    </div>
  )
}

export default function App() {
  return <AuthProvider><Shell /></AuthProvider>
}
