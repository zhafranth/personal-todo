# Calendar View Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a calendar view page with month grid, task indicator dots, and a day bottom sheet for viewing/managing tasks.

**Architecture:** Frontend-first approach. Build the calendar UI with mock/existing data hooks, then add the backend date-range endpoint. Reuse `react-day-picker` for the month grid, custom bottom sheet component for day tasks.

**Tech Stack:** React, react-day-picker, date-fns, TanStack Query, Tailwind CSS, Go (net/http + pgx)

**Spec:** `docs/superpowers/specs/2026-03-29-calendar-view-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `web/src/components/calendar/calendar-styles.ts` | Shared calendar CSS variables (extracted from DatePicker) |
| `web/src/components/calendar/MonthCalendar.tsx` | Month grid with task indicator dots |
| `web/src/components/calendar/DayBottomSheet.tsx` | Bottom sheet showing tasks for selected date |
| `web/src/hooks/use-calendar-tasks.ts` | TanStack Query hook for date-range task fetching |
| `server/internal/repository/task_calendar.go` | SQL query for tasks by date range |
| `server/internal/handler/task_calendar.go` | HTTP handler for calendar endpoint |

### Modified Files
| File | Change |
|------|--------|
| `web/src/components/ui/DatePicker.tsx` | Import shared styles from calendar-styles.ts |
| `web/src/components/tasks/TaskForm.tsx` | Add `defaultDueDate` prop |
| `web/src/hooks/use-tasks.ts` | Add `calendar-tasks` query invalidation |
| `web/src/pages/CalendarPage.tsx` | Replace placeholder with full implementation |
| `server/cmd/server/main.go` | Register calendar route |

---

### Task 1: Extract shared calendar styles

**Files:**
- Create: `web/src/components/calendar/calendar-styles.ts`
- Modify: `web/src/components/ui/DatePicker.tsx`

- [ ] **Step 1: Create shared styles file**

Create `web/src/components/calendar/calendar-styles.ts`:

```typescript
export const calendarStyles = `
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
```

- [ ] **Step 2: Update DatePicker to import shared styles**

In `web/src/components/ui/DatePicker.tsx`:
- Remove the `const calendarStyles = \`...\`` block (lines 7-88)
- Add import: `import { calendarStyles } from '../calendar/calendar-styles'`

- [ ] **Step 3: Verify the app still works**

Open `http://localhost:5174/` and confirm the DatePicker in TaskForm/TaskDetail still renders correctly with the same styling.

- [ ] **Step 4: Commit**

```bash
git add web/src/components/calendar/calendar-styles.ts web/src/components/ui/DatePicker.tsx
git commit -m "refactor: extract shared calendar styles from DatePicker"
```

---

### Task 2: Add `defaultDueDate` prop to TaskForm

**Files:**
- Modify: `web/src/components/tasks/TaskForm.tsx`

- [ ] **Step 1: Add prop and wire it up**

In `web/src/components/tasks/TaskForm.tsx`:
- Add `defaultDueDate?: string` to `TaskFormProps` interface (line 13)
- Pass it to the component function signature (line 17)
- Change `useState('')` for `dueDate` (line 20) to `useState(defaultDueDate || '')`

The interface becomes:
```typescript
interface TaskFormProps {
  open: boolean
  onClose: () => void
  defaultSectionId?: string
  defaultDueDate?: string
}
```

The function signature becomes:
```typescript
export default function TaskForm({ open, onClose, defaultSectionId, defaultDueDate }: TaskFormProps) {
```

The state becomes:
```typescript
const [dueDate, setDueDate] = useState(defaultDueDate || '')
```

- [ ] **Step 2: Verify TaskForm still works on TasksPage**

Open `http://localhost:5174/`, tap FAB to create a task. Confirm due date field starts empty (no `defaultDueDate` passed from TasksPage).

- [ ] **Step 3: Commit**

```bash
git add web/src/components/tasks/TaskForm.tsx
git commit -m "feat: add defaultDueDate prop to TaskForm"
```

---

### Task 3: Add `calendar-tasks` query invalidation to existing hooks

