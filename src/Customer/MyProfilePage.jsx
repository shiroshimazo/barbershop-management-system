import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

function tierLabel(tier) {
  if (!tier) return 'Silver'
  return tier[0].toUpperCase() + tier.slice(1)
}

function memberIdFrom(uuid) {
  if (!uuid) return '-'
  const clean = uuid.replace(/-/g, '').toUpperCase()
  return `BLC-${clean.slice(0, 4)}-${clean.slice(4, 7)}`
}

function formatMemberSince(iso) {
  if (!iso) return '-'
  return new Date(iso).getFullYear().toString()
}

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'security', label: 'Security' },
  { id: 'billing', label: 'Billing' },
]

const kvFields = [
  {
    id: 'kv-name',
    label: 'FULL NAME',
    value: 'Marcus R.',
    badge: 'EDIT',
    detail: {
      title: 'Full name',
      subtitle: 'Display name on receipts and reminders',
      a: 'Marcus R.',
      b: '—',
      c: 'Last updated: today',
      d: '—',
    },
  },
  {
    id: 'kv-email',
    label: 'EMAIL',
    value: 'marcus.r@example.com',
    badge: 'VERIFIED',
    detail: {
      title: 'Email',
      subtitle: 'For confirmations',
      a: 'marcus.r@example.com',
      b: '—',
      c: 'Verified',
      d: '—',
    },
  },
  {
    id: 'kv-phone',
    label: 'PHONE',
    value: '+1 (415) 555-0148',
    badge: 'SMS',
    detail: {
      title: 'Phone',
      subtitle: 'For SMS reminders',
      a: '+1 (415) 555-0148',
      b: '—',
      c: 'SMS enabled',
      d: '—',
    },
  },
  {
    id: 'kv-id',
    label: 'MEMBER ID',
    value: 'BLC-0812-774',
    badge: 'COPY',
    detail: {
      title: 'Member ID',
      subtitle: 'Your Blade & Co. customer reference',
      a: 'BLC-0812-774',
      b: '—',
      c: 'Tap to copy',
      d: '—',
    },
  },
]

const overviewDefaults = [
  {
    id: 'default-barber',
    title: 'Default barber',
    desc: 'Used when you hit "Quick rebook" — turn off to choose every time.',
    pills: [
      { label: 'Jordan Tate', variant: 'gold' },
      { label: 'Downtown', variant: 'soft' },
    ],
    toggle: 't-defaultBarber',
    detail: {
      title: 'Default barber',
      subtitle: 'Used when you hit "Quick rebook"',
      a: 'Jordan Tate',
      b: 'Downtown',
      c: 'Auto-select on booking',
      d: '—',
    },
  },
  {
    id: 'default-service',
    title: 'Default service',
    desc: 'Pre-fills the service field when you start a new booking.',
    pills: [
      { label: 'Classic Fade + Beard Trim', variant: 'gold' },
      { label: '$48', variant: 'soft' },
      { label: '45 min', variant: 'soft' },
    ],
    toggle: 't-defaultService',
    detail: {
      title: 'Default service',
      subtitle: 'Pre-filled on new bookings',
      a: 'Classic Fade + Beard Trim',
      b: '$48 · 45 min',
      c: 'Auto-select on booking',
      d: '—',
    },
  },
]

