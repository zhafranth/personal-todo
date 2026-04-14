import { useState } from 'react'
import type { Section } from '../../types'
import TaskList from '../tasks/TaskList'

interface SectionItemProps {
  section: Section
  onDelete: (id: string) => void
}

export default function SectionItem({ section, onDelete }: SectionItemProps) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="mb-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 rounded-xl bg-white px-4 py-3 shadow-sm transition-all active:scale-[0.99] dark:bg-slate-800"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`size-4 text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
        <span className="flex-1 text-left text-sm font-semibold text-slate-800 dark:text-slate-100">{section.title}</span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(section.id)
          }}
          className="rounded-md p-1 text-slate-300 transition-colors hover:text-red-400"
          aria-label="Delete section"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4">
            <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
        </button>
      </button>
      {expanded && (
        <div className="mt-1 pl-2">
          <TaskList sectionId={section.id} />
        </div>
      )}
    </div>
  )
}
