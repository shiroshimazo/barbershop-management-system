import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { Icon } from './CustomerShell.jsx'

const SERVICE_CATALOG = [
  { id: 'classic-fade-beard', name: 'Classic Fade + Beard Trim', price: 48, duration: 45 },
  { id: 'skin-fade', name: 'Skin Fade', price: 40, duration: 40 },
  { id: 'classic-cut', name: 'Classic Cut', price: 35, duration: 30 },
  { id: 'beard-sculpt', name: 'Beard Sculpt & Hot Towel', price: 32, duration: 30 },
  { id: 'full-service', name: 'The Full Service', price: 75, duration: 75 },
  { id: 'kids-cut', name: "Kid's Cut", price: 22, duration: 25 },
]

const TIER_THRESHOLD = { silver: 500, gold: 1500, platinum: null }
const TIER_NEXT = { silver: 'Gold', gold: 'Platinum', platinum: null }

function HomeIcon({ name }) {
  const commonProps = {
    'aria-hidden': true,
    className: 'customer-icon',
    viewBox: '0 0 24 24',
    fill: 'none',
  }
  const paths = {
    rotate: (
      <>
        <path d="M5.75 7.75a7.25 7.25 0 1 1-.6 7.45" />
        <path d="M5.75 3.75v4h4" />
      </>
    ),
    receipt: (
      <>
        <path d="M6.5 4.75h11v14.5l-2-1.1-2 1.1-2-1.1-2 1.1-2-1.1-2 1.1z" />
        <path d="M9 9h6M9 12h6M9 15h3.5" />
      </>
    ),
    pin: (
      <>
        <path d="M12 21s6-5.1 6-11a6 6 0 0 0-12 0c0 5.9 6 11 6 11Z" />
        <path d="M12 12.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" />
      </>
    ),
    clock: (
      <>
        <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
        <path d="M12 7.5v5l3.25 2" />
      </>
    ),
  }
  if (paths[name]) {
    return <svg {...commonProps}>{paths[name]}</svg>
  }
  return <Icon name={name} />
}

function firstName(fullname) {
  if (!fullname) return ''
  return fullname.trim().split(/\s+/)[0]
}

function initialsOf(fullname) {
  if (!fullname) return '?'
  const parts = fullname.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() || '').join('') || '?'
}

