import { useEffect, useMemo, useState } from 'react'
import ConfirmDialog from '../Customer/ConfirmDialog.jsx'
import Toast from '../components/Toast.jsx'
import { supabase } from '../lib/supabase.js'
import { AdminSidebar, Icon } from './AdminShell.jsx'
import { browserTimeZone } from './adminShared.js'

const emptyAppointmentWorkspace = {
  bookings: [],
  stats: {
    upcomingCount: 0,
  },
}

const bookingFilters = [
  { id: 'all', label: 'All' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'pending', label: 'Pending' },
  { id: 'cancelled', label: 'Cancelled' },
]

function normalizeAppointmentWorkspace(data) {
  if (!data || typeof data !== 'object') return emptyAppointmentWorkspace
  const bookings = Array.isArray(data.bookings) ? data.bookings : []
  return {
    ...emptyAppointmentWorkspace,
    ...data,
    bookings,
    stats: {
      ...emptyAppointmentWorkspace.stats,
      ...(data.stats || {}),
      upcomingCount: bookings.filter(
        (booking) =>
          booking.status === 'scheduled' && new Date(booking.scheduledAt) >= new Date(),
      ).length,
    },
  }
}

function formatMoney(cents) {
  return `$${((Number(cents) || 0) / 100).toFixed(2)}`
}

