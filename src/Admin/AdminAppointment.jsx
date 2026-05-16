import { useEffect, useMemo, useState } from 'react'
import ConfirmDialog from '../Customer/ConfirmDialog.jsx'
import Toast from '../components/Toast.jsx'
import { supabase } from '../lib/supabase.js'
import { AdminSidebar, Icon } from './AdminShell.jsx'
import { browserTimeZone } from './adminShared.js'

const emptyAppointmentWorkspace = {
  anchorDate: null,
  view: 'day',
  rangeStart: null,
  rangeEnd: null,
  bookings: [],
  calendarBookings: [],
  barbers: [],
  shifts: [],
  timeOff: [],
}

const bookingFilters = [
  { id: 'all', label: 'All' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'pending', label: 'Pending' },
  { id: 'cancelled', label: 'Cancelled' },
]

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function normalizeAppointmentWorkspace(data) {
  if (!data || typeof data !== 'object') return emptyAppointmentWorkspace
  return {
    ...emptyAppointmentWorkspace,
    ...data,
    bookings: Array.isArray(data.bookings) ? data.bookings : [],
    calendarBookings: Array.isArray(data.calendarBookings) ? data.calendarBookings : [],
    barbers: Array.isArray(data.barbers) ? data.barbers : [],
    shifts: Array.isArray(data.shifts) ? data.shifts : [],
    timeOff: Array.isArray(data.timeOff) ? data.timeOff : [],
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

function formatDateTime(iso) {
  if (!iso) return '-'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
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

function todayInputValue() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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

function combineLocalDateTime(dateValue, timeValue) {
  return toIsoFromLocalValue(`${dateValue}T${timeValue}`)
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
              {booking.customerName || 'Customer'} with {booking.barberName || 'Unassigned'}
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
  const [calendarView, setCalendarView] = useState('day')
  const [calendarDate, setCalendarDate] = useState(todayInputValue)
  const [selectedBarberId, setSelectedBarberId] = useState('')
  const [pendingAppointmentAction, setPendingAppointmentAction] = useState(null)
  const [rescheduleDraft, setRescheduleDraft] = useState(null)
  const [appointmentActionBusy, setAppointmentActionBusy] = useState(false)
  const [adminToast, setAdminToast] = useState('')
  const [blockForm, setBlockForm] = useState({
    barberId: '',
    date: todayInputValue(),
    startTime: '12:00',
    endTime: '13:00',
    reason: '',
  })
  const [shiftForm, setShiftForm] = useState({
    barberId: '',
    dayOfWeek: String(new Date().getDay()),
    startTime: '09:00',
    endTime: '19:00',
    slotStepMinutes: '15',
    active: true,
  })

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const { data, error: workspaceError } = await supabase.rpc('get_admin_appointment_workspace', {
        p_anchor_date: calendarDate,
        p_view: calendarView,
        p_barber_id: selectedBarberId || null,
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
  }, [calendarDate, calendarView, selectedBarberId, timeZone])

  const loadAppointmentWorkspace = async (showLoading = false) => {
    if (showLoading) setAppointmentsLoading(true)
    const { data, error: workspaceError } = await supabase.rpc('get_admin_appointment_workspace', {
      p_anchor_date: calendarDate,
      p_view: calendarView,
      p_barber_id: selectedBarberId || null,
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

  const upcomingCount = useMemo(
    () =>
      appointmentWorkspace.bookings.filter(
        (booking) =>
          booking.status === 'scheduled' && new Date(booking.scheduledAt) >= new Date(),
      ).length,
    [appointmentWorkspace.bookings],
  )

  const selectedBarber = appointmentWorkspace.barbers.find((barber) => barber.id === selectedBarberId)
  const selectedBarberShifts = appointmentWorkspace.shifts.filter(
    (shift) => !selectedBarberId || shift.barberId === selectedBarberId,
  )

  const handleSidebarSelect = (item) => {
    setIsSidebarOpen(false)
    if (item.id === 'appointments') return
    if (item.id === 'customers') {
      window.location.hash = 'customers'
      return
    }
    if (item.id === 'barbers') {
      window.location.hash = 'barbers'
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

  const submitBlockTime = async (event) => {
    event.preventDefault()
    const barberId = blockForm.barberId || selectedBarberId
    const startsAt = combineLocalDateTime(blockForm.date, blockForm.startTime)
    const endsAt = combineLocalDateTime(blockForm.date, blockForm.endTime)
    if (!barberId || !startsAt || !endsAt) {
      setAdminToast('Complete the block time form first.')
      return
    }
    if (new Date(startsAt) >= new Date(endsAt)) {
      setAdminToast('Block time must end after it starts.')
      return
    }
    setAppointmentActionBusy(true)
    const { error: actionError } = await supabase.rpc('admin_create_barber_time_off', {
      p_barber_id: barberId,
      p_starts_at: startsAt,
      p_ends_at: endsAt,
      p_reason: blockForm.reason || null,
    })
    setAppointmentActionBusy(false)
    if (actionError) {
      setAdminToast(`Could not block time: ${actionError.message}`)
      return
    }
    setBlockForm((current) => ({ ...current, reason: '' }))
    setAdminToast('Time off blocked.')
    await loadAppointmentWorkspace(false)
  }

  const submitShift = async (event) => {
    event.preventDefault()
    const barberId = shiftForm.barberId || selectedBarberId
    if (!barberId) {
      setAdminToast('Choose a barber first.')
      return
    }
    setAppointmentActionBusy(true)
    const { error: actionError } = await supabase.rpc('admin_save_barber_shift', {
      p_barber_id: barberId,
      p_day_of_week: Number(shiftForm.dayOfWeek),
      p_start_time: shiftForm.startTime,
      p_end_time: shiftForm.endTime,
      p_active: Boolean(shiftForm.active),
      p_slot_step_minutes: Number(shiftForm.slotStepMinutes) || 15,
    })
    setAppointmentActionBusy(false)
    if (actionError) {
      setAdminToast(`Could not save shift: ${actionError.message}`)
      return
    }
    setAdminToast('Shift saved.')
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
            <p>
              All bookings, barber calendars, blocked time, and shift controls live here outside
              the dashboard.
            </p>
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

            <div className="admin-calendar-board">
              <div className="admin-panel-head">
                <div>
                  <p className="customer-eyebrow">Calendar view</p>
                  <h2>{selectedBarber ? selectedBarber.name : 'Per barber'}</h2>
                </div>
                <span>
                  {formatDateShort(appointmentWorkspace.rangeStart)} -{' '}
                  {formatDateShort(appointmentWorkspace.rangeEnd)}
                </span>
              </div>

              <div className="admin-calendar-controls">
                <label>
                  <span>Barber</span>
                  <select
                    value={selectedBarberId}
                    onChange={(event) => {
                      setSelectedBarberId(event.target.value)
                      setBlockForm((current) => ({ ...current, barberId: event.target.value }))
                      setShiftForm((current) => ({ ...current, barberId: event.target.value }))
                    }}
                  >
                    <option value="">All barbers</option>
                    {appointmentWorkspace.barbers.map((barber) => (
                      <option key={barber.id} value={barber.id}>
                        {barber.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Date</span>
                  <input
                    type="date"
                    value={calendarDate}
                    onChange={(event) => {
                      setCalendarDate(event.target.value)
                      setBlockForm((current) => ({ ...current, date: event.target.value }))
                    }}
                  />
                </label>
                <div className="admin-segmented" role="tablist" aria-label="Calendar range">
                  <button
                    className={calendarView === 'day' ? 'is-active' : ''}
                    type="button"
                    onClick={() => setCalendarView('day')}
                  >
                    Day
                  </button>
                  <button
                    className={calendarView === 'week' ? 'is-active' : ''}
                    type="button"
                    onClick={() => setCalendarView('week')}
                  >
                    Week
                  </button>
                </div>
              </div>

              <div className="admin-calendar-list">
                {appointmentWorkspace.calendarBookings.length === 0 &&
                appointmentWorkspace.timeOff.length === 0 ? (
                  <EmptyBlock>No bookings or blocked time in this range.</EmptyBlock>
                ) : (
                  <>
                    {appointmentWorkspace.calendarBookings.map((booking) => (
                      <article className="admin-calendar-event" key={booking.id}>
                        <time>{formatDateTime(booking.scheduledAt)}</time>
                        <div>
                          <strong>{booking.service}</strong>
                          <small>
                            {booking.customerName || 'Customer'} · {bookingStatusLabel(booking)}
                          </small>
                        </div>
                        <span>{booking.durationMinutes || 45} min</span>
                      </article>
                    ))}
                    {appointmentWorkspace.timeOff.map((block) => (
                      <article className="admin-calendar-event is-blocked" key={block.id}>
                        <time>
                          {formatDateTime(block.startsAt)} - {formatTime(block.endsAt)}
                        </time>
                        <div>
                          <strong>Blocked time</strong>
                          <small>{block.reason || 'No reason added'}</small>
                        </div>
                        <span>Time off</span>
                      </article>
                    ))}
                  </>
                )}
              </div>
            </div>

            <div className="admin-schedule-tools">
              <form className="admin-tool-form" onSubmit={submitBlockTime}>
                <div>
                  <p className="customer-eyebrow">Block time off</p>
                  <h3>Unavailable window</h3>
                </div>
                <label>
                  <span>Barber</span>
                  <select
                    value={blockForm.barberId}
                    onChange={(event) =>
                      setBlockForm((current) => ({ ...current, barberId: event.target.value }))
                    }
                  >
                    <option value="">Choose barber</option>
                    {appointmentWorkspace.barbers.map((barber) => (
                      <option key={barber.id} value={barber.id}>
                        {barber.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Date</span>
                  <input
                    type="date"
                    value={blockForm.date}
                    onChange={(event) =>
                      setBlockForm((current) => ({ ...current, date: event.target.value }))
                    }
                  />
                </label>
                <div className="admin-form-grid">
                  <label>
                    <span>Start</span>
                    <input
                      type="time"
                      value={blockForm.startTime}
                      onChange={(event) =>
                        setBlockForm((current) => ({
                          ...current,
                          startTime: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span>End</span>
                    <input
                      type="time"
                      value={blockForm.endTime}
                      onChange={(event) =>
                        setBlockForm((current) => ({ ...current, endTime: event.target.value }))
                      }
                    />
                  </label>
                </div>
                <label>
                  <span>Reason</span>
                  <input
                    type="text"
                    value={blockForm.reason}
                    placeholder="Lunch, meeting, personal time"
                    onChange={(event) =>
                      setBlockForm((current) => ({ ...current, reason: event.target.value }))
                    }
                  />
                </label>
                <button type="submit" disabled={appointmentActionBusy}>
                  Block time
                </button>
              </form>

              <form className="admin-tool-form" onSubmit={submitShift}>
                <div>
                  <p className="customer-eyebrow">Manage shifts</p>
                  <h3>Working hours</h3>
                </div>
                <label>
                  <span>Barber</span>
                  <select
                    value={shiftForm.barberId}
                    onChange={(event) =>
                      setShiftForm((current) => ({ ...current, barberId: event.target.value }))
                    }
                  >
                    <option value="">Choose barber</option>
                    {appointmentWorkspace.barbers.map((barber) => (
                      <option key={barber.id} value={barber.id}>
                        {barber.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Day</span>
                  <select
                    value={shiftForm.dayOfWeek}
                    onChange={(event) =>
                      setShiftForm((current) => ({ ...current, dayOfWeek: event.target.value }))
                    }
                  >
                    {dayNames.map((day, index) => (
                      <option key={day} value={index}>
                        {day}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="admin-form-grid">
                  <label>
                    <span>Start</span>
                    <input
                      type="time"
                      value={shiftForm.startTime}
                      onChange={(event) =>
                        setShiftForm((current) => ({
                          ...current,
                          startTime: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span>End</span>
                    <input
                      type="time"
                      value={shiftForm.endTime}
                      onChange={(event) =>
                        setShiftForm((current) => ({ ...current, endTime: event.target.value }))
                      }
                    />
                  </label>
                </div>
                <label>
                  <span>Slot step</span>
                  <input
                    min="5"
                    step="5"
                    type="number"
                    value={shiftForm.slotStepMinutes}
                    onChange={(event) =>
                      setShiftForm((current) => ({
                        ...current,
                        slotStepMinutes: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="admin-check-row">
                  <input
                    type="checkbox"
                    checked={shiftForm.active}
                    onChange={(event) =>
                      setShiftForm((current) => ({ ...current, active: event.target.checked }))
                    }
                  />
                  <span>Active shift</span>
                </label>
                <button type="submit" disabled={appointmentActionBusy}>
                  Save shift
                </button>
              </form>
            </div>

            <div className="admin-shift-list" aria-label="Current shifts">
              {selectedBarberShifts.length === 0 ? (
                <EmptyBlock>No shifts saved for this barber.</EmptyBlock>
              ) : (
                selectedBarberShifts.map((shift) => (
                  <span className={shift.active ? '' : 'is-muted'} key={shift.id}>
                    {dayNames[shift.dayOfWeek]} · {shift.startTime} - {shift.endTime}
                  </span>
                ))
              )}
            </div>
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
