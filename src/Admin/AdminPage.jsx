import { useEffect, useMemo, useState } from 'react'
import ConfirmDialog from '../Customer/ConfirmDialog.jsx'
import { supabase } from '../lib/supabase.js'
import { AdminSidebar, Icon } from './AdminShell.jsx'
import { browserTimeZone } from './adminShared.js'

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
    setIsSidebarOpen(false)
    if (item.id === 'appointments') {
      window.location.hash = 'appointments'
      return
    }
    if (item.id === 'customers') {
      window.location.hash = 'customers'
      return
    }
    if (item.id === 'barbers') {
      window.location.hash = 'barbers'
      return
    }
    if (item.id === 'services') {
      window.location.hash = 'services'
      return
    }
    setActiveSection(item.id)
    window.location.hash = 'dashboard'
    window.requestAnimationFrame(() => {
      document
        .getElementById(`admin-${item.target || 'overview'}`)
        ?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    })
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
