import { useState } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { useCreateTask } from '../hooks/use-tasks'
import { useSections } from '../hooks/use-sections'
import { useCreateReminder } from '../hooks/use-reminders'
import { useCreateRecurringDefinition } from '../hooks/use-recurring-definitions'
import RichTextEditor from '../components/editor/RichTextEditor'
import { isEditorEmpty } from '../components/editor/utils'
import ReminderForm from '../components/reminders/ReminderForm'
import RecurrencePicker from '../components/recurrence/RecurrencePicker'
import Select from '../components/ui/Select'
import DatePicker from '../components/ui/DatePicker'
import type { RecurrenceRule } from '../types'

export default function CreateTaskPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const defaultDueDate = searchParams.get('dueDate') || ''

  const goBack = () => {
    if (location.key !== 'default') {
      navigate(-1)
    } else {
      navigate('/', { replace: true })
    }
  }

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState(defaultDueDate)
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [sectionId, setSectionId] = useState('')
  const [reminders, setReminders] = useState<{ remindAt: string; recurrenceRule?: RecurrenceRule }[]>([])
  const [showReminderForm, setShowReminderForm] = useState(false)
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | null>(null)

  const { data: sections } = useSections()
  const createTask = useCreateTask()
  const createReminder = useCreateReminder()
  const createRecurringDef = useCreateRecurringDefinition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const targetSection = sectionId || sections?.[0]?.id
    if (!title.trim() || !targetSection) return

    const scheduleReminders = (taskId: string) => {
      if (reminders.length > 0) {
        reminders.forEach((r) => {
          createReminder.mutate({
            task_id: taskId,
            remind_at: r.remindAt,
            ...(r.recurrenceRule ? { recurrence_rule: r.recurrenceRule } : {}),
          })
        })
      }
    }

    const effectiveDueDate = dueDate || (recurrenceRule ? new Date().toISOString().slice(0, 10) : '')

    if (recurrenceRule && effectiveDueDate) {
      createRecurringDef.mutate(
        {
          section_id: targetSection,
          title: title.trim(),
          description: isEditorEmpty(description) ? undefined : description,
          due_date: `${effectiveDueDate}T00:00:00Z`,
          priority,
          recurrence_rule: recurrenceRule,
        },
        {
          onSuccess: (result) => {
            scheduleReminders(result.task.id)
            goBack()
          },
        },
      )
    } else {
      createTask.mutate(
        {
          section_id: targetSection,
          title: title.trim(),
          description: isEditorEmpty(description) ? undefined : description,
          due_date: effectiveDueDate ? `${effectiveDueDate}T00:00:00Z` : undefined,
          priority,
        },
        {
          onSuccess: (task) => {
            scheduleReminders(task.id)
            goBack()
          },
        },
      )
    }
  }

  return (
    <div>
      <button
        onClick={goBack}
        className="mb-4 flex items-center gap-1 text-sm text-slate-500 transition-colors active:text-slate-700 dark:text-slate-400 dark:active:text-slate-300"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Back
      </button>

      <h1 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">New Task</h1>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title"
          autoFocus
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base text-slate-800 outline-none transition-colors focus:border-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
        <RichTextEditor
          value={description}
          onChange={setDescription}
          placeholder="Description (optional)"
        />
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Due date</label>
            <DatePicker
              value={dueDate}
              onChange={setDueDate}
              placeholder="Pick a date"
              showLastDayChip={recurrenceRule === 'monthly_last_day'}
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Priority</label>
            <Select
              value={priority}
              onValueChange={(v) => setPriority(v as 'low' | 'medium' | 'high')}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
              ]}
            />
          </div>
        </div>
        {sections && sections.length > 0 && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Section</label>
            <Select
              value={sectionId || sections[0]?.id}
              onValueChange={setSectionId}
              options={sections.map((s) => ({ value: s.id, label: s.title }))}
            />
          </div>
        )}

        {/* Recurrence */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Repeat</label>
          <RecurrencePicker value={recurrenceRule} onChange={setRecurrenceRule} />
        </div>

        {/* Reminders section */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Reminders</label>
          <div className="flex flex-wrap gap-2">
            {reminders.map((r, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="size-3">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {new Date(r.remindAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                <button
                  type="button"
                  onClick={() => setReminders((prev) => prev.filter((_, idx) => idx !== i))}
                  className="ml-0.5 text-blue-400 transition-colors hover:text-blue-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="size-3">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
            {!showReminderForm && (
              <button
                type="button"
                onClick={() => setShowReminderForm(true)}
                className="rounded-full border border-dashed border-blue-300 px-3 py-1.5 text-xs font-medium text-blue-600 transition-colors active:bg-blue-50"
              >
                + Add
              </button>
            )}
          </div>
        </div>

        {/* Inline reminder form */}
        <ReminderForm
          open={showReminderForm}
          onClose={() => setShowReminderForm(false)}
          dueDate={dueDate || undefined}
          existingRemindAts={reminders.map((r) => r.remindAt)}
          onAdd={(remindAt, recurrenceRule) => {
            setReminders((prev) => [...prev, { remindAt, recurrenceRule }])
          }}
        />

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={goBack}
            className="flex-1 rounded-xl bg-slate-100 py-2.5 text-sm font-medium text-slate-600 transition-colors active:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:active:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim() || createTask.isPending || createRecurringDef.isPending}
            className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {createTask.isPending || createRecurringDef.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  )
}
