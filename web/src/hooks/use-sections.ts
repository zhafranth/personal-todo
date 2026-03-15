import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { useMockStore } from '../mocks/mock-store'
import type { Section } from '../types'

const isMock = import.meta.env.VITE_USE_MOCK === 'true'

export function useSections() {
  const store = useMockStore()
  return useQuery({
    queryKey: ['sections'],
    queryFn: () => isMock ? Promise.resolve(store.getSections()) : api.get<Section[]>('/sections'),
  })
}

export function useCreateSection() {
  const qc = useQueryClient()
  const store = useMockStore()
  return useMutation({
    mutationFn: (title: string) =>
      isMock ? Promise.resolve(store.createSection(title)) : api.post<Section>('/sections', { title }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sections'] }),
  })
}

export function useUpdateSection() {
  const qc = useQueryClient()
  const store = useMockStore()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; title?: string; order_index?: number }) =>
      isMock ? Promise.resolve(store.updateSection(id, data)) : api.patch<Section>(`/sections/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sections'] }),
  })
}

export function useDeleteSection() {
  const qc = useQueryClient()
  const store = useMockStore()
  return useMutation({
    mutationFn: (id: string) =>
      isMock ? Promise.resolve(store.deleteSection(id)) : api.delete(`/sections/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sections'] }),
  })
}
