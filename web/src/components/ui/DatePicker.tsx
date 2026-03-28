import { useState, useRef, useEffect } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { DayPicker } from 'react-day-picker'
import { format, parse, isValid } from 'date-fns'
import 'react-day-picker/style.css'

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
          className="z-[100] rounded-xl border border-slate-200 bg-white p-3 shadow-xl animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
          sideOffset={4}
          align="start"
        >
          <DayPicker
            mode="single"
            captionLayout="dropdown"
            startMonth={new Date(2020, 0)}
            endMonth={new Date(2035, 11)}
            selected={selected}
            onSelect={handleSelect}
            defaultMonth={selected}
            classNames={{
              root: 'text-sm',
              months: '',
              month_caption: 'flex justify-center items-center h-8 font-semibold text-slate-800',
              dropdowns: 'flex items-center gap-2',
              dropdown: 'rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 outline-none focus:border-blue-400',
              nav: 'flex items-center',
              button_previous: 'absolute left-1 top-0 inline-flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100',
              button_next: 'absolute right-1 top-0 inline-flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100',
              weekdays: '',
              weekday: 'w-9 text-center text-[11px] font-medium text-slate-400',
              day: 'group/day inline-flex size-9 items-center justify-center rounded-lg text-sm transition-colors',
              day_button: 'inline-flex size-9 items-center justify-center rounded-lg cursor-pointer transition-colors hover:bg-blue-50 hover:text-blue-600',
              today: 'font-bold text-blue-600',
              selected: '!bg-blue-600 !text-white rounded-lg',
              outside: 'text-slate-300',
              disabled: 'text-slate-200 pointer-events-none',
            }}
          />
          {value && (
            <div className="mt-1 border-t border-slate-100 pt-2">
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false) }}
                className="w-full rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50"
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
          className="z-[100] rounded-xl border border-slate-200 bg-white p-3 shadow-xl animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
          sideOffset={4}
          align="start"
        >
          <DayPicker
            mode="single"
            captionLayout="dropdown"
            startMonth={new Date(2020, 0)}
            endMonth={new Date(2035, 11)}
            selected={selected}
            onSelect={handleSelect}
            defaultMonth={selected}
            classNames={{
              root: 'text-sm',
              month_caption: 'flex justify-center items-center h-8 font-semibold text-slate-800',
              dropdowns: 'flex items-center gap-2',
              dropdown: 'rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 outline-none focus:border-blue-400',
              button_previous: 'absolute left-1 top-0 inline-flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100',
              button_next: 'absolute right-1 top-0 inline-flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100',
              weekday: 'w-9 text-center text-[11px] font-medium text-slate-400',
              day: 'group/day inline-flex size-9 items-center justify-center rounded-lg text-sm transition-colors',
              day_button: 'inline-flex size-9 items-center justify-center rounded-lg cursor-pointer transition-colors hover:bg-blue-50 hover:text-blue-600',
              today: 'font-bold text-blue-600',
              selected: '!bg-blue-600 !text-white rounded-lg',
              outside: 'text-slate-300',
              disabled: 'text-slate-200 pointer-events-none',
            }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
