import { useState } from 'react'
import { useAuditLog, fetchAuditEntityDetail } from '../hooks/useWarehouse'
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
{ v: 'postage_record', l: 'Postage', icon: '📮' },
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

// Fields we never want to show raw in the detail view (ids/fks are shown
// via their human-readable counterparts elsewhere, timestamps are noisy).
const HIDDEN_FIELDS = new Set([
'id', 'created_by', 'sales_rep_id', 'requester_id', 'supplier_id', 'collection_id',
'delivery_items', 'shipment_items',
])

const LIST_FIELDS = { delivery_items: 'Products', shipment_items: 'Products' }

function formatDate(str) {
if (!str) return '—'
const d = new Date(str)
if (isNaN(d)) return String(str)
return d.toLocaleString(undefined, {
year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
})
}

function prettyLabel(key) {
return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function prettyValue(key, value) {
if (value === null || value === undefined || value === '') return '—'
if (typeof value === 'boolean') return value ? 'Yes' : 'No'
if (key.includes('date') || key === 'created_at' || key === 'decided_at') return formatDate(value)
if (Array.isArray(value)) return value.join(', ')
return String(value)
}

export default function HistoryPage() {
const { profile } = useAuth()
const [entityType, setEntityType] = useState('all')
const [search, setSearch] = useState('')
const { rows, loading, page, hasMore, nextPage, prevPage } = useAuditLog({ entityType })

const [selected, setSelected] = useState(null) // the audit_log row clicked
const [detail, setDetail] = useState(null) // fetched full record
const [detailLoading, setDetailLoading] = useState(false)

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

async function openDetail(row) {
setSelected(row)
setDetail(null)
setDetailLoading(true)
try {
const d = await fetchAuditEntityDetail(row.entity_type, row.entity_id)
setDetail(d)
} finally {
setDetailLoading(false)
}
}

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
<button key={r.id} onClick={() => openDetail(r)}
className="w-full text-left bg-white border border-gray-100 rounded-xl p-3.5 hover:border-blue-200 transition-colors">
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
<span className="text-gray-300 text-lg flex-shrink-0">›</span>
</div>
</button>
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

{/* Detail modal */}
{selected && (
<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
<div className="absolute inset-0 bg-black/40" onClick={() => setSelected(null)} />
<div className="relative bg-white w-full max-w-sm rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[85vh] overflow-y-auto">
<div className="p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
<div className="w-9 h-1 bg-gray-200 rounded-full mx-auto mb-3 sm:hidden" />
<div className="flex items-center justify-between">
<div>
<h2 className="text-base font-semibold text-gray-900">{selected.entity_label || '—'}</h2>
<p className="text-xs text-gray-400 capitalize">
{selected.action.replace('_', ' ')} · {selected.entity_type.replace('_', ' ')} · by {selected.actor_name || 'Unknown'} · {formatDate(selected.created_at)}
</p>
</div>
<button onClick={() => setSelected(null)} className="text-gray-300 text-2xl leading-none px-1">×</button>
</div>
{selected.details && (
<p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 mt-2">{selected.details}</p>
)}
</div>

<div className="p-4">
{detailLoading ? <Spinner /> : !detail ? (
<p className="text-sm text-gray-400 text-center py-6">
This record no longer exists (it may have been deleted since this action).
</p>
) : (
<div className="space-y-3">
<div className="divide-y divide-gray-50 border border-gray-100 rounded-xl overflow-hidden">
{Object.entries(detail).filter(([k]) => !HIDDEN_FIELDS.has(k)).map(([k, v]) => (
<div key={k} className="flex justify-between gap-3 px-3.5 py-2.5">
<span className="text-xs text-gray-500 flex-shrink-0">{prettyLabel(k)}</span>
<span className="text-xs font-medium text-gray-800 text-right break-words">{prettyValue(k, v)}</span>
</div>
))}
</div>

{/* Line items (delivery/shipment products), if present */}
{Object.entries(LIST_FIELDS).map(([field, label]) => {
const items = detail[field]
if (!Array.isArray(items) || items.length === 0) return null
return (
<div key={field}>
<p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label} ({items.length})</p>
<div className="space-y-1.5">
{items.map((it, i) => (
<div key={it.id || i} className="bg-gray-50 rounded-lg px-3 py-2 text-xs">
<p className="font-medium text-gray-800">{it.product_name || '—'}</p>
<p className="text-gray-500">
{[it.amount && `${it.amount} ${it.unit || ''}`, it.lot_no, it.remark].filter(Boolean).join(' · ')}
</p>
</div>
))}
</div>
</div>
)
})}
</div>
)}
</div>
</div>
</div>
)}
</div>
)
}
