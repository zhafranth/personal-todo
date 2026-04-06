# Phase 2: PWA & Push Notifications — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add PWA installability with Service Worker caching and push notification delivery for reminders.

**Architecture:** `vite-plugin-pwa` with `injectManifest` mode provides SW precaching and runtime caching. Custom SW handles push events. Backend uses `webpush-go` to send notifications when the scheduler processes due reminders. New `push_subscriptions` table stores per-device subscriptions.

**Tech Stack:** vite-plugin-pwa, Workbox (injectManifest), webpush-go, Web Push API, Notification API

---

## File Structure

### Backend — New Files
- `server/migrations/009_create_push_subscriptions.sql` — push subscription table
- `server/internal/model/push_subscription.go` — PushSubscription struct
- `server/internal/repository/push_subscription.go` — CRUD for push subscriptions
- `server/internal/handler/push_subscription.go` — HTTP handlers for subscription endpoints

### Backend — Modified Files
- `server/internal/config/config.go` — add VAPID env vars
- `server/internal/scheduler/scheduler.go` — inject push delivery into tick()
- `server/internal/repository/reminder.go` — update ListPendingDue to include task title + user_id
- `server/cmd/server/main.go` — wire up new repo, handler, routes, pass deps to scheduler
- `server/go.mod` / `server/go.sum` — add webpush-go dependency

### Frontend — New Files
- `web/src/sw.ts` — custom service worker (precaching + push handler)
- `web/src/hooks/use-push-notification.ts` — push subscription lifecycle hook

### Frontend — Modified Files
- `web/vite.config.ts` — add vite-plugin-pwa with injectManifest config
- `web/package.json` — add vite-plugin-pwa dependency
- `web/src/api/client.ts` — add push subscription API calls
- `web/src/types/index.ts` — add PushSubscription type
- `web/src/pages/SettingsPage.tsx` — install button + push notification toggle

### Frontend — Deleted Files
- `web/public/manifest.json` — manifest moves to vite-plugin-pwa config

---

## Task 1: Database Migration — Push Subscriptions Table

**Files:**
- Create: `server/migrations/009_create_push_subscriptions.sql`

- [ ] **Step 1: Create migration file**

```sql
CREATE TABLE push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_push_sub_user_endpoint ON push_subscriptions(user_id, endpoint);
```

- [ ] **Step 2: Run migration**

Run: `psql $DATABASE_URL -f server/migrations/009_create_push_subscriptions.sql`
Expected: CREATE TABLE, CREATE INDEX — no errors.

- [ ] **Step 3: Commit**

```bash
git add server/migrations/009_create_push_subscriptions.sql
git commit -m "feat: add push_subscriptions table migration"
```

---

## Task 2: Backend Config — VAPID Environment Variables

**Files:**
- Modify: `server/internal/config/config.go`

- [ ] **Step 1: Add VAPID fields to Config struct and Load()**

In `server/internal/config/config.go`, add three fields to the `Config` struct:

```go
type Config struct {
	Port           string
	DBHost         string
	DBPort         string
	DBUsername     string
	DBPassword     string
	DBName         string
	JWTSecret      string
	AllowedOrigins []string
	VAPIDPublicKey  string
	VAPIDPrivateKey string
	VAPIDSubject    string
}
```

In `Load()`, add after the `origins` block:

```go
	return Config{
		Port:            port,
		DBHost:          dbHost,
		DBPort:          dbPort,
		DBUsername:      os.Getenv("DB_USERNAME"),
		DBPassword:      os.Getenv("DB_PASSWORD"),
		DBName:          os.Getenv("DB_NAME"),
		JWTSecret:       os.Getenv("JWT_SECRET"),
		AllowedOrigins:  origins,
		VAPIDPublicKey:  os.Getenv("VAPID_PUBLIC_KEY"),
		VAPIDPrivateKey: os.Getenv("VAPID_PRIVATE_KEY"),
		VAPIDSubject:    os.Getenv("VAPID_SUBJECT"),
	}
```

- [ ] **Step 2: Verify build**

