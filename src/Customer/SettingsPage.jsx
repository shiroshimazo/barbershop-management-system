import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import ConfirmDialog from './ConfirmDialog.jsx'
import Toast from '../components/Toast.jsx'
import packageJson from '../../package.json'
import {
  emailStatus,
  formatDate,
  formatDateTime,
  formatMoney,
  tierLabel,
  toggleText,
  useCustomerProfile,
} from './useCustomerProfile.js'

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

const PRESET_TOGGLES = {
  Standard: DEFAULT_TOGGLES,
  Private: {
    ...DEFAULT_TOGGLES,
    't-mkt': false,
    't-analytics': false,
    't-export': false,
  },
  Minimal: {
    ...DEFAULT_TOGGLES,
    't-quick': false,
    't-mkt': false,
    't-analytics': false,
    't-alerts': false,
    't-export': false,
    't-diag': false,
  },
}

const EMPTY_SETTINGS = {}

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
        a: 'Default barber: Live preference',
        b: 'Default service: Live preference',
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
        d: 'Last sign-in: Current session',
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
      pills: [
        { label: 'Not configured', variant: 'soft' },
        { label: 'Receipts available', variant: 'soft' },
      ],
      toggleId: 't-card',
      detail: {
        title: 'Payment method',
        sub: 'Payment card storage is optional.',
        a: 'No saved card',
        b: 'Payment table: Not configured',
        c: 'Primary: No',
        d: 'Backup: None',
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
        a: `App version: ${packageJson.version}`,
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
      <span className="st-item-icon">
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
  const aValue = detail.a?.includes('{theme}')
    ? detail.a.replace('{theme}', theme === 'dark' ? 'Dark' : 'Light')
    : detail.a
  const rows = detail.rows || [
    { label: 'Primary', value: aValue },
    { label: 'Currency', value: detail.b },
    { label: 'Format', value: detail.c },
    { label: 'Week start', value: detail.d },
  ]

  return (
    <aside className="st-detail" aria-label="Settings detail">
      <p className="st-kicker">{activeTab}</p>
      <h2>{detail.title}</h2>
      <p className="st-detail-sub">{detail.sub}</p>

      <dl className="st-dl">
        {rows.map((row) => (
          <div className="st-row" key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value == null || row.value === '' ? '-' : row.value}</dd>
          </div>
        ))}
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
        Settings sync with the signed-in customer row and current Supabase session.
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
  const {
    customer,
    setCustomer,
    facts: settingsFacts,
    customerError,
    customerLoading,
    factsError,
  } = useCustomerProfile(session)
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
  const [toast, setToast] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('')
  const [deleteSaving, setDeleteSaving] = useState(false)

  const settings = customer.settings || EMPTY_SETTINGS
  const latestVisit = settingsFacts.latestVisit
  const nextAppointment = settingsFacts.nextAppointment
  const favoriteBarber = settingsFacts.favoriteBarber
  const emailState = emailStatus(session?.user)
  const lastSignIn = formatDateTime(session?.user?.last_sign_in_at)
  const activeSessionCount = session?.user ? 1 : 0
  const activeSessionText =
    activeSessionCount === 1 ? '1 current session' : 'No active session'
  const deliveryRuleCount = ['t-reminders', 't-pdf', 't-quiet'].filter((id) => toggles[id]).length
  const defaultBarber =
    settings.default_barber ||
    favoriteBarber?.fullname ||
    nextAppointment?.barber?.fullname ||
    latestVisit?.barber?.fullname ||
    'Not set'
  const defaultService =
    settings.default_service || nextAppointment?.service || latestVisit?.service || 'Not set'
  const quietHours = settings.quiet_hours || '10:00 PM - 8:00 AM'
  const exportRange = settings.export_range || 'last 12 months'
  const defaultTip = settings.default_tip_percent ? `${settings.default_tip_percent}%` : 'Not saved'

  useEffect(() => {
    if (customerLoading) return
    const savedToggles =
      settings.toggles && typeof settings.toggles === 'object' ? settings.toggles : null
    queueMicrotask(() => {
      setToggles({ ...DEFAULT_TOGGLES, ...(savedToggles || {}) })
      setPreset(settings.preset || 'Standard')
      setDirty(false)
    })
  }, [customerLoading, settings.preset, settings.toggles])

  useEffect(() => {
    const message = customerError || factsError
    if (!message) return
    queueMicrotask(() => {
      setToast(`Couldn't load live settings: ${message}`)
    })
  }, [customerError, factsError])

  const liveItemsByTab = useMemo(() => {
    const nextBookingText = nextAppointment
      ? `${nextAppointment.service} · ${formatDateTime(nextAppointment.scheduled_at)}`
      : 'No upcoming booking'
    const latestVisitText = latestVisit
      ? `${latestVisit.service} · ${formatDate(latestVisit.visited_at)}`
      : 'No visits yet'
    const smsState = customer.phone ? 'SMS available' : 'No phone saved'
    const emailReceiptState = customer.email ? 'Email available' : 'No email saved'
    const mapItem = (item) => {
      const copy = { ...item, detail: { ...item.detail } }
      switch (item.id) {
        case 'region':
          return {
            ...copy,
            pills: [
              { label: settings.locale || 'English (US)', variant: 'gold' },
              { label: settings.currency || 'USD', variant: 'soft' },
              { label: settings.hour_cycle || '12-hour', variant: 'soft' },
            ],
            detail: {
              ...copy.detail,
              rows: [
                { label: 'Language', value: settings.locale || 'English (US)' },
                { label: 'Currency', value: settings.currency || 'USD' },
                { label: 'Time format', value: settings.hour_cycle || '12-hour' },
                { label: 'Week start', value: settings.week_start || 'Monday' },
              ],
            },
          }
        case 'quick':
          return {
            ...copy,
            pills: [
              { label: defaultBarber, variant: defaultBarber === 'Not set' ? 'soft' : 'gold' },
              { label: defaultService, variant: defaultService === 'Not set' ? 'soft' : 'gold' },
            ],
            detail: {
              ...copy.detail,
              rows: [
                { label: 'Default barber', value: defaultBarber },
                { label: 'Default service', value: defaultService },
                { label: 'Next booking', value: nextBookingText },
                { label: 'Confirm first', value: toggles['t-quick'] ? 'Yes' : 'No' },
              ],
            },
          }
        case 'theme':
          return {
            ...copy,
            pills: [
              { label: theme === 'dark' ? 'Dark' : 'Light', variant: 'gold' },
              { label: settings.reduced_motion ? 'Reduced motion' : 'Motion on', variant: 'soft' },
            ],
            detail: {
              ...copy.detail,
              rows: [
                { label: 'Current theme', value: theme === 'dark' ? 'Dark' : 'Light' },
                { label: 'Saved theme', value: settings.theme || theme || 'light' },
                { label: 'High contrast', value: toggleText(settings.high_contrast) },
                { label: 'Reduced motion', value: toggleText(settings.reduced_motion) },
              ],
            },
          }
        case 'reminders':
          return {
            ...copy,
            pills: [
              { label: `${settingsFacts.upcomingCount} upcoming`, variant: settingsFacts.upcomingCount ? 'gold' : 'soft' },
              { label: toggles['t-reminders'] ? 'On' : 'Off', variant: toggles['t-reminders'] ? 'ok' : 'soft' },
            ],
            detail: {
              ...copy.detail,
              rows: [
                { label: 'Reminder status', value: toggleText(toggles['t-reminders']) },
                { label: 'Next booking', value: nextBookingText },
                { label: 'Email', value: emailReceiptState },
                { label: 'SMS', value: smsState },
              ],
            },
          }
        case 'pdf':
          return {
            ...copy,
            pills: [
              { label: emailReceiptState, variant: customer.email ? 'ok' : 'soft' },
              { label: `${settingsFacts.visitsCount} visits`, variant: settingsFacts.visitsCount ? 'gold' : 'soft' },
            ],
            detail: {
              ...copy.detail,
              rows: [
                { label: 'Email receipts', value: customer.email ? 'On' : 'No email saved' },
                { label: 'SMS receipts', value: customer.phone ? 'Available' : 'No phone saved' },
                { label: 'Completed visits', value: settingsFacts.visitsCount },
                { label: 'Latest visit', value: latestVisitText },
              ],
            },
          }
        case 'quiet':
          return {
            ...copy,
            pills: [
              { label: quietHours, variant: 'gold' },
              { label: toggles['t-quiet'] ? 'On' : 'Off', variant: toggles['t-quiet'] ? 'ok' : 'soft' },
            ],
            detail: {
              ...copy.detail,
              rows: [
                { label: 'Quiet hours', value: quietHours },
                { label: 'Status', value: toggleText(toggles['t-quiet']) },
                { label: 'Security alerts', value: 'Always allowed' },
                { label: 'Marketing', value: toggles['t-mkt'] ? 'Allowed outside quiet hours' : 'Off' },
              ],
            },
          }
        case 'mkt':
          return {
            ...copy,
            pills: [
              { label: toggles['t-mkt'] ? 'Marketing on' : 'Marketing off', variant: toggles['t-mkt'] ? 'gold' : 'soft' },
              { label: tierLabel(customer.tier), variant: 'gold' },
            ],
            detail: {
              ...copy.detail,
              rows: [
                { label: 'Email offers', value: customer.email && toggles['t-mkt'] ? 'On' : 'Off' },
                { label: 'SMS offers', value: customer.phone && toggles['t-mkt'] ? 'On' : 'Off' },
                { label: 'Member tier', value: tierLabel(customer.tier) },
                { label: 'Receipts', value: 'Always transactional' },
              ],
            },
          }
        case 'analytics':
          return {
            ...copy,
            pills: [
              { label: toggles['t-analytics'] ? 'Analytics on' : 'Analytics off', variant: toggles['t-analytics'] ? 'ok' : 'soft' },
              { label: toggles['t-export'] ? 'Export on' : 'Export off', variant: 'soft' },
            ],
            detail: {
              ...copy.detail,
              rows: [
                { label: 'Anonymous analytics', value: toggleText(toggles['t-analytics']) },
                { label: 'Personalized ads', value: 'Off' },
                { label: 'Export permission', value: toggleText(toggles['t-export']) },
                { label: 'Customer ID', value: customer.id },
              ],
            },
          }
        case 'alerts':
          return {
            ...copy,
            pills: [
              { label: toggles['t-alerts'] ? 'Alerts on' : 'Alerts off', variant: toggles['t-alerts'] ? 'gold' : 'soft' },
              { label: emailState, variant: emailState === 'Verified' ? 'ok' : 'warn' },
            ],
            detail: {
              ...copy.detail,
              rows: [
                { label: 'Alerts', value: toggleText(toggles['t-alerts']) },
                { label: 'Channels', value: customer.email ? 'In-app + email' : 'In-app only' },
                { label: 'Last sign-in', value: lastSignIn },
                { label: 'Known sessions', value: activeSessionText },
                { label: 'Email status', value: emailState },
              ],
            },
          }
        case 'card':
          return {
            ...copy,
            pills: [
              { label: 'No saved card', variant: 'soft' },
              { label: customer.email || 'No email', variant: customer.email ? 'gold' : 'soft' },
            ],
            detail: {
              ...copy.detail,
              rows: [
                { label: 'Primary card', value: 'No saved card' },
                { label: 'Payment storage', value: 'Not configured' },
                { label: 'Customer email', value: customer.email },
                { label: 'Receipt records', value: settingsFacts.visitsCount },
              ],
            },
          }
        case 'tip':
          return {
            ...copy,
            pills: [
              { label: defaultTip, variant: defaultTip === 'Not saved' ? 'soft' : 'gold' },
              { label: toggleText(toggles['t-tip']), variant: 'soft' },
            ],
            detail: {
              ...copy.detail,
              rows: [
                { label: 'Default tip', value: defaultTip },
                { label: 'Auto-fill', value: toggleText(toggles['t-tip']) },
                { label: 'Latest rating', value: latestVisit?.rating ? `${latestVisit.rating}/5` : '-' },
                { label: 'Checkout', value: 'Editable in store' },
              ],
            },
          }
        case 'export':
          return {
            ...copy,
            pills: [
              { label: `${settingsFacts.visitsCount} visits`, variant: settingsFacts.visitsCount ? 'gold' : 'soft' },
              { label: 'CSV', variant: 'soft' },
            ],
            detail: {
              ...copy.detail,
              rows: [
                { label: 'Default range', value: exportRange },
                { label: 'Completed visits', value: settingsFacts.visitsCount },
                { label: 'Latest total', value: latestVisit ? formatMoney(latestVisit.price_cents) : '-' },
                { label: 'Email delivery', value: customer.email ? 'Available' : 'No email saved' },
              ],
            },
          }
        case 'support':
          return {
            ...copy,
            detail: {
              ...copy.detail,
              rows: [
                { label: 'Support hours', value: '10 AM - 6 PM' },
                { label: 'Support email', value: 'support@bladeco.example' },
                { label: 'Your email', value: customer.email },
                { label: 'Latest visit', value: latestVisitText },
              ],
            },
          }
        case 'about':
          return {
            ...copy,
            pills: [
              { label: `v${packageJson.version}`, variant: 'soft' },
              { label: customer.id ? 'Signed in' : 'Guest', variant: customer.id ? 'gold' : 'soft' },
            ],
            detail: {
              ...copy.detail,
              rows: [
                { label: 'App version', value: packageJson.version },
                { label: 'Signed-in user', value: customer.id },
                { label: 'Member since', value: formatDate(customer.memberSince) },
                { label: 'Profile sync', value: formatDateTime(customer.updatedAt) },
              ],
            },
          }
        default:
          return copy
      }
    }

    return Object.fromEntries(
      Object.entries(itemsByTab).map(([key, list]) => [key, list.map(mapItem)]),
    )
  }, [
    customer,
    defaultBarber,
    defaultService,
    defaultTip,
    emailState,
    exportRange,
    lastSignIn,
    latestVisit,
    nextAppointment,
    quietHours,
    settings,
    settingsFacts.upcomingCount,
    settingsFacts.visitsCount,
    theme,
    toggles,
    activeSessionText,
  ])

  const liveStats = [
    {
      id: 'tier',
      icon: 'star',
      value: customerLoading ? 'Loading…' : tierLabel(customer.tier),
      label: 'Member tier',
      variant: 'gold',
    },
    { id: 'delivery', icon: 'bell', value: deliveryRuleCount, label: 'Delivery rules' },
    { id: 'privacy', icon: 'shield', value: preset, label: 'Privacy posture' },
    {
      id: 'sessions',
      icon: 'device',
      value: activeSessionCount,
      label: activeSessionCount === 1 ? 'Active session' : 'Active sessions',
    },
  ]

  const items = liveItemsByTab[activeTab]
  const selectedId = selection[activeTab]

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((item) => {
      const matchFilter = activeChip === 'all' || item.filter === activeChip
      const rowText = (item.detail.rows || [])
        .map((row) => `${row.label} ${row.value}`)
        .join(' ')
      const haystack =
        `${item.title} ${item.sub} ${item.detail.a || ''} ${item.detail.b || ''} ${item.detail.c || ''} ${item.detail.d || ''} ${rowText}`.toLowerCase()
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
      const nextTheme = theme === 'dark' ? 'light' : 'dark'
      onThemeChange(nextTheme)
      void saveSettingPatch({ theme: nextTheme }, 'Theme preference saved.')
      return
    }
    setToggles((prev) => ({ ...prev, [id]: value }))
    setDirty(true)
  }

  const applyPreset = (nextPreset) => {
    setPreset(nextPreset)
    setToggles({ ...(PRESET_TOGGLES[nextPreset] || DEFAULT_TOGGLES) })
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

  const mergeLocalSettings = (patch) => {
    setCustomer((prev) => ({
      ...prev,
      settings: {
        ...(prev.settings || {}),
        ...patch,
      },
    }))
  }

  const saveSettingPatch = async (patch, message) => {
    if (!userId) {
      setToast('Sign in to save settings.')
      return false
    }
    const { error } = await supabase.rpc('merge_settings', { patch })
    if (error) {
      setToast(`Couldn't save setting: ${error.message}`)
      return false
    }
    if (patch.toggles && typeof patch.toggles === 'object') {
      setToggles({ ...DEFAULT_TOGGLES, ...patch.toggles })
    }
    if (patch.preset) setPreset(patch.preset)
    mergeLocalSettings(patch)
    setToast(message)
    return true
  }

  const persistToggles = async (nextToggles, message) => {
    if (!userId) {
      setToast('Sign in to save settings.')
      return
    }
    setToggles(nextToggles)
    const { error } = await supabase.rpc('merge_settings', {
      patch: {
        toggles: nextToggles,
        preset,
        theme,
      },
    })
    if (error) {
      setDirty(true)
      setToast(`Couldn't save setting: ${error.message}`)
      return
    }
    mergeLocalSettings({ toggles: nextToggles, preset, theme })
    setDirty(false)
    setToast(message)
  }

  const onAction = async (item, kind) => {
    if (item.isTheme && kind === 'primary') {
      onThemeChange(theme === 'dark' ? 'light' : 'dark')
      await saveSettingPatch(
        { theme: theme === 'dark' ? 'light' : 'dark' },
        'Theme preference saved.',
      )
      return
    }
    if (item.id === 'region') {
      await saveSettingPatch(
        {
          locale: 'English (US)',
          currency: 'USD',
          hour_cycle: '12-hour',
          week_start: 'Monday',
        },
        kind === 'secondary' ? 'Region reset to defaults.' : 'Region preferences saved.',
      )
      return
    }
    if (item.id === 'quick') {
      onNavigate?.('profile')
      return
    }
    if (item.id === 'reminders' && kind === 'secondary') {
      const { error } = await supabase.rpc('create_test_notification')
      setToast(
        error
          ? `Couldn't send test notification: ${error.message}`
          : 'Test reminder added to Notifications.',
      )
      return
    }
    if (item.id === 'reminders' && kind === 'primary') {
      await persistToggles({ ...toggles, 't-reminders': true }, 'Appointment reminders enabled.')
      return
    }
    if (item.id === 'pdf') {
      onNavigate?.('history')
      return
    }
    if (item.id === 'quiet') {
      if (kind === 'primary') {
        await saveSettingPatch(
          { quiet_hours: quietHours, toggles: { ...toggles, 't-quiet': true } },
          'Quiet hours saved.',
        )
        setToggles((prev) => ({ ...prev, 't-quiet': true }))
      } else {
        setToast(`Quiet hours: ${quietHours}. Security alerts still bypass quiet hours.`)
      }
      return
    }
    if (item.id === 'mkt') {
      await persistToggles(
        { ...toggles, 't-mkt': !toggles['t-mkt'] },
        toggles['t-mkt'] ? 'Marketing messages disabled.' : 'Marketing messages enabled.',
      )
      return
    }
    if (item.id === 'analytics') {
      if (kind === 'secondary') {
        onNavigate?.('history')
        return
      }
      await persistToggles(
        { ...toggles, 't-analytics': !toggles['t-analytics'] },
        toggles['t-analytics'] ? 'Analytics sharing disabled.' : 'Analytics sharing enabled.',
      )
      return
    }
    if (item.id === 'alerts') {
      if (kind === 'secondary') {
        const email = customer.email || session?.user?.email
        if (!email) {
          setToast('No email address is saved for password recovery.')
          return
        }
        const { error } = await supabase.auth.resetPasswordForEmail(email)
        setToast(error ? `Couldn't send reset email: ${error.message}` : 'Password reset email sent.')
        return
      }
      setDangerOpen(true)
      setToast(`Current Supabase session: ${activeSessionText}. Last sign-in: ${lastSignIn}.`)
      return
    }
    if (item.id === 'card') {
      if (kind === 'secondary') {
        await persistToggles(
          { ...toggles, 't-card': false },
          'Payment method shortcuts disabled. Receipts still use visit history.',
        )
        return
      }
      await saveSettingPatch(
        {
          payment_method_status: 'not_configured',
          toggles: { ...toggles, 't-card': true },
        },
        'Payment preference saved. Card storage is not configured yet.',
      )
      return
    }
    if (item.id === 'tip') {
      if (kind === 'secondary') {
        await persistToggles({ ...toggles, 't-tip': false }, 'Tip auto-fill disabled.')
      } else {
        await saveSettingPatch({ default_tip_percent: 15 }, 'Default tip saved at 15%.')
      }
      return
    }
    if (item.id === 'export' && kind === 'primary') {
      return onNavigate?.('history')
    }
    if (item.id === 'export' && kind === 'secondary') {
      await saveSettingPatch({ export_range: 'last 12 months' }, 'Default export range saved.')
      return
    }
    if (item.id === 'support' && kind === 'primary') {
      window.location.assign(
        `mailto:support@bladeco.example?subject=${encodeURIComponent('Customer support request')}&body=${encodeURIComponent(`Customer: ${customer.name || customer.email || 'Signed-in customer'}\nEmail: ${customer.email || '-'}\n`)}`,
      )
      return
    }
    if (item.id === 'support' && kind === 'secondary') {
      setToast('FAQ content is not configured yet. Use Start a message to contact support.')
      return
    }
    if (item.id === 'about') {
      setToast(
        kind === 'tertiary'
          ? `Open-source licenses are bundled with app version ${packageJson.version}.`
          : `Blade & Co. portal version ${packageJson.version}.`,
      )
      return
    }
    if (kind === 'secondary' && item.id === 'theme') {
      await saveSettingPatch(
        { reduced_motion: !settings.reduced_motion },
        !settings.reduced_motion ? 'Reduced motion enabled.' : 'Reduced motion disabled.',
      )
      return
    }
    nudgeSave()
  }

  const handleSave = async () => {
    if (!userId) return
    setSaveLabel('Saving...')
    const { error } = await supabase.rpc('merge_settings', {
      patch: {
        toggles,
        preset,
        theme,
      },
    })
    if (error) {
      setSaveLabel('Save failed')
      setToast(`Couldn't save settings: ${error.message}`)
      setTimeout(() => setSaveLabel('Save changes'), 1500)
      return
    }
    mergeLocalSettings({ toggles, preset, theme })
    setSaveLabel('Saved')
    setDirty(false)
    setToast('Settings saved.')
    setTimeout(() => setSaveLabel('Save changes'), 900)
  }

  const handleSignOutAll = async () => {
    const { error } = await supabase.auth.signOut({ scope: 'global' })
    if (error) {
      setToast(`Couldn't sign out everywhere: ${error.message}`)
      return
    }
    onNavigate?.('login')
  }

  const handleDeleteAccount = async () => {
    if (!session?.user?.email) return
    if (deleteConfirmEmail.trim().toLowerCase() !== session.user.email.trim().toLowerCase()) {
      setToast('Type your email to confirm deletion.')
      return
    }
    setDeleteSaving(true)
    const { error } = await supabase.rpc('delete_my_account')
    setDeleteSaving(false)
    if (error) {
      setToast(`Couldn't delete account: ${error.message}`)
      return
    }
    await supabase.auth.signOut({ scope: 'global' })
    setDeleteDialogOpen(false)
    onNavigate?.('login')
  }

  // group visible items by section, preserving order
  const sections = []
  visible.forEach((item) => {
    const existing = sections.find((s) => s.name === item.section)
    if (existing) existing.items.push(item)
    else sections.push({ name: item.section, items: [item] })
  })

  return (
    <section className="customer-main st-page" aria-label="Settings">
      <Toast message={toast} onClose={() => setToast('')} />
      {deleteDialogOpen && (
        <ConfirmDialog
          title="Delete your account?"
          description="Type your email address to confirm the delete request."
          confirmLabel="Delete account"
          cancelLabel="Keep account"
          busy={deleteSaving}
          confirmDisabled={
            deleteConfirmEmail.trim().toLowerCase() !== session?.user?.email?.trim().toLowerCase()
          }
          onCancel={() => {
            setDeleteDialogOpen(false)
            setDeleteConfirmEmail('')
          }}
          onConfirm={handleDeleteAccount}
        >
          <label className="customer-confirm-field">
            <span>Email address</span>
            <input
              type="email"
              value={deleteConfirmEmail}
              onChange={(event) => setDeleteConfirmEmail(event.target.value)}
              placeholder={session?.user?.email || ''}
              autoComplete="email"
            />
          </label>
        </ConfirmDialog>
      )}
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
        </div>
      </header>

      <div className="st-stats">
        {liveStats.map((stat) => (
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
            applyPreset(v)
          }}
          onAction={onAction}
          onDanger={() => setDangerOpen((v) => !v)}
          dangerOpen={dangerOpen}
          onSignOutAll={handleSignOutAll}
          onDeleteAccount={() => setDeleteDialogOpen(true)}
          theme={theme}
        />
      </div>
    </section>
  )
}
