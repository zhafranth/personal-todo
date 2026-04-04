import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import type { Task } from '../../types'
import { useUpdateTask } from '../../hooks/use-tasks'

const priorityColors = {
  low: 'bg-emerald-400',
  medium: 'bg-amber-400',
  high: 'bg-red-400',
}

interface DayBottomSheetProps {
  date: Date | null
  tasks: Task[]
  onClose: () => void
  onAddTask: () => void
}

export default function DayBottomSheet({
  date,
  tasks,
  onClose,
  onAddTask,
}: DayBottomSheetProps) {
  const navigate = useNavigate()
  const updateTask = useUpdateTask()
  const touchStartY = useRef(0)

  if (!date) return null

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaY = e.changedTouches[0].clientY - touchStartY.current
    if (deltaY > 80) onClose()
  }

  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1
    return 0
  })

  const toggleComplete = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation()
    updateTask.mutate({ id: task.id, is_completed: !task.is_completed })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center animate-in fade-in-0 duration-200" onClick={onClose}>
      <div className="fixed inset-0 bg-black/40" />
      <div
        className="relative max-h-[60vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div
          className="sticky top-0 z-10 bg-white px-6 pb-3 pt-3"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="mx-auto mb-3 h-1 w-8 rounded-full bg-slate-300" />
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {format(date, 'EEEE, MMMM d')}
              </h3>
              <p className="text-xs text-slate-500">
                {tasks.length === 0
                  ? 'No tasks'
                  : `${tasks.length} task${tasks.length > 1 ? 's' : ''}`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition-colors active:bg-slate-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="size-5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-6">
          {sortedTasks.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-400">No tasks for this day</p>
              <button
                onClick={onAddTask}
                className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all active:scale-[0.98]"
              >
                + Add task
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {sortedTasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all active:scale-[0.99] ${
                    task.is_completed ? 'bg-slate-50' : 'bg-slate-50/50'
                  }`}
                >
                  <button
                    onClick={(e) => toggleComplete(e, task)}
                    className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                      task.is_completed
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-slate-300 active:border-blue-400'
                    }`}
                  >
                    {task.is_completed && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="size-3">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => navigate(`/tasks/${task.id}`)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className={`text-sm font-medium ${task.is_completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                      {task.title}
                    </p>
                  </button>
                  <span
                    className={`size-2 shrink-0 rounded-full ${task.is_completed ? 'bg-slate-300' : priorityColors[task.priority]}`}
                    title={task.priority}
                  />
                </div>
              ))}
              <button
                onClick={onAddTask}
                className="mt-2 w-full rounded-xl border border-dashed border-slate-300 py-2.5 text-sm font-medium text-slate-500 transition-colors active:bg-slate-50"
              >
                + Add task
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