Run: `cd server && go build ./...`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add server/internal/config/config.go
git commit -m "feat: add VAPID config env vars"
```

---

## Task 3: Backend Model & Repository — Push Subscriptions

**Files:**
- Create: `server/internal/model/push_subscription.go`
- Create: `server/internal/repository/push_subscription.go`

- [ ] **Step 1: Create PushSubscription model**

Create `server/internal/model/push_subscription.go`:

```go
package model

import "time"

type PushSubscription struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Endpoint  string    `json:"endpoint"`
	P256dh    string    `json:"p256dh"`
	Auth      string    `json:"auth"`
	CreatedAt time.Time `json:"created_at"`
}
```

- [ ] **Step 2: Create PushSubscriptionRepo**

Create `server/internal/repository/push_subscription.go`:

```go
package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/zhafrantharif/personal-todo/server/internal/model"
)

type PushSubscriptionRepo struct {
	pool *pgxpool.Pool
}

func NewPushSubscriptionRepo(pool *pgxpool.Pool) *PushSubscriptionRepo {
	return &PushSubscriptionRepo{pool: pool}
}

func (r *PushSubscriptionRepo) Create(ctx context.Context, userID, endpoint, p256dh, auth string) (*model.PushSubscription, error) {
	var ps model.PushSubscription
	err := r.pool.QueryRow(ctx,
		`INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
		 VALUES ($1, $2, $3, $4)
		 ON CONFLICT (user_id, endpoint) DO UPDATE SET p256dh = $3, auth = $4
		 RETURNING id, user_id, endpoint, p256dh, auth, created_at`,
		userID, endpoint, p256dh, auth,
	).Scan(&ps.ID, &ps.UserID, &ps.Endpoint, &ps.P256dh, &ps.Auth, &ps.CreatedAt)
	return &ps, err
}

