# Reminder Management UI Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reminder management UI — users can create, view, and delete reminders per task via chip displays and a bottom sheet form.

**Architecture:** Extend the existing data layer (types, mock store, React Query hooks) with a `Reminder` entity, then build two new UI components (ReminderList, ReminderForm) and integrate them into the existing TaskDetail and TaskForm pages.

**Tech Stack:** React, TypeScript, Zustand (mock store), TanStack React Query, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-03-16-reminder-management-ui-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `web/src/types/index.ts` | Modify | Add `Reminder` interface |
| `web/src/mocks/data.ts` | Modify | Add `mockReminders` array |
| `web/src/mocks/mock-store.ts` | Modify | Add reminders state, CRUD methods, cascade delete |
| `web/src/hooks/use-reminders.ts` | Create | React Query hooks for reminder CRUD |
| `web/src/components/reminders/ReminderForm.tsx` | Create | Bottom sheet with presets + custom datetime |
| `web/src/components/reminders/ReminderList.tsx` | Create | Chip display, delete, "+ Add" trigger |
| `web/src/components/tasks/TaskDetail.tsx` | Modify | Add ReminderList section |
| `web/src/components/tasks/TaskForm.tsx` | Modify | Add reminder chips + ReminderForm integration |

---

## Chunk 1: Data Layer

### Task 1: Add Reminder type

**Files:**
- Modify: `web/src/types/index.ts`

- [ ] **Step 1: Add Reminder interface**

Add after the `SubTask` interface:

```ts
export interface Reminder {
  id: string
  task_id: string
  remind_at: string
  is_sent: boolean
  created_at: string
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd web && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add web/src/types/index.ts
git commit -m "feat(types): add Reminder interface"
```

### Task 2: Add mock data and store

**Files:**
- Modify: `web/src/mocks/data.ts`
- Modify: `web/src/mocks/mock-store.ts`

- [ ] **Step 1: Add mockReminders to data.ts**

Add the import for `Reminder` type, then add after `mockSubTasks`:

```ts
export const mockReminders: Reminder[] = [
  {
    id: 'reminder-1',
    task_id: 'task-1',
    remind_at: tomorrow,
    is_sent: false,
    created_at: now,
  },
  {
    id: 'reminder-2',
    task_id: 'task-1',
    remind_at: now,
    is_sent: true,
    created_at: now,
  },
  {
    id: 'reminder-3',
    task_id: 'task-4',
    remind_at: tomorrow,
    is_sent: false,
    created_at: now,
  },
]
```

- [ ] **Step 2: Extend mock-store.ts with reminder state and methods**

Add `Reminder` to the type import. Add `mockReminders` to the data import.

Add to the `MockDataState` interface:

```ts
reminders: Reminder[]
getReminders: (taskId: string) => Reminder[]
createReminder: (data: { task_id: string; remind_at: string }) => Reminder
deleteReminder: (id: string) => void
```

Add to the store implementation:

```ts
reminders: [...mockReminders],

getReminders: (taskId) => get().reminders.filter((r) => r.task_id === taskId),

createReminder: (data) => {
  const reminder: Reminder = {
    id: nextId('reminder'),
    task_id: data.task_id,
    remind_at: data.remind_at,
    is_sent: false,
    created_at: timestamp(),
  }
  set((s) => ({ reminders: [...s.reminders, reminder] }))
  return reminder
},

deleteReminder: (id) => {
  set((s) => ({ reminders: s.reminders.filter((r) => r.id !== id) }))
},
```

- [ ] **Step 3: Add cascade delete for reminders in deleteTask**

In the existing `deleteTask` method, add `reminders` cleanup alongside `subtasks`:

```ts
deleteTask: (id) => {
  set((s) => ({
    tasks: s.tasks.filter((t) => t.id !== id),
    subtasks: s.subtasks.filter((st) => st.task_id !== id),
    reminders: s.reminders.filter((r) => r.task_id !== id),
  }))
},
```

- [ ] **Step 4: Verify no TypeScript errors**

Run: `cd web && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add web/src/mocks/data.ts web/src/mocks/mock-store.ts
git commit -m "feat(mocks): add reminder mock data, store methods, and cascade delete"
```

