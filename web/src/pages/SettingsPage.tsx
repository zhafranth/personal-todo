import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth-store'
import { useThemeStore } from '../stores/theme-store'
import { usePushNotification } from '../hooks/use-push-notification'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function ProfileCard() {
  const { user } = useAuthStore()
  if (!user) return null

  const initial = user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 dark:border-slate-700 dark:bg-slate-800">
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
        <p className="truncate font-semibold text-slate-900 dark:text-white">{user.name}</p>
        <p className="truncate text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
      </div>
    </div>
  )
}

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-600'
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
      <h2 className="mb-1.5 px-1 text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {title}
      </h2>
      <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-800">
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
      <span className="text-sm text-slate-900 dark:text-slate-100">{label}</span>
      {right}
    </div>
  )
}

function useInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setInstallEvent(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const install = useCallback(async () => {
    if (!installEvent) return
    await installEvent.prompt()
    const { outcome } = await installEvent.userChoice
    if (outcome === 'accepted') {
      setIsInstalled(true)
      setInstallEvent(null)
    }
  }, [installEvent])

  return { canInstall: !!installEvent && !isInstalled, isInstalled, install }
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const { logout } = useAuthStore()
  const { isDark, toggleTheme } = useThemeStore()
  const { status: pushStatus, loading: pushLoading, subscribe, unsubscribe } = usePushNotification()
  const { canInstall, isInstalled, install } = useInstallPrompt()

  const handleSignOut = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const handlePushToggle = () => {
    if (pushStatus === 'subscribed') {
      unsubscribe()
    } else {
      subscribe()
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Settings</h1>

      <div className="mt-6 space-y-6">
        <ProfileCard />

        <SettingsGroup title="Appearance">
          <SettingsRow
            label="Dark Mode"
            right={<ToggleSwitch checked={isDark} onChange={toggleTheme} />}
          />
        </SettingsGroup>

        {pushStatus !== 'unsupported' && (
          <SettingsGroup title="Notifications">
            {pushStatus === 'denied' ? (
              <SettingsRow
                label="Push Notifications"
                right={<span className="text-xs text-slate-400">Blocked — enable in browser settings</span>}
                className="opacity-50"
              />
            ) : (
              <SettingsRow
                label="Push Notifications"
                right={
                  <ToggleSwitch
                    checked={pushStatus === 'subscribed'}
                    onChange={handlePushToggle}
                    disabled={pushLoading}
                  />
                }
              />
            )}
          </SettingsGroup>
        )}

        {(canInstall || isInstalled) && (
          <SettingsGroup title="App">
            <SettingsRow
              label="Install App"
              right={
                isInstalled ? (
                  <span className="text-xs text-green-600">Installed</span>
                ) : (
                  <button
                    onClick={install}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors active:bg-blue-700"
                  >
                    Install
                  </button>
                )
              }
            />
          </SettingsGroup>
        )}

        <SettingsGroup title="About">
          <SettingsRow
            label="Version"
            right={<span className="text-sm text-slate-400 dark:text-slate-500">1.0.0</span>}
          />
        </SettingsGroup>

        <button
          onClick={handleSignOut}
          className="w-full rounded-xl border border-slate-200 bg-white py-3.5 text-sm font-medium text-red-500 transition-colors active:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-red-400 dark:active:bg-slate-700"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
