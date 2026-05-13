import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import Toast from '../components/Toast.jsx'
import {
  emailStatus,
  formatDate,
  formatDateTime,
  formatMemberSince,
  formatMoney,
  memberIdFrom,
  tierLabel,
  toggleText,
  useCustomerProfile,
  valueOrEmpty,
} from './useCustomerProfile.js'

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
    badge: 'EDIT',
  },
  {
    id: 'kv-email',
    label: 'EMAIL',
    badge: 'VERIFIED',
  },
  {
    id: 'kv-phone',
    label: 'PHONE',
    badge: 'SMS',
  },
  {
    id: 'kv-id',
    label: 'MEMBER ID',
    badge: 'COPY',
  },
]

const overviewDefaults = [
  {
    id: 'default-barber',
    title: 'Default barber',
    desc: 'Used when you hit "Quick rebook" — turn off to choose every time.',
    pills: [
      { label: 'Not set', variant: 'soft' },
      { label: 'Quick rebook', variant: 'soft' },
    ],
    toggle: 't-defaultBarber',
    detail: {
      title: 'Default barber',
      subtitle: 'Used when you hit "Quick rebook"',
      a: 'Not set',
      b: 'Choose a saved favourite',
      c: 'Auto-select on booking',
      d: '—',
    },
  },
  {
    id: 'default-service',
    title: 'Default service',
    desc: 'Pre-fills the service field when you start a new booking.',
    pills: [
      { label: 'Not set', variant: 'soft' },
      { label: 'Prefill off', variant: 'soft' },
      { label: 'Manual pick', variant: 'soft' },
    ],
    toggle: 't-defaultService',
    detail: {
      title: 'Default service',
      subtitle: 'Pre-filled on new bookings',
      a: 'Not set',
      b: 'Choose from the live services list',
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
    pills: [{ label: 'Current session', variant: 'soft' }],
    button: { label: 'Sign out all', variant: 'primary' },
    detail: {
      title: 'Active sessions',
      subtitle: 'Supabase Auth currently exposes the active browser session only',
      a: 'Current browser session',
      b: 'Sign-in history not loaded here',
      c: 'Current session only',
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
      { label: 'No saved card', variant: 'soft' },
      { label: 'Not configured', variant: 'soft' },
    ],
    button: { label: 'Manage', variant: 'light' },
    detail: {
      title: 'Payment method',
      subtitle: 'Payment data is not stored in this customer panel',
      a: 'No saved card',
      b: 'Payment table not configured',
      c: 'Use Settings or History for receipts',
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

function ItemCard({ item, selected, onSelect, toggles, onToggle, onButton }) {
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
            onClick={() => onButton?.(item)}
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

function DetailPanel({ tab, detail, primaryLabel, onPrimary, onHistory }) {
  const rows = detail.rows || [
    { label: 'Primary', value: detail.a },
    { label: 'Location', value: detail.b },
    { label: 'Behavior', value: detail.c },
    { label: 'Notes', value: detail.d },
  ]

  return (
    <aside className="mp-detail" aria-label="Profile detail">
      <p className="mp-kicker">{tab}</p>
      <h2>{detail.title}</h2>
      <p className="mp-detail-sub">{detail.subtitle}</p>

      <dl className="mp-dl">
        {rows.map((row) => (
          <div className="mp-row" key={row.label}>
            <dt>{row.label}</dt>
            <dd>{valueOrEmpty(row.value, '-')}</dd>
          </div>
        ))}
      </dl>

      <div className="mp-detail-actions">
        <button
          className="mp-btn mp-btn-primary mp-btn-block"
          type="button"
          onClick={onPrimary}
        >
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
        This detail is loaded from the signed-in profile, saved settings, and booking
        history available for this account.
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
            <p>Update your name, email, phone, and preferred location.</p>
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
  const {
    customer: profile,
    setCustomer: setProfile,
    facts: profileFacts,
    customerError: profileError,
    customerLoading: profileLoading,
    factsError: profileFactsError,
    factsLoading: profileFactsLoading,
  } = useCustomerProfile(session)
  const [savingDialog, setSavingDialog] = useState(false)
  const [toast, setToast] = useState('')
  const [toggles, setToggles] = useState({
    't-defaultBarber': true,
    't-defaultService': true,
    't-prefLoc': true,
    't-timeWindow': false,
    't-marketing': false,
    't-2fa': false,
    't-tipDefault': true,
  })
  const [selection, setSelection] = useState({
    overview: 'kv-email',
    preferences: 'pref-loc',
    security: 'password',
    billing: 'payment',
  })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [profileDirty, setProfileDirty] = useState(false)

  const setItemSelection = (id) => {
    setSelection((prev) => ({ ...prev, [activeTab]: id }))
  }

  const onToggle = (id, value) => {
    setToggles((prev) => ({ ...prev, [id]: value }))
    setProfileDirty(true)
  }

  const handleCardAction = async (item) => {
    if (item.id === 'password') {
      const email = profile.email || session?.user?.email
      if (!email) {
        setToast('No email address is saved for password recovery.')
        return
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      setToast(error ? `Couldn't send reset email: ${error.message}` : 'Password reset email sent.')
      return
    }
    if (item.id === 'sessions') {
      const { error } = await supabase.auth.signOut({ scope: 'global' })
      if (error) {
        setToast(`Couldn't sign out everywhere: ${error.message}`)
        return
      }
      onNavigate?.('login')
      return
    }
    if (item.id === 'payment') {
      onNavigate?.('settings')
      return
    }
    if (item.id === 'receipts') {
      goHistory()
    }
  }

  useEffect(() => {
    if (!userId || profileLoading || !profileDirty) return undefined

    const timeoutId = window.setTimeout(async () => {
      const { error } = await supabase.rpc('merge_settings', {
        patch: {
          profile_toggles: toggles,
        },
      })
      if (error) {
        setToast(`Couldn't save preference: ${error.message}`)
        return
      }
      setProfileDirty(false)
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [userId, profileLoading, profileDirty, toggles])

  useEffect(() => {
    if (profileLoading) return
    if (!profile.settings?.profile_toggles) return
    queueMicrotask(() => {
      setToggles((prev) => ({ ...prev, ...profile.settings.profile_toggles }))
    })
  }, [profileLoading, profile.settings?.profile_toggles])

  useEffect(() => {
    if (!profileError && !profileFactsError) return
    queueMicrotask(() => {
      setToast(
        profileError
          ? `Couldn't load profile: ${profileError}`
          : `Couldn't load profile details: ${profileFactsError}`,
      )
    })
  }, [profileError, profileFactsError])

  const onTabChange = (id) => {
    setActiveTab(id)
  }

  const onSave = async (draft) => {
    if (!userId) return
    setSavingDialog(true)
    const nextEmail = draft.email.trim()
    const nextLocation = draft.location.trim()
    const emailChanged = nextEmail && nextEmail !== profile.email

    if (emailChanged) {
      const { error: emailError } = await supabase.auth.updateUser({
        email: nextEmail,
      })
      if (emailError) {
        setSavingDialog(false)
        setToast(`Couldn't update email: ${emailError.message}`)
        return
      }
    }

    const { error } = await supabase
      .from('customers')
      .update({
        fullname: draft.name || null,
        email: nextEmail || profile.email,
        phone: draft.phone || null,
      })
      .eq('id', userId)
    setSavingDialog(false)
    if (error) {
      setToast(`Couldn't save: ${error.message}`)
      return
    }
    setProfile((prev) => ({
      ...prev,
      name: draft.name || '',
      email: nextEmail || prev.email,
      phone: draft.phone || '',
      location: nextLocation || '',
      settings: {
        ...prev.settings,
        preferred_location: nextLocation || '',
      },
      updatedAt: new Date().toISOString(),
    }))
    const { error: settingsError } = await supabase.rpc('merge_settings', {
      patch: {
        preferred_location: nextLocation || '',
      },
    })
    if (settingsError) {
      setToast(`Saved profile, but location sync failed: ${settingsError.message}`)
    } else if (emailChanged) {
      setToast('Check your inbox to confirm your new email address.')
    } else {
      setToast('Profile updated.')
    }
    setDialogOpen(false)
  }

  const goBook = () => onNavigate?.('book')
  const goHistory = () => onNavigate?.('history')

  const selectedId = selection[activeTab]
  const favoriteBarber = profileFacts.favoriteBarber
  const latestVisit = profileFacts.latestVisit
  const nextAppointment = profileFacts.nextAppointment
  const defaultBarberName =
    favoriteBarber?.fullname ||
    nextAppointment?.barber?.fullname ||
    latestVisit?.barber?.fullname ||
    'Not set'
  const defaultBarberLocation =
    favoriteBarber?.location ||
    nextAppointment?.barber?.location ||
    nextAppointment?.location ||
    latestVisit?.barber?.location ||
    latestVisit?.location ||
    'Not set'
  const defaultServiceName =
    profile.settings?.default_service || nextAppointment?.service || latestVisit?.service || 'Not set'
  const emailState = emailStatus(session?.user)
  const lastSignIn = formatDateTime(session?.user?.last_sign_in_at)
  const memberId = memberIdFrom(profile.id || userId)
  const activeSessionCount = session?.user ? 1 : 0
  const activeSessionText =
    activeSessionCount === 1 ? '1 current session' : 'No active session'
  const dataLoading = profileLoading || profileFactsLoading
  const displayName = dataLoading ? 'Loading…' : profile.name || profile.email || 'Not added'
  const displayLocation = dataLoading ? 'Loading…' : valueOrEmpty(profile.location, 'Not added')

  const detailFor = useMemo(() => {
    const overviewDetails = {
      hero: {
        title: 'Profile',
        subtitle: `Member · ${tierLabel(profile.tier)}`,
        rows: [
          { label: 'Name', value: valueOrEmpty(profile.name, 'Not added') },
          { label: 'Email', value: valueOrEmpty(profile.email, 'Not added') },
          { label: 'Phone', value: valueOrEmpty(profile.phone, 'Not added') },
          { label: 'Preferred branch', value: valueOrEmpty(profile.location, 'Not added') },
          { label: 'Last profile sync', value: formatDateTime(profile.updatedAt) },
        ],
      },
      'kv-name': {
        title: 'Full name',
        subtitle: 'Display name on receipts and reminders',
        rows: [
          { label: 'Saved name', value: valueOrEmpty(profile.name, 'Not added') },
          { label: 'Member ID', value: memberId },
          { label: 'Member since', value: formatDate(profile.memberSince) },
          { label: 'Last updated', value: formatDateTime(profile.updatedAt) },
        ],
      },
      'kv-email': {
        title: 'Email',
        subtitle: 'Used for confirmations, receipts, and account recovery',
        rows: [
          { label: 'Saved email', value: valueOrEmpty(profile.email, 'Not added') },
          { label: 'Auth status', value: emailState },
          { label: 'Last sign-in', value: lastSignIn },
          { label: 'Supabase user', value: memberId },
        ],
      },
      'kv-phone': {
        title: 'Phone',
        subtitle: 'Used for SMS reminders when you provide a number',
        rows: [
          { label: 'Saved phone', value: valueOrEmpty(profile.phone, 'Not added') },
          { label: 'SMS reminders', value: profile.phone ? 'Available' : 'No phone saved' },
          { label: 'Marketing', value: toggles['t-marketing'] ? 'Allowed' : 'Off' },
          { label: 'Last updated', value: formatDateTime(profile.updatedAt) },
        ],
      },
      'kv-id': {
        title: 'Member ID',
        subtitle: 'Your Blade & Co. customer reference',
        rows: [
          { label: 'Member ID', value: memberId },
          { label: 'Customer row', value: valueOrEmpty(profile.id, 'Not added') },
          { label: 'Tier', value: tierLabel(profile.tier) },
          { label: 'Points', value: profile.loyaltyPoints.toLocaleString() },
        ],
      },
      'default-barber': {
        title: 'Default barber',
        subtitle: 'Based on your saved favourite or recent booking activity',
        rows: [
          { label: 'Barber', value: valueOrEmpty(defaultBarberName, 'Not set') },
          { label: 'Location', value: valueOrEmpty(defaultBarberLocation, 'Not set') },
          { label: 'Favourite saved', value: favoriteBarber ? 'Yes' : 'No favourite barber' },
          { label: 'Quick rebook', value: toggleText(toggles['t-defaultBarber']) },
        ],
      },
      'default-service': {
        title: 'Default service',
        subtitle: 'Based on saved settings, next booking, or latest visit',
        rows: [
          { label: 'Service', value: valueOrEmpty(defaultServiceName, 'Not set') },
          {
            label: 'Next booking',
            value: nextAppointment
              ? `${nextAppointment.service} · ${formatDateTime(nextAppointment.scheduled_at)}`
              : 'No upcoming booking',
          },
          {
            label: 'Latest visit',
            value: latestVisit
              ? `${latestVisit.service} · ${formatDate(latestVisit.visited_at)}`
              : 'No visits yet',
          },
          { label: 'Auto-select', value: toggleText(toggles['t-defaultService']) },
        ],
      },
    }

    const preferenceDetails = {
      'pref-loc': {
        title: 'Preferred location',
        subtitle: 'Saved on your customer settings',
        rows: [
          { label: 'Preferred branch', value: profile.location },
          { label: 'Next appointment', value: nextAppointment?.location || '-' },
          { label: 'Latest visit', value: latestVisit?.location || '-' },
          { label: 'Auto-select', value: toggleText(toggles['t-prefLoc']) },
        ],
      },
      'time-window': {
        title: 'Time window',
        subtitle: 'Booking-time preference saved for this account',
        rows: [
          { label: 'Saved window', value: profile.settings?.time_window || 'Not saved' },
          {
            label: 'Next booking',
            value: nextAppointment ? formatDateTime(nextAppointment.scheduled_at) : 'No upcoming booking',
          },
          { label: 'Suggestion toggle', value: toggleText(toggles['t-timeWindow']) },
          { label: 'Stored in profile', value: profile.settings?.time_window ? 'Yes' : 'No' },
        ],
      },
      marketing: {
        title: 'Communication',
        subtitle: 'Contact options available for this signed-in account',
        rows: [
          { label: 'Email receipts', value: profile.email ? 'Available' : 'No email saved' },
          { label: 'SMS reminders', value: profile.phone ? 'Available' : 'No phone saved' },
          { label: 'Marketing', value: toggles['t-marketing'] ? 'Allowed' : 'Off' },
          { label: 'Email status', value: emailState },
        ],
      },
    }

    const securityDetails = {
      password: {
        title: 'Password',
        subtitle: 'Supabase Auth status for the signed-in account',
        rows: [
          { label: 'Email', value: session?.user?.email || profile.email },
          { label: 'Email status', value: emailState },
          { label: 'Last sign-in', value: lastSignIn },
          { label: 'Account created', value: formatDate(session?.user?.created_at) },
        ],
      },
      '2fa': {
        title: 'Two-factor authentication',
        subtitle: 'Preference state saved on your profile',
        rows: [
          { label: 'Toggle', value: toggles['t-2fa'] ? 'Requested' : 'Off' },
          { label: 'Auth provider', value: session?.user?.app_metadata?.provider || 'email' },
          { label: 'Phone factor', value: profile.phone ? 'Phone saved' : 'No phone saved' },
          { label: 'Status', value: 'No MFA enrollment table connected' },
        ],
      },
      sessions: {
        title: 'Active sessions',
        subtitle: 'Current browser session from Supabase Auth',
        rows: [
          { label: 'Known sessions', value: activeSessionText },
          { label: 'Last sign-in', value: lastSignIn },
          { label: 'User ID', value: profile.id || session?.user?.id },
          { label: 'Global sign-out', value: 'Available from this card' },
        ],
      },
    }

    const billingDetails = {
      payment: {
        title: 'Payment method',
        subtitle: 'Payment data available for this profile',
        rows: [
          { label: 'Primary card', value: 'No saved card' },
          { label: 'Payment table', value: 'Not configured' },
          { label: 'Customer email', value: profile.email },
          { label: 'Receipts', value: `${profileFacts.visitsCount} visit records` },
        ],
      },
      receipts: {
        title: 'Receipts',
        subtitle: 'Generated from completed visits',
        rows: [
          { label: 'Total visits', value: profileFacts.visitsCount },
          {
            label: 'Latest visit',
            value: latestVisit
              ? `${latestVisit.service} · ${formatDate(latestVisit.visited_at)}`
              : 'No visits yet',
          },
          { label: 'Latest total', value: latestVisit ? formatMoney(latestVisit.price_cents) : '-' },
          { label: 'Export', value: 'CSV from History' },
        ],
      },
      tips: {
        title: 'Tips default',
        subtitle: 'Checkout preference saved for this profile',
        rows: [
          { label: 'Saved default', value: profile.settings?.default_tip_percent || 'Not saved' },
          { label: 'Toggle', value: toggleText(toggles['t-tipDefault']) },
          { label: 'Latest rating', value: latestVisit?.rating ? `${latestVisit.rating}/5` : '-' },
          { label: 'Editable', value: 'At checkout' },
        ],
      },
    }

    if (activeTab === 'overview') return overviewDetails[selectedId] || overviewDetails.hero
    if (activeTab === 'preferences') return preferenceDetails[selectedId] || preferenceDetails['pref-loc']
    if (activeTab === 'security') return securityDetails[selectedId] || securityDetails.password
    return billingDetails[selectedId] || billingDetails.payment
  }, [
    activeTab,
    defaultBarberLocation,
    defaultBarberName,
    defaultServiceName,
    emailState,
    favoriteBarber,
    lastSignIn,
    latestVisit,
    memberId,
    nextAppointment,
    profile,
    profileFacts.visitsCount,
    selectedId,
    session?.user,
    activeSessionText,
    toggles,
  ])

  const primaryLabel =
    activeTab === 'billing' ? 'Open History' : activeTab === 'security' ? 'Review' : 'Edit this'

  const onDetailPrimary = () => {
    if (activeTab === 'billing') {
      goHistory()
      return
    }
    if (activeTab === 'security') {
      setToast('Security details are loaded from the current Supabase Auth session.')
      return
    }
    setDialogOpen(true)
  }

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

  const liveOverviewDefaults = overviewDefaults.map((item) => {
    if (item.id === 'default-barber') {
      return {
        ...item,
        desc: 'Uses your saved favourite first, then recent booking activity.',
        pills: [
          { label: defaultBarberName, variant: defaultBarberName === 'Not set' ? 'soft' : 'gold' },
          ...(defaultBarberLocation !== '-' ? [{ label: defaultBarberLocation, variant: 'soft' }] : []),
        ],
      }
    }
    if (item.id === 'default-service') {
      return {
        ...item,
        desc: 'Uses a saved setting first, then your next booking or latest visit.',
        pills: [
          { label: defaultServiceName, variant: defaultServiceName === 'Not set' ? 'soft' : 'gold' },
          ...(nextAppointment?.duration_minutes
            ? [{ label: `${nextAppointment.duration_minutes} min`, variant: 'soft' }]
            : []),
        ],
      }
    }
    return item
  })

  const livePreferenceItems = preferenceItems.map((item) => {
    if (item.id === 'pref-loc') {
      return {
        ...item,
        pills: [
          { label: profile.location || 'Not set', variant: profile.location ? 'gold' : 'soft' },
          ...(latestVisit?.location ? [{ label: `Latest: ${latestVisit.location}`, variant: 'soft' }] : []),
        ],
      }
    }
    if (item.id === 'time-window') {
      const savedWindow = profile.settings?.time_window || 'Not saved'
      return {
        ...item,
        pills: [{ label: savedWindow, variant: savedWindow === 'Not saved' ? 'soft' : 'gold' }],
      }
    }
    if (item.id === 'marketing') {
      return {
        ...item,
        pills: [
          { label: profile.phone ? 'SMS available' : 'No phone saved', variant: profile.phone ? 'gold' : 'soft' },
          { label: emailState, variant: emailState === 'Verified' ? 'gold' : 'soft' },
        ],
      }
    }
    return item
  })

  const liveSecurityItems = securityItems.map((item) => {
    if (item.id === 'password') {
      return {
        ...item,
        pills: [
          { label: emailState, variant: emailState === 'Verified' ? 'gold' : 'soft' },
          { label: `Last sign-in: ${lastSignIn}`, variant: 'soft' },
        ],
      }
    }
    if (item.id === '2fa') {
      return {
        ...item,
        pills: [
          { label: toggles['t-2fa'] ? 'Requested' : 'Off', variant: toggles['t-2fa'] ? 'gold' : 'soft' },
          { label: session?.user?.app_metadata?.provider || 'email', variant: 'soft' },
        ],
      }
    }
    if (item.id === 'sessions') {
      return {
        ...item,
        pills: [{ label: 'Current session', variant: 'soft' }],
      }
    }
    return item
  })

  const liveBillingItems = billingItems.map((item) => {
    if (item.id === 'payment') {
      return {
        ...item,
        pills: [
          { label: 'No saved card', variant: 'soft' },
          { label: profile.email || 'No email', variant: profile.email ? 'gold' : 'soft' },
        ],
      }
    }
    if (item.id === 'receipts') {
      return {
        ...item,
        pills: [
          { label: `${profileFacts.visitsCount} visits`, variant: profileFacts.visitsCount ? 'gold' : 'soft' },
          { label: latestVisit ? formatMoney(latestVisit.price_cents) : 'No receipts', variant: 'soft' },
        ],
      }
    }
    if (item.id === 'tips') {
      const tipDefault = profile.settings?.default_tip_percent
      return {
        ...item,
        pills: [
          { label: tipDefault ? `${tipDefault}%` : 'No default', variant: tipDefault ? 'gold' : 'soft' },
          { label: toggleText(toggles['t-tipDefault']), variant: 'soft' },
        ],
      }
    }
    return item
  })

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
    { id: 'sessions', icon: 'sessions', value: activeSessionCount, label: 'Active sessions' },
  ]

  return (
    <section className="customer-main mp-page" aria-label="My profile">
      <Toast message={toast} onClose={() => setToast('')} />
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
                name={displayName}
                location={displayLocation}
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
                    dataLoading
                      ? 'Loading…'
                      : field.id === 'kv-name'
                        ? valueOrEmpty(profile.name, 'Not added')
                        : field.id === 'kv-email'
                          ? valueOrEmpty(profile.email, 'Not added')
                          : field.id === 'kv-phone'
                            ? valueOrEmpty(profile.phone, 'Not added')
                            : field.id === 'kv-id'
                              ? memberIdFrom(profile.id)
                              : 'Not added'
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
                {liveOverviewDefaults.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    selected={selectedId === item.id}
                    onSelect={setItemSelection}
                    toggles={toggles}
                    onToggle={onToggle}
                    onButton={handleCardAction}
                  />
                ))}
              </div>
            </>
          )}

          {activeTab === 'preferences' && (
            <div className="mp-item-list">
              {livePreferenceItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  selected={selectedId === item.id}
                  onSelect={setItemSelection}
                  toggles={toggles}
                  onToggle={onToggle}
                  onButton={handleCardAction}
                />
              ))}
            </div>
          )}

          {activeTab === 'security' && (
            <div className="mp-item-list">
              {liveSecurityItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  selected={selectedId === item.id}
                  onSelect={setItemSelection}
                  toggles={toggles}
                  onToggle={onToggle}
                  onButton={handleCardAction}
                />
              ))}
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="mp-item-list">
              {liveBillingItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  selected={selectedId === item.id}
                  onSelect={setItemSelection}
                  toggles={toggles}
                  onToggle={onToggle}
                  onButton={handleCardAction}
                />
              ))}
            </div>
          )}
        </div>

        <DetailPanel
          tab={activeTab}
          detail={detailFor}
          primaryLabel={primaryLabel}
          onPrimary={onDetailPrimary}
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
