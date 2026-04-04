# Modal to Page/Drawer Migration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace TaskForm modal with a full create page (`/tasks/create`), convert SectionForm modal to a vaul drawer, and make ReminderForm inline-embedded (no overlay) in both the create task page and task detail page.

**Architecture:** Add a new route `/tasks/create` with a dedicated `CreateTaskPage`. SectionForm becomes a vaul `Drawer`. ReminderForm loses its overlay wrapper and becomes an inline collapsible section. FAB and calendar "Add task" buttons navigate to the new route instead of toggling modal state.

**Tech Stack:** React, react-router-dom, vaul, Tailwind CSS

---

### Task 1: Install vaul

**Files:**
- Modify: `web/package.json`

- [ ] **Step 1: Install vaul**

```bash
cd web && npm install vaul
```

- [ ] **Step 2: Verify installation**

```bash
cd web && node -e "require('vaul'); console.log('ok')"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add web/package.json web/package-lock.json
git commit -m "chore: install vaul for drawer component"
```

---

### Task 2: Convert SectionForm to vaul Drawer

**Files:**
- Modify: `web/src/components/sections/SectionForm.tsx`

- [ ] **Step 1: Rewrite SectionForm to use vaul Drawer**

Replace the entire `SectionForm.tsx` with:

```tsx
import { useState } from 'react'
import { Drawer } from 'vaul'
import { useCreateSection } from '../../hooks/use-sections'

interface SectionFormProps {
  open: boolean
  onClose: () => void
}

export default function SectionForm({ open, onClose }: SectionFormProps) {
  const [title, setTitle] = useState('')
  const createSection = useCreateSection()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    createSection.mutate(title.trim(), {
      onSuccess: () => {
        setTitle('')
        onClose()
      },
    })
  }

  return (
    <Drawer.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl outline-none">
          <div className="mx-auto mb-4 mt-3 h-1 w-8 rounded-full bg-slate-300" />
          <div className="px-4 pb-4">
            <Drawer.Title className="mb-4 text-lg font-bold text-slate-900">
              New Section
            </Drawer.Title>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Section name"
                autoFocus
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-base text-slate-800 outline-none transition-colors focus:border-blue-400 focus:bg-white"
              />
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl bg-slate-100 py-2.5 text-sm font-medium text-slate-600 transition-colors active:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!title.trim() || createSection.isPending}
                  className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {createSection.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
```

- [ ] **Step 2: Verify the app compiles**

```bash
cd web && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add web/src/components/sections/SectionForm.tsx
git commit -m "refactor: convert SectionForm modal to vaul drawer"
```

---

### Task 3: Convert ReminderForm to inline embed

**Files:**
- Modify: `web/src/components/reminders/ReminderForm.tsx`

The ReminderForm currently renders as a full-screen overlay modal. Convert it to an inline collapsible section that renders in-flow (no `fixed`, no overlay). The `open` prop controls visibility via conditional rendering (already does `if (!open) return null`), but the rendered content should be a bordered card instead of an overlay.

- [ ] **Step 1: Rewrite ReminderForm to inline layout**

Replace the return JSX (lines 55–126) with an inline card — remove the `fixed inset-0` overlay, the `bg-black/40` backdrop, and the `onClick stopPropagation` wrapper. Keep all logic (presets, custom, recurrence) intact:

