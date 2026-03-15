import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAuthStore } from './stores/auth-store'
import AppShell from './components/layout/AppShell'
import TasksPage from './pages/TasksPage'
import CalendarPage from './pages/CalendarPage'
import SettingsPage from './pages/SettingsPage'
import LoginPage from './pages/LoginPage'
import TaskDetail from './components/tasks/TaskDetail'

const queryClient = new QueryClient()

function AuthCallback() {
  const setToken = useAuthStore((s) => s.setToken)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (token) {
      setToken(token)
      window.location.href = '/'
    }
  }, [setToken])
  return <div className="flex h-screen items-center justify-center text-slate-500">Logging in...</div>
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuthStore()
  if (isLoading) return <div className="flex h-screen items-center justify-center text-slate-500">Loading...</div>
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const { token, fetchUser } = useAuthStore()

  useEffect(() => {
    if (token) fetchUser()
  }, [token, fetchUser])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
            <Route path="/" element={<TasksPage />} />
            <Route path="/tasks/:id" element={<TaskDetail />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
