import { useState } from 'react'
import { useProducts, addProduct, deleteProduct, addSupplier, renameProduct,
         useCollections, addCollection, addProductToCollection, updateProductExpiry } from '../hooks/useWarehouse'
import { useSuppliers } from '../hooks/useWarehouse'
import { INDUSTRIES, AMOUNT_UNITS, SUPPLIER_CATEGORIES } from '../lib/constants'
import { Spinner, Empty } from '../components/UI'
import SupplierPicker from '../components/SupplierPicker'
import { useAuth } from '../lib/AuthContext'

const CAT_ICONS = {
  'Paint & Construction': '🏗️',
  'S Plus': '➕',
  'Personal Care & Home Care': '🧴',
  'Agriculture': '🌾',
  'Lubricant': '⚙️',
  'Plastics': '🧪',
  'Food': '🍽️',
  'Other': '📦',
}

export default function ProductsPage() {
  const { products, loading, refetch } = useProducts()
  const { suppliers, refetch: refetchSuppliers } = useSuppliers()
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [filterSupplier, setFilterSupplier] = useState('')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [renaming, setRenaming] = useState(null)  // product being renamed
  const [renameVal, setRenameVal] = useState('')
  const [renameSaving, setRenameSaving] = useState(false)
  const [form, setForm] = useState({ name:'', supplier_name:'', industry:'', default_amount:'', default_unit:'g', current_qty:'0' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [openCats, setOpenCats] = useState({})
  const [showNewSup, setShowNewSup] = useState(false)
  const [newSup, setNewSup] = useState({ name:'', category:'' })
  const [savingSup, setSavingSup] = useState(false)
  // Givaudan collections
  const { collections, refetch: refetchCollections } = useCollections()
  const [openColl, setOpenColl] = useState({})
  const [newCollName, setNewCollName] = useState('')
  const [showNewColl, setShowNewColl] = useState(false)
  const [addToColl, setAddToColl] = useState(null)  // collection id we're adding a product to
  const [collProd, setCollProd] = useState({ name:'', expiry:'', unit:'g' })
  const [collBusy, setCollBusy] = useState(false)

  async function handleAddCollection() {
    if (!newCollName.trim()) return
    setCollBusy(true)
    try { await addCollection(newCollName); setNewCollName(''); setShowNewColl(false); refetchCollections() }
    catch (e) { alert(e.message) } finally { setCollBusy(false) }
  }

  async function handleAddProductToCollection() {
    if (!collProd.name.trim() || !addToColl) return
    setCollBusy(true)
    try {
      await addProductToCollection({ name: collProd.name, collectionId: addToColl, expiryDate: collProd.expiry, defaultUnit: collProd.unit })
      setCollProd({ name:'', expiry:'', unit:'g' }); setAddToColl(null); refetch()
    } catch (e) { alert(e.message) } finally { setCollBusy(false) }
  }

  async function handleAddSupplier() {
    if (!newSup.name.trim()) { setErr('Supplier name required'); return }
    setSavingSup(true); setErr('')
    try {
      await addSupplier({ name: newSup.name, category: newSup.category })
      await refetchSuppliers()
      setF('supplier_name', newSup.name.trim())
      setNewSup({ name:'', category:'' })
      setShowNewSup(false)
    } catch (e) { setErr(e.message) }
    finally { setSavingSup(false) }
  }

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
    if (i.includes('food')) return 'Food'
    return 'Other'
  }

  // Group: category -> supplier -> products
  // The product's own industry wins when it's Food; otherwise prefer the
  // supplier's category, then fall back to the product's industry.
  const byCategory = {}
  filtered.forEach(p => {
    const sup = p.suppliers?.name || p.supplier_name || 'No Supplier'
    const industryCat = industryToCategory(p.industry)
    const cat = industryCat === 'Food' ? 'Food' : (supCategory[sup] || industryCat)
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

  function renderGivaudanCollections() {
    const givaudanProducts = products.filter(p =>
      (p.suppliers?.name || p.supplier_name || '').toLowerCase().includes('givaud'))
    const inColl = (cid) => givaudanProducts.filter(p => p.collection_id === cid)
    return (
      <div className="mb-3 bg-white rounded-xl border border-purple-100 p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold display text-purple-900">✨ Givaudan Collections</p>
          {isAdmin && (
            <button onClick={() => setShowNewColl(v => !v)}
              className="text-xs text-blue-700 font-medium">{showNewColl ? 'Cancel' : '+ New collection'}</button>
          )}
        </div>
        {showNewColl && isAdmin && (
          <div className="flex gap-2 mb-3">
            <input value={newCollName} onChange={e => setNewCollName(e.target.value)}
              placeholder="Collection name" className={inputCls} />
            <button onClick={handleAddCollection} disabled={collBusy}
              className="btn-primary text-sm px-4 rounded-lg whitespace-nowrap">{collBusy ? '…' : 'Create'}</button>
          </div>
        )}
        {collections.length === 0 ? (
          <p className="text-xs text-slate-400">No collections yet.{isAdmin ? ' Create one above.' : ''}</p>
        ) : (
          <div className="space-y-2">
            {collections.map(c => {
              const prods = inColl(c.id)
              const open = openColl[c.id]
              return (
                <div key={c.id} className="border border-gray-100 rounded-xl overflow-hidden">
                  <button onClick={() => setOpenColl(o => ({ ...o, [c.id]: !o[c.id] }))}
                    className="w-full flex items-center gap-2 px-3 py-2.5 bg-slate-50 text-left">
                    <span className="text-base">📂</span>
                    <span className="flex-1 text-sm font-semibold text-slate-800">{c.name}</span>
                    <span className="text-[11px] text-slate-400 bg-white px-2 py-0.5 rounded-full">{prods.length}</span>
                    <span className={`text-xs text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
                  </button>
                  {open && (
                    <div className="p-2 space-y-1.5">
                      {prods.length === 0 && <p className="text-[11px] text-slate-400 px-2">No products in this collection yet.</p>}
                      {prods.map(p => (
                        <div key={p.id} className="card-flat px-3 py-2 flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
                            <p className="text-[11px] text-slate-400">
                              Qty {p.current_qty ?? 0} {p.default_unit || ''}
                              {p.expiry_date && <span className="text-amber-600"> · Exp {p.expiry_date}</span>}
                            </p>
                          </div>
                          {isAdmin && (
                            <button onClick={() => handleDelete(p.id)}
                              className="w-6 h-6 rounded text-slate-300 hover:text-red-500">✕</button>
                          )}
                        </div>
                      ))}
                      {isAdmin && (
                        addToColl === c.id ? (
                          <div className="bg-blue-50 rounded-lg p-2 space-y-2">
                            <input value={collProd.name} onChange={e => setCollProd(s => ({ ...s, name: e.target.value }))}
                              placeholder="Product name" className={inputCls} />
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <label className="block text-[11px] text-slate-500 mb-0.5">Expiry date</label>
                                <input type="date" value={collProd.expiry} onChange={e => setCollProd(s => ({ ...s, expiry: e.target.value }))} className={inputCls} />
                              </div>
                              <div className="w-20">
                                <label className="block text-[11px] text-slate-500 mb-0.5">Unit</label>
                                <input value={collProd.unit} onChange={e => setCollProd(s => ({ ...s, unit: e.target.value }))} className={inputCls} />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => setAddToColl(null)} className="flex-1 border border-gray-200 rounded-lg py-1.5 text-xs text-gray-600">Cancel</button>
                              <button onClick={handleAddProductToCollection} disabled={collBusy}
                                className="flex-1 btn-primary rounded-lg py-1.5 text-xs">{collBusy ? '…' : 'Add product'}</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => { setAddToColl(c.id); setCollProd({ name:'', expiry:'', unit:'g' }) }}
                            className="w-full text-xs text-blue-700 border border-dashed border-blue-200 rounded-lg py-2">+ Add product to {c.name}</button>
                        )
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="px-4 pb-24 pt-2">
      {/* Search + Add */}
      <div className="flex gap-2 mb-3">
        <input type="search" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search products…"
          className="flex-1 card-flat px-4 py-2.5 text-sm outline-none focus:border-blue-700" />
        {isAdmin && (
          <button onClick={() => setShowAdd(true)}
            className="btn-primary text-sm px-5 rounded-xl">+ Add</button>
        )}
      </div>

      {/* Supplier filter */}
      <div className="mb-3">
        <SupplierPicker value={filterSupplier} onChange={setFilterSupplier} />
        {filterSupplier && (
          <p className="text-xs text-gray-400 mt-1">Showing products from {filterSupplier}</p>
        )}
      </div>

      <p className="text-xs text-gray-400 mb-3">{products.length} products total</p>

      {/* Givaudan Collections now render inside the Personal Care & Home Care folder */}

      {/* Grouped product list: Category folder -> Supplier -> Products */}
      {loading ? <Spinner /> : sortedCategories.length === 0 ? (
        <Empty icon="🧴" message="No products yet" />
      ) : (
        sortedCategories.map(([cat, supObj]) => {
          const supGroups = Object.entries(supObj).sort(([a],[b]) => a.localeCompare(b))
          const catCount = supGroups.reduce((n, [, ps]) => n + ps.length, 0)
          const isOpen = openCats[cat]
          return (
            <div key={cat} className="mb-2.5">
              {/* Category folder header */}
              <button onClick={() => toggleCat(cat)}
                className={`w-full flex items-center gap-3 rounded-2xl px-3.5 py-3.5 transition-all ${isOpen ? 'brand-header text-white card-lift' : 'card text-slate-900'}`}>
                <span className={`flex items-center justify-center w-9 h-9 rounded-xl text-base flex-shrink-0 ${isOpen ? 'bg-white/15' : 'bg-slate-900 text-white'}`}>
                  {CAT_ICONS[cat] || '📁'}
                </span>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold display">{cat}</p>
                  <p className={`text-[11px] ${isOpen ? 'text-sky-200/80' : 'text-slate-400'}`}>{supGroups.length} suppliers · {catCount} products</p>
                </div>
                <span className={`transition-transform text-xs ${isOpen ? 'rotate-90 text-white' : 'text-slate-400'}`}>▶</span>
              </button>

              {/* Suppliers inside the category */}
              {isOpen && (
                <div className="mt-2.5 ml-2 space-y-4">
                  {cat === 'Personal Care & Home Care' && renderGivaudanCollections()}
                  {supGroups.map(([supName, prods]) => (
                    <div key={supName}>
                      <div className="flex items-center gap-2 mb-2 rail pl-3">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {supName[0].toUpperCase()}
                        </div>
                        <p className="text-sm font-semibold text-slate-700">{supName}</p>
                        <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{prods.length}</span>
                      </div>
                      <div className="space-y-1.5 ml-9">
                        {prods.map(p => (
                          <div key={p.id} className="card-flat px-3.5 py-3 flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">{p.name}</p>
                              {p.industry && <p className="text-[11px] text-slate-400 mt-0.5">{p.industry}</p>}
                            </div>
                            <div className="text-right flex-shrink-0 bg-slate-50 rounded-lg px-2.5 py-1">
                              <p className="text-sm font-bold text-slate-900 leading-none">{p.current_qty ?? 0}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{p.default_unit || 'units'}</p>
                            </div>
                            {isAdmin && (
                              <button onClick={() => { setRenaming(p); setRenameVal(p.name) }}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:bg-blue-50 hover:text-blue-500 flex-shrink-0" title="Rename">✎</button>
                            )}
                            {isAdmin && (
                              <button onClick={() => handleDelete(p.id)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:bg-red-50 hover:text-red-500 flex-shrink-0">✕</button>
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

      {/* Rename product modal (admin) */}
      {renaming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => setRenaming(null)} />
          <div className="relative bg-white w-full max-w-sm rounded-2xl p-5 shadow-xl">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Rename product</h2>
            <p className="text-xs text-gray-400 mb-4">Was: {renaming.name}</p>
            <input value={renameVal} onChange={e => setRenameVal(e.target.value)}
              className={inputCls} autoFocus />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setRenaming(null)}
                className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600">Cancel</button>
              <button disabled={renameSaving || !renameVal.trim()}
                onClick={async () => {
                  setRenameSaving(true)
                  try { await renameProduct(renaming.id, renameVal); await refetch(); setRenaming(null) }
                  catch (e) { alert(e.message) }
                  finally { setRenameSaving(false) }
                }}
                className="flex-1 bg-blue-900 text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-60">
                {renameSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
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
                <div className="flex items-center justify-between">
                  <label className={labelCls}>Supplier</label>
                  {isAdmin && (
                    <button type="button" onClick={() => setShowNewSup(v => !v)}
                      className="text-xs text-blue-700 hover:underline mb-1">
                      {showNewSup ? 'Cancel' : '+ New supplier'}
                    </button>
                  )}
                </div>
                {showNewSup ? (
                  <div className="space-y-2 bg-gray-50 rounded-xl p-3">
                    <input value={newSup.name} onChange={e => setNewSup(s => ({ ...s, name: e.target.value }))}
                      placeholder="Supplier name" className={inputCls} />
                    <select value={newSup.category} onChange={e => setNewSup(s => ({ ...s, category: e.target.value }))}
                      className={inputCls}>
                      <option value="">Select category…</option>
                      {SUPPLIER_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <button type="button" onClick={handleAddSupplier} disabled={savingSup}
                      className="w-full bg-blue-900 text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-60">
                      {savingSup ? 'Saving…' : 'Save supplier'}
                    </button>
                  </div>
                ) : (
                  <SupplierPicker value={form.supplier_name} onChange={v => setF('supplier_name', v)} />
                )}
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
