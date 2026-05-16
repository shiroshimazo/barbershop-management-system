import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  RiAddLine,
  RiArrowDownSLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiArrowUpCircleLine,
  RiCopperCoinLine,
  RiDeleteBin6Line,
  RiDownload2Line,
  RiEyeLine,
  RiFilter3Line,
  RiGroupLine,
  RiPencilLine,
  RiSearchLine,
  RiShieldStarLine,
  RiStarFill,
  RiUserLine,
} from 'react-icons/ri'
import ConfirmDialog from '../Customer/ConfirmDialog.jsx'
import Toast from '../components/Toast.jsx'
import { supabase } from '../lib/supabase.js'
import { AdminSidebar, Icon } from './AdminShell.jsx'

const emptyCustomerWorkspace = {
  generatedAt: null,
  customers: [],
  stats: {
    totalCount: 0,
    newThisMonth: 0,
    standardCount: 0,
    goldCount: 0,
    platinumCount: 0,
    pointsInCirculation: 0,
    pointsTrendPct: 0,
    nearTierUpCount: 0,
  },
}

const tierFilters = [
  { id: 'all', label: 'All' },
  { id: 'standard', label: 'Standard' },
  { id: 'gold', label: 'Gold' },
  { id: 'platinum', label: 'Platinum' },
]

const sortOptions = [
  { value: 'points', label: 'Most loyalty points' },
  { value: 'visits', label: 'Most visits' },
  { value: 'lifetime', label: 'Highest lifetime value' },
  { value: 'last_visit', label: 'Recently active' },
  { value: 'name', label: 'Name A-Z' },
  { value: 'joined', label: 'Newest members' },
  { value: 'near_tier', label: 'Near tier-up' },
]

const pageSize = 12
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const emptyCustomerForm = {
  fullname: '',
  email: '',
  phone: '',
  password: '',
  tier: 'silver',
  loyaltyPoints: '0',
}

function createSignupClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

function normalizeWorkspace(data) {
  if (!data || typeof data !== 'object') return emptyCustomerWorkspace
  return {
    ...emptyCustomerWorkspace,
    ...data,
    customers: Array.isArray(data.customers) ? data.customers : [],
    stats: { ...emptyCustomerWorkspace.stats, ...(data.stats || {}) },
  }
}

function formatMoney(cents) {
  return `$${((Number(cents) || 0) / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatMonthYear(iso) {
  if (!iso) return '-'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' }).format(date)
}

function relativeDate(iso) {
  if (!iso) return 'No visits yet'
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return 'No visits yet'
  const today = new Date()
  const thenDay = new Date(then.getFullYear(), then.getMonth(), then.getDate())
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const days = Math.round((todayDay - thenDay) / 86_400_000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return 'A week ago'
  if (days < 49) return `${Math.round(days / 7)} weeks ago`
  return formatMonthYear(iso)
}

function initialsFor(name) {
  const parts = String(name || 'Customer')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return 'CU'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

function tierLabel(tier) {
  if (tier === 'platinum') return 'Platinum'
  if (tier === 'gold') return 'Gold'
  return 'Standard'
}

function tierProgress(customer) {
  const points = Number(customer.loyaltyPoints) || 0
  if (customer.tier === 'platinum') {
    return { percent: 100, text: `Top tier · ${customer.pointsToNext || 0} to next perk` }
  }
  const threshold = customer.tier === 'gold' ? 1500 : 500
  const next = customer.tier === 'gold' ? 'Platinum' : 'Gold'
  return {
    percent: Math.max(0, Math.min(100, Math.round((points / threshold) * 100))),
    text: `${customer.pointsToNext || 0} to ${next}`,
  }
}

function sortCustomers(rows, sortKey) {
  const copy = [...rows]
  copy.sort((a, b) => {
    if (sortKey === 'visits') return (b.visitCount || 0) - (a.visitCount || 0)
    if (sortKey === 'lifetime') return (b.lifetimeCents || 0) - (a.lifetimeCents || 0)
    if (sortKey === 'last_visit') {
      return new Date(b.lastVisitAt || 0) - new Date(a.lastVisitAt || 0)
    }
    if (sortKey === 'name') return String(a.name || '').localeCompare(String(b.name || ''))
    if (sortKey === 'joined') return new Date(b.joinedAt || 0) - new Date(a.joinedAt || 0)
    if (sortKey === 'near_tier') return (a.pointsToNext ?? 9999) - (b.pointsToNext ?? 9999)
    return (b.loyaltyPoints || 0) - (a.loyaltyPoints || 0)
  })
  return copy
}

function csvEscape(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`
}