const preferenceItems = [
  {
    id: 'pref-loc',
    title: 'Preferred location',
    desc: 'We will pick this branch first when it has availability.',
    pills: [
      { label: 'Downtown', variant: 'gold' },
      { label: 'Backup: Eastside', variant: 'soft' },
    ],
    toggle: 't-prefLoc',
    detail: {
      title: 'Preferred location',
      subtitle: 'Branch priority on new bookings',
      a: 'Downtown',
      b: 'Eastside (backup)',
      c: 'Auto-select on booking',
      d: '—',
    },
  },
  {
    id: 'time-window',
    title: 'Time window',
    desc: 'Surfaces slots that match your routine first.',
    pills: [
      { label: 'Weekdays 6–8 PM', variant: 'soft' },
      { label: 'Weekends 10–1', variant: 'soft' },
    ],
    toggle: 't-timeWindow',
    detail: {
      title: 'Time window',
      subtitle: 'Quiet default for booking suggestions',
      a: 'Weekdays: 6–8 PM',
      b: 'Weekends: 10 AM–1 PM',
      c: 'Not currently applied',
      d: '—',
    },
  },
  {
    id: 'marketing',
    title: 'Communication',
    desc: 'Reminders are always on. Choose what extras you want.',
    pills: [
      { label: 'SMS reminders', variant: 'gold' },
      { label: 'Email receipts', variant: 'soft' },
    ],
    toggle: 't-marketing',
    marketing: true,
    detail: {
      title: 'Communication',
      subtitle: 'How we reach you',
      a: 'SMS reminders: on',
      b: 'Email receipts: on',
      c: 'Marketing: off',
      d: '—',
    },
  },
]

const securityItems = [
  {
    id: 'password',
    title: 'Password',
    desc: 'A fresh password keeps your account locked down.',
    pills: [{ label: 'Last changed 3 months ago', variant: 'soft' }],
    button: { label: 'Change', variant: 'light' },
    detail: {
      title: 'Password',
      subtitle: 'Sign-in credential',
      a: 'Strength: Good',
      b: 'Last updated: 3 months',
      c: 'Recommended every 6 months',
      d: '—',
    },
  },
  {
    id: '2fa',
    title: 'Two-factor authentication',
    desc: 'Adds a second step on new device sign-ins.',
    pills: [
      { label: 'Recommended', variant: 'gold' },
      { label: 'Takes ~30 seconds', variant: 'soft' },
    ],
    toggle: 't-2fa',
    detail: {
      title: 'Two-factor authentication',
      subtitle: 'Extra layer for account access',
      a: 'Status: Not enabled',
      b: 'Method: —',
      c: 'Recommendation: turn on',
      d: '—',
    },
  },
  {
    id: 'sessions',
    title: 'Active sessions',
    desc: 'See where you are signed in. Revoke anything unfamiliar.',
    pills: [{ label: '2 sessions', variant: 'soft' }],
    button: { label: 'Sign out all', variant: 'primary' },
    detail: {
      title: 'Active sessions',
      subtitle: 'Devices with current access',
      a: 'iPhone · Eastside',
      b: 'Web · Downtown',
      c: '2 active',
      d: '—',
    },
  },
]

const billingItems = [
  {
    id: 'payment',
    title: 'Payment method',
    desc: 'Saved card used for in-store taps and online bookings.',
    pills: [
      { label: 'Primary', variant: 'gold' },
      { label: 'Visa •••• 4821', variant: 'soft' },
    ],
    button: { label: 'Manage', variant: 'light' },
    detail: {
      title: 'Payment method',
      subtitle: 'Primary card on file',
      a: 'Visa •••• 4821',
      b: 'Expires 08/28',
      c: 'Marked as primary',
      d: '—',
    },
  },
  {
    id: 'receipts',
    title: 'Receipts',
    desc: 'Download a PDF or CSV of your past visits.',
    pills: [
      { label: 'PDF', variant: 'soft' },
      { label: 'CSV', variant: 'soft' },
    ],
    button: { label: 'Export', variant: 'primary' },
    detail: {
      title: 'Receipts',
      subtitle: 'Export your visit history',
      a: 'Range: last 12 months',
      b: 'Format: PDF / CSV',
      c: 'Delivered as download',
      d: '—',
    },
  },
  {
    id: 'tips',
    title: 'Tips default',
    desc: 'Speeds up checkout — change anytime at the till.',
    pills: [
      { label: '15%', variant: 'gold' },
      { label: 'Quick buttons', variant: 'soft' },
    ],
    toggle: 't-tipDefault',
    detail: {
      title: 'Tips default',
      subtitle: 'Pre-selected tip on checkout',
      a: 'Default: 15%',
      b: 'Quick buttons: 10 / 15 / 20',
      c: 'Editable at the till',
      d: '—',
    },
  },
]