**Files:**
- Modify: `web/src/hooks/use-tasks.ts`

- [ ] **Step 1: Update useCreateTask**

In `web/src/hooks/use-tasks.ts`, add to `useCreateTask`'s `onSuccess` (after line 28):

```typescript
onSuccess: (_, vars) => {
  qc.invalidateQueries({ queryKey: ['tasks', vars.section_id] })
  qc.invalidateQueries({ queryKey: ['calendar-tasks'] })
},
```

- [ ] **Step 2: Update useUpdateTask**

In `useUpdateTask`'s `onSuccess` (after line 38), add:

```typescript
onSuccess: () => {
  qc.invalidateQueries({ queryKey: ['tasks'] })
  qc.invalidateQueries({ queryKey: ['task'] })
  qc.invalidateQueries({ queryKey: ['calendar-tasks'] })
},
```

- [ ] **Step 3: Update useDeleteTask**

In `useDeleteTask`'s `onSuccess` (line 48), convert the inline arrow to a block body and add calendar invalidation.

Replace:
```typescript
onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
```

With:
```typescript
onSuccess: () => {
  qc.invalidateQueries({ queryKey: ['tasks'] })
  qc.invalidateQueries({ queryKey: ['calendar-tasks'] })
},
```

- [ ] **Step 4: Commit**

```bash
git add web/src/hooks/use-tasks.ts
git commit -m "feat: invalidate calendar-tasks queries on task mutations"
```

---

### Task 4: Create `useCalendarTasks` hook

**Files:**
- Create: `web/src/hooks/use-calendar-tasks.ts`

- [ ] **Step 1: Create the hook**

Create `web/src/hooks/use-calendar-tasks.ts`:

```typescript
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Task } from '../types'

export function useCalendarTasks(start: string, end: string) {
  return useQuery({
    queryKey: ['calendar-tasks', start, end],
    queryFn: () => api.get<Task[]>(`/tasks/calendar?start=${start}&end=${end}`),
    enabled: !!start && !!end,
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/hooks/use-calendar-tasks.ts
git commit -m "feat: add useCalendarTasks hook for date-range fetching"
```

---

### Task 5: Build MonthCalendar component

**Files:**
- Create: `web/src/components/calendar/MonthCalendar.tsx`

- [ ] **Step 1: Create the component**

Create `web/src/components/calendar/MonthCalendar.tsx`:

```tsx
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

const pageStyles = `
  .calendar-page .rdp-root {
    --rdp-day-height: 3rem;
    --rdp-day-width: 3rem;
    --rdp-day_button-height: 2.75rem;
    --rdp-day_button-width: 2.75rem;
  }
  .calendar-page .rdp-month {
    width: 100%;
  }
  .calendar-page .rdp-months {
    width: 100%;
  }
  .calendar-page .rdp-month_grid {
    width: 100%;
  }
  .calendar-page .rdp-weekdays,
  .calendar-page .rdp-weeks {
    width: 100%;
  }
  .calendar-page .rdp-weekday,
  .calendar-page .rdp-day {
    width: calc(100% / 7);
  }
`

function getTaskIndicator(tasks: Task[], date: Date) {
  const dayTasks = tasks.filter(
    (t) => t.due_date && isSameDay(new Date(t.due_date), date)
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
      <style>{pageStyles}</style>
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
```

- [ ] **Step 2: Verify it renders**

This will be tested through CalendarPage integration in Task 7. For now, confirm no TypeScript errors by running:

```bash
cd web && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/calendar/MonthCalendar.tsx
git commit -m "feat: add MonthCalendar component with task indicator dots"
```

---

### Task 6: Build DayBottomSheet component

**Files:**
- Create: `web/src/components/calendar/DayBottomSheet.tsx`

- [ ] **Step 1: Create the component**

Create `web/src/components/calendar/DayBottomSheet.tsx`:

