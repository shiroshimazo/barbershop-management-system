import { useState } from 'react'

const navItems = [
  { id: 'dashboard', icon: 'home', label: 'Home' },
  { id: 'book', icon: 'calendar-plus', label: 'Book appointment' },
  { id: 'appointments', icon: 'calendar', label: 'My appointments', badge: 2 },
  { id: 'history', icon: 'history', label: 'History' },
  { id: 'favourites', icon: 'star', label: 'Favourites' },
]

const accountItems = [
  { id: 'profile', icon: 'user', label: 'My profile' },
  { id: 'notifications', icon: 'bell', label: 'Notifications', badge: 1 },
  { id: 'settings', icon: 'settings', label: 'Settings' },
]

function Icon({ name }) {
  const commonProps = {
    'aria-hidden': true,
    className: 'customer-icon',
    viewBox: '0 0 24 24',
    fill: 'none',
  }
  const paths = {
    home: (
      <>
        <path d="m4 10 8-6 8 6" />
        <path d="M6.5 9.5V20h11V9.5" />
        <path d="M10 20v-6h4v6" />
      </>
    ),
    'calendar-plus': (
      <>
        <path d="M6.5 4v3M17.5 4v3M4.75 8.25h14.5M5.75 5.75h12.5v14H5.75z" />
        <path d="M12 11.25v5.5M9.25 14h5.5" />
      </>
    ),
    calendar: (
      <>
        <path d="M6.5 4v3M17.5 4v3M4.75 8.25h14.5M5.75 5.75h12.5v14H5.75z" />
        <path d="M8.75 12h2M13.25 12h2M8.75 15.25h2M13.25 15.25h2" />
      </>
    ),
    history: (
      <>
        <path d="M4.5 7.25V3.75M4.5 7.25h3.5" />
        <path d="M5.15 7.5a7.25 7.25 0 1 1 .75 9" />
        <path d="M12 8v4.4l3 1.8" />
      </>
    ),
    star: (
      <path d="m12 4 2.35 4.75 5.25.77-3.8 3.7.9 5.22L12 15.97l-4.7 2.47.9-5.22-3.8-3.7 5.25-.77z" />
    ),
    user: (
      <>
        <path d="M12 12.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        <path d="M4.75 20a7.25 7.25 0 0 1 14.5 0" />
      </>
    ),
    bell: (
      <>
        <path d="M18.25 16.25H5.75l1.4-1.9V10a4.85 4.85 0 0 1 9.7 0v4.35z" />
        <path d="M10 18.25a2 2 0 0 0 4 0" />
      </>
    ),
    settings: (
      <>
        <path d="M12 15.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Z" />
        <path d="m18.45 13.35.95 1.82-2.3 2.3-1.82-.95a7.4 7.4 0 0 1-1.45.6L13.2 19.1H9.95l-.62-1.98a7.4 7.4 0 0 1-1.45-.6l-1.82.95-2.3-2.3.95-1.82a7.4 7.4 0 0 1-.6-1.45L2.13 11.3V8.05l1.98-.62c.15-.5.35-.98.6-1.45l-.95-1.82 2.3-2.3 1.82.95c.47-.25.95-.45 1.45-.6l.62-1.98h3.25l.63 1.98c.5.15.98.35 1.45.6l1.82-.95 2.3 2.3-.95 1.82c.25.47.45.95.6 1.45l1.98.62v3.25l-1.98.6c-.15.5-.35.98-.6 1.45Z" />
      </>
    ),
    search: (
      <>
        <path d="M10.75 17.25a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Z" />
        <path d="m15.5 15.5 4.25 4.25" />
      </>
    ),
    menu: (
      <>
        <path d="M4.5 7h15" />
        <path d="M4.5 12h15" />
        <path d="M4.5 17h15" />
      </>
    ),
    close: (
      <>
        <path d="M6.5 6.5 17.5 17.5" />
        <path d="m17.5 6.5-11 11" />
      </>
    ),
    logout: (
      <>
        <path d="M10 5.25H5.75v13.5H10" />
        <path d="M13.25 8.25 17 12l-3.75 3.75" />
        <path d="M17 12H8.75" />
      </>
    ),
  }
  return <svg {...commonProps}>{paths[name]}</svg>
}