```tsx
export default function ReminderForm({ open, onClose, dueDate, existingRemindAts, onAdd }: ReminderFormProps) {
  const [customDate, setCustomDate] = useState('')
  const [customTime, setCustomTime] = useState('')
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | null>(null)

  if (!open) return null

  const handlePreset = (offsetMs: number) => {
    if (!dueDate) return
    const remindAt = resolvePreset(dueDate, offsetMs)
    onAdd(remindAt, recurrenceRule ?? undefined)
  }

  const handleCustom = () => {
    if (!customDate || !customTime) return
    const remindAt = new Date(`${customDate}T${customTime}:00`).toISOString()
    onAdd(remindAt, recurrenceRule ?? undefined)
    setCustomDate('')
    setCustomTime('')
  }

  const isPresetAdded = (offsetMs: number): boolean => {
    if (!dueDate) return false
    const resolved = resolvePreset(dueDate, offsetMs)
    return existingRemindAts.some((r) => r === resolved)
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">Add Reminder</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 transition-colors active:bg-slate-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="size-4">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="mb-3">
        <p className="mb-2 text-xs font-medium text-slate-500">Quick presets</p>
        {!dueDate && (
          <p className="mb-2 text-xs text-amber-600">Set a due date to use presets</p>
        )}
        <div className="flex flex-col gap-1">
          {PRESETS.map((preset) => {
            const added = isPresetAdded(preset.offsetMs)
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => handlePreset(preset.offsetMs)}
                disabled={!dueDate || added}
                className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                  added
                    ? 'bg-blue-50 text-blue-600'
                    : dueDate
                      ? 'bg-white text-slate-700 active:bg-slate-100'
                      : 'bg-white text-slate-300'
                }`}
              >
                <span>{preset.label}</span>
                {added && <span className="text-xs font-medium">Added</span>}
              </button>
            )
          })}
        </div>
      </div>

      <div className="border-t border-slate-200 pt-3">
        <p className="mb-2 text-xs font-medium text-slate-500">Custom</p>
        <div className="flex gap-2">
          <div className="flex-1">
            <DatePicker
              value={customDate}
              onChange={setCustomDate}
              placeholder="Pick date"
            />
          </div>
          <input
            type="time"
            value={customTime}
            onChange={(e) => setCustomTime(e.target.value)}
            className="w-28 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base text-slate-800 outline-none focus:border-blue-400"
          />
        </div>
        <button
          type="button"
          onClick={handleCustom}
          disabled={!customDate || !customTime}
          className="mt-2 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
        >
          Add Custom Reminder
        </button>
      </div>

      <div className="mt-3 border-t border-slate-200 pt-3">
        <p className="mb-2 text-xs font-medium text-slate-500">Repeat</p>
        <RecurrencePicker value={recurrenceRule} onChange={setRecurrenceRule} />
      </div>
    </div>
  )
}
```

Note: preset button backgrounds change from `bg-slate-50` to `bg-white` since the card itself is now `bg-slate-50`. Time input also uses `bg-white`.

- [ ] **Step 2: Verify the app compiles**

```bash
cd web && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add web/src/components/reminders/ReminderForm.tsx
git commit -m "refactor: convert ReminderForm from modal overlay to inline embed"
```

---

### Task 4: Create the CreateTaskPage

**Files:**
- Create: `web/src/pages/CreateTaskPage.tsx`
- Modify: `web/src/App.tsx` (add route)

This page replaces the TaskForm modal. It reuses the same form logic but as a full page with a back button. The ReminderForm is embedded inline within the form.

- [ ] **Step 1: Create CreateTaskPage**

Create `web/src/pages/CreateTaskPage.tsx`:

```tsx
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useCreateTask } from '../hooks/use-tasks'
import { useSections } from '../hooks/use-sections'
import { useCreateReminder } from '../hooks/use-reminders'
import RichTextEditor from '../components/editor/RichTextEditor'
import { isEditorEmpty } from '../components/editor/utils'
import ReminderForm from '../components/reminders/ReminderForm'
import Select from '../components/ui/Select'
import DatePicker from '../components/ui/DatePicker'
import type { RecurrenceRule } from '../types'

