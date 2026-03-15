import { useState, useCallback, useRef, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import EditorToolbar from './EditorToolbar'
import SlashMenu from './SlashMenu'
import './editor.css'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Add a description...',
  className = '',
}: RichTextEditorProps) {
  const [slashOpen, setSlashOpen] = useState(false)
  const [slashQuery, setSlashQuery] = useState('')
  const [slashPosition, setSlashPosition] = useState({ top: 0, left: 0 })
  const [slashRange, setSlashRange] = useState<{ from: number; to: number } | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const detectSlashCommand = useCallback(
    (ed: NonNullable<ReturnType<typeof useEditor>>) => {
      if (!ed) return
      const { state } = ed
      const { $from } = state.selection

      const textBefore = $from.parent.textContent.slice(0, $from.parentOffset)
      const slashMatch = textBefore.match(/\/([a-zA-Z0-9 ]*)$/)

      if (slashMatch && $from.parent.type.name === 'paragraph') {
        const query = slashMatch[1]
        setSlashQuery(query)
        setSlashRange({
          from: $from.pos - slashMatch[0].length,
          to: $from.pos,
        })

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
      StarterKit.configure({
        codeBlock: {},
        blockquote: {},
      }),
      Underline,
      TaskList,
      TaskItem.configure({ nested: false }),
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
  })

  useEffect(() => {
    if (!editor) return
    const handler = () => {
      onChangeRef.current(editor.getHTML())
      detectSlashCommand(editor)
    }
    editor.on('update', handler)
    return () => { editor.off('update', handler) }
  }, [editor, detectSlashCommand])

  // Close slash menu on scroll inside the editor container
  useEffect(() => {
    if (!slashOpen) return
    const scrollContainer = wrapperRef.current?.querySelector('.max-h-\\[160px\\]')
    if (!scrollContainer) return
    const onScroll = () => setSlashOpen(false)
    scrollContainer.addEventListener('scroll', onScroll)
    return () => scrollContainer.removeEventListener('scroll', onScroll)
  }, [slashOpen])

  const handleSlashSelect = useCallback(() => {
    if (editor && slashRange) {
      editor.chain().focus().deleteRange(slashRange).run()
    }
    setSlashOpen(false)
    setSlashQuery('')
    setSlashRange(null)
  }, [editor, slashRange])

  const handleSlashClose = useCallback(() => {
    setSlashOpen(false)
  }, [])

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

  return (
    <div
      ref={wrapperRef}
      className={`rounded-xl border border-slate-200 bg-slate-50 transition-colors focus-within:border-blue-400 focus-within:bg-white ${className}`}
    >
      <EditorToolbar editor={editor} />
      <div
        className="min-h-[80px] max-h-[160px] overflow-y-auto px-4 py-3"
        onClick={() => editor?.commands.focus()}
      >
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
