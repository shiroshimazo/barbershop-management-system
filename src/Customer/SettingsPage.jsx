import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const DEFAULT_TOGGLES = {
  't-region': true,
  't-quick': true,
  't-reminders': true,
  't-pdf': true,
  't-quiet': true,
  't-mkt': false,
  't-analytics': true,
  't-alerts': true,
  't-card': true,
  't-tip': true,
  't-export': true,
  't-diag': true,
  't-auto': false,
}

const stats = [
  { id: 'tier', icon: 'star', value: 'Gold', label: 'Member tier', variant: 'gold' },
  { id: 'delivery', icon: 'bell', value: '3', label: 'Delivery rules' },
  { id: 'privacy', icon: 'shield', value: 'Standard', label: 'Privacy posture' },
  { id: 'sessions', icon: 'device', value: '2', label: 'Active sessions' },
]

const tabs = [
  { id: 'general', label: 'General', count: 6 },
  { id: 'notifications', label: 'Notifications', count: 5 },
  { id: 'privacy', label: 'Privacy', count: 4 },
  { id: 'billing', label: 'Billing', count: 3 },
  { id: 'help', label: 'Help' },
]

const chips = [
  { id: 'all', label: 'All' },
  { id: 'account', label: 'Account' },
  { id: 'booking', label: 'Booking' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'advanced', label: 'Advanced' },
]

