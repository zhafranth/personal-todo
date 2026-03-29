import { useState, useRef, useEffect } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { DayPicker } from 'react-day-picker'
import { format, parse, isValid } from 'date-fns'
import 'react-day-picker/style.css'

const calendarStyles = `
  .rdp-calendar .rdp-root {
    --rdp-accent-color: #2563eb;
    --rdp-accent-background-color: #eff6ff;
    --rdp-day-height: 2.75rem;
    --rdp-day-width: 2.75rem;
    --rdp-day_button-height: 2.5rem;
    --rdp-day_button-width: 2.5rem;
    --rdp-day_button-border-radius: 0.5rem;
    --rdp-nav_button-height: 2.5rem;
    --rdp-nav_button-width: 2.5rem;
    --rdp-nav-height: 2.75rem;
    font-size: 0.875rem;
  }
  .rdp-calendar .rdp-month_caption {
    font-size: 0.875rem;
    font-weight: 600;
    justify-content: center;
  }
  .rdp-calendar .rdp-weekday {
    font-size: 0.75rem;
    font-weight: 500;
    color: #94a3b8;
    opacity: 1;
    padding: 0.375rem 0;
  }
  .rdp-calendar .rdp-chevron {
    fill: #64748b;
  }
  .rdp-calendar .rdp-button_previous,
  .rdp-calendar .rdp-button_next {
    border-radius: 0.5rem;
    transition: background-color 0.15s;
  }
  .rdp-calendar .rdp-button_previous:hover,
  .rdp-calendar .rdp-button_next:hover {
    background-color: #f1f5f9;
  }
  .rdp-calendar .rdp-button_previous:active,
  .rdp-calendar .rdp-button_next:active {
    background-color: #e2e8f0;
  }
  .rdp-calendar .rdp-day_button {
    border-radius: 0.5rem;
    border: 2px solid transparent;
    transition: background-color 0.15s, color 0.15s;
  }
  .rdp-calendar .rdp-day_button:hover {
    background-color: #eff6ff;
    color: #2563eb;
  }
  .rdp-calendar .rdp-day_button:active {
    background-color: #dbeafe;
  }
  .rdp-calendar .rdp-today:not(.rdp-outside) {
    color: #2563eb;
    font-weight: 700;
  }
  .rdp-calendar .rdp-selected .rdp-day_button {
    background-color: #2563eb;
    color: white;
    border-color: #2563eb;
  }
  .rdp-calendar .rdp-outside {
    opacity: 0.3;
  }
  .rdp-calendar .rdp-disabled {
    opacity: 0.2;
  }
  .rdp-calendar .rdp-dropdown_root {
    font-size: 0.875rem;
    font-weight: 500;
  }
  .rdp-calendar .rdp-caption_label {
    font-size: 0.875rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
  }
  .rdp-calendar .rdp-caption_label:hover {
    background-color: #f1f5f9;
  }
`

function CalendarPopup({
  selected,
  onSelect,
}: {
  selected: Date | undefined
  onSelect: (day: Date | undefined) => void
}) {
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
        defaultMonth={selected}
      />
    </div>
  )
}

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
}

export default function DatePicker({ value, onChange, placeholder = 'Pick a date', className, autoFocus }: DatePickerProps) {
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
          <CalendarPopup selected={selected} onSelect={handleSelect} />
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
}

export function SmallDatePicker({ value, onChange, placeholder = 'Pick date', autoFocus }: SmallDatePickerProps) {
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
          <CalendarPopup selected={selected} onSelect={handleSelect} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
