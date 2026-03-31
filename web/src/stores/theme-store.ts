import { create } from 'zustand'

interface ThemeState {
  isDark: boolean
  toggleTheme: () => void
}

const getInitialTheme = (): boolean => {
  return localStorage.getItem('theme') === 'dark'
}

const applyTheme = (isDark: boolean) => {
  if (isDark) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

export const useThemeStore = create<ThemeState>((set) => {
  const isDark = getInitialTheme()
  applyTheme(isDark)

  return {
    isDark,
    toggleTheme: () =>
      set((state) => {
        const newIsDark = !state.isDark
        localStorage.setItem('theme', newIsDark ? 'dark' : 'light')
        applyTheme(newIsDark)
        return { isDark: newIsDark }
      }),
  }
})