function formatDateShort(iso) {
  if (!iso) return '-'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function formatTime(iso) {
  if (!iso) return '-'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function toDateTimeLocalValue(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hour}:${minute}`
}

function toIsoFromLocalValue(value) {
  const date = new Date(value)
  if (!value || Number.isNaN(date.getTime())) return ''
  return date.toISOString()
}

function bookingStatusLabel(booking) {
  if (booking.status === 'pending') return 'Pending'
  if (booking.status === 'cancelled') return 'Cancelled'
  if (booking.status === 'scheduled') {
    return new Date(booking.scheduledAt) >= new Date() ? 'Upcoming' : 'Scheduled'
  }
  return booking.status || 'Booking'
}

function EmptyBlock({ children }) {
  return <div className="admin-empty">{children}</div>
}

function AdminStatusChip({ booking }) {
  const status = booking.status || 'scheduled'
  return (
    <span className={`admin-chip admin-status-chip is-${status}`}>
      {bookingStatusLabel(booking)}
    </span>
  )
}

function AdminBookingCard({
  booking,
  busy,
  isRescheduling,
  rescheduleDraft,
  onAction,
  onStartReschedule,
  onCancelReschedule,
  onRescheduleDraftChange,
  onSaveReschedule,
}) {
  const canConfirm = booking.status === 'pending'
  const canCancel = booking.status !== 'cancelled'

  return (
    <article className="admin-booking-card">
      <div className="admin-booking-time">
        <strong>{formatTime(booking.scheduledAt)}</strong>
        <span>{formatDateShort(booking.scheduledAt)}</span>
      </div>
      <div className="admin-booking-body">
        <div className="admin-booking-title">
          <div>
            <strong>{booking.service || 'Appointment'}</strong>
            <small>
              {booking.customerName || booking.customer_name || 'Guest customer'} with{' '}
              {booking.barberName || 'Unassigned'}
            </small>
          </div>
          <AdminStatusChip booking={booking} />
        </div>
        <p>
          {booking.durationMinutes || 45} min · {formatMoney(booking.priceCents)} ·{' '}
          {booking.location || 'Blade & Co.'}
        </p>

        {isRescheduling && (
          <div className="admin-reschedule-row">
            <label>
              <span>New time</span>
              <input
                type="datetime-local"
                value={rescheduleDraft?.scheduledAt || ''}
                onChange={(event) =>
                  onRescheduleDraftChange({
                    ...rescheduleDraft,
                    scheduledAt: event.target.value,
                  })
                }
              />
            </label>
            <label>
              <span>Duration</span>
              <input
                min="5"
                step="5"
                type="number"
                value={rescheduleDraft?.durationMinutes || 45}
                onChange={(event) =>
                  onRescheduleDraftChange({
                    ...rescheduleDraft,
                    durationMinutes: event.target.value,
                  })
                }
              />
            </label>
            <button type="button" onClick={onSaveReschedule} disabled={busy}>
              Save time
            </button>
            <button type="button" onClick={onCancelReschedule} disabled={busy}>
              Close
            </button>
          </div>
        )}
      </div>
      <div className="admin-booking-actions">
        {canConfirm && (
          <button type="button" onClick={() => onAction('confirm', booking)} disabled={busy}>
            Confirm
          </button>
        )}
        <button type="button" onClick={() => onStartReschedule(booking)} disabled={busy}>
          Reschedule
        </button>
        {canCancel && (
          <button
            className="is-danger"
            type="button"
            onClick={() => onAction('cancel', booking)}
            disabled={busy}
          >
            Cancel
          </button>
        )}
      </div>
    </article>
  )
}

export default function AdminAppointment({ session, onLogout }) {
  const email = session?.user?.email || 'admin'
  const timeZone = useMemo(() => browserTimeZone(), [])
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false)
  const [appointmentWorkspace, setAppointmentWorkspace] = useState(emptyAppointmentWorkspace)
  const [appointmentsLoading, setAppointmentsLoading] = useState(true)
  const [appointmentsError, setAppointmentsError] = useState('')
  const [bookingFilter, setBookingFilter] = useState('all')
  const [pendingAppointmentAction, setPendingAppointmentAction] = useState(null)
  const [rescheduleDraft, setRescheduleDraft] = useState(null)
  const [appointmentActionBusy, setAppointmentActionBusy] = useState(false)
  const [adminToast, setAdminToast] = useState('')

  const loadAppointmentWorkspace = async (showLoading = false) => {
    if (showLoading) setAppointmentsLoading(true)
    const { data, error: workspaceError } = await supabase.rpc('get_admin_appointment_workspace', {
      p_anchor_date: null,
      p_view: 'day',
      p_barber_id: null,
      p_timezone: timeZone,
    })
    if (workspaceError) {
      setAppointmentsError(workspaceError.message)
      setAppointmentsLoading(false)
      return
    }
    setAppointmentWorkspace(normalizeAppointmentWorkspace(data))
    setAppointmentsError('')
    setAppointmentsLoading(false)
  }

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const { data, error: workspaceError } = await supabase.rpc('get_admin_appointment_workspace', {
        p_anchor_date: null,
        p_view: 'day',
        p_barber_id: null,
        p_timezone: timeZone,
      })
      if (cancelled) return
      if (workspaceError) {
        setAppointmentsError(workspaceError.message)
        setAppointmentsLoading(false)
        return
      }
      setAppointmentWorkspace(normalizeAppointmentWorkspace(data))
      setAppointmentsError('')
      setAppointmentsLoading(false)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [timeZone])

  const filteredBookings = useMemo(() => {
    const now = new Date()
    return appointmentWorkspace.bookings.filter((booking) => {
      if (bookingFilter === 'all') return true
      if (bookingFilter === 'upcoming') {
        return booking.status === 'scheduled' && new Date(booking.scheduledAt) >= now
      }
      return booking.status === bookingFilter
    })
  }, [appointmentWorkspace.bookings, bookingFilter])

  const upcomingCount = appointmentWorkspace.stats.upcomingCount

  const handleSidebarSelect = (item) => {
    setIsSidebarOpen(false)
    if (item.id === 'appointments') return
    if (['customers', 'barbers', 'services', 'schedule', 'transactions'].includes(item.id)) {
      window.location.hash = item.id
      return
    }
    window.location.hash = 'dashboard'
  }

  const startReschedule = (booking) => {
    setRescheduleDraft({
      appointmentId: booking.id,
      scheduledAt: toDateTimeLocalValue(booking.scheduledAt),
      durationMinutes: String(booking.durationMinutes || 45),
    })
  }

  const saveReschedule = async () => {
    if (!rescheduleDraft?.appointmentId || !rescheduleDraft.scheduledAt) return
    const scheduledAt = toIsoFromLocalValue(rescheduleDraft.scheduledAt)
    if (!scheduledAt) {
      setAdminToast('Choose a valid date and time.')
      return
    }
    setAppointmentActionBusy(true)
    const { error: actionError } = await supabase.rpc('admin_reschedule_appointment', {
      p_appointment_id: rescheduleDraft.appointmentId,
      p_scheduled_at: scheduledAt,
      p_duration_minutes: Number(rescheduleDraft.durationMinutes) || 45,
      p_timezone: timeZone,
    })
    setAppointmentActionBusy(false)
    if (actionError) {
      setAdminToast(`Could not reschedule: ${actionError.message}`)
      return
    }
    setRescheduleDraft(null)
    setAdminToast('Booking rescheduled.')
    await loadAppointmentWorkspace(false)
  }

  const confirmAppointmentAction = async () => {
    if (!pendingAppointmentAction?.booking) return
    const status = pendingAppointmentAction.type === 'confirm' ? 'scheduled' : 'cancelled'
    setAppointmentActionBusy(true)
    const { error: actionError } = await supabase.rpc('admin_update_appointment_status', {
      p_appointment_id: pendingAppointmentAction.booking.id,
      p_status: status,
      p_timezone: timeZone,
    })
    setAppointmentActionBusy(false)
    if (actionError) {
      setAdminToast(`Could not update booking: ${actionError.message}`)
      return
    }
    setPendingAppointmentAction(null)
    setAdminToast(status === 'scheduled' ? 'Booking confirmed.' : 'Booking cancelled.')
    await loadAppointmentWorkspace(false)
  }

  return (
    <main className="customer-dashboard admin-page">
      <Toast message={adminToast} onClose={() => setAdminToast('')} />
      <AdminSidebar
        activeId="appointments"
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelect={handleSidebarSelect}
        onLogoutRequest={() => setIsLogoutDialogOpen(true)}
        upcomingCount={upcomingCount}
      />
      <button
        aria-label="Close navigation"
        className={`customer-sidebar-backdrop${isSidebarOpen ? ' is-open' : ''}`}
        type="button"
        onClick={() => setIsSidebarOpen(false)}
      />

      <section className="admin-main" aria-label="Admin appointments">
        <button
          aria-label="Open navigation"
          className="customer-square-button customer-mobile-menu-button admin-mobile-menu"
          type="button"
          onClick={() => setIsSidebarOpen(true)}
        >
          <Icon name="menu" />
        </button>

        <header className="admin-header" id="admin-appointments">
          <div>
            <p className="customer-eyebrow">Booking operations</p>
            <h1>
              Appointments <span>panel.</span>
            </h1>
            <p>All bookings: upcoming, pending, and cancelled. Confirm, reschedule, or cancel.</p>
          </div>
          <div className="admin-header-actions">
            <span className="admin-user-pill">{email}</span>
            <button
              className="admin-refresh"
              type="button"
              onClick={() => loadAppointmentWorkspace(true)}
              disabled={appointmentsLoading}
            >
              <Icon name="refresh" />
              {appointmentsLoading ? 'Refreshing' : 'Refresh'}
            </button>
          </div>
        </header>

        <section className="admin-panel admin-panel-wide">
          <div className="admin-panel-head">
            <div>
              <p className="customer-eyebrow">All bookings</p>
              <h2>Upcoming, pending, cancelled</h2>
            </div>
            <span>{filteredBookings.length} shown</span>
          </div>

          {appointmentsError && (
            <div className="admin-alert" role="alert">
              <strong>Appointment tools did not load.</strong>
              <span>{appointmentsError}</span>
              <small>Run `supabase/migrations/0009_admin_appointments.sql` in Supabase SQL Editor.</small>
            </div>
          )}

          <div className="admin-booking-workspace">
            <div className="admin-booking-toolbar">
              <div className="admin-segmented" role="tablist" aria-label="Booking filters">
                {bookingFilters.map((filter) => (
                  <button
                    className={bookingFilter === filter.id ? 'is-active' : ''}
                    key={filter.id}
                    type="button"
                    onClick={() => setBookingFilter(filter.id)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredBookings.length === 0 ? (
              <EmptyBlock>No bookings match this view.</EmptyBlock>
            ) : (
              <div className="admin-booking-list">
                {filteredBookings.map((booking) => (
                  <AdminBookingCard
                    booking={booking}
                    busy={appointmentActionBusy}
                    isRescheduling={rescheduleDraft?.appointmentId === booking.id}
                    key={booking.id}
                    onAction={(type, targetBooking) =>
                      setPendingAppointmentAction({ type, booking: targetBooking })
                    }
                    onCancelReschedule={() => setRescheduleDraft(null)}
                    onRescheduleDraftChange={setRescheduleDraft}
                    onSaveReschedule={saveReschedule}
                    onStartReschedule={startReschedule}
                    rescheduleDraft={rescheduleDraft}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </section>

      {pendingAppointmentAction && (
        <ConfirmDialog
          title={
            pendingAppointmentAction.type === 'confirm'
              ? 'Confirm this booking?'
              : 'Cancel this booking?'
          }
          description={
            pendingAppointmentAction.type === 'confirm'
              ? `${pendingAppointmentAction.booking.service} will move into the upcoming queue.`
              : `${pendingAppointmentAction.booking.service} will be marked cancelled.`
          }
          cancelLabel="Keep editing"
          confirmLabel={pendingAppointmentAction.type === 'confirm' ? 'Confirm booking' : 'Cancel booking'}
          busy={appointmentActionBusy}
          onCancel={() => setPendingAppointmentAction(null)}
          onConfirm={confirmAppointmentAction}
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
