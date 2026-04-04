import { useState } from 'react'
import { Drawer } from 'vaul'
import { useCreateSection } from '../../hooks/use-sections'

interface SectionFormProps {
  open: boolean
  onClose: () => void
}

export default function SectionForm({ open, onClose }: SectionFormProps) {
  const [title, setTitle] = useState('')
  const createSection = useCreateSection()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    createSection.mutate(title.trim(), {
      onSuccess: () => {
        setTitle('')
        onClose()
      },
    })
  }

  return (
    <Drawer.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl outline-none">
          <div className="mx-auto mb-4 mt-3 h-1 w-8 rounded-full bg-slate-300" />
          <div className="px-4 pb-4">
            <Drawer.Title className="mb-4 text-lg font-bold text-slate-900">
              New Section
            </Drawer.Title>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Section name"
                autoFocus
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-base text-slate-800 outline-none transition-colors focus:border-blue-400 focus:bg-white"
              />
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl bg-slate-100 py-2.5 text-sm font-medium text-slate-600 transition-colors active:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!title.trim() || createSection.isPending}
                  className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {createSection.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
