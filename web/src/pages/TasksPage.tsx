import { useState } from 'react'
import SectionList from '../components/sections/SectionList'
import SectionForm from '../components/sections/SectionForm'
import TaskForm from '../components/tasks/TaskForm'
import FAB from '../components/layout/FAB'

export default function TasksPage() {
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [showSectionForm, setShowSectionForm] = useState(false)

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tasks</h1>
        <button
          onClick={() => setShowSectionForm(true)}
          className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors active:bg-slate-200"
        >
          + Section
        </button>
      </div>
      <SectionList />
      <FAB onClick={() => setShowTaskForm(true)} />
      <TaskForm open={showTaskForm} onClose={() => setShowTaskForm(false)} />
      <SectionForm open={showSectionForm} onClose={() => setShowSectionForm(false)} />
    </div>
  )
}
