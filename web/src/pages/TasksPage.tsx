import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SectionList from '../components/sections/SectionList'
import SectionForm from '../components/sections/SectionForm'
import FAB from '../components/layout/FAB'

export default function TasksPage() {
  const navigate = useNavigate()
  const [showSectionForm, setShowSectionForm] = useState(false)

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Tasks</h1>
        <button
          onClick={() => setShowSectionForm(true)}
          className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors active:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:active:bg-slate-700"
        >
          + Section
        </button>
      </div>
      <SectionList />
      <FAB onClick={() => navigate('/tasks/create')} />
      <SectionForm open={showSectionForm} onClose={() => setShowSectionForm(false)} />
    </div>
  )
}
