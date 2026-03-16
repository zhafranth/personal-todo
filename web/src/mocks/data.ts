import type { User, Section, Task, SubTask, Reminder } from '../types'

const now = new Date().toISOString()
const yesterday = new Date(Date.now() - 86400000).toISOString()
const tomorrow = new Date(Date.now() + 86400000).toISOString()
const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString()
const in3Days = new Date(Date.now() + 3 * 86400000).toISOString()

export const mockUser: User = {
  id: 'user-1',
  email: 'demo@example.com',
  name: 'Demo User',
  avatar_url: undefined,
  created_at: now,
  updated_at: now,
}

export const mockSections: Section[] = [
  {
    id: 'section-1',
    user_id: 'user-1',
    title: 'Personal',
    order_index: 0,
    created_at: now,
    updated_at: now,
  },
  {
    id: 'section-2',
    user_id: 'user-1',
    title: 'Work',
    order_index: 1,
    created_at: now,
    updated_at: now,
  },
  {
    id: 'section-3',
    user_id: 'user-1',
    title: 'Shopping',
    order_index: 2,
    created_at: now,
    updated_at: now,
  },
]

export const mockTasks: Task[] = [
  // Personal
  {
    id: 'task-1',
    section_id: 'section-1',
    title: 'Morning workout routine',
    description: 'Do 30 min cardio + stretching',
    due_date: tomorrow,
    priority: 'high',
    is_completed: false,
    order_index: 0,
    created_at: now,
    updated_at: now,
  },
  {
    id: 'task-2',
    section_id: 'section-1',
    title: 'Read "Atomic Habits" chapter 5',
    description: undefined,
    due_date: in3Days,
    priority: 'low',
    is_completed: false,
    order_index: 1,
    created_at: now,
    updated_at: now,
  },
  {
    id: 'task-3',
    section_id: 'section-1',
    title: 'Call dentist for appointment',
    description: 'Schedule cleaning for next month',
    due_date: yesterday,
    priority: 'medium',
    is_completed: true,
    completed_at: yesterday,
    order_index: 2,
    created_at: now,
    updated_at: now,
  },
  // Work
  {
    id: 'task-4',
    section_id: 'section-2',
    title: 'Prepare sprint demo slides',
    description: 'Cover the new dashboard feature and API improvements',
    due_date: tomorrow,
    priority: 'high',
    is_completed: false,
    order_index: 0,
    created_at: now,
    updated_at: now,
  },
  {
    id: 'task-5',
    section_id: 'section-2',
    title: 'Code review PR #142',
    description: undefined,
    due_date: tomorrow,
    priority: 'medium',
    is_completed: false,
    order_index: 1,
    created_at: now,
    updated_at: now,
  },
  {
    id: 'task-6',
    section_id: 'section-2',
    title: 'Update project documentation',
    description: 'Add API endpoint docs for v2',
    due_date: nextWeek,
    priority: 'low',
    is_completed: false,
    order_index: 2,
    created_at: now,
    updated_at: now,
  },
  // Shopping
  {
    id: 'task-7',
    section_id: 'section-3',
    title: 'Buy groceries',
    description: 'Eggs, milk, bread, vegetables',
    due_date: tomorrow,
    priority: 'medium',
    is_completed: false,
    order_index: 0,
    created_at: now,
    updated_at: now,
  },
  {
    id: 'task-8',
    section_id: 'section-3',
    title: 'Order new headphones',
    description: undefined,
    due_date: undefined,
    priority: 'low',
    is_completed: false,
    order_index: 1,
    created_at: now,
    updated_at: now,
  },
]

export const mockSubTasks: SubTask[] = [
  // Subtasks for "Morning workout routine"
  {
    id: 'subtask-1',
    task_id: 'task-1',
    title: 'Warm up (5 min)',
    is_completed: true,
    completed_at: now,
    order_index: 0,
    created_at: now,
    updated_at: now,
  },
  {
    id: 'subtask-2',
    task_id: 'task-1',
    title: 'Cardio (20 min)',
    is_completed: false,
    order_index: 1,
    created_at: now,
    updated_at: now,
  },
  {
    id: 'subtask-3',
    task_id: 'task-1',
    title: 'Cool down stretching (5 min)',
    is_completed: false,
    order_index: 2,
    created_at: now,
    updated_at: now,
  },
  // Subtasks for "Prepare sprint demo slides"
  {
    id: 'subtask-4',
    task_id: 'task-4',
    title: 'Gather screenshots of new features',
    is_completed: false,
    order_index: 0,
    created_at: now,
    updated_at: now,
  },
  {
    id: 'subtask-5',
    task_id: 'task-4',
    title: 'Write demo script',
    is_completed: false,
    order_index: 1,
    created_at: now,
    updated_at: now,
  },
  {
    id: 'subtask-6',
    task_id: 'task-4',
    title: 'Rehearse presentation',
    is_completed: false,
    order_index: 2,
    created_at: now,
    updated_at: now,
  },
  // Subtasks for "Buy groceries"
  {
    id: 'subtask-7',
    task_id: 'task-7',
    title: 'Eggs (1 dozen)',
    is_completed: false,
    order_index: 0,
    created_at: now,
    updated_at: now,
  },
  {
    id: 'subtask-8',
    task_id: 'task-7',
    title: 'Fresh milk (2L)',
    is_completed: true,
    completed_at: now,
    order_index: 1,
    created_at: now,
    updated_at: now,
  },
  {
    id: 'subtask-9',
    task_id: 'task-7',
    title: 'Whole wheat bread',
    is_completed: false,
    order_index: 2,
    created_at: now,
    updated_at: now,
  },
]

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