const itemsByTab = {
  general: [
    {
      id: 'region',
      section: 'Account',
      title: 'Language & region',
      sub: 'Pick a setting to review details and actions on the right.',
      filter: 'account',
      icon: 'globe',
      iconVariant: 'gold',
      pills: [
        { label: 'English (US)', variant: 'gold' },
        { label: 'USD', variant: 'soft' },
        { label: '12-hour', variant: 'soft' },
      ],
      toggleId: 't-region',
      detail: {
        title: 'Language & region',
        sub: 'Controls dates, currency, and formatting.',
        a: 'English (US)',
        b: 'USD',
        c: '12-hour',
        d: 'Week starts: Monday',
        primary: 'Edit preferences',
        secondary: 'Reset to default',
      },
    },
    {
      id: 'quick',
      section: 'Account',
      title: 'Quick rebook behavior',
      sub: 'Speeds up booking when you tap "Quick rebook" — confirm or auto-go.',
      filter: 'booking',
      icon: 'rotate',
      iconVariant: 'default',
      pills: [
        { label: 'Auto-pick slot', variant: 'soft' },
        { label: 'Confirm', variant: 'gold' },
      ],
      toggleId: 't-quick',
      detail: {
        title: 'Quick rebook behavior',
        sub: 'How "Quick rebook" handles your defaults.',
        a: 'Default barber: Jordan Tate',
        b: 'Default service: Classic Fade + Beard Trim',
        c: 'Auto-pick next available slot',
        d: 'Confirm before booking',
        primary: 'Tune quick rebook',
        secondary: 'Open My profile',
      },
    },
    {
      id: 'theme',
      section: 'Appearance',
      title: 'Theme',
      sub: 'Match your environment. Keep the gold tone, dim everything else.',
      filter: 'advanced',
      icon: 'sun',
      iconVariant: 'default',
      isTheme: true,
      detail: {
        title: 'Theme',
        sub: 'How the portal looks across pages.',
        a: 'Current: {theme}',
        b: 'Follow system: Off',
        c: 'High contrast: Off',
        d: 'Reduced motion: Off',
        primary: 'Switch theme',
        secondary: 'Toggle reduced motion',
      },
    },
  ],
  notifications: [
    {
      id: 'reminders',
      section: 'Delivery',
      title: 'Appointment reminders',
      sub: 'Two-step reminders before every booking. Always on for security alerts.',
      filter: 'account',
      icon: 'calendar',
      iconVariant: 'gold',
      pills: [
        { label: '24h', variant: 'gold' },
        { label: '2h', variant: 'soft' },
        { label: 'Quiet hours', variant: 'soft' },
      ],
      toggleId: 't-reminders',
      detail: {
        title: 'Appointment reminders',
        sub: 'When we ping you before a visit.',
        a: '24 hours before',
        b: '2 hours before',
        c: 'Quiet hours respected',
        d: 'Calendar add-on suggested',
        primary: 'Edit schedule',
        secondary: 'Test notification',
      },
    },
    {
      id: 'pdf',
      section: 'Delivery',
      title: 'Receipts & exports',
      sub: 'Auto-send PDF receipts after every paid visit.',
      filter: 'account',
      icon: 'receipt',
      iconVariant: 'default',
      pills: [
        { label: 'Email on', variant: 'ok' },
        { label: 'SMS off', variant: 'soft' },
      ],
      toggleId: 't-pdf',
      detail: {
        title: 'Receipts & exports',
        sub: 'How receipts get to you.',
        a: 'Email: On',
        b: 'SMS: Off',
        c: 'Auto-send PDF: On',
        d: 'CSV available on export',
        primary: 'Edit receipt delivery',
        secondary: 'Open History',
      },
    },
    {
      id: 'quiet',
      section: 'Quiet',
      title: 'Quiet hours',
      sub: 'Mutes marketing + offers overnight. Security alerts still come through.',
      filter: 'advanced',
      icon: 'moon',
      iconVariant: 'default',
      pills: [
        { label: '10–8', variant: 'gold' },
        { label: 'Security allowed', variant: 'soft' },
      ],
      toggleId: 't-quiet',
      detail: {
        title: 'Quiet hours',
        sub: 'When we hold non-urgent messages.',
        a: '10:00 PM → 8:00 AM',
        b: 'Allowed: security alerts',
        c: 'Allowed: same-day booking changes',
        d: 'Muted: offers + marketing',
        primary: 'Adjust quiet hours',
        secondary: 'Preview rules',
      },
    },
  ],
  privacy: [
    {
      id: 'mkt',
      section: 'Privacy',
      title: 'Marketing messages',
      sub: 'Offers + perks across email and SMS. Receipts are never marketing.',
      filter: 'privacy',
      icon: 'megaphone',
      iconVariant: 'default',
      pills: [
        { label: 'Email off', variant: 'soft' },
        { label: 'SMS off', variant: 'soft' },
        { label: 'Perks on', variant: 'gold' },
      ],
      toggleId: 't-mkt',
      detail: {
        title: 'Marketing messages',
        sub: 'What promotional content reaches you.',
        a: 'Email offers: Off',
        b: 'SMS offers: Off',
        c: 'In-app perks: On',
        d: 'Receipts unaffected',
        primary: 'Manage marketing',
        secondary: 'View perks',
      },
    },
    {
      id: 'analytics',
      section: 'Privacy',
      title: 'Data sharing',
      sub: 'Anonymous analytics help us improve the portal. Personalised ads stay off.',
      filter: 'privacy',
      icon: 'chart',
      iconVariant: 'default',
      pills: [
        { label: 'Analytics', variant: 'ok' },
        { label: 'No ads', variant: 'soft' },
      ],
      toggleId: 't-analytics',
      detail: {
        title: 'Data sharing',
        sub: 'How we use your activity.',
        a: 'Anonymous analytics: On',
        b: 'Personalized ads: Off',
        c: 'Third-party sharing: Off',
        d: 'Export available anytime',
        primary: 'Review data sharing',
        secondary: 'Export my data',
      },
    },
    {
      id: 'alerts',
      section: 'Security',
      title: 'Sign-in alerts',
      sub: 'Pings you any time someone signs in from a new device.',
      filter: 'advanced',
      icon: 'shield',
      iconVariant: 'default',
      pills: [
        { label: 'Bypass quiet hours', variant: 'gold' },
        { label: 'Email + in-app', variant: 'soft' },
      ],
      toggleId: 't-alerts',
      detail: {
        title: 'Sign-in alerts',
        sub: 'New-device sign-in notifications.',
        a: 'Alerts: On',
        b: 'Channels: in-app + email',
        c: 'Quiet hours bypassed',
        d: 'Last sign-in: 2 days ago',
        primary: 'Review devices',
        secondary: 'Change password',
      },
    },
  ],
  billing: [
    {
      id: 'card',
      section: 'Billing',
      title: 'Payment method',
      sub: 'Used for in-store taps and online bookings.',
      filter: 'account',
      icon: 'card',
      iconVariant: 'gold',
      pills: [
        { label: 'Primary', variant: 'gold' },
        { label: 'Visa 4821', variant: 'soft' },
      ],
      toggleId: 't-card',
      detail: {
        title: 'Payment method',
        sub: 'Primary card on file.',
        a: 'Visa •••• 4821',
        b: 'Expires 08/28',
        c: 'Primary: Yes',
        d: 'Backup: —',
        primary: 'Manage cards',
        secondary: 'Add a card',
      },
    },
    {
      id: 'tip',
      section: 'Billing',
      title: 'Tip defaults',
      sub: 'Pre-fills tips at checkout. Change anytime at the till.',
      filter: 'booking',
      icon: 'coin',
      iconVariant: 'default',
      pills: [
        { label: '15%', variant: 'gold' },
        { label: 'Quick buttons', variant: 'soft' },
      ],
      toggleId: 't-tip',
      detail: {
        title: 'Tip defaults',
        sub: 'Default tip on checkout.',
        a: 'Default: 15%',
        b: 'Quick buttons: 10 / 15 / 20',
        c: 'Round totals: Off',
        d: 'Receipts show itemized tip',
        primary: 'Edit tip defaults',
        secondary: 'Disable auto-fill',
      },
    },
    {
      id: 'export',
      section: 'Billing',
      title: 'Receipts export',
      sub: 'Download or email your visit history.',
      filter: 'account',
      icon: 'download',
      iconVariant: 'default',
      pills: [
        { label: 'PDF', variant: 'soft' },
        { label: 'CSV', variant: 'soft' },
        { label: 'Email', variant: 'ok' },
      ],
      toggleId: 't-export',
      detail: {
        title: 'Receipts export',
        sub: 'How exports are produced.',
        a: 'Default range: last 12 months',
        b: 'PDF: On',
        c: 'CSV: On',
        d: 'Email delivery: On',
        primary: 'Export now',
        secondary: 'Change default range',
      },
    },
  ],
  help: [
    {
      id: 'support',
      section: 'Help',
      title: 'Contact support',
      sub: 'Real humans at the other end. Reply within ~4 hours.',
      filter: 'account',
      icon: 'chat',
      iconVariant: 'gold',
      pills: [
        { label: 'Human', variant: 'gold' },
        { label: '~4h', variant: 'soft' },
      ],
      toggleId: 't-diag',
      detail: {
        title: 'Contact support',
        sub: 'How to reach Blade & Co.',
        a: 'Support hours: 10 AM–6 PM',
        b: 'Email: support@bladeco.example',
        c: 'Response SLA: ~4 hours',
        d: 'Attach receipts from History',
        primary: 'Start a message',
        secondary: 'Open FAQ',
      },
    },
    {
      id: 'about',
      section: 'Help',
      title: 'About',
      sub: 'Version info and the legalese — kept short on purpose.',
      filter: 'advanced',
      icon: 'info',
      iconVariant: 'default',
      pills: [
        { label: 'v0.9', variant: 'soft' },
        { label: 'Policies', variant: 'soft' },
      ],
      toggleId: 't-auto',
      detail: {
        title: 'About',
        sub: 'Blade & Co. portal info.',
        a: 'App version: 0.9 (wireframe)',
        b: 'Terms: Updated May 2026',
        c: 'Privacy: Updated May 2026',
        d: 'Licenses available',
        primary: 'View terms',
        secondary: 'View privacy',
        tertiary: 'Licenses',
      },
    },
  ],
}

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
    bell: (
      <>
        <path d="M18.25 16.25H5.75l1.4-1.9V10a4.85 4.85 0 0 1 9.7 0v4.35z" />
        <path d="M10 18.25a2 2 0 0 0 4 0" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3.5 5.25 6v6c0 4.3 3 7.4 6.75 8.5C15.75 19.4 18.75 16.3 18.75 12V6z" />
      </>
    ),
    device: (
      <>
        <path d="M4.75 5.75h14.5v9.5H4.75z" />
        <path d="M9 19.25h6" />
        <path d="M12 17v2.25" />
      </>
    ),
    globe: (
      <>
        <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
        <path d="M3 12h18" />
        <path d="M12 3c2.5 2.5 4 5.5 4 9s-1.5 6.5-4 9c-2.5-2.5-4-5.5-4-9s1.5-6.5 4-9Z" />
      </>
    ),
    rotate: (
      <>
        <path d="M5.75 7.75a7.25 7.25 0 1 1-.6 7.45" />
        <path d="M5.75 3.75v4h4" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.75v2M12 19.25v2M2.75 12h2M19.25 12h2M5.5 5.5l1.5 1.5M17 17l1.5 1.5M5.5 18.5 7 17M17 7l1.5-1.5" />
      </>
    ),
    moon: (
      <path d="M19.5 14.5A8 8 0 1 1 9.5 4.5a6.5 6.5 0 0 0 10 10Z" />
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
    megaphone: (
      <>
        <path d="M4.5 14.5V9.5l11-4.25v13.5z" />
        <path d="M15.5 8.5a3.5 3.5 0 0 1 0 7" />
      </>
    ),
    chart: (
      <>
        <path d="M4.75 19.25h14.5" />
        <path d="M7 16V10M11 16V6M15 16v-4" />
      </>
    ),
    card: (
      <>
        <path d="M3.5 7.75h17v9.5h-17z" />
        <path d="M3.5 11h17" />
        <path d="M7 14.5h3" />
      </>
    ),
    coin: (
      <>
        <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
        <path d="M14.5 9.25c-.4-.7-1.4-1-2.5-1-1.6 0-2.7.6-2.7 1.6 0 2.4 5.4 1.4 5.4 3.7 0 1.1-1.2 1.7-2.7 1.7-1.2 0-2.3-.4-2.7-1.2" />
        <path d="M12 7v10" />
      </>
    ),
    download: (
      <>
        <path d="M12 4v11" />
        <path d="m7.75 10.75 4.25 4.25 4.25-4.25" />
        <path d="M5 19.25h14" />
      </>
    ),
    chat: (
      <>
        <path d="M4.75 5.75h14.5v10h-9l-5.5 3z" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 10.5v6" />
        <circle cx="12" cy="7.5" r="0.9" fill="currentColor" />
      </>
    ),
    save: (
      <>
        <path d="M5.75 4.75h10l3.5 3.5v11h-13.5z" />
        <path d="M8 4.75v4h6.5v-4" />
        <path d="M8 14h8v5.25H8z" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),
    search: (
      <>
        <path d="M10.75 17.25a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Z" />
        <path d="m15.5 15.5 4.25 4.25" />
      </>
    ),
    menu: (
      <>
        <path d="M4.5 7h15" />
        <path d="M4.5 12h15" />
        <path d="M4.5 17h15" />
      </>
    ),
    check: (
      <path d="m5 12 4.5 4.5L19 7" />
    ),
    chevron: (
      <path d="m8 10 4 4 4-4" />
    ),
  }
  return <svg {...commonProps}>{paths[name]}</svg>
}

