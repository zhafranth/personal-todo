# Settings Page — Design Spec

## Overview

Full settings page for the Personal Todo PWA with iOS-style grouped list layout. Frontend-only implementation (no new backend endpoints). Includes profile display, dark mode toggle, notification placeholder, app version, and sign-out.

## Approach

Single-file page (`SettingsPage.tsx`) with all sections inline. Dark mode state managed by a small Zustand store (`theme-store.ts`) persisting to `localStorage`.

## Page Structure

### 1. Profile Card

Top-level card displaying the authenticated user's info from `useAuthStore`.

- White `rounded-2xl` card with `border border-slate-200`
- Avatar: 48px circle. If `avatar_url` exists, show image. Otherwise, blue-600 circle with white initials (first letter of name, uppercase)
- Name: `font-semibold text-slate-900`
- Email: `text-sm text-slate-500`
- Layout: flex row, avatar on left, name+email stacked on right

### 2. Appearance Group

Group header: "APPEARANCE" — uppercase `text-xs font-medium text-slate-400 tracking-wider`

Single row:
- Label: "Dark Mode" on the left
- Control: Custom toggle switch on the right
- Reads/writes from `useThemeStore`

### 3. Notifications Group (Placeholder)

Group header: "NOTIFICATIONS"

Single row:
- Label: "Push Notifications" on the left
- Right side: "Coming soon" in `text-xs text-slate-400`
- Row styled with reduced opacity (`opacity-50`) to indicate disabled state

### 4. About Group

Group header: "ABOUT"

Single row:
- Label: "Version" on the left
- Value: "1.0.0" in `text-sm text-slate-400` on the right

### 5. Sign Out Button

- Full-width `rounded-xl` button below all groups
- `text-red-500 bg-white border border-slate-200`
- Centered text: "Sign Out"
- On click: calls `authStore.logout()` and navigates to `/login`

## Visual Style

### Group Cards

- White background, `rounded-xl`, `border border-slate-100`
- Rows inside: `px-4 py-3.5`, separated by `divide-y divide-slate-100`
- Each row: flex row, justify-between, items-center

### Group Headers

- `text-xs font-medium text-slate-400 uppercase tracking-wider`
- `px-1 mb-1.5`

### Toggle Switch

Custom CSS toggle, no external library:
- Dimensions: 44x24px pill shape
- On state: `bg-blue-600` with white circle translated right
- Off state: `bg-slate-200` with white circle on left
- Circle: 20px, white, with `transition-transform duration-200`
- Accessible: rendered as a `<button>` with `role="switch"` and `aria-checked`

### Overall Layout

- Page title: "Settings" — `text-2xl font-bold tracking-tight text-slate-900`
- `space-y-6` between all sections
- `mt-6` after page title before profile card

## Dark Mode Store

### File: `stores/theme-store.ts`

Zustand store:

```typescript
interface ThemeState {
  isDark: boolean
  toggleTheme: () => void
}
```

Behavior:
- Initializes by reading `localStorage.getItem('theme')` — defaults to `'light'`
- `toggleTheme()` flips `isDark`, writes `'dark'` or `'light'` to `localStorage`, and adds/removes `dark` class on `document.documentElement`
- On store creation, applies the initial theme class to `document.documentElement`

### Tailwind Config

Set `darkMode: 'class'` in `tailwind.config.js` to enable `dark:` variant utility classes.

## Scope Boundaries

**In scope:**
- Settings page UI (all 5 sections above)
- Theme store with localStorage persistence
- Tailwind `darkMode: 'class'` config
- Toggle mechanism that adds/removes `dark` class on `<html>`

**Out of scope:**
- Applying `dark:` styles to existing pages (Tasks, Calendar, Notes, AppShell, BottomNav, LoginPage) — that is a separate effort
- Backend settings API
- Actual push notification subscription logic
- Profile editing
