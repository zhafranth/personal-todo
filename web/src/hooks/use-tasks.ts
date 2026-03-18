import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Task, RecurrenceRule } from '../types'

export function useTasks(sectionId: string) {
  return useQuery({
    queryKey: ['tasks', sectionId],
    queryFn: () => api.get<Task[]>(`/sections/${sectionId}/tasks`),
    enabled: !!sectionId,
  })
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ['task', id],
    queryFn: () => api.get<Task>(`/tasks/${id}`),
    enabled: !!id,
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { section_id: string; title: string; description?: string; due_date?: string; priority?: string }) =>
      api.post<Task>('/tasks', data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['tasks', vars.section_id] })
    },
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; title?: string; description?: string; due_date?: string | null; priority?: string; is_completed?: boolean; order_index?: number; section_id?: string; recurrence_rule?: RecurrenceRule | null }) =>
      api.patch<Task>(`/tasks/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['task'] })
    },
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}