function CustomerStat({ icon: StatIcon, label, value, meta, gold = false }) {
  return (
    <article className={`admin-customer-stat${gold ? ' is-gold' : ''}`}>
      <span>
        <StatIcon aria-hidden="true" />
      </span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <em>{meta}</em>
      </div>
    </article>
  )
}

function TierPill({ tier }) {
  const IconComponent =
    tier === 'platinum' ? RiShieldStarLine : tier === 'gold' ? RiStarFill : RiUserLine
  return (
    <span className={`admin-tier-pill is-${tier || 'standard'}`}>
      <IconComponent aria-hidden="true" />
      {tierLabel(tier)}
    </span>
  )
}

function LoyaltyCell({ customer }) {
  const progress = tierProgress(customer)
  return (
    <div className="admin-loyalty-cell">
      <strong>
        {(customer.loyaltyPoints || 0).toLocaleString()} <span>PTS</span>
      </strong>
      <div className="admin-pts-bar" aria-hidden="true">
        <span style={{ width: `${progress.percent}%` }} />
      </div>
      <small>{progress.text}</small>
    </div>
  )
}

export default function AdminCustomer({ onLogout }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false)
  const [workspace, setWorkspace] = useState(emptyCustomerWorkspace)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [tierFilter, setTierFilter] = useState('all')
  const [sortKey, setSortKey] = useState('points')
  const [advancedFilters, setAdvancedFilters] = useState({
    nearTier: false,
    hasVisits: false,
    noVisits: false,
  })
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [viewCustomer, setViewCustomer] = useState(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [createForm, setCreateForm] = useState(emptyCustomerForm)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [editForm, setEditForm] = useState({
    fullname: '',
    email: '',
    phone: '',
    tier: 'silver',
    loyaltyPoints: '0',
  })
  const [pendingDelete, setPendingDelete] = useState(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [toast, setToast] = useState('')

  const loadCustomers = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true)
    const { data, error: rpcError } = await supabase.rpc('get_admin_customers')
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
      const { data, error: rpcError } = await supabase.rpc('get_admin_customers')
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
      .channel('admin-customers-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => {
        loadCustomers(false)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visits' }, () => {
        loadCustomers(false)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadCustomers])

  const filteredCustomers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const filtered = workspace.customers.filter((customer) => {
      if (tierFilter !== 'all' && customer.tier !== tierFilter) return false
      if (advancedFilters.nearTier && (customer.tier === 'platinum' || customer.pointsToNext > 100)) {
        return false
      }
      if (advancedFilters.hasVisits && (customer.visitCount || 0) === 0) return false
      if (advancedFilters.noVisits && (customer.visitCount || 0) > 0) return false
      if (!normalizedQuery) return true
      return [customer.name, customer.email, customer.phone, customer.customerCode, customer.id]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery))
    })
    return sortCustomers(filtered, sortKey)
  }, [workspace.customers, query, tierFilter, advancedFilters, sortKey])

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageStart = (safePage - 1) * pageSize
  const visibleCustomers = filteredCustomers.slice(pageStart, pageStart + pageSize)
  const visibleIds = visibleCustomers.map((customer) => customer.id)
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id))
  const stats = workspace.stats
  const goldPct = stats.totalCount ? Math.round((stats.goldCount / stats.totalCount) * 100) : 0
  const platinumPct = stats.totalCount
    ? Math.round((stats.platinumCount / stats.totalCount) * 100)
    : 0
  const activeFilterCount = Object.values(advancedFilters).filter(Boolean).length
  const selectedCustomers = useMemo(
    () => workspace.customers.filter((customer) => selectedIds.has(customer.id)),
    [workspace.customers, selectedIds],
  )

  const handleSidebarSelect = (item) => {
    setIsSidebarOpen(false)
    if (item.id === 'customers') return
    if (item.id === 'appointments') {
      window.location.hash = 'appointments'
      return
    }
    if (item.id === 'barbers') {
      window.location.hash = 'barbers'
      return
    }
    window.location.hash = 'dashboard'
  }

  const setSearch = (value) => {
    setQuery(value)
    setPage(1)
  }

  const setTier = (value) => {
    setTierFilter(value)
    setPage(1)
  }

  const setSort = (value) => {
    setSortKey(value)
    setPage(1)
  }

  const toggleAdvancedFilter = (key) => {
    setAdvancedFilters((current) => {
      const next = { ...current, [key]: !current[key] }
      if (key === 'hasVisits' && next.hasVisits) next.noVisits = false
      if (key === 'noVisits' && next.noVisits) next.hasVisits = false
      return next
    })
    setPage(1)
  }

  const clearAdvancedFilters = () => {
    setAdvancedFilters({ nearTier: false, hasVisits: false, noVisits: false })
    setPage(1)
  }

  const toggleAllVisible = () => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (allVisibleSelected) {
        visibleIds.forEach((id) => next.delete(id))
      } else {
        visibleIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  const toggleCustomer = (id) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const openEditCustomer = (customer) => {
    setEditingCustomer(customer)
    setEditForm({
      fullname: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      tier: customer.rawTier || (customer.tier === 'standard' ? 'silver' : customer.tier || 'silver'),
      loyaltyPoints: String(customer.loyaltyPoints || 0),
    })
  }

  const updateEditForm = (field, value) => {
    setEditForm((current) => ({ ...current, [field]: value }))
  }

  const openCreateCustomer = () => {
    setCreateForm(emptyCustomerForm)
    setIsCreateDialogOpen(true)
  }

  const updateCreateForm = (field, value) => {
    setCreateForm((current) => ({ ...current, [field]: value }))
  }

  const exportCsv = (rowsToExport = filteredCustomers, fileLabel = 'customers') => {
    if (rowsToExport.length === 0) return
    const header = [
      'Customer ID',
      'Name',
      'Email',
      'Phone',
      'Tier',
      'Visits',
      'Loyalty points',
      'Last visit',
      'Last barber',
      'Lifetime',
    ]
    const rows = rowsToExport.map((customer) => [
      customer.customerCode,
      customer.name,
      customer.email,
      customer.phone,
      tierLabel(customer.tier),
      customer.visitCount,
      customer.loyaltyPoints,
      customer.lastVisitAt || '',
      customer.lastBarberName || '',
      ((customer.lifetimeCents || 0) / 100).toFixed(2),
    ])
    const csv = [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `bladeco-${fileLabel}-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const confirmUpdateCustomer = async () => {
    if (!editingCustomer?.id) return
    const fullname = editForm.fullname.trim()
    const emailValue = editForm.email.trim()
    if (!fullname || !emailValue) return

    setActionBusy(true)
    const { error: updateError } = await supabase.rpc('admin_update_customer', {
      p_customer_id: editingCustomer.id,
      p_fullname: fullname,
      p_email: emailValue,
      p_phone: editForm.phone.trim() || null,
      p_tier: editForm.tier,
      p_loyalty_points: Math.max(0, Number(editForm.loyaltyPoints) || 0),
    })
    setActionBusy(false)

    if (updateError) {
      setToast(`Could not update customer: ${updateError.message}`)
      return
    }

    setEditingCustomer(null)
    setToast('Customer updated.')
    await loadCustomers(false)
  }

  const confirmCreateCustomer = async () => {
    const fullname = createForm.fullname.trim()
    const emailValue = createForm.email.trim().toLowerCase()
    const phoneValue = createForm.phone.trim()
    const passwordValue = createForm.password

    if (!fullname || !emailValue || !passwordValue) return

    if (passwordValue.length < 8) {
      setToast('Temporary password must be at least 8 characters.')
      return
    }

    setActionBusy(true)
    const signupClient = createSignupClient()
    const { data, error: signupError } = await signupClient.auth.signUp({
      email: emailValue,
      password: passwordValue,
      options: {
        data: {
          fullname,
          phone: phoneValue || null,
        },
      },
    })

    if (signupError) {
      setActionBusy(false)
      setToast(`Could not create customer: ${signupError.message}`)
      return
    }

    const customerId = data.user?.id
    if (!customerId) {
      setActionBusy(false)
      setToast('Customer account was created, but Supabase did not return the user id.')
      return
    }

    const { error: updateError } = await supabase.rpc('admin_update_customer', {
      p_customer_id: customerId,
      p_fullname: fullname,
      p_email: emailValue,
      p_phone: phoneValue || null,
      p_tier: createForm.tier,
      p_loyalty_points: Math.max(0, Number(createForm.loyaltyPoints) || 0),
    })
    await signupClient.auth.signOut()
    setActionBusy(false)

    if (updateError) {
      setToast(`Customer account was created, but profile update failed: ${updateError.message}`)
      return
    }

    setIsCreateDialogOpen(false)
    setCreateForm(emptyCustomerForm)
    setToast('Customer created.')
    await loadCustomers(false)
  }

  const confirmDelete = async () => {
    if (!pendingDelete?.id) return
    setActionBusy(true)
    const { error: deleteError } = await supabase.rpc('admin_delete_customer', {
      p_customer_id: pendingDelete.id,
    })
    setActionBusy(false)
    if (deleteError) {
      setToast(`Could not delete customer: ${deleteError.message}`)
      return
    }
    setSelectedIds((current) => {
      const next = new Set(current)
      next.delete(pendingDelete.id)
      return next
    })
    setPendingDelete(null)
    setToast('Customer deleted.')
    await loadCustomers(false)
  }

  return (
    <main className="customer-dashboard admin-page">
      <Toast message={toast} onClose={() => setToast('')} />
      <AdminSidebar
        activeId="customers"
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelect={handleSidebarSelect}
        onLogoutRequest={() => setIsLogoutDialogOpen(true)}
        upcomingCount={0}
      />
      <button
        aria-label="Close navigation"
        className={`customer-sidebar-backdrop${isSidebarOpen ? ' is-open' : ''}`}
        type="button"
        onClick={() => setIsSidebarOpen(false)}
      />

      <section className="admin-main admin-customers" aria-label="Admin customers">
        <button
          aria-label="Open navigation"
          className="customer-square-button customer-mobile-menu-button admin-mobile-menu"
          type="button"
          onClick={() => setIsSidebarOpen(true)}
        >
          <Icon name="menu" />
        </button>

        <header className="admin-customer-head">
          <nav className="admin-customer-breadcrumb" aria-label="Breadcrumb">
            <button type="button" onClick={() => (window.location.hash = 'dashboard')}>
              Engage
            </button>
            <span>/</span>
            <strong>Customers</strong>
          </nav>
          <div className="admin-customer-title-row">
            <div>
              <h1>
                Customer list<span>.</span>
              </h1>
              <p>
                {stats.totalCount.toLocaleString()} regulars on file · {stats.goldCount} Gold ·{' '}
                {stats.platinumCount} Platinum ·{' '}
                {stats.pointsInCirculation.toLocaleString()} loyalty points in circulation.
              </p>
            </div>
            <div className="admin-customer-actions">
              <button
                type="button"
                onClick={() => exportCsv(filteredCustomers, 'customers')}
                disabled={filteredCustomers.length === 0}
              >
                <RiDownload2Line aria-hidden="true" />
                Export CSV
              </button>
              <button className="is-primary" type="button" onClick={openCreateCustomer}>
                <RiAddLine aria-hidden="true" />
                Create Customer
              </button>
            </div>
          </div>
        </header>

        {error && (
          <section className="admin-alert" role="alert">
            <strong>Customer data did not load.</strong>
            <span>{error}</span>
            <small>Run `supabase/migrations/0010_admin_customers.sql` in Supabase SQL Editor.</small>
          </section>
        )}

        <section className="admin-customer-stats" aria-label="Customer metrics">
          <CustomerStat
            icon={RiGroupLine}
            label="Total customers"
            value={loading ? '...' : stats.totalCount.toLocaleString()}
            meta={`+${stats.newThisMonth} this month`}
          />
          <CustomerStat
            icon={RiStarFill}
            label="Gold members"
            value={loading ? '...' : stats.goldCount.toLocaleString()}
            meta={`${goldPct}% of roster`}
            gold
          />
          <CustomerStat
            icon={RiShieldStarLine}
            label="Platinum members"
            value={loading ? '...' : stats.platinumCount.toLocaleString()}
            meta={`${platinumPct}% of roster`}
          />
          <CustomerStat
            icon={RiCopperCoinLine}
            label="Points in circulation"
            value={loading ? '...' : stats.pointsInCirculation.toLocaleString()}
            meta={`Live total · ${stats.pointsTrendPct}% trend`}
          />
          <CustomerStat
            icon={RiArrowUpCircleLine}
            label="Near tier-up"
            value={loading ? '...' : stats.nearTierUpCount.toLocaleString()}
            meta="< 100 pts from next tier"
          />
        </section>

        <section className="admin-customer-panel">
          <div className="admin-customer-toolbar">
            <label className="admin-customer-search">
              <RiSearchLine aria-hidden="true" />
              <span className="sr-only">Search customers</span>
              <input
                type="search"
                value={query}
                placeholder="Search by name, email, phone, ID..."
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <div className="admin-customer-tabs" role="tablist" aria-label="Tier filter">
              {tierFilters.map((tier) => {
                const count =
                  tier.id === 'all'
                    ? stats.totalCount
                    : tier.id === 'standard'
                      ? stats.standardCount
                      : tier.id === 'gold'
                        ? stats.goldCount
                        : stats.platinumCount
                return (
                  <button
                    className={tierFilter === tier.id ? 'is-active' : ''}
                    key={tier.id}
                    type="button"
                    role="tab"
                    aria-selected={tierFilter === tier.id}
                    onClick={() => setTier(tier.id)}
                  >
                    {tier.label}
                    <span>{count}</span>
                  </button>
                )
              })}
            </div>
            <label className="admin-customer-sort">
              <select value={sortKey} onChange={(event) => setSort(event.target.value)}>
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <RiArrowDownSLine aria-hidden="true" />
            </label>
            <button
              className={`admin-customer-filter${filtersOpen ? ' is-active' : ''}`}
              type="button"
              onClick={() => setFiltersOpen((open) => !open)}
            >
              <RiFilter3Line aria-hidden="true" />
              More filters
              {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
            </button>
          </div>

          {filtersOpen && (
            <div className="admin-customer-filterbar">
              <button
                className={advancedFilters.nearTier ? 'is-active' : ''}
                type="button"
                onClick={() => toggleAdvancedFilter('nearTier')}
              >
                Near tier-up
              </button>
              <button
                className={advancedFilters.hasVisits ? 'is-active' : ''}
                type="button"
                onClick={() => toggleAdvancedFilter('hasVisits')}
              >
                Has visit history
              </button>
              <button
                className={advancedFilters.noVisits ? 'is-active' : ''}
                type="button"
                onClick={() => toggleAdvancedFilter('noVisits')}
              >
                No visits yet
              </button>
              <button type="button" onClick={clearAdvancedFilters} disabled={activeFilterCount === 0}>
                Clear filters
              </button>
            </div>
          )}

          {selectedIds.size > 0 && (
            <div className="admin-customer-selection">
              <strong>{selectedIds.size} selected</strong>
              <button type="button" onClick={() => exportCsv(selectedCustomers, 'selected-customers')}>
                <RiDownload2Line aria-hidden="true" />
                Export selected
              </button>
              <button type="button" onClick={() => setSelectedIds(new Set())}>
                Clear selection
              </button>
            </div>
          )}

          <div className="admin-customer-table-wrap">
            <table className="admin-customer-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      aria-label="Select all visible customers"
                      checked={allVisibleSelected}
                      onChange={toggleAllVisible}
                    />
                  </th>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th>Tier</th>
                  <th>Visits</th>
                  <th>Loyalty points</th>
                  <th>Last visit</th>
                  <th>Lifetime</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleCustomers.map((customer) => {
                  const selected = selectedIds.has(customer.id)
                  return (
                    <tr className={selected ? 'is-selected' : ''} key={customer.id}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Select ${customer.name}`}
                          checked={selected}
                          onChange={() => toggleCustomer(customer.id)}
                        />
                      </td>
                      <td>
                        <div className="admin-customer-cell">
                          <span className="admin-customer-avatar">
                            {initialsFor(customer.name)}
                          </span>
                          <div>
                            <button
                              type="button"
                              onClick={() => setViewCustomer(customer)}
                            >
                              {customer.name}
                            </button>
                            <small>
                              {customer.customerCode} · joined {formatMonthYear(customer.joinedAt)}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="admin-contact-cell">
                          <a href={`mailto:${customer.email}`}>{customer.email}</a>
                          <span>{customer.phone || 'No phone'}</span>
                        </div>
                      </td>
                      <td>
                        <TierPill tier={customer.tier} />
                      </td>
                      <td>
                        <div className="admin-visits-cell">
                          <strong>{customer.visitCount || 0}</strong>
                          <span>ALL-TIME</span>
                        </div>
                      </td>
                      <td>
                        <LoyaltyCell customer={customer} />
                      </td>
                      <td>
                        <div className="admin-last-cell">
                          <strong>{relativeDate(customer.lastVisitAt)}</strong>
                          <span>
                            {customer.lastBarberName
                              ? `WITH ${customer.lastBarberName.split(' ')[0].toUpperCase()}`
                              : 'NO BARBER'}
                          </span>
                        </div>
                      </td>
                      <td className="admin-lifetime-cell">
                        {formatMoney(customer.lifetimeCents)}
                      </td>
                      <td>
                        <div className="admin-row-actions">
                          <button
                            type="button"
                            aria-label={`View ${customer.name}`}
                            onClick={() => setViewCustomer(customer)}
                          >
                            <RiEyeLine aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Edit ${customer.name}`}
                            onClick={() => openEditCustomer(customer)}
                          >
                            <RiPencilLine aria-hidden="true" />
                          </button>
                          <button
                            className="is-danger"
                            type="button"
                            aria-label={`Delete ${customer.name}`}
                            onClick={() => setPendingDelete(customer)}
                          >
                            <RiDeleteBin6Line aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {visibleCustomers.length === 0 && (
              <div className="admin-customer-empty">
                {workspace.customers.length === 0
                  ? 'No customers on file yet. Start building your roster.'
                  : 'No customers match your search.'}
              </div>
            )}
          </div>

          <div className="admin-customer-pagination">
            <span>
              Showing <strong>{filteredCustomers.length === 0 ? 0 : pageStart + 1}</strong>-
              <strong>{Math.min(pageStart + pageSize, filteredCustomers.length)}</strong> of{' '}
              <strong>{filteredCustomers.length}</strong> customers
            </span>
            <div>
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={safePage === 1}
              >
                <RiArrowLeftSLine aria-hidden="true" />
              </button>
              <strong>{safePage}</strong>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={safePage === totalPages}
              >
                <RiArrowRightSLine aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>
      </section>

      {viewCustomer && (
        <ConfirmDialog
          title={viewCustomer.name}
          description={`${viewCustomer.customerCode} · member since ${formatMonthYear(viewCustomer.joinedAt)}`}
          cancelLabel="Close"
          confirmLabel="Edit customer"
          onCancel={() => setViewCustomer(null)}
          onConfirm={() => {
            const customer = viewCustomer
            setViewCustomer(null)
            openEditCustomer(customer)
          }}
        >
          <div className="admin-customer-detail-grid">
            <div>
              <span>Email</span>
              <strong>{viewCustomer.email}</strong>
            </div>
            <div>
              <span>Phone</span>
              <strong>{viewCustomer.phone || 'No phone'}</strong>
            </div>
            <div>
              <span>Tier</span>
              <TierPill tier={viewCustomer.tier} />
            </div>
            <div>
              <span>Visits</span>
              <strong>{viewCustomer.visitCount || 0}</strong>
            </div>
            <div>
              <span>Loyalty points</span>
              <strong>{(viewCustomer.loyaltyPoints || 0).toLocaleString()}</strong>
            </div>
            <div>
              <span>Lifetime value</span>
              <strong>{formatMoney(viewCustomer.lifetimeCents)}</strong>
            </div>
            <div className="is-wide">
              <span>Last visit</span>
              <strong>
                {relativeDate(viewCustomer.lastVisitAt)}
                {viewCustomer.lastBarberName ? ` with ${viewCustomer.lastBarberName}` : ''}
              </strong>
            </div>
          </div>
        </ConfirmDialog>
      )}

      {isCreateDialogOpen && (
        <ConfirmDialog
          title="Create customer"
          description="Create a customer login and add them to the live customer roster."
          cancelLabel="Cancel"
          confirmLabel="Create customer"
          busy={actionBusy}
          confirmDisabled={
            !createForm.fullname.trim() ||
            !createForm.email.trim() ||
            createForm.password.length < 8
          }
          onCancel={() => setIsCreateDialogOpen(false)}
          onConfirm={confirmCreateCustomer}
        >
          <div className="admin-customer-edit-form">
            <label>
              <span>Full name</span>
              <input
                autoComplete="name"
                type="text"
                value={createForm.fullname}
                onChange={(event) => updateCreateForm('fullname', event.target.value)}
              />
            </label>
            <label>
              <span>Email</span>
              <input
                autoComplete="email"
                type="email"
                value={createForm.email}
                onChange={(event) => updateCreateForm('email', event.target.value)}
              />
            </label>
            <label>
              <span>Phone</span>
              <input
                autoComplete="tel"
                type="tel"
                value={createForm.phone}
                onChange={(event) => updateCreateForm('phone', event.target.value)}
              />
            </label>
            <label>
              <span>Temporary password</span>
              <input
                autoComplete="new-password"
                minLength="8"
                type="password"
                value={createForm.password}
                onChange={(event) => updateCreateForm('password', event.target.value)}
              />
            </label>
            <label>
              <span>Tier</span>
              <select
                value={createForm.tier}
                onChange={(event) => updateCreateForm('tier', event.target.value)}
              >
                <option value="silver">Silver / Standard</option>
                <option value="gold">Gold</option>
                <option value="platinum">Platinum</option>
              </select>
            </label>
            <label>
              <span>Loyalty points</span>
              <input
                min="0"
                type="number"
                value={createForm.loyaltyPoints}
                onChange={(event) => updateCreateForm('loyaltyPoints', event.target.value)}
              />
            </label>
          </div>
        </ConfirmDialog>
      )}

      {editingCustomer && (
        <ConfirmDialog
          title="Edit customer"
          description={`Update ${editingCustomer.customerCode}. Changes save directly to Supabase.`}
          cancelLabel="Cancel"
          confirmLabel="Save changes"
          busy={actionBusy}
          confirmDisabled={!editForm.fullname.trim() || !editForm.email.trim()}
          onCancel={() => setEditingCustomer(null)}
          onConfirm={confirmUpdateCustomer}
        >
          <div className="admin-customer-edit-form">
            <label>
              <span>Full name</span>
              <input
                type="text"
                value={editForm.fullname}
                onChange={(event) => updateEditForm('fullname', event.target.value)}
              />
            </label>
            <label>
              <span>Email</span>
              <input
                type="email"
                value={editForm.email}
                onChange={(event) => updateEditForm('email', event.target.value)}
              />
            </label>
            <label>
              <span>Phone</span>
              <input
                type="tel"
                value={editForm.phone}
                onChange={(event) => updateEditForm('phone', event.target.value)}
              />
            </label>
            <label>
              <span>Tier</span>
              <select
                value={editForm.tier}
                onChange={(event) => updateEditForm('tier', event.target.value)}
              >
                <option value="silver">Silver / Standard</option>
                <option value="gold">Gold</option>
                <option value="platinum">Platinum</option>
              </select>
            </label>
            <label>
              <span>Loyalty points</span>
              <input
                min="0"
                type="number"
                value={editForm.loyaltyPoints}
                onChange={(event) => updateEditForm('loyaltyPoints', event.target.value)}
              />
            </label>
          </div>
        </ConfirmDialog>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete customer?"
          description={`This will permanently remove ${pendingDelete.name} and associated customer records. This cannot be undone.`}
          cancelLabel="Cancel"
          confirmLabel="Delete customer"
          busy={actionBusy}
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmDelete}
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
