import { useState } from 'react'
import { useCustomers, saveCustomer } from '../hooks/useWarehouse'
import { useAuth } from '../lib/AuthContext'
import { INDUSTRIES, INDUSTRY_ICONS } from '../lib/constants'
import { Spinner } from './UI'

export default function CustomerPickerModal({ onSelect, onClose }) {
  const { session } = useAuth()
  const { customers, loading, refetch } = useCustomers()
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ company_name:'', company_email:'', address:'', contact_person:'', contact_phone:'', department:'', industry:'' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const filtered = customers.filter(c =>
    c.company_name.toLowerCase().includes(search.toLowerCase()) ||
    c.contact_person?.toLowerCase().includes(search.toLowerCase())
  )

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave(e) {
    e.preventDefault()
    if (!form.company_name.trim()) { setErr('Company name is required.'); return }
    if (!form.company_email.trim()) { setErr('Company email is required.'); return }
    setSaving(true); setErr('')
    try {
      await saveCustomer({ ...form, created_by: session?.user?.id })
      await refetch()
      setShowAdd(false)
      setForm({ company_name:'', company_email:'', address:'', contact_person:'', contact_phone:'', department:'', industry:'' })
    } catch(e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-700"

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-sm rounded-t-2xl shadow-xl" style={{ maxHeight:'85vh', display:'flex', flexDirection:'column' }}>
        <div className="p-4 border-b border-gray-100">
          <div className="w-9 h-1 bg-gray-200 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">Select Customer</h2>
            <button onClick={() => setShowAdd(!showAdd)}
              className="text-xs bg-blue-900 text-white px-3 py-1.5 rounded-lg">
              {showAdd ? 'Cancel' : '+ New'}
            </button>
          </div>
          {!showAdd && (
            <input type="search" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search company or contact…"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-700" />
          )}
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          {showAdd && (
            <form onSubmit={handleSave} className="space-y-3 mb-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Company name *</label>
                <input value={form.company_name} onChange={e => setF('company_name', e.target.value)}
                  placeholder="Company name" className={inputCls} required />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Company email * <span className="text-red-500">required</span></label>
                <input type="email" value={form.company_email} onChange={e => setF('company_email', e.target.value)}
                  placeholder="contact@company.com" className={inputCls} required />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Address</label>
                <textarea value={form.address} onChange={e => setF('address', e.target.value)}
                  placeholder="Full address" rows={2} className={inputCls + ' resize-none'} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Contact person</label>
                  <input value={form.contact_person} onChange={e => setF('contact_person', e.target.value)}
                    placeholder="Name" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Phone</label>
                  <input value={form.contact_phone} onChange={e => setF('contact_phone', e.target.value)}
                    placeholder="Phone" className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Department</label>
                  <input value={form.department} onChange={e => setF('department', e.target.value)}
                    placeholder="e.g. R&D" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Industry</label>
                  <select value={form.industry} onChange={e => setF('industry', e.target.value)}
                    className={inputCls + ' bg-white'}>
                    <option value="">Select…</option>
                    {INDUSTRIES.map(i => <option key={i} value={i}>{INDUSTRY_ICONS[i]} {i}</option>)}
                  </select>
                </div>
              </div>
              {err && <p className="text-xs text-red-600">{err}</p>}
              <button type="submit" disabled={saving}
                className="w-full bg-blue-900 text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-60">
                {saving ? 'Saving…' : 'Save customer'}
              </button>
            </form>
          )}

          {!showAdd && (
            loading ? <Spinner /> :
            filtered.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No customers found</p>
            ) : (
              <div className="space-y-2">
                {filtered.map(c => (
                  <button key={c.id} onClick={() => onSelect(c)}
                    className="w-full text-left bg-white border border-gray-100 rounded-xl p-3.5 hover:border-blue-300 transition-colors">
                    <p className="text-sm font-semibold text-gray-900">{c.company_name}</p>
                    {c.company_email && <p className="text-xs text-blue-600 mt-0.5">✉️ {c.company_email}</p>}
                    {c.contact_person && <p className="text-xs text-gray-500 mt-0.5">👤 {c.contact_person} {c.contact_phone ? `· ${c.contact_phone}` : ''}</p>}
                    <div className="flex gap-2 mt-1.5 flex-wrap">
                      {c.department && <span className="text-xs text-gray-400">{c.department}</span>}
                      {c.industry && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{INDUSTRY_ICONS[c.industry]} {c.industry}</span>}
                    </div>
                  </button>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
