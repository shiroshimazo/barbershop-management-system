import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  RiAddLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCalendarCheckLine,
  RiCheckLine,
  RiCloseLine,
  RiDeleteBin6Line,
  RiForbidLine,
  RiGroupLine,
  RiMoneyDollarCircleLine,
  RiTimeLine,
} from 'react-icons/ri'
import ConfirmDialog from '../Customer/ConfirmDialog.jsx'
import Toast from '../components/Toast.jsx'
import { supabase } from '../lib/supabase.js'
import { AdminSidebar, Icon } from './AdminShell.jsx'
import { browserTimeZone } from './adminShared.js'

const GRID_START = 8
const GRID_END = 19
const HOUR_PX = 48
const WEEK_HOUR_PX = 34
const dayHours = Array.from({ length: GRID_END - GRID_START }, (_, index) => GRID_START + index)
const routeIds = ['appointments', 'customers', 'barbers', 'services', 'schedule', 'transactions']
const entryKinds = [
  { id: 'booked', label: 'Booked' },
  { id: 'walkin', label: 'Walk-in' },
  { id: 'vip', label: 'VIP / Platinum' },
]
const blockReasons = [
  'Lunch',
  'Break',
  'Training',
  'Personal time',
  'Vacation',
  'Sick day',
  'End-of-shift buffer',
]
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const fallbackServices = [
  { name: 'Classic Cut', priceCents: 3500, durationMinutes: 30 },
  { name: 'Skin Fade', priceCents: 4500, durationMinutes: 45 },
  { name: 'Beard Trim', priceCents: 1800, durationMinutes: 20 },
  { name: 'Full Service', priceCents: 9500, durationMinutes: 90 },
]

const emptyWorkspace = {
  generatedAt: null,
  anchorDate: null,
  barbers: [],
  events: [],
  services: [],
  shifts: [],
  stats: {
    upcomingCount: 0,
  },
}

function normalizeWorkspace(data) {
  if (!data || typeof data !== 'object') return emptyWorkspace
  return {
    ...emptyWorkspace,
    ...data,
    barbers: Array.isArray(data.barbers) ? data.barbers : [],
    events: Array.isArray(data.events) ? data.events : [],
    services: Array.isArray(data.services) ? data.services : [],
    shifts: Array.isArray(data.shifts) ? data.shifts : [],
    stats: { ...emptyWorkspace.stats, ...(data.stats || {}) },
  }
}

function parseDateInput(value) {
  const [year, month, day] = String(value || '').split('-').map(Number)
  if (!year || !month || !day) return new Date()
  return new Date(year, month - 1, day)
}

function dateInputValue(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDaysValue(value, days) {
  const date = parseDateInput(value)
  date.setDate(date.getDate() + days)
  return dateInputValue(date)
}

function weekStartValue(value) {
  const date = parseDateInput(value)
  const offset = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - offset)
  return dateInputValue(date)
}

function formatDateLabel(value) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(parseDateInput(value))
}

function formatWeekLabel(value) {
  const start = weekStartValue(value)
  const end = addDaysValue(start, 6)
  const startDate = parseDateInput(start)
  const endDate = parseDateInput(end)
  return `${new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(startDate)}-${new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(endDate)}`
}

function fmtHour(hour) {
  const rawHour = Math.floor(Number(hour) || 0)
  const minutes = Math.round(((Number(hour) || 0) - rawHour) * 60)
  const hour12 = rawHour % 12 || 12
  return `${hour12}${minutes ? `:${String(minutes).padStart(2, '0')}` : ''} ${
    rawHour >= 12 ? 'PM' : 'AM'
  }`
}

function fmtShortHour(hour) {
  const rawHour = Math.floor(Number(hour) || 0)
  const minutes = Math.round(((Number(hour) || 0) - rawHour) * 60)
  const hour12 = rawHour % 12 || 12
  return `${hour12}${minutes ? `:${String(minutes).padStart(2, '0')}` : ''}${
    rawHour >= 12 ? 'p' : 'a'
  }`
}

function money(cents) {
  return `$${Math.round((Number(cents) || 0) / 100).toLocaleString()}`
}

function toMinutes(hour) {
  return Math.round((Number(hour) || 0) * 60)
}

function minutesToDecimal(minutes) {
  return Math.round(minutes) / 60
}

function dateHourToIso(dateValue, hour) {
  const date = parseDateInput(dateValue)
  const minutes = toMinutes(hour)
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0)
  return date.toISOString()
}

