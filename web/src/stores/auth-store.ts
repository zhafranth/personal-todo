import { create } from 'zustand'
import type { User } from '../types'
import { api, loginUser, registerUser } from '../api/client'

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  setToken: (token: string) => void
  fetchUser: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: !!localStorage.getItem('token'),
  setToken: (token: string) => {
    localStorage.setItem('token', token)
    set({ token })
  },
  fetchUser: async () => {
    try {
      const user = await api.get<User>('/me')
      set({ user, isLoading: false })
    } catch {
      localStorage.removeItem('token')
      set({ user: null, token: null, isLoading: false })
    }
  },
  login: async (email: string, password: string) => {
    const { token, user } = await loginUser(email, password)
    localStorage.setItem('token', token)
    set({ token, user, isLoading: false })
  },
  register: async (email: string, password: string, name: string) => {
    const { token, user } = await registerUser(email, password, name)
    localStorage.setItem('token', token)
    set({ token, user, isLoading: false })
  },
  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null })
  },
}))
