import type { SubTask } from '../../types'
import { useUpdateSubtask, useDeleteSubtask } from '../../hooks/use-subtasks'

interface SubtaskItemProps {
  subtask: SubTask
}

export default function SubtaskItem({ subtask }: SubtaskItemProps) {
  const updateSubtask = useUpdateSubtask()
  const deleteSubtask = useDeleteSubtask()

  return (
    <div className="flex items-center gap-3 py-2">
      <button
        onClick={() => updateSubtask.mutate({ id: subtask.id, is_completed: !subtask.is_completed })}
        className={`flex size-4.5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
          subtask.is_completed
            ? 'border-blue-500 bg-blue-500'
            : 'border-slate-300'
        }`}
      >
        {subtask.is_completed && (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="size-2.5">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        )}
      </button>
      <span className={`flex-1 text-sm ${subtask.is_completed ? 'text-slate-400 line-through dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}>
        {subtask.title}
      </span>
      <button
        onClick={() => deleteSubtask.mutate(subtask.id)}
        className="rounded p-1 text-slate-300 transition-colors hover:text-red-400"
        aria-label="Delete subtask"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="size-3.5">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
