import { useState } from 'react'
import { useStaff, updateStaffMember } from '../hooks/useWarehouse'
import { INDUSTRIES } from '../lib/constants'
import { Spinner, Empty } from '../components/UI'

function roleLabel(s) {
  if (s.is_lab) return 'Lab'
  if (s.is_sales_manager) return 'Sales Manager'
  if (s.role === 'admin') return 'Admin'
  return 'Staff'
}

function roleColor(s) {
  if (s.is_lab) return 'bg-purple-100 text-purple-700'
  if (s.is_sales_manager) return 'bg-blue-100 text-blue-700'
  if (s.role === 'admin') return 'bg-slate-900 text-white'
  return 'bg-slate-100 text-slate-600'
}

export default function StaffPage() {
  const { staff, loading, refetch } = useStaff()
  const [editId, setEditId] = useState(null)
  const [search, setSearch] = useState('')

  const editing = staff.find(s => s.id === editId)
  if (editing) {
    return <StaffEdit member={editing} onBack={() => setEditId(null)} onSaved={() => { setEditId(null); refetch() }} />
  }

  const filtered = staff.filter(s =>
    (s.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.email || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="px-4 pb-24 pt-3">
      <input type="search" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search staff…"
        className="w-full card-flat px-4 py-2.5 text-sm outline-none focus:border-blue-700 mb-3" />

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <Empty icon="👤" message="No staff found" />
      ) : (
        <div className="space-y-2">
          {filtered.map(s => (
            <button key={s.id} onClick={() => setEditId(s.id)}
              className="w-full text-left card-flat px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900 truncate">{s.full_name || s.email}</p>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${roleColor(s)}`}>{roleLabel(s)}</span>
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">{s.email}</p>
              {s.position && <p className="text-xs text-slate-400 mt-0.5">{s.position}</p>}
              <p className="text-[11px] text-slate-400 mt-1">
                {s.is_lab ? 'All industries (Lab)' : (s.industries?.length ? s.industries.join(', ') : 'No industries assigned')}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function StaffEdit({ member, onBack, onSaved }) {
  const [position, setPosition] = useState(member.position || '')
  const [industries, setIndustries] = useState(member.industries || [])
  const [isManager, setIsManager] = useState(member.is_sales_manager === true)
  const [isLab, setIsLab] = useState(member.is_lab === true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const toggleIndustry = (ind) =>
    setIndustries(list => list.includes(ind) ? list.filter(i => i !== ind) : [...list, ind])

  async function handleSave() {
    setSaving(true); setErr('')
    try {
      await updateStaffMember(member.id, {
        position: position.trim() || null,
        industries,
        is_sales_manager: isManager,
        is_lab: isLab,
      })
      onSaved()
    } catch (e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-700"

  return (
    <div className="px-4 pb-24 pt-3">
      <button onClick={onBack} className="text-sm text-slate-500 mb-3">← Back to staff</button>

      <div className="card p-5 space-y-4">
        <div>
          <p className="text-base font-semibold text-slate-900 display">{member.full_name || member.email}</p>
          <p className="text-xs text-slate-500">{member.email}</p>
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-1">Position / title</label>
          <input value={position} onChange={e => setPosition(e.target.value)} className={inputCls}
            placeholder="e.g. Sales Manager (Food)" />
        </div>

        {/* Role flags */}
        <div>
          <label className="block text-xs text-slate-500 mb-1.5">Role</label>
          <div className="flex gap-2">
            <button type="button" onClick={() => { setIsManager(m => !m); }}
              className={`flex-1 py-2.5 rounded-lg text-xs font-medium ${isManager ? 'bg-blue-900 text-white' : 'border border-gray-200 text-gray-600'}`}>
              Sales Manager
            </button>
            <button type="button" onClick={() => { setIsLab(l => !l); }}
              className={`flex-1 py-2.5 rounded-lg text-xs font-medium ${isLab ? 'bg-purple-700 text-white' : 'border border-gray-200 text-gray-600'}`}>
              Lab
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            Managers and Lab can pick products from all industries. Regular staff are limited to their assigned industries.
          </p>
        </div>

        {/* Industries */}
        <div>
          <label className="block text-xs text-slate-500 mb-1.5">Industries</label>
          {isLab ? (
            <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2">Lab staff can access all industries — no selection needed.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {INDUSTRIES.map(ind => (
                <button key={ind} type="button" onClick={() => toggleIndustry(ind)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${industries.includes(ind) ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {ind}
                </button>
              ))}
            </div>
          )}
        </div>

        {err && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}

        <div className="flex gap-2">
          <button onClick={onBack} className="flex-1 border border-gray-200 rounded-xl py-3 text-sm text-gray-600">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 btn-primary rounded-xl py-3 text-sm">{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}
