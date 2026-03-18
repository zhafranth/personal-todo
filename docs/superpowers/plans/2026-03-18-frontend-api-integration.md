# Frontend API Integration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the React frontend to the Go backend API by removing mock data, implementing email/password auth, and adding global 401 handling.

**Architecture:** Incremental migration of existing files. The API client, hooks, and types already match the backend contract — we add a 401 interceptor and auth functions to the client, rewrite auth store and login page for email/password, strip mock branching from hooks, and delete the mock system.

**Tech Stack:** React, TanStack Query, Zustand, Tailwind CSS, Vite

**Spec:** `docs/superpowers/specs/2026-03-18-frontend-api-integration-design.md`

---

## Chunk 1: API Client & Auth Foundation

### Task 1: Add 401 interceptor and auth API functions to client

**Files:**
- Modify: `web/src/api/client.ts`

**Context:** The API client is a simple fetch wrapper at `web/src/api/client.ts`. It has a `request()` function that prepends `/api/v1`, attaches Bearer token from localStorage, and handles errors. We need to add: (1) a 401 interceptor that clears token and redirects to `/login`, and (2) two auth functions (`loginUser`, `registerUser`) that use raw `fetch()` to bypass the Bearer token logic.

- [ ] **Step 1: Add 401 interceptor to `request()` function**

In `web/src/api/client.ts`, modify the `request()` function. After `const res = await fetch(...)`, before the `if (!res.ok)` check, add the 401 check:

```typescript
const API_BASE = '/api/v1'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token')
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })
  if (res.status === 401) {
    localStorage.removeItem('token')
    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}
```

Key details:
- Check `res.status === 401` **before** the generic `!res.ok` handler (401 is also not-ok, so order matters)
- Skip redirect if already on `/login` to prevent loops
- Still throw an error so any calling code gets a rejected promise

- [ ] **Step 2: Add `loginUser` and `registerUser` functions**

Add these after the `api` export in `web/src/api/client.ts`. These use raw `fetch()` to avoid sending stale Bearer tokens:

```typescript
import type { User } from '../types'

interface AuthResponse {
  token: string
  user: User
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}

export async function registerUser(email: string, password: string, name: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}
```

- [ ] **Step 3: Verify the file compiles**

Run: `cd web && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors in `client.ts` (there may be errors in other files due to mocks — those will be fixed in later tasks)

- [ ] **Step 4: Commit**

```bash
git add web/src/api/client.ts
git commit -m "feat(web): add 401 interceptor and auth API functions to client"
```

---

### Task 2: Rewrite auth store for email/password

**Files:**
- Modify: `web/src/stores/auth-store.ts`

**Context:** The auth store at `web/src/stores/auth-store.ts` is a Zustand store with `user`, `token`, `isLoading` state. Currently imports `mockUser` and has `VITE_USE_MOCK` conditional branching. We need to: (1) remove all mock code, (2) fix the `fetchUser` endpoint from `/auth/me` to `/me`, (3) add `login()` and `register()` actions that call the new API functions and set token + user in a single `set()` call.

- [ ] **Step 1: Rewrite `web/src/stores/auth-store.ts`**

Replace the entire file with:

```typescript
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
```

Key details:
- `login()` and `register()` set token and user in a single `set()` call — avoids intermediate renders
- `login()` and `register()` do NOT catch errors — they let them propagate to the caller (LoginPage) for inline error display
- `fetchUser()` now calls `/me` (the `api` helper prepends `/api/v1`)
- `isLoading` starts as `!!localStorage.getItem('token')` — only show loading spinner if there's a token to validate. No token → `isLoading: false` → `ProtectedRoute` redirects immediately. Has token → `isLoading: true` → waits for `fetchUser()`.

- [ ] **Step 2: Verify the file compiles**

Run: `cd web && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors in `auth-store.ts`

- [ ] **Step 3: Commit**

```bash
git add web/src/stores/auth-store.ts
git commit -m "feat(web): rewrite auth store for email/password auth"
```

---

## Chunk 2: Login Page & Route Cleanup

### Task 3: Rewrite login page with email/password tabs

**Files:**
- Rewrite: `web/src/pages/LoginPage.tsx`

**Context:** The login page at `web/src/pages/LoginPage.tsx` currently shows a Google OAuth button. We need to replace it with an email/password form with Login/Register tabs. The auth store now has `login()` and `register()` actions. On success, navigate to `/`. On error, show inline error message. Disable submit button during request.

