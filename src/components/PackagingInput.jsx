import { AMOUNT_UNITS, GRAM_PRESETS, KG_PRESETS } from '../lib/constants'

export default function PackagingInput({ amount, unit, onAmountChange, onUnitChange, label = 'Amount' }) {
  const inputCls = "border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-700 bg-white"

  const presets = unit === 'g' ? GRAM_PRESETS : unit === 'kg' ? KG_PRESETS : null

  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <div className="flex gap-2 mb-1">
        <input
          type="number"
          value={amount}
          onChange={e => onAmountChange(e.target.value)}
          placeholder="0"
          min="0"
          className={inputCls + ' flex-1'}
        />
        <select value={unit} onChange={e => onUnitChange(e.target.value)} className={inputCls + ' w-24'}>
          {AMOUNT_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>

      {/* Quick presets */}
      {presets && (
        <div className="flex gap-1 flex-wrap">
          {presets.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => onAmountChange(String(p))}
              className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                String(amount) === String(p)
                  ? 'bg-blue-700 text-white border-blue-700'
                  : 'border-gray-200 text-gray-500 hover:border-blue-300'
              }`}
            >
              {p}{unit}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
