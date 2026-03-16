import { useNavigate } from 'react-router-dom'
import type { Task } from '../../types'
import { useUpdateTask } from '../../hooks/use-tasks'

interface TaskItemProps {
  task: Task
}

const priorityColors = {
  low: 'bg-emerald-400',
  medium: 'bg-amber-400',
  high: 'bg-red-400',
}

export default function TaskItem({ task }: TaskItemProps) {
  const navigate = useNavigate()
  const updateTask = useUpdateTask()

  const toggleComplete = (e: React.MouseEvent) => {
    e.stopPropagation()
    updateTask.mutate({ id: task.id, is_completed: !task.is_completed })
  }

  const formatDueDate = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const isOverdue = d < now && !task.is_completed
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return { label, isOverdue }
  }

  return (
    <div
      onClick={() => navigate(`/tasks/${task.id}`)}
      className={`flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 transition-all active:scale-[0.99] ${
        task.is_completed
          ? 'bg-slate-50 shadow-none'
          : 'border-l-3 border-blue-400 bg-white shadow-sm'
      }`}
    >
      <button
        onClick={toggleComplete}
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
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${task.is_completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
          {task.title}
        </p>
        {task.due_date && (() => {
          const { label, isOverdue } = formatDueDate(task.due_date)
          return (
            <span className={`mt-0.5 inline-block text-xs ${task.is_completed ? 'text-slate-300' : isOverdue ? 'text-red-500' : 'text-slate-400'}`}>
              {label}
            </span>
          )
        })()}
      </div>
      <span className={`size-2 shrink-0 rounded-full ${task.is_completed ? 'bg-slate-300' : priorityColors[task.priority]}`} title={task.priority} />
    </div>
  )
}
