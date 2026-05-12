import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const tabs = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'past', label: 'Past' },
  { id: 'cancelled', label: 'Cancelled' },
]

const filters = [
  { id: 'all', label: 'All' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
]

function formatMonthShort(date) {
  return date
    .toLocaleDateString(undefined, { month: 'short' })
    .toUpperCase()
}
function formatDay(date) {
  return String(date.getDate()).padStart(2, '0')
}
function formatWeekday(date) {
  return date.toLocaleDateString(undefined, { weekday: 'short' })
}
function formatTime(date) {
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}
function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}
function countdownLabel(scheduledAt) {
  const target = startOfDay(new Date(scheduledAt))
  const today = startOfDay(new Date())
  const days = Math.round((target - today) / 86_400_000)
  if (days < 0) return null
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return `In ${days} days`
}
function mapAppointmentRow(row, kind) {
  const d = new Date(row.scheduled_at || row.visited_at)
  const status =
    kind === 'past'
      ? 'completed'
      : kind === 'cancelled'
        ? 'cancelled'
        : 'confirmed'
  return {
    id: row.id,
    rawRow: row,
    dateObj: d,
    monthShort: formatMonthShort(d),
    day: formatDay(d),
    weekday: formatWeekday(d),
    isoDate: d.toISOString().slice(0, 10),
    service: row.service,
    time: formatTime(d),
    duration: `${row.duration_minutes || 45} min`,
    barber: row.barber?.fullname || 'Barber',
    location: row.location || '-',
    price: Math.round((row.price_cents || 0) / 100),
    status,
    countdown: kind === 'upcoming' ? countdownLabel(row.scheduled_at) : null,
    rating: row.rating || null,
  }
}

