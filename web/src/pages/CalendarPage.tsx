import { useState, useMemo } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameDay,
} from 'date-fns'
import MonthCalendar from '../components/calendar/MonthCalendar'
import DayTaskCard from '../components/calendar/DayTaskCard'
import TaskForm from '../components/tasks/TaskForm'
import { useCalendarTasks } from '../hooks/use-calendar-tasks'

export default function CalendarPage() {
  const [month, setMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  const [showTaskForm, setShowTaskForm] = useState(false)

  const start = format(startOfWeek(startOfMonth(month)), 'yyyy-MM-dd')
  const end = format(endOfWeek(endOfMonth(month)), 'yyyy-MM-dd')

  const { data: tasks = [], isError, refetch } = useCalendarTasks(start, end)

  const selectedTasks = useMemo(() => {
    if (!selectedDate) return []
    return tasks.filter(
      (t) => t.due_date && isSameDay(new Date(t.due_date), selectedDate)
    )
  }, [tasks, selectedDate])

  const handleAddTask = () => {
    setShowTaskForm(true)
  }

  const handleSelectDate = (date: Date | undefined) => {
    if (!date) return
    setSelectedDate((prev) =>
      prev && isSameDay(prev, date) ? prev : date
    )
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold tracking-tight text-slate-900">
        Calendar
      </h1>

      <MonthCalendar
        month={month}
        onMonthChange={setMonth}
        selected={selectedDate ?? undefined}
        onSelect={handleSelectDate}
        tasks={tasks}
      />

      {isError && (
        <div className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-center">
          <p className="text-sm text-red-600">Failed to load tasks</p>
          <button
            onClick={() => refetch()}
            className="mt-1 text-sm font-medium text-red-700 underline"
          >
            Retry
          </button>
        </div>
      )}

      {selectedDate && (
        <DayTaskCard
          key={selectedDate.toISOString()}
          date={selectedDate}
          tasks={selectedTasks}
          onAddTask={handleAddTask}
        />
      )}

      <TaskForm
        key={`form-${selectedDate?.toISOString()}`}
        open={showTaskForm}
        onClose={() => setShowTaskForm(false)}
        defaultDueDate={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined}
      />
    </div>
  )
}
