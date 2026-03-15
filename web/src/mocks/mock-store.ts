import { create } from 'zustand'
import type { Section, Task, SubTask } from '../types'
import { mockSections, mockTasks, mockSubTasks } from './data'

let idCounter = 100

function nextId(prefix: string) {
  return `${prefix}-${++idCounter}`
}

function timestamp() {
  return new Date().toISOString()
}

interface MockDataState {
  sections: Section[]
  tasks: Task[]
  subtasks: SubTask[]

  // Sections
  getSections: () => Section[]
  createSection: (title: string) => Section
  updateSection: (id: string, data: Partial<Section>) => Section
  deleteSection: (id: string) => void

  // Tasks
  getTasks: (sectionId: string) => Task[]
  getTask: (id: string) => Task | undefined
  createTask: (data: { section_id: string; title: string; description?: string; due_date?: string; priority?: string }) => Task
  updateTask: (id: string, data: Partial<Task>) => Task
  deleteTask: (id: string) => void

  // Subtasks
  getSubtasks: (taskId: string) => SubTask[]
  createSubtask: (data: { task_id: string; title: string }) => SubTask
  updateSubtask: (id: string, data: Partial<SubTask>) => SubTask
  deleteSubtask: (id: string) => void
}

export const useMockStore = create<MockDataState>((set, get) => ({
  sections: [...mockSections],
  tasks: [...mockTasks],
  subtasks: [...mockSubTasks],

  // Sections
  getSections: () => get().sections,

  createSection: (title) => {
    const section: Section = {
      id: nextId('section'),
      user_id: 'user-1',
      title,
      order_index: get().sections.length,
      created_at: timestamp(),
      updated_at: timestamp(),
    }
    set((s) => ({ sections: [...s.sections, section] }))
    return section
  },

  updateSection: (id, data) => {
    let updated!: Section
    set((s) => ({
      sections: s.sections.map((sec) => {
        if (sec.id === id) {
          updated = { ...sec, ...data, updated_at: timestamp() }
          return updated
        }
        return sec
      }),
    }))
    return updated
  },

  deleteSection: (id) => {
    set((s) => ({
      sections: s.sections.filter((sec) => sec.id !== id),
      tasks: s.tasks.filter((t) => t.section_id !== id),
    }))
  },

  // Tasks
  getTasks: (sectionId) => get().tasks.filter((t) => t.section_id === sectionId),

  getTask: (id) => get().tasks.find((t) => t.id === id),

  createTask: (data) => {
    const sectionTasks = get().tasks.filter((t) => t.section_id === data.section_id)
    const task: Task = {
      id: nextId('task'),
      section_id: data.section_id,
      title: data.title,
      description: data.description,
      due_date: data.due_date,
      priority: (data.priority as Task['priority']) || 'medium',
      is_completed: false,
      order_index: sectionTasks.length,
      created_at: timestamp(),
      updated_at: timestamp(),
    }
    set((s) => ({ tasks: [...s.tasks, task] }))
    return task
  },

  updateTask: (id, data) => {
    let updated!: Task
    set((s) => ({
      tasks: s.tasks.map((t) => {
        if (t.id === id) {
          updated = {
            ...t,
            ...data,
            updated_at: timestamp(),
            ...(data.is_completed === true && !t.completed_at ? { completed_at: timestamp() } : {}),
            ...(data.is_completed === false ? { completed_at: undefined } : {}),
          }
          return updated
        }
        return t
      }),
    }))
    return updated
  },

  deleteTask: (id) => {
    set((s) => ({
      tasks: s.tasks.filter((t) => t.id !== id),
      subtasks: s.subtasks.filter((st) => st.task_id !== id),
    }))
  },

  // Subtasks
  getSubtasks: (taskId) => get().subtasks.filter((st) => st.task_id === taskId),

  createSubtask: (data) => {
    const taskSubtasks = get().subtasks.filter((st) => st.task_id === data.task_id)
    const subtask: SubTask = {
      id: nextId('subtask'),
      task_id: data.task_id,
      title: data.title,
      is_completed: false,
      order_index: taskSubtasks.length,
      created_at: timestamp(),
      updated_at: timestamp(),
    }
    set((s) => ({ subtasks: [...s.subtasks, subtask] }))
    return subtask
  },

  updateSubtask: (id, data) => {
    let updated!: SubTask
    set((s) => ({
      subtasks: s.subtasks.map((st) => {
        if (st.id === id) {
          updated = {
            ...st,
            ...data,
            updated_at: timestamp(),
            ...(data.is_completed === true && !st.completed_at ? { completed_at: timestamp() } : {}),
            ...(data.is_completed === false ? { completed_at: undefined } : {}),
          }
          return updated
        }
        return st
      }),
    }))
    return updated
  },

  deleteSubtask: (id) => {
    set((s) => ({ subtasks: s.subtasks.filter((st) => st.id !== id) }))
  },
}))
