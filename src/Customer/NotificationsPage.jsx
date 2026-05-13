import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import Toast from '../components/Toast.jsx'
import { downloadCalendarInvite } from './customerActions.js'

const KIND_LABEL = {
  all: 'All',
  booking: 'Bookings',
  receipt: 'Receipts',
  account: 'Account',
  offer: 'Offers',
}

function formatAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 0) return 'just now'
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

function formatTimeLabel(iso) {
  const d = new Date(iso)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (d >= startOfToday) return 'Today'
  const startOfYesterday = new Date(startOfToday)
  startOfYesterday.setDate(startOfYesterday.getDate() - 1)
  if (d >= startOfYesterday) return 'Yesterday'
  const days = Math.floor((startOfToday - d) / 86_400_000)
  if (days < 7) return d.toLocaleDateString(undefined, { weekday: 'short' })
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatWhen(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })} · ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
}

function derivePills(row) {
  const pills = []
  if (row.kind === 'booking') {
    pills.push({ label: 'Bookings', variant: 'gold' })
    if (row.needs_action) pills.push({ label: 'Needs action', variant: 'warn' })
    if (row.actions?.primary && row.needs_action) {
      pills.push({ label: row.actions.primary, variant: 'soft' })
    }
  } else if (row.kind === 'receipt') {
    pills.push({ label: 'Receipts', variant: 'soft' })
    pills.push({ label: 'Ready', variant: 'ok' })
  } else if (row.kind === 'account') {
    pills.push({ label: 'Account', variant: 'soft' })
    pills.push({ label: 'Security', variant: 'soft' })
  } else if (row.kind === 'offer') {
    pills.push({ label: 'Offers', variant: 'soft' })
    pills.push({ label: 'Gold', variant: 'gold' })
  }
  return pills
}

function mapNotification(row) {
  const groupKey = (() => {
    const diff = Date.now() - new Date(row.created_at).getTime()
    return diff < 86_400_000 ? 'latest' : 'week'
  })()
  return {
    id: row.id,
    kind: row.kind,
    unread: row.is_unread,
    needsAction: !!row.needs_action,
    title: row.title,
    body: row.body || '',
    createdAt: row.created_at,
    whenAt: row.when_at,
    timeLabel: formatTimeLabel(row.created_at),
    when: formatWhen(row.when_at) || formatWhen(row.created_at),
    who: row.who || '-',
    where: row.where_at || '-',
    ago: formatAgo(row.created_at),
    actions: {
      primary: row.actions?.primary || 'Open',
      secondary: row.actions?.secondary || 'Dismiss',
      tertiary: row.actions?.tertiary || '',
    },
    pills: derivePills(row),
    icon: row.icon || 'bell',
    iconVariant: row.icon_variant || 'default',
    group: groupKey,
  }
}


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
      <span className="nt-icon">
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
        {notif.actions.tertiary ? (
          <button
            className="nt-btn nt-btn-dark nt-btn-block"
            type="button"
            onClick={() => onAction(notif, 'tertiary')}
          >
            {notif.actions.tertiary}
          </button>
        ) : null}
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
        Notification actions mark the item read and route you to the relevant customer page.
        <button type="button" className="nt-link" onClick={onHistory}>
          Open History
        </button>
      </p>
    </aside>
  )
}

export default function NotificationsPage({
  onOpenSidebar,
  onNavigate,
  session,
  onUnreadChange,
}) {
  const userId = session?.user?.id
  const [notifs, setNotifs] = useState([])
  const [activeTab, setActiveTab] = useState('all')
  const [activeChip, setActiveChip] = useState('all')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!userId) return undefined
    let cancelled = false
    supabase
      .from('notifications')
      .select(
        'id, kind, title, body, is_unread, needs_action, when_at, who, where_at, actions, icon, icon_variant, created_at',
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (cancelled) return
        setNotifs((data || []).map(mapNotification))
      })
    return () => {
      cancelled = true
    }
  }, [userId])

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

  const persistRead = async (ids, read) => {
    if (!userId || ids.length === 0) return
    await supabase
      .from('notifications')
      .update({
        is_unread: !read,
        read_at: read ? new Date().toISOString() : null,
      })
      .in('id', ids)
      .eq('user_id', userId)
    onUnreadChange?.()
  }

  const setItem = (id) => {
    setSelectedId(id)
    const target = notifs.find((n) => n.id === id)
    if (target?.unread) {
      setNotifs((prev) =>
        prev.map((n) => (n.id === id ? { ...n, unread: false } : n)),
      )
      persistRead([id], true)
    }
  }

  const toggleRead = (id) => {
    const target = notifs.find((n) => n.id === id)
    if (!target) return
    const nextUnread = !target.unread
    setNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: nextUnread } : n)),
    )
    persistRead([id], !nextUnread)
  }

  const markAllRead = () => {
    const unreadIds = notifs.filter((n) => n.unread).map((n) => n.id)
    if (unreadIds.length === 0) {
      setToast('All notifications are already read.')
      return
    }
    setNotifs((prev) => prev.map((n) => ({ ...n, unread: false })))
    persistRead(unreadIds, true)
    setToast('Marked all notifications as read.')
  }

  const onTabChange = (id) => {
    setActiveTab(id)
    setActiveChip('all')
    setQuery('')
  }

  const onAction = async (notif, kind) => {
    setNotifs((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, unread: false } : n)),
    )
    persistRead([notif.id], true)

    const label = notif.actions?.[kind] || ''
    const normalized = label.toLowerCase()
    if (normalized.includes('add to calendar')) {
      downloadCalendarInvite({
        title: notif.title,
        description: notif.body,
        location: notif.where,
        startAt: notif.whenAt || notif.createdAt,
        durationMinutes: 45,
        filename: notif.title,
      })
      return
    }
    if (normalized.includes('reschedule') || normalized.includes('rebook')) {
      onNavigate?.('book')
      return
    }
    if (normalized.includes('view booking')) {
      onNavigate?.('appointments')
      return
    }
    if (normalized.includes('download pdf')) {
      onNavigate?.('history')
      return
    }
    if (normalized.includes('open history')) {
      onNavigate?.('history')
      return
    }
    if (normalized.includes('email me')) {
      setToast('Email delivery is not wired yet.')
      return
    }
    if (normalized.includes('dismiss')) {
      setToast('Notification marked as read.')
      return
    }
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
      <Toast message={toast} onClose={() => setToast('')} />
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
            <span className="nt-stat-icon">
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
