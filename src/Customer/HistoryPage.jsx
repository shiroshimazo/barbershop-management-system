import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const chips = [
  { id: 'all', label: 'All' },
  { id: 'month', label: 'This month' },
  { id: 'year', label: 'This year' },
]

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function mapVisit(row) {
  const d = new Date(row.visited_at)
  const monthShort = d
    .toLocaleDateString(undefined, { month: 'short' })
    .toUpperCase()
  const weekday = d.toLocaleDateString(undefined, { weekday: 'short' })
  const time = d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
  const monthLabel = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
  return {
    id: row.id,
    dateObj: d,
    monthKey: `${d.getFullYear()}-${d.getMonth()}`,
    monthLabel,
    monthShort,
    day: String(d.getDate()).padStart(2, '0'),
    weekday,
    isoDate: d.toISOString().slice(0, 10),
    service: row.service,
    time,
    duration: `${row.duration_minutes || 45} min`,
    barber: row.barber?.fullname || 'Barber',
    location: row.location || '-',
    price: Math.round((row.price_cents || 0) / 100),
    status: 'Completed',
    rating: row.rating ? `${row.rating}/5` : null,
    when: `${weekday}, ${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getDate()} · ${time}`,
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
    history: (
      <>
        <path d="M4.5 7.25V3.75M4.5 7.25h3.5" />
        <path d="M5.15 7.5a7.25 7.25 0 1 1 .75 9" />
        <path d="M12 8v4.4l3 1.8" />
      </>
    ),
    receipt: (
      <>
        <path d="M6.5 4.75h11v14.5l-2-1.1-2 1.1-2-1.1-2 1.1-2-1.1-2 1.1z" />
        <path d="M9 9h6M9 12h6M9 15h3.5" />
      </>
    ),
    document: (
      <>
        <path d="M7 3.75h7.5L18.25 7.5V20.25H7Z" />
        <path d="M14 3.75V8h4.25" />
        <path d="M9.5 12h7M9.5 15h7M9.5 18h4" />
      </>
    ),
    star: (
      <path d="m12 4 2.35 4.75 5.25.77-3.8 3.7.9 5.22L12 15.97l-4.7 2.47.9-5.22-3.8-3.7 5.25-.77z" />
    ),
    clock: (
      <>
        <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
        <path d="M12 7.5v5l3.25 2" />
      </>
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
    download: (
      <>
        <path d="M12 4v11" />
        <path d="m7.75 10.75 4.25 4.25 4.25-4.25" />
        <path d="M5 19.25h14" />
      </>
    ),
    menu: (
      <>
        <path d="M4.5 7h15" />
        <path d="M4.5 12h15" />
        <path d="M4.5 17h15" />
      </>
    ),
  }
  return <svg {...commonProps}>{paths[name]}</svg>
}

function VisitCard({ visit, selected, onSelect, onRebook }) {
  return (
    <article
      className={`hist-visit${selected ? ' is-selected' : ''}`}
      aria-label={`${visit.service} on ${visit.isoDate}`}
      onClick={() => onSelect(visit.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(visit.id)
        }
      }}
    >
      <time className="hist-date" dateTime={visit.isoDate}>
        <span>{visit.monthShort}</span>
        <strong>{visit.day}</strong>
        <small>{visit.weekday}</small>
      </time>

      <div className="hist-info">
        <h3>{visit.service}</h3>
        <div className="hist-meta">
          <span>
            <Icon name="clock" />
            {visit.time} · {visit.duration}
          </span>
          <span>
            <Icon name="user" />
            {visit.barber}
          </span>
          <span>
            <Icon name="pin" />
            {visit.location}
          </span>
          <span className="hist-price">${visit.price}</span>
        </div>
        <div className="hist-tags">
          <span className="hist-pill hist-pill-completed">
            <span className="hist-dot" aria-hidden="true" />
            {visit.status}
          </span>
          {visit.rating && (
            <span className="hist-pill hist-pill-rated">★ You rated {visit.rating}</span>
          )}
        </div>
      </div>

      <div
        className="hist-actions"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="hist-btn hist-btn-primary" type="button">
          {selected ? 'Open receipt' : 'Receipt'}
        </button>
        <div className="hist-btn-row">
          <button
            className="hist-btn hist-btn-primary"
            type="button"
            onClick={onRebook}
          >
            Rebook
          </button>
          <button className="hist-btn" type="button">
            Tip again
          </button>
        </div>
      </div>
    </article>
  )
}

