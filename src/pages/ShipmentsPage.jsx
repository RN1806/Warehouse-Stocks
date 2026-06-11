import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useShipments, getShipment, createShipment, deleteShipment } from '../hooks/useWarehouse'
import { Spinner, Empty } from '../components/UI'

const BLANK_ITEM = { product_name: '', quantity: '', unit: 'g' }

function money(amount, currency) {
  if (amount == null || amount === '') return '—'
  const sym = currency === 'USD' ? '$' : '฿'
  return `${sym}${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ── List + create ─────────────────────────────────────────
export default function ShipmentsPage() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const myIndustries = profile?.industries || []
  const { shipments, loading, refetch } = useShipments()
  const [showForm, setShowForm] = useState(false)
  const [detailId, setDetailId] = useState(null)
  const [dirFilter, setDirFilter] = useState('send')

  // Can this viewer see the cost of a given shipment?
  // Admins always; staff only if one of their industries matches a product's industry.
  const canSeeCost = (s) => {
    if (isAdmin) return true
    const shipInds = (s.shipment_items || []).map(it => it.industry).filter(Boolean)
    return shipInds.some(ind => myIndustries.includes(ind))
  }

  if (detailId) {
    return <ShipmentDetail id={detailId} onBack={() => setDetailId(null)} onDeleted={() => { setDetailId(null); refetch() }} isAdmin={isAdmin} myIndustries={myIndustries} />
  }

  const filtered = shipments.filter(s => (s.direction || 'send') === dirFilter)

  return (
    <div className="px-4 pb-24 pt-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-400">{filtered.length} shipments</p>
        {isAdmin && (
          <button onClick={() => setShowForm(true)}
            className="bg-blue-900 text-white text-sm px-4 py-2 rounded-xl font-medium">+ New shipment</button>
        )}
      </div>

      {/* Sent / Received filter */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-3">
        {[['send', '📤 Sent'], ['receive', '📥 Received']].map(([v, lbl]) => (
          <button key={v} onClick={() => setDirFilter(v)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${dirFilter === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
            {lbl}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <Empty icon="✈️" message={dirFilter === 'send' ? 'No sent shipments yet' : 'No received shipments yet'} />
      ) : (
        <div className="space-y-2">
          {filtered.map(s => (
            <button key={s.id} onClick={() => setDetailId(s.id)}
              className="w-full text-left bg-white border border-gray-100 rounded-xl px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">{s.ship_number}</p>
                {canSeeCost(s) && <span className="text-xs font-bold text-blue-900">{money(s.cost, s.currency)}</span>}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">📦 {s.tracking_number || 'No tracking'}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {(s.shipment_items?.length ?? 0)} products · {s.destination || 'Abroad'}
              </p>
            </button>
          ))}
        </div>
      )}

      {showForm && <ShipmentForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); refetch() }} />}
    </div>
  )
}

// ── Create form ───────────────────────────────────────────
function ShipmentForm({ onClose, onSaved }) {
  const [form, setForm] = useState({
    direction: 'send',
    tracking_number: '', destination: '', courier: '',
    cost: '', currency: 'THB', notes: '',
  })
  const [items, setItems] = useState([{ ...BLANK_ITEM }, { ...BLANK_ITEM }])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setItem = (i, k, v) => setItems(its => its.map((it, idx) => idx === i ? { ...it, [k]: v } : it))

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-700 bg-white"
  const labelCls = "block text-xs text-gray-500 mb-1"

  async function handleSubmit() {
    if (!form.tracking_number.trim()) { setErr('Tracking number is required.'); return }
    const filled = items.filter(it => it.product_name.trim())
    if (filled.length === 0) { setErr('Add at least one product.'); return }
    setSaving(true); setErr('')
    try {
      await createShipment({
        ...form,
        cost: form.cost ? parseFloat(form.cost) : null,
      }, items)
      onSaved()
    } catch (e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-sm rounded-t-2xl p-5 pb-8 max-h-[88vh] overflow-y-auto">
        <div className="w-9 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <h2 className="text-base font-semibold text-gray-900 mb-4">New Shipment (Abroad)</h2>

        <div className="space-y-3">
          {/* Direction toggle */}
          <div>
            <label className={labelCls}>Direction *</label>
            <div className="flex gap-2">
              {[['send', '📤 Send abroad'], ['receive', '📥 Receive from abroad']].map(([v, lbl]) => (
                <button key={v} type="button" onClick={() => setF('direction', v)}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-colors ${form.direction === v ? 'bg-blue-900 text-white' : 'border border-gray-200 text-gray-600'}`}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>Tracking number *</label>
            <input value={form.tracking_number} onChange={e => setF('tracking_number', e.target.value)}
              placeholder="e.g. DHL1234567890" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>{form.direction === 'receive' ? 'Origin' : 'Destination'}</label>
              <input value={form.destination} onChange={e => setF('destination', e.target.value)}
                placeholder="e.g. Vietnam" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Courier</label>
              <input value={form.courier} onChange={e => setF('courier', e.target.value)}
                placeholder="e.g. DHL" className={inputCls} />
            </div>
          </div>

          {/* Cost + currency */}
          <div>
            <label className={labelCls}>Delivery cost</label>
            <div className="flex gap-2">
              <input type="number" min="0" step="0.01" value={form.cost} onChange={e => setF('cost', e.target.value)}
                placeholder="0.00" className={inputCls + ' flex-1'} />
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                {['THB', 'USD'].map(c => (
                  <button key={c} type="button" onClick={() => setF('currency', c)}
                    className={`px-3 text-sm font-medium ${form.currency === c ? 'bg-blue-900 text-white' : 'text-gray-500'}`}>
                    {c === 'THB' ? '฿ THB' : '$ USD'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Products */}
          <div>
            <label className={labelCls}>Products *</label>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="flex gap-2">
                  <input value={it.product_name} onChange={e => setItem(i, 'product_name', e.target.value)}
                    placeholder={`Product ${i + 1}`} className={inputCls + ' flex-1'} />
                  <input type="number" min="0" value={it.quantity} onChange={e => setItem(i, 'quantity', e.target.value)}
                    placeholder="Qty" className={inputCls + ' w-20'} />
                  <input value={it.unit} onChange={e => setItem(i, 'unit', e.target.value)}
                    placeholder="unit" className={inputCls + ' w-16'} />
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setItems(its => [...its, { ...BLANK_ITEM }])}
              className="text-xs text-blue-700 mt-2">+ Add product row</button>
          </div>

          <div>
            <label className={labelCls}>Notes</label>
            <textarea value={form.notes} onChange={e => setF('notes', e.target.value)}
              rows={2} className={inputCls + ' resize-none'} placeholder="Optional notes…" />
          </div>

          {err && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 rounded-xl py-3 text-sm text-gray-600">Cancel</button>
            <button type="button" onClick={handleSubmit} disabled={saving}
              className="flex-1 bg-blue-900 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-60">
              {saving ? 'Saving…' : 'Save shipment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Printable detail ──────────────────────────────────────
function ShipmentDetail({ id, onBack, onDeleted, isAdmin, myIndustries = [] }) {
  const [ship, setShip] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getShipment(id).then(d => { setShip(d); setLoading(false) }).catch(() => setLoading(false))
  }, [id])

  if (loading || !ship) return <div className="p-8"><Spinner /></div>

  const items = (ship.shipment_items || []).sort((a, b) => (a.item_order || 0) - (b.item_order || 0))

  const shipInds = items.map(it => it.industry).filter(Boolean)
  const canSeeCost = isAdmin || shipInds.some(ind => myIndustries.includes(ind))

  async function handleDelete() {
    if (!confirm('Delete this shipment?')) return
    await deleteShipment(id)
    onDeleted()
  }

  return (
    <>
      <div className="no-print bg-slate-900 px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="text-slate-400 text-sm">←</button>
        <h1 className="text-white text-base font-semibold flex-1">{ship.ship_number}</h1>
        <button onClick={() => window.print()} className="text-xs bg-white text-slate-900 px-3 py-1.5 rounded-lg font-medium">🖨 Print</button>
      </div>

      <div className="p-4 print-area">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="text-center mb-4">
            <p className="text-xs text-gray-400">KAWA International Group</p>
            <h2 className="text-lg font-bold text-gray-900">Shipment Report</h2>
            <p className="text-sm text-gray-500">{ship.ship_number} · {(ship.direction || 'send') === 'receive' ? '📥 Received from abroad' : '📤 Sent abroad'}</p>
          </div>

          <table className="w-full text-sm mb-4">
            <tbody>
              <tr className="border-b border-gray-100"><td className="py-2 text-gray-400 w-1/3">Tracking #</td><td className="py-2 font-medium">{ship.tracking_number || '—'}</td></tr>
              <tr className="border-b border-gray-100"><td className="py-2 text-gray-400">{(ship.direction || 'send') === 'receive' ? 'Origin' : 'Destination'}</td><td className="py-2">{ship.destination || '—'}</td></tr>
              <tr className="border-b border-gray-100"><td className="py-2 text-gray-400">Courier</td><td className="py-2">{ship.courier || '—'}</td></tr>
              {canSeeCost && <tr className="border-b border-gray-100"><td className="py-2 text-gray-400">Delivery cost</td><td className="py-2 font-bold text-blue-900">{money(ship.cost, ship.currency)}</td></tr>}
              <tr><td className="py-2 text-gray-400">Date</td><td className="py-2">{ship.created_at ? new Date(ship.created_at).toLocaleDateString('en-GB') : '—'}</td></tr>
            </tbody>
          </table>

          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Products</p>
          <table className="w-full text-sm border border-gray-200">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="py-2 px-2 font-medium text-gray-500 w-8">#</th>
                <th className="py-2 px-2 font-medium text-gray-500">Product</th>
                <th className="py-2 px-2 font-medium text-gray-500 text-right">Qty</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={it.id || i} className="border-t border-gray-100">
                  <td className="py-2 px-2 text-gray-400">{i + 1}</td>
                  <td className="py-2 px-2">{it.product_name}</td>
                  <td className="py-2 px-2 text-right">{it.quantity ?? '—'} {it.unit || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {ship.notes && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Notes</p>
              <p className="text-sm text-gray-700">{ship.notes}</p>
            </div>
          )}
        </div>

        {isAdmin && (
          <button onClick={handleDelete}
            className="no-print w-full mt-4 border border-red-200 text-red-500 rounded-xl py-3 text-sm">Delete shipment</button>
        )}
      </div>

      <style>{`@media print { .no-print { display:none!important; } nav,header { display:none!important; } .print-area { padding:0!important; } }`}</style>
    </>
  )
}