func (r *PushSubscriptionRepo) Delete(ctx context.Context, id, userID string) error {
	tag, err := r.pool.Exec(ctx,
		`DELETE FROM push_subscriptions WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *PushSubscriptionRepo) DeleteByEndpoint(ctx context.Context, endpoint string) error {
	_, err := r.pool.Exec(ctx,
		`DELETE FROM push_subscriptions WHERE endpoint = $1`, endpoint)
	return err
}

func (r *PushSubscriptionRepo) ListByUser(ctx context.Context, userID string) ([]model.PushSubscription, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, user_id, endpoint, p256dh, auth, created_at
		 FROM push_subscriptions
		 WHERE user_id = $1
		 ORDER BY created_at`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var subs []model.PushSubscription
	for rows.Next() {
		var ps model.PushSubscription
		if err := rows.Scan(&ps.ID, &ps.UserID, &ps.Endpoint, &ps.P256dh, &ps.Auth, &ps.CreatedAt); err != nil {
			return nil, err
		}
		subs = append(subs, ps)
	}
	if subs == nil {
		subs = []model.PushSubscription{}
	}
	return subs, rows.Err()
}
```

- [ ] **Step 3: Verify build**

Run: `cd server && go build ./...`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add server/internal/model/push_subscription.go server/internal/repository/push_subscription.go
git commit -m "feat: add push subscription model and repository"
```

---

## Task 4: Backend Handler — Push Subscription Endpoints

**Files:**
- Create: `server/internal/handler/push_subscription.go`

- [ ] **Step 1: Create PushSubscriptionHandler**

Create `server/internal/handler/push_subscription.go`:

```go
package handler

import (
	"errors"
	"net/http"

	"github.com/zhafrantharif/personal-todo/server/internal/config"
	"github.com/zhafrantharif/personal-todo/server/internal/middleware"
	"github.com/zhafrantharif/personal-todo/server/internal/repository"
)

type PushSubscriptionHandler struct {
	subs *repository.PushSubscriptionRepo
	cfg  config.Config
}

func NewPushSubscriptionHandler(subs *repository.PushSubscriptionRepo, cfg config.Config) *PushSubscriptionHandler {
	return &PushSubscriptionHandler{subs: subs, cfg: cfg}
}

func (h *PushSubscriptionHandler) VAPIDKey(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{
		"publicKey": h.cfg.VAPIDPublicKey,
	})
}

type createPushSubRequest struct {
	Endpoint string `json:"endpoint"`
	Keys     struct {
		P256dh string `json:"p256dh"`
		Auth   string `json:"auth"`
	} `json:"keys"`
}

func (h *PushSubscriptionHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	var req createPushSubRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Endpoint == "" || req.Keys.P256dh == "" || req.Keys.Auth == "" {
		writeError(w, http.StatusBadRequest, "endpoint, keys.p256dh, and keys.auth are required")
		return
	}

	sub, err := h.subs.Create(r.Context(), userID, req.Endpoint, req.Keys.P256dh, req.Keys.Auth)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save subscription")
		return
	}
	writeJSON(w, http.StatusCreated, sub)
}

func (h *PushSubscriptionHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := r.PathValue("id")
	err := h.subs.Delete(r.Context(), id, userID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "subscription not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to delete subscription")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
```

- [ ] **Step 2: Verify build**

Run: `cd server && go build ./...`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add server/internal/handler/push_subscription.go
git commit -m "feat: add push subscription HTTP handler"
```

---

## Task 5: Backend — Update Reminder Query for Push Delivery

**Files:**
- Modify: `server/internal/repository/reminder.go`

The scheduler needs the task title and user_id to send push notifications. Update `ListPendingDue` to join tasks and sections.

- [ ] **Step 1: Add PendingReminder struct to model**

Add to `server/internal/model/reminder.go`:

```go
// PendingReminder extends Reminder with task context needed for push delivery.
type PendingReminder struct {
	Reminder
	TaskTitle string `json:"task_title"`
	UserID    string `json:"user_id"`
}
```

- [ ] **Step 2: Update ListPendingDue in repository**

In `server/internal/repository/reminder.go`, change the `ListPendingDue` method signature and query:

```go
func (r *ReminderRepo) ListPendingDue(ctx context.Context, before time.Time) ([]model.PendingReminder, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT rm.id, rm.task_id, rm.remind_at, rm.is_sent, rm.recurrence_rule, rm.created_at,
		        t.title, s.user_id
		 FROM reminders rm
		 JOIN tasks t ON t.id = rm.task_id
		 JOIN sections s ON s.id = t.section_id
		 WHERE rm.is_sent = FALSE AND rm.remind_at <= $1
		 ORDER BY rm.remind_at`, before)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reminders []model.PendingReminder
	for rows.Next() {
		var rm model.PendingReminder
		if err := rows.Scan(&rm.ID, &rm.TaskID, &rm.RemindAt, &rm.IsSent, &rm.RecurrenceRule, &rm.CreatedAt,
			&rm.TaskTitle, &rm.UserID); err != nil {
			return nil, err
		}
		reminders = append(reminders, rm)
	}
	return reminders, rows.Err()
}
```

- [ ] **Step 3: Update scheduler to use PendingReminder**

In `server/internal/scheduler/scheduler.go`, update `tick()` — the `rm` variable is now `model.PendingReminder` instead of `model.Reminder`. The existing log line already references `rm.TaskID` so it still compiles. No functional change yet — push delivery comes in Task 6.

- [ ] **Step 4: Verify build**

Run: `cd server && go build ./...`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add server/internal/model/reminder.go server/internal/repository/reminder.go server/internal/scheduler/scheduler.go
git commit -m "feat: include task title and user_id in pending reminder query"
```

---

## Task 6: Backend — Add webpush-go and Push Delivery in Scheduler

**Files:**
- Modify: `server/go.mod` (via go get)
- Modify: `server/internal/scheduler/scheduler.go`
- Modify: `server/cmd/server/main.go`

- [ ] **Step 1: Add webpush-go dependency**

Run: `cd server && go get github.com/SherClockHolmes/webpush-go`
Expected: `go.mod` and `go.sum` updated.

- [ ] **Step 2: Update Scheduler struct to include push dependencies**

Replace the full `server/internal/scheduler/scheduler.go` with:

```go
package scheduler

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	webpush "github.com/SherClockHolmes/webpush-go"
	"github.com/zhafrantharif/personal-todo/server/internal/repository"
)

type VAPIDConfig struct {
	PublicKey  string
	PrivateKey string
	Subject    string
}

type Scheduler struct {
	reminders *repository.ReminderRepo
	pushSubs  *repository.PushSubscriptionRepo
	vapid     VAPIDConfig
	interval  time.Duration
}

func New(reminders *repository.ReminderRepo, pushSubs *repository.PushSubscriptionRepo, vapid VAPIDConfig) *Scheduler {
	return &Scheduler{
		reminders: reminders,
		pushSubs:  pushSubs,
		vapid:     vapid,
		interval:  60 * time.Second,
	}
}

func (s *Scheduler) Start(ctx context.Context) {
	ticker := time.NewTicker(s.interval)
	defer ticker.Stop()

	log.Println("[scheduler] started, checking every", s.interval)
	s.tick(ctx)

	for {
		select {
		case <-ctx.Done():
			log.Println("[scheduler] stopped")
			return
		case <-ticker.C:
			s.tick(ctx)
		}
	}
}

type pushPayload struct {
	Title string `json:"title"`
	Body  string `json:"body"`
	Data  struct {
		TaskID string `json:"taskId"`
	} `json:"data"`
}

func (s *Scheduler) tick(ctx context.Context) {
	reminders, err := s.reminders.ListPendingDue(ctx, time.Now())
	if err != nil {
		log.Printf("[scheduler] error listing pending reminders: %v", err)
		return
	}

	for _, rm := range reminders {
		if err := s.reminders.MarkSentAndScheduleNext(ctx, rm.ID); err != nil {
			log.Printf("[scheduler] error processing reminder %s: %v", rm.ID, err)
			continue
		}
		log.Printf("[scheduler] processed reminder %s (task=%s)", rm.ID, rm.TaskID)

		s.sendPushNotifications(ctx, rm.UserID, rm.TaskTitle, rm.TaskID)
	}
}

func (s *Scheduler) sendPushNotifications(ctx context.Context, userID, taskTitle, taskID string) {
	if s.vapid.PublicKey == "" || s.vapid.PrivateKey == "" {
		return
	}

	subs, err := s.pushSubs.ListByUser(ctx, userID)
	if err != nil {
		log.Printf("[scheduler] error fetching push subs for user %s: %v", userID, err)
		return
	}

	payload := pushPayload{
		Title: "Reminder",
		Body:  taskTitle,
	}
	payload.Data.TaskID = taskID

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		log.Printf("[scheduler] error marshaling push payload: %v", err)
		return
	}

	for _, sub := range subs {
		resp, err := webpush.SendNotification(payloadBytes, &webpush.Subscription{
			Endpoint: sub.Endpoint,
			Keys: webpush.Keys{
				P256dh: sub.P256dh,
				Auth:   sub.Auth,
			},
		}, &webpush.Options{
			Subscriber:      s.vapid.Subject,
			VAPIDPublicKey:  s.vapid.PublicKey,
			VAPIDPrivateKey: s.vapid.PrivateKey,
			TTL:             60,
		})
		if err != nil {
			log.Printf("[scheduler] error sending push to %s: %v", sub.Endpoint, err)
			continue
		}
		resp.Body.Close()

		if resp.StatusCode == http.StatusGone || resp.StatusCode == http.StatusNotFound {
			log.Printf("[scheduler] removing expired subscription %s", sub.ID)
			_ = s.pushSubs.DeleteByEndpoint(ctx, sub.Endpoint)
		}
	}
}
```

- [ ] **Step 3: Wire up new dependencies in main.go**

In `server/cmd/server/main.go`, make these changes:

Add push subscription repo after the existing repo declarations:

```go
	pushSubRepo := repository.NewPushSubscriptionRepo(pool)