const heroItem = {
  id: 'hero',
  detail: {
    title: 'Profile',
    subtitle: 'Member · Gold',
    a: 'Marcus R.',
    b: 'marcus.r@example.com',
    c: '+1 (415) 555-0148',
    d: 'Preferred location: Downtown',
  },
}

function Icon({ name }) {
  const commonProps = {
    'aria-hidden': true,
    className: 'customer-icon',
    viewBox: '0 0 24 24',
    fill: 'none',
  }
  const paths = {
    user: (
      <>
        <path d="M12 12.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        <path d="M4.75 20a7.25 7.25 0 0 1 14.5 0" />
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
    sessions: (
      <>
        <path d="M4.75 5.75h14.5v11H4.75z" />
        <path d="M9 19.25h6" />
        <path d="M12 17v2.25" />
      </>
    ),
    pencil: (
      <>
        <path d="m14.5 5.5 4 4-9.5 9.5H5v-4z" />
        <path d="m13 7 4 4" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),
    close: (
      <>
        <path d="M6.5 6.5 17.5 17.5" />
        <path d="m17.5 6.5-11 11" />
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
  return (
    <span
      className={`mp-pill ${pill.variant === 'gold' ? 'mp-pill-gold' : 'mp-pill-soft'}`}
    >
      {pill.label}
    </span>
  )
}

function Toggle({ id, checked, onChange, marketing }) {
  const labelOn = marketing ? 'Ads' : 'On'
  const labelOff = marketing ? 'No ads' : 'Off'
  return (
    <button
      type="button"
      className={`mp-toggle${checked ? ' is-on' : ''}`}
      aria-pressed={checked}
      onClick={(event) => {
        event.stopPropagation()
        onChange(id, !checked)
      }}
    >
      <span className="mp-toggle-label">{checked ? labelOn : labelOff}</span>
      <span className="mp-switch" aria-hidden="true">
        <span className="mp-switch-thumb" />
      </span>
    </button>
  )
}

function ItemCard({ item, selected, onSelect, toggles, onToggle }) {
  return (
    <article
      className={`mp-item${selected ? ' is-selected' : ''}`}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={() => onSelect(item.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(item.id)
        }
      }}
    >
      <div className="mp-item-body">
        <h3>{item.title}</h3>
        <p>{item.desc}</p>
        <div className="mp-item-pills">
          {item.pills.map((pill) => (
            <Pill key={pill.label} pill={pill} />
          ))}
        </div>
      </div>

      <div className="mp-item-control" onClick={(event) => event.stopPropagation()}>
        {item.toggle && (
          <Toggle
            id={item.toggle}
            checked={!!toggles[item.toggle]}
            onChange={onToggle}
            marketing={!!item.marketing}
          />
        )}
        {item.button && (
          <button
            type="button"
            className={`mp-btn ${
              item.button.variant === 'primary' ? 'mp-btn-primary' : 'mp-btn-light'
            }`}
          >
            {item.button.label}
          </button>
        )}
      </div>
    </article>
  )
}

function KvTile({ field, selected, onSelect }) {
  return (
    <article
      className={`mp-kv${selected ? ' is-selected' : ''}`}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={() => onSelect(field.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(field.id)
        }
      }}
    >
      <p className="mp-kv-label">{field.label}</p>
      <div className="mp-kv-value">
        <span>{field.value}</span>
        <code>{field.badge}</code>
      </div>
    </article>
  )
}

function ProfileHero({
  name,
  location,
  tier,
  selected,
  onSelect,
  onRebook,
  onReceipts,
}) {
  const initials = (name || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('') || '?'
  return (
    <article
      className={`mp-hero${selected ? ' is-selected' : ''}`}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={() => onSelect('hero')}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect('hero')
        }
      }}
    >
      <span className="mp-hero-avatar" aria-hidden="true">
        <span className="mp-hero-avatar-ring" />
        <span className="mp-hero-avatar-init">{initials}</span>
      </span>
      <div className="mp-hero-main">
        <strong>{name || '-'}</strong>
        <p>
          <span>Member · {tier || 'Silver'}</span>
          <span aria-hidden="true">·</span>
          <span>{location}</span>
        </p>
      </div>
      <div className="mp-hero-cta" onClick={(event) => event.stopPropagation()}>
        <button className="mp-btn mp-btn-light" type="button" onClick={onReceipts}>
          View receipts
        </button>
        <button className="mp-btn mp-btn-primary" type="button" onClick={onRebook}>
          Quick rebook
        </button>
      </div>
    </article>
  )
}

