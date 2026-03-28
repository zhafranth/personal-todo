import { useState } from 'react'
import { useCreateTask } from '../../hooks/use-tasks'
import { useSections } from '../../hooks/use-sections'
import { useCreateReminder } from '../../hooks/use-reminders'
import RichTextEditor from '../editor/RichTextEditor'
import { isEditorEmpty } from '../editor/utils'
import ReminderForm from '../reminders/ReminderForm'
import Select from '../ui/Select'
import DatePicker from '../ui/DatePicker'

interface TaskFormProps {
  open: boolean
  onClose: () => void
  defaultSectionId?: string
}

export default function TaskForm({ open, onClose, defaultSectionId }: TaskFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [sectionId, setSectionId] = useState(defaultSectionId || '')
  const [reminders, setReminders] = useState<string[]>([])
  const [showReminderForm, setShowReminderForm] = useState(false)

  const { data: sections } = useSections()
  const createTask = useCreateTask()
  const createReminder = useCreateReminder()

  if (!open) return null

  const resetAndClose = () => {
    setTitle('')
    setDescription('')
    setDueDate('')
    setPriority('medium')
    setReminders([])
    onClose()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const targetSection = sectionId || sections?.[0]?.id
    if (!title.trim() || !targetSection) return
    createTask.mutate(
      {
        section_id: targetSection,
        title: title.trim(),
        description: isEditorEmpty(description) ? undefined : description,
        due_date: dueDate || undefined,
        priority,
      },
      {
        onSuccess: (task) => {
          if (reminders.length > 0) {
            reminders.forEach((remindAt) => {
              createReminder.mutate({ task_id: task.id, remind_at: remindAt })
            })
          }
          resetAndClose()
        },
      },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={resetAndClose}>
      <div className="fixed inset-0 bg-black/40" />
      <div
        className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-bold text-slate-900">New Task</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            autoFocus
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition-colors focus:border-blue-400 focus:bg-white"
          />
          <RichTextEditor
            value={description}
            onChange={setDescription}
            placeholder="Description (optional)"
          />
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-500">Due date</label>
              <DatePicker
                value={dueDate}
                onChange={setDueDate}
                placeholder="Pick a date"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-500">Priority</label>
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
              <label className="mb-1 block text-xs font-medium text-slate-500">Section</label>
              <Select
                value={sectionId || sections[0]?.id}
                onValueChange={setSectionId}
                options={sections.map((s) => ({ value: s.id, label: s.title }))}
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Reminders</label>
            <div className="flex flex-wrap gap-2">
              {reminders.map((remindAt, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="size-3">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  {new Date(remindAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
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
              <button
                type="button"
                onClick={() => setShowReminderForm(true)}
                className="rounded-full border border-dashed border-blue-300 px-3 py-1.5 text-xs font-medium text-blue-600 transition-colors active:bg-blue-50"
              >
                + Add
              </button>
            </div>
          </div>
          <ReminderForm
            open={showReminderForm}
            onClose={() => setShowReminderForm(false)}
            dueDate={dueDate || undefined}
            existingRemindAts={reminders}
            onAdd={(remindAt) => setReminders((prev) => [...prev, remindAt])}
          />
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={resetAndClose}
              className="flex-1 rounded-xl bg-slate-100 py-2.5 text-sm font-medium text-slate-600 transition-colors active:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || createTask.isPending}
              className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {createTask.isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
