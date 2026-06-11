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
        <header className="brand-header px-5 pt-11 pb-5 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-[11px] font-medium eyebrow">KAWA International</p>
              <h1 className="text-white text-lg font-semibold mt-0.5">{TITLES[tab]}</h1>
            </div>
            <div className="flex items-center gap-2 bg-white/10 rounded-full pl-2 pr-3 py-1.5">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" title="Live" />
              <span className="text-slate-200 text-xs font-medium">{profile?.full_name?.split(' ')[0] ?? ''}</span>
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
        <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-200 flex max-w-sm mx-auto z-10 px-1 pb-1">
          {TABS.map(t => {
            const active = tab === t.id
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex-1 flex flex-col items-center pt-2 pb-1.5 gap-1 transition-colors">
                <span className={`flex items-center justify-center w-12 h-7 rounded-full text-lg leading-none transition-all ${active ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>{t.icon}</span>
                <span className={`text-[10px] font-medium ${active ? 'text-slate-900' : 'text-slate-400'}`}>{t.label}</span>
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
