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
    <div className="min-h-screen bg-slate-50 font-sans max-w-sm mx-auto">
      {!isSubView && (
        <header className="bg-slate-900 px-4 pt-10 pb-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs">KAWA International</p>
              <h1 className="text-white text-base font-semibold">{TITLES[tab]}</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full" title="Realtime" />
              <span className="text-slate-300 text-xs">{profile?.full_name?.split(' ')[0] ?? ''}</span>
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
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex max-w-sm mx-auto z-10">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors ${tab===t.id ? 'text-blue-900' : 'text-gray-400'}`}>
              <span className="text-lg leading-none">{t.icon}</span>
              <span className="text-xs">{t.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}

export default function App() {
  return <AuthProvider><Shell /></AuthProvider>
}
