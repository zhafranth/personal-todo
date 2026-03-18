import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Reminder } from '../types'

export function useReminders(taskId: string) {
  return useQuery({
    queryKey: ['reminders', taskId],
    queryFn: () => api.get<Reminder[]>(`/tasks/${taskId}/reminders`),
    enabled: !!taskId,
  })
}

export function useCreateReminder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { task_id: string; remind_at: string }) =>
      api.post<Reminder>('/reminders', data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['reminders', vars.task_id] })
    },
  })
}

export function useDeleteReminder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/reminders/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reminders'] }),
  })
}