function DetailPanel({ tab, detail, primaryLabel, onHistory }) {
  return (
    <aside className="mp-detail" aria-label="Profile detail">
      <p className="mp-kicker">{tab}</p>
      <h2>{detail.title}</h2>
      <p className="mp-detail-sub">{detail.subtitle}</p>

      <dl className="mp-dl">
        <div className="mp-row">
          <dt>Primary</dt>
          <dd>{detail.a}</dd>
        </div>
        <div className="mp-row">
          <dt>Location</dt>
          <dd>{detail.b}</dd>
        </div>
        <div className="mp-row">
          <dt>Behavior</dt>
          <dd>{detail.c}</dd>
        </div>
        <div className="mp-row">
          <dt>Notes</dt>
          <dd>{detail.d}</dd>
        </div>
      </dl>

      <div className="mp-detail-actions">
        <button className="mp-btn mp-btn-primary mp-btn-block" type="button">
          {primaryLabel}
        </button>
        <button
          className="mp-btn mp-btn-block mp-btn-light"
          type="button"
          onClick={onHistory}
        >
          Go to History
        </button>
      </div>

      <p className="mp-note">
        Prototype note: this panel mirrors how your other screens use a sticky right-side
        detail surface. Clicking any card on the left updates it.
      </p>
    </aside>
  )
}

function EditDialog({ name, email, phone, location, saving, onClose, onSave }) {
  const [draft, setDraft] = useState({ name, email, phone, location })

  const setField = (key, value) => setDraft((d) => ({ ...d, [key]: value }))

  return (
    <div className="mp-dialog-backdrop" role="presentation" onClick={onClose}>
      <section
        className="mp-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mp-dialog-heading"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="mp-dialog-head">
          <div>
            <h2 id="mp-dialog-heading">Edit profile</h2>
            <p>Wireframe: saves are not persisted to the backend.</p>
          </div>
          <button
            type="button"
            className="mp-dialog-close"
            aria-label="Close"
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
        </header>

        <div className="mp-dialog-body">
          <div className="mp-form-grid">
            <label className="mp-field">
              <span>FULL NAME</span>
              <input
                type="text"
                value={draft.name}
                onChange={(event) => setField('name', event.target.value)}
              />
            </label>
            <label className="mp-field">
              <span>EMAIL</span>
              <input
                type="email"
                value={draft.email}
                onChange={(event) => setField('email', event.target.value)}
              />
            </label>
            <label className="mp-field">
              <span>PHONE</span>
              <input
                type="tel"
                value={draft.phone}
                onChange={(event) => setField('phone', event.target.value)}
              />
            </label>
            <label className="mp-field">
              <span>PREFERRED LOCATION</span>
              <input
                type="text"
                value={draft.location}
                onChange={(event) => setField('location', event.target.value)}
              />
            </label>
          </div>
        </div>

        <footer className="mp-dialog-foot">
          <button
            className="mp-btn mp-btn-light"
            type="button"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="mp-btn mp-btn-primary"
            type="button"
            onClick={() => onSave(draft)}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </footer>
      </section>
    </div>
  )
}

