import { useMemo, useState } from 'react'

const KIND_LABEL = {
  all: 'All',
  booking: 'Bookings',
  receipt: 'Receipts',
  account: 'Account',
  offer: 'Offers',
}

const initialNotifications = [
  {
    id: 'n-001',
    kind: 'booking',
    unread: true,
    needsAction: true,
    title: 'Booking confirmed — Classic Fade + Beard Trim',
    body: "You're set for Mon, May 11 at 2:30 PM (Downtown) with Jordan Tate. You can reschedule up to 2 hours before.",
    timeLabel: 'Today',
    when: 'Mon, May 11 · 2:30 PM',
    who: 'Jordan Tate',
    where: 'Downtown',
    ago: '2m ago',
    actions: {
      primary: 'Add to calendar',
      secondary: 'Reschedule',
      tertiary: 'View booking',
    },
    pills: [
      { label: 'Bookings', variant: 'gold' },
      { label: 'Needs action', variant: 'warn' },
      { label: 'Add to calendar', variant: 'soft' },
    ],
    icon: 'calendar',
    iconVariant: 'gold',
    group: 'latest',
  },
  {
    id: 'n-002',
    kind: 'receipt',
    unread: true,
    needsAction: false,
    title: 'Receipt ready — $48 (Downtown)',
    body: 'Your receipt for Classic Fade + Beard Trim is available. Download PDF for reimbursements or expenses.',
    timeLabel: 'Today',
    when: 'May 11 · Receipt',
    who: 'Blade & Co.',
    where: 'Downtown',
    ago: '18m ago',
    actions: {
      primary: 'Download PDF',
      secondary: 'Email me',
      tertiary: 'Open History',
    },
    pills: [
      { label: 'Receipts', variant: 'soft' },
      { label: 'Ready', variant: 'ok' },
    ],
    icon: 'receipt',
    iconVariant: 'default',
    group: 'latest',
  },
  {
    id: 'n-003',
    kind: 'account',
    unread: false,
    needsAction: false,
    title: 'Profile updated',
    body: "Your phone number and preferred location were updated. If this wasn't you, review active sessions.",
    timeLabel: 'Wed',
    when: 'May 07 · Account',
    who: 'Marcus R.',
    where: '—',
    ago: '4d ago',
    actions: {
      primary: 'Review sessions',
      secondary: 'Change password',
      tertiary: 'Open profile',
    },
    pills: [
      { label: 'Account', variant: 'soft' },
      { label: 'Security', variant: 'soft' },
    ],
    icon: 'user',
    iconVariant: 'default',
    group: 'week',
  },
  {
    id: 'n-004',
    kind: 'booking',
    unread: false,
    needsAction: false,
    title: 'Reminder — tomorrow at 11:00 AM',
    body: 'Classic Fade at Downtown. Arrive 5 minutes early so your cut starts on time.',
    timeLabel: 'Tue',
    when: 'May 10 · 11:00 AM',
    who: 'Jordan Tate',
    where: 'Downtown',
    ago: '5d ago',
    actions: {
      primary: 'Directions',
      secondary: 'Reschedule',
      tertiary: 'View booking',
    },
    pills: [
      { label: 'Bookings', variant: 'gold' },
      { label: 'Reminder', variant: 'soft' },
    ],
    icon: 'clock',
    iconVariant: 'gold',
    group: 'week',
  },
  {
    id: 'n-005',
    kind: 'offer',
    unread: true,
    needsAction: false,
    title: 'Gold perk — free hot towel add-on',
    body: 'For your next visit this month, add a free hot towel treatment at checkout. Valid at Downtown + Eastside.',
    timeLabel: 'Mon',
    when: 'May 05 · Offer',
    who: 'Blade & Co.',
    where: 'All locations',
    ago: '6d ago',
    actions: {
      primary: 'Apply perk',
      secondary: 'See terms',
      tertiary: 'Book now',
    },
    pills: [
      { label: 'Offers', variant: 'soft' },
      { label: 'Gold', variant: 'gold' },
    ],
    icon: 'star',
    iconVariant: 'default',
    group: 'week',
  },
]

const tabs = [
  { id: 'all', label: 'All' },
  { id: 'booking', label: 'Bookings' },
  { id: 'receipt', label: 'Receipts' },
  { id: 'account', label: 'Account' },
  { id: 'offer', label: 'Offers' },
]

