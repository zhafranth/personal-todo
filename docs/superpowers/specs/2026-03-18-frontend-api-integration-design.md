# Frontend API Integration Design

**Date:** 2026-03-18
**Scope:** Connect React frontend to Go backend API — remove mocks, implement email/password auth UI, add 401 handling

## 1. Overview

The Go backend MVP is complete with all CRUD endpoints for sections, tasks, sub-tasks, and reminders, plus email/password JWT auth. The frontend currently uses a mock system (`VITE_USE_MOCK` + Zustand mock store) and has a Google OAuth login page. This design replaces mocks with real API calls and rewrites auth for email/password.

**Approach:** Incremental migration — modify existing files in place. The existing API client, hooks, and types already match the backend contract. Changes are minimal and focused.

## 2. API Client Changes

**File:** `web/src/api/client.ts`

### 401 Interceptor

Add to the existing `request()` function: when any response returns HTTP 401, clear token from `localStorage` and redirect to `/login` via `window.location.href`. To prevent redirect loops, skip the redirect if the current path is already `/login`.

### Auth API Functions

Add two exported functions that use raw `fetch()` (not the `api` helper) to avoid sending stale Bearer tokens on public endpoints:

- `loginUser(email: string, password: string)` → `POST /api/v1/login` → returns `{ token: string, user: User }`
- `registerUser(email: string, password: string, name: string)` → `POST /api/v1/register` → returns `{ token: string, user: User }`

These use the full path `/api/v1/login` and `/api/v1/register` directly since they bypass the `api` helper (which prepends `/api/v1` automatically).

The existing `api.get/post/patch/delete` and Bearer token logic remain unchanged — they already match the Go backend.

## 3. Auth Store Changes

**File:** `web/src/stores/auth-store.ts`

Three changes:

1. **Fix `fetchUser()` endpoint:** Change `api.get<User>('/auth/me')` → `api.get<User>('/me')` to match backend (the `api` helper prepends `/api/v1`, so the actual request goes to `GET /api/v1/me`).
2. **Remove mock mode:** Delete the `VITE_USE_MOCK` conditional that initializes with `mockUser`/`'mock-token'` and short-circuits `fetchUser()`.
3. **Add `login()` and `register()` actions:** Call the new API functions from `client.ts`, store the returned token and user in a single Zustand `set()` call to avoid intermediate renders where `token` exists but `user` is null.

Existing `setToken()`, `logout()`, and `isLoading` state remain unchanged.

## 4. Login Page Rewrite

**File:** `web/src/pages/LoginPage.tsx`

Full rewrite replacing the Google OAuth page:

- **Two tabs** at top: Login | Register
- **Login tab:** email + password fields, submit button
- **Register tab:** name + email + password fields, submit button
- **On success:** store token and user, navigate to `/`
- **On error:** inline error message below form (e.g., "Invalid credentials", "Email already registered")
- **Loading state:** disable submit button and show spinner while request is in flight to prevent double-submission
- **Styling:** keep existing gradient background

**Remove:**
- Google OAuth button and `/api/v1/auth/google/login` link
- `AuthCallback` component (no longer needed)

## 5. Hooks Cleanup

**Files:** `web/src/hooks/use-sections.ts`, `use-tasks.ts`, `use-subtasks.ts`, `use-reminders.ts`

For every hook:
- Remove `VITE_USE_MOCK` environment variable check
- Remove `useMockStore()` import and conditional branching
- Keep `api.*` calls as-is — endpoints already match the Go backend

No changes to query keys, invalidation logic, or return types.

## 6. Mock System Removal

**Delete entirely:**
- `web/src/mocks/data.ts`
- `web/src/mocks/mock-store.ts`
- `web/src/mocks/` directory

## 7. Route Changes

**File:** `web/src/App.tsx`

- Remove `/auth/callback` route
- Remove `AuthCallback` function definition (it's defined inline in `App.tsx`, not imported)
- All other routes remain: `/login`, `/`, `/tasks/:id`, `/calendar`, `/settings`
- `ProtectedRoute` guard remains unchanged

## 8. Error Handling

- **401 responses:** Global interceptor in API client clears token and redirects to `/login` (silent redirect, no toast)
- **Login/register errors:** Inline error display on the login page form
- **Other API errors:** Existing `request()` throw behavior unchanged — TanStack Query handles via `isError`/`error` states in hooks

## 9. Files Changed Summary

| Action | File |
|--------|------|
| Modify | `web/src/api/client.ts` |
| Modify | `web/src/stores/auth-store.ts` |
| Rewrite | `web/src/pages/LoginPage.tsx` |
| Modify | `web/src/hooks/use-sections.ts` |
| Modify | `web/src/hooks/use-tasks.ts` |
| Modify | `web/src/hooks/use-subtasks.ts` |
| Modify | `web/src/hooks/use-reminders.ts` |
| Modify | `web/src/App.tsx` |
| Delete | `web/src/mocks/data.ts` |
| Delete | `web/src/mocks/mock-store.ts` |
| Modify | `web/.env` (remove `VITE_USE_MOCK` line) |