function Icon({ name }) {
  const commonProps = {
    'aria-hidden': true,
    className: 'customer-icon',
    viewBox: '0 0 24 24',
    fill: 'none',
  }
  const paths = {
    calendar: (
      <>
        <path d="M6.5 4v3M17.5 4v3M4.75 8.25h14.5M5.75 5.75h12.5v14H5.75z" />
        <path d="M8.75 12h2M13.25 12h2M8.75 15.25h2M13.25 15.25h2" />
      </>
    ),
    'calendar-plus': (
      <>
        <path d="M6.5 4v3M17.5 4v3M4.75 8.25h14.5M5.75 5.75h12.5v14H5.75z" />
        <path d="M12 11.25v5.5M9.25 14h5.5" />
      </>
    ),
    clock: (
      <>
        <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
        <path d="M12 7.5v5l3.25 2" />
      </>
    ),
    rotate: (
      <>
        <path d="M5.75 7.75a7.25 7.25 0 1 1-.6 7.45" />
        <path d="M5.75 3.75v4h4" />
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
    pin: (
      <>
        <path d="M12 21s6-5.1 6-11a6 6 0 0 0-12 0c0 5.9 6 11 6 11Z" />
        <path d="M12 12.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" />
      </>
    ),
    search: (
      <>
        <path d="M10.75 17.25a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Z" />
        <path d="m15.5 15.5 4.25 4.25" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),
    filter: (
      <>
        <path d="M4 6h16" />
        <path d="M7 12h10" />
        <path d="M10 18h4" />
      </>
    ),
    menu: (
      <>
        <path d="M4.5 7h15" />
        <path d="M4.5 12h15" />
        <path d="M4.5 17h15" />
      </>
    ),
    receipt: (
      <>
        <path d="M6.5 4.75h11v14.5l-2-1.1-2 1.1-2-1.1-2 1.1-2-1.1-2 1.1z" />
        <path d="M9 9h6M9 12h6M9 15h3.5" />
      </>
    ),
  }
  return <svg {...commonProps}>{paths[name]}</svg>
}

function StatusBadge({ status }) {
  if (status === 'confirmed') {
    return (
      <span className="apt-status apt-status-confirmed">
        <span className="apt-dot" aria-hidden="true" />
        Confirmed
      </span>
    )
  }
  if (status === 'pending') {
    return (
      <span className="apt-status apt-status-pending">
        <span className="apt-dot" aria-hidden="true" />
        Pending confirmation
      </span>
    )
  }
  if (status === 'completed') {
    return (
      <span className="apt-status apt-status-completed">
        <span className="apt-dot" aria-hidden="true" />
        Completed
      </span>
    )
  }
  if (status === 'cancelled') {
    return (
      <span className="apt-status apt-status-completed">
        <span className="apt-dot" aria-hidden="true" />
        Cancelled
      </span>
    )
  }
  return null
}

function AppointmentRow({ appt, onBook, onCancel, cancelling }) {
  const isCompleted = appt.status === 'completed'

  return (
    <article className="apt-card" aria-label={`${appt.service} on ${appt.isoDate}`}>
      <time className="apt-date" dateTime={appt.isoDate}>
        <span>{appt.monthShort}</span>
        <strong>{appt.day}</strong>
        <small>{appt.weekday}</small>
      </time>

      <div className="apt-body">
        <h3>{appt.service}</h3>
        <p className="apt-meta">
          <span>
            <Icon name="clock" />
            {appt.time} · {appt.duration}
          </span>
          <span>
            <Icon name="user" />
            {appt.barber}
          </span>
          <span>
            <Icon name="pin" />
            {appt.location}
          </span>
        </p>
        <div className="apt-tags">
          <StatusBadge status={appt.status} />
          {appt.countdown && <span className="apt-chip-soft">{appt.countdown}</span>}
          {isCompleted && appt.rating && (
            <span className="apt-chip-soft apt-chip-rated">
              ★ You rated {appt.rating}/5
            </span>
          )}
        </div>
      </div>

      <div className="apt-side">
        <span className="apt-price">${appt.price}</span>
        {appt.status === 'confirmed' && (
          <>
            <button className="apt-btn apt-btn-primary" type="button">
              <Icon name="pin" />
              Get directions
            </button>
            <div className="apt-btn-row">
              <button
                className="apt-btn apt-btn-light"
                type="button"
                onClick={onBook}
              >
                Reschedule
              </button>
              <button
                className="apt-btn apt-btn-danger"
                type="button"
                onClick={() => onCancel?.(appt)}
                disabled={cancelling}
              >
                {cancelling ? 'Cancelling...' : 'Cancel'}
              </button>
            </div>
          </>
        )}
        {appt.status === 'completed' && (
          <>
            <button className="apt-btn apt-btn-primary" type="button" onClick={onBook}>
              Rebook
            </button>
            <div className="apt-btn-row">
              <button className="apt-btn apt-btn-light" type="button">
                <Icon name="receipt" />
                Receipt
              </button>
              <button className="apt-btn apt-btn-light" type="button">
                Tip again
              </button>
            </div>
          </>
        )}
        {appt.status === 'cancelled' && (
          <button
            className="apt-btn apt-btn-primary"
            type="button"
            onClick={onBook}
          >
            Rebook
          </button>
        )}
      </div>
    </article>
  )
}

export default function MyAppointmentsPage({ onOpenSidebar, onNavigate, session }) {
  const [activeTab, setActiveTab] = useState('upcoming')
  const [activeFilter, setActiveFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [upcomingRows, setUpcomingRows] = useState([])
  const [pastRows, setPastRows] = useState([])
  const [cancelledRows, setCancelledRows] = useState([])
  const [loyaltyPoints, setLoyaltyPoints] = useState(0)
  const [cancellingId, setCancellingId] = useState(null)
  const [refreshTick, setRefreshTick] = useState(0)

  const userId = session?.user?.id

  useEffect(() => {
    if (!userId) return undefined
    let cancelled = false
    const nowIso = new Date().toISOString()
    const select = `
      id, service, scheduled_at, duration_minutes, location, price_cents, status, notes,
      barber:barbers ( id, fullname, initials, specialty, location )
    `

    Promise.all([
      supabase
        .from('appointments')
        .select(select)
        .eq('customer_id', userId)
        .eq('status', 'scheduled')
        .gte('scheduled_at', nowIso)
        .order('scheduled_at', { ascending: true }),
      supabase
        .from('visits')
        .select(
          'id, service, visited_at, location, price_cents, rating, barber:barbers ( id, fullname )',
        )
        .eq('customer_id', userId)
        .order('visited_at', { ascending: false }),
      supabase
        .from('appointments')
        .select(select)
        .eq('customer_id', userId)
        .in('status', ['cancelled', 'no_show'])
        .order('scheduled_at', { ascending: false }),
      supabase
        .from('customers')
        .select('loyalty_points')
        .eq('id', userId)
        .single(),
    ]).then(([up, past, cncl, cust]) => {
      if (cancelled) return
      setUpcomingRows((up.data || []).map((r) => mapAppointmentRow(r, 'upcoming')))
      setPastRows((past.data || []).map((r) => mapAppointmentRow(r, 'past')))
      setCancelledRows((cncl.data || []).map((r) => mapAppointmentRow(r, 'cancelled')))
      setLoyaltyPoints(cust.data?.loyalty_points || 0)
    })

    return () => {
      cancelled = true
    }
  }, [userId, refreshTick])

  const tabRows = {
    upcoming: upcomingRows,
    past: pastRows,
    cancelled: cancelledRows,
  }[activeTab]

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const now = new Date()
    const weekFromNow = new Date(now)
    weekFromNow.setDate(weekFromNow.getDate() + 7)
    const monthFromNow = new Date(now)
    monthFromNow.setMonth(monthFromNow.getMonth() + 1)

    return tabRows.filter((a) => {
      // text search
      if (
        q &&
        ![a.service, a.barber, a.location]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(q))
      ) {
        return false
      }
      // date filter — only meaningful for upcoming
      if (activeTab === 'upcoming') {
        if (activeFilter === 'week' && a.dateObj > weekFromNow) return false
        if (activeFilter === 'month' && a.dateObj > monthFromNow) return false
      }
      return true
    })
  }, [tabRows, activeTab, activeFilter, query])

  const recentlyCompleted = useMemo(
    () => (activeTab === 'upcoming' ? pastRows.slice(0, 2) : []),
    [activeTab, pastRows],
  )

  const goBook = () => onNavigate?.('book')

  const handleCancel = async (appt) => {
    if (!appt?.id) return
    if (!window.confirm('Cancel this appointment? You can rebook from this page.')) return
    setCancellingId(appt.id)
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', appt.id)
      .eq('customer_id', userId)
    setCancellingId(null)
    if (error) {
      window.alert(`Couldn't cancel: ${error.message}`)
      return
    }
    setRefreshTick((t) => t + 1)
  }

  // Live stats
  const yearStart = new Date(new Date().getFullYear(), 0, 1)
  const visitsThisYear = pastRows.filter((v) => v.dateObj >= yearStart).length
  const nextAppt = upcomingRows[0]
  const daysUntilNext = nextAppt
    ? Math.max(
        0,
        Math.round((startOfDay(nextAppt.dateObj) - startOfDay(new Date())) / 86_400_000),
      )
    : null

  const stats = [
    {
      id: 'upcoming',
      icon: 'calendar',
      value: String(upcomingRows.length),
      label: 'Upcoming',
    },
    {
      id: 'next',
      icon: 'clock',
      value: daysUntilNext != null ? String(daysUntilNext) : '-',
      suffix: daysUntilNext != null ? 'd' : null,
      label: 'Until next cut',
    },
    {
      id: 'visits',
      icon: 'rotate',
      value: String(visitsThisYear),
      label: 'Total this year',
    },
    {
      id: 'loyalty',
      icon: 'star',
      value: loyaltyPoints.toLocaleString(),
      label: 'Loyalty points',
    },
  ]

  const tabCounts = {
    upcoming: upcomingRows.length,
    past: pastRows.length,
    cancelled: cancelledRows.length,
  }

  return (
    <section className="customer-main apt-page" aria-label="My appointments">
      <button
        aria-label="Open navigation"
        className="customer-square-button customer-mobile-menu-button apt-mobile-menu"
        type="button"
        onClick={onOpenSidebar}
      >
        <Icon name="menu" />
      </button>

      <nav className="apt-breadcrumb" aria-label="Breadcrumb">
        <a
          href="#dashboard"
          onClick={(event) => {
            event.preventDefault()
            onNavigate?.('dashboard')
          }}
        >
          Home
        </a>
        <span aria-hidden="true">/</span>
        <span>My appointments</span>
      </nav>

      <header className="apt-header">
        <div className="apt-heading">
          <h1>
            My <span>appointments.</span>
          </h1>
          <p>Everything on your calendar at Blade & Co. — past, present, and upcoming.</p>
        </div>
        <button className="apt-btn apt-btn-primary apt-cta" type="button" onClick={goBook}>
          <Icon name="plus" />
          New booking
        </button>
      </header>

      <div className="apt-stats">
        {stats.map((stat) => (
          <article className="apt-stat" key={stat.id}>
            <span className="apt-stat-icon">
              <Icon name={stat.icon} />
            </span>
            <div>
              <strong>
                {stat.value}
                {stat.suffix && <small>{stat.suffix}</small>}
              </strong>
              <small>{stat.label}</small>
            </div>
          </article>
        ))}
      </div>

      <div className="apt-tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            className={`apt-tab${activeTab === tab.id ? ' is-active' : ''}`}
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.label}</span>
            <span className="apt-tab-count">{tabCounts[tab.id]}</span>
          </button>
        ))}
      </div>

      <div className="apt-toolbar">
        <div className="apt-chip-group" role="tablist" aria-label="Date filter">
          {filters.map((f) => (
            <button
              className={`apt-chip${activeFilter === f.id ? ' is-active' : ''}`}
              key={f.id}
              type="button"
              onClick={() => setActiveFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
          <button className="apt-chip apt-chip-filter" type="button">
            <Icon name="filter" />
            Filters
          </button>
        </div>

        <label className="apt-search" htmlFor="apt-search-input">
          <Icon name="search" />
          <span className="sr-only">Search by service or barber</span>
          <input
            id="apt-search-input"
            type="search"
            placeholder="Search by service or barber..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      <div className="apt-list">
        {visible.length === 0 ? (
          <p className="apt-empty">
            {activeTab === 'upcoming'
              ? "Nothing booked yet. Hit \"+ New booking\" to set up your next cut."
              : activeTab === 'past'
                ? 'No completed visits yet. Once a cut wraps up it shows up here.'
                : 'No cancelled appointments. Clean slate.'}
          </p>
        ) : (
          visible.map((appt) => (
            <AppointmentRow
              appt={appt}
              key={appt.id}
              onBook={goBook}
              onCancel={handleCancel}
              cancelling={cancellingId === appt.id}
            />
          ))
        )}
      </div>

      {recentlyCompleted.length > 0 && (
        <>
          <h2 className="apt-section-heading">Recently completed</h2>
          <div className="apt-list">
            {recentlyCompleted.map((appt) => (
              <AppointmentRow appt={appt} key={`done-${appt.id}`} onBook={goBook} />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
