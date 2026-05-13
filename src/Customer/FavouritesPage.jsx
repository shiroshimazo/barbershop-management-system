import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import ConfirmDialog from './ConfirmDialog.jsx'
import Toast from '../components/Toast.jsx'
import { setBookingDraft } from './customerActions.js'
import { useServices } from './useServices.js'

const DEFAULT_SLOTS = ['10:30 AM', '12:00 PM', '3:15 PM']

function initialsFromName(name) {
  if (!name) return '?'
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('') || '?'
}

function hashHue(value) {
  const text = String(value || '')
  let hash = 0
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) % 997
  }
  return (hash % 60) - 30
}

function mapBarber(row, index) {
  const fullname = row.fullname || 'Barber'
  const skills = row.specialty
    ? row.specialty
        .split(/[&·,+]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 2)
    : []
  return {
    id: row.id,
    initials: row.initials || initialsFromName(fullname),
    name: fullname,
    role: row.specialty || 'Barber',
    location: row.location || '',
    rating: Number(row.rating) || 5.0,
    focus: row.specialty || 'Cuts & beards',
    preferred: row.specialty || 'Cuts & beards',
    next: row.next_available || DEFAULT_SLOTS[0],
    skills,
    isPrimary: index === 0,
    hue: hashHue(row.id || fullname),
    slots: DEFAULT_SLOTS,
  }
}

const chips = [
  { id: 'all', label: 'All' },
  { id: 'downtown', label: 'Downtown' },
  { id: 'eastside', label: 'Eastside' },
  { id: 'top', label: 'Top rated' },
]

