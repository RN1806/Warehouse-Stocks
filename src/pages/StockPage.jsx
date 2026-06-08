import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useProducts, useStockUpdates, submitStockUpdate, confirmStockUpdate, undoStockUpdate } from '../hooks/useWarehouse'
import { StatusBadge, Spinner, Empty, SectionCard } from '../components/UI'
import SupplierPicker from '../components/SupplierPicker'
import PackagingInput from '../components/PackagingInput'

const BLANK = {
  product_id: '', product_name: '', supplier_name: '',
  lot_number: '', pack_size_amount: '', pack_size_unit: 'g',
  number_of_packs: '', total_amount: '', total_unit: 'g',
  expiry_date: '', storage_location: '', action: 'in', notes: '',
}

function timeAgo(str) {
  const diff = Date.now() - new Date(str).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return new Date(str).toLocaleDateString()
}

export default function StockPage() {
  const { profile, session } = useAuth()
  const { products } = useProducts()
  const { updates, loading, refetch } = useStockUpdates()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...BLANK })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [confirming, setConfirming] = useState(null)
  const [undoing, setUndoing] = useState(null)

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Auto-calc total when packs or pack_size changes
  function handlePacksChange(v) {
    setF('number_of_packs', v)
    if (form.pack_size_amount && v) {
      setF('total_amount', String(parseFloat(form.pack_size_amount) * parseFloat(v)))
      setF('total_unit', form.pack_size_unit)
    }
  }
  function handlePackSizeChange(amount) {
    setF('pack_size_amount', amount)
    if (form.number_of_packs && amount) {
      setF('total_amount', String(parseFloat(amount) * parseFloat(form.number_of_packs)))
    }
  }

  function handleProductSelect(productId) {
    const p = products.find(x => x.id === productId)
    if (p) {
      setF('product_id', productId)
      setF('product_name', p.name)
      setF('supplier_name', p.supplier_name || p.suppliers?.name || '')
      setF('pack_size_unit', p.default_unit || 'g')
      setF('total_unit', p.default_unit || 'g')
    }
  }

  async function handleSubmit(e, submitStatus) {
    e.preventDefault()
    if (!form.product_name.trim()) { setErr('Product name is required.'); return }
    setSaving(true); setErr('')
    try {
      await submitStockUpdate({
        ...form,
        pack_size_amount: form.pack_size_amount ? parseFloat(form.pack_size_amount) : null,
        number_of_packs: form.number_of_packs ? parseInt(form.number_of_packs) : null,
        total_amount: form.total_amount ? parseFloat(form.total_amount) : null,
        status: submitStatus,
        updated_by: session?.user?.id,
        updated_by_name: profile?.full_name ?? '',
      })
      setForm({ ...BLANK })
      setShowForm(false)
      refetch()
    } catch (e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  async function handleConfirm(u) {
    setConfirming(u.id)
    try { await confirmStockUpdate(u.id, u.product_id, u.action, u.total_amount); refetch() }
    catch (e) { alert(e.message) }
    finally { setConfirming(null) }
  }

  async function handleUndo(u) {
    if (!confirm(`Undo this stock ${u.action}? This will reverse the quantity change.`)) return
    setUndoing(u.id)
    try { await undoStockUpdate(u.id, u.product_id, u.action, u.total_amount); refetch() }
    catch (e) { alert(e.message) }
    finally { setUndoing(null) }
  }

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-700 bg-white"
  const labelCls = "block text-xs text-gray-500 mb-1"

  return (
    <div className="pb-24">
      {/* Real-time qty summary */}
      <div className="px-4 py-3">
        <div className="bg-blue-900 rounded-xl p-4">
          <p className="text-blue-300 text-xs mb-1">Real-time stock</p>
          <p className="text-white text-2xl font-semibold">{products.reduce((s, p) => s + (p.current_qty || 0), 0)}</p>
          <p className="text-blue-200 text-xs mt-0.5">total units across {products.length} products</p>
        </div>
      </div>

      {/* Product qty list */}
      <div className="px-4 mb-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Current quantities</p>
        <div className="space-y-1.5">
          {products.slice(0, 8).map(p => (
            <div key={p.id} className="bg-white border border-gray-100 rounded-xl px-3 py-2.5 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                <p className="text-xs text-gray-400">{p.suppliers?.name || p.supplier_name || '—'}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-900">{p.current_qty ?? 0}</p>
                <p className="text-xs text-gray-400">{p.default_unit || 'units'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent updates */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Stock updates</p>
        </div>
        {loading ? <Spinner /> : updates.length === 0 ? (
          <Empty icon="📦" message="No stock updates yet" />
        ) : (
          <div className="space-y-2">
            {updates.map(u => (
              <div key={u.id} className="bg-white border border-gray-100 rounded-xl p-3.5">
                <div className="flex items-start justify-between mb-1.5">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{u.product_name}</p>
                    {u.supplier_name && <p className="text-xs text-gray-400">{u.supplier_name}</p>}
                  </div>
                  <StatusBadge status={u.status} />
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 mb-2 flex-wrap">
                  <span className={`font-medium ${u.action==='in' ? 'text-green-600' : u.action==='out' ? 'text-red-500' : 'text-blue-600'}`}>
                    {u.action === 'in' ? '▲ IN' : u.action === 'out' ? '▼ OUT' : '= ADJUST'}
                  </span>
                  {u.total_amount && <span>{u.total_amount} {u.total_unit}</span>}
                  {u.lot_number && <span>Lot: {u.lot_number}</span>}
                  {u.expiry_date && <span>Exp: {u.expiry_date}</span>}
                  {u.storage_location && <span>📍 {u.storage_location}</span>}
                  <span>{timeAgo(u.created_at)}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                  <p className="text-xs text-gray-400">by {u.updated_by_name || '—'}</p>
                  <div className="flex gap-2">
                    {u.status === 'pending' && (
                      <button onClick={() => handleConfirm(u)} disabled={confirming === u.id}
                        className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg font-medium disabled:opacity-60">
                        {confirming === u.id ? '…' : '✓ Confirm'}
                      </button>
                    )}
                    {u.status === 'confirmed' && (
                      <button onClick={() => handleUndo(u)} disabled={undoing === u.id}
                        className="text-xs border border-gray-200 text-gray-500 px-3 py-1.5 rounded-lg disabled:opacity-60">
                        {undoing === u.id ? '…' : '↩ Undo'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button onClick={() => setShowForm(true)}
        className="fixed bottom-20 right-4 bg-blue-900 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-800 transition-colors"
        style={{ width: 52, height: 52 }}>
        <span className="text-2xl font-light">+</span>
      </button>

      {/* Stock update form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="relative bg-white w-full max-w-sm rounded-t-2xl shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="w-9 h-1 bg-gray-200 rounded-full mx-auto mb-3" />
              <h2 className="text-base font-semibold text-gray-900">Stock Update</h2>
            </div>

            <form className="p-4 space-y-4 pb-8">
              {/* Action */}
              <div>
                <label className={labelCls}>Action *</label>
                <div className="flex gap-2">
                  {[{v:'in',l:'▲ Stock In',c:'green'},{v:'out',l:'▼ Stock Out',c:'red'},{v:'adjust',l:'= Adjust',c:'blue'}].map(a => (
                    <button key={a.v} type="button" onClick={() => setF('action', a.v)}
                      className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors ${form.action===a.v ? `bg-${a.c}-600 text-white border-${a.c}-600` : 'border-gray-200 text-gray-600'}`}
                      style={form.action===a.v ? {backgroundColor: a.c==='green'?'#16a34a':a.c==='red'?'#dc2626':'#2563eb', color:'white'} : {}}>
                      {a.l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Product */}
              <div>
                <label className={labelCls}>Product *</label>
                <select value={form.product_id} onChange={e => handleProductSelect(e.target.value)} className={inputCls}>
                  <option value="">Select product…</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                {!form.product_id && (
                  <input type="text" value={form.product_name} onChange={e => setF('product_name', e.target.value)}
                    placeholder="Or type product name manually" className={inputCls + ' mt-2'} />
                )}
              </div>

              {/* Supplier */}
              <div>
                <label className={labelCls}>Supplier</label>
                <SupplierPicker value={form.supplier_name} onChange={v => setF('supplier_name', v)} />
              </div>

              {/* Lot number */}
              <div>
                <label className={labelCls}>Lot number</label>
                <input type="text" value={form.lot_number} onChange={e => setF('lot_number', e.target.value)}
                  placeholder="e.g. LOT-2024-001" className={inputCls} />
              </div>

              {/* Pack size */}
              <PackagingInput
                label="Pack size"
                amount={form.pack_size_amount}
                unit={form.pack_size_unit}
                onAmountChange={handlePackSizeChange}
                onUnitChange={v => { setF('pack_size_unit', v); setF('total_unit', v) }}
              />

              {/* Number of packs */}
              <div>
                <label className={labelCls}>Number of packs</label>
                <input type="number" min="0" value={form.number_of_packs} onChange={e => handlePacksChange(e.target.value)}
                  placeholder="e.g. 10" className={inputCls} />
              </div>

              {/* Total amount (auto-calculated) */}
              <PackagingInput
                label="Total amount"
                amount={form.total_amount}
                unit={form.total_unit}
                onAmountChange={v => setF('total_amount', v)}
                onUnitChange={v => setF('total_unit', v)}
              />

              {/* Expiry date */}
              <div>
                <label className={labelCls}>Expiry date</label>
                <input type="date" value={form.expiry_date} onChange={e => setF('expiry_date', e.target.value)}
                  className={inputCls} />
              </div>

              {/* Storage location */}
              <div>
                <label className={labelCls}>Storage location / Place to keep</label>
                <input type="text" value={form.storage_location} onChange={e => setF('storage_location', e.target.value)}
                  placeholder="e.g. Shelf A3, Cold Room 2" className={inputCls} />
              </div>

              {/* Notes */}
              <div>
                <label className={labelCls}>Notes</label>
                <textarea value={form.notes} onChange={e => setF('notes', e.target.value)}
                  placeholder="Additional notes…" rows={2} className={inputCls + ' resize-none'} />
              </div>

              {err && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 rounded-xl py-3 text-sm text-gray-600">Cancel</button>
                <button type="button" onClick={e => handleSubmit(e, 'pending')} disabled={saving}
                  className="flex-1 border border-amber-400 text-amber-700 bg-amber-50 rounded-xl py-3 text-sm font-medium disabled:opacity-60">
                  {saving ? '…' : '⏳ Save as Pending'}
                </button>
                <button type="button" onClick={e => handleSubmit(e, 'confirmed')} disabled={saving}
                  className="flex-1 bg-blue-900 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-60">
                  {saving ? '…' : '✓ Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
