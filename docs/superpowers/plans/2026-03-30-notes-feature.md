# Notes Feature Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an independent Notes feature with its own page, CRUD API, and a distraction-free Tiptap editor using slash commands only (no toolbar).

**Architecture:** New `notes` PostgreSQL table with CRUD API endpoints following existing section/task patterns. Frontend gets a new `/notes` list page and `/notes/:id` detail page with auto-saving Tiptap editor. Bottom nav gains a 4th "Notes" tab.

**Tech Stack:** Go + pgx (backend), React + TanStack Query + Tiptap (frontend), PostgreSQL, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-03-30-notes-feature-design.md`

---

### Task 1: Database Migration

**Files:**
- Create: `server/migrations/007_create_notes.sql`

- [ ] **Step 1: Write the migration file**

```sql
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_user_pinned ON notes(user_id, is_pinned);
```

- [ ] **Step 2: Run the migration against the database**

Run: `psql $DATABASE_URL -f server/migrations/007_create_notes.sql`
Expected: Tables and indexes created without error.

- [ ] **Step 3: Commit**

```bash
git add server/migrations/007_create_notes.sql
git commit -m "feat(notes): add database migration for notes table"
```

---

### Task 2: Backend Model

**Files:**
- Create: `server/internal/model/note.go`

- [ ] **Step 1: Create the Note model**

```go
package model

import "time"

type Note struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Title     string    `json:"title"`
	Content   *string   `json:"content"`
	IsPinned  bool      `json:"is_pinned"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type NoteUpdate struct {
	Title    *string `json:"title"`
	Content  *string `json:"content"`
	IsPinned *bool   `json:"is_pinned"`
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd server && go build ./...`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add server/internal/model/note.go
git commit -m "feat(notes): add Note and NoteUpdate model structs"
```

---

### Task 3: Backend Repository

**Files:**
- Create: `server/internal/repository/note.go`

- [ ] **Step 1: Create the NoteRepo**

```go
package repository

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/zhafrantharif/personal-todo/server/internal/model"
)

type NoteRepo struct {
	pool *pgxpool.Pool
}

func NewNoteRepo(pool *pgxpool.Pool) *NoteRepo {
	return &NoteRepo{pool: pool}
}

func (r *NoteRepo) List(ctx context.Context, userID string, query string) ([]model.Note, error) {
	sql := `SELECT id, user_id, title, content, is_pinned, created_at, updated_at
		FROM notes WHERE user_id = $1`
	args := []any{userID}

	if query != "" {
		sql += ` AND title ILIKE $2`
		args = append(args, "%"+query+"%")
	}

	sql += ` ORDER BY is_pinned DESC, updated_at DESC`

	rows, err := r.pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var notes []model.Note
	for rows.Next() {
		var n model.Note
		if err := rows.Scan(&n.ID, &n.UserID, &n.Title, &n.Content, &n.IsPinned, &n.CreatedAt, &n.UpdatedAt); err != nil {
			return nil, err
		}
		notes = append(notes, n)
	}
	if notes == nil {
		notes = []model.Note{}
	}
	return notes, rows.Err()
}