```

Update scheduler construction to pass new dependencies:

```go
	vapidCfg := scheduler.VAPIDConfig{
		PublicKey:  cfg.VAPIDPublicKey,
		PrivateKey: cfg.VAPIDPrivateKey,
		Subject:    cfg.VAPIDSubject,
	}
	sched := scheduler.New(reminderRepo, pushSubRepo, vapidCfg)
```

Add push subscription handler:

```go
	pushSubHandler := handler.NewPushSubscriptionHandler(pushSubRepo, cfg)
```

Add routes to the protected mux (after the existing reminder routes):

```go
	protected.HandleFunc("GET /api/v1/push/vapid-key", pushSubHandler.VAPIDKey)
	protected.HandleFunc("POST /api/v1/push-subscriptions", pushSubHandler.Create)
	protected.HandleFunc("DELETE /api/v1/push-subscriptions/{id}", pushSubHandler.Delete)
```

- [ ] **Step 4: Verify build**

Run: `cd server && go build ./...`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add server/go.mod server/go.sum server/internal/scheduler/scheduler.go server/cmd/server/main.go
git commit -m "feat: integrate webpush-go and send push notifications from scheduler"
```

---

## Task 7: Frontend — Install vite-plugin-pwa and Configure

**Files:**
- Modify: `web/package.json` (via npm)
- Modify: `web/vite.config.ts`
- Delete: `web/public/manifest.json`
- Modify: `web/tsconfig.app.json` (add sw types)

