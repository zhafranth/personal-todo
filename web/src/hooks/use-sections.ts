import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Section } from '../types'

export function useSections() {
  return useQuery({
    queryKey: ['sections'],
    queryFn: () => api.get<Section[]>('/sections'),
  })
}

export function useCreateSection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (title: string) => api.post<Section>('/sections', { title }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sections'] }),
  })
}

export function useUpdateSection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; title?: string; order_index?: number }) =>
      api.patch<Section>(`/sections/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sections'] }),
  })
}

export function useDeleteSection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/sections/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sections'] }),
  })
}