function decimalToTimeInput(hour) {
  const minutes = toMinutes(hour)
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(
    2,
    '0',
  )}`
}

function timeInputToDecimal(value) {
  const [hour, minute] = String(value || '09:00').split(':').map(Number)
  return (hour || 0) + (minute || 0) / 60
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function timeOptions() {
  const options = []
  for (let minutes = 8 * 60; minutes <= 20 * 60; minutes += 30) {
    options.push(minutesToDecimal(minutes))
  }
  return options
}

function eventDuration(event) {
  return Math.max(0, toMinutes(event.end) - toMinutes(event.start))
}

function BarberAvatar({ barber }) {
  const locationClass = barber.loc === 'Eastside' ? ' es' : ' dt'
  return (
    <span className={`sc-avatar${barber.avail ? locationClass : ' off'}`}>
      {barber.code || '?'}
    </span>
  )
}

function StatTile({ icon: StatIcon, label, value, unit, delta, foot, dark = false }) {
  return (
    <article className={`sc-stat${dark ? ' is-dark' : ''}`}>
      <div className="sc-stat-head">
        <span>
          <StatIcon aria-hidden="true" />
        </span>
        <small>{label}</small>
      </div>
      <strong>
        {value}
        {unit && <span>{unit}</span>}
      </strong>
      <p>
        <mark>{delta}</mark>
        {foot}
      </p>
    </article>
  )
}

function Legend() {
  return (
    <div className="sc-legend" aria-label="Schedule legend">
      {[
        ['booked', 'Booked'],
        ['walkin', 'Walk-in'],
        ['vip', 'VIP'],
        ['block', 'Blocked'],
      ].map(([kind, label]) => (
        <span key={kind}>
          <i className={`is-${kind}`} />
          {label}
        </span>
      ))}
    </div>
  )
}

function EventBlock({ event, onClick, compact = false }) {
  const start = clamp(Number(event.start), GRID_START, GRID_END)
  const end = clamp(Number(event.end), GRID_START, GRID_END)
  if (end <= GRID_START || start >= GRID_END || end <= start) return null
  const top = (start - GRID_START) * (compact ? WEEK_HOUR_PX : HOUR_PX)
  const height = Math.max((end - start) * (compact ? WEEK_HOUR_PX : HOUR_PX) - 2, compact ? 24 : 30)
  return (
    <button
      className={`${compact ? 'sc-week-event' : 'sc-event'} is-${event.kind}`}
      style={{ top, height }}
      type="button"
      onClick={(clickEvent) => {
        clickEvent.stopPropagation()
        onClick(event)
      }}
    >
      <span className="sc-event-time">
        {fmtShortHour(event.start)}-{fmtShortHour(event.end)}
        {event.kind === 'walkin' && <b>Walk-in</b>}
        {event.kind === 'vip' && <b>VIP</b>}
      </span>
      <strong>{event.kind === 'block' ? event.service : event.client}</strong>
      {event.kind !== 'block' && (
        <small>
          {event.service}
          {event.priceCents ? ` · ${money(event.priceCents)}` : ''}
        </small>
      )}
    </button>
  )
}

function DayView({ barbers, events, dateValue, nowHour, onEventClick, onEmptyClick }) {
  const isToday = dateValue === dateInputValue()
  return (
    <section
      className="sc-day-card"
      style={{ '--barbers': Math.max(barbers.length, 1) }}
      aria-label="Daily chair calendar"
    >
      <div className="sc-day-grid">
        <div className="sc-day-corner" />
        {barbers.map((barber) => {
          const barberEvents = events.filter((event) => event.barber === barber.id)
          const revenue = barberEvents
            .filter((event) => event.kind !== 'block')
            .reduce((sum, event) => sum + (Number(event.priceCents) || 0), 0)
          return (
            <header className="sc-barber-head" key={barber.id}>
              <div className="sc-bhead-row">
                <BarberAvatar barber={barber} />
                <div>
                  <strong>{barber.name}</strong>
                  <small>
                    {barber.loc} · {barber.tier}
                  </small>
                </div>
              </div>
              <p>
                {barber.avail
                  ? `${barberEvents.filter((event) => event.kind !== 'block').length} bookings · ${money(
                      revenue,
                    )} · ${fmtShortHour(barber.shift?.start)}-${fmtShortHour(barber.shift?.end)}`
                  : 'Off shift'}
              </p>
            </header>
          )
        })}

        <div className="sc-time-rail">
          {dayHours.map((hour) => (
            <div className="sc-time-cell" key={hour}>
              <span>{fmtHour(hour)}</span>
            </div>
          ))}
        </div>

        {barbers.map((barber) => {
          const columnEvents = events.filter((event) => event.barber === barber.id)
          const nowVisible =
            isToday && barber.avail && nowHour >= GRID_START && nowHour <= GRID_END
          return (
            <div
              className={`sc-day-column${barber.avail ? '' : ' is-off'}`}
              key={barber.id}
              role="presentation"
              onClick={(event) => {
                if (!barber.avail) return
                const rect = event.currentTarget.getBoundingClientRect()
                const y = event.clientY - rect.top
                const snapped = GRID_START + Math.floor((y / HOUR_PX) * 2) / 2
                const start = clamp(
                  snapped,
                  Number(barber.shift?.start) || GRID_START,
                  Math.max(Number(barber.shift?.start) || GRID_START, (Number(barber.shift?.end) || GRID_END) - 0.5),
                )
                onEmptyClick(barber, start)
              }}
            >
              {nowVisible && (
                <span
                  className="sc-now-line"
                  style={{ top: `${(nowHour - GRID_START) * HOUR_PX}px` }}
                >
                  <b>{fmtShortHour(nowHour)}</b>
                </span>
              )}
              {columnEvents.map((event) => (
                <EventBlock event={event} key={`${event.source}-${event.id}`} onClick={onEventClick} />
              ))}
              {!barber.avail && <span className="sc-off-label">Off shift</span>}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function WeekView({
  barbers,
  events,
  dateValue,
  selectedBarberId,
  onBarberChange,
  onEventClick,
  onEmptyClick,
}) {
  const weekStart = weekStartValue(dateValue)
  const weekDays = Array.from({ length: 7 }, (_, index) => addDaysValue(weekStart, index))
  const selectedBarber = barbers.find((barber) => barber.id === selectedBarberId) || barbers[0]
  const selectedEvents = events.filter((event) => event.barber === selectedBarber?.id)

  return (
    <section className="sc-week-shell" aria-label="Weekly chair calendar">
      <aside className="sc-week-side">
        <small>Pick a barber</small>
        {barbers.map((barber) => (
          <button
            className={`sc-barber-pill${selectedBarber?.id === barber.id ? ' is-active' : ''}`}
            key={barber.id}
            type="button"
            onClick={() => onBarberChange(barber.id)}
          >
            <BarberAvatar barber={barber} />
            <span>
              <strong>{barber.name}</strong>
              <em>
                {barber.loc} · {barber.avail ? barber.tier : 'Off this day'}
              </em>
            </span>
          </button>
        ))}
      </aside>

      <div className="sc-week-card">
        <div className="sc-week-grid">
          <div className="sc-week-corner" />
          {weekDays.map((dayValue) => (
            <header className="sc-week-head" key={dayValue}>
              <strong>
                {new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(parseDateInput(dayValue))}
              </strong>
              <span>{new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(parseDateInput(dayValue))}</span>
            </header>
          ))}
          <div className="sc-week-time-rail">
            {dayHours.map((hour) => (
              <div className="sc-week-time-cell" key={hour}>
                {fmtHour(hour)}
              </div>
            ))}
          </div>
          {weekDays.map((dayValue) => {
            const dayEvents = selectedEvents.filter((event) => event.date === dayValue)
            return (
              <div
                className="sc-week-column"
                key={dayValue}
                onClick={(event) => {
                  if (!selectedBarber?.avail) return
                  const rect = event.currentTarget.getBoundingClientRect()
                  const y = event.clientY - rect.top
                  const snapped = GRID_START + Math.floor((y / WEEK_HOUR_PX) * 2) / 2
                  onEmptyClick(selectedBarber, snapped, dayValue)
                }}
              >
                {dayEvents.map((event) => (
                  <EventBlock
                    compact
                    event={event}
                    key={`${event.source}-${event.id}`}
                    onClick={onEventClick}
                  />
                ))}
              </div>
            )
          })}
        </div>

        <div className="sc-shift-summary">
          {weekDays.map((dayValue) => {
            const dayEvents = selectedEvents.filter((event) => event.date === dayValue)
            const revenue = dayEvents.reduce((sum, event) => sum + (Number(event.priceCents) || 0), 0)
            const blocks = dayEvents.filter((event) => event.kind === 'block').length
            return (
              <span key={dayValue}>
                <strong>{dayEvents.filter((event) => event.kind !== 'block').length}</strong>
                bookings · {money(revenue)} · {blocks} blocks
              </span>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function ScheduleDrawer({
  mode,
  draft,
  barbers,
  services,
  busy,
  onClose,
  onDraftChange,
  onSave,
  onDelete,
}) {
  const options = services.length ? services : fallbackServices
  const times = timeOptions()
  if (!draft) return null
  const isBlock = draft.kind === 'block'

  const selectService = (serviceName) => {
    const service = options.find((item) => item.name === serviceName)
    if (!service) {
      onDraftChange({ ...draft, service: serviceName })
      return
    }
    const start = Number(draft.start) || 9
    const duration = Math.max(Number(service.durationMinutes) || 30, 5) / 60
    onDraftChange({
      ...draft,
      service: service.name,
      price: String(Math.round((Number(service.priceCents) || 0) / 100)),
      end: Math.min(20, start + duration),
    })
  }

  return (
    <div className="sc-drawer-layer" role="presentation">
      <button className="sc-drawer-scrim" type="button" aria-label="Close drawer" onClick={onClose} />
      <aside className="sc-drawer" aria-modal="true" role="dialog">
        <header>
          <div>
            <small>{mode === 'create' ? 'New schedule entry' : draft.source === 'block' ? 'Edit block' : 'Edit booking'}</small>
            <h2>{mode === 'create' ? 'New schedule entry.' : isBlock ? 'Edit time block.' : 'Edit booking.'}</h2>
          </div>
          <button type="button" aria-label="Close drawer" onClick={onClose}>
            <RiCloseLine aria-hidden="true" />
          </button>
        </header>

        <div className="sc-drawer-form">
          {mode === 'create' && (
            <div className="sc-kind-picker">
              <button
                className={draft.kind !== 'block' ? 'is-on' : ''}
                type="button"
                onClick={() =>
                  onDraftChange({
                    ...draft,
                    kind: 'booked',
                    client: draft.client || '',
                    service: options[0]?.name || 'Classic Cut',
                    price: String(Math.round((options[0]?.priceCents || 3500) / 100)),
                  })
                }
              >
                <RiCalendarCheckLine aria-hidden="true" />
                <span>
                  <strong>Booking</strong>
                  <small>Customer chair time</small>
                </span>
              </button>
              <button
                className={draft.kind === 'block' ? 'is-on is-block' : ''}
                type="button"
                onClick={() =>
                  onDraftChange({
                    ...draft,
                    kind: 'block',
                    client: '',
                    service: 'Lunch',
                    price: '0',
                    end: Math.max(Number(draft.start) + 1, Number(draft.end)),
                  })
                }
              >
                <RiForbidLine aria-hidden="true" />
                <span>
                  <strong>Time off / block</strong>
                  <small>Lunch, break, training</small>
                </span>
              </button>
            </div>
          )}

          <label>
            <span>Barber</span>
            <select
              value={draft.barberId}
              onChange={(event) => onDraftChange({ ...draft, barberId: event.target.value })}
            >
              {barbers.map((barber) => (
                <option key={barber.id} value={barber.id}>
                  {barber.name} · {barber.loc}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Date</span>
            <input
              type="date"
              value={draft.date}
              onChange={(event) => onDraftChange({ ...draft, date: event.target.value })}
            />
          </label>
          <label>
            <span>Start</span>
            <select
              value={decimalToTimeInput(draft.start)}
              onChange={(event) => {
                const start = timeInputToDecimal(event.target.value)
                onDraftChange({ ...draft, start, end: Math.max(start + 0.5, Number(draft.end)) })
              }}
            >
              {times
                .filter((hour) => hour < 20)
                .map((hour) => (
                  <option key={hour} value={decimalToTimeInput(hour)}>
                    {fmtHour(hour)}
                  </option>
                ))}
            </select>
          </label>
          <label>
            <span>End</span>
            <select
              value={decimalToTimeInput(draft.end)}
              onChange={(event) => onDraftChange({ ...draft, end: timeInputToDecimal(event.target.value) })}
            >
              {times
                .filter((hour) => hour > Number(draft.start))
                .map((hour) => (
                  <option key={hour} value={decimalToTimeInput(hour)}>
                    {fmtHour(hour)}
                  </option>
                ))}
            </select>
          </label>

          {isBlock ? (
            <>
              <label className="sc-field-wide">
                <span>Reason</span>
                <select
                  value={draft.service}
                  onChange={(event) => onDraftChange({ ...draft, service: event.target.value })}
                >
                  {blockReasons.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </label>
              <label className="sc-field-wide">
                <span>Notes</span>
                <textarea
                  rows="4"
                  value={draft.notes || ''}
                  placeholder="Doctor appointment, staff meeting..."
                  onChange={(event) => onDraftChange({ ...draft, notes: event.target.value })}
                />
              </label>
            </>
          ) : (
            <>
              <label className="sc-field-wide">
                <span>Customer</span>
                <input
                  type="text"
                  value={draft.client}
                  placeholder="Marcus Rivera"
                  onChange={(event) => onDraftChange({ ...draft, client: event.target.value })}
                />
              </label>
              <label>
                <span>Service</span>
                <select value={draft.service} onChange={(event) => selectService(event.target.value)}>
                  {options.map((service) => (
                    <option key={service.name} value={service.name}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Type</span>
                <select
                  value={draft.kind}
                  onChange={(event) => onDraftChange({ ...draft, kind: event.target.value })}
                >
                  {entryKinds.map((kind) => (
                    <option key={kind.id} value={kind.id}>
                      {kind.label}
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
                <span>Notes</span>
                <input
                  type="text"
                  value={draft.notes || ''}
                  placeholder="Optional"
                  onChange={(event) => onDraftChange({ ...draft, notes: event.target.value })}
                />
              </label>
            </>
          )}
        </div>

        <footer>
          <div>
            {mode === 'edit' && (
              <button className="is-danger" type="button" onClick={onDelete} disabled={busy}>
                <RiDeleteBin6Line aria-hidden="true" />
                Delete
              </button>
            )}
          </div>
          <div>
            <button type="button" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button className="is-primary" type="button" onClick={onSave} disabled={busy}>
              <RiCheckLine aria-hidden="true" />
              {busy ? 'Saving' : mode === 'create' ? 'Add to schedule' : 'Save changes'}
            </button>
          </div>
        </footer>
      </aside>
    </div>
  )
}

function ShiftManager({ barbers, shifts, selectedBarberId, busy, onSave }) {
  const selected = barbers.find((barber) => barber.id === selectedBarberId) || barbers[0]
  const effectiveBarberId = selected?.id || ''
  const today = new Date().getDay()
  const [draft, setDraft] = useState({
    barberId: '',
    dayOfWeek: String(today),
    startTime: '09:00',
    endTime: '18:00',
    slotStepMinutes: '15',
    active: true,
  })

  const visibleShifts = shifts.filter(
    (shift) => !(draft.barberId || effectiveBarberId) || shift.barberId === (draft.barberId || effectiveBarberId),
  )

  return (
    <section className="sc-shift-manager" aria-label="Manage shifts">
      <div className="sc-shift-head">
        <div>
          <small>Manage shifts</small>
          <h2>Working hours</h2>
        </div>
        <span>{visibleShifts.filter((shift) => shift.active).length} active windows</span>
      </div>
      <form
        className="sc-shift-form"
        onSubmit={(event) => {
          event.preventDefault()
          onSave({ ...draft, barberId: draft.barberId || effectiveBarberId })
        }}
      >
        <label>
          <span>Barber</span>
          <select
            value={draft.barberId || effectiveBarberId}
            onChange={(event) => setDraft((current) => ({ ...current, barberId: event.target.value }))}
          >
            {barbers.map((barber) => (
              <option key={barber.id} value={barber.id}>
                {barber.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Day</span>
          <select
            value={draft.dayOfWeek}
            onChange={(event) => setDraft((current) => ({ ...current, dayOfWeek: event.target.value }))}
          >
            {dayNames.map((day, index) => (
              <option key={day} value={index}>
                {day}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Start</span>
          <input
            type="time"
            value={draft.startTime}
            onChange={(event) => setDraft((current) => ({ ...current, startTime: event.target.value }))}
          />
        </label>
        <label>
          <span>End</span>
          <input
            type="time"
            value={draft.endTime}
            onChange={(event) => setDraft((current) => ({ ...current, endTime: event.target.value }))}
          />
        </label>
        <label>
          <span>Slot</span>
          <input
            min="5"
            step="5"
            type="number"
            value={draft.slotStepMinutes}
            onChange={(event) =>
              setDraft((current) => ({ ...current, slotStepMinutes: event.target.value }))
            }
          />
        </label>
        <label className="sc-check-row">
          <input
            type="checkbox"
            checked={draft.active}
            onChange={(event) => setDraft((current) => ({ ...current, active: event.target.checked }))}
          />
          <span>Active</span>
        </label>
        <button type="submit" disabled={busy}>
          Save shift
        </button>
      </form>
      <div className="sc-shift-chips">
        {visibleShifts.length === 0 ? (
          <span>No shifts saved for this barber.</span>
        ) : (
          visibleShifts.map((shift) => (
            <span className={shift.active ? '' : 'is-muted'} key={shift.id}>
              {dayNames[shift.dayOfWeek]} · {shift.startTime}-{shift.endTime}
            </span>
          ))
        )}
      </div>
    </section>
  )
}

export default function AdminSchedule({ onLogout }) {
  const timeZone = useMemo(() => browserTimeZone(), [])
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false)
  const [workspace, setWorkspace] = useState(emptyWorkspace)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState('day')
  const [locFilter, setLocFilter] = useState('All')
  const [dateValue, setDateValue] = useState(() => dateInputValue())
  const [selectedBarberId, setSelectedBarberId] = useState('')
  const [drawerMode, setDrawerMode] = useState('create')
  const [draft, setDraft] = useState(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const [nowDate, setNowDate] = useState(() => new Date())
  const effectiveSelectedBarberId =
    selectedBarberId ||
    workspace.barbers.find((barber) => barber.avail)?.id ||
    workspace.barbers[0]?.id ||
    ''
  const scheduleBarberId = view === 'week' ? effectiveSelectedBarberId : ''

  const loadSchedule = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true)
      const { data, error: scheduleError } = await supabase.rpc('get_admin_schedule_workspace', {
        p_anchor_date: dateValue,
        p_view: view,
        p_barber_id: scheduleBarberId || null,
        p_timezone: timeZone,
      })
      if (scheduleError) {
        setError(scheduleError.message)
        setLoading(false)
        return
      }
      setWorkspace(normalizeWorkspace(data))
      setError('')
      setLoading(false)
    },
    [dateValue, scheduleBarberId, timeZone, view],
  )

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const { data, error: scheduleError } = await supabase.rpc('get_admin_schedule_workspace', {
        p_anchor_date: dateValue,
        p_view: view,
        p_barber_id: scheduleBarberId || null,
        p_timezone: timeZone,
      })
      if (cancelled) return
      if (scheduleError) {
        setError(scheduleError.message)
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
  }, [dateValue, scheduleBarberId, timeZone, view])

  useEffect(() => {
    const timer = window.setInterval(() => setNowDate(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('admin-schedule-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => loadSchedule(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'barber_time_off' }, () => loadSchedule(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'barber_availability' }, () => loadSchedule(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'barbers' }, () => loadSchedule(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => loadSchedule(false))
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadSchedule])

  const visibleBarbers = useMemo(() => {
    return workspace.barbers.filter((barber) => locFilter === 'All' || barber.loc === locFilter)
  }, [locFilter, workspace.barbers])

  const eventsForDay = useMemo(() => {
    return workspace.events.filter((event) => {
      if (event.date !== dateValue) return false
      if (locFilter === 'All') return true
      const barber = workspace.barbers.find((item) => item.id === event.barber)
      return barber?.loc === locFilter
    })
  }, [dateValue, locFilter, workspace.barbers, workspace.events])

  const activeBarbers = visibleBarbers.filter((barber) => barber.avail)
  const bookingEvents = eventsForDay.filter((event) => event.kind !== 'block')
  const blockEvents = eventsForDay.filter((event) => event.kind === 'block')
  const revenueCents = bookingEvents.reduce((sum, event) => sum + (Number(event.priceCents) || 0), 0)
  const bookedMinutes = bookingEvents.reduce((sum, event) => sum + eventDuration(event), 0)
  const availableMinutes = activeBarbers.reduce(
    (sum, barber) => sum + Math.max(0, toMinutes(barber.shift?.end) - toMinutes(barber.shift?.start)),
    0,
  )
  const utilization = availableMinutes ? Math.round((bookedMinutes / availableMinutes) * 100) : 0
  const nowHour = nowDate.getHours() + nowDate.getMinutes() / 60

  const handleSidebarSelect = (item) => {
    setIsSidebarOpen(false)
    if (item.id === 'schedule') return
    if (routeIds.includes(item.id)) {
      window.location.hash = item.id
      return
    }
    window.location.hash = 'dashboard'
  }

  const moveDate = (direction) => {
    setDateValue((current) => addDaysValue(current, direction * (view === 'week' ? 7 : 1)))
  }

  const baseDraft = (kind, barberId, start, dayValue = dateValue) => {
    const service = workspace.services[0] || fallbackServices[0]
    return {
      id: null,
      source: kind === 'block' ? 'block' : 'appointment',
      kind,
      barberId,
      date: dayValue,
      start,
      end: kind === 'block' ? start + 1 : start + Math.max(service.durationMinutes || 45, 5) / 60,
      client: '',
      service: kind === 'block' ? 'Lunch' : service.name,
      price: kind === 'block' ? '0' : String(Math.round((service.priceCents || 3500) / 100)),
      notes: '',
    }
  }

  const openCreate = (kind = 'booked', start = kind === 'block' ? 12 : 14) => {
    const selected = effectiveSelectedBarberId || activeBarbers[0]?.id || visibleBarbers[0]?.id
    if (!selected) {
      setToast('Add an active barber before scheduling.')
      return
    }
    setDrawerMode('create')
    setDraft(baseDraft(kind, selected, start))
  }

  const openFromEmptySlot = (barber, start, dayValue = dateValue) => {
    setSelectedBarberId(barber.id)
    setDrawerMode('create')
    setDraft(baseDraft('booked', barber.id, start, dayValue))
  }

  const openEvent = (event) => {
    setSelectedBarberId(event.barber)
    setDrawerMode('edit')
    setDraft({
      id: event.id,
      source: event.source,
      kind: event.kind,
      barberId: event.barber,
      date: event.date,
      start: Number(event.start),
      end: Number(event.end),
      client: event.client || '',
      service: event.service || (event.kind === 'block' ? 'Blocked time' : 'Classic Cut'),
      price: String(Math.round((Number(event.priceCents) || 0) / 100)),
      notes: event.notes || '',
    })
  }

  const saveDraft = async () => {
    if (!draft) return
    if (Number(draft.end) <= Number(draft.start)) {
      setToast('End time must be after start time.')
      return
    }
    if (draft.kind !== 'block' && !draft.client.trim()) {
      setToast('Customer name required')
      return
    }

    const startsAt = dateHourToIso(draft.date, Number(draft.start))
    const endsAt = dateHourToIso(draft.date, Number(draft.end))
    setBusy(true)
    const response =
      draft.kind === 'block'
        ? await supabase.rpc('admin_save_schedule_block', {
            p_block_id: drawerMode === 'edit' && draft.source === 'block' ? draft.id : null,
            p_barber_id: draft.barberId,
            p_starts_at: startsAt,
            p_ends_at: endsAt,
            p_reason: draft.service,
            p_notes: draft.notes || null,
          })
        : await supabase.rpc('admin_save_schedule_appointment', {
            p_appointment_id: drawerMode === 'edit' && draft.source === 'appointment' ? draft.id : null,
            p_barber_id: draft.barberId,
            p_customer_name: draft.client.trim(),
            p_service: draft.service,
            p_scheduled_at: startsAt,
            p_duration_minutes: Math.max(5, Math.round((Number(draft.end) - Number(draft.start)) * 60)),
            p_price_cents: Math.max(0, Math.round((Number(draft.price) || 0) * 100)),
            p_kind: draft.kind,
            p_notes: draft.notes || null,
            p_timezone: timeZone,
          })
    setBusy(false)

    if (response.error) {
      setToast(`Could not save: ${response.error.message}`)
      return
    }

    setToast(
      drawerMode === 'create'
        ? draft.kind === 'block'
          ? 'Time block added'
          : `Booking added for ${draft.client}`
        : draft.kind === 'block'
          ? 'Updated time block'
          : `Updated ${draft.client}`,
    )
    setDraft(null)
    await loadSchedule(false)
  }

  const deleteDraft = async () => {
    if (!draft?.id) return
    setBusy(true)
    const { error: deleteError } = await supabase.rpc('admin_delete_schedule_event', {
      p_event_id: draft.id,
      p_event_type: draft.source,
    })
    setBusy(false)
    if (deleteError) {
      setToast(`Could not delete: ${deleteError.message}`)
      return
    }
    setToast('Removed from schedule')
    setDraft(null)
    await loadSchedule(false)
  }

  const saveShift = async (shiftDraft) => {
    if (!shiftDraft.barberId) {
      setToast('Choose a barber first.')
      return
    }
    setBusy(true)
    const { error: shiftError } = await supabase.rpc('admin_save_barber_shift', {
      p_barber_id: shiftDraft.barberId,
      p_day_of_week: Number(shiftDraft.dayOfWeek),
      p_start_time: shiftDraft.startTime,
      p_end_time: shiftDraft.endTime,
      p_active: Boolean(shiftDraft.active),
      p_slot_step_minutes: Number(shiftDraft.slotStepMinutes) || 15,
    })
    setBusy(false)
    if (shiftError) {
      setToast(`Could not save shift: ${shiftError.message}`)
      return
    }
    setToast('Shift saved.')
    await loadSchedule(false)
  }

  return (
    <main className="customer-dashboard admin-page">
      <Toast message={toast} onClose={() => setToast('')} />
      <AdminSidebar
        activeId="schedule"
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

      <section className="admin-main admin-schedule-page" aria-label="Admin schedule">
        <button
          aria-label="Open navigation"
          className="customer-square-button customer-mobile-menu-button admin-mobile-menu"
          type="button"
          onClick={() => setIsSidebarOpen(true)}
        >
          <Icon name="menu" />
        </button>

        <header className="sc-head">
          <div>
            <nav className="sc-crumbs" aria-label="Breadcrumb">
              <button type="button" onClick={() => (window.location.hash = 'dashboard')}>
                Operations
              </button>
              <span>/</span>
              <strong>Schedule</strong>
            </nav>
            <h1>
              The chair calendar<span>.</span>
            </h1>
            <p>
              {activeBarbers.length} barbers on shift · {bookingEvents.length} bookings today ·{' '}
              {blockEvents.length} time blocks · click an empty slot to book, click an event to edit.
            </p>
          </div>
          <div className="sc-head-actions">
            <button type="button" onClick={() => openCreate('block')}>
              <RiForbidLine aria-hidden="true" />
              Block time off
            </button>
            <button className="is-primary" type="button" onClick={() => openCreate('booked')}>
              <RiAddLine aria-hidden="true" />
              New booking
            </button>
          </div>
        </header>

        {error && (
          <section className="admin-alert" role="alert">
            <strong>Schedule did not load.</strong>
            <span>{error}</span>
            <small>Run `supabase/migrations/0013_admin_schedule.sql` in Supabase SQL Editor.</small>
          </section>
        )}

        <section className="sc-stats" aria-label="Schedule metrics">
          <StatTile
            icon={RiCalendarCheckLine}
            label="Bookings today"
            value={loading ? '...' : bookingEvents.length}
            delta="+ live"
            foot="scheduled visits"
          />
          <StatTile
            icon={RiTimeLine}
            label="Chair utilization"
            value={loading ? '...' : `${utilization}%`}
            delta={utilization > 70 ? 'high' : 'fair'}
            foot="of available hours"
          />
          <StatTile
            icon={RiGroupLine}
            label="Barbers on shift"
            value={loading ? '...' : activeBarbers.length}
            unit={` / ${visibleBarbers.length}`}
            delta={`${blockEvents.length} blocks`}
            foot={`${Math.max(visibleBarbers.length - activeBarbers.length, 0)} off`}
          />
          <StatTile
            icon={RiForbidLine}
            label="Time blocks"
            value={loading ? '...' : blockEvents.length}
            delta="lunch + breaks"
            foot="this shift"
          />
          <StatTile
            dark
            icon={RiMoneyDollarCircleLine}
            label="Revenue scheduled"
            value={loading ? '...' : money(revenueCents)}
            delta="+ live"
            foot="if all completed"
          />
        </section>

        <section className="sc-toolbar" aria-label="Schedule controls">
          <div className="sc-date-nav">
            <button type="button" aria-label="Previous date" onClick={() => moveDate(-1)}>
              <RiArrowLeftSLine aria-hidden="true" />
            </button>
            <button type="button" onClick={() => setDateValue(dateInputValue())}>
              Today
            </button>
            <button type="button" aria-label="Next date" onClick={() => moveDate(1)}>
              <RiArrowRightSLine aria-hidden="true" />
            </button>
            <span>
              <small>{view === 'week' ? 'Week of' : 'Viewing'}</small>
              {view === 'week' ? formatWeekLabel(dateValue) : formatDateLabel(dateValue)}
            </span>
          </div>

          <div className="sc-segment" role="tablist" aria-label="Schedule view">
            {['day', 'week'].map((item) => (
              <button
                className={view === item ? 'is-active' : ''}
                key={item}
                type="button"
                onClick={() => setView(item)}
              >
                {item}
              </button>
            ))}
          </div>

          {view === 'day' && (
            <div className="sc-segment is-location" role="tablist" aria-label="Location filter">
              {['All', 'Downtown', 'Eastside'].map((location) => (
                <button
                  className={`${locFilter === location ? 'is-active' : ''} ${
                    location === 'Downtown' ? 'is-dt' : location === 'Eastside' ? 'is-es' : ''
                  }`}
                  key={location}
                  type="button"
                  onClick={() => setLocFilter(location)}
                >
                  {location}
                </button>
              ))}
            </div>
          )}

          <Legend />
        </section>

        {view === 'day' ? (
          <DayView
            barbers={visibleBarbers}
            dateValue={dateValue}
            events={eventsForDay}
            nowHour={nowHour}
            onEmptyClick={openFromEmptySlot}
            onEventClick={openEvent}
          />
        ) : (
          <WeekView
            barbers={workspace.barbers}
            dateValue={dateValue}
            events={workspace.events}
            selectedBarberId={effectiveSelectedBarberId}
            onBarberChange={setSelectedBarberId}
            onEmptyClick={openFromEmptySlot}
            onEventClick={openEvent}
          />
        )}

        <ShiftManager
          barbers={workspace.barbers}
          busy={busy}
          selectedBarberId={effectiveSelectedBarberId}
          shifts={workspace.shifts}
          onSave={saveShift}
        />
      </section>

      <ScheduleDrawer
        barbers={workspace.barbers}
        busy={busy}
        draft={draft}
        mode={drawerMode}
        services={workspace.services}
        onClose={() => setDraft(null)}
        onDelete={deleteDraft}
        onDraftChange={setDraft}
        onSave={saveDraft}
      />

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
