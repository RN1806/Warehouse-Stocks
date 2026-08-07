import { useState } from 'react'
import { useAuditLog } from '../hooks/useWarehouse'
import { useAuth } from '../lib/AuthContext'
import { Spinner, Empty } from '../components/UI'

const ENTITY_TYPES = [
{ v: 'all', l: 'All', icon: '🗂️' },
{ v: 'product', l: 'Products', icon: '🧴' },
{ v: 'stock_update', l: 'Stock', icon: '📦' },
{ v: 'delivery', l: 'Deliveries', icon: '📋' },
{ v: 'shipment', l: 'Shipments', icon: '✈️' },
{ v: 'customer', l: 'Customers', icon: '🏢' },
{ v: 'supplier', l: 'Suppliers', icon: '🏭' },
{ v: 'collection', l: 'Collections', icon: '📂' },
{ v: 'staff', l: 'Staff', icon: '👤' },
{ v: 'sample_request', l: 'Requests', icon: '📩' },
]

const ACTION_STYLE = {
created: { icon: '➕', cls: 'text-emerald-700 bg-emerald-50' },
updated: { icon: '✎', cls: 'text-blue-700 bg-blue-50' },
deleted: { icon: '🗑', cls: 'text-red-700 bg-red-50' },
renamed: { icon: '🔤', cls: 'text-purple-700 bg-purple-50' },
status_changed: { icon: '🔁', cls: 'text-amber-700 bg-amber-50' },
approved: { icon: '✓', cls: 'text-emerald-700 bg-emerald-50' },
rejected: { icon: '✕', cls: 'text-red-700 bg-red-50' },
}

function formatDate(str) {
const d = new Date(str)
return d.toLocaleString(undefined, {
year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
})
}

export default function HistoryPage() {
const { profile } = useAuth()
const [entityType, setEntityType] = useState('all')
const [search, setSearch] = useState('')
const { rows, loading, page, hasMore, nextPage, prevPage } = useAuditLog({ entityType })

if (profile?.role !== 'admin') {
return (
<div className="px-4 pt-20 text-center">
<p className="text-sm text-gray-500">This page is only available to admins.</p>
</div>
)
}

const filtered = search.trim()
? rows.filter(r =>
(r.entity_label || '').toLowerCase().includes(search.toLowerCase()) ||
(r.actor_name || '').toLowerCase().includes(search.toLowerCase()) ||
(r.details || '').toLowerCase().includes(search.toLowerCase())
)
: rows

return (
<div className="px-4 pb-24 pt-2">
<div className="mb-3">
<input type="search" value={search} onChange={e => setSearch(e.target.value)}
placeholder="Search by product, person, or detail…"
className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white outline-none focus:border-blue-700" />
</div>

<div className="flex gap-2 mb-4 overflow-x-auto scrollbar-none pb-1">
{ENTITY_TYPES.map(t => (
<button key={t.v} onClick={() => setEntityType(t.v)}
className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${entityType===t.v ? 'bg-slate-900 text-white border-slate-900' : 'border-gray-200 text-gray-600'}`}>
{t.icon} {t.l}
</button>
))}
</div>

{loading ? <Spinner /> : filtered.length === 0 ? (
<Empty icon="🕓" message="No activity found" />
) : (
<div className="space-y-2">
{filtered.map(r => {
const style = ACTION_STYLE[r.action] || { icon: '•', cls: 'text-gray-600 bg-gray-50' }
return (
<div key={r.id} className="bg-white border border-gray-100 rounded-xl p-3.5">
<div className="flex items-start gap-3">
<span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm ${style.cls}`}>
{style.icon}
</span>
<div className="flex-1 min-w-0">
<div className="flex items-center justify-between gap-2">
<p className="text-sm font-semibold text-gray-900 truncate">{r.entity_label || '—'}</p>
<span className="text-[11px] text-gray-400 flex-shrink-0">{formatDate(r.created_at)}</span>
</div>
<p className="text-xs text-gray-500 capitalize">
{r.action.replace('_', ' ')} · <span className="capitalize">{r.entity_type.replace('_', ' ')}</span>
</p>
{r.details && <p className="text-xs text-gray-600 mt-1">{r.details}</p>}
<p className="text-[11px] text-gray-400 mt-1">by {r.actor_name || 'Unknown'}</p>
</div>
</div>
</div>
)
})}

<div className="flex items-center justify-between pt-2">
<button onClick={prevPage} disabled={page === 0}
className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40">
← Newer
</button>
<span className="text-[11px] text-gray-400">Page {page + 1}</span>
<button onClick={nextPage} disabled={!hasMore}
className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40">
Older →
</button>
</div>
</div>
)}
</div>
)
}
