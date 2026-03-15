import { useState } from 'react'
import { useSubtasks, useCreateSubtask } from '../../hooks/use-subtasks'
import SubtaskItem from './SubtaskItem'

interface SubtaskListProps {
  taskId: string
}

export default function SubtaskList({ taskId }: SubtaskListProps) {
  const { data: subtasks, isLoading } = useSubtasks(taskId)
  const createSubtask = useCreateSubtask()
  const [newTitle, setNewTitle] = useState('')

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    createSubtask.mutate(
      { task_id: taskId, title: newTitle.trim() },
      { onSuccess: () => setNewTitle('') },
    )
  }

  if (isLoading) {
    return <div className="space-y-2 py-2">{[1, 2].map((i) => <div key={i} className="h-8 animate-pulse rounded-lg bg-slate-100" />)}</div>
  }

  return (
    <div>
      {subtasks && subtasks.length > 0 && (
        <div className="divide-y divide-slate-100">
          {subtasks.map((st) => (
            <SubtaskItem key={st.id} subtask={st} />
          ))}
        </div>
      )}
      <form onSubmit={handleAdd} className="mt-2 flex gap-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add subtask..."
          className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400 focus:bg-white"
        />
        <button
          type="submit"
          disabled={!newTitle.trim() || createSubtask.isPending}
          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-all active:scale-95 disabled:opacity-50"
        >
          Add
        </button>
      </form>
    </div>
  )
}
