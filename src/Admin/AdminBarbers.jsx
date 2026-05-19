import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  RiAddLine,
  RiCalendarCheckLine,
  RiCalendarScheduleLine,
  RiCheckboxCircleLine,
  RiCheckLine,
  RiCloseLine,
  RiDeleteBin6Line,
  RiEyeLine,
  RiFilter3Line,
  RiLayoutGridLine,
  RiListCheck2,
  RiMapPinLine,
  RiPencilLine,
  RiScissorsLine,
  RiSearchLine,
  RiStarFill,
} from 'react-icons/ri'
import ConfirmDialog from '../Customer/ConfirmDialog.jsx'
import Toast from '../components/Toast.jsx'
import { supabase } from '../lib/supabase.js'
import { AdminSidebar, Icon } from './AdminShell.jsx'
import { browserTimeZone } from './adminShared.js'

const emptyWorkspace = {
  generatedAt: null,
  barbers: [],
  stats: {
    totalCount: 0,
    onShiftCount: 0,
    offCount: 0,
    locationCount: 0,
    downtownCount: 0,
    eastsideCount: 0,
    avgRating: 0,
    totalReviews: 0,
    bookings90d: 0,
    revenue90dCents: 0,
    upcomingCount: 0,
  },
}

const specialties = [
  'Skin Fade',
  'Classic Cut',
  'Beard Sculpt',
  'Hot Towel',
  'Line Design',
  "Kid's Cut",
  'Full Service',
  'Buzz Cut',
  'Beard Trim',
  'Razor Shave',
  'Color',
  'Texture Work',
]

const tiers = ['Junior', 'Stylist', 'Senior', 'Master']
const locations = ['Downtown', 'Eastside']
const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const dayDbValues = [1, 2, 3, 4, 5, 6, 0]

function emptyDraft() {
  return {
    id: null,
    fullname: '',
    handle: '',
    email: '',
    phone: '',
    location: 'Downtown',
    tier: 'Stylist',
    yearsExperience: '0',
    specialties: ['Classic Cut'],
    signature: 'Classic Cut',
    days: [true, true, true, true, true, false, false],
    active: true,
    bio: '',
  }
}

function normalizeWorkspace(data) {
  if (!data || typeof data !== 'object') return emptyWorkspace
  return {
    ...emptyWorkspace,
    ...data,
    barbers: Array.isArray(data.barbers) ? data.barbers : [],
    stats: { ...emptyWorkspace.stats, ...(data.stats || {}) },
  }
}