function Icon({ name }) {
  const commonProps = {
    'aria-hidden': true,
    className: 'customer-icon',
    viewBox: '0 0 24 24',
    fill: 'none',
  }
  const paths = {
    star: (
      <path d="m12 4 2.35 4.75 5.25.77-3.8 3.7.9 5.22L12 15.97l-4.7 2.47.9-5.22-3.8-3.7 5.25-.77z" />
    ),
    funnel: (
      <>
        <path d="M4.5 5.25h15l-5.5 7v6.25l-4 1.25v-7.5z" />
      </>
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
    sliders: (
      <>
        <path d="M5 7.5h7M16 7.5h3" />
        <path d="M5 16.5h3M12 16.5h7" />
        <circle cx="14" cy="7.5" r="1.6" />
        <circle cx="10" cy="16.5" r="1.6" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h13" />
        <path d="m13.5 6.5 5.5 5.5-5.5 5.5" />
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

function BarberAvatar({ barber }) {
  return (
    <span className="fav-avatar">
      <span
        className="fav-avatar-ring"
        style={{ filter: `hue-rotate(${barber.hue}deg) saturate(1.05)` }}
        aria-hidden="true"
      />
      <span className="fav-avatar-init">{barber.initials}</span>
    </span>
  )
}

function BarberCard({ barber, selected, onSelect, onBook, onRemove, removing }) {
  return (
    <article
      className={`fav-card${selected ? ' is-selected' : ''}`}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={() => onSelect(barber.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(barber.id)
        }
      }}
    >
      <BarberAvatar barber={barber} />

      <div className="fav-info">
        <h3>{barber.name}</h3>
        <div className="fav-meta">
          <span>
            <Icon name="user" />
            {barber.role}
          </span>
          <span>
            <Icon name="pin" />
            {barber.location}
          </span>
          <span className="fav-rating">★ {barber.rating.toFixed(1)}</span>
        </div>
        <div className="fav-tags">
          {barber.isPrimary && (
            <span className="fav-pill fav-pill-gold">
              <span className="fav-pill-dot" aria-hidden="true" />
              Favourite
            </span>
          )}
          {barber.skills.map((skill) => (
            <span className="fav-pill fav-pill-soft" key={skill}>
              {skill}
            </span>
          ))}
        </div>
      </div>

      <div className="fav-actions" onClick={(event) => event.stopPropagation()}>
        <button
          className="fav-btn fav-btn-primary"
          type="button"
          onClick={() => onBook(barber)}
        >
          Book
        </button>
        <div className="fav-btn-row">
          <button
            className="fav-btn"
            type="button"
            onClick={() =>
              (window.location.href = `mailto:support@bladeco.example?subject=${encodeURIComponent(
                `Message for ${barber.name}`,
              )}`)
            }
          >
            Message
          </button>
          <button
            className="fav-btn"
            type="button"
            onClick={() => onRemove?.(barber.id)}
            disabled={removing}
          >
            {removing ? '...' : 'Remove'}
          </button>
        </div>
      </div>
    </article>
  )
}

function ServiceCard({ service, selected, onSelect, onBook }) {
  return (
    <article
      className={`fav-svc${selected ? ' is-selected' : ''}`}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={() => onSelect(service.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(service.id)
        }
      }}
    >
      <div className="fav-svc-top">
        <h3>{service.name}</h3>
        <span className="fav-svc-price">${service.price}</span>
      </div>
      <div className="fav-svc-sub">
        <span>
          <Icon name="clock" />
          {service.duration}
        </span>
        {service.tag && (
          <span
            className={`fav-pill ${
              service.tag === 'Premium' || service.tag === 'Signature'
                ? 'fav-pill-gold'
                : 'fav-pill-soft'
            }`}
          >
            {service.tag}
          </span>
        )}
      </div>
      <div className="fav-svc-actions" onClick={(event) => event.stopPropagation()}>
        <button className="fav-btn fav-btn-primary" type="button" onClick={() => onBook(service)}>
          Book
        </button>
      </div>
    </article>
  )
}

function DetailPanel({
  view,
  barber,
  service,
  quickService,
  selectedSlot,
  onSwap,
  onSlot,
  onBook,
  onRemove,
  removing,
}) {
  const isBarber = view === 'barbers'
  const title = isBarber ? barber?.name : service?.name
  const sub = isBarber
    ? `${barber?.role} · ${barber?.location}`
    : `${service?.duration} · $${service?.price}`
  const slots = isBarber && barber ? barber.slots : []

  const rating = isBarber && barber ? `★ ${barber.rating.toFixed(1)}` : '—'
  const focus = isBarber
    ? barber?.focus
    : service?.tag || 'Saved service'
  const next = isBarber && barber ? barber.next || slots[0] : 'Next available'
  const preferred = isBarber ? barber?.preferred || barber?.focus : service?.name || '—'

  return (
    <aside className="fav-detail" aria-label="Favourite detail">
      <p className="fav-kicker">{isBarber ? 'Favourite barber' : 'Favourite service'}</p>
      <h2>{title || '—'}</h2>
      <p className="fav-detail-sub">{sub}</p>

      <dl className="fav-dl">
        <div className="fav-row">
          <dt>Rating</dt>
          <dd>{rating}</dd>
        </div>
        <div className="fav-row">
          <dt>Focus</dt>
          <dd>{focus}</dd>
        </div>
        <div className="fav-row">
          <dt>Next available</dt>
          <dd>{next}</dd>
        </div>
        <div className="fav-row">
          <dt>Preferred</dt>
          <dd>{preferred}</dd>
        </div>
      </dl>

      <div className="fav-quick">
        <div className="fav-field">
          <span className="fav-field-label">Service</span>
          <div className="fav-field-value">
            <span>{quickService || '—'}</span>
            <button className="fav-link" type="button" onClick={onSwap}>
              Swap
            </button>
          </div>
        </div>
        <div className="fav-field">
          <span className="fav-field-label">Day</span>
          <div className="fav-field-value">
            <span>{isBarber ? 'Next available' : 'Choose in Book Appointment'}</span>
            <Icon name="arrow" />
          </div>
        </div>

        {isBarber && (
          <div className="fav-slot-row">
            {slots.map((slot) => (
              <button
                className={`fav-slot${selectedSlot === slot ? ' is-active' : ''}`}
                key={slot}
                type="button"
                onClick={() => onSlot(slot)}
              >
                {slot}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="fav-detail-actions">
        <button
          className="fav-btn fav-btn-primary fav-btn-block"
          type="button"
          onClick={() => onBook(isBarber ? barber : service)}
        >
          Book this
        </button>
        {view === 'barbers' && barber && (
          <button
            className="fav-btn fav-btn-block fav-btn-light"
            type="button"
            onClick={() => onRemove?.(barber.id)}
            disabled={removing}
          >
            {removing ? 'Removing...' : 'Remove from favourites'}
          </button>
        )}
      </div>

      <p className="fav-note">
        Book this opens Book Appointment with this favourite prefilled; live availability is
        checked there before confirmation.
      </p>
    </aside>
  )
}

export default function FavouritesPage({ onOpenSidebar, onNavigate, session }) {
  const {
    services: catalogServices,
    loading: servicesLoading,
    error: servicesError,
    usingFallback: servicesUsingFallback,
  } = useServices()
  const [activeTab, setActiveTab] = useState('barbers')
  const [activeChip, setActiveChip] = useState('all')
  const [query, setQuery] = useState('')
  const [barbers, setBarbers] = useState([])
  const [tier, setTier] = useState('silver')
  const [selectedBarberId, setSelectedBarberId] = useState(null)
  const [selectedServiceId, setSelectedServiceId] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState('10:30 AM')
  const [removingId, setRemovingId] = useState(null)
  const [pendingRemove, setPendingRemove] = useState(null)
  const [toast, setToast] = useState('')
  const [refreshTick, setRefreshTick] = useState(0)
  const [loading, setLoading] = useState(Boolean(session?.user?.id))
  const [error, setError] = useState('')

  const userId = session?.user?.id

  useEffect(() => {
    let cancelled = false
    if (!userId) {
      queueMicrotask(() => {
        if (cancelled) return
        setBarbers([])
        setTier('silver')
        setLoading(false)
        setError('')
      })
      return () => {
        cancelled = true
      }
    }
    queueMicrotask(() => {
      if (cancelled) return
      setLoading(true)
      setError('')
    })
    Promise.all([
      supabase
        .from('favorites')
        .select(
          'barber_id, created_at, barber:barbers ( id, fullname, initials, specialty, location, rating, review_count )',
        )
        .eq('customer_id', userId)
        .order('created_at', { ascending: true }),
      supabase
        .from('customers')
        .select('tier')
        .eq('id', userId)
        .single(),
    ])
      .then(([favRes, custRes]) => {
        if (cancelled) return
        const rows = (favRes.data || [])
          .filter((r) => r.barber)
          .map((r, idx) => mapBarber(r.barber, idx))
        setBarbers(rows)
        setTier(custRes.data?.tier || 'silver')
        setError(favRes.error?.message || '')
        if (custRes.error) {
          setToast(`Couldn't load member tier: ${custRes.error.message}`)
        }
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setBarbers([])
        setError(err.message || 'Unable to load favourites.')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId, refreshTick])

  useEffect(() => {
    if (!userId) return undefined
    const channel = supabase
      .channel(`customer-favourites-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'favorites', filter: `customer_id=eq.${userId}` },
        () => setRefreshTick((tick) => tick + 1),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customers', filter: `id=eq.${userId}` },
        () => setRefreshTick((tick) => tick + 1),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const handleRemoveRequest = (barberId) => {
    const target = barbers.find((b) => b.id === barberId)
    setPendingRemove(target || null)
  }

  const confirmRemove = async () => {
    if (!pendingRemove?.id || !userId) return
    setRemovingId(pendingRemove.id)
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('customer_id', userId)
      .eq('barber_id', pendingRemove.id)
    setRemovingId(null)
    if (error) {
      setToast(`Couldn't remove: ${error.message}`)
      return
    }
    setPendingRemove(null)
    setRefreshTick((t) => t + 1)
  }

  const visibleBarbers = useMemo(() => {
    const q = query.trim().toLowerCase()
    return barbers.filter((b) => {
      const passQ =
        !q ||
        `${b.name} ${b.role} ${b.location} ${b.focus}`.toLowerCase().includes(q)
      const passF =
        activeChip === 'all' ||
        activeChip === 'filters' ||
        (activeChip === 'downtown' && b.location.toLowerCase() === 'downtown') ||
        (activeChip === 'eastside' && b.location.toLowerCase() === 'eastside') ||
        (activeChip === 'top' && b.rating >= 4.9)
      return passQ && passF
    })
  }, [query, activeChip, barbers])

  const visibleServices = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return catalogServices
    return catalogServices.filter((s) =>
      `${s.name} ${s.tag || ''}`.toLowerCase().includes(q),
    )
  }, [query, catalogServices])

  const effectiveBarberId =
    visibleBarbers.find((b) => b.id === selectedBarberId)?.id ||
    visibleBarbers[0]?.id ||
    selectedBarberId
  const effectiveServiceId =
    visibleServices.find((s) => s.id === selectedServiceId)?.id ||
    visibleServices[0]?.id ||
    selectedServiceId

  const selectedBarber = barbers.find((b) => b.id === effectiveBarberId)
  const selectedService = catalogServices.find((s) => s.id === effectiveServiceId)

  const quickService =
    activeTab === 'barbers'
      ? selectedBarber?.preferred
      : selectedService?.name

  const onTabChange = (id) => {
    setActiveTab(id)
    setQuery('')
  }

  const handleSwap = () => {
    setActiveTab((tab) => (tab === 'barbers' ? 'services' : 'barbers'))
    setActiveChip('all')
    setQuery('')
  }

  const goBook = (selection) => {
    if (selection) {
      const isBarber = Boolean(selection.role || selection.skills)
      setBookingDraft({
        barberId: isBarber ? selection.id : selection.barber?.id || selection.barberId || null,
        barberName: isBarber
          ? selection.name
          : selection.barber?.fullname || selection.barberName || null,
        serviceName: isBarber
          ? null
          : selection.serviceName || selection.service?.name || selection.name || null,
      })
    }
    onNavigate?.('book')
  }

  const isBarberView = activeTab === 'barbers'
  const listLoading = isBarberView ? loading : servicesLoading
  const listError = isBarberView ? error : servicesError
  const showEmpty = isBarberView
    ? !listLoading && visibleBarbers.length === 0
    : !listLoading && visibleServices.length === 0

  const defaultPickFirst = selectedBarber?.name?.split(' ')[0] || '—'
  const tierLabel = tier ? tier[0].toUpperCase() + tier.slice(1) : 'Silver'

  const stats = [
    {
      id: 'barbers',
      icon: 'star',
      value: barbers.length,
      label: 'Saved barbers',
      variant: 'gold',
    },
    {
      id: 'services',
      icon: 'funnel',
      value: catalogServices.length,
      label: 'Services on offer',
    },
    {
      id: 'default',
      icon: 'clock',
      value: defaultPickFirst,
      label: 'Default pick',
    },
    { id: 'tier', icon: 'user', value: tierLabel, label: 'Member tier' },
  ]

  return (
    <section className="customer-main fav-page" aria-label="Favourites">
      <Toast message={toast} onClose={() => setToast('')} />
      {pendingRemove && (
        <ConfirmDialog
          title="Remove this barber from favourites?"
          description="You can add them back from the Book page anytime."
          confirmLabel="Yes, remove"
          cancelLabel="Keep it"
          busy={removingId === pendingRemove.id}
          onCancel={() => setPendingRemove(null)}
          onConfirm={confirmRemove}
        />
      )}
      <button
        aria-label="Open navigation"
        className="customer-square-button customer-mobile-menu-button fav-mobile-menu"
        type="button"
        onClick={onOpenSidebar}
      >
        <Icon name="menu" />
      </button>

      <nav className="fav-breadcrumb" aria-label="Breadcrumb">
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
        <span>Favourites</span>
      </nav>

      <header className="fav-header">
        <div className="fav-heading">
          <h1>
            Favourites<span>.</span>
          </h1>
          <p>
            Your saved barbers and the service catalog — ready for a one-tap rebook when
            you&apos;re in a rush.
          </p>
        </div>
        <div className="fav-head-actions">
          <button
            className="fav-btn fav-btn-dark"
            type="button"
            onClick={() => {
              setActiveTab('barbers')
              setActiveChip('all')
              setQuery('')
              setToast('Use Book or Remove on any saved barber to manage favourites.')
            }}
          >
            <Icon name="sliders" />
            Manage
          </button>
          <button className="fav-btn fav-btn-primary" type="button" onClick={goBook}>
            <Icon name="plus" />
            New booking
          </button>
        </div>
      </header>

      <div className="fav-stats">
        {stats.map((stat) => (
          <article className="fav-stat" key={stat.id}>
            <span className={`fav-stat-icon${stat.variant === 'gold' ? ' is-gold' : ''}`}>
              <Icon name={stat.icon} />
            </span>
            <div>
              <strong>{stat.value}</strong>
              <small>{stat.label}</small>
            </div>
          </article>
        ))}
      </div>

      <div className="fav-tabs" role="tablist">
        <button
          className={`fav-tab${isBarberView ? ' is-active' : ''}`}
          type="button"
          role="tab"
          aria-selected={isBarberView}
          onClick={() => onTabChange('barbers')}
        >
          <span>Barbers</span>
          <span className="fav-tab-count">{barbers.length}</span>
        </button>
        <button
          className={`fav-tab${!isBarberView ? ' is-active' : ''}`}
          type="button"
          role="tab"
          aria-selected={!isBarberView}
          onClick={() => onTabChange('services')}
        >
          <span>Services</span>
          <span className="fav-tab-count">{catalogServices.length}</span>
        </button>
      </div>

      <div className="fav-toolbar">
        <div className="fav-chip-group" role="tablist" aria-label="Location filter">
          {chips.map((chip) => (
            <button
              className={`fav-chip${activeChip === chip.id ? ' is-active' : ''}`}
              key={chip.id}
              type="button"
              onClick={() => setActiveChip(chip.id)}
              disabled={!isBarberView && chip.id !== 'all'}
            >
              {chip.label}
            </button>
          ))}
          <button
            className={`fav-chip fav-chip-filter${activeChip === 'filters' ? ' is-active' : ''}`}
            type="button"
            onClick={() => setActiveChip((chip) => (chip === 'filters' ? 'all' : 'filters'))}
            disabled={!isBarberView}
          >
            <Icon name="filter" />
            Filters
          </button>
        </div>

        <label className="fav-search" htmlFor="fav-search-input">
          <Icon name="search" />
          <span className="sr-only">Search barbers or services</span>
          <input
            id="fav-search-input"
            type="search"
            placeholder="Search barbers or services..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      <div className="fav-content">
        <div className="fav-list-panel">
          <div className="fav-list-head">
            <p className="fav-list-title">
              {isBarberView ? 'Saved barbers' : 'Service catalog'}
            </p>
            <p className="fav-list-hint">
              {isBarberView
                ? 'Tip: pick one to see details on the right. Search filters the current view only.'
                : 'Tip: pick a service to prefill the quick-book panel on the right.'}
            </p>
          </div>

          {listLoading ? (
            <div className="fav-empty">
              {isBarberView ? 'Loading saved barbers...' : 'Loading service catalog...'}
            </div>
          ) : listError && isBarberView ? (
            <div className="fav-empty">Live favourites could not load: {listError}</div>
          ) : showEmpty ? (
            <div className="fav-empty">
              {isBarberView
                ? barbers.length === 0
                  ? 'No favourites yet. Tap a barber on the Book page to save them here.'
                  : 'No matches. Try clearing filters or searching a shorter name.'
                : 'No matches. Try searching by service name (e.g. "fade", "beard").'}
            </div>
          ) : isBarberView ? (
            <div className="fav-list">
              {visibleBarbers.map((barber) => (
                <BarberCard
                  key={barber.id}
                  barber={barber}
                  selected={barber.id === effectiveBarberId}
                  onSelect={setSelectedBarberId}
                  onBook={goBook}
                  onRemove={handleRemoveRequest}
                  removing={removingId === barber.id}
                />
              ))}
            </div>
          ) : (
            <>
              {listError && (
                <div className="fav-empty">
                  Live services could not load: {listError}
                  {servicesUsingFallback ? ' Showing local services.' : ''}
                </div>
              )}
              <div className="fav-svc-grid">
                {visibleServices.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    selected={service.id === effectiveServiceId}
                    onSelect={setSelectedServiceId}
                    onBook={goBook}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <DetailPanel
          view={activeTab}
          barber={selectedBarber}
          service={selectedService}
          quickService={quickService}
          selectedSlot={selectedSlot}
          onSwap={handleSwap}
          onSlot={setSelectedSlot}
          onBook={goBook}
          onRemove={handleRemoveRequest}
          removing={removingId === selectedBarber?.id}
        />
      </div>
    </section>
  )
}