function SidebarSection({ label, items, activeId, onNavigate }) {
  return (
    <div className="customer-nav-section">
      {label && <p className="customer-nav-label">{label}</p>}
      <nav aria-label={label || 'Primary'}>
        {items.map((item) => (
          <a
            className={`customer-nav-item${activeId === item.id ? ' is-active' : ''}`}
            href={`#${item.id}`}
            key={item.id}
            onClick={(event) => {
              event.preventDefault()
              onNavigate?.(item.id)
            }}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
            {item.badge && <span className="customer-nav-badge">{item.badge}</span>}
          </a>
        ))}
      </nav>
    </div>
  )
}

function CustomerSidebar({ activeId, isOpen, onClose, onNavigate, onLogoutRequest }) {
  return (
    <aside
      className={`customer-sidebar${isOpen ? ' is-open' : ''}`}
      aria-label="Customer navigation"
    >
      <div className="customer-brand">
        <span className="customer-brand-mark">B</span>
        <strong>BLADE & CO.</strong>
        <button
          aria-label="Close navigation"
          className="customer-sidebar-close"
          type="button"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>

      <SidebarSection items={navItems} activeId={activeId} onNavigate={onNavigate} />
      <SidebarSection
        label="Account"
        items={accountItems}
        activeId={activeId}
        onNavigate={onNavigate}
      />

      <button
        className="customer-nav-item customer-logout-item"
        type="button"
        onClick={onLogoutRequest}
      >
        <Icon name="logout" />
        <span>Log out</span>
      </button>

      <div className="customer-user-foot">
        <span className="customer-avatar">M</span>
        <span>
          <strong>Marcus R.</strong>
          <small>Member - Gold</small>
        </span>
        <button aria-label="Open account menu" type="button">
          ...
        </button>
      </div>
    </aside>
  )
}

function LogoutDialog({ onCancel, onConfirm }) {
  return (
    <div className="customer-modal-backdrop" role="presentation">
      <section
        aria-labelledby="logout-dialog-heading"
        aria-modal="true"
        className="customer-logout-modal"
        role="dialog"
      >
        <h2 id="logout-dialog-heading">Are you sure want to log out?</h2>
        <p>You will return to the sign in page.</p>
        <div className="customer-modal-actions">
          <button
            className="customer-button customer-button-cancel"
            type="button"
            onClick={onCancel}
          >
            No
          </button>
          <button
            className="customer-button customer-button-primary"
            type="button"
            onClick={onConfirm}
          >
            Yes, log out
          </button>
        </div>
      </section>
    </div>
  )
}

export default function CustomerShell({ activeNav, onNavigate, onLogout, children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false)

  const openLogoutDialog = () => {
    setIsSidebarOpen(false)
    setIsLogoutDialogOpen(true)
  }

  const confirmLogout = () => {
    setIsLogoutDialogOpen(false)
    onLogout?.()
  }

  const handleNavigate = (id) => {
    setIsSidebarOpen(false)
    onNavigate?.(id)
  }

  return (
    <main className="customer-dashboard">
      <CustomerSidebar
        activeId={activeNav}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onNavigate={handleNavigate}
        onLogoutRequest={openLogoutDialog}
      />
      <button
        aria-label="Close navigation"
        className={`customer-sidebar-backdrop${isSidebarOpen ? ' is-open' : ''}`}
        type="button"
        onClick={() => setIsSidebarOpen(false)}
      />
      {typeof children === 'function'
        ? children({ onOpenSidebar: () => setIsSidebarOpen(true) })
        : children}
      {isLogoutDialogOpen && (
        <LogoutDialog
          onCancel={() => setIsLogoutDialogOpen(false)}
          onConfirm={confirmLogout}
        />
      )}
    </main>
  )
}

export { Icon }
