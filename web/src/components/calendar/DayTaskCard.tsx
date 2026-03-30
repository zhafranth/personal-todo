import { useNavigate } from 'react-router-dom'
import { format, isToday, isTomorrow, isYesterday } from 'date-fns'
import type { Task } from '../../types'
import { useUpdateTask } from '../../hooks/use-tasks'

const priorityColors = {
  low: 'bg-emerald-400',
  medium: 'bg-amber-400',
  high: 'bg-red-400',
}

const priorityLabels = {
  low: 'Low',
  medium: 'Med',
  high: 'High',
}

interface DayTaskCardProps {
  date: Date
  tasks: Task[]
  onAddTask: () => void
}

function formatDateLabel(date: Date): string {
  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'EEEE, MMM d')
}

export default function DayTaskCard({ date, tasks, onAddTask }: DayTaskCardProps) {
  const navigate = useNavigate()
  const updateTask = useUpdateTask()

  const incomplete = tasks.filter((t) => !t.is_completed)
  const completed = tasks.filter((t) => t.is_completed)
  const sortedTasks = [...incomplete, ...completed]

  const toggleComplete = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation()
    updateTask.mutate({ id: task.id, is_completed: !task.is_completed })
  }

  return (
    <div className="mt-4 animate-in fade-in-0 slide-in-from-top-2 duration-300">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-baseline gap-2">
          <h3 className="text-sm font-bold text-slate-900">
            {formatDateLabel(date)}
          </h3>
          <span className="text-xs text-slate-400">
            {format(date, 'MMM d, yyyy')}
          </span>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
          {incomplete.length} pending
        </span>
      </div>

      {/* Task list */}
      <div className="rounded-2xl bg-white shadow-sm">
        {sortedTasks.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-slate-100">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="size-5 text-slate-400">
                <path d="M12 8v4l3 3" />
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
            <p className="text-sm text-slate-400">No tasks for this day</p>
            <button
              onClick={onAddTask}
              className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all active:scale-[0.98]"
            >
              + Add task
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sortedTasks.map((task, i) => (
              <div
                key={task.id}
                onClick={() => navigate(`/tasks/${task.id}`)}
                className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors active:bg-slate-50"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {/* Checkbox */}
                <button
                  onClick={(e) => toggleComplete(e, task)}
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                    task.is_completed
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-slate-300 active:border-blue-400'
                  }`}
                  aria-label={task.is_completed ? 'Mark incomplete' : 'Mark complete'}
                >
                  {task.is_completed && (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="size-3">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </button>

                {/* Task info */}
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${task.is_completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                    {task.title}
                  </p>
                  {task.recurrence_rule && !task.is_completed && (
                    <div className="mt-0.5 flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-3 text-violet-400">
                        <path d="M17 2l4 4-4 4" />
                        <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
                        <path d="M7 22l-4-4 4-4" />
                        <path d="M21 13v1a4 4 0 0 1-4 4H3" />
                      </svg>
                      <span className="text-xs text-violet-400">Recurring</span>
                    </div>
                  )}
                </div>

                {/* Priority badge */}
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 ${
                    task.is_completed ? 'opacity-40' : ''
                  }`}
                >
                  <span className={`size-1.5 rounded-full ${task.is_completed ? 'bg-slate-300' : priorityColors[task.priority]}`} />
                  <span className={`text-[10px] font-medium ${task.is_completed ? 'text-slate-300' : 'text-slate-400'}`}>
                    {priorityLabels[task.priority]}
                  </span>
                </span>

                {/* Chevron */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="size-4 shrink-0 text-slate-300">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            ))}

            {/* Add task row */}
            <button
              onClick={onAddTask}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-slate-50"
            >
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-slate-300">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="size-3 text-slate-400">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
              <span className="text-sm font-medium text-slate-400">Add task</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
