# TODO — Personal Todo & Reminder PWA

## Fase 1: Core Backend & Mobile UI

- [ ] **[BE] Setup Go server with Google OAuth 2.0**
  - Initialize Go module and project structure (cmd, internal, config, middleware)
  - Implement Google OAuth 2.0 authentication flow
  - JWT/session management
  - Database connection setup with pgx
  - Run PostgreSQL schema migrations (users, sections, tasks, sub_tasks, reminders, push_subscriptions)

- [ ] **[BE] CRUD API for Sections, Tasks, and Sub-tasks** _(blocked by: Go server setup)_
  - Sections: Create, Read (list + detail), Update, Delete, Reorder
  - Tasks: Create, Read (list + detail), Update, Delete, Reorder, Toggle completion
  - Sub-tasks: Create, Read, Update, Delete, Toggle completion
  - Auth middleware on all endpoints
  - Proper error handling and validation

- [ ] **[FE] Verify and complete swipe actions on task list**
  - Swipe left to delete task
  - Swipe right to mark task complete
  - Smooth animations and mobile-friendly UX

- [ ] **[FE] Connect frontend to real backend API (remove mocks)** _(blocked by: Go server + CRUD API)_
  - Update api/client.ts with proper base URL and auth headers
  - Wire up TanStack Query hooks to real endpoints
  - Remove mock data from web/src/mocks/
  - Handle auth flow (redirect to OAuth, store token)

## Fase 2: PWA & Notification Engine

- [ ] **[FE] Implement Service Worker for PWA installability**
  - Register Service Worker
  - Configure manifest.json (icons, theme, display mode)
  - Implement offline caching strategy
  - Add install prompt UI

- [ ] **[BE] Web Push API integration for reminders** _(blocked by: Go server + CRUD API)_
  - VAPID key generation and management
  - Push subscription CRUD endpoints
  - Reminder scheduling logic (cron or background worker)
  - Send push notifications at reminder times

- [ ] **[FE] Push notification subscription and permission UI** _(blocked by: Service Worker + Push API backend)_
  - Request notification permission from user
  - Subscribe to push via Service Worker
  - Send subscription to backend API
  - Manage subscription state in Settings page

## Fase 3: Calendar View & Responsive Layout

- [ ] **[FE] Calendar view — task indicators and daily detail**
  - Monthly grid with task indicator dots
  - Click date to show daily task list (bottom sheet on mobile)
  - Navigate between months
  - Highlight today and dates with due tasks

- [ ] **[FE] Tablet and Desktop responsive layout**
  - Sidebar navigation instead of bottom nav on tablet/desktop
  - Multi-column layout for task list + detail view
  - Calendar view optimized for larger screens
  - Responsive breakpoints with Tailwind

## Fase 4: Recurring Tasks & Enhancements

- [ ] **[BE][FE] Recurring tasks system** _(blocked by: Go server + CRUD API)_
  - Backend: recurring rule storage (daily, weekly, monthly, custom)
  - Backend: background job to generate task instances
  - Frontend: UI for setting recurrence on a task
  - Frontend: display recurring indicator on task list

## General

- [ ] _Add non-development tasks here as needed (design decisions, documentation, deployment, etc.)_
