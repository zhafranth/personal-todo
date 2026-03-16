# Reminder Management UI Design

## Overview

Add reminder management UI to the Personal Todo app, allowing users to create, view, and delete reminders per task. Reminders can be set as relative presets (e.g., "15 min before due date") or as absolute custom datetimes. This is part of Fase 2 in the PRD.

## Data Model

### Reminder Type

```ts
interface Reminder {
  id: string
  task_id: string
  remind_at: string    // ISO 8601 datetime
  is_sent: boolean
  created_at: string
}
```

Matches the PRD `reminders` table: `id` (UUID PK), `task_id` (UUID FK → tasks), `remind_at` (TIMESTAMPTZ), `is_sent` (BOOLEAN), `created_at` (TIMESTAMPTZ).

Reminders are intentionally immutable — create and delete only, no update operation. This is why there is no `updated_at` field (unlike Section, Task, SubTask).

### Mock Data

Add `mockReminders` array in `mocks/data.ts` with 2–3 sample reminders attached to existing tasks (e.g., task-1 and task-4). Include one sent reminder for visual variety.

### Mock Store

Extend `useMockStore` with:
- `reminders: Reminder[]`
- `getReminders(taskId: string): Reminder[]`
- `createReminder(data: { task_id: string; remind_at: string }): Reminder`
- `deleteReminder(id: string): void`

Update existing `deleteTask` to also cascade-delete reminders for the deleted task (same pattern as subtask cascade).

## React Query Hooks

New file: `hooks/use-reminders.ts`

- `useReminders(taskId: string)` — fetches reminders for a task
- `useCreateReminder()` — creates a reminder, invalidates reminders query
- `useDeleteReminder()` — deletes a reminder, invalidates reminders query

Mock mode follows the same pattern as `use-tasks.ts` / `use-subtasks.ts`.

## UI Components

### ReminderList (`components/reminders/ReminderList.tsx`)

Renders inside TaskDetail page, in its own card section below Sub-tasks.

**Layout:**
- Header row: "Reminders" label (left) + "+ Add" link (right)
- Reminder chips displayed as flex-wrap pills:
  - **Pending** (blue): `bg-blue-100 text-blue-700` with bell icon and `×` delete button
  - **Sent** (green): `bg-green-100 text-green-700` with check icon, no delete button
  - Chip text: relative label if recognizable (e.g., "15 min before"), otherwise formatted datetime
- Empty state: subtle text "No reminders set"

**Interactions:**
- Tapping `×` on a pending chip calls `deleteReminder`
- Tapping "+ Add" opens `ReminderForm` bottom sheet

### ReminderForm (`components/reminders/ReminderForm.tsx`)

Bottom sheet modal, same visual pattern as TaskForm.

**Props:**
```ts
interface ReminderFormProps {
  open: boolean
  onClose: () => void
  taskId?: string                // undefined when used in TaskForm (task not yet created)
  dueDate?: string               // task's due_date, needed for presets
  existingRemindAts: string[]    // list of existing remind_at values, used to mark presets as "Added"
  onAdd: (remindAt: string) => void  // callback — in TaskDetail triggers API, in TaskForm adds to local state
}
```

This abstraction lets the same component work in both contexts:
- **TaskDetail**: `onAdd` calls `createReminder` mutation, `existingRemindAts` comes from fetched reminders
- **TaskForm**: `onAdd` appends to local state array, `existingRemindAts` comes from local state

**Layout:**
- Drag handle bar at top
- Title: "Add Reminder"
- **Quick presets section:**
  - List rows, each tappable
  - Presets: "At due time", "5 min before", "15 min before", "30 min before", "1 hour before", "1 day before"
  - Already-added presets show "Added ✓" in blue, non-tappable
  - If no `dueDate`, presets are disabled with hint text: "Set a due date to use presets"
  - Tapping a preset instantly creates the reminder (resolves to absolute datetime from due_date) and shows feedback
- **Divider**
- **Custom section:**
  - Date input + time input side by side
  - "Add Custom Reminder" button
  - Always available regardless of due_date

**Preset resolution logic:**

Since `due_date` from the TaskForm is a date-only string (`YYYY-MM-DD`, no time), presets assume **09:00 local time** as the default due time. This means "At due time" resolves to `YYYY-MM-DDT09:00:00`, and "15 min before" resolves to `YYYY-MM-DDT08:45:00`, etc.

| Preset | Offset |
|--------|--------|
| At due time | 0 |
| 5 min before | -5 min |
| 15 min before | -15 min |
| 30 min before | -30 min |
| 1 hour before | -1 hour |
| 1 day before | -1 day |

### TaskForm Update (`components/tasks/TaskForm.tsx`)

Add "Reminders" field below the Section selector:
- Label: "Reminders"
- Shows added reminders as blue chips with `×` to remove
- Dashed "+ Add" chip at the end opens ReminderForm
- Reminders stored as local state array of `{ remind_at: string }` objects
- On task create: reminders are created via separate API calls after task creation succeeds
- ReminderForm receives local state instead of API data (since task doesn't exist yet)

### TaskDetail Update (`components/tasks/TaskDetail.tsx`)

Add new card section after Sub-tasks:
```tsx
<div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
  <ReminderList taskId={task.id} dueDate={task.due_date} />
</div>
```

## Behavior Rules

1. **Relative presets require due_date** — if task has no due_date, preset rows are grayed out with "Set a due date to use presets" hint
2. **Custom datetime always works** — no dependency on due_date
3. **Sent reminders cannot be deleted** — no `×` button, shown in green
4. **Duplicate prevention** — presets already added show "Added ✓" and are non-interactive
5. **Instant feedback** — tapping a preset creates the reminder immediately (no confirm step), the sheet stays open for adding more
6. **Close on backdrop tap** — consistent with TaskForm behavior
7. **Custom datetime validation** — both date and time are required. Past datetimes are allowed (backend handles skipping sent logic). No minimum lead time enforced.
8. **Duplicate custom reminders** — allowed (user may intentionally want multiple reminders at the same time via different flows)

## File Changes Summary

| File | Action |
|------|--------|
| `web/src/types/index.ts` | Add `Reminder` interface |
| `web/src/mocks/data.ts` | Add `mockReminders` array |
| `web/src/mocks/mock-store.ts` | Add reminders state + CRUD methods + cascade delete |
| `web/src/hooks/use-reminders.ts` | New file — React Query hooks |
| `web/src/components/reminders/ReminderList.tsx` | New file — chip display + delete |
| `web/src/components/reminders/ReminderForm.tsx` | New file — bottom sheet with presets + custom |
| `web/src/components/tasks/TaskDetail.tsx` | Add ReminderList section |
| `web/src/components/tasks/TaskForm.tsx` | Add reminder chips + ReminderForm integration |
