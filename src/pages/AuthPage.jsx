import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'

export default function AuthPage() {
  const { signIn, signUp, resetPassword } = useAuth()
  const [mode, setMode] = useState('login')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setErr(''); setInfo(''); setLoading(true)
    try {
      if (!email.endsWith('@kawainter.com')) {
        throw new Error('Only @kawainter.com email addresses are allowed.')
      }
      if (mode === 'reset') {
        await resetPassword(email)
        setInfo('Password reset link sent! Check your email.')
      } else if (mode === 'signup') {
        if (!fullName.trim()) throw new Error('Please enter your full name.')
        await signUp(email, password, fullName.trim(), phone.trim())
        setInfo('Account created! Please sign in.')
        setMode('login')
      } else {
        await signIn(email, password)
      }
    } catch (e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex flex-col items-center justify-center px-5">
      <div className="mb-8 text-center">
        <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <span className="text-3xl font-bold text-blue-900">K</span>
        </div>
        <h1 className="text-xl font-semibold text-white">KAWA International</h1>
        <p className="text-sm text-blue-300 mt-1">Sample Delivery System</p>
      </div>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6">
        <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
          {['login','signup'].map(m => (
            <button key={m} onClick={() => { setMode(m); setErr(''); setInfo('') }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode===m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
              {m === 'login' ? 'Sign in' : 'Sign up'}
            </button>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (<>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Full name *</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                placeholder="Full name" required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-700" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Phone</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="Phone number"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-700" />
            </div>
          </>)}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Email *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="name@kawainter.com" required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-700" />
          </div>
          {mode !== 'reset' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Password *</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Min. 6 characters" minLength={6} required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-700" />
            </div>
          )}
          {mode === 'login' && (
            <button type="button" onClick={() => { setMode('reset'); setErr(''); setInfo('') }}
              className="text-xs text-blue-700 hover:underline">Forgot password?</button>
          )}
          {mode === 'reset' && (
            <button type="button" onClick={() => { setMode('login'); setErr(''); setInfo('') }}
              className="text-xs text-blue-700 hover:underline">← Back to sign in</button>
          )}
          {err  && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
          {info && <p className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">{info}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-blue-900 text-white rounded-xl py-3 text-sm font-semibold hover:bg-blue-800 disabled:opacity-60 transition-colors">
            {loading ? '…' : mode === 'login' ? 'Sign in' : mode === 'reset' ? 'Send reset link' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  )
}
