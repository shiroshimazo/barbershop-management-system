import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import {
  RiAddLine,
  RiArchiveLine,
  RiCheckLine,
  RiCircleLine,
  RiCloseLine,
  RiDeleteBin6Line,
  RiDropLine,
  RiEyeLine,
  RiHistoryLine,
  RiListCheck2,
  RiMoneyDollarCircleLine,
  RiPaletteLine,
  RiPenNibLine,
  RiPencilLine,
  RiScissorsLine,
  RiSearchLine,
  RiStarFill,
  RiStarLine,
  RiTimeLine,
  RiUserHeartLine,
  RiUserSmileLine,
} from 'react-icons/ri'
import ConfirmDialog from '../Customer/ConfirmDialog.jsx'
import Toast from '../components/Toast.jsx'
import { supabase } from '../lib/supabase.js'
import { AdminSidebar, Icon } from './AdminShell.jsx'
import { browserTimeZone } from './adminShared.js'

const categories = ['Cuts', 'Beard', 'Combo', 'Premium', 'Add-ons']
const badges = ['Signature', 'Premium', 'Classic', 'New', 'Limited', 'None']
const icons = ['scis', 'beard', 'towel', 'raz', 'buzz', 'kid', 'full', 'color']

const emptyWorkspace = {
  generatedAt: null,
  services: [],
  stats: {
    totalCount: 0,
    activeCount: 0,
    archivedCount: 0,
    signatureCount: 0,
    premiumCount: 0,
    avgTicketCents: 0,
    avgDurationMinutes: 0,
    totalRevenue90dCents: 0,
    categoryCounts: {},
    upcomingCount: 0,
  },
}

const emptyDraft = {
  id: null,
  name: '',
  slug: '',
  category: 'Cuts',
  price: '35',
  duration: '30',
  description: '',
  badge: 'None',
  icon: 'scis',
  active: true,
}

function normalizeWorkspace(data) {
  if (!data || typeof data !== 'object') return emptyWorkspace
  return {
    ...emptyWorkspace,
    ...data,
    services: Array.isArray(data.services) ? data.services : [],
    stats: { ...emptyWorkspace.stats, ...(data.stats || {}) },
  }
}

function money(cents) {
  return `$${((Number(cents) || 0) / 100).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })}`
}

