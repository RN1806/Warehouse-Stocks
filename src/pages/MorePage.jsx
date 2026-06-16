import { useState } from 'react'
import { CustomersPage } from './Pages'
import ShipmentsPage from './ShipmentsPage'
import ReportsPage from './ReportsPage'
import StaffPage from './StaffPage'
import RequestsPage from './RequestsPage'
import { useAuth } from '../lib/AuthContext'
import { useIncomingRequests } from '../hooks/useWarehouse'

export default function MorePage() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [sub, setSub] = useState(null)
  const { requests } = useIncomingRequests()
  const myEmail = (profile?.email || '').toLowerCase()
  const pendingForMe = requests.filter(r =>
    (r.owner_email || '').toLowerCase() === myEmail && r.status === 'pending'
  ).length

  const MENU = [
    { id: 'requests',  label: 'Sample Requests', icon: '📩', desc: 'Approve product requests & track yours', badge: pendingForMe },
    { id: 'customers', label: 'Customer Book', icon: '🏢', desc: 'Manage customer address book' },
    { id: 'shipments', label: 'Shipments',     icon: '✈️', desc: 'Abroad orders, tracking & cost' },
    { id: 'reports',   label: 'Reports',       icon: '📊', desc: 'Stock import reports by industry' },
    ...(isAdmin ? [{ id: 'staff', label: 'Staff Directory', icon: '👥', desc: 'View & edit staff roles and industries' }] : []),
  ]

  if (sub === 'requests')  return <SubWrap onBack={() => setSub(null)} title="Sample Requests"><RequestsPage /></SubWrap>
  if (sub === 'customers') return <SubWrap onBack={() => setSub(null)} title="Customer Book"><CustomersPage /></SubWrap>
  if (sub === 'shipments') return <SubWrap onBack={() => setSub(null)} title="Shipments"><ShipmentsPage /></SubWrap>
  if (sub === 'reports')   return <SubWrap onBack={() => setSub(null)} title="Reports"><ReportsPage /></SubWrap>
  if (sub === 'staff')     return <SubWrap onBack={() => setSub(null)} title="Staff Directory"><StaffPage /></SubWrap>

  return (
    <div className="px-4 pb-24 pt-3 space-y-2">
      {MENU.map(m => (
        <button key={m.id} onClick={() => setSub(m.id)}
          className="w-full flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-4 text-left">
          <span className="text-2xl">{m.icon}</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">{m.label}</p>
            <p className="text-xs text-gray-400">{m.desc}</p>
          </div>
          {m.badge > 0 && (
            <span className="bg-red-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">{m.badge}</span>
          )}
          <span className="text-gray-300">›</span>
        </button>
      ))}
    </div>
  )
}

function SubWrap({ title, onBack, children }) {
  return (
    <div>
      <div className="bg-slate-900 px-4 pt-12 pb-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={onBack} className="text-slate-400 text-sm">←</button>
        <h1 className="text-white text-base font-semibold">{title}</h1>
      </div>
      {children}
    </div>
  )
}