func (r *NoteRepo) GetByID(ctx context.Context, id, userID string) (*model.Note, error) {
	var n model.Note
	err := r.pool.QueryRow(ctx,
		`SELECT id, user_id, title, content, is_pinned, created_at, updated_at
		 FROM notes WHERE id = $1 AND user_id = $2`, id, userID,
	).Scan(&n.ID, &n.UserID, &n.Title, &n.Content, &n.IsPinned, &n.CreatedAt, &n.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &n, nil
}

func (r *NoteRepo) Create(ctx context.Context, userID, title string, content *string) (*model.Note, error) {
	var n model.Note
	err := r.pool.QueryRow(ctx,
		`INSERT INTO notes (user_id, title, content)
		 VALUES ($1, $2, $3)
		 RETURNING id, user_id, title, content, is_pinned, created_at, updated_at`,
		userID, title, content,
	).Scan(&n.ID, &n.UserID, &n.Title, &n.Content, &n.IsPinned, &n.CreatedAt, &n.UpdatedAt)
	return &n, err
}

func (r *NoteRepo) Update(ctx context.Context, id, userID string, upd model.NoteUpdate) (*model.Note, error) {
	setClauses := []string{}
	args := []any{id, userID}
	argIdx := 3

	if upd.Title != nil {
		setClauses = append(setClauses, fmt.Sprintf("title = $%d", argIdx))
		args = append(args, *upd.Title)
		argIdx++
	}
	if upd.Content != nil {
		setClauses = append(setClauses, fmt.Sprintf("content = $%d", argIdx))
		args = append(args, *upd.Content)
		argIdx++
	}
	if upd.IsPinned != nil {
		setClauses = append(setClauses, fmt.Sprintf("is_pinned = $%d", argIdx))
		args = append(args, *upd.IsPinned)
		argIdx++
	}

	if len(setClauses) == 0 {
		return r.GetByID(ctx, id, userID)
	}

	setClauses = append(setClauses, "updated_at = NOW()")

	sql := fmt.Sprintf(
		`UPDATE notes SET %s WHERE id = $1 AND user_id = $2
		 RETURNING id, user_id, title, content, is_pinned, created_at, updated_at`,
		strings.Join(setClauses, ", "),
	)

	var n model.Note
	err := r.pool.QueryRow(ctx, sql, args...).Scan(
		&n.ID, &n.UserID, &n.Title, &n.Content, &n.IsPinned, &n.CreatedAt, &n.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &n, nil
}

func (r *NoteRepo) Delete(ctx context.Context, id, userID string) error {
	tag, err := r.pool.Exec(ctx,
		`DELETE FROM notes WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd server && go build ./...`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add server/internal/repository/note.go
git commit -m "feat(notes): add NoteRepo with CRUD and search"
```

---

### Task 4: Backend Handler

**Files:**
- Create: `server/internal/handler/note.go`

- [ ] **Step 1: Create the NoteHandler**

```go
package handler

import (
	"errors"
	"net/http"

	"github.com/zhafrantharif/personal-todo/server/internal/middleware"
	"github.com/zhafrantharif/personal-todo/server/internal/model"
	"github.com/zhafrantharif/personal-todo/server/internal/repository"
)

type NoteHandler struct {
	notes *repository.NoteRepo
}

func NewNoteHandler(notes *repository.NoteRepo) *NoteHandler {
	return &NoteHandler{notes: notes}
}

func (h *NoteHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	query := r.URL.Query().Get("q")

	notes, err := h.notes.List(r.Context(), userID, query)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list notes")
		return
	}
	writeJSON(w, http.StatusOK, notes)
}

func (h *NoteHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := r.PathValue("id")

	note, err := h.notes.GetByID(r.Context(), id, userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "note not found")
		return
	}
	writeJSON(w, http.StatusOK, note)
}

type createNoteRequest struct {
	Title   string  `json:"title"`
	Content *string `json:"content"`
}

func (h *NoteHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	var req createNoteRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Title == "" {
		writeError(w, http.StatusBadRequest, "title is required")
		return
	}

	note, err := h.notes.Create(r.Context(), userID, req.Title, req.Content)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create note")
		return
	}
	writeJSON(w, http.StatusCreated, note)
}

func (h *NoteHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := r.PathValue("id")

	var req model.NoteUpdate
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	note, err := h.notes.Update(r.Context(), id, userID, req)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "note not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to update note")
		return
	}
	writeJSON(w, http.StatusOK, note)
}

