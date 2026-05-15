import { useEffect, useMemo, useState } from 'react'
import ConfirmDialog from '../Customer/ConfirmDialog.jsx'
import { supabase } from '../lib/supabase.js'

const adminNavSections = [
  {
    items: [
      { id: 'dashboard', target: 'overview', icon: 'home', label: 'Dashboard' },
      { id: 'appointments', target: 'bookings', icon: 'calendar', label: 'Appointments' },
      { id: 'customers', target: 'overview', icon: 'customers', label: 'Customers' },
      { id: 'barbers', target: 'availability', icon: 'scissors', label: 'Barbers' },
      { id: 'services', target: 'overview', icon: 'services', label: 'Services' },
      { id: 'schedule', target: 'availability', icon: 'clock', label: 'Schedule' },
    ],
  },
  {
    label: 'REVENUE',
    items: [
      { id: 'transactions', target: 'revenue', icon: 'dollar', label: 'Transactions' },
      { id: 'reports', target: 'revenue', icon: 'reports', label: 'Reports' },
    ],
  },
  {
    label: 'ENGAGE',
    items: [
      { id: 'loyalty', target: 'overview', icon: 'star', label: 'Loyalty' },
      { id: 'perks', target: 'overview', icon: 'gift', label: 'Perks' },
      { id: 'notifications', target: 'overview', icon: 'bell', label: 'Notifications' },
    ],
  },
  {
    divider: true,
    items: [{ id: 'settings', target: 'overview', icon: 'settings', label: 'Settings' }],
  },
]

const emptyDashboard = {
  date: null,
  generatedAt: null,
  metrics: {
    todayBookingsCount: 0,
    revenueCents: 0,
    walkInsCount: 0,
    upcomingAppointmentsCount: 0,
    availableBarbersCount: 0,
  },
  upcomingAppointments: [],
  barberAvailability: [],
  recentWalkIns: [],
}

function iconPath(name) {
  const paths = {
    home: (
      <>
        <path d="m4 10 8-6 8 6" />
        <path d="M6.5 9.5V20h11V9.5" />
        <path d="M10 20v-6h4v6" />
      </>
    ),
    calendar: (
      <>
        <path d="M6.5 4v3M17.5 4v3M4.75 8.25h14.5M5.75 5.75h12.5v14H5.75z" />
        <path d="M8.75 12h2M13.25 12h2M8.75 15.25h2M13.25 15.25h2" />
      </>
    ),
    dollar: (
      <>
        <path d="M12 3.75v16.5" />
        <path d="M16.5 7.25c-.65-.8-1.85-1.25-3.2-1.25-2.05 0-3.55.9-3.55 2.35 0 3.45 6.95 1.9 6.95 5.55 0 1.75-1.75 2.85-4.05 2.85-1.75 0-3.35-.58-4.15-1.7" />
      </>
    ),
    walkin: (
      <>
        <path d="M8.75 5.75a2.5 2.5 0 1 0 5 0 2.5 2.5 0 0 0-5 0Z" />
        <path d="M7.5 20.25 9 13.5l-2.25 1.25" />
        <path d="m11.25 10.25 2 3.25 3 .9" />
        <path d="m12.5 20.25 1.25-5.75" />
      </>
    ),
    scissors: (
      <>
        <circle cx="6.75" cy="7.5" r="2.25" />
        <circle cx="6.75" cy="16.5" r="2.25" />
        <path d="M8.75 8.55 19 17.75" />
        <path d="M8.75 15.45 19 6.25" />
      </>
    ),
    customers: (
      <>
        <path d="M9.75 11.75a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Z" />
        <path d="M3.75 20a6 6 0 0 1 12 0" />
        <path d="M16.25 11.75a2.65 2.65 0 1 0 0-5.3" />
        <path d="M17.25 19.25a4.6 4.6 0 0 0-2.2-3.9" />
      </>
    ),
    services: (
      <>
        <path d="M5.5 6.25h13" />
        <path d="M5.5 12h13" />
        <path d="M5.5 17.75h13" />
        <path d="M8.25 4.5v3.5M15.75 10.25v3.5M11.25 16v3.5" />
      </>
    ),
    clock: (
      <>
        <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
        <path d="M12 7.5v5l3.25 2" />
      </>
    ),
    refresh: (
      <>
        <path d="M5.75 7.75a7.25 7.25 0 1 1-.6 7.45" />
        <path d="M5.75 3.75v4h4" />
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
    user: (
      <>
        <path d="M12 12.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        <path d="M4.75 20a7.25 7.25 0 0 1 14.5 0" />
      </>
    ),
    reports: (
      <>
        <path d="M5.75 4.75h12.5v14.5H5.75z" />
        <path d="M8.75 9h6.5" />
        <path d="M8.75 12h6.5" />
        <path d="M8.75 15h3.5" />
      </>
    ),
    star: (
      <path d="m12 4 2.35 4.75 5.25.77-3.8 3.7.9 5.22L12 15.97l-4.7 2.47.9-5.22-3.8-3.7 5.25-.77z" />
    ),
    gift: (
      <>
        <path d="M4.75 10.25h14.5v9H4.75z" />
        <path d="M3.75 6.75h16.5v3.5H3.75z" />
        <path d="M12 6.75v12.5" />
        <path d="M12 6.75c-1.5-3.5-5.25-2.6-4.25.15 1 2.15 4.25-.15 4.25-.15Z" />
        <path d="M12 6.75c1.5-3.5 5.25-2.6 4.25.15-1 2.15-4.25-.15-4.25-.15Z" />
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
        <circle cx="12" cy="12" r="2.75" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </>
    ),
  }
  return paths[name] || paths.home
}

function Icon({ name }) {
  return (
    <svg aria-hidden="true" className="customer-icon" viewBox="0 0 24 24" fill="none">
      {iconPath(name)}
    </svg>
  )
}

function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Singapore'
  } catch {
    return 'Asia/Singapore'
  }
}

