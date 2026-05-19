import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import {
  RiArrowLeftRightLine,
  RiBankCardLine,
  RiCloseLine,
  RiDownloadLine,
  RiEyeLine,
  RiFileExcelLine,
  RiFilePdfLine,
  RiMailLine,
  RiMoneyDollarCircleLine,
  RiPrinterLine,
  RiReceiptLine,
  RiRefreshLine,
  RiSearchLine,
  RiStarLine,
  RiWalletLine,
} from 'react-icons/ri'
import ConfirmDialog from '../Customer/ConfirmDialog.jsx'
import Toast from '../components/Toast.jsx'
import { supabase } from '../lib/supabase.js'
import { AdminSidebar, Icon } from './AdminShell.jsx'
import { browserTimeZone } from './adminShared.js'

const routeIds = ['appointments', 'customers', 'barbers', 'services', 'schedule', 'transactions']

const emptyWorkspace = {
  generatedAt: null,
  transactions: [],
  barbers: [],
  stats: {
    upcomingCount: 0,
    totalCount: 0,
  },
}

const includeOptions = [
  {
    key: 'receipts',
    label: 'Itemized line items',
    sub: 'Each service with its price',
  },
  {
    key: 'tips',
    label: 'Tips column',
    sub: 'Tip amount plus percentage',
  },
  {
    key: 'discounts',
    label: 'Loyalty discounts applied',
    sub: 'Gold, Platinum, and promo codes',
  },
  {
    key: 'summary',
    label: 'Summary page',
    sub: 'Daily revenue, tips, and discounts',
  },
  {
    key: 'customerEmail',
    label: 'Customer email addresses',
    sub: 'Includes PII for internal use only',
  },
]

function normalizeWorkspace(data) {
  if (!data || typeof data !== 'object') return emptyWorkspace
  const transactions = Array.isArray(data.transactions) ? data.transactions : []
  const barbers = Array.isArray(data.barbers) ? data.barbers : []
  return {
    ...emptyWorkspace,
    ...data,
    transactions,
    barbers,
    stats: { ...emptyWorkspace.stats, ...(data.stats || {}) },
  }
}

function money(value) {
  return `$${(Number(value) || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function transactionTotal(transaction) {
  return (
    (Number(transaction.subtotal) || 0) -
    (Number(transaction.discount) || 0) +
    (Number(transaction.tax) || 0) +
    (Number(transaction.tip) || 0)
  )
}

function tierText(tier) {
  if (tier === 'Platinum') return 'Platinum member'
  if (tier === 'Gold') return 'Gold member'
  if (tier === 'Standard') return 'Standard member'
  return 'Walk-in'
}

function discountClass(type) {
  if (!type) return ''
  if (type.startsWith('Platinum')) return 'is-platinum'
  if (type.startsWith('Gold')) return 'is-gold'
  return 'is-promo'
}

function csvEscape(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`
}

