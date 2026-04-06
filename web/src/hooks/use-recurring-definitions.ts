import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { RecurringDefinition, Task, RecurrenceRule } from '../types'

export function useRecurringDefinitions() {
  return useQuery({
    queryKey: ['recurring-definitions'],
    queryFn: () => api.get<RecurringDefinition[]>('/recurring-definitions'),
  })
}

export function useCreateRecurringDefinition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      section_id: string
      title: string
      description?: string
      priority: string
      recurrence_rule: RecurrenceRule
      due_date: string
    }) => api.post<{ definition: RecurringDefinition; task: Task }>('/recurring-definitions', data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['recurring-definitions'] })
      qc.invalidateQueries({ queryKey: ['tasks', vars.section_id] })
      qc.invalidateQueries({ queryKey: ['calendar-tasks'] })
    },
  })
}

export function useUpdateRecurringDefinition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: {
      id: string
      title?: string
      description?: string
      priority?: string
      section_id?: string
      recurrence_rule?: RecurrenceRule
      is_active?: boolean
    }) => api.patch<RecurringDefinition>(`/recurring-definitions/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurring-definitions'] })
    },
  })
}

export function useDeleteRecurringDefinition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/recurring-definitions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurring-definitions'] })
    },
  })
}
