import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { useMockStore } from '../mocks/mock-store'
import type { Task } from '../types'

const isMock = import.meta.env.VITE_USE_MOCK === 'true'

export function useTasks(sectionId: string) {
  const store = useMockStore()
  return useQuery({
    queryKey: ['tasks', sectionId],
    queryFn: () => isMock ? Promise.resolve(store.getTasks(sectionId)) : api.get<Task[]>(`/sections/${sectionId}/tasks`),
    enabled: !!sectionId,
  })
}

export function useTask(id: string) {
  const store = useMockStore()
  return useQuery({
    queryKey: ['task', id],
    queryFn: () => {
      if (isMock) {
        const task = store.getTask(id)
        if (!task) throw new Error('Task not found')
        return Promise.resolve(task)
      }
      return api.get<Task>(`/tasks/${id}`)
    },
    enabled: !!id,
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  const store = useMockStore()
  return useMutation({
    mutationFn: (data: { section_id: string; title: string; description?: string; due_date?: string; priority?: string }) =>
      isMock ? Promise.resolve(store.createTask(data)) : api.post<Task>('/tasks', data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['tasks', vars.section_id] })
    },
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  const store = useMockStore()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; title?: string; description?: string; due_date?: string; priority?: string; is_completed?: boolean; order_index?: number; section_id?: string }) =>
      isMock ? Promise.resolve(store.updateTask(id, data)) : api.patch<Task>(`/tasks/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['task'] })
    },
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  const store = useMockStore()
  return useMutation({
    mutationFn: (id: string) =>
      isMock ? Promise.resolve(store.deleteTask(id)) : api.delete(`/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}
