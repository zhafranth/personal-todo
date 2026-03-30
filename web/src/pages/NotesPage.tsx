import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotes, useCreateNote, useUpdateNote, useDeleteNote } from '../hooks/use-notes'
import FAB from '../components/layout/FAB'

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

              {/* Pin button */}
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

      <FAB onClick={handleCreate} />
    </div>
  )
}