export default function MyProfilePage({ onOpenSidebar, onNavigate, session }) {
  const userId = session?.user?.id
  const [activeTab, setActiveTab] = useState('overview')
  const [profile, setProfile] = useState({
    id: '',
    name: '',
    email: session?.user?.email || '',
    phone: '',
    location: 'Downtown',
    tier: 'silver',
    loyaltyPoints: 0,
    memberSince: null,
  })
  const [savingDialog, setSavingDialog] = useState(false)

  useEffect(() => {
    if (!userId) return undefined
    let cancelled = false
    supabase
      .from('customers')
      .select('id, fullname, email, phone, tier, loyalty_points, member_since')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (cancelled || !data) return
        setProfile({
          id: data.id,
          name: data.fullname || session?.user?.email?.split('@')[0] || '',
          email: data.email || session?.user?.email || '',
          phone: data.phone || '',
          location: 'Downtown',
          tier: data.tier || 'silver',
          loyaltyPoints: data.loyalty_points || 0,
          memberSince: data.member_since || null,
        })
      })
    return () => {
      cancelled = true
    }
  }, [userId, session?.user?.email])
  const [selection, setSelection] = useState({
    overview: 'kv-email',
    preferences: 'pref-loc',
    security: 'password',
    billing: 'payment',
  })
  const [toggles, setToggles] = useState({
    't-defaultBarber': true,
    't-defaultService': true,
    't-prefLoc': true,
    't-timeWindow': false,
    't-marketing': false,
    't-2fa': false,
    't-tipDefault': true,
  })
  const [dialogOpen, setDialogOpen] = useState(false)

  const setItemSelection = (id) => {
    setSelection((prev) => ({ ...prev, [activeTab]: id }))
  }

  const onToggle = (id, value) => {
    setToggles((prev) => ({ ...prev, [id]: value }))
  }

  const onTabChange = (id) => {
    setActiveTab(id)
  }

  const onSave = async (draft) => {
    if (!userId) return
    setSavingDialog(true)
    const { error } = await supabase
      .from('customers')
      .update({
        fullname: draft.name,
        phone: draft.phone || null,
      })
      .eq('id', userId)
    setSavingDialog(false)
    if (error) {
      window.alert(`Couldn't save: ${error.message}`)
      return
    }
    setProfile((prev) => ({
      ...prev,
      name: draft.name,
      phone: draft.phone,
      location: draft.location,
    }))
    setDialogOpen(false)
  }

  const goBook = () => onNavigate?.('book')
  const goHistory = () => onNavigate?.('history')

  const selectedId = selection[activeTab]

  const detailFor = (() => {
    if (activeTab === 'overview') {
      if (selectedId === 'hero') return heroItem.detail
      const kv = kvFields.find((f) => f.id === selectedId)
      if (kv) return kv.detail
      const def = overviewDefaults.find((d) => d.id === selectedId)
      if (def) return def.detail
      return kvFields[0].detail
    }
    if (activeTab === 'preferences') {
      return (
        preferenceItems.find((i) => i.id === selectedId)?.detail ||
        preferenceItems[0].detail
      )
    }
    if (activeTab === 'security') {
      return (
        securityItems.find((i) => i.id === selectedId)?.detail || securityItems[0].detail
      )
    }
    return billingItems.find((i) => i.id === selectedId)?.detail || billingItems[0].detail
  })()

  const primaryLabel = activeTab === 'security' ? 'Review' : 'Edit this'

  const sectionLabel = {
    overview: 'Pick an item to see its details and actions on the right.',
    preferences: 'Toggle quiet defaults and communication settings.',
    security: 'Control sign-in and active devices.',
    billing: 'Manage payment methods and receipt exports.',
  }[activeTab]

  const listTitle = {
    overview: 'Account overview',
    preferences: 'Preferences',
    security: 'Security',
    billing: 'Billing',
  }[activeTab]

  const liveStats = [
    {
      id: 'tier',
      icon: 'user',
      value: tierLabel(profile.tier),
      label: 'Member tier',
      variant: 'gold',
    },
    {
      id: 'points',
      icon: 'star',
      value: profile.loyaltyPoints.toLocaleString(),
      label: 'Loyalty points',
    },
    {
      id: 'since',
      icon: 'clock',
      value: formatMemberSince(profile.memberSince),
      label: 'Member since',
    },
    { id: 'sessions', icon: 'sessions', value: '1', label: 'Active sessions' },
  ]

  return (
    <section className="customer-main mp-page" aria-label="My profile">
      <button
        aria-label="Open navigation"
        className="customer-square-button customer-mobile-menu-button mp-mobile-menu"
        type="button"
        onClick={onOpenSidebar}
      >
        <Icon name="menu" />
      </button>

      <nav className="mp-breadcrumb" aria-label="Breadcrumb">
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
        <span>My profile</span>
      </nav>

      <header className="mp-header">
        <div className="mp-heading">
          <h1>
            My profile<span>.</span>
          </h1>
          <p>
            Keep your details up to date, set booking defaults, and manage account security
            — without losing the Blade &amp; Co. vibe.
          </p>
        </div>
        <div className="mp-head-actions">
          <button
            className="mp-btn mp-btn-dark"
            type="button"
            onClick={() => setDialogOpen(true)}
          >
            <Icon name="pencil" />
            Edit profile
          </button>
          <button className="mp-btn mp-btn-primary" type="button" onClick={goBook}>
            <Icon name="plus" />
            New booking
          </button>
        </div>
      </header>

      <div className="mp-stats">
        {liveStats.map((stat) => (
          <article className="mp-stat" key={stat.id}>
            <span className={`mp-stat-icon${stat.variant === 'gold' ? ' is-gold' : ''}`}>
              <Icon name={stat.icon} />
            </span>
            <div>
              <strong>{stat.value}</strong>
              <small>{stat.label}</small>
            </div>
          </article>
        ))}
      </div>

      <div className="mp-tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            className={`mp-tab${activeTab === tab.id ? ' is-active' : ''}`}
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mp-content">
        <div className="mp-list-panel">
          <div className="mp-list-head">
            <p className="mp-list-title">{listTitle}</p>
            <p className="mp-list-hint">{sectionLabel}</p>
          </div>

          {activeTab === 'overview' && (
            <>
              <ProfileHero
                name={profile.name}
                location={profile.location}
                tier={tierLabel(profile.tier)}
                selected={selectedId === 'hero'}
                onSelect={setItemSelection}
                onRebook={goBook}
                onReceipts={goHistory}
              />

              <p className="mp-section-label">Personal details</p>
              <div className="mp-kv-grid">
                {kvFields.map((field) => {
                  const fieldValue =
                    field.id === 'kv-name'
                      ? profile.name || '-'
                      : field.id === 'kv-email'
                        ? profile.email || '-'
                        : field.id === 'kv-phone'
                          ? profile.phone || '-'
                          : field.id === 'kv-id'
                            ? memberIdFrom(profile.id)
                            : field.value
                  return (
                    <KvTile
                      key={field.id}
                      field={{ ...field, value: fieldValue }}
                      selected={selectedId === field.id}
                      onSelect={setItemSelection}
                    />
                  )
                })}
              </div>

              <p className="mp-section-label">Defaults</p>
              <div className="mp-item-list">
                {overviewDefaults.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    selected={selectedId === item.id}
                    onSelect={setItemSelection}
                    toggles={toggles}
                    onToggle={onToggle}
                  />
                ))}
              </div>
            </>
          )}

          {activeTab === 'preferences' && (
            <div className="mp-item-list">
              {preferenceItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  selected={selectedId === item.id}
                  onSelect={setItemSelection}
                  toggles={toggles}
                  onToggle={onToggle}
                />
              ))}
            </div>
          )}

          {activeTab === 'security' && (
            <div className="mp-item-list">
              {securityItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  selected={selectedId === item.id}
                  onSelect={setItemSelection}
                  toggles={toggles}
                  onToggle={onToggle}
                />
              ))}
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="mp-item-list">
              {billingItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  selected={selectedId === item.id}
                  onSelect={setItemSelection}
                  toggles={toggles}
                  onToggle={onToggle}
                />
              ))}
            </div>
          )}
        </div>

        <DetailPanel
          tab={activeTab}
          detail={detailFor}
          primaryLabel={primaryLabel}
          onHistory={goHistory}
        />
      </div>

      {dialogOpen && (
        <EditDialog
          name={profile.name}
          email={profile.email}
          phone={profile.phone}
          location={profile.location}
          saving={savingDialog}
          onClose={() => setDialogOpen(false)}
          onSave={onSave}
        />
      )}
    </section>
  )
}