function compactMoney(cents) {
  const value = (Number(cents) || 0) / 100
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`
  return `$${value.toFixed(0)}`
}

function hourlyRate(service) {
  const minutes = Number(service.durationMinutes) || 1
  return `$${Math.round(((Number(service.priceCents) || 0) / 100 / minutes) * 60)}/HR`
}

function draftFromService(service) {
  return {
    id: service.id,
    name: service.name || '',
    slug: service.slug || '',
    category: service.category || 'Cuts',
    price: String(Math.round((service.priceCents || 0) / 100)),
    duration: String(service.durationMinutes || 30),
    description: service.description || '',
    badge: service.badge || 'None',
    icon: service.icon || 'scis',
    active: !!service.active,
  }
}

function ServiceIcon({ name }) {
  const map = {
    beard: RiUserSmileLine,
    buzz: RiCircleLine,
    color: RiPaletteLine,
    full: RiStarLine,
    kid: RiUserHeartLine,
    raz: RiPenNibLine,
    scis: RiScissorsLine,
    towel: RiDropLine,
  }
  const IconComponent = map[name] || RiScissorsLine
  return <IconComponent aria-hidden="true" />
}

function StatTile({ icon: StatIcon, label, value, delta, foot, dark = false }) {
  return (
    <article className={`as-stat${dark ? ' is-dark' : ''}`}>
      <div className="as-stat-head">
        <span>
          <StatIcon aria-hidden="true" />
        </span>
        <small>{label}</small>
      </div>
      <strong>{value}</strong>
      <p>
        <mark>{delta}</mark>
        {foot}
      </p>
    </article>
  )
}

function BadgePill({ badge }) {
  const normalized = badge || 'None'
  return (
    <span className={`as-badge is-${normalized.toLowerCase().replaceAll(' ', '-')}`}>
      {normalized === 'Signature' && <RiStarFill aria-hidden="true" />}
      {normalized === 'None' ? 'Standard' : normalized}
    </span>
  )
}

function FeaturedCard({ service, variant, label }) {
  if (!service) return null
  return (
    <article className={`as-feature-card is-${variant}`}>
      <div className="as-feature-head">
        <small>{label}</small>
        <span>{service.durationMinutes} min</span>
      </div>
      <h2>
        {service.name}
        <span>.</span>
      </h2>
      <p>{service.description || 'A live menu item from the booking catalogue.'}</p>
      <div className="as-feature-meta">
        <span>
          Price
          <b>{money(service.priceCents)}</b>
        </span>
        <span>
          Bookings 90d
          <b>{service.bookings90d || 0}</b>
        </span>
        <span>
          Revenue
          <b>{compactMoney(service.revenue90dCents)}</b>
        </span>
      </div>
    </article>
  )
}

function FeaturedServices({ services }) {
  const signature =
    services.find((service) => service.slug === 'classic-fade-beard') ||
    services.find((service) => service.badge === 'Signature')
  const premium =
    services.find((service) => service.slug === 'full-service') ||
    services.find((service) => service.badge === 'Premium')
  const classic =
    services.find((service) => service.slug === 'classic-cut') ||
    services.find((service) => service.badge === 'Classic')

  if (!signature || !premium || !classic) return null

  return (
    <section className="as-featured" aria-label="Featured services">
      <FeaturedCard service={signature} variant="signature" label="Signature · Most booked" />
      <FeaturedCard service={premium} variant="premium" label="Premium · Highest ticket" />
      <FeaturedCard service={classic} variant="classic" label="Classic · The everyday" />
    </section>
  )
}

function ServiceDrawer({ mode, draft, onClose, onDraftChange, onSave, busy }) {
  if (!draft) return null
  return (
    <div className="as-drawer-layer" role="presentation">
      <button className="as-drawer-scrim" type="button" aria-label="Close drawer" onClick={onClose} />
      <aside className="as-drawer" aria-modal="true" role="dialog">
        <header>
          <div>
            <small>{mode === 'create' ? 'New service' : 'Edit service'}</small>
            <h2>{mode === 'create' ? 'Add to menu.' : 'Service details.'}</h2>
          </div>
          <button type="button" aria-label="Close drawer" onClick={onClose}>
            <RiCloseLine aria-hidden="true" />
          </button>
        </header>

        <div className="as-drawer-form">
          <label>
            <span>Service name</span>
            <input
              type="text"
              value={draft.name}
              onChange={(event) => onDraftChange({ ...draft, name: event.target.value })}
            />
          </label>
          <label>
            <span>Slug</span>
            <input
              type="text"
              value={draft.slug}
              placeholder="skin-fade"
              onChange={(event) => onDraftChange({ ...draft, slug: event.target.value })}
            />
          </label>
          <label>
            <span>Category</span>
            <select
              value={draft.category}
              onChange={(event) => onDraftChange({ ...draft, category: event.target.value })}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Badge</span>
            <select
              value={draft.badge}
              onChange={(event) => onDraftChange({ ...draft, badge: event.target.value })}
            >
              {badges.map((badge) => (
                <option key={badge} value={badge}>
                  {badge}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Price</span>
            <input
              min="0"
              type="number"
              value={draft.price}
              onChange={(event) => onDraftChange({ ...draft, price: event.target.value })}
            />
          </label>
          <label>
            <span>Duration minutes</span>
            <input
              min="1"
              type="number"
              value={draft.duration}
              onChange={(event) => onDraftChange({ ...draft, duration: event.target.value })}
            />
          </label>
          <label>
            <span>Icon</span>
            <select
              value={draft.icon}
              onChange={(event) => onDraftChange({ ...draft, icon: event.target.value })}
            >
              {icons.map((icon) => (
                <option key={icon} value={icon}>
                  {icon}
                </option>
              ))}
            </select>
          </label>
          <label className="as-active-row">
            <span>Active in booking flow</span>
            <button
              className={`as-switch${draft.active ? ' is-on' : ''}`}
              type="button"
              aria-pressed={draft.active}
              onClick={() => onDraftChange({ ...draft, active: !draft.active })}
            >
              <span aria-hidden="true" />
              {draft.active ? 'Active' : 'Archived'}
            </button>
          </label>
          <label className="as-field-wide">
            <span>Description</span>
            <textarea
              rows="4"
              value={draft.description}
              onChange={(event) => onDraftChange({ ...draft, description: event.target.value })}
            />
          </label>
        </div>

        <footer>
          <button type="button" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="is-primary" type="button" onClick={onSave} disabled={busy}>
            <RiCheckLine aria-hidden="true" />
            {busy ? 'Saving' : mode === 'create' ? 'Add service' : 'Save changes'}
          </button>
        </footer>
      </aside>
    </div>
  )
}

function ServiceRow({ service, onView, onEdit, onAction }) {
  const iconVariant =
    service.badge === 'Signature' ? ' is-signature' : service.badge === 'Premium' ? ' is-premium' : ''
  return (
    <tr className={service.active ? '' : 'is-archived'}>
      <td>
        <div className="as-service-cell">
          <span className={`as-service-icon${iconVariant}`}>
            <ServiceIcon name={service.icon} />
          </span>
          <div>
            <strong>
              {service.name}
              {service.badge === 'Signature' && <RiStarFill aria-hidden="true" />}
            </strong>
            <small>
              {service.code} · {service.category}
            </small>
          </div>
        </div>
      </td>
      <td className="as-desc">{service.description || '-'}</td>
      <td>
        <BadgePill badge={service.badge} />
      </td>
      <td className="as-num">
        <strong>{service.durationMinutes}</strong>
        <small>minutes</small>
      </td>
      <td className="as-num">
        <strong>{money(service.priceCents)}</strong>
        <small>{hourlyRate(service)}</small>
      </td>
      <td className="as-num">
        <strong>{(service.bookings90d || 0).toLocaleString()}</strong>
        <small>{compactMoney(service.revenue90dCents)}</small>
      </td>
      <td>
        <span className={`as-status${service.active ? ' is-active' : ' is-archived'}`}>
          {service.active ? 'Active' : 'Archived'}
        </span>
      </td>
      <td>
        <div className="as-actions">
          <button type="button" aria-label={`View ${service.name}`} onClick={() => onView(service)}>
            <RiEyeLine aria-hidden="true" />
          </button>
          <button type="button" aria-label={`Edit ${service.name}`} onClick={() => onEdit(service)}>
            <RiPencilLine aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={service.active ? `Archive ${service.name}` : `Restore ${service.name}`}
            onClick={() => onAction(service, service.active ? 'archive' : 'restore')}
          >
            {service.active ? <RiArchiveLine aria-hidden="true" /> : <RiHistoryLine aria-hidden="true" />}
          </button>
          <button
            className="is-danger"
            type="button"
            aria-label={`Delete ${service.name}`}
            onClick={() => onAction(service, 'delete')}
          >
            <RiDeleteBin6Line aria-hidden="true" />
          </button>
        </div>
      </td>
    </tr>
  )
}

export default function AdminServices({ onLogout }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false)
  const [workspace, setWorkspace] = useState(emptyWorkspace)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [catFilter, setCatFilter] = useState('All')
  const [badgeFilter, setBadgeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('Active')
  const [drawerMode, setDrawerMode] = useState('create')
  const [draft, setDraft] = useState(null)
  const [pendingAction, setPendingAction] = useState(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [toast, setToast] = useState('')

  const loadServices = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true)
    const { data, error: rpcError } = await supabase.rpc('get_admin_services', {
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
      const { data, error: rpcError } = await supabase.rpc('get_admin_services', {
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
      .channel('admin-services-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => loadServices(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => loadServices(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visits' }, () => loadServices(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'walk_ins' }, () => loadServices(false))
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadServices])

  const stats = workspace.stats
  const counts = stats.categoryCounts || {}
  const filteredServices = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return workspace.services.filter((service) => {
      if (statusFilter === 'Active' && !service.active) return false
      if (statusFilter === 'Archived' && service.active) return false
      if (catFilter !== 'All' && service.category !== catFilter) return false
      if (badgeFilter !== 'All' && service.badge !== badgeFilter) return false
      if (!normalizedQuery) return true
      return [service.name, service.code, service.slug, service.category, service.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery))
    })
  }, [workspace.services, query, catFilter, badgeFilter, statusFilter])

  const groupedServices = useMemo(() => {
    return categories
      .map((category) => [
        category,
        filteredServices.filter((service) => service.category === category),
      ])
      .filter(([, rows]) => rows.length > 0)
  }, [filteredServices])

  const handleSidebarSelect = (item) => {
    setIsSidebarOpen(false)
    if (item.id === 'services') return
    if (['appointments', 'customers', 'barbers'].includes(item.id)) {
      window.location.hash = item.id
      return
    }
    window.location.hash = 'dashboard'
  }

  const openCreate = () => {
    setDrawerMode('create')
    setDraft({ ...emptyDraft })
  }

  const openEdit = (service) => {
    setDrawerMode('edit')
    setDraft(draftFromService(service))
  }

  const saveService = async () => {
    if (!draft?.name.trim()) {
      setToast('Service name is required.')
      return
    }

    setActionBusy(true)
    const { error: saveError } = await supabase.rpc('admin_save_service', {
      p_service_id: drawerMode === 'edit' ? draft.id : null,
      p_name: draft.name.trim(),
      p_slug: draft.slug.trim() || null,
      p_category: draft.category,
      p_price_cents: Math.max(0, Math.round((Number(draft.price) || 0) * 100)),
      p_duration_minutes: Math.max(1, Number(draft.duration) || 1),
      p_description: draft.description.trim() || null,
      p_badge: draft.badge,
      p_icon: draft.icon,
      p_active: draft.active,
    })
    setActionBusy(false)

    if (saveError) {
      setToast(`Could not save service: ${saveError.message}`)
      return
    }

    setToast(drawerMode === 'create' ? `Added ${draft.name} to the menu` : `Saved ${draft.name}`)
    setDraft(null)
    await loadServices(false)
  }

  const confirmAction = async () => {
    if (!pendingAction?.service?.id) return
    const { service, action } = pendingAction
    setActionBusy(true)

    if (action === 'delete') {
      const { error: deleteError } = await supabase.rpc('admin_delete_service', {
        p_service_id: service.id,
      })
      setActionBusy(false)
      if (deleteError) {
        setToast(`Could not delete service: ${deleteError.message}`)
        return
      }
      setToast(`Deleted ${service.name}`)
    } else {
      const nextActive = action === 'restore'
      const { error: statusError } = await supabase.rpc('admin_set_service_active', {
        p_service_id: service.id,
        p_active: nextActive,
      })
      setActionBusy(false)
      if (statusError) {
        setToast(`Could not update service: ${statusError.message}`)
        return
      }
      setToast(nextActive ? `Restored ${service.name} to the menu` : `Archived ${service.name}`)
    }

    setPendingAction(null)
    await loadServices(false)
  }

  const actionLabels = {
    archive: {
      title: 'Archive service?',
      confirmLabel: 'Archive',
      description: pendingAction?.service
        ? `${pendingAction.service.name} will be hidden from the booking flow. Reporting and historical bookings are preserved.`
        : '',
    },
    restore: {
      title: 'Restore to menu?',
      confirmLabel: 'Restore',
      description: pendingAction?.service
        ? `${pendingAction.service.name} will reappear on the booking menu at ${money(pendingAction.service.priceCents)}.`
        : '',
    },
    delete: {
      title: 'Delete permanently?',
      confirmLabel: 'Delete',
      description: pendingAction?.service
        ? `Permanently delete ${pendingAction.service.name}? This cannot be undone.`
        : '',
    },
  }
  const modalCopy = pendingAction ? actionLabels[pendingAction.action] : null

  return (
    <main className="customer-dashboard admin-page">
      <Toast message={toast} onClose={() => setToast('')} />
      <AdminSidebar
        activeId="services"
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

      <section className="admin-main admin-services-page" aria-label="Admin services">
        <button
          aria-label="Open navigation"
          className="customer-square-button customer-mobile-menu-button admin-mobile-menu"
          type="button"
          onClick={() => setIsSidebarOpen(true)}
        >
          <Icon name="menu" />
        </button>

        <header className="as-head">
          <div>
            <nav className="as-crumbs" aria-label="Breadcrumb">
              <button type="button" onClick={() => (window.location.hash = 'dashboard')}>
                Menu
              </button>
              <span>/</span>
              <strong>Services</strong>
            </nav>
            <h1>
              The menu<span>.</span>
            </h1>
            <p>
              {stats.activeCount} active services · {stats.archivedCount} archived ·{' '}
              {stats.signatureCount} signature picks · {money(stats.totalRevenue90dCents)} earned
              across all services in the last 90 days.
            </p>
          </div>
          <div className="as-head-actions">
            <button type="button" onClick={() => setToast('Reorder menu is not generated yet.')}>
              <RiListCheck2 aria-hidden="true" />
              Reorder menu
            </button>
            <button className="is-primary" type="button" onClick={openCreate}>
              <RiAddLine aria-hidden="true" />
              New service
            </button>
          </div>
        </header>

        {error && (
          <section className="admin-alert" role="alert">
            <strong>Service data did not load.</strong>
            <span>{error}</span>
            <small>Run `supabase/migrations/0012_admin_services.sql` in Supabase SQL Editor.</small>
          </section>
        )}

        <section className="as-stats" aria-label="Service metrics">
          <StatTile
            icon={RiListCheck2}
            label="Total services"
            value={loading ? '...' : stats.totalCount}
            delta="+ live"
            foot="catalogue"
          />
          <StatTile
            icon={RiStarFill}
            label="Signature picks"
            value={loading ? '...' : stats.signatureCount}
            delta={`${stats.totalCount ? Math.round((stats.signatureCount / stats.totalCount) * 100) : 0}%`}
            foot="of menu"
            dark
          />
          <StatTile
            icon={RiMoneyDollarCircleLine}
            label="Avg ticket"
            value={loading ? '...' : money(stats.avgTicketCents)}
            delta="live"
            foot="active services"
          />
          <StatTile
            icon={RiTimeLine}
            label="Avg duration"
            value={loading ? '...' : `${stats.avgDurationMinutes} min`}
            delta="all"
            foot="across menu"
          />
          <StatTile
            icon={RiArchiveLine}
            label="Archived"
            value={loading ? '...' : stats.archivedCount}
            delta="hidden"
            foot="from booking"
          />
        </section>

        <FeaturedServices services={workspace.services.filter((service) => service.active)} />

        <section className="as-toolbar" aria-label="Service filters">
          <label className="as-search">
            <RiSearchLine aria-hidden="true" />
            <span className="sr-only">Search services</span>
            <input
              type="search"
              value={query}
              placeholder="Search by name, category, ID..."
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="as-segment">
            {['All', ...categories].map((category) => (
              <button
                className={catFilter === category ? 'is-active' : ''}
                key={category}
                type="button"
                onClick={() => setCatFilter(category)}
              >
                {category}
                <span>{category === 'All' ? stats.totalCount : counts[category] || 0}</span>
              </button>
            ))}
          </div>
          <div className="as-segment">
            {['All', 'Signature', 'Premium', 'Classic', 'New', 'Limited'].map((badge) => (
              <button
                className={badgeFilter === badge ? 'is-active' : ''}
                key={badge}
                type="button"
                onClick={() => setBadgeFilter(badge)}
              >
                {badge}
              </button>
            ))}
          </div>
          <div className="as-segment is-status">
            {[
              ['Active', stats.activeCount],
              ['Archived', stats.archivedCount],
              ['All', stats.totalCount],
            ].map(([status, count]) => (
              <button
                className={statusFilter === status ? 'is-active' : ''}
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
              >
                {status}
                <span>{count}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="as-table-card">
          <div className="as-table-wrap">
            <table className="as-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Description</th>
                  <th>Badge</th>
                  <th>Duration</th>
                  <th>Price</th>
                  <th>Bookings 90d</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {groupedServices.map(([category, rows]) => (
                  <Fragment key={category}>
                    <tr className="as-cat-row" key={`${category}-head`}>
                      <td colSpan="8">
                        {category}
                        <span>{rows.length}</span>
                      </td>
                    </tr>
                    {rows.map((service) => (
                      <ServiceRow
                        key={service.id}
                        service={service}
                        onView={() => setToast('Service detail page is not connected yet.')}
                        onEdit={openEdit}
                        onAction={(row, action) => setPendingAction({ service: row, action })}
                      />
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
            {filteredServices.length === 0 && (
              <div className="admin-empty">No services match the current filters.</div>
            )}
          </div>
        </section>
      </section>

      <ServiceDrawer
        busy={actionBusy}
        draft={draft}
        mode={drawerMode}
        onClose={() => setDraft(null)}
        onDraftChange={setDraft}
        onSave={saveService}
      />

      {pendingAction && modalCopy && (
        <ConfirmDialog
          title={modalCopy.title}
          description={modalCopy.description}
          cancelLabel="Cancel"
          confirmLabel={modalCopy.confirmLabel}
          busy={actionBusy}
          onCancel={() => setPendingAction(null)}
          onConfirm={confirmAction}
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