function Pill({ pill }) {
  const variantClass =
    pill.variant === 'gold'
      ? 'st-pill-gold'
      : pill.variant === 'ok'
        ? 'st-pill-ok'
        : pill.variant === 'warn'
          ? 'st-pill-warn'
          : 'st-pill-soft'
  return <span className={`st-pill ${variantClass}`}>{pill.label}</span>
}

function Toggle({ checked, onChange, on = 'On', off = 'Off' }) {
  return (
    <button
      type="button"
      className={`st-toggle${checked ? ' is-on' : ''}`}
      aria-pressed={checked}
      onClick={(event) => {
        event.stopPropagation()
        onChange(!checked)
      }}
    >
      <span className="st-toggle-label">{checked ? on : off}</span>
      <span className="st-switch" aria-hidden="true">
        <span className="st-switch-thumb" />
      </span>
    </button>
  )
}

function SettingItem({ item, selected, onSelect, toggleState, onToggle, theme }) {
  let toggleEl = null
  if (item.isTheme) {
    toggleEl = (
      <Toggle
        checked={theme === 'dark'}
        onChange={() => onToggle('theme')}
        on="Dark"
        off="Light"
      />
    )
  } else if (item.toggleId) {
    toggleEl = (
      <Toggle
        checked={!!toggleState[item.toggleId]}
        onChange={(v) => onToggle(item.toggleId, v)}
      />
    )
  }

  return (
    <article
      className={`st-item${selected ? ' is-selected' : ''}`}
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
      <span className={`st-item-icon${item.iconVariant === 'gold' ? ' is-gold' : ''}`}>
        <Icon name={item.icon} />
      </span>
      <div className="st-item-body">
        <h3>{item.title}</h3>
        <p>{item.sub}</p>
        <div className="st-item-pills">
          {item.pills?.map((pill) => (
            <Pill key={pill.label} pill={pill} />
          ))}
        </div>
      </div>
      <div className="st-item-control" onClick={(event) => event.stopPropagation()}>
        {toggleEl}
      </div>
    </article>
  )
}

