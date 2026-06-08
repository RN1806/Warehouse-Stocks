import { INDUSTRY_ICONS } from '../lib/constants'

const PALETTES = [
  'bg-blue-100 text-blue-800','bg-green-100 text-green-800',
  'bg-amber-100 text-amber-800','bg-purple-100 text-purple-800',
  'bg-pink-100 text-pink-800','bg-teal-100 text-teal-800',
]

export function Avatar({ name = '?', size = 'sm' }) {
  const initials = name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
  const p = PALETTES[name.charCodeAt(0) % PALETTES.length]
  const sz = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'md' ? 'w-10 h-10 text-sm' : 'w-12 h-12 text-base'
  return <div className={`${sz} ${p} rounded-full flex items-center justify-center font-semibold flex-shrink-0`}>{initials}</div>
}

export function StatusBadge({ status }) {
  const map = {
    draft:    { label: 'Draft',    cls: 'bg-gray-100 text-gray-600' },
    sent:     { label: 'Sent',     cls: 'bg-blue-100 text-blue-700' },
    received: { label: 'Received', cls: 'bg-green-100 text-green-700' },
    pending:  { label: 'Pending',  cls: 'bg-amber-100 text-amber-700' },
    confirmed:{ label: 'Confirmed',cls: 'bg-green-100 text-green-700' },
  }
  const { label, cls } = map[status] ?? map.draft
  return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cls}`}>{label}</span>
}

export function IndustryBadge({ industry }) {
  if (!industry) return null
  return (
    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full whitespace-nowrap">
      {INDUSTRY_ICONS[industry] ?? '🏭'} {industry}
    </span>
  )
}

export function Spinner() {
  return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" /></div>
}

export function Empty({ icon, message, action }) {
  return (
    <div className="flex flex-col items-center py-16 text-gray-400">
      <span className="text-4xl mb-3">{icon}</span>
      <p className="text-sm mb-4">{message}</p>
      {action}
    </div>
  )
}

export function FieldRow({ label, value }) {
  if (!value) return null
  return (
    <div className="flex gap-2 py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 w-32 flex-shrink-0">{label}</span>
      <span className="text-xs text-gray-800 font-medium">{value}</span>
    </div>
  )
}

export function SectionCard({ title, children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 p-4 ${className}`}>
      {title && <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</p>}
      {children}
    </div>
  )
}