```tsx
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import type { Task } from '../../types'
import { useUpdateTask } from '../../hooks/use-tasks'

const priorityColors = {
  low: 'bg-emerald-400',
  medium: 'bg-amber-400',
  high: 'bg-red-400',
}

interface DayBottomSheetProps {
  date: Date | null
  tasks: Task[]
  onClose: () => void
  onAddTask: () => void
}

export default function DayBottomSheet({
  date,
  tasks,
  onClose,
  onAddTask,
}: DayBottomSheetProps) {
  const navigate = useNavigate()
  const updateTask = useUpdateTask()

  if (!date) return null

  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1
    return 0
  })

  const toggleComplete = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation()
    updateTask.mutate({ id: task.id, is_completed: !task.is_completed })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center animate-in fade-in-0 duration-200" onClick={onClose}>
      <div className="fixed inset-0 bg-black/40" />
      <div
        className="relative max-h-[60vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white pb-6 shadow-2xl animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="sticky top-0 z-10 bg-white px-6 pb-3 pt-3">
          <div className="mx-auto mb-3 h-1 w-8 rounded-full bg-slate-300" />
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {format(date, 'EEEE, MMMM d')}
              </h3>
              <p className="text-xs text-slate-500">
                {tasks.length === 0
                  ? 'No tasks'
                  : `${tasks.length} task${tasks.length > 1 ? 's' : ''}`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition-colors active:bg-slate-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="size-5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-6">
          {sortedTasks.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-400">No tasks for this day</p>
              <button
                onClick={onAddTask}
                className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all active:scale-[0.98]"
              >
                + Add task
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {sortedTasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all active:scale-[0.99] ${
                    task.is_completed ? 'bg-slate-50' : 'bg-slate-50/50'
                  }`}
                >
                  <button
                    onClick={(e) => toggleComplete(e, task)}
                    className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                      task.is_completed
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-slate-300 active:border-blue-400'
                    }`}
                  >
                    {task.is_completed && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="size-3">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => navigate(`/tasks/${task.id}`)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className={`text-sm font-medium ${task.is_completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                      {task.title}
                    </p>
                  </button>
                  <span
                    className={`size-2 shrink-0 rounded-full ${task.is_completed ? 'bg-slate-300' : priorityColors[task.priority]}`}
                    title={task.priority}
                  />
                </div>
              ))}
              <button
                onClick={onAddTask}
                className="mt-2 w-full rounded-xl border border-dashed border-slate-300 py-2.5 text-sm font-medium text-slate-500 transition-colors active:bg-slate-50"
              >
                + Add task
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Confirm no TypeScript errors**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/calendar/DayBottomSheet.tsx
git commit -m "feat: add DayBottomSheet component for daily task view"
```

---

### Task 7: Wire up CalendarPage

**Files:**
- Modify: `web/src/pages/CalendarPage.tsx`

- [ ] **Step 1: Replace the placeholder**

Replace contents of `web/src/pages/CalendarPage.tsx`:

```tsx
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
import DayBottomSheet from '../components/calendar/DayBottomSheet'
import TaskForm from '../components/tasks/TaskForm'
import { useCalendarTasks } from '../hooks/use-calendar-tasks'

export default function CalendarPage() {
  const [month, setMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
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

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold tracking-tight text-slate-900">
        Calendar
      </h1>

      <MonthCalendar
        month={month}
        onMonthChange={setMonth}
        selected={selectedDate ?? undefined}
        onSelect={(date) => setSelectedDate(date ?? null)}
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

      <DayBottomSheet
        date={selectedDate}
        tasks={selectedTasks}
        onClose={() => setSelectedDate(null)}
        onAddTask={handleAddTask}
      />

      <TaskForm
        open={showTaskForm}
        onClose={() => setShowTaskForm(false)}
        defaultDueDate={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined}
      />
    </div>
  )
}
```

- [ ] **Step 2: Test in browser**

Open `http://localhost:5174/calendar`. The calendar grid should render. Without the backend endpoint, the tasks query will fail — the error message with "Retry" should appear. Month navigation should work.

- [ ] **Step 3: Commit**

```bash
git add web/src/pages/CalendarPage.tsx
git commit -m "feat: implement CalendarPage with month grid and day bottom sheet"
```

---

### Task 8: Backend — Add date-range repository method

**Files:**
- Create: `server/internal/repository/task_calendar.go`