function DetailPanel({ visit, onRebook }) {
  if (!visit) {
    return (
      <aside className="hist-detail" aria-label="Receipt preview">
        <p className="hist-kicker">Receipt preview</p>
        <h2>No visit selected</h2>
        <p className="hist-detail-sub">
          Once you have completed visits they will appear on the left. Pick one to see the
          receipt details here.
        </p>
      </aside>
    )
  }
  return (
    <aside className="hist-detail" aria-label="Receipt preview">
      <p className="hist-kicker">Receipt preview</p>
      <h2>{visit.service}</h2>
      <p className="hist-detail-sub">
        {visit.when} · {visit.location}
      </p>

      <dl className="hist-dl">
        <div className="hist-row">
          <dt>Barber</dt>
          <dd>{visit.barber}</dd>
        </div>
        <div className="hist-row">
          <dt>Duration</dt>
          <dd>{visit.duration}</dd>
        </div>
        <div className="hist-row">
          <dt>Rating</dt>
          <dd>{visit.rating || '—'}</dd>
        </div>
        <div className="hist-row">
          <dt>Status</dt>
          <dd>{visit.status}</dd>
        </div>
      </dl>

      <div className="hist-sum">
        <span>Total</span>
        <strong>${visit.price}</strong>
      </div>

      <div className="hist-detail-actions">
        <button className="hist-btn hist-btn-primary hist-btn-block" type="button">
          <Icon name="download" />
          Download PDF
        </button>
        <button
          className="hist-btn hist-btn-block hist-btn-light"
          type="button"
          onClick={onRebook}
        >
          Rebook this cut
        </button>
      </div>

      <p className="hist-note">
        Prototype note: line items, tax, and tip history pending data model confirmation.
      </p>
    </aside>
  )
}

