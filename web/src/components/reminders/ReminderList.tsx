import { useState } from 'react'
import { useReminders, useCreateReminder, useDeleteReminder } from '../../hooks/use-reminders'
import type { Reminder, RecurrenceRule } from '../../types'
import { formatRecurrenceRule } from '../recurrence/RecurrencePicker'
import ReminderForm from './ReminderForm'

interface ReminderListProps {
  taskId: string
  dueDate?: string
}

const PRESET_OFFSETS = [
  { label: 'At due time', offsetMs: 0 },
  { label: '5 min before', offsetMs: -5 * 60 * 1000 },
  { label: '15 min before', offsetMs: -15 * 60 * 1000 },
  { label: '30 min before', offsetMs: -30 * 60 * 1000 },
  { label: '1 hour before', offsetMs: -60 * 60 * 1000 },
  { label: '1 day before', offsetMs: -24 * 60 * 60 * 1000 },
]

function getRelativeLabel(remindAt: string, dueDate?: string): string {
  if (dueDate) {
    const base = new Date(`${dueDate}T09:00:00`).getTime()
    const remindTime = new Date(remindAt).getTime()
    const diff = remindTime - base
    const match = PRESET_OFFSETS.find((p) => p.offsetMs === diff)
    if (match) return match.label
  }
  return new Date(remindAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function ReminderList({ taskId, dueDate }: ReminderListProps) {
  const { data: reminders, isLoading } = useReminders(taskId)
  const createReminder = useCreateReminder()
  const deleteReminder = useDeleteReminder()
  const [showForm, setShowForm] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-2 py-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-7 w-32 animate-pulse rounded-full bg-slate-100" />
        ))}
      </div>
    )
  }

  const handleAdd = (remindAt: string, recurrenceRule?: RecurrenceRule) => {
    createReminder.mutate({
      task_id: taskId,
      remind_at: remindAt,
      ...(recurrenceRule ? { recurrence_rule: recurrenceRule } : {}),
    })
  }

  const existingRemindAts = (reminders || []).map((r: Reminder) => r.remind_at)

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">Reminders</h2>
        <button
          onClick={() => setShowForm(true)}
          className="text-xs font-medium text-blue-600 transition-colors active:text-blue-700"
        >
          + Add
        </button>
      </div>

      {reminders && reminders.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {reminders.map((reminder: Reminder) => (
            <span
              key={reminder.id}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                reminder.is_sent
                  ? 'bg-green-100 text-green-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {reminder.is_sent ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="size-3">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="size-3">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              )}
              {getRelativeLabel(reminder.remind_at, dueDate)}
              {reminder.recurrence_rule && (
                <span className="ml-0.5 inline-flex items-center gap-0.5 text-[10px] opacity-75">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-2.5">
                    <path d="M17 2l4 4-4 4" />
                    <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
                    <path d="M7 22l-4-4 4-4" />
                    <path d="M21 13v1a4 4 0 0 1-4 4H3" />
                  </svg>
                  {formatRecurrenceRule(reminder.recurrence_rule)}
                </span>
              )}
              {!reminder.is_sent && (
                <button
                  onClick={() => deleteReminder.mutate(reminder.id)}
                  className="ml-0.5 text-blue-400 transition-colors hover:text-blue-600"
                  aria-label="Remove reminder"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="size-3">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400">No reminders set</p>
      )}

      <ReminderForm
        open={showForm}
        onClose={() => setShowForm(false)}
        dueDate={dueDate}
        existingRemindAts={existingRemindAts}
        onAdd={handleAdd}
      />
    </div>
  )
}