const chips = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'action', label: 'Needs action' },
  { id: 'today', label: 'Today' },
]

function Icon({ name }) {
  const commonProps = {
    'aria-hidden': true,
    className: 'customer-icon',
    viewBox: '0 0 24 24',
    fill: 'none',
  }
  const paths = {
    bell: (
      <>
        <path d="M18.25 16.25H5.75l1.4-1.9V10a4.85 4.85 0 0 1 9.7 0v4.35z" />
        <path d="M10 18.25a2 2 0 0 0 4 0" />
      </>
    ),
    calendar: (
      <>
        <path d="M6.5 4v3M17.5 4v3M4.75 8.25h14.5M5.75 5.75h12.5v14H5.75z" />
        <path d="M8.75 12h2M13.25 12h2M8.75 15.25h2M13.25 15.25h2" />
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
    user: (
      <>
        <path d="M12 12.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        <path d="M4.75 20a7.25 7.25 0 0 1 14.5 0" />
      </>
    ),
    clock: (
      <>
        <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
        <path d="M12 7.5v5l3.25 2" />
      </>
    ),
    star: (
      <path d="m12 4 2.35 4.75 5.25.77-3.8 3.7.9 5.22L12 15.97l-4.7 2.47.9-5.22-3.8-3.7 5.25-.77z" />
    ),
    search: (
      <>
        <path d="M10.75 17.25a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Z" />
        <path d="m15.5 15.5 4.25 4.25" />
      </>
    ),
    filter: (
      <>
        <path d="M4 6h16" />
        <path d="M7 12h10" />
        <path d="M10 18h4" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),
    check: (
      <>
        <path d="m5 12 4.5 4.5L19 7" />
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

function Pill({ pill }) {
  const variantClass =
    pill.variant === 'gold'
      ? 'nt-pill-gold'
      : pill.variant === 'ok'
        ? 'nt-pill-ok'
        : pill.variant === 'warn'
          ? 'nt-pill-warn'
          : 'nt-pill-soft'
  return <span className={`nt-pill ${variantClass}`}>{pill.label}</span>
}

function NotificationRow({ notif, selected, onSelect, onOpen }) {
  return (
    <article
      className={`nt-row${selected ? ' is-selected' : ''}${notif.unread ? ' is-unread' : ''}`}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={() => onSelect(notif.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(notif.id)
        }
      }}
    >
      <span className={`nt-icon${notif.iconVariant === 'gold' ? ' is-gold' : ''}`}>
        <Icon name={notif.icon} />
      </span>

      <div className="nt-main">
        <h3>{notif.title}</h3>
        <p>{notif.body}</p>
        <div className="nt-pills">
          {notif.pills.map((pill) => (
            <Pill key={pill.label} pill={pill} />
          ))}
        </div>
      </div>

      <div className="nt-time" onClick={(event) => event.stopPropagation()}>
        <span className="nt-time-label">{notif.timeLabel}</span>
        <span className="nt-time-ago">{notif.ago}</span>
        <button
          className="nt-btn-mini"
          type="button"
          onClick={() => onOpen(notif.id)}
        >
          Open
        </button>
      </div>
    </article>
  )
}

function DetailPanel({ notif, onToggleRead, onAction, onHistory }) {
  if (!notif) return null
  return (
    <aside className="nt-detail" aria-label="Notification detail">
      <p className="nt-kicker">{notif.unread ? 'Unread' : 'Selected'}</p>
      <h2>{notif.title}</h2>
      <p className="nt-detail-body">{notif.body}</p>

      <dl className="nt-dl">
        <div className="nt-row-d">
          <dt>Type</dt>
          <dd>{KIND_LABEL[notif.kind]}</dd>
        </div>
        <div className="nt-row-d">
          <dt>When</dt>
          <dd>{notif.when}</dd>
        </div>
        <div className="nt-row-d">
          <dt>With</dt>
          <dd>{notif.who}</dd>
        </div>
        <div className="nt-row-d">
          <dt>Location</dt>
          <dd>{notif.where}</dd>
        </div>
      </dl>

      <div className="nt-detail-actions">
        <button
          className="nt-btn nt-btn-primary nt-btn-block"
          type="button"
          onClick={() => onAction(notif, 'primary')}
        >
          {notif.actions.primary}
        </button>
        <button
          className="nt-btn nt-btn-light nt-btn-block"
          type="button"
          onClick={() => onAction(notif, 'secondary')}
        >
          {notif.actions.secondary}
        </button>
        <button
          className="nt-btn nt-btn-dark nt-btn-block"
          type="button"
          onClick={() => onAction(notif, 'tertiary')}
        >
          {notif.actions.tertiary}
        </button>
        <button
          className="nt-btn nt-btn-light nt-btn-block"
          type="button"
          onClick={() => onToggleRead(notif.id)}
        >
          {notif.unread ? 'Mark as read' : 'Mark as unread'}
        </button>
      </div>

      <div className="nt-minilog">
        <div className="nt-minilog-entry">
          <div>
            <strong>Context</strong>
            <span>
              {notif.needsAction
                ? 'This notification has a suggested next step. Take action or dismiss it.'
                : 'This is informational — you can archive it, but nothing is required.'}
            </span>
          </div>
          <span className="nt-minilog-tag">Timeline</span>
        </div>
        <div className="nt-minilog-entry">
          <div>
            <strong>Preference</strong>
            <span>Quiet hours: 10 PM–8 AM</span>
          </div>
          <span className="nt-minilog-tag">Delivery</span>
        </div>
      </div>

      <p className="nt-note">
        Prototype note: &ldquo;Mark as read&rdquo; updates badges + filters locally (no backend).
        <button type="button" className="nt-link" onClick={onHistory}>
          Open History
        </button>
      </p>
    </aside>
  )
}

export default function NotificationsPage({ onOpenSidebar, onNavigate }) {
  const [notifs, setNotifs] = useState(initialNotifications)
  const [activeTab, setActiveTab] = useState('all')
  const [activeChip, setActiveChip] = useState('all')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState('n-001')

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return notifs.filter((n) => {
      const matchView = activeTab === 'all' || n.kind === activeTab
      const matchFilter =
        activeChip === 'all' ||
        activeChip === 'filters' ||
        (activeChip === 'unread' && n.unread) ||
        (activeChip === 'action' && n.needsAction) ||
        (activeChip === 'today' && n.timeLabel.toLowerCase() === 'today')
      const matchQuery =
        !q ||
        `${n.title} ${n.body} ${n.who} ${n.where}`.toLowerCase().includes(q)
      return matchView && matchFilter && matchQuery
    })
  }, [notifs, activeTab, activeChip, query])

  const effectiveId =
    visible.find((n) => n.id === selectedId)?.id || visible[0]?.id || selectedId

  const selectedNotif = notifs.find((n) => n.id === effectiveId) || notifs[0]

  const setItem = (id) => {
    setSelectedId(id)
    setNotifs((prev) =>
      prev.map((n) => (n.id === id && n.unread ? { ...n, unread: false } : n)),
    )
  }

  const toggleRead = (id) => {
    setNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: !n.unread } : n)),
    )
  }

  const markAllRead = () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, unread: false })))
  }

  const onTabChange = (id) => {
    setActiveTab(id)
    setActiveChip('all')
    setQuery('')
  }

  const onAction = (notif) => {
    setNotifs((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, unread: false } : n)),
    )
  }

  const goBook = () => onNavigate?.('book')
  const goHistory = () => onNavigate?.('history')

  const unreadCount = notifs.filter((n) => n.unread).length
  const bookingCount = notifs.filter((n) => n.kind === 'booking').length
  const receiptCount = notifs.filter((n) => n.kind === 'receipt').length
  const accountCount = notifs.filter((n) => n.kind === 'account').length

  const tabCounts = {
    all: notifs.length,
    booking: bookingCount,
    receipt: receiptCount,
    account: accountCount,
  }

  const stats = [
    {
      id: 'unread',
      icon: 'bell',
      value: unreadCount,
      label: 'Unread',
      variant: 'gold',
    },
    {
      id: 'booking',
      icon: 'calendar',
      value: bookingCount,
      label: 'Booking updates',
    },
    {
      id: 'receipt',
      icon: 'receipt',
      value: receiptCount,
      label: 'Receipts ready',
    },
    { id: 'loc', icon: 'pin', value: 'Downtown', label: 'Primary location' },
  ]

  const latest = visible.filter((n) => n.group === 'latest')
  const thisWeek = visible.filter((n) => n.group === 'week')

  return (
    <section className="customer-main nt-page" aria-label="Notifications">
      <button
        aria-label="Open navigation"
        className="customer-square-button customer-mobile-menu-button nt-mobile-menu"
        type="button"
        onClick={onOpenSidebar}
      >
        <Icon name="menu" />
      </button>

      <nav className="nt-breadcrumb" aria-label="Breadcrumb">
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
        <span>Notifications</span>
      </nav>

      <header className="nt-header">
        <div className="nt-heading">
          <h1>
            Notifications<span>.</span>
          </h1>
          <p>
            Booking updates, receipts, and account notes — cleanly separated so you can act
            fast.
          </p>
        </div>
        <div className="nt-head-actions">
          <button
            className="nt-btn nt-btn-dark"
            type="button"
            onClick={markAllRead}
          >
            <Icon name="check" />
            Mark all read
          </button>
          <button className="nt-btn nt-btn-primary" type="button" onClick={goBook}>
            <Icon name="plus" />
            New booking
          </button>
        </div>
      </header>

      <div className="nt-stats">
        {stats.map((stat) => (
          <article className="nt-stat" key={stat.id}>
            <span className={`nt-stat-icon${stat.variant === 'gold' ? ' is-gold' : ''}`}>
              <Icon name={stat.icon} />
            </span>
            <div>
              <strong>{stat.value}</strong>
              <small>{stat.label}</small>
            </div>
          </article>
        ))}
      </div>

      <div className="nt-tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            className={`nt-tab${activeTab === tab.id ? ' is-active' : ''}`}
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
          >
            <span>{tab.label}</span>
            {tab.id !== 'offer' && (
              <span className="nt-tab-count">{tabCounts[tab.id]}</span>
            )}
          </button>
        ))}
      </div>

      <div className="nt-toolbar">
        <div className="nt-chip-group" role="tablist" aria-label="Filter">
          {chips.map((chip) => (
            <button
              className={`nt-chip${activeChip === chip.id ? ' is-active' : ''}`}
              key={chip.id}
              type="button"
              onClick={() => setActiveChip(chip.id)}
            >
              {chip.label}
            </button>
          ))}
          <button className="nt-chip nt-chip-filter" type="button">
            <Icon name="filter" />
            Filters
          </button>
        </div>

        <label className="nt-search" htmlFor="nt-search-input">
          <Icon name="search" />
          <span className="sr-only">Search by barber, service, or receipt</span>
          <input
            id="nt-search-input"
            type="search"
            placeholder="Search by barber, service, or receipt..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      <div className="nt-content">
        <div className="nt-list-panel">
          <div className="nt-list-head">
            <p className="nt-list-title">
              {activeTab === 'all' ? 'Latest' : KIND_LABEL[activeTab]}
            </p>
            <p className="nt-list-hint">
              Pick a notification to see details and quick actions on the right.
            </p>
          </div>

          {visible.length === 0 ? (
            <div className="nt-empty">
              No notifications match. Try &ldquo;All&rdquo; or clear your search.
            </div>
          ) : (
            <>
              {latest.length > 0 && (
                <>
                  <p className="nt-section-label">Today</p>
                  <div className="nt-list">
                    {latest.map((notif) => (
                      <NotificationRow
                        key={notif.id}
                        notif={notif}
                        selected={notif.id === effectiveId}
                        onSelect={setItem}
                        onOpen={setItem}
                      />
                    ))}
                  </div>
                </>
              )}
              {thisWeek.length > 0 && (
                <>
                  <p className="nt-section-label">This week</p>
                  <div className="nt-list">
                    {thisWeek.map((notif) => (
                      <NotificationRow
                        key={notif.id}
                        notif={notif}
                        selected={notif.id === effectiveId}
                        onSelect={setItem}
                        onOpen={setItem}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <DetailPanel
          notif={selectedNotif}
          onToggleRead={toggleRead}
          onAction={onAction}
          onHistory={goHistory}
        />
      </div>
    </section>
  )
}