- [ ] **Step 1: Install vite-plugin-pwa**

Run: `cd web && npm install -D vite-plugin-pwa`
Expected: Package added to devDependencies.

- [ ] **Step 2: Update vite.config.ts**

Replace `web/vite.config.ts` with:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        name: 'Personal Todo & Reminder',
        short_name: 'Todo',
        description: 'Personal task management with reminders',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#3b82f6',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
```

- [ ] **Step 3: Delete old manifest.json**

Run: `rm web/public/manifest.json`

- [ ] **Step 4: Add WebWorker types to tsconfig**

In `web/tsconfig.app.json`, ensure `compilerOptions.lib` includes `"WebWorker"`. If the file has a `lib` array, add `"WebWorker"` to it. If it doesn't have `lib`, add:

```json
"compilerOptions": {
  "lib": ["ES2020", "DOM", "DOM.Iterable", "WebWorker"]
}
```

- [ ] **Step 5: Commit**

```bash
git add web/vite.config.ts web/tsconfig.app.json
git rm web/public/manifest.json
git commit -m "feat: configure vite-plugin-pwa with injectManifest mode"
```

---

## Task 8: Frontend — Custom Service Worker

**Files:**
- Create: `web/src/sw.ts`

- [ ] **Step 1: Create the service worker**

Create `web/src/sw.ts`:

```ts
/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies'

declare let self: ServiceWorkerGlobalScope

// Precache static assets injected by vite-plugin-pwa
precacheAndRoute(self.__WB_MANIFEST)

// Network-first for API calls
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({ cacheName: 'api-cache' })
)

// Stale-while-revalidate for other assets (fonts, images, etc.)
registerRoute(
  ({ request }) =>
    request.destination === 'image' ||
    request.destination === 'font' ||
    request.destination === 'style',
  new StaleWhileRevalidate({ cacheName: 'assets-cache' })
)

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return

  const payload = event.data.json() as {
    title: string
    body: string
    data?: { taskId?: string }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: payload.data,
    })
  )
})

// Notification click handler — open/focus app
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      if (clients.length > 0) {
        return clients[0].focus()
      }
      return self.clients.openWindow('/')
    })
  )
})
```

- [ ] **Step 2: Verify build**

Run: `cd web && npm run build`
Expected: Build succeeds, SW is generated in `dist/`.

- [ ] **Step 3: Commit**

```bash
git add web/src/sw.ts
git commit -m "feat: add custom service worker with push notification handler"
```

---

## Task 9: Frontend — Push Notification API Client & Types

**Files:**
- Modify: `web/src/types/index.ts`
- Modify: `web/src/api/client.ts`

- [ ] **Step 1: Add PushSubscription type**

Add to the end of `web/src/types/index.ts`:

```ts
export interface PushSub {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  created_at: string
}
```

(Named `PushSub` to avoid conflict with the browser's built-in `PushSubscription` type.)

- [ ] **Step 2: Add push API functions to client.ts**

Add to the end of `web/src/api/client.ts`:

```ts
export function getVapidKey(): Promise<{ publicKey: string }> {
  return api.get('/push/vapid-key')
}

export function subscribePush(subscription: PushSubscriptionJSON): Promise<PushSub> {
  return api.post('/push-subscriptions', {
    endpoint: subscription.endpoint,
    keys: subscription.keys,
  })
}

