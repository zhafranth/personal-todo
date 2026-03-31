import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth-store'
import { useThemeStore } from '../stores/theme-store'

function ProfileCard() {
  const { user } = useAuthStore()
  if (!user) return null

  const initial = user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4">
      {user.avatar_url ? (
        <img
          src={user.avatar_url}
          alt={user.name}
          className="size-12 rounded-full object-cover"
        />
      ) : (
        <div className="flex size-12 items-center justify-center rounded-full bg-blue-600 text-lg font-semibold text-white">
          {initial}
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-900">{user.name}</p>
        <p className="truncate text-sm text-slate-500">{user.email}</p>
      </div>
    </div>
  )
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${
        checked ? 'bg-blue-600' : 'bg-slate-200'
      }`}
    >
      <span
        className={`pointer-events-none inline-block size-5 translate-y-0.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="mb-1.5 px-1 text-xs font-medium uppercase tracking-wider text-slate-400">
        {title}
      </h2>
      <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white">
        {children}
      </div>
    </div>
  )
}

function SettingsRow({
  label,
  right,
  className = '',
}: {
  label: string
  right: ReactNode
  className?: string
}) {
  return (
    <div className={`flex items-center justify-between px-4 py-3.5 ${className}`}>
      <span className="text-sm text-slate-900">{label}</span>
      {right}
    </div>
  )
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const { logout } = useAuthStore()
  const { isDark, toggleTheme } = useThemeStore()

  const handleSignOut = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>

      <div className="mt-6 space-y-6">
        <ProfileCard />

        <SettingsGroup title="Appearance">
          <SettingsRow
            label="Dark Mode"
            right={<ToggleSwitch checked={isDark} onChange={toggleTheme} />}
          />
        </SettingsGroup>

        <SettingsGroup title="Notifications">
          <SettingsRow
            label="Push Notifications"
            right={<span className="text-xs text-slate-400">Coming soon</span>}
            className="opacity-50"
          />
        </SettingsGroup>

        <SettingsGroup title="About">
          <SettingsRow
            label="Version"
            right={<span className="text-sm text-slate-400">1.0.0</span>}
          />
        </SettingsGroup>

        <button
          onClick={handleSignOut}
          className="w-full rounded-xl border border-slate-200 bg-white py-3.5 text-sm font-medium text-red-500 transition-colors active:bg-slate-50"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
