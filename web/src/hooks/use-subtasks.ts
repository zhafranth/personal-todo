import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { SubTask } from '../types'

export function useSubtasks(taskId: string) {
  return useQuery({
    queryKey: ['subtasks', taskId],
    queryFn: () => api.get<SubTask[]>(`/tasks/${taskId}/subtasks`),
    enabled: !!taskId,
  })
}

export function useCreateSubtask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { task_id: string; title: string }) =>
      api.post<SubTask>('/subtasks', data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['subtasks', vars.task_id] })
    },
  })
}

export function useUpdateSubtask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; title?: string; is_completed?: boolean; order_index?: number }) =>
      api.patch<SubTask>(`/subtasks/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subtasks'] }),
  })
}

export function useDeleteSubtask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/subtasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subtasks'] }),
  })
}
