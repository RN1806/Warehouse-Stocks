import { useState } from 'react'
import { fetchSampleInOutReport } from '../hooks/useWarehouse'
import { Spinner, Empty } from '../components/UI'

function fmtDate(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function unitTotals(list) {
  const u = {}
  list.forEach(m => { const k = m.unit || 'unit'; u[k] = (u[k] || 0) + (Number(m.amount) || 0) })
  const parts = Object.entries(u).filter(([, v]) => v > 0)
  return parts.length ? parts.map(([k, v]) => `${v.toLocaleString()} ${k}`).join(', ') : '—'
}

export default function SampleTrackingPage() {
  const today = new Date().toISOString().slice(0, 10)
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const [from, setFrom] = useState(monthAgo)
  const [to, setTo] = useState(today)
  const [moves, setMoves] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [supFilter, setSupFilter] = useState('')

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-700 bg-white"

  async function generate() {
    setLoading(true); setErr(''); setMoves(null)
    try {
      const data = await fetchSampleInOutReport(from, to)
      setMoves(data)
    } catch (e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  const filtered = (moves || []).filter(m => {
    if (catFilter && (m.category || '').toLowerCase() !== catFilter.toLowerCase()) return false
    if (supFilter && !(m.supplier || '').toLowerCase().includes(supFilter.toLowerCase())) return false
    return true
  })

  const categories = [...new Set((moves || []).map(m => m.category || 'Uncategorized'))].sort()

  const bySupplier = {}
  filtered.forEach(m => {
    if (!bySupplier[m.supplier]) bySupplier[m.supplier] = { in: [], out: [] }
    bySupplier[m.supplier][m.direction].push(m)
  })
  const suppliers = Object.entries(bySupplier).sort(([a], [b]) => a.localeCompare(b))

  const byProduct = {}
  filtered.forEach(m => {
    if (!byProduct[m.product]) byProduct[m.product] = { in: [], out: [], supplier: m.supplier }
    byProduct[m.product][m.direction].push(m)
  })
  const productsArr = Object.entries(byProduct).sort(([a], [b]) => a.localeCompare(b))

  const totalIn = filtered.filter(m => m.direction === 'in')
  const totalOut = filtered.filter(m => m.direction === 'out')

  async function exportExcel() {
    const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs')
    const supplierSummary = suppliers.map(([sup, g]) => ({
      Supplier: sup, 'In (entries)': g.in.length, 'In (qty)': unitTotals(g.in),
      'Out (entries)': g.out.length, 'Out (qty)': unitTotals(g.out),
    }))
    const productSummary = productsArr.map(([prod, g]) => ({
      Product: prod, Supplier: g.supplier, 'In (entries)': g.in.length, 'In (qty)': unitTotals(g.in),
      'Out (entries)': g.out.length, 'Out (qty)': unitTotals(g.out),
    }))
    const overall = [{
      'Total movements': filtered.length, 'In (entries)': totalIn.length, 'In (qty)': unitTotals(totalIn),
      'Out (entries)': totalOut.length, 'Out (qty)': unitTotals(totalOut),
    }]
    const detail = filtered.slice().sort((a, b) =>
      a.supplier.localeCompare(b.supplier) || new Date(a.date) - new Date(b.date)
    ).map(m => ({
      Supplier: m.supplier, Category: m.category, Product: m.product,
      Direction: m.direction === 'in' ? 'IN' : 'OUT',
      Date: fmtDate(m.date), Amount: m.amount ?? '', Unit: m.unit || '', Reference: m.ref || '',
    }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(overall), 'Overall')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(supplierSummary), 'By Supplier')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(productSummary), 'By Product')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detail), 'Movements')
    XLSX.writeFile(wb, `sample-tracking_${from}_to_${to}.xlsx`)
  }

  return (
    <>
      <div className="px-4 pb-24 pt-3">
        <div className="no-print bg-white rounded-xl border border-gray-100 p-4 space-y-3 mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sample In / Out Tracking</p>
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
            {moves && moves.length > 0 && (
              <>
                <button onClick={() => window.print()}
                  className="px-4 border border-gray-200 rounded-xl text-sm text-gray-600">🖨</button>
                <button onClick={exportExcel}
                  className="px-4 border border-green-200 bg-green-50 rounded-xl text-sm text-green-700 font-medium">⬇ Excel</button>
              </>
            )}
          </div>
          {err && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
        </div>

        {moves && moves.length > 0 && (
          <div className="no-print bg-white rounded-xl border border-gray-100 p-4 space-y-2 mb-4">
            <p className="text-xs font-semibold text-gray-500">Filter</p>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Category</label>
              <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className={inputCls}>
                <option value="">All categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Supplier name</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                <input type="text" value={supFilter} onChange={e => setSupFilter(e.target.value)}
                  placeholder="Search supplier…" className={inputCls + ' pl-9'} />
              </div>
            </div>
            {(catFilter || supFilter) && (
              <button onClick={() => { setCatFilter(''); setSupFilter('') }}
                className="text-xs text-blue-700">Clear filters</button>
            )}
          </div>
        )}

        {loading ? <Spinner /> : moves === null ? (
          <p className="text-center text-sm text-gray-400 mt-8">Pick a date range and generate.</p>
        ) : moves.length === 0 ? (
          <Empty icon="📦" message="No sample movements in this period" />
        ) : filtered.length === 0 ? (
          <Empty icon="🔍" message="No movements match the filter" />
        ) : (
          <div className="print-area">
            <div className="text-center mb-4">
              <p className="text-base font-bold text-gray-900">Sample In / Out Tracking</p>
              <p className="text-xs text-gray-500">{fmtDate(from)} – {fmtDate(to)}</p>
            </div>

            <div className="bg-slate-900 text-white rounded-xl p-4 mb-4">
              <p className="text-xs uppercase tracking-wider text-slate-300 mb-2">Overall</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] text-green-300">Received (In)</p>
                  <p className="text-lg font-bold">{totalIn.length}</p>
                  <p className="text-[11px] text-slate-300">{unitTotals(totalIn)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-blue-300">Sent (Out)</p>
                  <p className="text-lg font-bold">{totalOut.length}</p>
                  <p className="text-[11px] text-slate-300">{unitTotals(totalOut)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
              <p className="text-sm font-bold text-gray-900 mb-2">By supplier</p>
              <table className="w-full text-xs border border-gray-200">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500">
                    <th className="py-1.5 px-1.5">Supplier</th>
                    <th className="py-1.5 px-1.5 text-right">In</th>
                    <th className="py-1.5 px-1.5 text-right">Out</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map(([sup, g]) => (
                    <tr key={sup} className="border-t border-gray-100">
                      <td className="py-1.5 px-1.5">{sup}</td>
                      <td className="py-1.5 px-1.5 text-right text-green-700">{g.in.length}</td>
                      <td className="py-1.5 px-1.5 text-right text-blue-700">{g.out.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
              <p className="text-sm font-bold text-gray-900 mb-2">By product</p>
              <table className="w-full text-xs border border-gray-200">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500">
                    <th className="py-1.5 px-1.5">Product</th>
                    <th className="py-1.5 px-1.5 text-right">In</th>
                    <th className="py-1.5 px-1.5 text-right">Out</th>
                  </tr>
                </thead>
                <tbody>
                  {productsArr.map(([prod, g]) => (
                    <tr key={prod} className="border-t border-gray-100">
                      <td className="py-1.5 px-1.5">{prod}<span className="text-gray-400 block text-[10px]">{g.supplier}</span></td>
                      <td className="py-1.5 px-1.5 text-right text-green-700">{g.in.length} <span className="text-gray-400">({unitTotals(g.in)})</span></td>
                      <td className="py-1.5 px-1.5 text-right text-blue-700">{g.out.length} <span className="text-gray-400">({unitTotals(g.out)})</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {suppliers.map(([sup, g]) => (
              <div key={sup} className="bg-white rounded-xl border border-gray-100 p-4 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-gray-900">{sup}</p>
                  <span className="text-xs text-gray-400">↓{g.in.length} ↑{g.out.length}</span>
                </div>
                <table className="w-full text-xs border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50 text-left text-gray-500">
                      <th className="py-1.5 px-1.5">Dir</th>
                      <th className="py-1.5 px-1.5">Date</th>
                      <th className="py-1.5 px-1.5">Product</th>
                      <th className="py-1.5 px-1.5 text-right">Qty</th>
                      <th className="py-1.5 px-1.5">Ref</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...g.in, ...g.out].sort((a, b) => new Date(a.date) - new Date(b.date)).map((m, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="py-1.5 px-1.5">
                          <span className={m.direction === 'in' ? 'text-green-700' : 'text-blue-700'}>
                            {m.direction === 'in' ? 'IN' : 'OUT'}
                          </span>
                        </td>
                        <td className="py-1.5 px-1.5 whitespace-nowrap">{fmtDate(m.date)}</td>
                        <td className="py-1.5 px-1.5">{m.product}</td>
                        <td className="py-1.5 px-1.5 text-right whitespace-nowrap">{m.amount ?? '—'} {m.unit}</td>
                        <td className="py-1.5 px-1.5">{m.ref || '—'}</td>
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