### Task 3: Add React Query hooks

**Files:**
- Create: `web/src/hooks/use-reminders.ts`

- [ ] **Step 1: Create use-reminders.ts**

Follow the exact pattern from `use-subtasks.ts`:

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { useMockStore } from '../mocks/mock-store'
import type { Reminder } from '../types'

const isMock = import.meta.env.VITE_USE_MOCK === 'true'

export function useReminders(taskId: string) {
  const store = useMockStore()
  return useQuery({
    queryKey: ['reminders', taskId],
    queryFn: () => isMock ? Promise.resolve(store.getReminders(taskId)) : api.get<Reminder[]>(`/tasks/${taskId}/reminders`),
    enabled: !!taskId,
  })
}

export function useCreateReminder() {
  const qc = useQueryClient()
  const store = useMockStore()
  return useMutation({
    mutationFn: (data: { task_id: string; remind_at: string }) =>
      isMock ? Promise.resolve(store.createReminder(data)) : api.post<Reminder>('/reminders', data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['reminders', vars.task_id] })
    },
  })
}

export function useDeleteReminder() {
  const qc = useQueryClient()
  const store = useMockStore()
  return useMutation({
    mutationFn: (id: string) =>
      isMock ? Promise.resolve(store.deleteReminder(id)) : api.delete(`/reminders/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reminders'] }),
  })
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd web && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add web/src/hooks/use-reminders.ts
git commit -m "feat(hooks): add React Query hooks for reminders"
```

---

## Chunk 2: UI Components

### Task 4: Build ReminderForm (bottom sheet)

**Files:**
- Create: `web/src/components/reminders/ReminderForm.tsx`

- [ ] **Step 1: Create ReminderForm component**

```tsx
import { useState } from 'react'

interface ReminderFormProps {
  open: boolean
  onClose: () => void
  dueDate?: string
  existingRemindAts: string[]
  onAdd: (remindAt: string) => void
}

const PRESETS = [
  { label: 'At due time', offsetMs: 0 },
  { label: '5 min before', offsetMs: -5 * 60 * 1000 },
  { label: '15 min before', offsetMs: -15 * 60 * 1000 },
  { label: '30 min before', offsetMs: -30 * 60 * 1000 },
  { label: '1 hour before', offsetMs: -60 * 60 * 1000 },
  { label: '1 day before', offsetMs: -24 * 60 * 60 * 1000 },
]

function resolvePreset(dueDate: string, offsetMs: number): string {
  const base = new Date(`${dueDate}T09:00:00`)
  return new Date(base.getTime() + offsetMs).toISOString()
}

export default function ReminderForm({ open, onClose, dueDate, existingRemindAts, onAdd }: ReminderFormProps) {
  const [customDate, setCustomDate] = useState('')
  const [customTime, setCustomTime] = useState('')

  if (!open) return null

  const handlePreset = (offsetMs: number) => {
    if (!dueDate) return
    const remindAt = resolvePreset(dueDate, offsetMs)
    onAdd(remindAt)
  }

  const handleCustom = () => {
    if (!customDate || !customTime) return
    const remindAt = new Date(`${customDate}T${customTime}:00`).toISOString()
    onAdd(remindAt)
    setCustomDate('')
    setCustomTime('')
  }

  const isPresetAdded = (offsetMs: number): boolean => {
    if (!dueDate) return false
    const resolved = resolvePreset(dueDate, offsetMs)
    return existingRemindAts.some((r) => r === resolved)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
      <div className="fixed inset-0 bg-black/40" />
      <div
        className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-8 rounded-full bg-slate-300" />
        <h2 className="mb-4 text-lg font-bold text-slate-900">Add Reminder</h2>

        <div className="mb-4">
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
                  onClick={() => handlePreset(preset.offsetMs)}
                  disabled={!dueDate || added}
                  className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                    added
                      ? 'bg-blue-50 text-blue-600'
                      : dueDate
                        ? 'bg-slate-50 text-slate-700 active:bg-slate-100'
                        : 'bg-slate-50 text-slate-300'
                  }`}
                >
                  <span>{preset.label}</span>
                  {added && <span className="text-xs font-medium">Added ✓</span>}
                </button>
              )
            })}
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <p className="mb-2 text-xs font-medium text-slate-500">Custom</p>
          <div className="flex gap-2">
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:bg-white"
            />
            <input
              type="time"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              className="w-28 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:bg-white"
            />
          </div>
          <button
            onClick={handleCustom}
            disabled={!customDate || !customTime}
            className="mt-2 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
          >
            Add Custom Reminder
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd web && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add web/src/components/reminders/ReminderForm.tsx
git commit -m "feat(ui): add ReminderForm bottom sheet with presets and custom datetime"
```

### Task 5: Build ReminderList (chip display)

**Files:**
- Create: `web/src/components/reminders/ReminderList.tsx`

- [ ] **Step 1: Create ReminderList component**

```tsx
import { useState } from 'react'
import { useReminders, useCreateReminder, useDeleteReminder } from '../../hooks/use-reminders'
import type { Reminder } from '../../types'
import ReminderForm from './ReminderForm'

