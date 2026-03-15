# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal Todo & Reminder PWA — a mobile-first productivity app combining hierarchical task management (Sections → Tasks → Sub-tasks) with reminders and a calendar view. Supports push notifications via Web Push API.

## Tech Stack

- **Frontend**: Vite + React, Zustand (state), TanStack Query (data fetching), Tailwind CSS
- **Backend**: Go (Golang) — REST API, reminder logic, OAuth integration
- **Database**: PostgreSQL with raw SQL via `pgx` (no ORM)
- **Auth**: Google OAuth 2.0
- **PWA**: Service Workers for installability and push notifications
- **Deployment**: Self-hosted VPS

## Architecture

### Data Model (PostgreSQL)

Six tables: `users`, `sections`, `tasks`, `sub_tasks`, `reminders`, `push_subscriptions`. All use UUID primary keys and TIMESTAMPTZ for timestamps. Tasks have a hierarchical structure: User → Sections → Tasks → Sub-tasks. Reminders are stored separately from tasks (one task can have multiple reminders). Push subscriptions are per-device per-user.

### Frontend

SPA with mobile-first responsive design. Bottom navigation (Tasks, Calendar, Settings), FAB for quick task creation, swipe gestures for task actions. Calendar view uses a monthly grid with task indicators.

### Backend

Go server handling CRUD for sections/tasks/sub-tasks, reminder scheduling and push notification delivery, and OAuth authentication flow.

## Development Commands

_To be filled once project scaffolding is set up._

## Language

The PRD is written in Indonesian (Bahasa Indonesia). Code, commits, and technical documentation should be in English.