- [ ] **Step 1: Rewrite `web/src/pages/LoginPage.tsx`**

Replace the entire file with:

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth-store'

type Tab = 'login' | 'register'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, register } = useAuthStore()
  const [tab, setTab] = useState<Tab>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (tab === 'login') {
        await login(email, password)
      } else {
        await register(email, password, name)
      }
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const switchTab = (newTab: Tab) => {
    setTab(newTab)
    setError('')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white px-6">
      <div className="mb-8 flex flex-col items-center">
        <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/25">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-8">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Personal Todo</h1>
        <p className="mt-2 text-center text-sm leading-relaxed text-slate-500">
          Organize your tasks, set reminders,<br />and stay on top of your day.
        </p>
      </div>

      <div className="w-full max-w-xs">
        <div className="mb-6 flex rounded-lg bg-slate-100 p-1">
          <button
            onClick={() => switchTab('login')}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
              tab === 'login'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => switchTab('register')}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
              tab === 'register'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500'
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {tab === 'register' && (
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />

          {error && (
            <p className="text-center text-xs text-red-500">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-medium text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {tab === 'login' ? 'Signing in...' : 'Creating account...'}
              </span>
            ) : (
              tab === 'login' ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>
      </div>

      <p className="mt-8 text-xs text-slate-400">
        Your data stays private and secure.
      </p>
    </div>
  )
}
```

Key details:
- Two tabs with pill-style toggle (matches existing Tailwind patterns)
- Name field only appears on Register tab
- `loading` state disables submit and shows spinner
- Error message displayed inline below password field
- Preserves the gradient background and branding from original
- Uses `navigate('/', { replace: true })` to avoid back-button returning to login
- `minLength={6}` on password for basic client-side validation

- [ ] **Step 2: Verify the file compiles**

Run: `cd web && npx tsc --noEmit --pretty 2>&1 | grep -i "LoginPage\|error" | head -10`
Expected: No errors in `LoginPage.tsx`

- [ ] **Step 3: Commit**

```bash
git add web/src/pages/LoginPage.tsx
git commit -m "feat(web): rewrite login page with email/password tabs"
```

---

### Task 4: Remove AuthCallback and OAuth route from App.tsx

**Files:**
- Modify: `web/src/App.tsx`

**Context:** `App.tsx` has an inline `AuthCallback` function (lines 14-25) and a route for `/auth/callback` (line 46). Both are for Google OAuth and are no longer needed. Remove them, keep everything else.

- [ ] **Step 1: Remove `AuthCallback` function and its route**

In `web/src/App.tsx`:

1. Delete the `AuthCallback` function (lines 14-25)
2. Delete the route `<Route path="/auth/callback" element={<AuthCallback />} />` (line 46)

The file should become:

```tsx
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
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd web && npx tsc --noEmit --pretty 2>&1 | grep -i "App.tsx\|error" | head -10`
Expected: No errors in `App.tsx`

- [ ] **Step 3: Commit**

```bash
git add web/src/App.tsx
git commit -m "refactor(web): remove OAuth callback route from App"
```

---

## Chunk 3: Hooks Cleanup & Mock Removal

### Task 5: Strip mock branching from use-sections hook

**Files:**
- Modify: `web/src/hooks/use-sections.ts`

**Context:** Each hook file imports `useMockStore` and has `isMock` conditional branching. We need to remove all mock references and keep only the `api.*` calls. The `api.*` paths already match the backend.

- [ ] **Step 1: Rewrite `web/src/hooks/use-sections.ts`**

Replace the entire file with:

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add web/src/hooks/use-sections.ts
git commit -m "refactor(web): remove mock branching from sections hook"
```

---

### Task 6: Strip mock branching from use-tasks hook

**Files:**
- Modify: `web/src/hooks/use-tasks.ts`

- [ ] **Step 1: Rewrite `web/src/hooks/use-tasks.ts`**

Replace the entire file with:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Task } from '../types'

export function useTasks(sectionId: string) {
  return useQuery({
    queryKey: ['tasks', sectionId],
    queryFn: () => api.get<Task[]>(`/sections/${sectionId}/tasks`),
    enabled: !!sectionId,
  })
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ['task', id],
    queryFn: () => api.get<Task>(`/tasks/${id}`),
    enabled: !!id,
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { section_id: string; title: string; description?: string; due_date?: string; priority?: string }) =>
      api.post<Task>('/tasks', data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['tasks', vars.section_id] })
    },
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; title?: string; description?: string; due_date?: string; priority?: string; is_completed?: boolean; order_index?: number; section_id?: string }) =>
      api.patch<Task>(`/tasks/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['task'] })
    },
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/hooks/use-tasks.ts
git commit -m "refactor(web): remove mock branching from tasks hook"
```

---

### Task 7: Strip mock branching from use-subtasks and use-reminders hooks

**Files:**
- Modify: `web/src/hooks/use-subtasks.ts`
- Modify: `web/src/hooks/use-reminders.ts`

- [ ] **Step 1: Rewrite `web/src/hooks/use-subtasks.ts`**

Replace the entire file with:

```typescript
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
```

- [ ] **Step 2: Rewrite `web/src/hooks/use-reminders.ts`**

Replace the entire file with:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Reminder } from '../types'