function compactMoney(cents) {
  const value = (Number(cents) || 0) / 100
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`
  return `$${value.toFixed(0)}`
}

function ratingText(value) {
  return Number(value || 0).toFixed(2).replace(/\.00$/, '')
}

function todayIndex() {
  return (new Date().getDay() + 6) % 7
}

function draftFromBarber(barber) {
  const days = Array.isArray(barber.days)
    ? barber.days.map((value) => Number(value) === 1)
    : [true, true, true, true, true, false, false]
  return {
    id: barber.id,
    fullname: barber.name || '',
    handle: barber.handle || '',
    email: barber.email || '',
    phone: barber.phone || '',
    location: barber.location || 'Downtown',
    tier: barber.tier || 'Stylist',
    yearsExperience: String(barber.yearsExperience || 0),
    specialties: Array.isArray(barber.specialties) && barber.specialties.length
      ? barber.specialties
      : ['Classic Cut'],
    signature: barber.signature || barber.specialties?.[0] || 'Classic Cut',
    days,
    active: !!barber.active,
    bio: barber.bio || '',
  }
}

function Stars({ rating }) {
  const filled = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)))
  return (
    <span className="ab-stars" title={`${ratingText(rating)} / 5`}>
      {'★★★★★'.slice(0, filled)}
      <span>{'★★★★★'.slice(filled)}</span>
    </span>
  )
}

function StatTile({ icon: StatIcon, label, value, unit, delta, foot, dark = false }) {
  return (
    <article className={`ab-stat${dark ? ' is-dark' : ''}`}>
      <div className="ab-stat-head">
        <span>
          <StatIcon aria-hidden="true" />
        </span>
        <small>{label}</small>
      </div>
      <strong>
        {value}
        {unit && <em>{unit}</em>}
      </strong>
      <p>
        <mark>{delta}</mark>
        {foot}
      </p>
    </article>
  )
}

function LocationBadge({ location, tier }) {
  const isEastside = location === 'Eastside'
  return (
    <span className={`ab-loc${isEastside ? ' is-eastside' : ''}`}>
      <RiMapPinLine aria-hidden="true" />
      {location} · {tier}
    </span>
  )
}

function SpecChips({ barber }) {
  const list = Array.isArray(barber.specialties) ? barber.specialties : []
  return (
    <div className="ab-specs">
      {list.map((item) => (
        <span className={item === barber.signature ? 'is-signature' : ''} key={item}>
          {item === barber.signature && <RiStarFill aria-hidden="true" />}
          {item}
        </span>
      ))}
    </div>
  )
}

function WeekMini({ days, today }) {
  const normalized = Array.isArray(days) ? days : []
  return (
    <div className="ab-week">
      {dayLabels.map((label, index) => {
        const isWorking = Number(normalized[index]) === 1
        return (
          <span
            className={`${isWorking ? 'is-on' : 'is-off'}${index === today ? ' is-today' : ''}`}
            key={`${label}-${index}`}
          >
            {label}
          </span>
        )
      })}
    </div>
  )
}

function AvailabilityToggle({ active, label, onChange, disabled = false }) {
  return (
    <button
      className={`ab-toggle${active ? ' is-on' : ''}`}
      type="button"
      onClick={onChange}
      disabled={disabled}
      aria-pressed={active}
    >
      <span className="ab-toggle-track" aria-hidden="true" />
      <strong>{label || (active ? 'On shift' : 'Off')}</strong>
    </button>
  )
}

function BarberCard({ barber, today, onView, onEdit, onDelete, onToggle, busy }) {
  const workingDays = Array.isArray(barber.days)
    ? barber.days.filter((value) => Number(value) === 1).length
    : 0
  return (
    <article className={`ab-card${barber.active ? '' : ' is-off'}`}>
      <div className="ab-row-actions">
        <button type="button" aria-label={`View ${barber.name}`} onClick={() => onView(barber)}>
          <RiEyeLine aria-hidden="true" />
        </button>
        <button type="button" aria-label={`Edit ${barber.name}`} onClick={() => onEdit(barber)}>
          <RiPencilLine aria-hidden="true" />
        </button>
        <button
          className="is-danger"
          type="button"
          aria-label={`Remove ${barber.name}`}
          onClick={() => onDelete(barber)}
        >
          <RiDeleteBin6Line aria-hidden="true" />
        </button>
      </div>

      <div className="ab-card-head">
        <span className={`ab-avatar${barber.location === 'Eastside' ? ' is-eastside' : ''}`}>
          {barber.initials || 'BC'}
        </span>
        <div>
          <h2>{barber.name}</h2>
          <p>
            {barber.code} · {barber.handle}
          </p>
          <LocationBadge location={barber.location} tier={barber.tier} />
        </div>
      </div>

      <div className="ab-card-stats">
        <div>
          <Stars rating={barber.rating} />
          <small>
            {ratingText(barber.rating)} · {(barber.reviews || 0).toLocaleString()} reviews
          </small>
        </div>
        <div>
          <strong>{(barber.bookings90d || 0).toLocaleString()}</strong>
          <small>Bookings / 90d</small>
        </div>
        <div>
          <strong>{compactMoney(barber.revenue90dCents)}</strong>
          <small>Revenue / 90d</small>
        </div>
      </div>

      <div>
        <small className="ab-section-label">Specialties</small>
        <SpecChips barber={barber} />
      </div>

      <div>
        <div className="ab-week-head">
          <small>This week</small>
          <span>
            {workingDays} days · {barber.worksToday ? 'today' : 'not today'}
          </span>
        </div>
        <WeekMini days={barber.days} today={today} />
      </div>

      <footer className="ab-card-foot">
        <div>
          <small>Now</small>
          <strong>{barber.statusText}</strong>
        </div>
        <AvailabilityToggle
          active={barber.active}
          disabled={busy}
          onChange={() => onToggle(barber)}
        />
      </footer>
    </article>
  )
}

function BarberList({ barbers, onView, onEdit, onDelete, onToggle, busy }) {
  return (
    <div className="ab-list-wrap">
      <table className="ab-list">
        <thead>
          <tr>
            <th>Barber</th>
            <th>Location</th>
            <th>Rating</th>
            <th>Bookings</th>
            <th>Revenue</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {barbers.map((barber) => (
            <tr key={barber.id}>
              <td>
                <div className="ab-list-name">
                  <span className={`ab-avatar is-small${barber.location === 'Eastside' ? ' is-eastside' : ''}`}>
                    {barber.initials || 'BC'}
                  </span>
                  <div>
                    <strong>{barber.name}</strong>
                    <small>
                      {barber.code} · {barber.handle}
                    </small>
                  </div>
                </div>
              </td>
              <td>
                <LocationBadge location={barber.location} tier={barber.tier} />
              </td>
              <td>
                <Stars rating={barber.rating} />
                <small>{barber.reviews || 0} reviews</small>
              </td>
              <td>{(barber.bookings90d || 0).toLocaleString()}</td>
              <td>{compactMoney(barber.revenue90dCents)}</td>
              <td>
                <AvailabilityToggle
                  active={barber.active}
                  label={barber.active ? 'On' : 'Off'}
                  disabled={busy}
                  onChange={() => onToggle(barber)}
                />
              </td>
              <td>
                <div className="ab-row-actions is-inline">
                  <button type="button" aria-label={`View ${barber.name}`} onClick={() => onView(barber)}>
                    <RiEyeLine aria-hidden="true" />
                  </button>
                  <button type="button" aria-label={`Edit ${barber.name}`} onClick={() => onEdit(barber)}>
                    <RiPencilLine aria-hidden="true" />
                  </button>
                  <button
                    className="is-danger"
                    type="button"
                    aria-label={`Remove ${barber.name}`}
                    onClick={() => onDelete(barber)}
                  >
                    <RiDeleteBin6Line aria-hidden="true" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BarberDrawer({ mode, draft, onClose, onDraftChange, onSave, busy }) {
  if (!draft) return null

  const toggleSpecialty = (item) => {
    const hasSpecialty = draft.specialties.includes(item)
    const next = hasSpecialty
      ? draft.specialties.filter((specialty) => specialty !== item)
      : [...draft.specialties, item]
    onDraftChange({
      ...draft,
      specialties: next,
      signature: next.includes(draft.signature) ? draft.signature : next[0] || '',
    })
  }

  const toggleDay = (index) => {
    onDraftChange({
      ...draft,
      days: draft.days.map((value, dayIndex) => (dayIndex === index ? !value : value)),
    })
  }

  return (
    <div className="ab-drawer-layer" role="presentation">
      <button className="ab-drawer-scrim" type="button" aria-label="Close drawer" onClick={onClose} />
      <aside className="ab-drawer" aria-modal="true" role="dialog">
        <header>
          <div>
            <small>{mode === 'create' ? 'New barber' : 'Edit barber'}</small>
            <h2>{mode === 'create' ? 'Add barber.' : 'Roster details.'}</h2>
          </div>
          <button type="button" aria-label="Close drawer" onClick={onClose}>
            <RiCloseLine aria-hidden="true" />
          </button>
        </header>

        <div className="ab-drawer-form">
          <label>
            <span>Full name</span>
            <input
              type="text"
              value={draft.fullname}
              onChange={(event) => onDraftChange({ ...draft, fullname: event.target.value })}
            />
          </label>
          <label>
            <span>Handle</span>
            <input
              type="text"
              value={draft.handle}
              placeholder="@jtate"
              onChange={(event) => onDraftChange({ ...draft, handle: event.target.value })}
            />
          </label>
          <label>
            <span>Email</span>
            <input
              type="email"
              value={draft.email}
              onChange={(event) => onDraftChange({ ...draft, email: event.target.value })}
            />
          </label>
          <label>
            <span>Phone</span>
            <input
              type="tel"
              value={draft.phone}
              onChange={(event) => onDraftChange({ ...draft, phone: event.target.value })}
            />
          </label>
          <label>
            <span>Location</span>
            <select
              value={draft.location}
              onChange={(event) => onDraftChange({ ...draft, location: event.target.value })}
            >
              {locations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Tier</span>
            <select
              value={draft.tier}
              onChange={(event) => onDraftChange({ ...draft, tier: event.target.value })}
            >
              {tiers.map((tier) => (
                <option key={tier} value={tier}>
                  {tier}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Years experience</span>
            <input
              min="0"
              type="number"
              value={draft.yearsExperience}
              onChange={(event) => onDraftChange({ ...draft, yearsExperience: event.target.value })}
            />
          </label>
          <label>
            <span>Signature service</span>
            <select
              value={draft.signature}
              onChange={(event) => onDraftChange({ ...draft, signature: event.target.value })}
            >
              {(draft.specialties.length ? draft.specialties : ['Classic Cut']).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <div className="ab-field-wide">
            <span>Specialties</span>
            <div className="ab-picker">
              {specialties.map((item) => (
                <button
                  className={draft.specialties.includes(item) ? 'is-active' : ''}
                  key={item}
                  type="button"
                  onClick={() => toggleSpecialty(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="ab-field-wide">
            <span>Working days</span>
            <div className="ab-day-picker">
              {dayLabels.map((label, index) => (
                <button
                  className={draft.days[index] ? 'is-active' : ''}
                  key={`${label}-${index}`}
                  type="button"
                  onClick={() => toggleDay(index)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <label className="ab-field-wide">
            <span>Bio / notes</span>
            <textarea
              value={draft.bio}
              rows="4"
              onChange={(event) => onDraftChange({ ...draft, bio: event.target.value })}
            />
          </label>

          <div className="ab-drawer-toggle ab-field-wide">
            <div>
              <strong>Available for bookings</strong>
              <small>Off-shift hides them from the booking flow.</small>
            </div>
            <AvailabilityToggle
              active={draft.active}
              onChange={() => onDraftChange({ ...draft, active: !draft.active })}
            />
          </div>
        </div>

        <footer>
          <button type="button" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="is-primary" type="button" onClick={onSave} disabled={busy}>
            <RiCheckLine aria-hidden="true" />
            {busy ? 'Saving' : mode === 'create' ? 'Add barber' : 'Save changes'}
          </button>
        </footer>
      </aside>
    </div>
  )
}

export default function AdminBarbers({ onLogout }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false)
  const [workspace, setWorkspace] = useState(emptyWorkspace)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [locFilter, setLocFilter] = useState('All')
  const [availFilter, setAvailFilter] = useState('All')
  const [view, setView] = useState('grid')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [specialtyFilters, setSpecialtyFilters] = useState([])
  const [drawerMode, setDrawerMode] = useState('create')
  const [draft, setDraft] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [toast, setToast] = useState('')
  const today = todayIndex()

  const loadBarbers = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true)
    const { data, error: rpcError } = await supabase.rpc('get_admin_barbers', {
      p_timezone: browserTimeZone(),
    })
    if (rpcError) {
      setError(rpcError.message)
      setLoading(false)
      return
    }
    setWorkspace(normalizeWorkspace(data))
    setError('')
    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const { data, error: rpcError } = await supabase.rpc('get_admin_barbers', {
        p_timezone: browserTimeZone(),
      })
      if (cancelled) return
      if (rpcError) {
        setError(rpcError.message)
        setLoading(false)
        return
      }
      setWorkspace(normalizeWorkspace(data))
      setError('')
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('admin-barbers-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'barbers' }, () => loadBarbers(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'barber_availability' }, () => loadBarbers(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => loadBarbers(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visits' }, () => loadBarbers(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'walk_ins' }, () => loadBarbers(false))
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadBarbers])

  const stats = workspace.stats
  const filteredBarbers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return workspace.barbers.filter((barber) => {
      if (locFilter !== 'All' && barber.location !== locFilter) return false
      if (availFilter === 'On' && !barber.active) return false
      if (availFilter === 'Off' && barber.active) return false
      if (
        specialtyFilters.length > 0 &&
        !specialtyFilters.some((item) => barber.specialties?.includes(item))
      ) {
        return false
      }
      if (!normalizedQuery) return true
      return [
        barber.name,
        barber.handle,
        barber.code,
        barber.location,
        barber.tier,
        ...(barber.specialties || []),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery))
    })
  }, [workspace.barbers, query, locFilter, availFilter, specialtyFilters])

  const handleSidebarSelect = (item) => {
    setIsSidebarOpen(false)
    if (item.id === 'barbers') return
    if (
      item.id === 'appointments' ||
      item.id === 'customers' ||
      item.id === 'services' ||
      item.id === 'schedule' ||
      item.id === 'transactions'
    ) {
      window.location.hash = item.id
      return
    }
    window.location.hash = 'dashboard'
  }

  const openCreate = () => {
    setDrawerMode('create')
    setDraft(emptyDraft())
  }

  const openEdit = (barber) => {
    setDrawerMode('edit')
    setDraft(draftFromBarber(barber))
  }

  const toggleSpecialtyFilter = (item) => {
    setSpecialtyFilters((current) =>
      current.includes(item) ? current.filter((value) => value !== item) : [...current, item],
    )
  }

  const saveBarber = async () => {
    if (!draft?.fullname.trim()) {
      setToast('Barber name is required.')
      return
    }
    const days = draft.days
      .map((isActive, index) => (isActive ? dayDbValues[index] : null))
      .filter((value) => value !== null)
    setActionBusy(true)
    const { error: saveError } = await supabase.rpc('admin_save_barber', {
      p_barber_id: drawerMode === 'edit' ? draft.id : null,
      p_fullname: draft.fullname.trim(),
      p_handle: draft.handle.trim(),
      p_email: draft.email.trim() || null,
      p_phone: draft.phone.trim() || null,
      p_location: draft.location,
      p_tier: draft.tier,
      p_years_experience: Math.max(0, Number(draft.yearsExperience) || 0),
      p_specialties: draft.specialties,
      p_signature_service: draft.signature || draft.specialties[0] || 'Classic Cut',
      p_days: days,
      p_active: draft.active,
      p_bio: draft.bio.trim() || null,
    })
    setActionBusy(false)
    if (saveError) {
      setToast(`Could not save barber: ${saveError.message}`)
      return
    }
    setToast(drawerMode === 'create' ? `Added ${draft.fullname}` : `Saved ${draft.fullname}`)
    setDraft(null)
    await loadBarbers(false)
  }

  const toggleAvailability = async (barber) => {
    const nextActive = !barber.active
    setWorkspace((current) => ({
      ...current,
      barbers: current.barbers.map((item) =>
        item.id === barber.id ? { ...item, active: nextActive } : item,
      ),
    }))
    const { error: toggleError } = await supabase.rpc('admin_set_barber_active', {
      p_barber_id: barber.id,
      p_active: nextActive,
    })
    if (toggleError) {
      setToast(`Could not update availability: ${toggleError.message}`)
      await loadBarbers(false)
      return
    }
    setToast(`${barber.name.split(' ')[0]} is now ${nextActive ? 'on shift' : 'off shift'}.`)
    await loadBarbers(false)
  }

  const confirmArchive = async () => {
    if (!toDelete?.id) return
    setActionBusy(true)
    const { error: archiveError } = await supabase.rpc('admin_archive_barber', {
      p_barber_id: toDelete.id,
    })
    setActionBusy(false)
    if (archiveError) {
      setToast(`Could not remove barber: ${archiveError.message}`)
      return
    }
    setToast(`Removed ${toDelete.name}`)
    setToDelete(null)
    await loadBarbers(false)
  }

  return (
    <main className="customer-dashboard admin-page">
      <Toast message={toast} onClose={() => setToast('')} />
      <AdminSidebar
        activeId="barbers"
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelect={handleSidebarSelect}
        onLogoutRequest={() => setIsLogoutDialogOpen(true)}
        upcomingCount={stats.upcomingCount}
      />
      <button
        aria-label="Close navigation"
        className={`customer-sidebar-backdrop${isSidebarOpen ? ' is-open' : ''}`}
        type="button"
        onClick={() => setIsSidebarOpen(false)}
      />

      <section className="admin-main admin-barbers-page" aria-label="Admin barbers">
        <button
          aria-label="Open navigation"
          className="customer-square-button customer-mobile-menu-button admin-mobile-menu"
          type="button"
          onClick={() => setIsSidebarOpen(true)}
        >
          <Icon name="menu" />
        </button>

        <header className="ab-head">
          <div>
            <nav className="ab-crumbs" aria-label="Breadcrumb">
              <button type="button" onClick={() => (window.location.hash = 'dashboard')}>
                Team
              </button>
              <span>/</span>
              <strong>Barbers</strong>
            </nav>
            <h1>
              The team<span>.</span>
            </h1>
            <p>
              {stats.totalCount} barbers across {stats.locationCount} locations ·{' '}
              {stats.onShiftCount} on shift right now · avg rating {ratingText(stats.avgRating)}{' '}
              from {(stats.totalReviews || 0).toLocaleString()} reviews.
            </p>
          </div>
          <div className="ab-head-actions">
            <button type="button" onClick={() => (window.location.hash = 'schedule')}>
              <RiCalendarScheduleLine aria-hidden="true" />
              Schedule view
            </button>
            <button className="is-primary" type="button" onClick={openCreate}>
              <RiAddLine aria-hidden="true" />
              New barber
            </button>
          </div>
        </header>

        {error && (
          <section className="admin-alert" role="alert">
            <strong>Barber data did not load.</strong>
            <span>{error}</span>
            <small>Run `supabase/migrations/0011_admin_barbers.sql` in Supabase SQL Editor.</small>
          </section>
        )}

        <section className="ab-stats" aria-label="Barber metrics">
          <StatTile
            icon={RiScissorsLine}
            label="Total barbers"
            value={loading ? '...' : stats.totalCount}
            delta="+ live"
            foot="roster"
          />
          <StatTile
            icon={RiCheckboxCircleLine}
            label="On shift now"
            value={loading ? '...' : stats.onShiftCount}
            unit={` / ${stats.totalCount}`}
            delta={`${stats.offCount} off`}
            foot="availability"
          />
          <StatTile
            icon={RiMapPinLine}
            label="By location"
            value={`${stats.downtownCount} / ${stats.eastsideCount}`}
            delta="DT / ES"
            foot="Downtown / Eastside"
            dark
          />
          <StatTile
            icon={RiStarFill}
            label="Avg rating"
            value={loading ? '...' : ratingText(stats.avgRating)}
            unit="★"
            delta={`${stats.totalReviews} reviews`}
            foot="all-time"
          />
          <StatTile
            icon={RiCalendarCheckLine}
            label="Bookings 90d"
            value={loading ? '...' : (stats.bookings90d || 0).toLocaleString()}
            delta={compactMoney(stats.revenue90dCents)}
            foot="revenue / 90d"
          />
        </section>

        <section className="ab-toolbar" aria-label="Barber filters">
          <label className="ab-search">
            <RiSearchLine aria-hidden="true" />
            <span className="sr-only">Search barbers</span>
            <input
              type="search"
              value={query}
              placeholder="Search by name, handle, specialty, ID..."
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="ab-segment" role="tablist" aria-label="Location">
            {['All', ...locations].map((location) => (
              <button
                className={locFilter === location ? 'is-active' : ''}
                key={location}
                type="button"
                onClick={() => setLocFilter(location)}
              >
                {location}
                <span>
                  {location === 'All'
                    ? stats.totalCount
                    : location === 'Downtown'
                      ? stats.downtownCount
                      : stats.eastsideCount}
                </span>
              </button>
            ))}
          </div>
          <div className="ab-segment" role="tablist" aria-label="Availability">
            {[
              ['All', 'Any', stats.totalCount],
              ['On', 'On shift', stats.onShiftCount],
              ['Off', 'Off', stats.offCount],
            ].map(([value, label, count]) => (
              <button
                className={availFilter === value ? 'is-active' : ''}
                key={value}
                type="button"
                onClick={() => setAvailFilter(value)}
              >
                {label}
                <span>{count}</span>
              </button>
            ))}
          </div>
          <button
            className={`ab-filter${filtersOpen ? ' is-active' : ''}`}
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
          >
            <RiFilter3Line aria-hidden="true" />
            More filters
            {specialtyFilters.length > 0 && <span>{specialtyFilters.length}</span>}
          </button>
          <div className="ab-view-toggle" aria-label="View mode">
            <button
              className={view === 'grid' ? 'is-active' : ''}
              type="button"
              aria-label="Grid view"
              onClick={() => setView('grid')}
            >
              <RiLayoutGridLine aria-hidden="true" />
            </button>
            <button
              className={view === 'list' ? 'is-active' : ''}
              type="button"
              aria-label="List view"
              onClick={() => setView('list')}
            >
              <RiListCheck2 aria-hidden="true" />
            </button>
          </div>
        </section>

        {filtersOpen && (
          <section className="ab-filter-panel" aria-label="Specialty filters">
            {specialties.map((item) => (
              <button
                className={specialtyFilters.includes(item) ? 'is-active' : ''}
                key={item}
                type="button"
                onClick={() => toggleSpecialtyFilter(item)}
              >
                {item}
              </button>
            ))}
            <button type="button" onClick={() => setSpecialtyFilters([])}>
              Clear
            </button>
          </section>
        )}

        {filteredBarbers.length === 0 ? (
          <section className="admin-empty">No barbers match the current filters.</section>
        ) : view === 'list' ? (
          <BarberList
            barbers={filteredBarbers}
            busy={actionBusy}
            onView={() => setToast('Barber profile page is not connected yet.')}
            onEdit={openEdit}
            onDelete={setToDelete}
            onToggle={toggleAvailability}
          />
        ) : (
          <section className="ab-grid">
            {filteredBarbers.map((barber) => (
              <BarberCard
                barber={barber}
                busy={actionBusy}
                key={barber.id}
                today={today}
                onView={() => setToast('Barber profile page is not connected yet.')}
                onEdit={openEdit}
                onDelete={setToDelete}
                onToggle={toggleAvailability}
              />
            ))}
          </section>
        )}
      </section>

      <BarberDrawer
        busy={actionBusy}
        draft={draft}
        mode={drawerMode}
        onClose={() => setDraft(null)}
        onDraftChange={setDraft}
        onSave={saveBarber}
      />

      {toDelete && (
        <ConfirmDialog
          title="Remove from roster?"
          description={`This archives ${toDelete.name} (${toDelete.code}) and hides them from booking. Existing history is retained.`}
          cancelLabel="Cancel"
          confirmLabel="Remove barber"
          busy={actionBusy}
          onCancel={() => setToDelete(null)}
          onConfirm={confirmArchive}
        />
      )}

      {isLogoutDialogOpen && (
        <ConfirmDialog
          title="Log out of admin?"
          description="You will return to the sign-in page."
          cancelLabel="Stay signed in"
          confirmLabel="Yes, log out"
          onCancel={() => setIsLogoutDialogOpen(false)}
          onConfirm={() => {
            setIsLogoutDialogOpen(false)
            onLogout?.()
          }}
        />
      )}
    </main>
  )
}
