import { useState } from 'react'
import { fetchStockInReport } from '../hooks/useWarehouse'
import { Spinner, Empty } from '../components/UI'

function fmtDate(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ReportsPage() {
  const today = new Date().toISOString().slice(0, 10)
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const [from, setFrom] = useState(monthAgo)
  const [to, setTo] = useState(today)
  const [rows, setRows] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-700 bg-white"

  async function generate() {
    setLoading(true); setErr(''); setRows(null)
    try {
      const data = await fetchStockInReport(from, to)
      setRows(data)
    } catch (e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  // Group rows by industry
  const byIndustry = {}
  ;(rows || []).forEach(r => {
    const ind = r.products?.industry || 'Uncategorized'
    if (!byIndustry[ind]) byIndustry[ind] = []
    byIndustry[ind].push(r)
  })
  const industries = Object.entries(byIndustry).sort(([a], [b]) => a.localeCompare(b))

  // Totals
  const grandCount = (rows || []).length
  const industrySummary = industries.map(([ind, items]) => ({
    ind,
    count: items.length,
    // sum total_amount grouped by unit
    units: items.reduce((acc, it) => {
      const u = it.total_unit || it.pack_size_unit || 'unit'
      acc[u] = (acc[u] || 0) + (it.total_amount || 0)
      return acc
    }, {}),
  }))

  function unitStr(units) {
    const parts = Object.entries(units).filter(([, v]) => v > 0)
    if (parts.length === 0) return '—'
    return parts.map(([u, v]) => `${v.toLocaleString()} ${u}`).join(', ')
  }

  return (
    <>
      <div className="px-4 pb-24 pt-3">
        {/* Controls */}
        <div className="no-print bg-white rounded-xl border border-gray-100 p-4 space-y-3 mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock Import Report</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">From</label>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">To</label>
              <input type="date" value={to} onChange={e => setTo(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={generate} disabled={loading}
              className="flex-1 bg-blue-900 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60">
              {loading ? 'Generating…' : 'Generate report'}
            </button>
            {rows && rows.length > 0 && (
              <button onClick={() => window.print()}
                className="px-4 border border-gray-200 rounded-xl text-sm text-gray-600">🖨 Print</button>
            )}
          </div>
          {err && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
        </div>

        {/* Report output */}
        {loading ? <Spinner /> : rows === null ? (
          <p className="text-center text-sm text-gray-400 mt-8">Pick a date range and generate.</p>
        ) : rows.length === 0 ? (
          <Empty icon="📊" message="No stock imports in this period" />
        ) : (
          <div className="print-area">
            {/* Header for print */}
            <div className="text-center mb-4">
              <p className="text-xs text-gray-400">KAWA International Group</p>
              <h2 className="text-lg font-bold text-gray-900">Stock Import Report</h2>
              <p className="text-sm text-gray-500">{fmtDate(from)} — {fmtDate(to)}</p>
            </div>

            {/* Summary table */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Summary by Industry</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-100">
                    <th className="py-1.5">Industry</th>
                    <th className="py-1.5 text-right">Entries</th>
                    <th className="py-1.5 text-right">Total imported</th>
                  </tr>
                </thead>
                <tbody>
                  {industrySummary.map(s => (
                    <tr key={s.ind} className="border-b border-gray-50">
                      <td className="py-1.5 font-medium">{s.ind}</td>
                      <td className="py-1.5 text-right">{s.count}</td>
                      <td className="py-1.5 text-right text-gray-600">{unitStr(s.units)}</td>
                    </tr>
                  ))}
                  <tr className="font-bold text-blue-900">
                    <td className="py-2">TOTAL</td>
                    <td className="py-2 text-right">{grandCount}</td>
                    <td className="py-2 text-right"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Detail per industry */}
            {industries.map(([ind, items]) => (
              <div key={ind} className="bg-white rounded-xl border border-gray-100 p-4 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-gray-900">{ind}</p>
                  <span className="text-xs text-gray-400">{items.length} entries</span>
                </div>
                <table className="w-full text-xs border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50 text-left text-gray-500">
                      <th className="py-1.5 px-1.5">Date</th>
                      <th className="py-1.5 px-1.5">Product</th>
                      <th className="py-1.5 px-1.5">Supplier</th>
                      <th className="py-1.5 px-1.5">Lot</th>
                      <th className="py-1.5 px-1.5 text-right">Qty</th>
                      <th className="py-1.5 px-1.5">By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, i) => (
                      <tr key={it.id || i} className="border-t border-gray-100">
                        <td className="py-1.5 px-1.5 whitespace-nowrap">{fmtDate(it.created_at)}</td>
                        <td className="py-1.5 px-1.5">{it.product_name || it.products?.name || '—'}</td>
                        <td className="py-1.5 px-1.5">{it.supplier_name || it.products?.supplier_name || '—'}</td>
                        <td className="py-1.5 px-1.5">{it.lot_number || '—'}</td>
                        <td className="py-1.5 px-1.5 text-right whitespace-nowrap">{it.total_amount ?? '—'} {it.total_unit || ''}</td>
                        <td className="py-1.5 px-1.5">{it.updated_by_name || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`@media print { .no-print { display:none!important; } nav,header { display:none!important; } .print-area { padding:0!important; } }`}</style>
    </>
  )
}