export function useReminders(taskId: string) {
  return useQuery({
    queryKey: ['reminders', taskId],
    queryFn: () => api.get<Reminder[]>(`/tasks/${taskId}/reminders`),
    enabled: !!taskId,
  })
}

export function useCreateReminder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { task_id: string; remind_at: string }) =>
      api.post<Reminder>('/reminders', data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['reminders', vars.task_id] })
    },
  })
}

export function useDeleteReminder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/reminders/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reminders'] }),
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add web/src/hooks/use-subtasks.ts web/src/hooks/use-reminders.ts
git commit -m "refactor(web): remove mock branching from subtasks and reminders hooks"
```

---

### Task 8: Delete mock system and clean up env

**Files:**
- Delete: `web/src/mocks/data.ts`
- Delete: `web/src/mocks/mock-store.ts`
- Delete: `web/src/mocks/` directory
- Modify: `web/.env`

- [ ] **Step 1: Delete mock files and directory**

```bash
rm web/src/mocks/data.ts web/src/mocks/mock-store.ts
rmdir web/src/mocks
```

- [ ] **Step 2: Remove `VITE_USE_MOCK` from `web/.env`**

Delete the `VITE_USE_MOCK=true` line from `web/.env`. If it's the only line, delete the file entirely.

Current content of `web/.env`:
```
VITE_USE_MOCK=true
```

Since this is the only line, delete the file:

```bash
rm web/.env
```

- [ ] **Step 3: Verify full project compiles**

Run: `cd web && npx tsc --noEmit --pretty`
Expected: No TypeScript errors. All mock imports have been removed in previous tasks.

- [ ] **Step 4: Commit**

```bash
git add -A web/src/mocks/ web/.env
git commit -m "chore(web): remove mock system and VITE_USE_MOCK env var"
```

---

## Chunk 4: Verification

### Task 9: End-to-end smoke test

**Files:** None (testing only)

**Context:** The Go backend should be running on `localhost:8080` and the Vite dev server on its default port. The Vite proxy forwards `/api` to the Go backend. Test the full flow: register → login → view sections → create task.

**Prerequisites:**
- PostgreSQL running with `personal_todo` database
- Go server running: `cd server && DATABASE_URL="postgres://zhafrantharif@localhost:5432/personal_todo?sslmode=disable" JWT_SECRET="dev-secret-key" go run ./cmd/server`
- Vite dev server running: `cd web && npm run dev`

- [ ] **Step 1: Start the Go server** (if not already running)

```bash
cd server && DATABASE_URL="postgres://zhafrantharif@localhost:5432/personal_todo?sslmode=disable" JWT_SECRET="dev-secret-key" go run ./cmd/server &
```

- [ ] **Step 2: Start the Vite dev server** (if not already running)

```bash
cd web && npm run dev &
```

- [ ] **Step 3: Open the app in browser**

Open `http://localhost:5173` (or whatever port Vite reports).

Expected behavior:
1. Should redirect to `/login` (no token in localStorage)
2. Should show Login/Register tabs
3. Switch to Register tab → fill in name, email, password → submit
4. Should redirect to home page `/`
5. Should see empty sections list (fresh database)
6. Logout → should return to `/login`
7. Login with same credentials → should return to home page

- [ ] **Step 4: Verify 401 handling**

1. Login successfully
2. Open browser devtools → Application → Local Storage
3. Modify the `token` value to `invalid-token`
4. Refresh the page
5. Should redirect to `/login` (the `fetchUser()` call gets 401, interceptor clears token and redirects)
