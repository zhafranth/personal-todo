import { create } from 'zustand'
import type { User } from '../types'
import { api } from '../api/client'
import { mockUser } from '../mocks/data'

const isMock = import.meta.env.VITE_USE_MOCK === 'true'

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  setToken: (token: string) => void
  fetchUser: () => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: isMock ? mockUser : null,
  token: isMock ? 'mock-token' : localStorage.getItem('token'),
  isLoading: isMock ? false : true,
  setToken: (token: string) => {
    localStorage.setItem('token', token)
    set({ token })
  },
  fetchUser: async () => {
    if (isMock) {
      set({ user: mockUser, isLoading: false })
      return
    }
    try {
      const user = await api.get<User>('/auth/me')
      set({ user, isLoading: false })
    } catch {
      localStorage.removeItem('token')
      set({ user: null, token: null, isLoading: false })
    }
  },
  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null })
  },
}))