function formatTodayLong(date = new Date()) {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function formatLongDayTime(iso) {
  const d = new Date(iso)
  const date = d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  const time = d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
  return `${date} - ${time}`
}

function formatShortMonth(iso) {
  return new Date(iso)
    .toLocaleDateString(undefined, { month: 'short' })
    .toUpperCase()
}

function formatDayOfMonth(iso) {
  return String(new Date(iso).getDate()).padStart(2, '0')
}

function formatPrice(cents) {
  if (cents == null) return ''
  return `$${(cents / 100).toFixed(0)}`
}

function daysBetween(future, now = new Date()) {
  const ms = new Date(future).getTime() - now.getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

function nextAppointmentTagline(scheduledAt) {
  if (!scheduledAt) return 'No upcoming bookings yet'
  const days = daysBetween(scheduledAt)
  if (days < 0) return 'Your next cut is overdue'
  if (days === 0) return 'Your next cut is today'
  if (days === 1) return 'Your next cut is tomorrow'
  return `Your next cut is in ${days} days`
}

function countdownParts(scheduledAt) {
  if (!scheduledAt) return null
  const ms = new Date(scheduledAt).getTime() - Date.now()
  if (ms <= 0) return null
  const days = Math.floor(ms / 86_400_000)
  const hours = Math.floor((ms % 86_400_000) / 3_600_000)
  const mins = Math.floor((ms % 3_600_000) / 60_000)
  return {
    days: String(days).padStart(2, '0'),
    hours: String(hours).padStart(2, '0'),
    mins: String(mins).padStart(2, '0'),
  }
}

function yearsSince(iso) {
  if (!iso) return 0
  const ms = Date.now() - new Date(iso).getTime()
  return Math.max(0, ms / (1000 * 60 * 60 * 24 * 365.25))
}

function tierLabel(tier) {
  if (!tier) return 'Silver'
  return tier[0].toUpperCase() + tier.slice(1)
}

function SearchBox({ onSelect }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [barbersData, setBarbersData] = useState([])
  const [barbersFor, setBarbersFor] = useState('')
  const containerRef = useRef(null)

  const trimmed = query.trim()
  const qLower = trimmed.toLowerCase()

  // close on outside click
  useEffect(() => {
    if (!open) return undefined
    const onDocClick = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  // debounced barber search
  useEffect(() => {
    if (trimmed.length < 1) return undefined
    let cancelled = false
    const timer = setTimeout(() => {
      const pattern = `%${trimmed}%`
      supabase
        .from('barbers')
        .select('id, fullname, initials, specialty, location, rating')
        .or(
          `fullname.ilike.${pattern},specialty.ilike.${pattern},location.ilike.${pattern}`,
        )
        .eq('active', true)
        .limit(5)
        .then(({ data }) => {
          if (cancelled) return
          setBarbersData(data || [])
          setBarbersFor(trimmed)
        })
    }, 180)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [trimmed])

  const barbers = trimmed.length >= 1 && barbersFor === trimmed ? barbersData : []
  const loading = trimmed.length >= 1 && barbersFor !== trimmed
  const services = qLower
    ? SERVICE_CATALOG.filter((s) => s.name.toLowerCase().includes(qLower)).slice(0, 4)
    : []

  const hasResults = barbers.length > 0 || services.length > 0
  const showDropdown = open && trimmed.length >= 1

  const handleSelect = (kind, payload) => {
    setOpen(false)
    setQuery('')
    onSelect?.(kind, payload)
  }

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      setOpen(false)
      setQuery('')
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (barbers[0]) handleSelect('barber', barbers[0])
      else if (services[0]) handleSelect('service', services[0])
    }
  }

  return (
    <div className="customer-search-wrap" ref={containerRef}>
      <label className="customer-search" htmlFor="customer-search">
        <Icon name="search" />
        <span className="sr-only">Search barbers and services</span>
        <input
          id="customer-search"
          type="search"
          placeholder="Search barbers, services..."
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onFocus={() => query.trim() && setOpen(true)}
          onKeyDown={onKeyDown}
          autoComplete="off"
        />
      </label>
      {showDropdown && (
        <div className="customer-search-dropdown" role="listbox">
          {loading && !hasResults && (
            <p className="customer-search-empty">Searching...</p>
          )}
          {!loading && !hasResults && (
            <p className="customer-search-empty">
              No matches for &ldquo;{query.trim()}&rdquo;.
            </p>
          )}
          {barbers.length > 0 && (
            <div className="customer-search-group">
              <p className="customer-search-group-label">Barbers</p>
              {barbers.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className="customer-search-row"
                  onClick={() => handleSelect('barber', b)}
                >
                  <span className="customer-search-avatar">
                    {b.initials || initialsOf(b.fullname)}
                  </span>
                  <span className="customer-search-text">
                    <strong>{b.fullname}</strong>
                    <small>
                      {b.specialty || '-'} - {b.location || '-'}
                    </small>
                  </span>
                  {b.rating != null && (
                    <span className="customer-search-rating">★ {b.rating}</span>
                  )}
                </button>
              ))}
            </div>
          )}
          {services.length > 0 && (
            <div className="customer-search-group">
              <p className="customer-search-group-label">Services</p>
              {services.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="customer-search-row"
                  onClick={() => handleSelect('service', s)}
                >
                  <span className="customer-search-avatar is-square">
                    <HomeIcon name="rotate" />
                  </span>
                  <span className="customer-search-text">
                    <strong>{s.name}</strong>
                    <small>
                      ${s.price} - {s.duration} min
                    </small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TopBar({
  onOpenSidebar,
  displayName,
  todayLabel,
  nextTagline,
  onSearchSelect,
  onOpenNotifications,
  onOpenProfile,
}) {
  const greeting = displayName ? `Welcome back, ${displayName}` : 'Welcome back'
  const subtitle = nextTagline ? `${todayLabel} - ${nextTagline}` : todayLabel
  return (
    <header className="customer-topbar">
      <div className="customer-topbar-title">
        <button
          aria-label="Open navigation"
          className="customer-square-button customer-mobile-menu-button"
          type="button"
          onClick={onOpenSidebar}
        >
          <Icon name="menu" />
        </button>
        <div>
          <h1>{greeting}</h1>
          <p>{subtitle}</p>
        </div>
      </div>

      <div className="customer-topbar-actions">
        <SearchBox onSelect={onSearchSelect} />
        <button
          className="customer-square-button has-dot"
          aria-label="Notifications"
          type="button"
          onClick={onOpenNotifications}
        >
          <Icon name="bell" />
        </button>
        <button
          type="button"
          className="customer-top-avatar customer-top-avatar-button"
          aria-label="Open profile"
          onClick={onOpenProfile}
        >
          {initialsOf(displayName)}
        </button>
      </div>
    </header>
  )
}

function HeroNextAppointment({ appointment, onBook }) {
  const countdown = countdownParts(appointment.scheduled_at)
  const titleParts = (appointment.service || '').split('+').map((s) => s.trim())
  const lastPart = titleParts.pop() || appointment.service || 'Cut'
  const heroTitle =
    titleParts.length > 0 ? (
      <>
        {titleParts.join(' + ')}
        <br />+ <span>{lastPart}.</span>
      </>
    ) : (
      <span>{lastPart}.</span>
    )

  const barber = appointment.barber
  const barberName = barber?.fullname || 'Barber'
  const barberInitials = barber?.initials || initialsOf(barberName)
  const barberRole = barber?.specialty || 'Senior Barber'

  return (
    <section className="customer-hero" aria-labelledby="next-appointment-heading">
      <div className="customer-hero-copy">
        <p className="customer-eyebrow">Next appointment</p>
        <h2 id="next-appointment-heading">{heroTitle}</h2>

        <div className="customer-hero-meta">
          <span>
            <Icon name="calendar" />
            {formatLongDayTime(appointment.scheduled_at)}
          </span>
          <span>
            <HomeIcon name="clock" />
            {appointment.duration_minutes} min
          </span>
          <span>
            <HomeIcon name="pin" />
            Blade & Co. - {appointment.location || 'Downtown'}
          </span>
        </div>

        <div className="customer-hero-actions">
          <button className="customer-button customer-button-primary" type="button">
            <HomeIcon name="pin" />
            Get directions
          </button>
          <button
            className="customer-button customer-button-light"
            type="button"
            onClick={onBook}
          >
            Reschedule
          </button>
          <button className="customer-button customer-button-light" type="button">
            Cancel
          </button>
        </div>
      </div>

      <article className="customer-hero-card" aria-label="Your barber">
        <p className="customer-eyebrow">Your barber</p>
        <div className="customer-barber-row">
          <span className="customer-avatar customer-avatar-large">{barberInitials}</span>
          <span>
            <strong>{barberName}</strong>
            <small>{barberRole}</small>
            {barber?.rating != null && (
              <span className="customer-stars">
                {'*'.repeat(Math.round(barber.rating))}
              </span>
            )}
          </span>
        </div>
        {countdown && (
          <div className="customer-countdown" aria-label="Appointment countdown">
            <span>
              <strong>{countdown.days}</strong>
              <small>Days</small>
            </span>
            <span>
              <strong>{countdown.hours}</strong>
              <small>Hrs</small>
            </span>
            <span>
              <strong>{countdown.mins}</strong>
              <small>Min</small>
            </span>
          </div>
        )}
      </article>
    </section>
  )
}

function HeroEmpty({ onBook }) {
  return (
    <section
      className="customer-hero customer-hero-empty"
      aria-label="No upcoming bookings"
    >
      <div className="customer-hero-copy">
        <p className="customer-eyebrow">Next appointment</p>
        <h2>
          Book your <span>first cut.</span>
        </h2>
        <p className="customer-hero-empty-body">
          You don&apos;t have an upcoming appointment. Pick a barber, choose a service, and
          lock in a time.
        </p>
        <div className="customer-hero-actions">
          <button
            className="customer-button customer-button-primary"
            type="button"
            onClick={onBook}
          >
            <Icon name="calendar-plus" />
            Book appointment
          </button>
        </div>
      </div>
    </section>
  )
}

function QuickActions({ onAction, lastVisit }) {
  const rebookSubtitle = lastVisit?.service
    ? `${lastVisit.service}${lastVisit.barber?.fullname ? ` - w/ ${firstName(lastVisit.barber.fullname)}` : ''}`
    : 'No past visits yet'

  const actions = [
    {
      id: 'book',
      icon: 'calendar-plus',
      title: 'Book new appointment',
      description: 'Pick service, barber & time',
      primary: true,
      disabled: false,
    },
    {
      id: 'rebook',
      icon: 'rotate',
      title: 'Rebook last cut',
      description: rebookSubtitle,
      disabled: !lastVisit,
    },
    {
      id: 'favourites',
      icon: 'star',
      title: 'My favorites',
      description: 'Your saved barbers',
    },
    {
      id: 'history',
      icon: 'receipt',
      title: 'Receipts',
      description: 'Past visits & PDFs',
    },
  ]

  return (
    <section className="customer-quick-grid" aria-label="Quick actions">
      {actions.map((action) => (
        <a
          className={`customer-quick-card${action.primary ? ' is-primary' : ''}${action.disabled ? ' is-disabled' : ''}`}
          href={`#${action.id}`}
          key={action.title}
          onClick={(event) => {
            event.preventDefault()
            if (action.disabled) return
            onAction?.(action.id)
          }}
        >
          <span className="customer-quick-icon">
            <HomeIcon name={action.icon} />
          </span>
          <strong>{action.title}</strong>
          <small>{action.description}</small>
        </a>
      ))}
    </section>
  )
}

function FavoriteBarbers({ favorites, onBook, onSeeAll }) {
  return (
    <section className="customer-panel" aria-labelledby="favorite-barbers-heading">
      <div className="customer-panel-head">
        <h2 id="favorite-barbers-heading">Favorite barbers</h2>
        <a
          href="#favourites"
          onClick={(event) => {
            event.preventDefault()
            onSeeAll?.()
          }}
        >
          {'See all ->'}
        </a>
      </div>

      {favorites.length === 0 ? (
        <div className="customer-empty">
          <strong>No favorites yet</strong>
          <p>
            Save a barber from the Book page and they&apos;ll show up here for one-tap
            rebooks.
          </p>
          <button
            className="customer-button customer-button-light"
            type="button"
            onClick={onBook}
          >
            Browse barbers
          </button>
        </div>
      ) : (
        <div className="customer-barber-list">
          {favorites.map((fav) => (
            <article className="customer-barber-card" key={fav.barber_id}>
              <span className="customer-avatar customer-avatar-square">
                {fav.barber?.initials || initialsOf(fav.barber?.fullname)}
              </span>
              <div>
                <strong>{fav.barber?.fullname || 'Barber'}</strong>
                <small>
                  {fav.barber?.specialty || '-'} - {fav.barber?.location || '-'}
                </small>
                <span className="customer-rating">
                  <span className="customer-stars">*****</span>{' '}
                  {fav.barber?.rating ?? '-'} ({fav.barber?.review_count ?? 0})
                </span>
              </div>
              <button className="customer-book-button" type="button" onClick={onBook}>
                Book
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function LoyaltyPanel({ customer, visitsThisYear }) {
  const points = customer?.loyalty_points ?? 0
  const tier = customer?.tier || 'silver'
  const tierName = tierLabel(tier)
  const nextThreshold = TIER_THRESHOLD[tier]
  const nextTierName = TIER_NEXT[tier]
  const memberSince = customer?.member_since
    ? new Date(customer.member_since).getFullYear()
    : null
  const years = customer?.member_since ? yearsSince(customer.member_since) : 0
  const yearsLabel = years >= 1 ? years.toFixed(1) : '<1'

  const progressPct = nextThreshold
    ? Math.min(100, Math.round((points / nextThreshold) * 100))
    : 100
  const remaining = nextThreshold ? Math.max(0, nextThreshold - points) : 0

  return (
    <aside className="customer-loyalty-column">
      <section className="customer-loyalty" aria-label="Loyalty status">
        <p className="customer-eyebrow">Loyalty - {tierName} tier</p>
        <div className="customer-loyalty-points">
          <strong>{points.toLocaleString()}</strong>
          <span>pts</span>
        </div>
        <p>
          {nextThreshold
            ? `${remaining} points to your next free cut. Earn 25 pts per visit.`
            : 'You’ve hit the top tier. Keep enjoying the perks.'}
        </p>
        <div
          className="customer-progress"
          aria-label={`${points} of ${nextThreshold || points} points`}
        >
          <span style={{ width: `${progressPct}%` }} />
        </div>
        <div className="customer-progress-labels">
          <span>
            {points.toLocaleString()} /{' '}
            {nextThreshold
              ? nextThreshold.toLocaleString()
              : points.toLocaleString()}
          </span>
          <span>{nextTierName ? `${nextTierName} tier` : 'Top tier'}</span>
        </div>
      </section>

      <div className="customer-stats-row">
        <article className="customer-stat-card">
          <strong>{visitsThisYear}</strong>
          <span>Visits this year</span>
        </article>
        <article className="customer-stat-card">
          <strong>
            {yearsLabel} <small>yrs</small>
          </strong>
          <span>{memberSince ? `Member since ${memberSince}` : 'New member'}</span>
        </article>
      </div>
    </aside>
  )
}

function RecentVisits({ visits, onSeeAll, onBook }) {
  return (
    <section
      className="customer-panel customer-visits"
      aria-labelledby="recent-visits-heading"
    >
      <div className="customer-panel-head">
        <h2 id="recent-visits-heading">Recent visits</h2>
        <a
          href="#history"
          onClick={(event) => {
            event.preventDefault()
            onSeeAll?.()
          }}
        >
          {'View history ->'}
        </a>
      </div>

      {visits.length === 0 ? (
        <div className="customer-empty">
          <strong>No visits yet</strong>
          <p>
            Your completed cuts will appear here with quick-rebook + receipt actions.
          </p>
          <button
            className="customer-button customer-button-light"
            type="button"
            onClick={onBook}
          >
            Book your first cut
          </button>
        </div>
      ) : (
        <div className="customer-visit-list">
          {visits.map((visit) => (
            <article className="customer-visit-row" key={visit.id}>
              <time className="customer-visit-date" dateTime={visit.visited_at}>
                <span>{formatShortMonth(visit.visited_at)}</span>
                <strong>{formatDayOfMonth(visit.visited_at)}</strong>
              </time>
              <div className="customer-visit-info">
                <strong>{visit.service}</strong>
                <small>
                  {visit.barber?.fullname || 'Barber'} - {visit.location || '-'} -{' '}
                  {formatPrice(visit.price_cents)}
                </small>
              </div>
              <div className="customer-visit-actions">
                <button className="customer-chip" type="button">
                  Receipt
                </button>
                <button
                  className="customer-chip customer-chip-gold"
                  type="button"
                  onClick={onBook}
                >
                  Rebook
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default function CustomerDashboard({ onOpenSidebar, onNavigate, session }) {
  const [customer, setCustomer] = useState(null)
  const [nextAppointment, setNextAppointment] = useState(null)
  const [lastVisit, setLastVisit] = useState(null)
  const [favorites, setFavorites] = useState([])
  const [recentVisits, setRecentVisits] = useState([])
  const [visitsThisYear, setVisitsThisYear] = useState(0)

  const userId = session?.user?.id

  useEffect(() => {
    if (!userId) return undefined
    let cancelled = false
    const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString()
    const nowIso = new Date().toISOString()

    Promise.all([
      supabase
        .from('customers')
        .select('fullname, email, phone, loyalty_points, tier, member_since')
        .eq('id', userId)
        .single(),
      supabase
        .from('appointments')
        .select(
          'id, service, scheduled_at, duration_minutes, location, status, barber:barbers ( id, fullname, initials, specialty, location, rating )',
        )
        .eq('customer_id', userId)
        .eq('status', 'scheduled')
        .gte('scheduled_at', nowIso)
        .order('scheduled_at', { ascending: true })
        .limit(1),
      supabase
        .from('visits')
        .select(
          'id, service, visited_at, location, price_cents, barber:barbers ( id, fullname )',
        )
        .eq('customer_id', userId)
        .order('visited_at', { ascending: false })
        .limit(1),
      supabase
        .from('favorites')
        .select(
          'barber_id, barber:barbers ( id, fullname, initials, specialty, location, rating, review_count )',
        )
        .eq('customer_id', userId)
        .order('created_at', { ascending: true })
        .limit(3),
      supabase
        .from('visits')
        .select(
          'id, service, visited_at, location, price_cents, barber:barbers ( id, fullname )',
        )
        .eq('customer_id', userId)
        .order('visited_at', { ascending: false })
        .limit(4),
      supabase
        .from('visits')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', userId)
        .gte('visited_at', yearStart),
    ]).then(
      ([customerRes, nextRes, lastRes, favRes, recentRes, yearCountRes]) => {
        if (cancelled) return
        setCustomer(customerRes.data || null)
        setNextAppointment(nextRes.data?.[0] || null)
        setLastVisit(lastRes.data?.[0] || null)
        setFavorites(favRes.data || [])
        setRecentVisits(recentRes.data || [])
        setVisitsThisYear(yearCountRes.count || 0)
      },
    )

    return () => {
      cancelled = true
    }
  }, [userId])

  const goBook = () => onNavigate?.('book')
  const goFavourites = () => onNavigate?.('favourites')
  const goHistory = () => onNavigate?.('history')

  const handleQuick = (id) => {
    if (id === 'book' || id === 'rebook') return goBook()
    onNavigate?.(id)
  }

  const handleSearchSelect = (kind) => {
    // Barber or service hit: drop the user into the Book flow.
    // Pre-fill is a future enhancement; the link is functional now.
    if (kind === 'barber' || kind === 'service') goBook()
  }

  const displayName =
    firstName(customer?.fullname) ||
    firstName(session?.user?.user_metadata?.fullname) ||
    firstName(session?.user?.email?.split('@')[0])

  const todayLabel = formatTodayLong()
  const nextTagline = nextAppointmentTagline(nextAppointment?.scheduled_at)

  return (
    <section className="customer-main" aria-label="Customer dashboard">
      <TopBar
        onOpenSidebar={onOpenSidebar}
        displayName={displayName}
        todayLabel={todayLabel}
        nextTagline={nextTagline}
        onSearchSelect={handleSearchSelect}
        onOpenNotifications={() => onNavigate?.('notifications')}
        onOpenProfile={() => onNavigate?.('profile')}
      />
      {nextAppointment ? (
        <HeroNextAppointment appointment={nextAppointment} onBook={goBook} />
      ) : (
        <HeroEmpty onBook={goBook} />
      )}
      <QuickActions onAction={handleQuick} lastVisit={lastVisit} />
      <div className="customer-two-column">
        <FavoriteBarbers
          favorites={favorites}
          onBook={goBook}
          onSeeAll={goFavourites}
        />
        <LoyaltyPanel customer={customer} visitsThisYear={visitsThisYear} />
      </div>
      <RecentVisits visits={recentVisits} onSeeAll={goHistory} onBook={goBook} />
    </section>
  )
}