- [ ] **Step 1: Create the repository method**

Create `server/internal/repository/task_calendar.go`:

```go
package repository

import (
	"context"
	"time"

	"github.com/zhafrantharif/personal-todo/server/internal/model"
)

func (r *TaskRepo) ListByDateRange(ctx context.Context, userID string, start, end time.Time) ([]model.Task, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT `+taskColumns+`
		 FROM tasks t
		 JOIN sections s ON s.id = t.section_id
		 WHERE s.user_id = $1 AND t.due_date >= $2 AND t.due_date <= $3
		 ORDER BY t.due_date, t.order_index`, userID, start, end)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tasks []model.Task
	for rows.Next() {
		t, err := scanTask(rows.Scan)
		if err != nil {
			return nil, err
		}
		tasks = append(tasks, *t)
	}
	if tasks == nil {
		tasks = []model.Task{}
	}
	return tasks, rows.Err()
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd server && go build ./...
```

- [ ] **Step 3: Commit**

```bash
git add server/internal/repository/task_calendar.go
git commit -m "feat: add ListByDateRange repository method for calendar"
```

---

### Task 9: Backend — Add calendar handler and route

**Files:**
- Create: `server/internal/handler/task_calendar.go`
- Modify: `server/cmd/server/main.go`

- [ ] **Step 1: Create the handler**

Create `server/internal/handler/task_calendar.go`:

```go
package handler

import (
	"net/http"
	"time"

	"github.com/zhafrantharif/personal-todo/server/internal/middleware"
)

func (h *TaskHandler) ListByDateRange(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	startStr := r.URL.Query().Get("start")
	endStr := r.URL.Query().Get("end")

	if startStr == "" || endStr == "" {
		writeError(w, http.StatusBadRequest, "start and end query parameters are required")
		return
	}

	start, err := time.Parse("2006-01-02", startStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid start date format, use YYYY-MM-DD")
		return
	}

	end, err := time.Parse("2006-01-02", endStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid end date format, use YYYY-MM-DD")
		return
	}

	// Set end to end of day to include tasks due on the end date
	end = end.Add(24*time.Hour - time.Nanosecond)

	tasks, err := h.tasks.ListByDateRange(r.Context(), userID, start, end)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list tasks")
		return
	}
	writeJSON(w, http.StatusOK, tasks)
}
```

- [ ] **Step 2: Register the route**

In `server/cmd/server/main.go`, add after line 65 (before the `GET /api/v1/tasks/{id}` route):

```go
protected.HandleFunc("GET /api/v1/tasks/calendar", taskHandler.ListByDateRange)
```

This must be registered **before** `GET /api/v1/tasks/{id}` because Go's ServeMux matches more specific patterns first, but placing it before `{id}` makes the intent clear and avoids `calendar` being matched as an `{id}`.

- [ ] **Step 3: Verify it compiles**

```bash
cd server && go build ./...
```

- [ ] **Step 4: Commit**

```bash
git add server/internal/handler/task_calendar.go server/cmd/server/main.go
git commit -m "feat: add GET /tasks/calendar endpoint for date-range queries"
```

---

### Task 10: End-to-end verification

- [ ] **Step 1: Restart the Go server**

Stop and restart the Go server to pick up the new route.

- [ ] **Step 2: Test the calendar page**

Open `http://localhost:5174/calendar`:
1. Month grid renders with current month
2. Navigate between months with arrows
3. Tap a date — bottom sheet slides up
4. If tasks exist with due dates, dots appear on those dates
5. Tap checkbox on a task — toggles completion, dot color may change
6. Tap task title — navigates to `/tasks/:id`
7. Tap empty date — "No tasks" + "Add task" button
8. Tap "Add task" — TaskForm opens with date pre-filled
9. Create a task — dot appears on the calendar after form closes

- [ ] **Step 3: Test error state**

Stop the Go server. Navigate to calendar. Confirm the error message "Failed to load tasks" with "Retry" button appears.

- [ ] **Step 4: Final commit if any fixes needed**

If any fixes were needed during testing, commit them:

```bash
git add -A
git commit -m "fix: address calendar view integration issues"
```
