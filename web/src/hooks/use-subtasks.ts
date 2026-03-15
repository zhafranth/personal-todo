import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { useMockStore } from '../mocks/mock-store'
import type { SubTask } from '../types'

const isMock = import.meta.env.VITE_USE_MOCK === 'true'

export function useSubtasks(taskId: string) {
  const store = useMockStore()
  return useQuery({
    queryKey: ['subtasks', taskId],
    queryFn: () => isMock ? Promise.resolve(store.getSubtasks(taskId)) : api.get<SubTask[]>(`/tasks/${taskId}/subtasks`),
    enabled: !!taskId,
  })
}

export function useCreateSubtask() {
  const qc = useQueryClient()
  const store = useMockStore()
  return useMutation({
    mutationFn: (data: { task_id: string; title: string }) =>
      isMock ? Promise.resolve(store.createSubtask(data)) : api.post<SubTask>('/subtasks', data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['subtasks', vars.task_id] })
    },
  })
}

export function useUpdateSubtask() {
  const qc = useQueryClient()
  const store = useMockStore()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; title?: string; is_completed?: boolean; order_index?: number }) =>
      isMock ? Promise.resolve(store.updateSubtask(id, data)) : api.patch<SubTask>(`/subtasks/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subtasks'] }),
  })
}

export function useDeleteSubtask() {
  const qc = useQueryClient()
  const store = useMockStore()
  return useMutation({
    mutationFn: (id: string) =>
      isMock ? Promise.resolve(store.deleteSubtask(id)) : api.delete(`/subtasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subtasks'] }),
  })
}
