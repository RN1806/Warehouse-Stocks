import { useState } from 'react'
import { AuthProvider, useAuth } from './lib/AuthContext'
import AuthPage from './pages/AuthPage'
import StockPage from './pages/StockPage'
import ProductsPage from './pages/ProductsPage'
import NewDeliveryPage from './pages/NewDeliveryPage'
import MorePage from './pages/MorePage'
import { DeliveriesPage, DeliveryDetailPage, ProfilePage } from './pages/Pages'
import './index.css'

const TABS = [
  { id: 'deliveries', label: 'Forms',     icon: '📋' },
  { id: 'stock',      label: 'Stock',     icon: '📦' },
  { id: 'products',   label: 'Products',  icon: '🧴' },
  { id: 'more',       label: 'More',      icon: '☰' },
  { id: 'profile',    label: 'Profile',   icon: '👤' },
]

const TITLES = {
  deliveries: 'Sample Delivery',
  stock:      'Stock Manager',
  products:   'Products',
  more:       'More',
  profile:    'My Profile',
}

function Shell() {
  const { session, profile } = useAuth()
  const [tab, setTab]           = useState('deliveries')
  const [view, setView]         = useState('list')
  const [detailId, setDetailId] = useState(null)

  if (session === undefined) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!session) return <AuthPage />

  const isSubView = view !== 'list'

  return (
    <div className="min-h-screen bg-slate-100 font-sans max-w-sm mx-auto">
      {!isSubView && (
        <header className="brand-header px-5 pt-12 pb-6 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center card-lift">
                <span className="display text-xl font-extrabold text-slate-900">K</span>
              </div>
              <div>
                <p className="text-sky-300/80 text-[10px] eyebrow">KAWA International</p>
                <h1 className="text-white text-xl font-bold display leading-tight">{TITLES[tab]}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/10 rounded-full pl-2.5 pr-3 py-1.5 ring-1 ring-white/10">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" title="Live" />
              <span className="text-slate-100 text-xs font-medium">{profile?.full_name?.split(' ')[0] ?? ''}</span>
            </div>
          </div>
        </header>
      )}

      <main>
        {view === 'new'    && <NewDeliveryPage onSaved={() => { setView('list'); setTab('deliveries') }} onBack={() => setView('list')} />}
        {view === 'detail' && <DeliveryDetailPage id={detailId} onBack={() => setView('list')} />}
        {view === 'list' && tab === 'deliveries' && <DeliveriesPage onNew={() => setView('new')} onView={id => { setDetailId(id); setView('detail') }} />}
        {view === 'list' && tab === 'stock'      && <StockPage />}
        {view === 'list' && tab === 'products'   && <ProductsPage />}
        {view === 'list' && tab === 'more'       && <MorePage />}
        {view === 'list' && tab === 'profile'    && <ProfilePage />}
      </main>

      {!isSubView && (
        <nav className="fixed bottom-0 left-0 right-0 nav-blur border-t border-slate-200 flex max-w-sm mx-auto z-10 px-2 pb-1.5 pt-1">
          {TABS.map(t => {
            const active = tab === t.id
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex-1 flex flex-col items-center pt-1.5 pb-1 gap-1 transition-all">
                <span className={`flex items-center justify-center w-14 h-8 rounded-2xl text-lg leading-none transition-all duration-200 ${active ? 'bg-slate-900 text-white card-lift scale-100' : 'text-slate-400 scale-90'}`}>{t.icon}</span>
                <span className={`text-[10px] font-semibold transition-colors ${active ? 'text-slate-900' : 'text-slate-400'}`}>{t.label}</span>
              </button>
            )
          })}
        </nav>
      )}
    </div>
  )
}

export default function App() {
  return <AuthProvider><Shell /></AuthProvider>
}
