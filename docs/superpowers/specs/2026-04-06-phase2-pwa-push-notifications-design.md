# Phase 2: PWA & Push Notifications — Design Spec

## Overview

Add PWA installability and push notification support to the Personal Todo app. When a reminder is due, the backend sends a web push notification to all of the user's subscribed devices.

## Decisions

- **Caching strategy**: Network-first for API calls, StaleWhileRevalidate for static assets
- **Push notifications**: Simple (task title + time), no action buttons
- **Install prompt**: Manual only — "Install App" button in Settings page
- **VAPID keys**: Stored in environment variables
- **SW tooling**: `vite-plugin-pwa` with `injectManifest` mode (custom SW for push event handling)
- **Go push library**: `github.com/SherClockHolmes/webpush-go`

---

## Section 1: Service Worker & PWA Setup

### vite-plugin-pwa Configuration

- Add `vite-plugin-pwa` dependency
- Configure in `vite.config.ts` using `injectManifest` mode
- Manifest config moves from `public/manifest.json` into plugin config (single source of truth)
- Precache manifest auto-generated from Vite build output

### Custom Service Worker (`src/sw.ts`)

- Import Workbox precaching and routing modules
- **Precaching**: `precacheAndRoute(self.__WB_MANIFEST)` for static assets
- **Runtime routing**: `NetworkFirst` strategy for `/api/` requests, `StaleWhileRevalidate` for other assets
- **Push event listener**: parse JSON payload, show notification via `self.registration.showNotification()`
- **Notification click handler**: open/focus the app window, navigate to relevant task if `taskId` provided in payload data

### Settings Page — Install App

- Listen for `beforeinstallprompt` event, store the event reference
- Show "Install App" button in Settings only when:
  - Browser supports PWA install (event was captured)
  - App is not already installed (`display-mode: standalone` check)
- On click: call `event.prompt()`, hide button after install

---

## Section 2: Backend — Web Push API

### Configuration

Add to `config.Load()`:
- `VAPID_PUBLIC_KEY` — base64url-encoded public key
- `VAPID_PRIVATE_KEY` — base64url-encoded private key
- `VAPID_SUBJECT` — contact email (e.g., `mailto:you@example.com`)

### Database Migration (`009_create_push_subscriptions.sql`)

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

Unique constraint on `(user_id, endpoint)` — one subscription per device per user.

### Repository (`push_subscription.go`)

- `Create(ctx, userID, endpoint, p256dh, auth) (*PushSubscription, error)` — upsert (ON CONFLICT DO UPDATE)
- `Delete(ctx, id, userID) error` — remove subscription
- `DeleteByEndpoint(ctx, endpoint) error` — cleanup expired/invalid subscriptions
- `ListByUser(ctx, userID) ([]PushSubscription, error)` — all subscriptions for a user

### Model (`push_subscription.go`)

```go
type PushSubscription struct {
    ID        string    `json:"id"`
    UserID    string    `json:"user_id"`
    Endpoint  string    `json:"endpoint"`
    P256dh    string    `json:"p256dh"`
    Auth      string    `json:"auth"`
    CreatedAt time.Time `json:"created_at"`
}
```

### Handler (`push_subscription.go`)

**Protected routes:**
- `POST /api/v1/push-subscriptions` — save/upsert subscription
  - Body: `{ endpoint, keys: { p256dh, auth } }`
- `DELETE /api/v1/push-subscriptions/{id}` — remove subscription

**Protected route (read-only):**
- `GET /api/v1/push/vapid-key` — return `{ publicKey: "..." }`

### Scheduler Update (`scheduler.go`)

Inject `PushSubscriptionRepo`, `TaskRepo`, and VAPID config into `Scheduler`.

In `tick()`, after marking a reminder as sent:
1. Look up the task title (need task repo or join in query)
2. Fetch all push subscriptions for the reminder's task owner
3. For each subscription, send web push via `webpush-go`:
   - Payload: `{ "title": "Reminder", "body": "<task title>", "data": { "taskId": "..." } }`
4. Handle errors:
   - HTTP 410 Gone or 404 → delete the subscription (device unsubscribed)
   - Other errors → log and continue

---

## Section 3: Frontend — Push Notification Subscription

### API Client (`client.ts`)

Add functions:
- `getVapidKey(): Promise<{ publicKey: string }>` → `GET /api/v1/push/vapid-key`
- `subscribePush(subscription: PushSubscriptionJSON): Promise<PushSubscription>` → `POST /api/v1/push-subscriptions`
- `unsubscribePush(id: string): Promise<void>` → `DELETE /api/v1/push-subscriptions/{id}`

### Hook (`usePushNotification.ts`)

State machine with statuses:
- `unsupported` — browser doesn't support Push API or Service Workers
- `denied` — user has blocked notification permission
- `prompt` — permission not yet requested, no active subscription
- `subscribed` — active push subscription exists
- `unsubscribed` — permission granted but no active subscription

Functions:
- `subscribe()`: request `Notification.permission` → `registration.pushManager.subscribe({ applicationServerKey, userVisibleOnly: true })` → send to backend
- `unsubscribe()`: `pushSubscription.unsubscribe()` → delete from backend
- On mount: check permission state + `getSubscription()` to determine initial status

### Settings Page Update

Replace the "Coming soon" Push Notifications row:
- **Toggle switch** bound to `subscribe()`/`unsubscribe()`
- Reflects actual status from hook
- If `denied`: greyed out row with text "Blocked — enable in browser settings"
- If `unsupported`: hide the row entirely

---

## Files to Create/Modify

### Backend (server/)
- **New**: `migrations/009_create_push_subscriptions.sql`
- **New**: `internal/model/push_subscription.go`
- **New**: `internal/repository/push_subscription.go`
- **New**: `internal/handler/push_subscription.go`
- **Modify**: `internal/config/config.go` — add VAPID env vars
- **Modify**: `internal/scheduler/scheduler.go` — inject push delivery into tick()
- **Modify**: `cmd/server/main.go` — wire up new repo, handler, routes, pass VAPID to scheduler
- **Modify**: `go.mod` — add `webpush-go` dependency

### Frontend (web/)
- **New**: `src/sw.ts` — custom service worker
- **New**: `src/hooks/usePushNotification.ts`
- **Modify**: `vite.config.ts` — add vite-plugin-pwa config
- **Modify**: `package.json` — add vite-plugin-pwa dependency
- **Modify**: `src/api/client.ts` — add push API calls
- **Modify**: `src/pages/SettingsPage.tsx` — install button + push toggle
- **Delete**: `public/manifest.json` — moved into plugin config
