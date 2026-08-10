import { useState } from 'react'
import { usePostageRecords, addPostageRecord, deletePostageRecord } from '../hooks/useWarehouse'
import { useAuth } from '../lib/AuthContext'
import { Spinner, Empty } from '../components/UI'

const COURIERS = ['EMS', 'J&T', 'ไปรษณีย์ไทย', 'Grab', 'Kerry', 'Flash', 'Other']

const BLANK = {
delivery_date: new Date().toISOString().slice(0, 10),
sales_rep_name: '', customer_name: '', courier: 'EMS',
tracking_number: '', price: '', remark: '',
}

function formatDate(str) {
if (!str) return '—'
return new Date(str).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function PostageRecordsPage() {
const { profile } = useAuth()
const isAdmin = profile?.role === 'admin'
const [search, setSearch] = useState('')
const { rows, loading, page, hasMore, nextPage, prevPage, totalCost, refetch } = usePostageRecords({ search })
const [showForm, setShowForm] = useState(false)
const [form, setForm] = useState({ ...BLANK, sales_rep_name: profile?.full_name ?? '' })
const [saving, setSaving] = useState(false)
const [err, setErr] = useState('')
const [deleting, setDeleting] = useState(null)

const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-700 bg-white"
const labelCls = "block text-xs text-gray-500 mb-1"

async function handleSubmit(e) {
e.preventDefault()
if (!form.customer_name.trim()) { setErr('Customer is required.'); return }
setSaving(true); setErr('')
try {
await addPostageRecord({
delivery_date: form.delivery_date || null,
sales_rep_name: form.sales_rep_name.trim() || null,
customer_name: form.customer_name.trim(),
courier: form.courier || null,
tracking_number: form.tracking_number.trim() || null,
price: form.price ? parseFloat(form.price) : null,
remark: form.remark.trim() || null,
})
setForm({ ...BLANK, sales_rep_name: profile?.full_name ?? '' })
setShowForm(false)
refetch()
} catch (e) { setErr(e.message) }
finally { setSaving(false) }
}

async function handleDelete(id) {
if (!confirm('Delete this postage record?')) return
setDeleting(id)
try { await deletePostageRecord(id); refetch() }
catch (e) { alert(e.message) }
finally { setDeleting(null) }
}

return (
<div className="px-4 pb-24 pt-2">
{/* Total cost summary */}
<div className="bg-blue-900 rounded-xl p-4 mb-3">
<p className="text-blue-300 text-xs mb-1">{search.trim() ? 'Matching total' : 'Total postage cost'}</p>
<p className="text-white text-2xl font-semibold">฿{totalCost.toLocaleString()}</p>
</div>

<div className="flex gap-2 mb-3">
<input type="search" value={search} onChange={e => setSearch(e.target.value)}
placeholder="Search sales, customer, tracking…"
className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white outline-none focus:border-blue-700" />
<button onClick={() => setShowForm(true)}
className="bg-blue-900 text-white text-sm px-4 rounded-xl font-medium">+ Add</button>
</div>

{loading ? <Spinner /> : rows.length === 0 ? (
<Empty icon="📮" message="No postage records yet" />
) : (
<div className="space-y-2">
{rows.map(r => (
<div key={r.id} className="bg-white border border-gray-100 rounded-xl p-3.5">
<div className="flex items-start justify-between mb-1">
<p className="text-sm font-semibold text-gray-900 truncate flex-1">{r.customer_name || '—'}</p>
{r.price != null && <p className="text-sm font-bold text-amber-700 flex-shrink-0 ml-2">฿{r.price}</p>}
</div>
<div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap mb-1.5">
<span>📅 {formatDate(r.delivery_date) !== '—' ? formatDate(r.delivery_date) : (r.delivery_date_raw || '—')}</span>
{r.courier && <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{r.courier}</span>}
{r.tracking_number && <span className="font-mono">{r.tracking_number}</span>}
</div>
{r.remark && <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-2 py-1 mb-1.5">📝 {r.remark}</p>}
<div className="flex items-center justify-between pt-1.5 border-t border-gray-50">
<p className="text-xs text-gray-400">by {r.sales_rep_name || '—'}</p>
{(isAdmin || r.created_by === profile?.id) && (
<button onClick={() => handleDelete(r.id)} disabled={deleting === r.id}
className="text-xs text-gray-300 hover:text-red-500 disabled:opacity-50">
{deleting === r.id ? '…' : '🗑 Delete'}
</button>
)}
</div>
</div>
))}

<div className="flex items-center justify-between pt-2">
<button onClick={prevPage} disabled={page === 0}
className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40">← Newer</button>
<span className="text-[11px] text-gray-400">Page {page + 1}</span>
<button onClick={nextPage} disabled={!hasMore}
className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40">Older →</button>
</div>
</div>
)}

{/* Add record modal */}
{showForm && (
<div className="fixed inset-0 z-50 flex items-end justify-center">
<div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
<form onSubmit={handleSubmit} className="relative bg-white w-full max-w-sm rounded-t-2xl shadow-xl max-h-[92vh] overflow-y-auto">
<div className="p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
<div className="w-9 h-1 bg-gray-200 rounded-full mx-auto mb-3" />
<h2 className="text-base font-semibold text-gray-900">Add Postage Record</h2>
</div>
<div className="p-4 space-y-3 pb-8">
<div>
<label className={labelCls}>Delivery date</label>
<input type="date" value={form.delivery_date} onChange={e => setF('delivery_date', e.target.value)} className={inputCls} />
</div>
<div>
<label className={labelCls}>Sales person</label>
<input type="text" value={form.sales_rep_name} onChange={e => setF('sales_rep_name', e.target.value)}
placeholder="Sales name" className={inputCls} />
</div>
<div>
<label className={labelCls}>Customer *</label>
<input type="text" value={form.customer_name} onChange={e => setF('customer_name', e.target.value)}
placeholder="Customer name" className={inputCls} required />
</div>
<div>
<label className={labelCls}>Courier</label>
<select value={form.courier} onChange={e => setF('courier', e.target.value)} className={inputCls}>
{COURIERS.map(c => <option key={c} value={c}>{c}</option>)}
</select>
</div>
<div>
<label className={labelCls}>Tracking number</label>
<input type="text" value={form.tracking_number} onChange={e => setF('tracking_number', e.target.value)}
placeholder="Tracking / parcel number" className={inputCls} />
</div>
<div>
<label className={labelCls}>Price (฿ THB)</label>
<input type="number" min="0" step="0.01" value={form.price} onChange={e => setF('price', e.target.value)}
placeholder="e.g. 42.00" className={inputCls} />
</div>
<div>
<label className={labelCls}>Remark</label>
<input type="text" value={form.remark} onChange={e => setF('remark', e.target.value)}
placeholder="e.g. S Plus" className={inputCls} />
</div>
{err && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
<div className="flex gap-2 pt-2">
<button type="button" onClick={() => setShowForm(false)}
className="flex-1 border border-gray-200 rounded-xl py-3 text-sm text-gray-600">Cancel</button>
<button type="submit" disabled={saving}
className="flex-1 bg-blue-900 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-60">
{saving ? 'Saving…' : '💾 Save'}
</button>
</div>
</div>
</form>
</div>
)}
</div>
)
}
