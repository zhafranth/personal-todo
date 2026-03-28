import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTask, useDeleteTask, useUpdateTask } from '../../hooks/use-tasks'
import SubtaskList from '../subtasks/SubtaskList'
import ReminderList from '../reminders/ReminderList'
import RichTextEditor from '../editor/RichTextEditor'
import { isEditorEmpty } from '../editor/utils'
import RecurrencePicker, { formatRecurrenceRule } from '../recurrence/RecurrencePicker'
import { SmallDatePicker } from '../ui/DatePicker'
import DOMPurify from 'dompurify'
import '../editor/editor.css'

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('rel', 'noopener noreferrer')
    node.setAttribute('target', '_blank')
  }
})

const priorityLabels = { low: 'Low', medium: 'Medium', high: 'High' }
const priorityColors = {
  low: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
}
const priorityOptions = ['low', 'medium', 'high'] as const

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: task, isLoading } = useTask(id || '')
  const deleteTask = useDeleteTask()
  const updateTask = useUpdateTask()
  const [isEditingDesc, setIsEditingDesc] = useState(false)
  const editHtmlRef = useRef('')
  const [isEditingPriority, setIsEditingPriority] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-4 pt-4">
        <div className="h-8 w-2/3 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-4 w-1/2 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
      </div>
    )
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center py-16">
        <p className="text-sm text-slate-500">Task not found</p>
        <button onClick={() => navigate('/')} className="mt-2 text-sm font-medium text-blue-600">
          Go back
        </button>
      </div>
    )
  }

  const handleDelete = () => {
    if (confirm('Delete this task?')) {
      deleteTask.mutate(task.id, { onSuccess: () => navigate('/') })
    }
  }

  const toggleComplete = () => {
    updateTask.mutate({ id: task.id, is_completed: !task.is_completed })
  }

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-1 text-sm text-slate-500 transition-colors active:text-slate-700"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Back
      </button>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <h1 className={`text-xl font-bold ${task.is_completed ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
              {task.title}
            </h1>
            {task.recurrence_rule && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-2.5">
                  <path d="M17 2l4 4-4 4" />
                  <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
                  <path d="M7 22l-4-4 4-4" />
                  <path d="M21 13v1a4 4 0 0 1-4 4H3" />
                </svg>
                {formatRecurrenceRule(task.recurrence_rule)}
              </span>
            )}
          </div>

          {isEditingPriority ? (
            <div className="flex shrink-0 gap-1">
              {priorityOptions.map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    updateTask.mutate({ id: task.id, priority: p })
                    setIsEditingPriority(false)
                  }}
                  disabled={updateTask.isPending}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-all active:scale-[0.96] ${
                    task.priority === p
                      ? priorityColors[p] + ' ring-2 ring-offset-1 ring-slate-300'
                      : priorityColors[p] + ' opacity-60'
                  }`}
                >
                  {priorityLabels[p]}
                </button>
              ))}
            </div>
          ) : (
            <button
              onClick={() => setIsEditingPriority(true)}
              className={`shrink-0 cursor-pointer rounded-full px-2.5 py-0.5 text-xs font-medium transition-all hover:ring-2 hover:ring-offset-1 hover:ring-slate-300 ${priorityColors[task.priority]}`}
              title="Tap to change priority"
            >
              {priorityLabels[task.priority]}
            </button>
          )}
        </div>

        {isEditingDesc ? (
          <div className="mt-3">
            <RichTextEditor
              value={task.description || ''}
              onChange={(html) => { editHtmlRef.current = html }}
              placeholder="Add a description..."
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const html = editHtmlRef.current
                  updateTask.mutate({
                    id: task.id,
                    description: isEditorEmpty(html) ? undefined : html,
                  })
                  setIsEditingDesc(false)
                }}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white active:scale-[0.98]"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsEditingDesc(false)}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 active:bg-slate-200"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : task.description ? (
          <div
            role="button"
            tabIndex={0}
            onClick={() => { editHtmlRef.current = task.description || ''; setIsEditingDesc(true) }}
            onKeyDown={(e) => { if (e.key === 'Enter') { editHtmlRef.current = task.description || ''; setIsEditingDesc(true) } }}
            className="prose-content mt-3 cursor-pointer rounded-lg p-1 text-sm leading-relaxed text-slate-600 transition-colors hover:bg-slate-50"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(task.description, {
                ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'pre', 'code', 'blockquote', 'hr', 'a'],
                ALLOWED_ATTR: ['href', 'target', 'data-checked', 'data-type'],
              }),
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => { editHtmlRef.current = ''; setIsEditingDesc(true) }}
            className="mt-3 text-sm text-slate-400 transition-colors hover:text-slate-500"
          >
            + Add description
          </button>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <SmallDatePicker
            value={task.due_date ? task.due_date.slice(0, 10) : ''}
            onChange={(val) => {
              if (val) {
                updateTask.mutate({ id: task.id, due_date: val + 'T00:00:00Z' })
              } else {
                updateTask.mutate({ id: task.id, due_date: null })
              }
            }}
            placeholder="+ Add due date"
          />
        </div>

        {/* Task recurrence */}
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-slate-500">Repeat task</p>
          {task.recurrence_rule && !task.due_date && (
            <p className="mb-2 text-xs text-amber-600">Set a due date for recurrence to work</p>
          )}
          <RecurrencePicker
            value={task.recurrence_rule ?? null}
            onChange={(rule) => updateTask.mutate({ id: task.id, recurrence_rule: rule })}
          />
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={toggleComplete}
            className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-all active:scale-[0.98] ${
              task.is_completed
                ? 'bg-slate-100 text-slate-600'
                : 'bg-blue-600 text-white shadow-sm'
            }`}
          >
            {task.is_completed ? 'Mark Incomplete' : 'Mark Complete'}
          </button>
          <button
            onClick={handleDelete}
            className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 transition-all active:scale-[0.98]"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Sub-tasks</h2>
        <SubtaskList taskId={task.id} />
      </div>

      <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
        <ReminderList taskId={task.id} dueDate={task.due_date} />
      </div>
    </div>
  )
}
