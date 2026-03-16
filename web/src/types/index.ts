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

export interface Task {
  id: string
  section_id: string
  title: string
  description?: string
  due_date?: string
  priority: 'low' | 'medium' | 'high'
  is_completed: boolean
  completed_at?: string
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
  created_at: string
}
