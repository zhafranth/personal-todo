import { useSections, useDeleteSection } from '../../hooks/use-sections'
import SectionItem from './SectionItem'

export default function SectionList() {
  const { data: sections, isLoading } = useSections()
  const deleteSection = useDeleteSection()

  if (isLoading) {
    return (
      <div className="space-y-3 pt-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-xl bg-white/60 dark:bg-slate-800/60" />
        ))}
      </div>
    )
  }

  if (!sections || sections.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="size-7 text-slate-400">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No sections yet</p>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Create a section to organize your tasks</p>
      </div>
    )
  }

  return (
    <div className="pt-4">
      {sections.map((section) => (
        <SectionItem
          key={section.id}
          section={section}
          onDelete={(id) => deleteSection.mutate(id)}
        />
      ))}
    </div>
  )
}
