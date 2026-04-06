export interface User {
  id: string
  email: string
  name: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface Section {
  id: string
  user_id: string
  title: string
  order_index: number
  created_at: string
  updated_at: string
}

export type RecurrenceRule =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'monthly_last_day'
  | `every_${number}_days`
  | `every_${number}_weeks`
  | `every_${number}_months`

export interface Task {
  id: string
  section_id: string
  title: string
  description?: string
  due_date?: string
  priority: 'low' | 'medium' | 'high'
  is_completed: boolean
  completed_at?: string
  recurrence_rule?: RecurrenceRule
  recurring_definition_id?: string
  order_index: number
  created_at: string
  updated_at: string
}

export interface SubTask {
  id: string
  task_id: string
  title: string
  is_completed: boolean
  completed_at?: string
  order_index: number
  created_at: string
  updated_at: string
}

export interface Reminder {
  id: string
  task_id: string
  remind_at: string
  is_sent: boolean
  recurrence_rule?: RecurrenceRule
  created_at: string
}

export interface Note {
  id: string
  user_id: string
  title: string
  content: string | null
  is_pinned: boolean
  created_at: string
  updated_at: string
}

export interface RecurringDefinition {
  id: string
  user_id: string
  section_id: string
  title: string
  description?: string
  priority: 'low' | 'medium' | 'high'
  recurrence_rule: RecurrenceRule
  next_due_date: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface NoteUpdate {
  title?: string
  content?: string
  is_pinned?: boolean
}

export interface PushSub {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  created_at: string
}