function normalizeDashboard(data) {
  if (!data || typeof data !== 'object') return emptyDashboard
  return {
    ...emptyDashboard,
    ...data,
    metrics: { ...emptyDashboard.metrics, ...(data.metrics || {}) },
    upcomingAppointments: Array.isArray(data.upcomingAppointments) ? data.upcomingAppointments : [],
    barberAvailability: Array.isArray(data.barberAvailability) ? data.barberAvailability : [],
    recentWalkIns: Array.isArray(data.recentWalkIns) ? data.recentWalkIns : [],
  }
}

function formatMoney(cents) {
  return `$${((Number(cents) || 0) / 100).toFixed(2)}`
}

function formatTime(iso) {
  if (!iso) return '-'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function AdminSidebar({
  activeId,
  isOpen,
  onClose,
  onSelect,
  onLogoutRequest,
  upcomingCount,
}) {
  return (
    <aside className={`customer-sidebar${isOpen ? ' is-open' : ''}`} aria-label="Admin navigation">
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

      {adminNavSections.map((section, index) => (
        <div
          className={`customer-nav-section${section.divider ? ' admin-nav-separated' : ''}`}
          key={section.label || `admin-primary-${index}`}
        >
          {section.label && <p className="customer-nav-label">{section.label}</p>}
          <nav aria-label={section.label ? `${section.label} sections` : 'Admin primary sections'}>
            {section.items.map((item) => (
              <a
                className={`customer-nav-item${activeId === item.id ? ' is-active' : ''}`}
                href={`#admin-${item.target}`}
                key={item.id}
                onClick={(event) => {
                  event.preventDefault()
                  onSelect(item)
                }}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
                {item.id === 'appointments' && upcomingCount > 0 && (
                  <span className="customer-nav-badge">{upcomingCount}</span>
                )}
              </a>
            ))}
          </nav>
        </div>
      ))}

      <button className="customer-logout-foot" type="button" onClick={onLogoutRequest}>
        <span className="customer-logout-icon">
          <Icon name="logout" />
        </span>
        <span className="customer-logout-text">
          <strong>Log out</strong>
          <small>End admin session</small>
        </span>
      </button>
    </aside>
  )
}

function StatCard({ icon, label, value, meta, tone = 'default' }) {
  return (
    <article className={`admin-stat-card is-${tone}`}>
      <span className="admin-stat-icon">
        <Icon name={icon} />
      </span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <span>{meta}</span>
      </div>
    </article>
  )
}

function EmptyBlock({ children }) {
  return <div className="admin-empty">{children}</div>
}

export default function AdminPage({ session, onLogout }) {
  const email = session?.user?.email || 'admin'
  const timeZone = useMemo(() => browserTimeZone(), [])
  const [activeSection, setActiveSection] = useState('dashboard')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false)
  const [dashboard, setDashboard] = useState(emptyDashboard)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async (showLoading = false) => {
      if (showLoading) {
        queueMicrotask(() => {
          if (!cancelled) setLoading(true)
        })
      }
      const { data, error: rpcError } = await supabase.rpc('get_admin_dashboard', {
        p_timezone: timeZone,
      })
      if (cancelled) return
      if (rpcError) {
        setError(rpcError.message)
        setLoading(false)
        return
      }
      setDashboard(normalizeDashboard(data))
      setError('')
      setLoading(false)
    }

    load(true)
    const intervalId = window.setInterval(() => load(false), 60_000)
    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [timeZone])

  const refresh = async () => {
    setLoading(true)
    const { data, error: rpcError } = await supabase.rpc('get_admin_dashboard', {
      p_timezone: timeZone,
    })
    if (rpcError) {
      setError(rpcError.message)
      setLoading(false)
      return
    }
    setDashboard(normalizeDashboard(data))
    setError('')
    setLoading(false)
  }

  const metrics = dashboard.metrics
  const availableNow = dashboard.barberAvailability.filter(
    (barber) => barber.status !== 'No hours today',
  ).length
  const nextAppointment = dashboard.upcomingAppointments[0]

  const handleSidebarSelect = (item) => {
    setActiveSection(item.id)
    setIsSidebarOpen(false)
    document
      .getElementById(`admin-${item.target || item.id}`)
      ?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }

  return (
    <main className="customer-dashboard admin-page">
      <AdminSidebar
        activeId={activeSection}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelect={handleSidebarSelect}
        onLogoutRequest={() => setIsLogoutDialogOpen(true)}
        upcomingCount={metrics.upcomingAppointmentsCount}
      />
      <button
        aria-label="Close navigation"
        className={`customer-sidebar-backdrop${isSidebarOpen ? ' is-open' : ''}`}
        type="button"
        onClick={() => setIsSidebarOpen(false)}
      />

      <section className="admin-main" aria-label="Admin dashboard">
        <button
          aria-label="Open navigation"
          className="customer-square-button customer-mobile-menu-button admin-mobile-menu"
          type="button"
          onClick={() => setIsSidebarOpen(true)}
        >
          <Icon name="menu" />
        </button>

        <header className="admin-header" id="admin-overview">
          <div>
            <p className="customer-eyebrow">Operator dashboard</p>
            <h1>
              Admin <span>panel.</span>
            </h1>
            <p>
              Today&apos;s bookings, revenue, walk-ins, upcoming appointments, and barber
              availability in one operational view.
            </p>
          </div>
          <div className="admin-header-actions">
            <span className="admin-user-pill">{email}</span>
            <button className="admin-refresh" type="button" onClick={refresh} disabled={loading}>
              <Icon name="refresh" />
              {loading ? 'Refreshing' : 'Refresh'}
            </button>
          </div>
        </header>

        {error && (
          <section className="admin-alert" role="alert">
            <strong>Admin data did not load.</strong>
            <span>{error}</span>
            <small>Run `supabase/migrations/0008_admin_dashboard.sql` in Supabase SQL Editor.</small>
          </section>
        )}

        <section className="admin-stat-grid" aria-label="Today metrics">
          <StatCard
            icon="calendar"
            label="Today's bookings"
            value={loading ? '...' : metrics.todayBookingsCount}
            meta="Scheduled and completed visits"
            tone="gold"
          />
          <StatCard
            icon="dollar"
            label="Revenue"
            value={loading ? '...' : formatMoney(metrics.revenueCents)}
            meta="Visits plus served walk-ins"
          />
          <StatCard
            icon="walkin"
            label="Walk-ins"
            value={loading ? '...' : metrics.walkInsCount}
            meta="Served without appointment"
          />
          <StatCard
            icon="clock"
            label="Upcoming"
            value={loading ? '...' : metrics.upcomingAppointmentsCount}
            meta={nextAppointment ? `Next at ${formatTime(nextAppointment.scheduledAt)}` : 'No queued bookings'}
          />
          <StatCard
            icon="scissors"
            label="Barber availability"
            value={loading ? '...' : `${availableNow}/${dashboard.barberAvailability.length}`}
            meta={`${metrics.availableBarbersCount} with hours today`}
          />
        </section>

        <div className="admin-grid">
          <section className="admin-panel admin-panel-wide" id="admin-bookings">
            <div className="admin-panel-head">
              <div>
                <p className="customer-eyebrow">Upcoming appointments</p>
                <h2>Booking flow</h2>
              </div>
              <span>{dashboard.upcomingAppointments.length} shown</span>
            </div>

            {dashboard.upcomingAppointments.length === 0 ? (
              <EmptyBlock>No upcoming appointments are scheduled.</EmptyBlock>
            ) : (
              <div className="admin-appointment-list">
                {dashboard.upcomingAppointments.map((appointment) => (
                  <article className="admin-appointment" key={appointment.id}>
                    <span className="admin-appointment-time">
                      {formatTime(appointment.scheduledAt)}
                    </span>
                    <div>
                      <strong>{appointment.service}</strong>
                      <small>
                        {appointment.customerName || 'Customer'} with{' '}
                        {appointment.barberName || 'Unassigned'}
                      </small>
                    </div>
                    <span className="admin-chip">{appointment.status}</span>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="admin-panel" id="admin-revenue">
            <div className="admin-panel-head">
              <div>
                <p className="customer-eyebrow">Revenue</p>
                <h2>Today</h2>
              </div>
            </div>
            <div className="admin-revenue-total">{formatMoney(metrics.revenueCents)}</div>
            <p className="admin-muted">
              Revenue is calculated from completed visits and served walk-ins for the current day.
            </p>
          </section>

          <section className="admin-panel" id="admin-walkins">
            <div className="admin-panel-head">
              <div>
                <p className="customer-eyebrow">Walk-ins</p>
                <h2>Recent</h2>
              </div>
              <span>{metrics.walkInsCount} today</span>
            </div>
            {dashboard.recentWalkIns.length === 0 ? (
              <EmptyBlock>No walk-ins recorded today.</EmptyBlock>
            ) : (
              <div className="admin-mini-list">
                {dashboard.recentWalkIns.map((walkIn) => (
                  <article key={walkIn.id}>
                    <strong>{walkIn.customerName}</strong>
                    <span>
                      {walkIn.service} · {formatMoney(walkIn.priceCents)}
                    </span>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="admin-panel admin-panel-wide" id="admin-availability">
            <div className="admin-panel-head">
              <div>
                <p className="customer-eyebrow">Barber availability</p>
                <h2>Today&apos;s chair plan</h2>
              </div>
              <span>{dashboard.barberAvailability.length} active barbers</span>
            </div>

            {dashboard.barberAvailability.length === 0 ? (
              <EmptyBlock>No active barbers are available.</EmptyBlock>
            ) : (
              <div className="admin-barber-grid">
                {dashboard.barberAvailability.map((barber) => (
                  <article className="admin-barber-card" key={barber.barberId}>
                    <div className="admin-barber-top">
                      <span className="admin-avatar">{barber.initials || '?'}</span>
                      <div>
                        <strong>{barber.name}</strong>
                        <small>{barber.specialty || barber.location || 'Barber'}</small>
                      </div>
                      <span
                        className={`admin-chip ${
                          barber.status === 'No hours today' ? 'is-muted' : 'is-live'
                        }`}
                      >
                        {barber.status}
                      </span>
                    </div>
                    <dl className="admin-barber-facts">
                      <div>
                        <dt>Bookings</dt>
                        <dd>{barber.todayBookingsCount}</dd>
                      </div>
                      <div>
                        <dt>Walk-ins</dt>
                        <dd>{barber.walkInsToday}</dd>
                      </div>
                      <div>
                        <dt>Next</dt>
                        <dd>{barber.nextAppointmentAt ? formatTime(barber.nextAppointmentAt) : '-'}</dd>
                      </div>
                    </dl>
                    <div className="admin-window-list">
                      {(barber.windows || []).length === 0 ? (
                        <span>No working window set</span>
                      ) : (
                        barber.windows.map((window) => (
                          <span key={`${window.startTime}-${window.endTime}`}>
                            {window.startTime} - {window.endTime}
                          </span>
                        ))
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>

      {isLogoutDialogOpen && (
        <ConfirmDialog
          title="Log out of admin?"
          description="You will return to the sign-in page."
          cancelLabel="Stay signed in"
          confirmLabel="Yes, log out"
          onCancel={() => setIsLogoutDialogOpen(false)}
          onConfirm={() => {
            setIsLogoutDialogOpen(false)
            onLogout?.()
          }}
        />
      )}
    </main>
  )
}