export function unsubscribePush(id: string): Promise<void> {
  return api.delete(`/push-subscriptions/${id}`)
}
```

Add the import at the top of `client.ts`:

```ts
import type { User, PushSub } from '../types'
```

- [ ] **Step 3: Verify build**

Run: `cd web && npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add web/src/types/index.ts web/src/api/client.ts
git commit -m "feat: add push subscription API client and types"
```

---

## Task 10: Frontend — usePushNotification Hook

**Files:**
- Create: `web/src/hooks/use-push-notification.ts`

- [ ] **Step 1: Create the hook**

Create `web/src/hooks/use-push-notification.ts`:

```ts
import { useCallback, useEffect, useState } from 'react'
import { getVapidKey, subscribePush, unsubscribePush } from '../api/client'

type PushStatus = 'unsupported' | 'denied' | 'prompt' | 'subscribed' | 'unsubscribed'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function usePushNotification() {
  const [status, setStatus] = useState<PushStatus>('unsupported')
  const [backendSubId, setBackendSubId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }

    if (Notification.permission === 'denied') {
      setStatus('denied')
      return
    }

    navigator.serviceWorker.ready.then((registration) => {
      registration.pushManager.getSubscription().then((sub) => {
        if (sub) {
          setStatus('subscribed')
        } else if (Notification.permission === 'granted') {
          setStatus('unsubscribed')
        } else {
          setStatus('prompt')
        }
      })
    })
  }, [])

  const subscribe = useCallback(async () => {
    setLoading(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission === 'denied') {
        setStatus('denied')
        return
      }

      const { publicKey } = await getVapidKey()
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })

      const subJSON = subscription.toJSON()
      const backendSub = await subscribePush(subJSON)
      setBackendSubId(backendSub.id)
      setStatus('subscribed')
    } catch (err) {
      console.error('Push subscription failed:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const unsubscribe = useCallback(async () => {
    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await subscription.unsubscribe()
      }
      if (backendSubId) {
        await unsubscribePush(backendSubId)
        setBackendSubId(null)
      }
      setStatus('unsubscribed')
    } catch (err) {
      console.error('Push unsubscribe failed:', err)
    } finally {
      setLoading(false)
    }
  }, [backendSubId])

  return { status, loading, subscribe, unsubscribe }
}
```

- [ ] **Step 2: Verify build**

Run: `cd web && npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/hooks/use-push-notification.ts
git commit -m "feat: add usePushNotification hook"
```

---

## Task 11: Frontend — Update Settings Page (Install + Push Toggle)

**Files:**
- Modify: `web/src/pages/SettingsPage.tsx`

- [ ] **Step 1: Add install prompt hook logic and push notification toggle**

Replace the full `SettingsPage.tsx` with:

```tsx
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth-store'
import { useThemeStore } from '../stores/theme-store'
import { usePushNotification } from '../hooks/use-push-notification'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

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

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
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

function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
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
  right: ReactNode
  className?: string
}) {
  return (
    <div className={`flex items-center justify-between px-4 py-3.5 ${className}`}>
      <span className="text-sm text-slate-900">{label}</span>
      {right}
    </div>
  )
}

function useInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setInstallEvent(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const install = useCallback(async () => {
    if (!installEvent) return
    await installEvent.prompt()
    const { outcome } = await installEvent.userChoice
    if (outcome === 'accepted') {
      setIsInstalled(true)
      setInstallEvent(null)
    }
  }, [installEvent])

  return { canInstall: !!installEvent && !isInstalled, isInstalled, install }
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const { logout } = useAuthStore()
  const { isDark, toggleTheme } = useThemeStore()
  const { status: pushStatus, loading: pushLoading, subscribe, unsubscribe } = usePushNotification()
  const { canInstall, isInstalled, install } = useInstallPrompt()

  const handleSignOut = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const handlePushToggle = () => {
    if (pushStatus === 'subscribed') {
      unsubscribe()
    } else {
      subscribe()
    }
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

        {pushStatus !== 'unsupported' && (
          <SettingsGroup title="Notifications">
            {pushStatus === 'denied' ? (
              <SettingsRow
                label="Push Notifications"
                right={<span className="text-xs text-slate-400">Blocked — enable in browser settings</span>}
                className="opacity-50"
              />
            ) : (
              <SettingsRow
                label="Push Notifications"
                right={
                  <ToggleSwitch
                    checked={pushStatus === 'subscribed'}
                    onChange={handlePushToggle}
                    disabled={pushLoading}
                  />
                }
              />
            )}
          </SettingsGroup>
        )}

        {(canInstall || isInstalled) && (
          <SettingsGroup title="App">
            <SettingsRow
              label="Install App"
              right={
                isInstalled ? (
                  <span className="text-xs text-green-600">Installed</span>
                ) : (
                  <button
                    onClick={install}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors active:bg-blue-700"
                  >
                    Install
                  </button>
                )
              }
            />
          </SettingsGroup>
        )}

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

- [ ] **Step 2: Verify build**

Run: `cd web && npx tsc --noEmit && npm run build`
Expected: No type errors, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add web/src/pages/SettingsPage.tsx
git commit -m "feat: add push notification toggle and install button to Settings"
```

---

## Task 12: Frontend — Register Service Worker in App

**Files:**
- Modify: `web/src/main.tsx`

- [ ] **Step 1: Read current main.tsx**

Read `web/src/main.tsx` to see current structure.

- [ ] **Step 2: Add SW registration**

Add the following after the `ReactDOM` render call in `main.tsx`:

```ts
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true })
```

Also add at the top of the file if not present:

```ts
/// <reference types="vite-plugin-pwa/client" />
```

- [ ] **Step 3: Verify build**

Run: `cd web && npm run build`
Expected: Build succeeds, SW registered.

- [ ] **Step 4: Commit**

```bash
git add web/src/main.tsx
git commit -m "feat: register service worker via vite-plugin-pwa"
```

---

## Task 13: Generate VAPID Keys & Update .env

**Files:**
- Modify: `.env` (or `.env.example`)

- [ ] **Step 1: Generate VAPID keys**

Run: `cd server && go run -mod=mod github.com/SherClockHolmes/webpush-go/cmd/vapidkeys`

If the above doesn't work, use Node.js as alternative:
Run: `npx web-push generate-vapid-keys`

Copy the output — you'll get a public key and private key.

- [ ] **Step 2: Add to server .env**

Add to server's `.env` file:

```
VAPID_PUBLIC_KEY=<generated-public-key>
VAPID_PRIVATE_KEY=<generated-private-key>
VAPID_SUBJECT=mailto:your-email@example.com
```

- [ ] **Step 3: Commit .env.example (not .env)**

If an `.env.example` exists, add the VAPID keys as placeholders. Do NOT commit the actual `.env`.

```bash
git add server/.env.example  # if exists
git commit -m "docs: add VAPID env var placeholders"
```

---

## Task 14: End-to-End Smoke Test

- [ ] **Step 1: Start backend**

Run: `cd server && go run ./cmd/server`
Expected: Server starts, scheduler begins ticking.

- [ ] **Step 2: Start frontend**

Run: `cd web && npm run dev`
Expected: Vite starts with PWA plugin active.

- [ ] **Step 3: Test push subscription flow**

1. Open the app in Chrome, log in
2. Go to Settings
3. Toggle "Push Notifications" on → browser asks for permission → grant it
4. Verify in Network tab: `POST /api/v1/push-subscriptions` returns 201
5. Check database: `SELECT * FROM push_subscriptions` shows the new row

- [ ] **Step 4: Test push notification delivery**

1. Create a task with a reminder set to 1 minute from now
2. Wait for the scheduler tick (up to 60 seconds)
3. Verify push notification appears on the device
4. Click the notification → app opens/focuses

- [ ] **Step 5: Test install prompt**

1. Open Settings → "Install App" button should appear (if in Chrome, not already installed)
2. Click "Install" → browser install prompt appears

- [ ] **Step 6: Test unsubscribe**

1. Go to Settings, toggle Push Notifications off
2. Verify `DELETE /api/v1/push-subscriptions/{id}` called
3. No more push notifications for new reminders

- [ ] **Step 7: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address smoke test issues"
```
