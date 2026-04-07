import { useNavigate } from "react-router-dom";
import type { Task } from "../../types";
import { useUpdateTask } from "../../hooks/use-tasks";

interface TaskItemProps {
  task: Task;
}

const priorityColors = {
  low: "bg-emerald-400",
  medium: "bg-amber-400",
  high: "bg-red-400",
};

export default function TaskItem({ task }: TaskItemProps) {
  const navigate = useNavigate();
  const updateTask = useUpdateTask();

  const toggleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateTask.mutate({ id: task.id, is_completed: !task.is_completed });
  };

  const formatDueDate = (date: string) => {
    const [y, m, d] = date.slice(0, 10).split("-").map(Number);
    const local = new Date(y, m - 1, d);
    const now = new Date();
    const isOverdue = local < now && !task.is_completed;
    const label = local.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    return { label, isOverdue };
  };

  return (
    <div
      onClick={() => navigate(`/tasks/${task.id}`)}
      className={`flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 transition-all active:scale-[0.99] ${
        task.is_completed
          ? "bg-slate-50 shadow-none"
          : "border-l-3 border-blue-400 bg-white shadow-sm"
      }`}
    >
      <button
        onClick={toggleComplete}
        className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
          task.is_completed
            ? "border-blue-500 bg-blue-500"
            : "border-slate-300 active:border-blue-400"
        }`}
        aria-label={task.is_completed ? "Mark incomplete" : "Mark complete"}
      >
        {task.is_completed && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-3"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-medium ${task.is_completed ? "text-slate-400 line-through" : "text-slate-800"}`}
        >
          {task.title}
        </p>
        <div className="mt-0.5 flex items-center gap-1.5">
          {task.due_date &&
            (() => {
              const { label, isOverdue } = formatDueDate(task.due_date);
              return (
                <span
                  className={`text-xs ${task.is_completed ? "text-slate-300" : isOverdue ? "text-red-500" : "text-slate-400"}`}
                >
                  {label}
                </span>
              );
            })()}
          {task.recurrence_rule && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`size-3 ${task.is_completed ? "text-slate-300" : "text-violet-400"}`}
            >
              <path d="M17 2l4 4-4 4" />
              <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
              <path d="M7 22l-4-4 4-4" />
              <path d="M21 13v1a4 4 0 0 1-4 4H3" />
            </svg>
          )}
        </div>
      </div>
      <span
        className={`size-2 shrink-0 rounded-full ${task.is_completed ? "bg-slate-300" : priorityColors[task.priority]}`}
        title={task.priority}
      />
    </div>
  );
}
