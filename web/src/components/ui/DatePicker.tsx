import { useState, useRef, useEffect } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { DayPicker } from 'react-day-picker'
import { format, parse, isValid } from 'date-fns'
import 'react-day-picker/style.css'
import { calendarStyles } from '../calendar/calendar-styles'

function CalendarPopup({
  selected,
  onSelect,
  showLastDayChip,
}: {
  selected: Date | undefined
  onSelect: (day: Date | undefined) => void
  showLastDayChip?: boolean
}) {
  const [month, setMonth] = useState<Date>(selected || new Date())

  const handleLastDay = () => {
    const year = month.getFullYear()
    const m = month.getMonth()
    const lastDay = new Date(year, m + 1, 0)
    onSelect(lastDay)
  }

  return (
    <div className="rdp-calendar">
      <style>{calendarStyles}</style>
      <DayPicker
        mode="single"
        captionLayout="dropdown"
        startMonth={new Date(2020, 0)}
        endMonth={new Date(2035, 11)}
        selected={selected}
        onSelect={onSelect}
        month={month}
        onMonthChange={setMonth}
      />
      {showLastDayChip && (
        <div className="mt-1 border-t border-slate-100 pt-2">
          <button
            type="button"
            onClick={handleLastDay}
            className="w-full rounded-lg bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-100 active:bg-violet-200"
          >
            Last day of {month.toLocaleString('en-US', { month: 'long' })}
          </button>
        </div>
      )}
    </div>
  )
}

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
  showLastDayChip?: boolean
}

export default function DatePicker({ value, onChange, placeholder = 'Pick a date', className, autoFocus, showLastDayChip }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const selected = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined
  const displayValue = selected && isValid(selected) ? format(selected, 'MMM d, yyyy') : null

  useEffect(() => {
    if (autoFocus) setOpen(true)
  }, [autoFocus])

  const handleSelect = (day: Date | undefined) => {
    if (day) {
      onChange(format(day, 'yyyy-MM-dd'))
    }
    setOpen(false)
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          ref={triggerRef}
          type="button"
          className={`inline-flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-left text-sm transition-colors focus:border-blue-400 focus:bg-white ${
            displayValue ? 'text-slate-800' : 'text-slate-400'
          } ${className ?? ''}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="size-4 shrink-0 text-slate-400">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          {displayValue ?? placeholder}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="z-100 rounded-xl border border-slate-200 bg-white p-4 shadow-xl animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
          sideOffset={4}
          align="center"
          collisionPadding={12}
        >
          <CalendarPopup selected={selected} onSelect={handleSelect} showLastDayChip={showLastDayChip} />
          {value && (
            <div className="mt-2 border-t border-slate-100 pt-2">
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false) }}
                className="w-full rounded-lg px-3 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 active:bg-red-100"
              >
                Clear date
              </button>
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

interface SmallDatePickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoFocus?: boolean
  showLastDayChip?: boolean
}

export function SmallDatePicker({ value, onChange, placeholder = 'Pick date', autoFocus, showLastDayChip }: SmallDatePickerProps) {
  const [open, setOpen] = useState(false)

  const selected = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined
  const displayValue = selected && isValid(selected) ? format(selected, 'MMM d, yyyy') : null

  useEffect(() => {
    if (autoFocus) setOpen(true)
  }, [autoFocus])

  const handleSelect = (day: Date | undefined) => {
    if (day) {
      onChange(format(day, 'yyyy-MM-dd'))
    }
    setOpen(false)
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs transition-colors focus:border-blue-400 focus:bg-white ${
            displayValue ? 'text-slate-800' : 'text-slate-400'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-3 shrink-0 text-slate-400">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          {displayValue ?? placeholder}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="z-100 rounded-xl border border-slate-200 bg-white p-4 shadow-xl animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
          sideOffset={4}
          align="center"
          collisionPadding={12}
        >
          <CalendarPopup selected={selected} onSelect={handleSelect} showLastDayChip={showLastDayChip} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
