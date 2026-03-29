import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Task } from '../types'

export function useCalendarTasks(start: string, end: string) {
  return useQuery({
    queryKey: ['calendar-tasks', start, end],
    queryFn: () => api.get<Task[]>(`/tasks/calendar?start=${start}&end=${end}`),
    enabled: !!start && !!end,
  })
}
