import { useState } from 'react'
import { useSuppliers } from '../hooks/useWarehouse'

export default function SupplierPicker({ value, onChange, className = '' }) {
  const { grouped } = useSuppliers()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const categories = Object.keys(grouped).sort()

  const filtered = {}
  categories.forEach(cat => {
    const matches = grouped[cat].filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase())
    )
    if (matches.length) filtered[cat] = matches
  })

  return (
    <div className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-left flex items-center justify-between bg-white focus:border-blue-700 outline-none"
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>
          {value || 'Select supplier…'}
        </span>
        <span className="text-gray-400 text-xs ml-2">{open ? '▲' : '▼'}</span>
      </button>

      {/* Undo / clear button */}
      {value && (
        <button
          type="button"
          onClick={() => { onChange(''); setOpen(false) }}
          className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-400 text-lg leading-none"
          title="Clear supplier"
        >×</button>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-72 overflow-y-auto">
          <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search supplier…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"
              autoFocus
            />
          </div>

          {Object.keys(filtered).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No suppliers found</p>
          ) : (
            Object.entries(filtered).map(([cat, suppliers]) => (
              <div key={cat}>
                {/* Category header */}
                <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{cat}</p>
                </div>
                {suppliers.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => { onChange(s.name); setOpen(false); setSearch('') }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 flex items-center justify-between ${value === s.name ? 'bg-blue-50 text-blue-800 font-medium' : 'text-gray-800'}`}
                  >
                    <span>{s.name}</span>
                    {/* Alphabet label */}
                    <span className="text-xs text-gray-300 font-mono ml-2">{s.name[0].toUpperCase()}</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
