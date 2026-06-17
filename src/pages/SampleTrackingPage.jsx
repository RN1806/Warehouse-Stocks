import { useState } from 'react'
import { fetchSampleInOutReport } from '../hooks/useWarehouse'
import { Spinner, Empty } from '../components/UI'

function fmtDate(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function SampleTrackingPage() {
  const today = new Date().toISOString().slice(0, 10)
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const [from, setFrom] = useState(monthAgo)
  const [to, setTo] = useState(today)
  const [moves, setMoves] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-700 bg-white"

  async function generate() {
    setLoading(true); setErr(''); setMoves(null)
    try {
      const data = await fetchSampleInOutReport(from, to)
      setMoves(data)
    } catch (e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  // Group by supplier
  const bySupplier = {}
  ;(moves || []).forEach(m => {
    if (!bySupplier[m.supplier]) bySupplier[m.supplier] = { in: [], out: [] }
    bySupplier[m.supplier][m.direction].push(m)
  })
  const suppliers = Object.entries(bySupplier).sort(([a], [b]) => a.localeCompare(b))

  function unitTotals(list) {
    const u = {}
    list.forEach(m => { const k = m.unit || 'unit'; u[k] = (u[k] || 0) + (Number(m.amount) || 0) })
    const parts = Object.entries(u).filter(([, v]) => v > 0)
    return parts.length ? parts.map(([k, v]) => `${v.toLocaleString()} ${k}`).join(', ') : '—'
  }

  const totalIn = (moves || []).filter(m => m.direction === 'in').length
  const totalOut = (moves || []).filter(m => m.direction === 'out').length

  async function exportExcel() {
    const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs')

    const summary = suppliers.map(([sup, g]) => ({
      Supplier: sup,
      'In (entries)': g.in.length,
      'In (qty)': unitTotals(g.in),
      'Out (entries)': g.out.length,
      'Out (qty)': unitTotals(g.out),
    }))
    summary.push({ Supplier: 'TOTAL', 'In (entries)': totalIn, 'In (qty)': '', 'Out (entries)': totalOut, 'Out (qty)': '' })

    const detail = (moves || []).slice().sort((a, b) =>
      a.supplier.localeCompare(b.supplier) || new Date(a.date) - new Date(b.date)
    ).map(m => ({
      Supplier: m.supplier,
      Direction: m.direction === 'in' ? 'IN (received)' : 'OUT (sent)',
      Date: fmtDate(m.date),
      Product: m.product,
      Amount: m.amount ?? '',
      Unit: m.unit || '',
      Reference: m.ref || '',
    }))

    const wb = XLSX.utils.book_new()
    const ws1 = XLSX.utils.json_to_sheet(summary)
    const ws2 = XLSX.utils.json_to_sheet(detail)
    ws1['!cols'] = [{ wch: 28 }, { wch: 12 }, { wch: 20 }, { wch: 13 }, { wch: 20 }]
    ws2['!cols'] = [{ wch: 28 }, { wch: 15 }, { wch: 14 }, { wch: 30 }, { wch: 10 }, { wch: 8 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(wb, ws1, 'Summary by Supplier')
    XLSX.utils.book_append_sheet(wb, ws2, 'Movements')
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

        {loading ? <Spinner /> : moves === null ? (
          <p className="text-center text-sm text-gray-400 mt-8">Pick a date range and generate.</p>
        ) : moves.length === 0 ? (
          <Empty icon="📦" message="No sample movements in this period" />
        ) : (
          <div className="print-area">
            <div className="text-center mb-4">
              <p className="text-base font-bold text-gray-900">Sample In / Out Tracking</p>
              <p className="text-xs text-gray-500">{fmtDate(from)} – {fmtDate(to)}</p>
              <p className="text-xs text-gray-400 mt-1">{totalIn} received · {totalOut} sent</p>
            </div>

            {/* Summary */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
              <p className="text-sm font-bold text-gray-900 mb-2">Summary by supplier</p>
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

            {/* Detail per supplier */}
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