interface ReminderListProps {
  taskId: string
  dueDate?: string
}

const PRESET_OFFSETS = [
  { label: 'At due time', offsetMs: 0 },
  { label: '5 min before', offsetMs: -5 * 60 * 1000 },
  { label: '15 min before', offsetMs: -15 * 60 * 1000 },
  { label: '30 min before', offsetMs: -30 * 60 * 1000 },
  { label: '1 hour before', offsetMs: -60 * 60 * 1000 },
  { label: '1 day before', offsetMs: -24 * 60 * 60 * 1000 },
]

function getRelativeLabel(remindAt: string, dueDate?: string): string {
  if (dueDate) {
    const base = new Date(`${dueDate}T09:00:00`).getTime()
    const remindTime = new Date(remindAt).getTime()
    const diff = remindTime - base
    const match = PRESET_OFFSETS.find((p) => p.offsetMs === diff)
    if (match) return match.label
  }
  return new Date(remindAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function ReminderList({ taskId, dueDate }: ReminderListProps) {
  // dueDate is passed through to getRelativeLabel for chip text
  const { data: reminders, isLoading } = useReminders(taskId)
  const createReminder = useCreateReminder()
  const deleteReminder = useDeleteReminder()
  const [showForm, setShowForm] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-2 py-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-7 w-32 animate-pulse rounded-full bg-slate-100" />
        ))}
      </div>
    )
  }

  const handleAdd = (remindAt: string) => {
    createReminder.mutate({ task_id: taskId, remind_at: remindAt })
  }

  const existingRemindAts = (reminders || []).map((r: Reminder) => r.remind_at)

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">Reminders</h2>
        <button
          onClick={() => setShowForm(true)}
          className="text-xs font-medium text-blue-600 transition-colors active:text-blue-700"
        >
          + Add
        </button>
      </div>

      {reminders && reminders.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {reminders.map((reminder: Reminder) => (
            <span
              key={reminder.id}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                reminder.is_sent
                  ? 'bg-green-100 text-green-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {reminder.is_sent ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="size-3">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="size-3">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              )}
              {getRelativeLabel(reminder.remind_at, dueDate)}
              {!reminder.is_sent && (
                <button
                  onClick={() => deleteReminder.mutate(reminder.id)}
                  className="ml-0.5 text-blue-400 transition-colors hover:text-blue-600"
                  aria-label="Remove reminder"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="size-3">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400">No reminders set</p>
      )}

      <ReminderForm
        open={showForm}
        onClose={() => setShowForm(false)}
        dueDate={dueDate}
        existingRemindAts={existingRemindAts}
        onAdd={handleAdd}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd web && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add web/src/components/reminders/ReminderList.tsx
git commit -m "feat(ui): add ReminderList with chip display and delete"
```

---

## Chunk 3: Integration

### Task 6: Integrate ReminderList into TaskDetail

**Files:**
- Modify: `web/src/components/tasks/TaskDetail.tsx`

- [ ] **Step 1: Add ReminderList import and section**

Add import at top:

```ts
import ReminderList from '../reminders/ReminderList'
```

Add after the Sub-tasks card (after the closing `</div>` of the subtask section, around line 176):

```tsx
<div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
  <ReminderList taskId={task.id} dueDate={task.due_date} />
</div>
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd web && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Visual test**

Run: `cd web && npm run dev`
Open browser, navigate to a task detail (e.g., "Morning workout routine" which has mock reminders). Verify:
- Reminders section appears below Sub-tasks
- Blue chip for pending reminder, green chip for sent reminder
- `×` button appears on pending, not on sent
- Clicking `×` removes the reminder
- Clicking "+ Add" opens the bottom sheet
- Presets work when task has a due date
- Custom datetime works
- Bottom sheet closes on backdrop tap

- [ ] **Step 4: Commit**

```bash
git add web/src/components/tasks/TaskDetail.tsx
git commit -m "feat(ui): integrate ReminderList into TaskDetail page"
```

### Task 7: Integrate reminders into TaskForm

**Files:**
- Modify: `web/src/components/tasks/TaskForm.tsx`

- [ ] **Step 1: Add reminder local state and ReminderForm**

Add import:

```ts
import { useCreateReminder } from '../../hooks/use-reminders'
import ReminderForm from '../reminders/ReminderForm'
```

Add state inside the component (after existing state declarations):

```ts
const [reminders, setReminders] = useState<string[]>([])
const [showReminderForm, setShowReminderForm] = useState(false)
const createReminder = useCreateReminder()
```

Update `resetAndClose` to also clear reminders:

```ts
const resetAndClose = () => {
  setTitle('')
  setDescription('')
  setDueDate('')
  setPriority('medium')
  setReminders([])
  onClose()
}
```

Update `handleSubmit` — in the `onSuccess` callback, create reminders for the new task before closing:

```ts
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault()
  const targetSection = sectionId || sections?.[0]?.id
  if (!title.trim() || !targetSection) return
  createTask.mutate(
    {
      section_id: targetSection,
      title: title.trim(),
      description: isEditorEmpty(description) ? undefined : description,
      due_date: dueDate || undefined,
      priority,
    },
    {
      onSuccess: (task) => {
        if (reminders.length > 0) {
          reminders.forEach((remindAt) => {
            createReminder.mutate({ task_id: task.id, remind_at: remindAt })
          })
        }
        resetAndClose()
      },
    },
  )
}
```

- [ ] **Step 2: Add reminder chips UI to the form**

Add after the Section selector `</div>` and before the button row:

```tsx
<div>
  <label className="mb-1 block text-xs font-medium text-slate-500">Reminders</label>
  <div className="flex flex-wrap gap-2">
    {reminders.map((remindAt, i) => (
      <span
        key={i}
        className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="size-3">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {new Date(remindAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
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
    <button
      type="button"
      onClick={() => setShowReminderForm(true)}
      className="rounded-full border border-dashed border-blue-300 px-3 py-1.5 text-xs font-medium text-blue-600 transition-colors active:bg-blue-50"
    >
      + Add
    </button>
  </div>
</div>
<ReminderForm
  open={showReminderForm}
  onClose={() => setShowReminderForm(false)}
  dueDate={dueDate || undefined}
  existingRemindAts={reminders}
  onAdd={(remindAt) => setReminders((prev) => [...prev, remindAt])}
/>
```

- [ ] **Step 3: Verify no TypeScript errors**

Run: `cd web && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Visual test**

Run: `cd web && npm run dev`
Open browser, click FAB to create a new task. Verify:
- "Reminders" label and "+ Add" chip appear below Section
- Clicking "+ Add" opens bottom sheet
- Selecting a preset adds a chip (only if due date is set)
- Custom datetime works
- Chips show with `×` to remove
- Creating the task with reminders works (check task detail to see reminders)

- [ ] **Step 5: Commit**

```bash
git add web/src/components/tasks/TaskForm.tsx
git commit -m "feat(ui): add reminder management to TaskForm"
```

### Task 8: Final build verification

- [ ] **Step 1: Run TypeScript check**

Run: `cd web && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Run production build**

Run: `cd web && npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Commit build if dist changed**

Only if dist is tracked (check `.gitignore` first).