func (h *NoteHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := r.PathValue("id")

	err := h.notes.Delete(r.Context(), id, userID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			writeError(w, http.StatusNotFound, "note not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to delete note")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd server && go build ./...`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add server/internal/handler/note.go
git commit -m "feat(notes): add NoteHandler with CRUD endpoints"
```

---

### Task 5: Wire Up Backend Routes

**Files:**
- Modify: `server/cmd/server/main.go`

- [ ] **Step 1: Add NoteRepo and NoteHandler initialization**

After the existing repo initializations (line ~36), add:
```go
noteRepo := repository.NewNoteRepo(pool)
```

After the existing handler initializations (line ~47), add:
```go
noteHandler := handler.NewNoteHandler(noteRepo)
```

- [ ] **Step 2: Register note routes**

After the reminder routes (line ~79), add:
```go
protected.HandleFunc("GET /api/v1/notes", noteHandler.List)
protected.HandleFunc("GET /api/v1/notes/{id}", noteHandler.GetByID)
protected.HandleFunc("POST /api/v1/notes", noteHandler.Create)
protected.HandleFunc("PATCH /api/v1/notes/{id}", noteHandler.Update)
protected.HandleFunc("DELETE /api/v1/notes/{id}", noteHandler.Delete)
```

- [ ] **Step 3: Verify it compiles and the server starts**

Run: `cd server && go build ./... && go run ./cmd/server/`
Expected: Server starts without errors. Ctrl+C to stop.

- [ ] **Step 4: Manually test with curl**

```bash
# Create a note
curl -s -X POST http://localhost:8080/api/v1/notes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Note"}' | jq .

# List notes
curl -s http://localhost:8080/api/v1/notes \
  -H "Authorization: Bearer $TOKEN" | jq .
```

Expected: Note is created and appears in the list.

- [ ] **Step 5: Commit**

```bash
git add server/cmd/server/main.go
git commit -m "feat(notes): wire up note routes in server"
```

---

### Task 6: Frontend TypeScript Types

**Files:**
- Modify: `web/src/types/index.ts`

- [ ] **Step 1: Add Note interface**

Append to the file:
```typescript
export interface Note {
  id: string
  user_id: string
  title: string
  content: string | null
  is_pinned: boolean
  created_at: string
  updated_at: string
}

export interface NoteUpdate {
  title?: string
  content?: string
  is_pinned?: boolean
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/types/index.ts
git commit -m "feat(notes): add Note and NoteUpdate TypeScript types"
```

---

### Task 7: Frontend API Hooks

**Files:**
- Create: `web/src/hooks/use-notes.ts`

- [ ] **Step 1: Create the notes hooks file**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Note, NoteUpdate } from '../types'

export function useNotes(query?: string) {
  return useQuery({
    queryKey: ['notes', query],
    queryFn: () => api.get<Note[]>(query ? `/notes?q=${encodeURIComponent(query)}` : '/notes'),
  })
}

export function useNote(id: string) {
  return useQuery({
    queryKey: ['notes', id],
    queryFn: () => api.get<Note>(`/notes/${id}`),
    enabled: !!id,
  })
}

export function useCreateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { title: string; content?: string }) =>
      api.post<Note>('/notes', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] }),
  })
}