export default function HistoryPage({ onOpenSidebar, onNavigate, session }) {
  const [activeTab, setActiveTab] = useState('visits')
  const [activeChip, setActiveChip] = useState('all')
  const [query, setQuery] = useState('')
  const [visits, setVisits] = useState([])
  const [loyaltyPoints, setLoyaltyPoints] = useState(0)
  const [selectedId, setSelectedId] = useState(null)

  const userId = session?.user?.id

  useEffect(() => {
    if (!userId) return undefined
    let cancelled = false
    Promise.all([
      supabase
        .from('visits')
        .select(
          'id, service, visited_at, location, price_cents, rating, barber:barbers ( id, fullname )',
        )
        .eq('customer_id', userId)
        .order('visited_at', { ascending: false }),
      supabase
        .from('customers')
        .select('loyalty_points')
        .eq('id', userId)
        .single(),
    ]).then(([visitsRes, custRes]) => {
      if (cancelled) return
      setVisits((visitsRes.data || []).map(mapVisit))
      setLoyaltyPoints(custRes.data?.loyalty_points || 0)
    })
    return () => {
      cancelled = true
    }
  }, [userId])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfYear = new Date(now.getFullYear(), 0, 1)

    return visits.filter((v) => {
      if (q) {
        const hit = [v.service, v.barber, v.location]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(q))
        if (!hit) return false
      }
      if (activeChip === 'month' && v.dateObj < startOfMonth) return false
      if (activeChip === 'year' && v.dateObj < startOfYear) return false
      if (activeTab === 'tips' && !v.rating) return false
      return true
    })
  }, [visits, query, activeChip, activeTab])

  const grouped = useMemo(() => {
    const groups = []
    let currentKey = null
    for (const v of filtered) {
      if (v.monthKey !== currentKey) {
        groups.push({ key: v.monthKey, label: v.monthLabel, items: [] })
        currentKey = v.monthKey
      }
      groups[groups.length - 1].items.push(v)
    }
    return groups
  }, [filtered])

  const effectiveSelectedId =
    filtered.find((v) => v.id === selectedId)?.id || filtered[0]?.id || null
  const selected = filtered.find((v) => v.id === effectiveSelectedId) || filtered[0]
  const goBook = () => onNavigate?.('book')

  // Live stats
  const yearStart = new Date(new Date().getFullYear(), 0, 1)
  const visitsThisYear = visits.filter((v) => v.dateObj >= yearStart).length
  const stats = [
    { id: 'past', icon: 'history', value: String(visits.length), label: 'Past visits', variant: 'gold' },
    { id: 'receipts', icon: 'receipt', value: String(visits.length), label: 'Receipts saved' },
    { id: 'year', icon: 'document', value: String(visitsThisYear), label: 'This year' },
    { id: 'loyalty', icon: 'star', value: loyaltyPoints.toLocaleString(), label: 'Loyalty points' },
  ]

  const ratedCount = visits.filter((v) => v.rating).length
  const tabs = [
    { id: 'visits', label: 'Visits', count: visits.length },
    { id: 'receipts', label: 'Receipts', count: visits.length },
    { id: 'tips', label: 'Tips', count: ratedCount },
  ]

  return (
    <section className="customer-main hist-page" aria-label="History">
      <button
        aria-label="Open navigation"
        className="customer-square-button customer-mobile-menu-button hist-mobile-menu"
        type="button"
        onClick={onOpenSidebar}
      >
        <Icon name="menu" />
      </button>

      <nav className="hist-breadcrumb" aria-label="Breadcrumb">
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
        <span>History</span>
      </nav>

      <header className="hist-header">
        <div className="hist-heading">
          <h1>
            History<span>.</span>
          </h1>
          <p>
            Past visits, receipts, and rebooks — everything you&apos;ve done at Blade &amp; Co.,
            in one place.
          </p>
        </div>
        <div className="hist-head-actions">
          <button className="hist-btn hist-btn-dark" type="button">
            <Icon name="download" />
            Export
          </button>
          <button className="hist-btn hist-btn-primary" type="button" onClick={goBook}>
            <Icon name="plus" />
            New booking
          </button>
        </div>
      </header>

      <div className="hist-stats">
        {stats.map((stat) => (
          <article className="hist-stat" key={stat.id}>
            <span className={`hist-stat-icon${stat.variant === 'gold' ? ' is-gold' : ''}`}>
              <Icon name={stat.icon} />
            </span>
            <div>
              <strong>{stat.value}</strong>
              <small>{stat.label}</small>
            </div>
          </article>
        ))}
      </div>

      <div className="hist-tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            className={`hist-tab${activeTab === tab.id ? ' is-active' : ''}`}
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && (
              <span className="hist-tab-count">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      <div className="hist-toolbar">
        <div className="hist-chip-group" role="tablist" aria-label="Date filter">
          {chips.map((chip) => (
            <button
              className={`hist-chip${activeChip === chip.id ? ' is-active' : ''}`}
              key={chip.id}
              type="button"
              onClick={() => setActiveChip(chip.id)}
            >
              {chip.label}
            </button>
          ))}
          <button className="hist-chip hist-chip-filter" type="button">
            <Icon name="filter" />
            Filters
          </button>
        </div>

        <label className="hist-search" htmlFor="hist-search-input">
          <Icon name="search" />
          <span className="sr-only">Search by service or barber</span>
          <input
            id="hist-search-input"
            type="search"
            placeholder="Search by service or barber..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      <div className="hist-content">
        <div className="hist-list-panel">
          {grouped.length === 0 ? (
            <p className="hist-empty">
              {visits.length === 0
                ? "No visits yet. Once an appointment wraps up it'll show here with the full receipt."
                : 'No visits match your search.'}
            </p>
          ) : (
            grouped.map((group) => (
              <div className="hist-group" key={group.key}>
                <p className="hist-month-label">{group.label}</p>
                <div className="hist-list">
                  {group.items.map((visit) => (
                    <VisitCard
                      key={visit.id}
                      visit={visit}
                      selected={visit.id === effectiveSelectedId}
                      onSelect={setSelectedId}
                      onRebook={goBook}
                    />
                  ))}
                </div>
              </div>
            ))
          )}

          <footer className="hist-pagination">
            <p>
              Showing <strong>{filtered.length}</strong> of{' '}
              <strong>{visits.length}</strong> visits
            </p>
            <button className="hist-load-more" type="button">
              Load more →
            </button>
          </footer>
        </div>

        <DetailPanel visit={selected} onRebook={goBook} />
      </div>
    </section>
  )
}
