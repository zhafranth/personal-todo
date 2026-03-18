import { useState } from 'react'
import type { RecurrenceRule } from '../../types'

interface RecurrencePickerProps {
  value: RecurrenceRule | null
  onChange: (rule: RecurrenceRule | null) => void
}

const PRESETS: { label: string; value: RecurrenceRule | null }[] = [
  { label: 'None', value: null },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
]

type CustomUnit = 'days' | 'weeks' | 'months'

function isCustomRule(rule: RecurrenceRule | null): boolean {
  return rule !== null && rule.startsWith('every_')
}

function parseCustomRule(rule: RecurrenceRule): { n: number; unit: CustomUnit } {
  const parts = rule.split('_')
  return { n: parseInt(parts[1], 10), unit: parts[2] as CustomUnit }
}

export default function RecurrencePicker({ value, onChange }: RecurrencePickerProps) {
  const [showCustom, setShowCustom] = useState(() => isCustomRule(value))
  const [customN, setCustomN] = useState(() => {
    if (value && isCustomRule(value)) return parseCustomRule(value).n
    return 2
  })
  const [customUnit, setCustomUnit] = useState<CustomUnit>(() => {
    if (value && isCustomRule(value)) return parseCustomRule(value).unit
    return 'days'
  })

  const handlePreset = (preset: RecurrenceRule | null) => {
    setShowCustom(false)
    onChange(preset)
  }

  const handleCustomToggle = () => {
    setShowCustom(true)
  }

  const handleCustomChange = (n: number, unit: CustomUnit) => {
    setCustomN(n)
    setCustomUnit(unit)
    if (n >= 1) {
      onChange(`every_${n}_${unit}` as RecurrenceRule)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => handlePreset(preset.value)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              !showCustom && value === preset.value
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 active:bg-slate-200'
            }`}
          >
            {preset.label}
          </button>
        ))}
        <button
          type="button"
          onClick={handleCustomToggle}
          className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
            showCustom
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-600 active:bg-slate-200'
          }`}
        >
          Custom
        </button>
      </div>

      {showCustom && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-slate-500">Every</span>
          <input
            type="number"
            min={1}
            max={365}
            value={customN}
            onChange={(e) => handleCustomChange(Math.max(1, parseInt(e.target.value, 10) || 1), customUnit)}
            className="w-16 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-center text-xs text-slate-800 outline-none focus:border-blue-400 focus:bg-white"
          />
          <select
            value={customUnit}
            onChange={(e) => handleCustomChange(customN, e.target.value as CustomUnit)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-800 outline-none focus:border-blue-400 focus:bg-white"
          >
            <option value="days">days</option>
            <option value="weeks">weeks</option>
            <option value="months">months</option>
          </select>
        </div>
      )}
    </div>
  )
}

export function formatRecurrenceRule(rule: RecurrenceRule): string {
  switch (rule) {
    case 'daily': return 'Daily'
    case 'weekly': return 'Weekly'
    case 'monthly': return 'Monthly'
    case 'yearly': return 'Yearly'
    default: {
      if (rule.startsWith('every_')) {
        const { n, unit } = parseCustomRule(rule)
        return `Every ${n} ${unit}`
      }
      return rule
    }
  }
}
