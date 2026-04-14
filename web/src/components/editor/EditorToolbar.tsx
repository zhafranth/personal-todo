import type { Editor } from '@tiptap/react'

interface EditorToolbarProps {
  editor: Editor | null
}

interface ToolbarButton {
  label: string
  action: () => void
  isActive: () => boolean
}

export default function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) return null

  const inlineMarks: ToolbarButton[] = [
    { label: 'B', action: () => editor.chain().focus().toggleBold().run(), isActive: () => editor.isActive('bold') },
    { label: 'I', action: () => editor.chain().focus().toggleItalic().run(), isActive: () => editor.isActive('italic') },
    { label: 'U', action: () => editor.chain().focus().toggleUnderline().run(), isActive: () => editor.isActive('underline') },
    { label: 'S', action: () => editor.chain().focus().toggleStrike().run(), isActive: () => editor.isActive('strike') },
    { label: '<>', action: () => editor.chain().focus().toggleCode().run(), isActive: () => editor.isActive('code') },
  ]

  const blockTypes: ToolbarButton[] = [
    { label: 'H1', action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), isActive: () => editor.isActive('heading', { level: 1 }) },
    { label: 'H2', action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), isActive: () => editor.isActive('heading', { level: 2 }) },
    { label: 'H3', action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), isActive: () => editor.isActive('heading', { level: 3 }) },
    { label: '•', action: () => editor.chain().focus().toggleBulletList().run(), isActive: () => editor.isActive('bulletList') },
    { label: '1.', action: () => editor.chain().focus().toggleOrderedList().run(), isActive: () => editor.isActive('orderedList') },
    { label: '☑', action: () => editor.chain().focus().toggleTaskList().run(), isActive: () => editor.isActive('taskList') },
    { label: '"', action: () => editor.chain().focus().toggleBlockquote().run(), isActive: () => editor.isActive('blockquote') },
    { label: '⌨', action: () => editor.chain().focus().toggleCodeBlock().run(), isActive: () => editor.isActive('codeBlock') },
  ]

  return (
    <div className="flex flex-wrap gap-0.5 border-b border-slate-200 px-2 py-1.5 dark:border-slate-700">
      {inlineMarks.map((btn) => (
        <ToolbarBtn key={btn.label} {...btn} />
      ))}
      <div className="mx-1 w-px self-stretch bg-slate-200 dark:bg-slate-700" />
      {blockTypes.map((btn) => (
        <ToolbarBtn key={btn.label} {...btn} />
      ))}
    </div>
  )
}

function ToolbarBtn({ label, action, isActive }: ToolbarButton) {
  const active = isActive()
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={action}
      className={`flex size-8 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
        active
          ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400'
          : 'text-slate-500 hover:bg-slate-100 active:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 dark:active:bg-slate-700'
      }`}
    >
      {label}
    </button>
  )
}
