import { useState } from 'react'
import { useTasks } from '../../hooks/use-tasks'
import TaskItem from './TaskItem'

interface TaskListProps {
  sectionId: string
}

export default function TaskList({ sectionId }: TaskListProps) {
  const { data: tasks, isLoading } = useTasks(sectionId)
  const [showCompleted, setShowCompleted] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-2 py-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-white/60" />
        ))}
      </div>
    )
  }

  if (!tasks || tasks.length === 0) {
    return (
      <p className="py-4 text-center text-xs text-slate-400">No tasks yet</p>
    )
  }

  const activeTasks = tasks.filter((t) => !t.is_completed)
  const completedTasks = tasks.filter((t) => t.is_completed)

  return (
    <div className="py-1">
      {activeTasks.length > 0 && (
        <div className="space-y-1.5">
          {activeTasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </div>
      )}

      {completedTasks.length > 0 && (
        <div className={activeTasks.length > 0 ? 'mt-3' : ''}>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex w-full items-center gap-1.5 px-1 py-1.5 text-xs text-slate-400 transition-colors hover:text-slate-500"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`size-3 transition-transform ${showCompleted ? 'rotate-90' : ''}`}
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
            Completed ({completedTasks.length})
          </button>
          {showCompleted && (
            <div className="mt-1 space-y-1.5">
              {completedTasks.map((task) => (
                <TaskItem key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTasks.length === 0 && !showCompleted && (
        <p className="py-4 text-center text-xs text-slate-400">No active tasks</p>
      )}
    </div>
  )
}
