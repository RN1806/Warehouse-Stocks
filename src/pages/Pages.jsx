import { useState, useEffect } from 'react'
import { useDeliveries, getDelivery, updateDeliveryStatus, deleteDelivery, useCustomers, saveCustomer, deleteCustomer, updateMyProfile } from '../hooks/useWarehouse'
import { useAuth } from '../lib/AuthContext'
import { StatusBadge, Avatar, Spinner, Empty, FieldRow, SectionCard } from '../components/UI'
import { INDUSTRIES, INDUSTRY_ICONS } from '../lib/constants'

function formatDate(str) {
  if (!str) return ''
  return new Date(str).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
}

// ── Deliveries list ───────────────────────────────────────
export function DeliveriesPage({ onNew, onView }) {
  const { deliveries, loading } = useDeliveries()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [deleting, setDeleting] = useState(null)

  const filtered = deliveries.filter(d => {
    const ms = d.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.sales_rep_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.form_number?.toLowerCase().includes(search.toLowerCase())
    const mst = filterStatus === 'all' || d.status === filterStatus
    return ms && mst
  })

  const counts = { all: deliveries.length, draft: 0, sent: 0, received: 0 }
  deliveries.forEach(d => { if (counts[d.status] !== undefined) counts[d.status]++ })

  async function handleDelete(e, id) {
    e.stopPropagation()
    if (!confirm('Delete this delivery form?')) return
    setDeleting(id)
    try { await deleteDelivery(id) } catch(e) { alert(e.message) }
    setDeleting(null)
  }

  return (
    <div className="pb-24">
      <div className="grid grid-cols-3 gap-2 px-4 py-3">
        {[['Total',counts.all,'text-gray-900'],['Sent',counts.sent,'text-blue-700'],['Received',counts.received,'text-green-700']].map(([l,v,c]) => (
          <div key={l} className="bg-white border border-gray-100 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-1">{l}</p>
            <p className={`text-2xl font-semibold ${c}`}>{v}</p>
          </div>
        ))}
      </div>
      <div className="px-4 pb-2">
        <input type="search" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search customer, sales, form no…"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white outline-none focus:border-blue-700" />
      </div>
      <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-none">
        {['all','draft','sent','received'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors capitalize ${filterStatus===s ? 'bg-blue-900 text-white border-blue-900' : 'border-gray-200 text-gray-600'}`}>
            {s==='all' ? `All (${counts.all})` : `${s} (${counts[s]})`}
          </button>
        ))}
      </div>
      {loading ? <Spinner /> : filtered.length === 0 ? (
        <Empty icon="📋" message="No delivery forms yet"
          action={<button onClick={onNew} className="text-sm bg-blue-900 text-white px-4 py-2 rounded-xl">Create first form</button>} />
      ) : (
        <div className="px-4 space-y-2">
          {filtered.map(d => (
            <div key={d.id} onClick={() => onView(d.id)}
              className="bg-white border border-gray-100 rounded-xl p-4 cursor-pointer hover:border-blue-200 transition-colors">
              <div className="flex items-start justify-between mb-1.5">
                <p className="text-xs font-mono text-gray-400">{d.form_number}</p>
                <StatusBadge status={d.status} />
              </div>
              <p className="text-sm font-semibold text-gray-900 mb-1">{d.customer_name}</p>
              {d.customer_email && <p className="text-xs text-blue-600 mb-1">✉️ {d.customer_email}</p>}
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2.5 flex-wrap">
                <span>📅 {formatDate(d.delivery_date)}</span>
                <span>📦 {d.delivery_items?.length ?? 0} items</span>
                {d.department && <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{INDUSTRY_ICONS[d.department] ?? ''} {d.department}</span>}
              </div>
              <div className="flex items-center justify-between pt-2.5 border-t border-gray-50">
                <div className="flex items-center gap-2">
                  <Avatar name={d.sales_rep_name} size="sm" />
                  <div>
                    <p className="text-xs font-medium text-gray-800">{d.sales_rep_name}</p>
                    {d.provided_by && <p className="text-xs text-gray-400">Prepared: {d.provided_by}</p>}
                  </div>
                </div>
                <button onClick={e => handleDelete(e, d.id)} disabled={deleting===d.id}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-200 hover:bg-red-50 hover:text-red-400">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <button onClick={onNew}
        className="fixed bottom-20 right-4 bg-blue-900 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-800"
        style={{ width:52, height:52 }}>
        <span className="text-2xl font-light">+</span>
      </button>
    </div>
  )
}

// ── Delivery detail ───────────────────────────────────────
export function DeliveryDetailPage({ id, onBack }) {
  const [delivery, setDelivery] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const { profile } = useAuth()
  const canEditStatus = profile?.role === 'admin' || (delivery && delivery.sales_rep_id === profile?.id)

  useEffect(() => {
    getDelivery(id).then(d => { setDelivery(d); setLoading(false) }).catch(() => setLoading(false))
  }, [id])

  async function changeStatus(status) {
    setUpdating(true)
    await updateDeliveryStatus(id, status)
    setDelivery(d => ({ ...d, status }))
    setUpdating(false)
  }

  if (loading) return <Spinner />
  if (!delivery) return <div className="p-4 text-sm text-gray-500">Not found.</div>

  const items = [...(delivery.delivery_items ?? [])].sort((a,b) => a.item_order - b.item_order)

  return (
    <>
      <style>{`@media print { .no-print { display:none!important; } nav,header { display:none!important; } }`}</style>
      <div className="pb-32">
        <div className="no-print bg-slate-900 px-4 pt-12 pb-4 flex items-center gap-3">
          <button onClick={onBack} className="text-slate-400 text-sm">← Back</button>
          <div className="flex-1" />
          <StatusBadge status={delivery.status} />
          <button onClick={() => window.print()}
            className="bg-white text-slate-900 text-xs font-semibold px-3 py-1.5 rounded-lg">🖨️ Print</button>
        </div>
        <div className="px-4 pt-4 space-y-3">
          <SectionCard>
            <div className="flex items-start justify-between mb-3">
              <div><p className="text-2xl font-bold text-blue-900">KAWA</p><p className="text-xs text-gray-400">International Group</p></div>
              <div className="text-right"><p className="text-xs font-mono font-semibold text-gray-600">{delivery.form_number}</p><p className="text-xs text-gray-400">{formatDate(delivery.delivery_date)}</p></div>
            </div>
            <div className="border-t border-b border-gray-100 py-2 text-center">
              <p className="text-sm font-bold text-gray-800">ใบส่งสินค้าตัวอย่าง / Sample Delivery Form</p>
            </div>
          </SectionCard>

          <SectionCard title="Sales / ผู้ขาย">
            <FieldRow label="Sales person" value={delivery.sales_rep_name} />
            <FieldRow label="Phone" value={delivery.sales_rep_phone} />
            <FieldRow label="Provided by" value={delivery.provided_by} />
          </SectionCard>

          <SectionCard title="Customer / ลูกค้า">
            <FieldRow label="Company" value={delivery.customer_name} />
            <FieldRow label="Email" value={delivery.customer_email} />
            <FieldRow label="Address" value={delivery.customer_address} />
            <FieldRow label="Contact" value={delivery.contact_person} />
            <FieldRow label="Phone" value={delivery.contact_phone} />
            <FieldRow label="Department" value={delivery.department} />
          </SectionCard>

          <SectionCard title="รายการ / Products">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-gray-100 text-gray-400 font-medium">
                  <th className="text-left py-2 pr-2 w-5">#</th>
                  <th className="text-left py-2 pr-2">Description</th>
                  <th className="text-left py-2 pr-2">Amount</th>
                  <th className="text-left py-2">Lot No.</th>
                </tr></thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={item.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 pr-2 text-gray-400">{i+1}</td>
                      <td className="py-2 pr-2 font-medium text-gray-800">{item.product_name}</td>
                      <td className="py-2 pr-2 text-gray-600 whitespace-nowrap">{item.amount} {item.unit}</td>
                      <td className="py-2 text-gray-500">{item.lot_no || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          {delivery.remark && <SectionCard title="Remark"><p className="text-sm text-gray-700">{delivery.remark}</p></SectionCard>}

          <SectionCard>
            <div className="grid grid-cols-2 gap-6">
              {[['ผู้ส่ง / Delivery by', delivery.sales_rep_name], ['ผู้รับ / Received by', delivery.contact_person || '']].map(([label, name]) => (
                <div key={label} className="text-center">
                  <div className="border-b border-gray-300 mb-2 h-12" />
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{name || '________________'}</p>
                  <p className="text-xs text-gray-400">{formatDate(delivery.delivery_date)}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {canEditStatus ? (
          <div className="no-print fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 max-w-sm mx-auto">
            <p className="text-xs text-gray-400 text-center mb-2">Update status</p>
            <div className="flex gap-2">
              {['draft','sent','received'].map(s => (
                <button key={s} onClick={() => changeStatus(s)} disabled={updating || delivery.status===s}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-medium capitalize transition-colors ${delivery.status===s ? 'bg-blue-900 text-white' : 'border border-gray-200 text-gray-600'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="no-print fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 max-w-sm mx-auto">
            <p className="text-xs text-gray-400 text-center">Only the form's creator or an admin can change the status</p>
          </div>
        )}
      </div>
    </>
  )
}

// ── Customers page ────────────────────────────────────────
const BLANK_C = { company_name:'', company_email:'', address:'', contact_person:'', contact_phone:'', department:'', industry:'' }

export function CustomersPage() {
  const { session } = useAuth()
  const { customers, loading, refetch } = useCustomers()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const filtered = customers.filter(c =>
    c.company_name.toLowerCase().includes(search.toLowerCase()) ||
    c.contact_person?.toLowerCase().includes(search.toLowerCase())
  )

  const setF = (k, v) => setEditing(e => ({ ...e, [k]: v }))

  async function handleSave(e) {
    e.preventDefault()
    if (!editing.company_name?.trim()) { setErr('Company name is required.'); return }
    if (!editing.company_email?.trim()) { setErr('Company email is required.'); return }
    setSaving(true); setErr('')
    try { await saveCustomer({ ...editing, created_by: session?.user?.id }); await refetch(); setEditing(null) }
    catch(e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-700"

  return (
    <div className="px-4 pb-24 pt-2">
      <div className="flex gap-2 mb-3">
        <input type="search" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search customers…"
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white outline-none focus:border-blue-700" />
        <button onClick={() => setEditing({ ...BLANK_C })}
          className="bg-blue-900 text-white text-sm px-4 rounded-xl font-medium">+ Add</button>
      </div>
      <p className="text-xs text-gray-400 mb-3">{customers.length} customers</p>
      {loading ? <Spinner /> : filtered.length === 0 ? <Empty icon="🏢" message="No customers yet" /> : (
        <div className="space-y-2">
          {filtered.map(c => (
            <div key={c.id} className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="flex items-start justify-between mb-1">
                <p className="text-sm font-semibold text-gray-900">{c.company_name}</p>
                <div className="flex gap-1">
                  <button onClick={() => setEditing({ ...c })} className="w-7 h-7 rounded-full flex items-center justify-center text-gray-300 hover:bg-blue-50 hover:text-blue-500 text-sm">✏️</button>
                  <button onClick={async () => { if(confirm('Remove?')) { await deleteCustomer(c.id); refetch() } }} className="w-7 h-7 rounded-full flex items-center justify-center text-gray-300 hover:bg-red-50 hover:text-red-400">✕</button>
                </div>
              </div>
              {c.company_email && <p className="text-xs text-blue-600 mb-0.5">✉️ {c.company_email}</p>}
              {c.contact_person && <p className="text-xs text-gray-500">👤 {c.contact_person} {c.contact_phone ? `· ${c.contact_phone}` : ''}</p>}
              <div className="flex gap-2 mt-1.5 flex-wrap">
                {c.department && <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{c.department}</span>}
                {c.industry && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{INDUSTRY_ICONS[c.industry]} {c.industry}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditing(null)} />
          <form onSubmit={handleSave} className="relative bg-white w-full max-w-sm rounded-t-2xl p-5 pb-8 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="w-9 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h2 className="text-base font-semibold text-gray-900 mb-4">{editing.id ? 'Edit customer' : 'Add customer'}</h2>
            <div className="space-y-3">
              <div><label className="block text-xs text-gray-500 mb-1">Company name *</label>
                <input value={editing.company_name ?? ''} onChange={e => setF('company_name', e.target.value)} required className={inputCls} /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Company email * <span className="text-red-500">required</span></label>
                <input type="email" value={editing.company_email ?? ''} onChange={e => setF('company_email', e.target.value)} required className={inputCls} /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Address</label>
                <textarea value={editing.address ?? ''} onChange={e => setF('address', e.target.value)} rows={2} className={inputCls + ' resize-none'} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block text-xs text-gray-500 mb-1">Contact</label>
                  <input value={editing.contact_person ?? ''} onChange={e => setF('contact_person', e.target.value)} className={inputCls} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Phone</label>
                  <input value={editing.contact_phone ?? ''} onChange={e => setF('contact_phone', e.target.value)} className={inputCls} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block text-xs text-gray-500 mb-1">Department</label>
                  <input value={editing.department ?? ''} onChange={e => setF('department', e.target.value)} className={inputCls} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Industry</label>
                  <select value={editing.industry ?? ''} onChange={e => setF('industry', e.target.value)} className={inputCls + ' bg-white'}>
                    <option value="">Select…</option>
                    {INDUSTRIES.map(i => <option key={i} value={i}>{INDUSTRY_ICONS[i]} {i}</option>)}
                  </select></div>
              </div>
            </div>
            {err && <p className="text-xs text-red-600 mt-2">{err}</p>}
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={() => setEditing(null)} className="flex-1 border border-gray-200 rounded-xl py-3 text-sm text-gray-600">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 bg-blue-900 text-white rounded-xl py-3 text-sm font-medium disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

// ── Profile page ──────────────────────────────────────────
export function ProfilePage() {
  const { profile, session, signOut, refreshProfile } = useAuth()
  const name = profile?.full_name ?? session?.user?.email ?? 'User'
  const email = profile?.email ?? session?.user?.email ?? ''

  const [editing, setEditing] = useState(false)
  const [fName, setFName] = useState(profile?.full_name ?? '')
  const [fPhone, setFPhone] = useState(profile?.phone ?? '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  function startEdit() {
    setFName(profile?.full_name ?? '')
    setFPhone(profile?.phone ?? '')
    setErr('')
    setEditing(true)
  }

  async function handleSave() {
    if (!fName.trim()) { setErr('Name is required.'); return }
    setSaving(true); setErr('')
    try {
      await updateMyProfile(session.user.id, { full_name: fName, phone: fPhone })
      await refreshProfile()
      setEditing(false)
    } catch (e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-700"

  if (editing) {
    return (
      <div className="px-4 pb-24 pt-4">
        <div className="card p-5 space-y-4">
          <h2 className="text-base font-semibold text-slate-900 display">Edit profile</h2>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Full name *</label>
            <input value={fName} onChange={e => setFName(e.target.value)} className={inputCls} placeholder="Your name" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Phone</label>
            <input value={fPhone} onChange={e => setFPhone(e.target.value)} className={inputCls} placeholder="Phone number" type="tel" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Email</label>
            <input value={email} disabled className={inputCls + ' bg-slate-100 text-slate-400'} />
            <p className="text-[11px] text-slate-400 mt-1">Email is your login and can't be changed here.</p>
          </div>
          {err && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="flex-1 border border-gray-200 rounded-xl py-3 text-sm text-gray-600">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 btn-primary rounded-xl py-3 text-sm">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center gap-4 mb-4">
        <Avatar name={name} size="lg" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{name}</p>
          <p className="text-sm text-gray-500 truncate">{email}</p>
          {profile?.phone && <p className="text-sm text-gray-400">{profile.phone}</p>}
          <span className="inline-block mt-1 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full capitalize">{profile?.role ?? 'staff'}</span>
        </div>
        <button onClick={startEdit} className="text-xs bg-slate-900 text-white px-3 py-1.5 rounded-lg font-medium self-start">Edit</button>
      </div>
      <div className="bg-white border border-gray-100 rounded-2xl divide-y divide-gray-50 mb-4">
        {[['Full name',name],['Email',email],['Phone',profile?.phone??'—'],['Role',profile?.is_lab ? 'Lab' : (profile?.is_sales_manager ? 'Sales Manager' : (profile?.role??'staff'))],['Industries',(profile?.is_lab ? 'All (Lab)' : (profile?.industries?.length ? profile.industries.join(', ') : 'All / none assigned'))]].map(([l,v]) => (
          <div key={l} className="flex justify-between px-4 py-3.5">
            <span className="text-sm text-gray-500">{l}</span>
            <span className="text-sm font-medium text-gray-800 truncate max-w-[180px] capitalize">{v}</span>
          </div>
        ))}
      </div>
      <button onClick={signOut} className="w-full border border-red-200 text-red-600 rounded-xl py-3 text-sm font-medium hover:bg-red-50">Sign out</button>
    </div>
  )
}
