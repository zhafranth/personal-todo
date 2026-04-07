import { DayPicker } from 'react-day-picker'
import { isSameDay } from 'date-fns'
import { calendarStyles } from './calendar-styles'
import type { Task } from '../../types'
import 'react-day-picker/style.css'

interface MonthCalendarProps {
  month: Date
  onMonthChange: (month: Date) => void
  selected: Date | undefined
  onSelect: (date: Date | undefined) => void
  tasks: Task[]
}


function getTaskIndicator(tasks: Task[], date: Date) {
  const dayTasks = tasks.filter(
    (t) => {
      if (!t.due_date) return false
      const [y, m, d] = t.due_date.slice(0, 10).split('-').map(Number)
      return isSameDay(new Date(y, m - 1, d), date)
    }
  )
  if (dayTasks.length === 0) return null
  const allCompleted = dayTasks.every((t) => t.is_completed)
  return allCompleted ? 'completed' : 'incomplete'
}

export default function MonthCalendar({
  month,
  onMonthChange,
  selected,
  onSelect,
  tasks,
}: MonthCalendarProps) {
  return (
    <div className="rdp-calendar calendar-page rounded-2xl bg-white p-4 shadow-sm">
      <style>{calendarStyles}</style>
      <DayPicker
        mode="single"
        month={month}
        onMonthChange={onMonthChange}
        selected={selected}
        onSelect={onSelect}
        showOutsideDays
        components={{
          DayButton: ({ day, modifiers, ...props }) => {
            const indicator = getTaskIndicator(tasks, day.date)
            return (
              <button {...props} className={`relative ${props.className || ''}`}>
                <span>{day.date.getDate()}</span>
                {indicator && (
                  <span
                    className={`absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full ${
                      indicator === 'completed'
                        ? 'bg-emerald-500'
                        : 'bg-blue-500'
                    }`}
                  />
                )}
              </button>
            )
          },
        }}
      />
    </div>
  )
}
