import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotes, useCreateNote, useUpdateNote, useDeleteNote } from '../hooks/use-notes'
import FAB from '../components/layout/FAB'
import { formatDistanceToNow } from 'date-fns'

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

  const { pinned, unpinned } = useMemo(() => {
    if (!notes) return { pinned: [], unpinned: [] }
    return {
      pinned: notes.filter((n) => n.is_pinned),
      unpinned: notes.filter((n) => !n.is_pinned),
    }
  }, [notes])

  const renderNoteCard = (note: typeof notes extends (infer T)[] | undefined ? T : never) => (
    <button
      key={note.id}
      onClick={() => navigate(`/notes/${note.id}`)}
      className="group relative flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-left transition-all active:scale-[0.98] active:bg-slate-50"
    >
      {/* Pin indicator */}
      {note.is_pinned && (
        <div className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-blue-600 shadow-sm shadow-blue-600/30">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-2.5 text-white">
            <path d="M12 17v5" />
            <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 1 1 0 0 0 1-1V4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v1a1 1 0 0 0 1 1 1 1 0 0 1 1 1z" />
          </svg>
        </div>
      )}

      {/* Title + date */}
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[15px] font-semibold text-slate-900">
          {note.title}
        </h3>
        <span className="text-xs text-slate-400">
          {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
        </span>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-active:opacity-100">
        <span
          role="button"
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); handlePin(note.id, note.is_pinned) }}
          className={`rounded-lg p-1.5 transition-colors active:bg-slate-100 ${
            note.is_pinned ? 'text-blue-600' : 'text-slate-400'
          }`}
          title={note.is_pinned ? 'Unpin' : 'Pin'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={note.is_pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
            <path d="M12 17v5" />
            <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 1 1 0 0 0 1-1V4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v1a1 1 0 0 0 1 1 1 1 0 0 1 1 1z" />
          </svg>
        </span>
        <span
          role="button"
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDelete(note.id) }}
          className="rounded-lg p-1.5 text-slate-400 transition-colors active:bg-red-50 active:text-red-500"
          title="Delete"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
        </span>
      </div>
    </button>
  )

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold tracking-tight text-slate-900">Notes</h1>

      {/* Search bar */}
      <div className="relative mb-5">
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
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5">
              <div className="h-4 w-2/3 rounded bg-slate-200" />
              <div className="mt-2 h-3 w-24 rounded bg-slate-100" />
            </div>
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
        <div className="space-y-5">
          {/* Pinned section */}
          {pinned.length > 0 && (
            <div>
              <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-3">
                  <path d="M12 17v5" />
                  <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 1 1 0 0 0 1-1V4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v1a1 1 0 0 0 1 1 1 1 0 0 1 1 1z" />
                </svg>
                Pinned
              </h2>
              <div className="space-y-2.5">
                {pinned.map(renderNoteCard)}
              </div>
            </div>
          )}

          {/* Other notes */}
          {unpinned.length > 0 && (
            <div>
              {pinned.length > 0 && (
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Others
                </h2>
              )}
              <div className="space-y-2.5">
                {unpinned.map(renderNoteCard)}
              </div>
            </div>
          )}
        </div>
      )}

      <FAB onClick={handleCreate} />
    </div>
  )
}
