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

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      const data = pendingUpdate.current
      if (id && Object.keys(data).length > 0) {
        updateNote.mutate({ id, ...data })
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

      {/* Editor — slash commands only, no toolbar */}
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
