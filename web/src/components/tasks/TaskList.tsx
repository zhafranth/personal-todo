import { useTasks } from '../../hooks/use-tasks'
import TaskItem from './TaskItem'

interface TaskListProps {
  sectionId: string
}

export default function TaskList({ sectionId }: TaskListProps) {
  const { data: tasks, isLoading } = useTasks(sectionId)

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

  return (
    <div className="space-y-1.5 py-1">
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} />
      ))}
    </div>
  )
}
