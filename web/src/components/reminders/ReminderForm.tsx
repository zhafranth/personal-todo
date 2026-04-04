import { useState } from 'react'
import type { RecurrenceRule } from '../../types'
import RecurrencePicker from '../recurrence/RecurrencePicker'
import DatePicker from '../ui/DatePicker'

interface ReminderFormProps {
  open: boolean
  onClose: () => void
  dueDate?: string
  existingRemindAts: string[]
  onAdd: (remindAt: string, recurrenceRule?: RecurrenceRule) => void
}

const PRESETS = [
  { label: 'At due time', offsetMs: 0 },
  { label: '5 min before', offsetMs: -5 * 60 * 1000 },
  { label: '15 min before', offsetMs: -15 * 60 * 1000 },
  { label: '30 min before', offsetMs: -30 * 60 * 1000 },
  { label: '1 hour before', offsetMs: -60 * 60 * 1000 },
  { label: '1 day before', offsetMs: -24 * 60 * 60 * 1000 },
]

function resolvePreset(dueDate: string, offsetMs: number): string {
  const base = new Date(`${dueDate}T09:00:00`)
  return new Date(base.getTime() + offsetMs).toISOString()
}

export default function ReminderForm({ open, onClose, dueDate, existingRemindAts, onAdd }: ReminderFormProps) {
  const [customDate, setCustomDate] = useState('')
  const [customTime, setCustomTime] = useState('')
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | null>(null)

  if (!open) return null

  const handlePreset = (offsetMs: number) => {
    if (!dueDate) return
    const remindAt = resolvePreset(dueDate, offsetMs)
    onAdd(remindAt, recurrenceRule ?? undefined)
  }

  const handleCustom = () => {
    if (!customDate || !customTime) return
    const remindAt = new Date(`${customDate}T${customTime}:00`).toISOString()
    onAdd(remindAt, recurrenceRule ?? undefined)
    setCustomDate('')
    setCustomTime('')
  }

  const isPresetAdded = (offsetMs: number): boolean => {
    if (!dueDate) return false
    const resolved = resolvePreset(dueDate, offsetMs)
    return existingRemindAts.some((r) => r === resolved)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
      <div className="fixed inset-0 bg-black/40" />
      <div
        className="relative max-h-[75vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-8 rounded-full bg-slate-300" />
        <h2 className="mb-4 text-lg font-bold text-slate-900">Add Reminder</h2>

        <div className="mb-4">
          <p className="mb-2 text-xs font-medium text-slate-500">Quick presets</p>
          {!dueDate && (
            <p className="mb-2 text-xs text-amber-600">Set a due date to use presets</p>
          )}
          <div className="flex flex-col gap-1">
            {PRESETS.map((preset) => {
              const added = isPresetAdded(preset.offsetMs)
              return (
                <button
                  key={preset.label}
                  onClick={() => handlePreset(preset.offsetMs)}
                  disabled={!dueDate || added}
                  className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                    added
                      ? 'bg-blue-50 text-blue-600'
                      : dueDate
                        ? 'bg-slate-50 text-slate-700 active:bg-slate-100'
                        : 'bg-slate-50 text-slate-300'
                  }`}
                >
                  <span>{preset.label}</span>
                  {added && <span className="text-xs font-medium">Added</span>}
                </button>
              )
            })}
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <p className="mb-2 text-xs font-medium text-slate-500">Custom</p>
          <div className="flex gap-2">
            <div className="flex-1">
              <DatePicker
                value={customDate}
                onChange={setCustomDate}
                placeholder="Pick date"
              />
            </div>
            <input
              type="time"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              className="w-28 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-base text-slate-800 outline-none focus:border-blue-400 focus:bg-white"
            />
          </div>
          <button
            onClick={handleCustom}
            disabled={!customDate || !customTime}
            className="mt-2 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
          >
            Add Custom Reminder
          </button>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="mb-2 text-xs font-medium text-slate-500">Repeat</p>
          <RecurrencePicker value={recurrenceRule} onChange={setRecurrenceRule} />
        </div>
      </div>
    </div>
  )
}