function DetailPanel({
  activeTab,
  item,
  preset,
  onPresetChange,
  onAction,
  onDanger,
  dangerOpen,
  onSignOutAll,
  onDeleteAccount,
  theme,
}) {
  if (!item) return null
  const detail = item.detail
  const tertiaryText = detail.tertiary
  const isThemeItem = item.isTheme
  const aValue = detail.a.includes('{theme}')
    ? detail.a.replace('{theme}', theme === 'dark' ? 'Dark' : 'Light')
    : detail.a

  return (
    <aside className="st-detail" aria-label="Settings detail">
      <p className="st-kicker">{activeTab}</p>
      <h2>{detail.title}</h2>
      <p className="st-detail-sub">{detail.sub}</p>

      <dl className="st-dl">
        <div className="st-row">
          <dt>Primary</dt>
          <dd>{aValue}</dd>
        </div>
        <div className="st-row">
          <dt>Currency</dt>
          <dd>{detail.b}</dd>
        </div>
        <div className="st-row">
          <dt>Format</dt>
          <dd>{detail.c}</dd>
        </div>
        <div className="st-row">
          <dt>Week start</dt>
          <dd>{detail.d}</dd>
        </div>
      </dl>

      <div className="st-quick">
        <label className="st-select">
          <div>
            <span className="st-select-label">Preset</span>
            <span className="st-select-value">{preset}</span>
          </div>
          <select
            value={preset}
            onChange={(event) => onPresetChange(event.target.value)}
          >
            <option value="Standard">Standard</option>
            <option value="Private">Private</option>
            <option value="Minimal">Minimal</option>
          </select>
        </label>
        <div className="st-select st-select-static">
          <div>
            <span className="st-select-label">Accent discipline</span>
            <span className="st-select-value">One gold moment per panel</span>
          </div>
          <span className="st-check">✓</span>
        </div>
      </div>

      <div className="st-detail-actions">
        <button
          className="st-btn st-btn-primary st-btn-block"
          type="button"
          onClick={() => onAction(item, 'primary')}
        >
          {isThemeItem ? 'Switch theme' : detail.primary}
        </button>
        <button
          className="st-btn st-btn-light st-btn-block"
          type="button"
          onClick={() => onAction(item, 'secondary')}
        >
          {detail.secondary}
        </button>
        {tertiaryText && tertiaryText !== '—' && (
          <button
            className="st-btn st-btn-dark st-btn-block"
            type="button"
            onClick={() => onAction(item, 'tertiary')}
          >
            {tertiaryText}
          </button>
        )}
        <button
          className="st-btn st-btn-danger st-btn-block"
          type="button"
          onClick={onDanger}
          aria-expanded={dangerOpen}
        >
          Danger zone
        </button>
      </div>

      {dangerOpen && (
        <div className="st-danger-box">
          <article className="st-danger-card">
            <div>
              <strong>Sign out all devices</strong>
              <span>Ends active sessions immediately.</span>
            </div>
            <button className="st-danger-tag" type="button" onClick={onSignOutAll}>
              Security
            </button>
          </article>
          <article className="st-danger-card">
            <div>
              <strong>Delete account</strong>
              <span>Removes profile + stored defaults.</span>
            </div>
            <button className="st-danger-tag" type="button" onClick={onDeleteAccount}>
              Irreversible
            </button>
          </article>
        </div>
      )}

      <p className="st-note">
        Prototype note: changes preview locally — hit &ldquo;Save changes&rdquo; in the page
        head to commit.
      </p>
    </aside>
  )
}

