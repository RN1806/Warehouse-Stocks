import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useProducts, createDelivery, visibleProductsFor } from '../hooks/useWarehouse'
import { INDUSTRIES, INDUSTRY_ICONS, AMOUNT_UNITS } from '../lib/constants'
import CustomerPickerModal from '../components/CustomerPickerModal'
import PackagingInput from '../components/PackagingInput'

const EMPTY_ITEM = { product_name: '', amount: '', unit: 'g', packaging_description: '', lot_no: '', remark: '' }

export default function NewDeliveryPage({ onSaved, onBack }) {
  const { profile } = useAuth()
  const { products: allProducts } = useProducts()
  const products = visibleProductsFor(allProducts, profile)
  const today = new Date().toISOString().slice(0, 10)

  const [form, setForm] = useState({
    delivery_date: today,
    delivery_type: 'customer',
    sales_rep_name: profile?.full_name ?? '',
    sales_rep_phone: profile?.phone ?? '',
    sales_rep_id: profile?.id ?? null,
    customer_id: null,
    customer_name: '',
    customer_email: '',
    customer_address: '',
    contact_person: '',
    contact_phone: '',
    department: '',
    provided_by: '',
    remark: '',
    status: 'draft',
  })

  const [items, setItems] = useState([{...EMPTY_ITEM},{...EMPTY_ITEM},{...EMPTY_ITEM}])
  const [showCustomerPicker, setShowCustomerPicker] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function selectCustomer(c) {
    setForm(f => ({
      ...f,
      customer_id: c.id,
      customer_name: c.company_name,
      customer_email: c.company_email ?? '',
      customer_address: c.address ?? '',
      contact_person: c.contact_person ?? '',
      contact_phone: c.contact_phone ?? '',
      department: c.department ?? '',
    }))
    setShowCustomerPicker(false)
  }

  function setItem(i, k, v) {
    setItems(items => items.map((it, idx) => idx === i ? { ...it, [k]: v } : it))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.delivery_type === 'customer') {
      if (!form.customer_name.trim()) { setErr('Please select or enter a customer.'); return }
      if (!form.customer_address.trim()) { setErr('Address is required.'); return }
      if (!form.contact_phone.trim()) { setErr('Phone number is required.'); return }
    }
    const filled = items.filter(it => it.product_name.trim())
    if (filled.length === 0) { setErr('Please add at least one product.'); return }
    setSaving(true); setErr('')
    try {
      await createDelivery(form, filled)
      onSaved()
    } catch (e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-700 bg-white"
  const labelCls = "block text-xs text-gray-500 mb-1"

  return (
    <>
      <form onSubmit={handleSubmit} className="pb-32">
        <div className="bg-slate-900 px-4 pt-12 pb-5 flex items-start gap-3">
          <button type="button" onClick={onBack} className="text-slate-400 text-sm mt-0.5">←</button>
          <div>
            <p className="text-slate-400 text-xs">KAWA International</p>
            <h1 className="text-white text-lg font-semibold">New Delivery Form</h1>
            <p className="text-slate-300 text-sm">ใบส่งสินค้าตัวอย่าง</p>
          </div>
        </div>

        <div className="px-4 pt-4 space-y-4">
          {/* Delivery info */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Delivery Info</p>
            <div>
              <label className={labelCls}>Purpose *</label>
              <div className="flex gap-2">
                {[['customer','🏢 Customer'],['lab','🔬 Lab use']].map(([v,lbl]) => (
                  <button key={v} type="button" onClick={() => setF('delivery_type', v)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${form.delivery_type===v ? 'bg-blue-900 text-white' : 'border border-gray-200 text-gray-600'}`}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Date *</label>
                <input type="date" value={form.delivery_date} onChange={e => setF('delivery_date', e.target.value)}
                  className={inputCls} required />
              </div>
              <div>
                <label className={labelCls}>Sales person *</label>
                <input type="text" value={form.sales_rep_name} onChange={e => setF('sales_rep_name', e.target.value)}
                  placeholder="Name" className={inputCls} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Sales phone</label>
                <input type="tel" value={form.sales_rep_phone} onChange={e => setF('sales_rep_phone', e.target.value)}
                  placeholder="Phone" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Provided by *</label>
                <input type="text" value={form.provided_by} onChange={e => setF('provided_by', e.target.value)}
                  placeholder="Warehouse staff" className={inputCls} />
              </div>
            </div>
          </div>

          {/* Customer (only for customer deliveries) */}
          {form.delivery_type === 'customer' ? (
          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</p>
              <button type="button" onClick={() => setShowCustomerPicker(true)}
                className="text-xs bg-blue-900 text-white px-3 py-1.5 rounded-lg">📒 Address book</button>
            </div>

            <div>
              <label className={labelCls}>Company name *</label>
              <input type="text" value={form.customer_name} onChange={e => setF('customer_name', e.target.value)}
                placeholder="Company name" className={inputCls} required />
            </div>
            <div>
              <label className={labelCls}>Address *</label>
              <textarea value={form.customer_address} onChange={e => setF('customer_address', e.target.value)}
                placeholder="Address" rows={2} className={inputCls + ' resize-none'} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Contact person</label>
                <input type="text" value={form.contact_person} onChange={e => setF('contact_person', e.target.value)}
                  placeholder="e.g. K.Ploy" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Phone *</label>
                <input type="tel" value={form.contact_phone} onChange={e => setF('contact_phone', e.target.value)}
                  placeholder="Phone" className={inputCls} required />
              </div>
            </div>
            <div>
              <label className={labelCls}>Department / แผนก</label>
              <select value={form.department} onChange={e => setF('department', e.target.value)} className={inputCls}>
                <option value="">Select…</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{INDUSTRY_ICONS[i]} {i}</option>)}
              </select>
            </div>
          </div>
          ) : (
          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">🔬 Lab Use</p>
            <div>
              <label className={labelCls}>Lab / Department</label>
              <input type="text" value={form.customer_name} onChange={e => setF('customer_name', e.target.value)}
                placeholder="e.g. R&D Lab, QC Lab" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Requested by</label>
              <input type="text" value={form.contact_person} onChange={e => setF('contact_person', e.target.value)}
                placeholder="Person requesting the sample" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Purpose / Notes</label>
              <textarea value={form.customer_address} onChange={e => setF('customer_address', e.target.value)}
                placeholder="What is the sample being used for?" rows={2} className={inputCls + ' resize-none'} />
            </div>
          </div>
          )}

          {/* Products */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">รายการ / Products</p>
            {items.map((item, i) => (
              <div key={i} className="border border-gray-100 rounded-lg p-3 mb-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-400">#{i+1}</span>
                  {items.length > 1 && (
                    <button type="button" onClick={() => setItems(items => items.filter((_,idx) => idx!==i))}
                      className="text-gray-300 hover:text-red-400 text-xl">×</button>
                  )}
                </div>
                <div className="mb-2">
                  <label className={labelCls}>Product name</label>
                  <input type="text" value={item.product_name}
                    onChange={e => setItem(i, 'product_name', e.target.value)}
                    placeholder="Product name" list={`prod-${i}`} className={inputCls} />
                  <datalist id={`prod-${i}`}>
                    {products.map(p => <option key={p.id} value={p.name} />)}
                  </datalist>
                </div>
                <div className="mb-2">
                  <PackagingInput
                    label="Amount"
                    amount={item.amount}
                    unit={item.unit}
                    onAmountChange={v => setItem(i, 'amount', v)}
                    onUnitChange={v => setItem(i, 'unit', v)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>Lot No.</label>
                    <input type="text" value={item.lot_no} onChange={e => setItem(i, 'lot_no', e.target.value)}
                      placeholder="Lot number" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Remark</label>
                    <input type="text" value={item.remark} onChange={e => setItem(i, 'remark', e.target.value)}
                      placeholder="Note" className={inputCls} />
                  </div>
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setItems(i => [...i, {...EMPTY_ITEM}])}
              className="w-full border border-dashed border-gray-200 rounded-lg py-2.5 text-sm text-gray-400 hover:border-blue-400 hover:text-blue-600 transition-colors">
              + Add product row
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <label className={labelCls}>Remark / หมายเหตุ</label>
            <textarea value={form.remark} onChange={e => setF('remark', e.target.value)}
              placeholder="Additional notes…" rows={2} className={inputCls + ' resize-none'} />
          </div>

          {err && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4 max-w-sm mx-auto">
          <button type="submit" disabled={saving}
            className="w-full bg-blue-900 text-white rounded-xl py-3.5 text-sm font-semibold disabled:opacity-60 hover:bg-blue-800">
            {saving ? 'Saving…' : '💾 Save Delivery Form'}
          </button>
        </div>
      </form>

      {showCustomerPicker && (
        <CustomerPickerModal onSelect={selectCustomer} onClose={() => setShowCustomerPicker(false)} />
      )}
    </>
  )
}
