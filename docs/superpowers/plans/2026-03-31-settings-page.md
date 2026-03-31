# Settings Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full iOS-style settings page with profile display, dark mode toggle, notification placeholder, version info, and sign-out.

**Architecture:** Single-file page (`SettingsPage.tsx`) with inline sections. Dark mode state in a Zustand store (`theme-store.ts`) persisting to `localStorage`. Tailwind v4 class-based dark mode configured in CSS.

**Tech Stack:** React, Zustand, Tailwind CSS v4, React Router

---

### Task 1: Configure Tailwind v4 class-based dark mode

**Files:**
- Modify: `web/src/index.css`

- [ ] **Step 1: Add dark mode custom variant**

In `web/src/index.css`, add the class-based dark mode variant after the tailwind import:

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));
```

This overrides Tailwind v4's default `prefers-color-scheme` dark mode to use the `.dark` class on `<html>` instead.

- [ ] **Step 2: Verify the change**

Run: `cd web && npx vite build --mode development 2>&1 | head -5`
Expected: Build succeeds without errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/index.css
git commit -m "feat(settings): configure Tailwind v4 class-based dark mode"
```

---

### Task 2: Create theme store

**Files:**
- Create: `web/src/stores/theme-store.ts`

- [ ] **Step 1: Create the Zustand theme store**

Create `web/src/stores/theme-store.ts`:

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add web/src/stores/theme-store.ts
git commit -m "feat(settings): add theme store with localStorage persistence"
```

---

### Task 3: Build the Settings page

**Files:**
- Modify: `web/src/pages/SettingsPage.tsx`

- [ ] **Step 1: Replace the placeholder SettingsPage with the full implementation**

Replace the entire contents of `web/src/pages/SettingsPage.tsx`:

```tsx
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth-store'
import { useThemeStore } from '../stores/theme-store'

function ProfileCard() {
  const { user } = useAuthStore()
  if (!user) return null

  const initial = user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4">
      {user.avatar_url ? (
        <img
          src={user.avatar_url}
          alt={user.name}
          className="size-12 rounded-full object-cover"
        />
      ) : (
        <div className="flex size-12 items-center justify-center rounded-full bg-blue-600 text-lg font-semibold text-white">
          {initial}
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-900">{user.name}</p>
        <p className="truncate text-sm text-slate-500">{user.email}</p>
      </div>
    </div>
  )
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${
        checked ? 'bg-blue-600' : 'bg-slate-200'
      }`}
    >
      <span
        className={`pointer-events-none inline-block size-5 translate-y-0.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-1.5 px-1 text-xs font-medium uppercase tracking-wider text-slate-400">
        {title}
      </h2>
      <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white">
        {children}
      </div>
    </div>
  )
}

function SettingsRow({
  label,
  right,
  className = '',
}: {
  label: string
  right: React.ReactNode
  className?: string
}) {
  return (
    <div className={`flex items-center justify-between px-4 py-3.5 ${className}`}>
      <span className="text-sm text-slate-900">{label}</span>
      {right}
    </div>
  )
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const { logout } = useAuthStore()
  const { isDark, toggleTheme } = useThemeStore()

  const handleSignOut = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>

      <div className="mt-6 space-y-6">
        <ProfileCard />

        <SettingsGroup title="Appearance">
          <SettingsRow
            label="Dark Mode"
            right={<ToggleSwitch checked={isDark} onChange={toggleTheme} />}
          />
        </SettingsGroup>

        <SettingsGroup title="Notifications">
          <SettingsRow
            label="Push Notifications"
            right={<span className="text-xs text-slate-400">Coming soon</span>}
            className="opacity-50"
          />
        </SettingsGroup>

        <SettingsGroup title="About">
          <SettingsRow
            label="Version"
            right={<span className="text-sm text-slate-400">1.0.0</span>}
          />
        </SettingsGroup>

        <button
          onClick={handleSignOut}
          className="w-full rounded-xl border border-slate-200 bg-white py-3.5 text-sm font-medium text-red-500 transition-colors active:bg-slate-50"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify the page renders**

Run: `cd web && npx vite build --mode development 2>&1 | head -5`
Expected: Build succeeds without errors.

- [ ] **Step 3: Manual verification**

Start the dev server (`npm run dev` in `web/`) and navigate to `/settings`. Verify:
- Profile card shows user avatar/initials, name, email
- Dark Mode toggle switches on/off and adds/removes `dark` class on `<html>`
- Notifications row appears dimmed with "Coming soon"
- Version shows "1.0.0"
- Sign Out button logs out and redirects to `/login`

- [ ] **Step 4: Commit**

```bash
git add web/src/pages/SettingsPage.tsx
git commit -m "feat(settings): build full settings page with profile, dark mode, and sign-out"
```
