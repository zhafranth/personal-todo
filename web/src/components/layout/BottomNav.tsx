import { NavLink, useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'

const tabs = [
  {
    to: '/',
    label: 'Tasks',
    icon: (active: boolean) => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={active ? 0 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-[22px] transition-all duration-300"
      >
        {active ? (
          <>
            <path d="M21 5.5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5.5z" opacity={0.15} />
            <path
              d="M9 11l3 3L22 4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
            />
            <path
              d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            />
          </>
        ) : (
          <>
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </>
        )}
      </svg>
    ),
  },
  {
    to: '/calendar',
    label: 'Calendar',
    icon: (active: boolean) => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={active ? 0 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-[22px] transition-all duration-300"
      >
        {active ? (
          <>
            <rect x="3" y="4" width="18" height="18" rx="2" opacity={0.15} />
            <rect
              x="3"
              y="4"
              width="18"
              height="18"
              rx="2"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            />
            <path
              d="M16 2v4M8 2v4M3 10h18"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            />
          </>
        ) : (
          <>
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </>
        )}
      </svg>
    ),
  },
  {
    to: '/notes',
    label: 'Notes',
    icon: (active: boolean) => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={active ? 0 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-[22px] transition-all duration-300"
      >
        {active ? (
          <>
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" opacity={0.15} />
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" fill="none" stroke="currentColor" strokeWidth={2} />
            <polyline points="14 2 14 8 20 8" fill="none" stroke="currentColor" strokeWidth={2} />
            <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth={2} />
            <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth={2} />
          </>
        ) : (
          <>
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </>
        )}
      </svg>
    ),
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: (active: boolean) => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={active ? 0 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-[22px] transition-all duration-300"
      >
        {active ? (
          <>
            <path
              d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z"
              opacity={0.15}
            />
            <path
              d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            />
            <circle
              cx="12"
              cy="12"
              r="3"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            />
          </>
        ) : (
          <>
            <path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </>
        )}
      </svg>
    ),
  },
]

export default function BottomNav() {
  const location = useLocation()
  const navRef = useRef<HTMLDivElement>(null)
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })

  const activeIndex = tabs.findIndex((tab) =>
    tab.to === '/'
      ? location.pathname === '/' || location.pathname === ''
      : location.pathname.startsWith(tab.to),
  )

  useEffect(() => {
    if (!navRef.current || activeIndex < 0) return
    const buttons = navRef.current.querySelectorAll<HTMLAnchorElement>('[data-nav-tab]')
    const activeButton = buttons[activeIndex]
    if (!activeButton) return

    const navRect = navRef.current.getBoundingClientRect()
    const btnRect = activeButton.getBoundingClientRect()

    setIndicatorStyle({
      left: btnRect.left - navRect.left,
      width: btnRect.width,
    })
  }, [activeIndex])

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-5 pointer-events-none">
      <nav
        ref={navRef}
        className="relative flex items-center rounded-full border border-white/30 bg-white/40 px-2 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.4)] backdrop-blur-2xl pointer-events-auto dark:border-slate-700/50 dark:bg-slate-800/60 dark:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.4)]"
      >
        {/* Sliding active indicator */}
        <div
          className="absolute top-1.5 h-[calc(100%-12px)] rounded-full bg-blue-600/10 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] dark:bg-blue-500/20"
          style={{
            left: `${indicatorStyle.left}px`,
            width: `${indicatorStyle.width}px`,
            opacity: activeIndex >= 0 ? 1 : 0,
          }}
        />

        {tabs.map((tab) => {
          const isActive =
            tab.to === '/'
              ? location.pathname === '/' || location.pathname === ''
              : location.pathname.startsWith(tab.to)

          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              data-nav-tab
              className={`relative z-10 flex items-center justify-center px-4 py-3 transition-all duration-300 ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-400 active:text-slate-500 dark:text-slate-500 dark:active:text-slate-400'
              }`}
              aria-label={tab.label}
            >
              {tab.icon(isActive)}
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
