import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import type { Editor } from '@tiptap/react'

interface SlashCommand {
  label: string
  icon: string
  action: (editor: Editor) => void
}

const commands: SlashCommand[] = [
  { label: 'Heading 1', icon: 'H1', action: (e) => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { label: 'Heading 2', icon: 'H2', action: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: 'Heading 3', icon: 'H3', action: (e) => e.chain().focus().toggleHeading({ level: 3 }).run() },
  { label: 'Bullet List', icon: '•', action: (e) => e.chain().focus().toggleBulletList().run() },
  { label: 'Numbered List', icon: '1.', action: (e) => e.chain().focus().toggleOrderedList().run() },
  { label: 'Checklist', icon: '☑', action: (e) => e.chain().focus().toggleTaskList().run() },
  { label: 'Code Block', icon: '<>', action: (e) => e.chain().focus().toggleCodeBlock().run() },
  { label: 'Blockquote', icon: '"', action: (e) => e.chain().focus().toggleBlockquote().run() },
  { label: 'Divider', icon: '—', action: (e) => e.chain().focus().setHorizontalRule().run() },
]

interface SlashMenuProps {
  editor: Editor
  query: string
  position: { top: number; left: number }
  onSelect: () => void
  onClose: () => void
}

export default function SlashMenu({ editor, query, position, onSelect, onClose }: SlashMenuProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(
    () => commands.filter((cmd) => cmd.label.toLowerCase().includes(query.toLowerCase())),
    [query],
  )

  // Clamp index to valid range — handles filtered list changing without setState
  const clampedIndex = filtered.length > 0 ? activeIndex % filtered.length : 0

  const executeCommand = useCallback(
    (index: number) => {
      const cmd = filtered[index]
      if (!cmd) return
      cmd.action(editor)
      onSelect()
    },
    [filtered, editor, onSelect],
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (filtered.length === 0) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => (i + 1) % filtered.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        executeCommand(clampedIndex)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [clampedIndex, executeCommand, filtered.length, onClose])

  if (filtered.length === 0) return null

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] max-h-48 w-52 overflow-y-auto rounded-xl border border-slate-100 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
      style={{ top: position.top, left: position.left }}
    >
      {filtered.map((cmd, i) => (
        <button
          key={cmd.label}
          type="button"
          className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
            i === clampedIndex ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'
          }`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand(i)}
          onMouseEnter={() => setActiveIndex(i)}
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            {cmd.icon}
          </span>
          {cmd.label}
        </button>
      ))}
    </div>
  )
}
