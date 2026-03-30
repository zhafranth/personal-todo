# Notes Feature Design

## Overview

A new Notes feature for the Personal Todo PWA — a simple, distraction-free writing space completely independent from tasks. Notes live on their own page accessible via bottom navigation, with a flat list of titles, search, pinning, and a clean Tiptap editor using slash commands for formatting (no toolbar).

## Data Model

### `notes` table (PostgreSQL)

| Column     | Type           | Constraints / Default          |
|------------|----------------|--------------------------------|
| id         | UUID           | PK, `gen_random_uuid()`        |
| user_id    | UUID           | FK → users, NOT NULL           |
| title      | VARCHAR(255)   | NOT NULL                       |
| content    | TEXT           | Nullable, stores HTML          |
| is_pinned  | BOOLEAN        | NOT NULL, DEFAULT `false`      |
| created_at | TIMESTAMPTZ    | NOT NULL, DEFAULT `now()`      |
| updated_at | TIMESTAMPTZ    | NOT NULL, DEFAULT `now()`      |

### Indexes

- `idx_notes_user_id` on `user_id`
- `idx_notes_user_pinned` on `(user_id, is_pinned)`

### Ordering

Pinned notes first, then by `updated_at DESC`.

## API Endpoints

All endpoints require JWT authentication. All enforce `user_id` ownership.

| Method   | Path          | Description                                      |
|----------|---------------|--------------------------------------------------|
| `GET`    | `/notes`      | List notes. Optional `?q=` for ILIKE search on title/content. Returns pinned first, then by updated_at DESC. |
| `GET`    | `/notes/:id`  | Get single note by ID.                           |
| `POST`   | `/notes`      | Create note. Body: `{ title, content? }`         |
| `PATCH`  | `/notes/:id`  | Update note. Body: `{ title?, content?, is_pinned? }` |
| `DELETE`  | `/notes/:id`  | Delete note.                                     |

### Request/Response Shapes

**Create (POST /notes):**
```json
{
  "title": "string (required)",
  "content": "string (optional, HTML)"
}
```

**Update (PATCH /notes/:id):**
```json
{
  "title": "string (optional)",
  "content": "string (optional, HTML)",
  "is_pinned": "boolean (optional)"
}
```

**Response (single note):**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "title": "string",
  "content": "string | null",
  "is_pinned": "boolean",
  "created_at": "ISO 8601",
  "updated_at": "ISO 8601"
}
```

**Response (list):**
```json
[
  { "id": "...", "title": "...", "is_pinned": true, "updated_at": "..." },
  ...
]
```

## Frontend

### Routing

| Path          | Component   | Description              |
|---------------|-------------|--------------------------|
| `/notes`      | NotesPage   | List view (protected)    |
| `/notes/:id`  | NoteDetail  | Edit view (protected)    |

### Bottom Navigation

Add "Notes" as the 4th tab: **Tasks | Calendar | Notes | Settings**

Uses a document/note SVG icon consistent with existing icon style.

### Notes List Page (`/notes`)

- **Search bar** at top — filters notes as you type via `?q=` query param
- **Flat list** of note titles below
- Pinned notes appear first with a small pin indicator
- Tapping a note navigates to `/notes/:id`
- Swipe or long-press for actions: pin/unpin, delete
- **Empty state**: "No notes yet" message
- **FAB**: Creates a new note (POST with title "Untitled") and navigates to `/notes/:id`

### Note Detail Page (`/notes/:id`)

- **Back button** at top — returns to `/notes`
- **Title field** — plain text input, large font, no border (Notion-style)
- **Content area** — Tiptap editor, slash commands only (no toolbar)
- **Auto-save** on blur or after 1-2 second debounce for both title and content
- **Pin icon** in top-right corner — toggle pin/unpin
- **Delete action** — trash icon or menu
- **Slash menu** — same commands as task description editor: H1-H3, bullet list, ordered list, task list, code block, blockquote, horizontal rule, code inline

### New Note Flow

1. User taps FAB on Notes page
2. `POST /notes` with `{ title: "Untitled" }`
3. Navigate to `/notes/:id`
4. User starts editing immediately (title is selected/focused)

### Reused Components

- **Tiptap editor** — same extensions (StarterKit, Underline, TaskList, TaskItem, Link, Placeholder)
- **SlashMenu component** — reused from existing editor
- **DOMPurify** — for sanitizing HTML content

### New Components

- `NotesPage` — list page with search
- `NoteDetail` — detail/edit page
- `NoteItem` — list item in NotesPage

### Hooks

- `useNotes(query?)` — TanStack Query hook to fetch notes list
- `useNote(id)` — TanStack Query hook to fetch single note
- `useCreateNote()` — mutation hook
- `useUpdateNote()` — mutation hook with debounced auto-save
- `useDeleteNote()` — mutation hook

### API Client

New functions in the API layer:
- `getNotes(query?)`, `getNote(id)`, `createNote(data)`, `updateNote(id, data)`, `deleteNote(id)`

## Backend

### Handler

New `NoteHandler` in `server/internal/handler/` following existing handler patterns:
- Register routes on the router
- Parse request body, validate, call repository
- Enforce user ownership via auth middleware context

### Repository

New `NoteRepository` in `server/internal/repository/`:
- `List(ctx, userID, query)` — with optional ILIKE search
- `GetByID(ctx, id, userID)` — with ownership check
- `Create(ctx, note)` — insert new note
- `Update(ctx, id, userID, fields)` — partial update
- `Delete(ctx, id, userID)` — delete with ownership check

### Model

New `Note` struct in `server/internal/model/`:
```go
type Note struct {
    ID        uuid.UUID
    UserID    uuid.UUID
    Title     string
    Content   *string
    IsPinned  bool
    CreatedAt time.Time
    UpdatedAt time.Time
}
```

### Migration

New migration file to create the `notes` table with indexes.

## Non-Goals

- No relation between notes and tasks
- No folders, categories, or tags
- No collaboration or sharing
- No offline support (beyond existing PWA caching)
- No image uploads or file attachments
- No full-text search (simple ILIKE is sufficient for personal use)
