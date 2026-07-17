import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'

// Shown automatically when Supabase detects a password-recovery link
// (i.e. the user clicked "Forgot password?" and opened the emailed link).
export default function ResetPasswordPage() {
const { updatePassword, clearRecovery, signOut } = useAuth()
const [password, setPassword] = useState('')
const [confirm, setConfirm] = useState('')
const [loading, setLoading] = useState(false)
const [err, setErr] = useState('')
const [done, setDone] = useState(false)

async function handleSubmit(e) {
e.preventDefault()
setErr('')
if (password.length < 6) { setErr('Password must be at least 6 characters.'); return }
if (password !== confirm) { setErr('Passwords do not match.'); return }
setLoading(true)
try {
await updatePassword(password)
setDone(true)
} catch (e) { setErr(e.message) }
finally { setLoading(false) }
}

return (
<div className="min-h-screen brand-header flex flex-col items-center justify-center px-5">
<div className="mb-8 text-center">
<div className="w-[76px] h-[76px] bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 card-lift">
<span className="display text-4xl font-extrabold text-slate-900">K</span>
</div>
<h1 className="text-2xl font-bold text-white display tracking-tight">KAWA International</h1>
<p className="text-sm text-sky-300/80 mt-1">Set a new password</p>
</div>
<div className="w-full max-w-sm bg-white rounded-2xl card-lift p-6">
{done ? (
<div className="text-center space-y-4">
<p className="text-3xl">✅</p>
<p className="text-sm font-semibold text-gray-900">Password updated!</p>
<p className="text-xs text-gray-500">You're signed in with your new password.</p>
<button onClick={clearRecovery} className="w-full btn-primary rounded-xl py-3 text-sm">
Continue to app
</button>
</div>
) : (
<form onSubmit={handleSubmit} className="space-y-3">
<div>
<label className="block text-xs text-gray-500 mb-1">New password *</label>
<input type="password" value={password} onChange={e => setPassword(e.target.value)}
placeholder="Min. 6 characters" minLength={6} required
className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-700" />
</div>
<div>
<label className="block text-xs text-gray-500 mb-1">Confirm new password *</label>
<input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
placeholder="Re-enter password" minLength={6} required
className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-700" />
</div>
{err && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
<button type="submit" disabled={loading}
className="w-full btn-primary rounded-xl py-3 text-sm">
{loading ? 'Saving…' : 'Set new password'}
</button>
<button type="button" onClick={async () => { await signOut(); clearRecovery() }}
className="w-full text-xs text-gray-400 hover:underline">
Cancel and sign in again
</button>
</form>
)}
</div>
</div>
)
}
