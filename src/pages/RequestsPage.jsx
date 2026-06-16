import { useState } from 'react'
import { useIncomingRequests, decideRequest } from '../hooks/useWarehouse'
import { useAuth } from '../lib/AuthContext'
import { Spinner, Empty } from '../components/UI'

function fmtDate(s) {
  if (!s) return ''
  try { return new Date(s).toLocaleString() } catch { return s }
}

export default function RequestsPage() {
  const { profile } = useAuth()
  const myEmail = (profile?.email || '').toLowerCase()
  const { requests, loading, refetch } = useIncomingRequests()
  const [tab, setTab] = useState('incoming')   // incoming | mine
  const [busy, setBusy] = useState(null)

  async function decide(id, status) {
    setBusy(id)
    try { await decideRequest(id, status); await refetch() }
    finally { setBusy(null) }
  }

  // Incoming = addressed to me as owner. Mine = requests I made.
  const incoming = requests.filter(r => (r.owner_email || '').toLowerCase() === myEmail)
  const mine = requests.filter(r => r.requester_id === profile?.id)
  const list = tab === 'incoming' ? incoming : mine
  const pendingIncoming = incoming.filter(r => r.status === 'pending').length

  return (
    <div className="px-4 pb-24 pt-3">
      <div className="flex gap-2 mb-3">
        <button onClick={() => setTab('incoming')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium ${tab==='incoming' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
          To approve {pendingIncoming > 0 && <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingIncoming}</span>}
        </button>
        <button onClick={() => setTab('mine')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium ${tab==='mine' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
          My requests
        </button>
      </div>

      {loading ? <Spinner /> : list.length === 0 ? (
        <Empty icon="📭" message={tab==='incoming' ? 'No requests to approve' : 'You have no requests'} />
      ) : (
        <div className="space-y-2">
          {list.map(r => (
            <div key={r.id} className="card-flat px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900 truncate">{r.product_name}</p>
                <StatusPill status={r.status} />
              </div>
              {tab === 'incoming'
                ? <p className="text-xs text-slate-500 mt-0.5">From: {r.requester_email || 'unknown'}</p>
                : <p className="text-xs text-slate-500 mt-0.5">Owner: {r.owner_email}</p>}
              {r.note && <p className="text-xs text-slate-400 mt-1 italic">"{r.note}"</p>}
              <p className="text-[11px] text-slate-400 mt-1">{fmtDate(r.created_at)}</p>

              {tab === 'incoming' && r.status === 'pending' && (
                <div className="flex gap-2 mt-2">
                  <button disabled={busy===r.id} onClick={() => decide(r.id, 'rejected')}
                    className="flex-1 border border-red-200 text-red-600 rounded-lg py-2 text-xs font-medium">Reject</button>
                  <button disabled={busy===r.id} onClick={() => decide(r.id, 'approved')}
                    className="flex-1 bg-green-600 text-white rounded-lg py-2 text-xs font-medium">{busy===r.id ? '…' : 'Approve'}</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatusPill({ status }) {
  const map = {
    pending:  'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  }
  return <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${map[status]||'bg-slate-100 text-slate-600'}`}>{status}</span>
}
