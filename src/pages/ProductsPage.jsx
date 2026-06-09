import { useState } from 'react'
import { useProducts, addProduct, deleteProduct } from '../hooks/useWarehouse'
import { useSuppliers } from '../hooks/useWarehouse'
import { INDUSTRIES, AMOUNT_UNITS } from '../lib/constants'
import { Spinner, Empty } from '../components/UI'
import SupplierPicker from '../components/SupplierPicker'
import { useAuth } from '../lib/AuthContext'

export default function ProductsPage() {
  const { products, loading, refetch } = useProducts()
  const { suppliers } = useSuppliers()
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [filterSupplier, setFilterSupplier] = useState('')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name:'', supplier_name:'', industry:'', default_amount:'', default_unit:'g', current_qty:'0' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [openCats, setOpenCats] = useState({})

  const toggleCat = (cat) => setOpenCats(o => ({ ...o, [cat]: !o[cat] }))

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchSupplier = !filterSupplier || (p.suppliers?.name || p.supplier_name) === filterSupplier
    return matchSearch && matchSupplier
  })

  // Lookup: supplier name -> category (from suppliers table)
  const supCategory = {}
  suppliers.forEach(s => { supCategory[s.name] = s.category || null })

  // Map a product's industry value to one of the 6 category folders
  const industryToCategory = (ind) => {
    if (!ind) return 'Other'
    const i = ind.toLowerCase()
    if (i.includes('paint') || i.includes('construction')) return 'Paint & Construction'
    if (i.includes('s plus') || i.includes('splus')) return 'S Plus'
    if (i.includes('personal') || i.includes('cosmetic') || i.includes('home') || i.includes('household')) return 'Personal Care & Home Care'
    if (i.includes('agri') || i.includes('agro')) return 'Agriculture'
    if (i.includes('lubric')) return 'Lubricant'
    if (i.includes('plastic')) return 'Plastics'
    return 'Other'
  }

  // Group: category -> supplier -> products
  // Prefer the supplier's category; fall back to the product's industry.
  const byCategory = {}
  filtered.forEach(p => {
    const sup = p.suppliers?.name || p.supplier_name || 'No Supplier'
    const cat = supCategory[sup] || industryToCategory(p.industry)
    if (!byCategory[cat]) byCategory[cat] = {}
    if (!byCategory[cat][sup]) byCategory[cat][sup] = []
    byCategory[cat][sup].push(p)
  })
  const sortedCategories = Object.entries(byCategory).sort(([a],[b]) => a.localeCompare(b))

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true); setErr('')
    try {
      const supplier = suppliers.find(s => s.name === form.supplier_name)
      await addProduct({
        name: form.name.trim(),
        supplier_id: supplier?.id || null,
        supplier_name: form.supplier_name || null,
        industry: form.industry || null,
        default_amount: form.default_amount ? parseFloat(form.default_amount) : null,
        default_unit: form.default_unit,
        current_qty: parseInt(form.current_qty) || 0,
      })
      setForm({ name:'', supplier_name:'', industry:'', default_amount:'', default_unit:'g', current_qty:'0' })
      setShowAdd(false)
      refetch()
    } catch(e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!confirm('Remove this product?')) return
    await deleteProduct(id)
    refetch()
  }

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-700 bg-white"
  const labelCls = "block text-xs text-gray-500 mb-1"

  return (
    <div className="px-4 pb-24 pt-2">
      {/* Search + Add */}
      <div className="flex gap-2 mb-3">
        <input type="search" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search products…"
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white outline-none focus:border-blue-700" />
        <button onClick={() => setShowAdd(true)}
          className="bg-blue-900 text-white text-sm px-4 rounded-xl font-medium">+ Add</button>
      </div>

      {/* Supplier filter */}
      <div className="mb-3">
        <SupplierPicker value={filterSupplier} onChange={setFilterSupplier} />
        {filterSupplier && (
          <p className="text-xs text-gray-400 mt-1">Showing products from {filterSupplier}</p>
        )}
      </div>

      <p className="text-xs text-gray-400 mb-3">{products.length} products total</p>

      {/* Grouped product list: Category folder -> Supplier -> Products */}
      {loading ? <Spinner /> : sortedCategories.length === 0 ? (
        <Empty icon="🧴" message="No products yet" />
      ) : (
        sortedCategories.map(([cat, supObj]) => {
          const supGroups = Object.entries(supObj).sort(([a],[b]) => a.localeCompare(b))
          const catCount = supGroups.reduce((n, [, ps]) => n + ps.length, 0)
          const isOpen = openCats[cat]
          return (
            <div key={cat} className="mb-3">
              {/* Category folder header */}
              <button onClick={() => toggleCat(cat)}
                className="w-full flex items-center gap-2 bg-blue-900 text-white rounded-xl px-3 py-2.5">
                <span className={`transition-transform ${isOpen ? 'rotate-90' : ''}`}>▶</span>
                <span className="text-sm font-semibold flex-1 text-left">{cat}</span>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{supGroups.length} suppliers</span>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{catCount}</span>
              </button>

              {/* Suppliers inside the category */}
              {isOpen && (
                <div className="mt-2 ml-2 space-y-4">
                  {supGroups.map(([supName, prods]) => (
                    <div key={supName}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {supName[0].toUpperCase()}
                        </div>
                        <p className="text-sm font-semibold text-gray-700">{supName}</p>
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{prods.length}</span>
                      </div>
                      <div className="space-y-1.5 ml-9">
                        {prods.map(p => (
                          <div key={p.id} className="bg-white border border-gray-100 rounded-xl px-3 py-2.5 flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                              {p.industry && <p className="text-xs text-gray-400">{p.industry}</p>}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-bold text-gray-900">{p.current_qty ?? 0}</p>
                              <p className="text-xs text-gray-400">{p.default_unit || 'units'}</p>
                            </div>
                            {isAdmin && (
                              <button onClick={() => handleDelete(p.id)}
                                className="w-7 h-7 rounded-full flex items-center justify-center text-gray-200 hover:bg-red-50 hover:text-red-400 flex-shrink-0">✕</button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })
      )}

      {/* Add product modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAdd(false)} />
          <form onSubmit={handleAdd} className="relative bg-white w-full max-w-sm rounded-t-2xl p-5 pb-8 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="w-9 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h2 className="text-base font-semibold text-gray-900 mb-4">Add product</h2>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Product name *</label>
                <input value={form.name} onChange={e => setF('name', e.target.value)}
                  placeholder="e.g. The Dream Suite" required className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Supplier</label>
                <SupplierPicker value={form.supplier_name} onChange={v => setF('supplier_name', v)} />
              </div>
              <div>
                <label className={labelCls}>Industry</label>
                <select value={form.industry} onChange={e => setF('industry', e.target.value)} className={inputCls}>
                  <option value="">Select…</option>
                  {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Default amount</label>
                  <input type="number" min="0" value={form.default_amount} onChange={e => setF('default_amount', e.target.value)}
                    placeholder="100" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Unit</label>
                  <select value={form.default_unit} onChange={e => setF('default_unit', e.target.value)} className={inputCls}>
                    {AMOUNT_UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Opening qty</label>
                <input type="number" min="0" value={form.current_qty} onChange={e => setF('current_qty', e.target.value)}
                  className={inputCls} />
              </div>
            </div>
            {err && <p className="text-xs text-red-600 mt-2">{err}</p>}
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={() => setShowAdd(false)}
                className="flex-1 border border-gray-200 rounded-xl py-3 text-sm text-gray-600">Cancel</button>
              <button type="submit" disabled={saving}
                className="flex-1 bg-blue-900 text-white rounded-xl py-3 text-sm font-medium disabled:opacity-60">
                {saving ? 'Adding…' : 'Add product'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