export default function SettingsPage({
  onOpenSidebar,
  onNavigate,
  theme,
  onThemeChange,
  session,
}) {
  const userId = session?.user?.id
  const [activeTab, setActiveTab] = useState('general')
  const [activeChip, setActiveChip] = useState('all')
  const [query, setQuery] = useState('')
  const [selection, setSelection] = useState({
    general: 'region',
    notifications: 'reminders',
    privacy: 'mkt',
    billing: 'card',
    help: 'support',
  })
  const [toggles, setToggles] = useState(DEFAULT_TOGGLES)
  const [preset, setPreset] = useState('Standard')
  const [dangerOpen, setDangerOpen] = useState(false)
  const [saveLabel, setSaveLabel] = useState('Save changes')
  const [dirty, setDirty] = useState(false)

  // Hydrate from customers.settings on mount
  useEffect(() => {
    if (!userId) return undefined
    let cancelled = false
    supabase
      .from('customers')
      .select('settings')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (cancelled || !data?.settings) return
        const s = data.settings || {}
        if (s.toggles && typeof s.toggles === 'object') {
          setToggles({ ...DEFAULT_TOGGLES, ...s.toggles })
        }
        if (typeof s.preset === 'string') setPreset(s.preset)
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  const items = itemsByTab[activeTab]
  const selectedId = selection[activeTab]

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((item) => {
      const matchFilter = activeChip === 'all' || item.filter === activeChip
      const haystack =
        `${item.title} ${item.sub} ${item.detail.a} ${item.detail.b} ${item.detail.c} ${item.detail.d}`.toLowerCase()
      const matchQuery = !q || haystack.includes(q)
      return matchFilter && matchQuery
    })
  }, [items, activeChip, query])

  const effectiveId =
    visible.find((i) => i.id === selectedId)?.id || visible[0]?.id || selectedId
  const selectedItem = items.find((i) => i.id === effectiveId) || items[0]

  const onTabChange = (id) => {
    setActiveTab(id)
    setActiveChip('all')
    setQuery('')
    setDangerOpen(false)
  }

  const setItemSelection = (id) => {
    setSelection((prev) => ({ ...prev, [activeTab]: id }))
    setDangerOpen(false)
  }

  const onToggle = (id, value) => {
    if (id === 'theme') {
      onThemeChange(theme === 'dark' ? 'light' : 'dark')
      return
    }
    setToggles((prev) => ({ ...prev, [id]: value }))
    setDirty(true)
  }

  const nudgeSave = () => {
    setDirty(true)
    const btn = document.getElementById('st-save')
    if (btn) {
      btn.style.transform = 'translateY(-1px)'
      btn.style.boxShadow = '0 18px 50px rgba(15,17,21,.16)'
      setTimeout(() => {
        btn.style.transform = ''
        btn.style.boxShadow = ''
      }, 220)
    }
  }

  const onAction = (item, kind) => {
    if (item.isTheme && kind === 'primary') {
      onThemeChange(theme === 'dark' ? 'light' : 'dark')
      return
    }
    if (kind === 'secondary' && item.id === 'theme') {
      // toggle reduced motion — not wired; just nudge save
      nudgeSave()
      return
    }
    nudgeSave()
  }

  const handleSave = async () => {
    if (!userId) return
    setSaveLabel('Saving...')
    const { error } = await supabase
      .from('customers')
      .update({
        settings: { toggles, preset, theme },
      })
      .eq('id', userId)
    if (error) {
      setSaveLabel('Save failed')
      setTimeout(() => setSaveLabel('Save changes'), 1500)
      return
    }
    setSaveLabel('Saved')
    setDirty(false)
    setTimeout(() => setSaveLabel('Save changes'), 900)
  }

  const goBook = () => onNavigate?.('book')

  // group visible items by section, preserving order
  const sections = []
  visible.forEach((item) => {
    const existing = sections.find((s) => s.name === item.section)
    if (existing) existing.items.push(item)
    else sections.push({ name: item.section, items: [item] })
  })

  return (
    <section className="customer-main st-page" aria-label="Settings">
      <button
        aria-label="Open navigation"
        className="customer-square-button customer-mobile-menu-button st-mobile-menu"
        type="button"
        onClick={onOpenSidebar}
      >
        <Icon name="menu" />
      </button>

      <nav className="st-breadcrumb" aria-label="Breadcrumb">
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
        <span>Settings</span>
      </nav>

      <header className="st-header">
        <div className="st-heading">
          <h1>
            Settings<span>.</span>
          </h1>
          <p>
            Tight control over your defaults, privacy, and delivery preferences — without
            turning the UI into a spreadsheet.
          </p>
        </div>
        <div className="st-head-actions">
          <button
            id="st-save"
            className={`st-btn st-btn-dark${dirty ? ' is-dirty' : ''}`}
            type="button"
            onClick={handleSave}
          >
            <Icon name="save" />
            {saveLabel}
          </button>
          <button className="st-btn st-btn-primary" type="button" onClick={goBook}>
            <Icon name="plus" />
            New booking
          </button>
        </div>
      </header>

      <div className="st-stats">
        {stats.map((stat) => (
          <article className="st-stat" key={stat.id}>
            <span className={`st-stat-icon${stat.variant === 'gold' ? ' is-gold' : ''}`}>
              <Icon name={stat.icon} />
            </span>
            <div>
              <strong>{stat.value}</strong>
              <small>{stat.label}</small>
            </div>
          </article>
        ))}
      </div>

      <div className="st-tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            className={`st-tab${activeTab === tab.id ? ' is-active' : ''}`}
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
          >
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && (
              <span className="st-tab-count">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      <div className="st-toolbar">
        <div className="st-chip-group" role="tablist" aria-label="Setting category">
          {chips.map((chip) => (
            <button
              className={`st-chip${activeChip === chip.id ? ' is-active' : ''}`}
              key={chip.id}
              type="button"
              onClick={() => setActiveChip(chip.id)}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <label className="st-search" htmlFor="st-search-input">
          <Icon name="search" />
          <span className="sr-only">Search settings</span>
          <input
            id="st-search-input"
            type="search"
            placeholder="Search settings..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      <div className="st-content">
        <div className="st-list-panel">
          <div className="st-list-head">
            <p className="st-list-title">
              {tabs.find((t) => t.id === activeTab)?.label}
            </p>
            <p className="st-list-hint">
              Pick a setting to review details and actions on the right.
            </p>
          </div>

          {visible.length === 0 ? (
            <div className="st-empty">
              No settings match. Try &ldquo;All&rdquo; or clear your search.
            </div>
          ) : (
            sections.map((section) => (
              <div className="st-section" key={section.name}>
                <p className="st-section-label">{section.name}</p>
                <div className="st-list">
                  {section.items.map((item) => (
                    <SettingItem
                      key={item.id}
                      item={item}
                      selected={item.id === effectiveId}
                      onSelect={setItemSelection}
                      toggleState={toggles}
                      onToggle={onToggle}
                      theme={theme}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <DetailPanel
          activeTab={activeTab}
          item={selectedItem}
          preset={preset}
          onPresetChange={(v) => {
            setPreset(v)
            nudgeSave()
          }}
          onAction={onAction}
          onDanger={() => setDangerOpen((v) => !v)}
          dangerOpen={dangerOpen}
          onSignOutAll={() => onNavigate?.('login')}
          onDeleteAccount={() => alert('Delete account flow — wireframe only.')}
          theme={theme}
        />
      </div>
    </section>
  )
}
