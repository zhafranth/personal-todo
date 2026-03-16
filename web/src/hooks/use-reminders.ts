import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { useMockStore } from '../mocks/mock-store'
import type { Reminder } from '../types'

const isMock = import.meta.env.VITE_USE_MOCK === 'true'

export function useReminders(taskId: string) {
  const store = useMockStore()
  return useQuery({
    queryKey: ['reminders', taskId],
    queryFn: () => isMock ? Promise.resolve(store.getReminders(taskId)) : api.get<Reminder[]>(`/tasks/${taskId}/reminders`),
    enabled: !!taskId,
  })
}

export function useCreateReminder() {
  const qc = useQueryClient()
  const store = useMockStore()
  return useMutation({
    mutationFn: (data: { task_id: string; remind_at: string }) =>
      isMock ? Promise.resolve(store.createReminder(data)) : api.post<Reminder>('/reminders', data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['reminders', vars.task_id] })
    },
  })
}

export function useDeleteReminder() {
  const qc = useQueryClient()
  const store = useMockStore()
  return useMutation({
    mutationFn: (id: string) =>
      isMock ? Promise.resolve(store.deleteReminder(id)) : api.delete(`/reminders/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reminders'] }),
  })
}