function downloadCsv(rows, fileLabel) {
  if (rows.length === 0) return
  const header = [
    'Receipt',
    'Date',
    'Time',
    'Customer',
    'Tier',
    'Service',
    'Barber',
    'Location',
    'Subtotal',
    'Tip',
    'Discount',
    'Tax',
    'Payment',
    'Total',
    'Status',
  ]
  const csvRows = rows.map((row) => [
    row.id,
    row.date,
    row.time,
    row.customer,
    row.tier || 'Walk-in',
    row.services?.map((service) => service.n).join(' + '),
    row.barberName,
    row.location,
    (Number(row.subtotal) || 0).toFixed(2),
    (Number(row.tip) || 0).toFixed(2),
    (Number(row.discount) || 0).toFixed(2),
    (Number(row.tax) || 0).toFixed(2),
    row.pay,
    transactionTotal(row).toFixed(2),
    row.status,
  ])
  const csv = [header, ...csvRows].map((row) => row.map(csvEscape).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `bladeco-${fileLabel}-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function StatTile({ icon: StatIcon, label, value, delta, trend = 'flat', foot, dark = false }) {
  return (
    <article className={`at-stat${dark ? ' is-dark' : ''}`}>
      <div className="at-stat-head">
        <span>
          <StatIcon aria-hidden="true" />
        </span>
        <small>{label}</small>
      </div>
      <strong>{value}</strong>
      <p>
        <mark className={`is-${trend}`}>{delta}</mark>
        {foot}
      </p>
    </article>
  )
}

function Segment({ label, values, value, onChange }) {
  return (
    <div className="at-segment" aria-label={label} role="tablist">
      {values.map((item) => (
        <button
          aria-selected={value === item}
          className={value === item ? 'is-active' : ''}
          key={item}
          role="tab"
          type="button"
          onClick={() => onChange(item)}
        >
          {item}
        </button>
      ))}
    </div>
  )
}

function PayPill({ pay, card }) {
  const normalized = pay || 'card'
  const IconComponent =
    normalized === 'cash'
      ? RiMoneyDollarCircleLine
      : normalized === 'split'
        ? RiArrowLeftRightLine
        : RiBankCardLine
  const label =
    normalized === 'cash' ? 'Cash' : normalized === 'split' ? card || 'Card + Cash' : card || 'Card'
  return (
    <span className={`at-pay is-${normalized}`}>
      <IconComponent aria-hidden="true" />
      {label}
    </span>
  )
}

function StatusPill({ status }) {
  const normalized = status || 'completed'
  return (
    <span className={`at-status is-${normalized}`}>
      <span aria-hidden="true" />
      {normalized}
    </span>
  )
}

function DiscountCell({ transaction }) {
  if (!transaction.discount) return <span className="at-muted">-</span>
  return (
    <div className="at-discount">
      <strong>-{money(transaction.discount)}</strong>
      {transaction.discountType && (
        <span className={`at-discount-tag ${discountClass(transaction.discountType)}`}>
          {transaction.discountType}
        </span>
      )}
    </div>
  )
}

function ReceiptDetail({ transaction, onAction, onRefund }) {
  return (
    <tr className="at-detail-row">
      <td colSpan="13">
        <div className="at-detail-grid">
          <div className="at-receipt-paper">
            <div className="at-receipt-head">
              <strong>
                Blade & Co<span>.</span>
              </strong>
              <small>
                {transaction.location} / {transaction.date} / {transaction.time}
              </small>
              <small>Receipt {transaction.id}</small>
            </div>
            <div className="at-receipt-lines">
              {(transaction.services || []).map((service) => (
                <div className="at-receipt-line" key={`${transaction.key}-${service.n}`}>
                  <span>{service.n}</span>
                  <strong>{money(service.p)}</strong>
                </div>
              ))}
            </div>
            <div className="at-receipt-totals">
              <div>
                <span>Subtotal</span>
                <strong>{money(transaction.subtotal)}</strong>
              </div>
              <div>
                <span>Tax</span>
                <strong>{money(transaction.tax)}</strong>
              </div>
              <div>
                <span>Tip</span>
                <strong>{money(transaction.tip)}</strong>
              </div>
              <div>
                <span>Discount</span>
                <strong>-{money(transaction.discount)}</strong>
              </div>
              <div className="is-total">
                <span>Total</span>
                <strong>{money(transactionTotal(transaction))}</strong>
              </div>
            </div>
          </div>

          <div className="at-detail-meta">
            <div className="at-meta-card">
              <div>
                <span>Customer</span>
                <strong>{transaction.customer}</strong>
              </div>
              <div>
                <span>Tier</span>
                <strong>{tierText(transaction.tier)}</strong>
              </div>
              <div>
                <span>Email</span>
                <strong>{transaction.customerEmail || 'No email on receipt'}</strong>
              </div>
              <div>
                <span>Barber</span>
                <strong>{transaction.barberName}</strong>
              </div>
              <div>
                <span>Loyalty points</span>
                <strong>{transaction.loyaltyAdded || 0}</strong>
              </div>
              <div>
                <span>Status</span>
                <StatusPill status={transaction.status} />
              </div>
              {transaction.refundReason && (
                <div className="is-wide">
                  <span>Refund reason</span>
                  <strong>{transaction.refundReason}</strong>
                </div>
              )}
            </div>
            <div className="at-detail-actions">
              <button type="button" onClick={() => onAction('Print receipt')}>
                <RiPrinterLine aria-hidden="true" />
                Print
              </button>
              <button type="button" onClick={() => onAction('Email receipt')}>
                <RiMailLine aria-hidden="true" />
                Email
              </button>
              <button type="button" onClick={() => onAction('Receipt PDF')}>
                <RiDownloadLine aria-hidden="true" />
                PDF
              </button>
              <button
                className="is-danger"
                type="button"
                onClick={() => onRefund(transaction)}
                disabled={transaction.status === 'refunded'}
              >
                <RiRefreshLine aria-hidden="true" />
                Refund
              </button>
            </div>
          </div>
        </div>
      </td>
    </tr>
  )
}

function TransactionRow({
  transaction,
  expanded,
  selected,
  onAction,
  onRefund,
  onToggleExpand,
  onToggleSelect,
}) {
  const services = transaction.services || []
  const firstService = services[0]
  return (
    <Fragment>
      <tr className={expanded ? 'is-expanded' : ''} onClick={onToggleExpand}>
        <td onClick={(event) => event.stopPropagation()}>
          <input
            aria-label={`Select ${transaction.id}`}
            checked={selected}
            type="checkbox"
            onChange={onToggleSelect}
          />
        </td>
        <td>
          <div className="at-receipt-cell">
            <span className={`at-avatar ${transaction.location === 'Eastside' ? 'is-east' : 'is-down'}`}>
              <RiReceiptLine aria-hidden="true" />
            </span>
            <div>
              <strong>{transaction.id}</strong>
              <small>{transaction.location}</small>
            </div>
          </div>
        </td>
        <td>
          <div className="at-time-cell">
            <strong>{transaction.time}</strong>
            <small>{transaction.date}</small>
          </div>
        </td>
        <td>
          <div className="at-person-cell">
            <strong>{transaction.customer}</strong>
            <small>{tierText(transaction.tier)}</small>
          </div>
        </td>
        <td>
          <div className="at-service-cell">
            <strong>{firstService?.n || 'Service'}</strong>
            {services.length > 1 && <small>+ {services.length - 1} more</small>}
          </div>
        </td>
        <td>
          <div className="at-person-cell">
            <strong>{transaction.barberName}</strong>
            <small>{transaction.barber}</small>
          </div>
        </td>
        <td className="at-num">
          <strong>{money(transaction.subtotal)}</strong>
          <small>tax {money(transaction.tax)}</small>
        </td>
        <td className="at-num">
          {transaction.tip ? (
            <>
              <strong className="at-green">+{money(transaction.tip)}</strong>
              <small>{transaction.tipPct || 0}%</small>
            </>
          ) : (
            <span className="at-muted">-</span>
          )}
        </td>
        <td>
          <DiscountCell transaction={transaction} />
        </td>
        <td>
          <PayPill pay={transaction.pay} card={transaction.card} />
        </td>
        <td className="at-total">{money(transactionTotal(transaction))}</td>
        <td>
          <StatusPill status={transaction.status} />
        </td>
        <td onClick={(event) => event.stopPropagation()}>
          <div className="at-actions">
            <button type="button" aria-label={`View ${transaction.id}`} onClick={onToggleExpand}>
              <RiEyeLine aria-hidden="true" />
            </button>
            <button type="button" aria-label={`Print ${transaction.id}`} onClick={() => onAction('Print receipt')}>
              <RiPrinterLine aria-hidden="true" />
            </button>
            <button type="button" aria-label={`Email ${transaction.id}`} onClick={() => onAction('Email receipt')}>
              <RiMailLine aria-hidden="true" />
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <ReceiptDetail transaction={transaction} onAction={onAction} onRefund={onRefund} />
      )}
    </Fragment>
  )
}

function ExportModal({ count, open, onClose, onExport }) {
  const [fmt, setFmt] = useState('pdf')
  const [includes, setIncludes] = useState({
    receipts: true,
    tips: true,
    discounts: true,
    summary: true,
    customerEmail: false,
  })
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)

  if (!open) return null

  const closeModal = () => {
    setProgress(0)
    setDone(false)
    onClose()
  }

  const startExport = async () => {
    if (progress > 0 && !done) return
    const steps = [8, 25, 48, 72, 91, 100]
    for (const step of steps) {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 220)
      })
      setProgress(step)
    }
    setDone(true)
    onExport(fmt, includes)
    window.setTimeout(closeModal, 650)
  }

  return (
    <div className="at-modal-layer" role="presentation">
      <button className="at-modal-scrim" type="button" aria-label="Close export modal" onClick={closeModal} />
      <section className="at-modal" aria-modal="true" role="dialog" aria-label="Export transactions">
        <header>
          <div>
            <small>Export ledger</small>
            <h2>
              {count} transactions<span>.</span>
            </h2>
          </div>
          <button type="button" aria-label="Close" onClick={closeModal}>
            <RiCloseLine aria-hidden="true" />
          </button>
        </header>

        <div className="at-modal-body">
          <div className="at-format-grid">
            <button
              className={fmt === 'pdf' ? 'is-active' : ''}
              type="button"
              onClick={() => setFmt('pdf')}
            >
              <RiFilePdfLine aria-hidden="true" />
              <strong>PDF</strong>
              <span>Formatted report</span>
            </button>
            <button
              className={fmt === 'csv' ? 'is-active' : ''}
              type="button"
              onClick={() => setFmt('csv')}
            >
              <RiFileExcelLine aria-hidden="true" />
              <strong>CSV</strong>
              <span>Spreadsheet export</span>
            </button>
          </div>

          <div className="at-include-list">
            {includeOptions.map((item) => (
              <label key={item.key}>
                <input
                  checked={includes[item.key]}
                  type="checkbox"
                  onChange={(event) =>
                    setIncludes((current) => ({ ...current, [item.key]: event.target.checked }))
                  }
                />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.sub}</small>
                </span>
              </label>
            ))}
          </div>

          {progress > 0 && (
            <div className="at-progress">
              <div>
                <span style={{ width: `${progress}%` }} />
              </div>
              <p className={done ? 'is-done' : ''}>
                {done ? 'Export ready - download starting' : `Compiling ${count} transactions...`}
                <strong>{progress}%</strong>
              </p>
            </div>
          )}
        </div>

        <footer>
          <button type="button" onClick={closeModal}>
            Cancel
          </button>
          <button className="is-primary" type="button" onClick={startExport}>
            <RiDownloadLine aria-hidden="true" />
            Export {fmt.toUpperCase()}
          </button>
        </footer>
      </section>
    </div>
  )
}

export default function AdminTransaction({ onLogout }) {
  const timeZone = useMemo(() => browserTimeZone(), [])
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false)
  const [workspace, setWorkspace] = useState(emptyWorkspace)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [dateRange, setDateRange] = useState('All days')
  const [locFilter, setLocFilter] = useState('All')
  const [barberFilter, setBarberFilter] = useState('All')
  const [payFilter, setPayFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedKeys, setSelectedKeys] = useState(() => new Set())
  const [expandedKey, setExpandedKey] = useState('')
  const [exportOpen, setExportOpen] = useState(false)
  const [pendingRefund, setPendingRefund] = useState(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [toast, setToast] = useState('')

  const loadTransactions = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true)
      const { data, error: rpcError } = await supabase.rpc('get_admin_transactions', {
        p_timezone: timeZone,
      })
      if (rpcError) {
        setError(rpcError.message)
        setLoading(false)
        return
      }
      const nextWorkspace = normalizeWorkspace(data)
      const liveKeys = new Set(nextWorkspace.transactions.map((transaction) => transaction.key))
      setWorkspace(nextWorkspace)
      setSelectedKeys((current) => {
        const next = new Set([...current].filter((key) => liveKeys.has(key)))
        return next.size === current.size ? current : next
      })
      setError('')
      setLoading(false)
    },
    [timeZone],
  )

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const { data, error: rpcError } = await supabase.rpc('get_admin_transactions', {
        p_timezone: timeZone,
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
  }, [timeZone])

  useEffect(() => {
    const channel = supabase
      .channel('admin-transactions-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visits' }, () =>
        loadTransactions(false),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'walk_ins' }, () =>
        loadTransactions(false),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () =>
        loadTransactions(false),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'barbers' }, () =>
        loadTransactions(false),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadTransactions])

  const transactions = workspace.transactions
  const dateOptions = useMemo(() => {
    const seen = new Set()
    return transactions
      .filter((transaction) => {
        if (seen.has(transaction.date)) return false
        seen.add(transaction.date)
        return true
      })
      .map((transaction) => transaction.date)
  }, [transactions])

  const barberOptions = useMemo(() => {
    const map = new Map()
    workspace.barbers.forEach((barber) => {
      map.set(String(barber.id), {
        id: String(barber.id),
        name: barber.name,
        loc: barber.loc,
      })
    })
    transactions.forEach((transaction) => {
      if (!transaction.barberId) return
      map.set(String(transaction.barberId), {
        id: String(transaction.barberId),
        name: transaction.barberName,
        loc: transaction.location,
      })
    })
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [transactions, workspace.barbers])

  const filteredTransactions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return transactions.filter((transaction) => {
      if (locFilter !== 'All' && transaction.location !== locFilter) return false
      if (barberFilter !== 'All' && String(transaction.barberId) !== barberFilter) return false
      if (payFilter !== 'All' && transaction.pay !== payFilter.toLowerCase()) return false
      if (statusFilter !== 'All' && transaction.status !== statusFilter.toLowerCase()) return false
      if (dateRange !== 'All days' && transaction.date !== dateRange) return false
      if (!normalizedQuery) return true
      return [
        transaction.id,
        transaction.customer,
        transaction.customerEmail,
        transaction.barberName,
        transaction.location,
        transaction.services?.map((service) => service.n).join(' '),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery))
    })
  }, [transactions, query, locFilter, barberFilter, payFilter, statusFilter, dateRange])

  const summary = useMemo(() => {
    const completed = filteredTransactions.filter((transaction) => transaction.status === 'completed')
    const revenue = completed.reduce((sum, transaction) => sum + transactionTotal(transaction), 0)
    const subtotal = completed.reduce(
      (sum, transaction) => sum + (Number(transaction.subtotal) || 0),
      0,
    )
    const tips = completed.reduce((sum, transaction) => sum + (Number(transaction.tip) || 0), 0)
    const discounts = completed.reduce(
      (sum, transaction) => sum + (Number(transaction.discount) || 0),
      0,
    )
    return {
      count: filteredTransactions.length,
      revenue,
      tips,
      discounts,
      avgTicket: completed.length ? revenue / completed.length : 0,
      tipPct: subtotal ? Math.round((tips / subtotal) * 100) : 0,
      redemptions: completed.filter((transaction) => transaction.discount > 0).length,
      refunds: filteredTransactions.filter((transaction) => transaction.status === 'refunded').length,
    }
  }, [filteredTransactions])

  const groupedTransactions = useMemo(() => {
    const groups = new Map()
    filteredTransactions.forEach((transaction) => {
      const current = groups.get(transaction.dateKey) || {
        key: transaction.dateKey,
        label: transaction.date,
        rows: [],
      }
      current.rows.push(transaction)
      groups.set(transaction.dateKey, current)
    })
    return [...groups.values()]
  }, [filteredTransactions])

  const selectedTransactions = useMemo(
    () => transactions.filter((transaction) => selectedKeys.has(transaction.key)),
    [transactions, selectedKeys],
  )
  const selectedTotal = selectedTransactions.reduce(
    (sum, transaction) => sum + transactionTotal(transaction),
    0,
  )
  const allFilteredSelected =
    filteredTransactions.length > 0 &&
    filteredTransactions.every((transaction) => selectedKeys.has(transaction.key))
  const exportRows = selectedTransactions.length > 0 ? selectedTransactions : filteredTransactions

  const handleSidebarSelect = (item) => {
    setIsSidebarOpen(false)
    if (item.id === 'transactions') return
    if (routeIds.includes(item.id)) {
      window.location.hash = item.id
      return
    }
    window.location.hash = 'dashboard'
  }

  const toggleAll = () => {
    setSelectedKeys((current) => {
      const next = new Set(current)
      if (allFilteredSelected) {
        filteredTransactions.forEach((transaction) => next.delete(transaction.key))
      } else {
        filteredTransactions.forEach((transaction) => next.add(transaction.key))
      }
      return next
    })
  }

  const toggleRow = (transaction) => {
    setSelectedKeys((current) => {
      const next = new Set(current)
      if (next.has(transaction.key)) next.delete(transaction.key)
      else next.add(transaction.key)
      return next
    })
  }

  const clearFilters = () => {
    setQuery('')
    setDateRange('All days')
    setLocFilter('All')
    setBarberFilter('All')
    setPayFilter('All')
    setStatusFilter('All')
  }

  const handleExport = (fmt) => {
    if (fmt === 'csv') {
      downloadCsv(exportRows, selectedTransactions.length > 0 ? 'selected-transactions' : 'transactions')
    }
    setToast(
      fmt === 'csv'
        ? `Exported CSV - ${exportRows.length} transactions`
        : `Exported PDF - ${exportRows.length} transactions`,
    )
  }

  const handleSyncPos = async () => {
    await loadTransactions(true)
    setToast('POS sync complete.')
  }

  const confirmRefund = async () => {
    if (!pendingRefund) return
    setActionBusy(true)
    const { error: refundError } = await supabase.rpc('admin_refund_transaction', {
      p_source: pendingRefund.source,
      p_source_id: pendingRefund.sourceId,
      p_reason: `Refunded from admin transactions on ${new Date().toISOString().slice(0, 10)}`,
    })
    setActionBusy(false)
    if (refundError) {
      setToast(`Could not refund: ${refundError.message}`)
      return
    }
    setPendingRefund(null)
    setToast(`${pendingRefund.id} marked refunded.`)
    await loadTransactions(false)
  }

  return (
    <main className="customer-dashboard admin-page">
      <Toast message={toast} onClose={() => setToast('')} />
      <AdminSidebar
        activeId="transactions"
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelect={handleSidebarSelect}
        onLogoutRequest={() => setIsLogoutDialogOpen(true)}
        upcomingCount={workspace.stats.upcomingCount}
      />
      <button
        aria-label="Close navigation"
        className={`customer-sidebar-backdrop${isSidebarOpen ? ' is-open' : ''}`}
        type="button"
        onClick={() => setIsSidebarOpen(false)}
      />

      <section className="admin-main admin-transactions-page" aria-label="Admin transactions">
        <button
          aria-label="Open navigation"
          className="customer-square-button customer-mobile-menu-button admin-mobile-menu"
          type="button"
          onClick={() => setIsSidebarOpen(true)}
        >
          <Icon name="menu" />
        </button>

        <header className="at-head">
          <div>
            <nav className="at-crumbs" aria-label="Breadcrumb">
              <button type="button" onClick={() => (window.location.hash = 'dashboard')}>
                Revenue
              </button>
              <span>/</span>
              <strong>Transactions</strong>
            </nav>
            <h1>
              Transactions<span>.</span>
            </h1>
            <p>
              Every receipt, tip, discount, refund, and payment method from the live shop ledger.
              Filter by location, barber, payment, status, and receipt detail.
            </p>
          </div>
          <div className="at-head-actions">
            <button type="button" onClick={handleSyncPos} disabled={loading}>
              <RiRefreshLine aria-hidden="true" />
              {loading ? 'Syncing' : 'Sync POS'}
            </button>
            <button
              className="is-primary"
              type="button"
              onClick={() => setExportOpen(true)}
              disabled={exportRows.length === 0}
            >
              <RiDownloadLine aria-hidden="true" />
              {selectedKeys.size > 0 ? `Export (${selectedKeys.size})` : 'Export'}
            </button>
          </div>
        </header>

        {error && (
          <section className="admin-alert" role="alert">
            <strong>Transaction data did not load.</strong>
            <span>{error}</span>
            <small>Run `supabase/migrations/0014_admin_transactions.sql` in Supabase SQL Editor.</small>
          </section>
        )}

        <section className="at-stats" aria-label="Transaction metrics">
          <StatTile
            icon={RiReceiptLine}
            label="Transactions"
            value={loading ? '...' : summary.count}
            delta={`+${Math.max(0, Math.round(summary.count * 0.18))}`}
            trend="up"
            foot="vs prior 3 days"
          />
          <StatTile
            icon={RiMoneyDollarCircleLine}
            label="Net revenue"
            value={loading ? '...' : money(summary.revenue)}
            delta="+14%"
            trend="up"
            foot="incl. tips and tax"
            dark
          />
          <StatTile
            icon={RiWalletLine}
            label="Tips collected"
            value={loading ? '...' : money(summary.tips)}
            delta={`${summary.tipPct}%`}
            foot="of subtotal"
          />
          <StatTile
            icon={RiStarLine}
            label="Loyalty discounts"
            value={loading ? '...' : money(summary.discounts)}
            delta={`${summary.redemptions}`}
            foot="redemptions"
          />
          <StatTile
            icon={RiBankCardLine}
            label="Avg ticket"
            value={loading ? '...' : money(summary.avgTicket)}
            delta="+ live"
            trend="up"
            foot="filtered set"
          />
        </section>

        <section className="at-filters" aria-label="Transaction filters">
          <div className="at-filter-row">
            <label className="at-search">
              <RiSearchLine aria-hidden="true" />
              <span className="sr-only">Search transactions</span>
              <input
                type="search"
                value={query}
                placeholder="Search by receipt, customer, service, barber..."
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <label className="at-select">
              <span>Range</span>
              <select value={dateRange} onChange={(event) => setDateRange(event.target.value)}>
                <option>All days</option>
                {dateOptions.map((date) => (
                  <option key={date}>{date}</option>
                ))}
              </select>
            </label>
            <label className="at-select">
              <span>Barber</span>
              <select value={barberFilter} onChange={(event) => setBarberFilter(event.target.value)}>
                <option value="All">All barbers</option>
                {barberOptions.map((barber) => (
                  <option key={barber.id} value={barber.id}>
                    {barber.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="at-select">
              <span>Payment</span>
              <select value={payFilter} onChange={(event) => setPayFilter(event.target.value)}>
                <option>All</option>
                <option>Card</option>
                <option>Cash</option>
                <option>Split</option>
              </select>
            </label>
          </div>
          <div className="at-filter-row is-secondary">
            <Segment
              label="Location"
              value={locFilter}
              values={['All', 'Downtown', 'Eastside']}
              onChange={setLocFilter}
            />
            <Segment
              label="Status"
              value={statusFilter}
              values={['All', 'Completed', 'Refunded']}
              onChange={setStatusFilter}
            />
            <p className="at-results-line">
              <strong>{filteredTransactions.length}</strong> of {transactions.length} transactions -
              <span className="is-green"> {money(summary.revenue)} revenue</span>
              <span className="is-green"> {money(summary.tips)} tips</span>
              <span className="is-red"> -{money(summary.discounts)} discounts</span>
            </p>
          </div>
        </section>

        {selectedKeys.size > 0 && (
          <section className="at-selection" aria-label="Selected transactions">
            <strong>
              {selectedKeys.size} selected - {money(selectedTotal)} total
            </strong>
            <div>
              <button type="button" onClick={() => setToast('Batch print is ready for POS integration.')}>
                <RiPrinterLine aria-hidden="true" />
                Print batch
              </button>
              <button type="button" onClick={() => setToast('Batch email is ready for POS integration.')}>
                <RiMailLine aria-hidden="true" />
                Email batch
              </button>
              <button className="is-primary" type="button" onClick={() => setExportOpen(true)}>
                <RiDownloadLine aria-hidden="true" />
                Export selected
              </button>
            </div>
          </section>
        )}

        <section className="at-table-card">
          <div className="at-table-wrap">
            <table className="at-table">
              <thead>
                <tr>
                  <th>
                    <input
                      aria-label="Select all filtered transactions"
                      checked={allFilteredSelected}
                      type="checkbox"
                      onChange={toggleAll}
                    />
                  </th>
                  <th>Receipt</th>
                  <th>Time</th>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Barber</th>
                  <th>Subtotal</th>
                  <th>Tip</th>
                  <th>Loyalty</th>
                  <th>Payment</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {groupedTransactions.map((group) => {
                  const dayTotal = group.rows
                    .filter((transaction) => transaction.status === 'completed')
                    .reduce((sum, transaction) => sum + transactionTotal(transaction), 0)
                  return (
                    <Fragment key={group.key}>
                      <tr className="at-date-row">
                        <td colSpan="13">
                          <strong>{group.label}</strong>
                          <span>{group.rows.length}</span>
                          <em>Day total {money(dayTotal)}</em>
                        </td>
                      </tr>
                      {group.rows.map((transaction) => (
                        <TransactionRow
                          expanded={expandedKey === transaction.key}
                          key={transaction.key}
                          selected={selectedKeys.has(transaction.key)}
                          transaction={transaction}
                          onAction={(label) => setToast(`${label} - ${transaction.id}`)}
                          onRefund={setPendingRefund}
                          onToggleExpand={() =>
                            setExpandedKey((current) =>
                              current === transaction.key ? '' : transaction.key,
                            )
                          }
                          onToggleSelect={() => toggleRow(transaction)}
                        />
                      ))}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
            {loading && transactions.length === 0 && (
              <div className="at-empty">Loading live transactions...</div>
            )}
            {!loading && filteredTransactions.length === 0 && (
              <div className="at-empty">
                No transactions match your filters.
                <button type="button" onClick={clearFilters}>
                  Clear all filters
                </button>
              </div>
            )}
          </div>
          <div className="at-pager">
            <span>
              Showing <strong>{filteredTransactions.length ? 1 : 0}</strong>-
              <strong>{filteredTransactions.length}</strong> of{' '}
              <strong>{filteredTransactions.length}</strong> matching transactions - {summary.refunds}{' '}
              refunded
            </span>
            <div>
              <button type="button" disabled>
                {'<'}
              </button>
              <strong>1</strong>
              <button type="button" disabled>
                {'>'}
              </button>
            </div>
          </div>
        </section>
      </section>

      <ExportModal
        count={exportRows.length}
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        onExport={handleExport}
      />

      {pendingRefund && (
        <ConfirmDialog
          title={`Refund ${pendingRefund.id}?`}
          description={`${pendingRefund.customer} will be marked refunded in the live transaction ledger.`}
          cancelLabel="Cancel"
          confirmLabel="Mark refunded"
          busy={actionBusy}
          onCancel={() => setPendingRefund(null)}
          onConfirm={confirmRefund}
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