export default function CreateTaskPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const defaultSectionId = searchParams.get('sectionId') || ''
  const defaultDueDate = searchParams.get('dueDate') || ''

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState(defaultDueDate)
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [sectionId, setSectionId] = useState(defaultSectionId)
  const [reminders, setReminders] = useState<{ remindAt: string; recurrenceRule?: RecurrenceRule }[]>([])
  const [showReminderForm, setShowReminderForm] = useState(false)

  const { data: sections } = useSections()
  const createTask = useCreateTask()
  const createReminder = useCreateReminder()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const targetSection = sectionId || sections?.[0]?.id
    if (!title.trim() || !targetSection) return
    createTask.mutate(
      {
        section_id: targetSection,
        title: title.trim(),
        description: isEditorEmpty(description) ? undefined : description,
        due_date: dueDate ? `${dueDate}T23:59:59Z` : undefined,
        priority,
      },
      {
        onSuccess: (task) => {
          if (reminders.length > 0) {
            reminders.forEach((r) => {
              createReminder.mutate({
                task_id: task.id,
                remind_at: r.remindAt,
                ...(r.recurrenceRule ? { recurrence_rule: r.recurrenceRule } : {}),
              })
            })
          }
          navigate(-1)
        },
      },
    )
  }

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-1 text-sm text-slate-500 transition-colors active:text-slate-700"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Back
      </button>

      <h1 className="mb-4 text-xl font-bold text-slate-900">New Task</h1>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title"
          autoFocus
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base text-slate-800 outline-none transition-colors focus:border-blue-400"
        />
        <RichTextEditor
          value={description}
          onChange={setDescription}
          placeholder="Description (optional)"
        />
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-500">Due date</label>
            <DatePicker
              value={dueDate}
              onChange={setDueDate}
              placeholder="Pick a date"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-500">Priority</label>
            <Select
              value={priority}
              onValueChange={(v) => setPriority(v as 'low' | 'medium' | 'high')}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
              ]}
            />
          </div>
        </div>
        {sections && sections.length > 0 && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Section</label>
            <Select
              value={sectionId || sections[0]?.id}
              onValueChange={setSectionId}
              options={sections.map((s) => ({ value: s.id, label: s.title }))}
            />
          </div>
        )}

        {/* Reminders section */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Reminders</label>
          <div className="flex flex-wrap gap-2">
            {reminders.map((r, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="size-3">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {new Date(r.remindAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                <button
                  type="button"
                  onClick={() => setReminders((prev) => prev.filter((_, idx) => idx !== i))}
                  className="ml-0.5 text-blue-400 transition-colors hover:text-blue-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="size-3">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
            {!showReminderForm && (
              <button
                type="button"
                onClick={() => setShowReminderForm(true)}
                className="rounded-full border border-dashed border-blue-300 px-3 py-1.5 text-xs font-medium text-blue-600 transition-colors active:bg-blue-50"
              >
                + Add
              </button>
            )}
          </div>
        </div>

        {/* Inline reminder form */}
        <ReminderForm
          open={showReminderForm}
          onClose={() => setShowReminderForm(false)}
          dueDate={dueDate || undefined}
          existingRemindAts={reminders.map((r) => r.remindAt)}
          onAdd={(remindAt, recurrenceRule) => {
            setReminders((prev) => [...prev, { remindAt, recurrenceRule }])
          }}
        />

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 rounded-xl bg-slate-100 py-2.5 text-sm font-medium text-slate-600 transition-colors active:bg-slate-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim() || createTask.isPending}
            className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {createTask.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Add route in App.tsx**

In `web/src/App.tsx`, add the import and route:

Import at top:
```tsx
import CreateTaskPage from './pages/CreateTaskPage'
```

Add route after the `/tasks/:id` route:
```tsx
<Route path="/tasks/create" element={<CreateTaskPage />} />
```

**Important:** The `/tasks/create` route must come BEFORE `/tasks/:id` in the route list, otherwise React Router will match `create` as an `:id` param.

- [ ] **Step 3: Verify the app compiles**

```bash
cd web && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add web/src/pages/CreateTaskPage.tsx web/src/App.tsx
git commit -m "feat: add CreateTaskPage as full-page replacement for TaskForm modal"
```

---

### Task 5: Update TasksPage to navigate instead of opening modal

**Files:**
- Modify: `web/src/pages/TasksPage.tsx`

Remove TaskForm import/state. FAB now navigates to `/tasks/create`.

- [ ] **Step 1: Rewrite TasksPage**

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SectionList from '../components/sections/SectionList'
import SectionForm from '../components/sections/SectionForm'
import FAB from '../components/layout/FAB'

export default function TasksPage() {
  const navigate = useNavigate()
  const [showSectionForm, setShowSectionForm] = useState(false)

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tasks</h1>
        <button
          onClick={() => setShowSectionForm(true)}
          className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors active:bg-slate-200"
        >
          + Section
        </button>
      </div>
      <SectionList />
      <FAB onClick={() => navigate('/tasks/create')} />
      <SectionForm open={showSectionForm} onClose={() => setShowSectionForm(false)} />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/pages/TasksPage.tsx
git commit -m "refactor: TasksPage navigates to /tasks/create instead of opening modal"
```

---

### Task 6: Update CalendarPage to navigate instead of opening modal

**Files:**
- Modify: `web/src/pages/CalendarPage.tsx`

Remove TaskForm import/state. "Add task" now navigates to `/tasks/create` with `dueDate` as a search param.

- [ ] **Step 1: Rewrite CalendarPage**

```tsx
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { useCalendarTasks } from '../hooks/use-calendar-tasks'

export default function CalendarPage() {
  const navigate = useNavigate()
  const [month, setMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())

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
    const params = selectedDate ? `?dueDate=${format(selectedDate, 'yyyy-MM-dd')}` : ''
    navigate(`/tasks/create${params}`)
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
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/pages/CalendarPage.tsx
git commit -m "refactor: CalendarPage navigates to /tasks/create instead of opening modal"
```

---

### Task 7: Delete old TaskForm component and unused DayBottomSheet

**Files:**
- Delete: `web/src/components/tasks/TaskForm.tsx`
- Delete: `web/src/components/calendar/DayBottomSheet.tsx`

- [ ] **Step 1: Verify no remaining imports of TaskForm**

```bash
cd web && grep -r "TaskForm" src/ --include="*.tsx" --include="*.ts"
```

Expected: no results (TasksPage and CalendarPage no longer import it)

- [ ] **Step 2: Verify no remaining imports of DayBottomSheet**

```bash
cd web && grep -r "DayBottomSheet" src/ --include="*.tsx" --include="*.ts"
```

Expected: only `DayBottomSheet.tsx` itself

- [ ] **Step 3: Delete the files**

```bash
rm web/src/components/tasks/TaskForm.tsx web/src/components/calendar/DayBottomSheet.tsx
```

- [ ] **Step 4: Verify the app compiles**

```bash
cd web && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add -u web/src/components/tasks/TaskForm.tsx web/src/components/calendar/DayBottomSheet.tsx
git commit -m "chore: remove unused TaskForm modal and DayBottomSheet components"
```

---

### Task 8: Verify full build

- [ ] **Step 1: Run full build**

```bash
cd web && npm run build
```

Expected: build succeeds with no errors

- [ ] **Step 2: Commit (if any lint fixes needed)**

Only if the build produced auto-fixable issues.
