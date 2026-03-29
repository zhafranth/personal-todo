# Calendar View — Design Spec

## Overview

Implement a calendar view for the personal todo app. Full month grid with task indicator dots; tapping a date opens a bottom sheet showing that day's tasks with inline complete toggle and navigation to task detail.

## Decisions

- **Layout:** Full month grid + bottom sheet (Option A)
- **Responsive:** Keep mobile-centered layout on desktop — no sidebar (Option C)
- **Task interaction:** Checkbox toggles complete inline; tap title navigates to TaskDetail (Option C)
- **Empty dates:** Bottom sheet opens with "No tasks" message + "Add task" button pre-filling the due date (Option A)
- **Implementation:** Leverage existing `react-day-picker` library (Approach A)

## Backend

### New Endpoint: `GET /tasks/calendar`

Query parameters:
- `start` (string, required): Start date in `YYYY-MM-DD` format
- `end` (string, required): End date in `YYYY-MM-DD` format

Returns all of the authenticated user's tasks where `due_date` falls within `[start, end]`, across all sections. Response is `Task[]` (same shape as existing task responses).

**Repository method:** `TaskRepo.ListByDateRange(ctx, userID, start, end)` — SQL query filters on `due_date >= start AND due_date <= end` with user ownership join through sections.

**Route:** Registered alongside existing task routes in the router.

## Frontend

### New Hook: `useCalendarTasks`

```typescript
// hooks/use-calendar-tasks.ts
function useCalendarTasks(start: string, end: string): UseQueryResult<Task[]>
```

- Query key: `['calendar-tasks', start, end]`
- Calls `GET /tasks/calendar?start={start}&end={end}`
- `enabled` when both `start` and `end` are non-empty strings

### CalendarPage (replace placeholder)

**File:** `pages/CalendarPage.tsx`

State:
- `selectedDate: Date | null` — the date tapped by the user
- `month: Date` — the currently displayed month (controlled by DayPicker)

Behavior:
- Computes `start`/`end` from `month` using the **visible grid range** (not just the calendar month). Uses `startOfWeek(startOfMonth(month))` and `endOfWeek(endOfMonth(month))` from date-fns to include leading/trailing days from adjacent months that are visible in the 6-week grid.
- Calls `useCalendarTasks(start, end)` to fetch tasks for visible range
- Groups tasks by `due_date` into a `Map<string, Task[]>` for dot rendering
- Renders `MonthCalendar` and `DayBottomSheet`

Loading/Error states:
- **Loading:** Render the calendar grid immediately (without dots). Dots appear once data arrives.
- **Error:** Show an inline error message below the calendar with a "Retry" button.

### MonthCalendar Component

**File:** `components/calendar/MonthCalendar.tsx`

Uses `react-day-picker` `DayPicker` component in `single` selection mode:
- `month` / `onMonthChange` props for controlled month navigation
- `selected` / `onSelect` props for date selection
- Custom day cell rendering via `components.DayButton` override to show task indicator dots below day numbers
- Reuses calendar CSS variables from existing `DatePicker` (shared styles)

**Task indicator dots:**
- A small dot (4px) rendered below the day number
- Blue dot (`bg-blue-500`): day has incomplete tasks
- Green dot (`bg-emerald-500`): day has tasks but all are completed
- No dot: day has no tasks

### DayBottomSheet Component

**File:** `components/calendar/DayBottomSheet.tsx`

Props:
- `date: Date | null` — selected date (null = closed)
- `tasks: Task[]` — tasks for the selected date
- `onClose: () => void`
- `onAddTask: () => void` — opens TaskForm

Layout:
- Fixed overlay at bottom of screen with slide-up animation
- Drag handle bar at top
- Date header formatted as "Day, Month Date" (e.g., "Sunday, March 29")
- Task count label

**Task list items:**
- Checkbox button (left): toggles `is_completed` via existing `useUpdateTask` mutation
- Task title (center): tappable, navigates to `/tasks/{id}` via `useNavigate`
- Priority dot (right): colored circle matching existing `priorityColors` from `TaskItem`
- Completed tasks: strikethrough title, muted colors, sorted to bottom of list

**Empty state:**
- "No tasks for this day" text
- "Add task" button that calls `onAddTask`

**Dismiss:** Tap outside overlay, tap the X button, or swipe down on the drag handle.

### TaskForm Integration

CalendarPage manages a `showTaskForm` boolean and a `defaultDueDate` string. When "Add task" is tapped from the bottom sheet:
1. Set `defaultDueDate` to the selected date formatted as `YYYY-MM-DD`
2. Open TaskForm

TaskForm already accepts `defaultSectionId` — we add a new optional prop `defaultDueDate?: string` to pre-fill the due date field. Since TaskForm returns `null` when `!open` (line 30), React discards component state on close, so the `defaultDueDate` initial value is correctly applied each time it opens.

### Query Invalidation

Update `useUpdateTask` and `useCreateTask` in `use-tasks.ts` to also invalidate `{ queryKey: ['calendar-tasks'] }` in their `onSuccess` callbacks. This ensures calendar dots update when tasks are toggled or created from any part of the app (not just the calendar page).

### Shared Calendar Styles

Extract the `calendarStyles` CSS string from `DatePicker.tsx` into a shared location (e.g., `components/calendar/calendar-styles.ts`) so both `DatePicker` and `MonthCalendar` use the same styles. The calendar page version may need minor overrides (e.g., larger day cells for full-page display).

## File Changes Summary

### New Files
- `web/src/hooks/use-calendar-tasks.ts` — TanStack Query hook
- `web/src/components/calendar/MonthCalendar.tsx` — Month grid component
- `web/src/components/calendar/DayBottomSheet.tsx` — Bottom sheet for daily tasks
- `web/src/components/calendar/calendar-styles.ts` — Shared calendar CSS
- `server/internal/repository/task_calendar.go` — Date range query (or add method to existing task.go)
- `server/internal/handler/task_calendar.go` — Calendar endpoint handler (or add method to existing task.go)

### Modified Files
- `web/src/pages/CalendarPage.tsx` — Replace placeholder with full implementation
- `web/src/components/ui/DatePicker.tsx` — Extract shared styles to calendar-styles.ts, import from there
- `web/src/components/tasks/TaskForm.tsx` — Add optional `defaultDueDate` prop
- `web/src/hooks/use-tasks.ts` — Add `calendar-tasks` invalidation to `useUpdateTask` and `useCreateTask`
- `server/cmd/main.go` (or router file) — Register new `/tasks/calendar` route

## Out of Scope

- Tablet/desktop responsive layout (deferred — keeping mobile-centered)
- Multi-day event display
- Drag-and-drop to reschedule tasks
- Week view or agenda view