export function useUpdateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & NoteUpdate) =>
      api.patch<Note>(`/notes/${id}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['notes'] })
      qc.invalidateQueries({ queryKey: ['notes', vars.id] })
    },
  })
}

export function useDeleteNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/notes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] }),
  })
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd web && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/hooks/use-notes.ts
git commit -m "feat(notes): add TanStack Query hooks for notes CRUD"
```

---

### Task 8: Notes List Page

**Files:**
- Create: `web/src/pages/NotesPage.tsx`

- [ ] **Step 1: Create NotesPage component**

```tsx
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotes, useCreateNote, useUpdateNote, useDeleteNote } from '../hooks/use-notes'

export default function NotesPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const { data: notes, isLoading } = useNotes(search || undefined)
  const createNote = useCreateNote()
  const updateNote = useUpdateNote()
  const deleteNote = useDeleteNote()

  const handleCreate = () => {
    createNote.mutate({ title: 'Untitled' }, {
      onSuccess: (note) => navigate(`/notes/${note.id}`),
    })
  }

  const handlePin = (id: string, isPinned: boolean) => {
    updateNote.mutate({ id, is_pinned: !isPinned })
  }

  const handleDelete = (id: string) => {
    if (confirm('Delete this note?')) {
      deleteNote.mutate(id)
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Notes</h1>

      {/* Search bar */}
      <div className="relative mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notes..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none"
        />
      </div>

      {/* Notes list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : !notes || notes.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <p className="text-sm text-slate-500">
            {search ? 'No notes match your search' : 'No notes yet'}
          </p>
          {!search && (
            <button
              onClick={handleCreate}
              className="mt-2 text-sm font-medium text-blue-600"
            >
              Create your first note
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          {notes.map((note) => (
            <div
              key={note.id}
              className="group flex items-center gap-2 rounded-xl px-3 py-3 transition-colors active:bg-slate-100"
            >
              <button
                onClick={() => navigate(`/notes/${note.id}`)}
                className="min-w-0 flex-1 text-left"
              >
                <span className="block truncate text-sm font-medium text-slate-800">
                  {note.title}
                </span>
              </button>

              {/* Pin indicator / button */}
              <button
                onClick={(e) => { e.stopPropagation(); handlePin(note.id, note.is_pinned) }}
                className={`shrink-0 rounded-lg p-1.5 transition-colors ${
                  note.is_pinned
                    ? 'text-blue-600'
                    : 'text-slate-300 opacity-0 group-hover:opacity-100 active:opacity-100'
                }`}
                title={note.is_pinned ? 'Unpin' : 'Pin'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={note.is_pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4">
                  <path d="M12 17v5" />
                  <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 1 1 0 0 0 1-1V4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v1a1 1 0 0 0 1 1 1 1 0 0 1 1 1z" />
                </svg>
              </button>

              {/* Delete button */}
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(note.id) }}
                className="shrink-0 rounded-lg p-1.5 text-slate-300 opacity-0 transition-colors group-hover:opacity-100 active:text-red-500 active:opacity-100"
                title="Delete"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4">
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd web && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/pages/NotesPage.tsx
git commit -m "feat(notes): add NotesPage with search, pin, and delete"
```

---

### Task 9: Note Detail Page

**Files:**
- Create: `web/src/pages/NoteDetail.tsx`

This is the distraction-free editor page. Uses Tiptap with slash commands only (no toolbar). Auto-saves title and content via debounce.

- [ ] **Step 1: Create NoteDetail component**

```tsx
import { useState, useCallback, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import SlashMenu from '../components/editor/SlashMenu'
import { useNote, useUpdateNote, useDeleteNote } from '../hooks/use-notes'
import '../components/editor/editor.css'

export default function NoteDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: note, isLoading } = useNote(id || '')
  const updateNote = useUpdateNote()
  const deleteNote = useDeleteNote()

  const [title, setTitle] = useState('')
  const [titleLoaded, setTitleLoaded] = useState(false)
  const [slashOpen, setSlashOpen] = useState(false)
  const [slashQuery, setSlashQuery] = useState('')
  const [slashPosition, setSlashPosition] = useState({ top: 0, left: 0 })
  const [slashRange, setSlashRange] = useState<{ from: number; to: number } | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const pendingUpdate = useRef<{ title?: string; content?: string }>({})

  // Initialize title from fetched note
  useEffect(() => {
    if (note && !titleLoaded) {
      setTitle(note.title)
      setTitleLoaded(true)
    }
  }, [note, titleLoaded])

  const flushSave = useCallback(() => {
    if (!id) return
    const data = pendingUpdate.current
    if (Object.keys(data).length === 0) return
    updateNote.mutate({ id, ...data })
    pendingUpdate.current = {}
  }, [id, updateNote])

  const debounceSave = useCallback((field: 'title' | 'content', value: string) => {
    pendingUpdate.current[field] = value
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(flushSave, 1500)
  }, [flushSave])

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      // Flush any pending save
      const data = pendingUpdate.current
      if (id && Object.keys(data).length > 0) {
        updateNote.mutate({ id, ...data })
      }
    }
  }, [id, updateNote])

  const detectSlashCommand = useCallback(
    (ed: NonNullable<ReturnType<typeof useEditor>>) => {
      if (!ed) return
      const { state } = ed
      const { $from } = state.selection
      const textBefore = $from.parent.textContent.slice(0, $from.parentOffset)
      const slashMatch = textBefore.match(/\/([a-zA-Z0-9 ]*)$/)

      if (slashMatch && $from.parent.type.name === 'paragraph') {
        setSlashQuery(slashMatch[1])
        setSlashRange({ from: $from.pos - slashMatch[0].length, to: $from.pos })

        const coords = ed.view.coordsAtPos($from.pos)
        const wrapperRect = wrapperRef.current?.getBoundingClientRect()
        if (wrapperRect) {
          const menuHeight = 200
          const top = coords.bottom + 4 + menuHeight > window.innerHeight
            ? coords.top - menuHeight - 4
            : coords.bottom + 4
          setSlashPosition({
            top,
            left: Math.min(coords.left, wrapperRect.right - 220),
          })
        }
        setSlashOpen(true)
      } else {
        setSlashOpen(false)
      }
    },
    [],
  )

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: {}, blockquote: {} }),
      Underline,
      TaskList,
      TaskItem.configure({ nested: false }),
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder: 'Start writing...' }),
    ],
    content: note?.content || '',
  })

  // Sync content from server on first load
  useEffect(() => {
    if (editor && note?.content && !editor.getText()) {
      editor.commands.setContent(note.content)
    }
  }, [editor, note])

  useEffect(() => {
    if (!editor) return
    const handler = () => {
      debounceSave('content', editor.getHTML())
      detectSlashCommand(editor)
    }
    editor.on('update', handler)
    return () => { editor.off('update', handler) }
  }, [editor, detectSlashCommand, debounceSave])

  const handleSlashSelect = useCallback(() => {
    if (editor && slashRange) {
      editor.chain().focus().deleteRange(slashRange).run()
    }
    setSlashOpen(false)
    setSlashQuery('')
    setSlashRange(null)
  }, [editor, slashRange])

  const handleSlashClose = useCallback(() => setSlashOpen(false), [])

  // Close slash menu on click outside
  useEffect(() => {
    if (!slashOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setSlashOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [slashOpen])

  const handleDelete = () => {
    if (confirm('Delete this note?')) {
      deleteNote.mutate(id!, { onSuccess: () => navigate('/notes') })
    }
  }

  const handlePin = () => {
    if (!note || !id) return
    updateNote.mutate({ id, is_pinned: !note.is_pinned })
  }

  if (isLoading) {
    return (
      <div className="space-y-4 pt-4">
        <div className="h-8 w-2/3 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-48 animate-pulse rounded-xl bg-slate-100" />
      </div>
    )
  }

  if (!note) {
    return (
      <div className="flex flex-col items-center py-16">
        <p className="text-sm text-slate-500">Note not found</p>
        <button onClick={() => navigate('/notes')} className="mt-2 text-sm font-medium text-blue-600">
          Go back
        </button>
      </div>
    )
  }

  return (
    <div ref={wrapperRef}>
      {/* Top bar */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => { flushSave(); navigate('/notes') }}
          className="flex items-center gap-1 text-sm text-slate-500 transition-colors active:text-slate-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back
        </button>

        <div className="flex items-center gap-1">
          {/* Pin button */}
          <button
            onClick={handlePin}
            className={`rounded-lg p-2 transition-colors ${
              note.is_pinned ? 'text-blue-600' : 'text-slate-400 active:text-blue-600'
            }`}
            title={note.is_pinned ? 'Unpin' : 'Pin'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={note.is_pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-5">
              <path d="M12 17v5" />
              <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 1 1 0 0 0 1-1V4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v1a1 1 0 0 0 1 1 1 1 0 0 1 1 1z" />
            </svg>
          </button>

          {/* Delete button */}
          <button
            onClick={handleDelete}
            className="rounded-lg p-2 text-slate-400 transition-colors active:text-red-500"
            title="Delete"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-5">
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value)
          debounceSave('title', e.target.value)
        }}
        onBlur={flushSave}
        placeholder="Note title"
        className="mb-4 w-full bg-transparent text-2xl font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none"
      />

      {/* Editor (no toolbar, slash commands only) */}
      <div className="prose-content min-h-[300px]" onClick={() => editor?.commands.focus()}>
        <EditorContent editor={editor} />
      </div>

      {slashOpen && editor && (
        <SlashMenu
          editor={editor}
          query={slashQuery}
          position={slashPosition}
          onSelect={handleSlashSelect}
          onClose={handleSlashClose}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd web && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/pages/NoteDetail.tsx
git commit -m "feat(notes): add NoteDetail page with auto-save and slash commands"
```

---

### Task 10: Update Routing and Navigation

**Files:**
- Modify: `web/src/App.tsx`
- Modify: `web/src/components/layout/BottomNav.tsx`

- [ ] **Step 1: Add note routes to App.tsx**

Add import at top:
```tsx
import NotesPage from './pages/NotesPage'
import NoteDetail from './pages/NoteDetail'
```

Add routes inside the AppShell route group (after calendar, before settings):
```tsx
<Route path="/notes" element={<NotesPage />} />
<Route path="/notes/:id" element={<NoteDetail />} />
```

- [ ] **Step 2: Add Notes tab to BottomNav.tsx**

Insert a new tab object in the `tabs` array, between Calendar and Settings (at index 2):

```tsx
{
  to: '/notes',
  label: 'Notes',
  icon: (active: boolean) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={active ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={active ? 0 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-[22px] transition-all duration-300"
    >
      {active ? (
        <>
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" opacity={0.15} />
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" fill="none" stroke="currentColor" strokeWidth={2} />
          <polyline points="14 2 14 8 20 8" fill="none" stroke="currentColor" strokeWidth={2} />
          <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth={2} />
          <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth={2} />
        </>
      ) : (
        <>
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </>
      )}
    </svg>
  ),
},
```

- [ ] **Step 3: Reduce tab padding for 4 tabs**

In the NavLink className, change `px-5` to `px-4`:

```tsx
// Before:
className={`relative z-10 flex items-center justify-center px-5 py-3 ...`}
// After:
className={`relative z-10 flex items-center justify-center px-4 py-3 ...`}
```

- [ ] **Step 4: Fix activeIndex detection for notes**

The existing `activeIndex` logic uses `location.pathname.startsWith(tab.to)`. Since `/notes` doesn't start with `/` in a conflicting way, this should work correctly. But verify that navigating to `/notes` and `/notes/:id` both highlight the Notes tab.

- [ ] **Step 5: Verify the app loads with no errors**

Run: `cd web && npm run dev`
Expected: App loads, 4 tabs visible, Notes tab navigates to notes page.

- [ ] **Step 6: Commit**

```bash
git add web/src/App.tsx web/src/components/layout/BottomNav.tsx
git commit -m "feat(notes): add Notes tab to navigation and routes"
```

---

### Task 11: FAB Context for Notes Page

**Files:**
- Modify: `web/src/components/layout/AppShell.tsx` (or wherever FAB is rendered)

The FAB currently always creates a task. On the Notes page, it should create a note instead.

- [ ] **Step 1: Check where FAB is rendered**

Read `web/src/components/layout/AppShell.tsx` to understand current FAB setup.

- [ ] **Step 2: Make FAB context-aware**

Use `useLocation()` to detect if on `/notes`. If on notes page, FAB creates a note and navigates to `/notes/:id`. Otherwise, keep existing behavior.

- [ ] **Step 3: Verify FAB works on both pages**

Navigate to Tasks page: FAB should create a task.
Navigate to Notes page: FAB should create a note and navigate to its detail page.

- [ ] **Step 4: Commit**

```bash
git add web/src/components/layout/AppShell.tsx
git commit -m "feat(notes): make FAB context-aware for notes page"
```

---

### Task 12: End-to-End Manual Testing

- [ ] **Step 1: Test the full flow**

1. Start backend: `cd server && go run ./cmd/server/`
2. Start frontend: `cd web && npm run dev`
3. Navigate to Notes tab
4. Tap FAB → should create "Untitled" note and navigate to detail
5. Edit title → should auto-save after 1.5s
6. Type content with slash commands (`/h2`, `/quote`, `/code`) → verify formatting works
7. Navigate back → title should appear in list
8. Pin a note → should move to top of list
9. Search for a note → should filter by title
10. Delete a note → should remove from list

- [ ] **Step 2: Verify edge cases**

- Create note, immediately navigate back → note should be saved with "Untitled"
- Empty search returns all notes
- Pin/unpin toggles correctly
- Multiple notes sort by pinned first, then updated_at DESC
