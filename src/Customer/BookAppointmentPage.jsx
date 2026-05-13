import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import Toast from '../components/Toast.jsx'
import { clearBookingDraft, readBookingDraft } from './customerActions.js'
import { useServices } from './useServices.js'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function buildCalendar(year, month, today = new Date()) {
  // month is 0-indexed. Returns 6 weeks (42 cells) of { day, muted, disabled, today, dateLabel }.
  const firstOfMonth = new Date(year, month, 1)
  const startWeekday = firstOfMonth.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevMonthDays = new Date(year, month, 0).getDate()

  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const rows = []
  let row = []
  let dayCounter = 1
  let nextMonthCounter = 1

  for (let i = 0; i < 42; i++) {
    let cell
    if (i < startWeekday) {
      cell = { day: prevMonthDays - startWeekday + i + 1, muted: true }
    } else if (dayCounter > daysInMonth) {
      cell = { day: nextMonthCounter++, muted: true }
    } else {
      const d = new Date(year, month, dayCounter)
      const isToday = d.getTime() === startOfToday.getTime()
      const isPast = d < startOfToday
      cell = {
        day: dayCounter,
        date: d,
        today: isToday,
        disabled: isPast,
        dateLabel: `${WEEKDAY_SHORT[d.getDay()]}, ${MONTH_NAMES[month].slice(0, 3)} ${dayCounter}`,
      }
      dayCounter++
    }
    row.push(cell)
    if (row.length === 7) {
      rows.push(row)
      row = []
    }
  }
  return rows
}

function monthLabelOf(year, month) {
  return `${MONTH_NAMES[month]} ${year}`
}

function parseTimeSlot(slot) {
  // "2:30 PM" -> { hour: 14, minute: 30 }
  const match = slot.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return { hour: 9, minute: 0 }
  let hour = parseInt(match[1], 10)
  const minute = parseInt(match[2], 10)
  const ampm = match[3].toUpperCase()
  if (ampm === 'PM' && hour !== 12) hour += 12
  if (ampm === 'AM' && hour === 12) hour = 0
  return { hour, minute }
}

function buildScheduledAt(date, slot) {
  if (!date) return null
  const { hour, minute } = parseTimeSlot(slot)
  const d = new Date(date)
  d.setHours(hour, minute, 0, 0)
  return d
}

function isPastTimeSlot(date, slot, now = new Date()) {
  if (!date || !slot) return false
  const scheduledAt = buildScheduledAt(date, slot)
  return scheduledAt ? scheduledAt <= now : false
}

// Until a barber availability table exists, use shop hours and disable slots
// that are already booked or have passed for the selected day.
const FALLBACK_TIME_GROUPS = [
  {
    label: 'Morning',
    slots: ['9:00 AM', '9:45 AM', '10:30 AM', '11:15 AM', '12:00 PM', '12:45 PM'],
  },
  {
    label: 'Afternoon',
    slots: [
      { time: '1:30 PM' },
      { time: '2:15 PM' },
      { time: '2:30 PM' },
      { time: '3:00 PM' },
      { time: '3:45 PM' },
      { time: '4:30 PM' },
    ],
  },
  {
    label: 'Evening',
    slots: ['5:15 PM', '6:00 PM', '6:45 PM'],
  },
]

const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function Icon({ name }) {
  const commonProps = {
    'aria-hidden': true,
    className: 'customer-icon',
    viewBox: '0 0 24 24',
    fill: 'none',
  }
  const paths = {
    check: <path d="m5 12.5 4 4 10-10" />,
    user: (
      <>
        <path d="M12 12.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        <path d="M4.75 20a7.25 7.25 0 0 1 14.5 0" />
      </>
    ),
    calendar: (
      <>
        <path d="M6.5 4v3M17.5 4v3M4.75 8.25h14.5M5.75 5.75h12.5v14H5.75z" />
        <path d="M8.75 12h2M13.25 12h2M8.75 15.25h2M13.25 15.25h2" />
      </>
    ),
    pin: (
      <>
        <path d="M12 21s6-5.1 6-11a6 6 0 0 0-12 0c0 5.9 6 11 6 11Z" />
        <path d="M12 12.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" />
      </>
    ),
    clock: (
      <>
        <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
        <path d="M12 7.5v5l3.25 2" />
      </>
    ),
    chevronLeft: <path d="m13.5 6.5-5 5.5 5 5.5" />,
    chevronRight: <path d="m10.5 6.5 5 5.5-5 5.5" />,
  }
  return <svg {...commonProps}>{paths[name]}</svg>
}

function Stepper({ currentStep }) {
  const steps = [
    { num: 1, label: 'Service' },
    { num: 2, label: 'Barber & time' },
    { num: 3, label: 'Confirm' },
  ]

  return (
    <ol className="book-stepper" aria-label="Booking progress">
      {steps.map((step, index) => {
        let state = 'pending'
        if (index < currentStep) state = 'done'
        if (index === currentStep) state = 'active'

        return (
          <li className={`book-step is-${state}`} key={step.num}>
            <span className="num" aria-hidden="true">
              {state === 'done' ? <Icon name="check" /> : step.num}
            </span>
            <span className="book-step-label">{step.label}</span>
            {index < steps.length - 1 && <span className="book-step-arrow" aria-hidden="true">→</span>}
          </li>
        )
      })}
    </ol>
  )
}

function ServicePanel({ selected, onSelect, services, loading, error, usingFallback }) {
  return (
    <section className="book-panel" aria-labelledby="book-service-heading">
      <header className="book-panel-head">
        <span className="book-panel-num">1</span>
        <div>
          <h2 id="book-service-heading">Choose a service</h2>
          <p>Pick a single service — you can add upgrades at checkout.</p>
        </div>
      </header>

      {error && (
        <p className="book-error">Live services could not load: {error}</p>
      )}
      {usingFallback && !loading && (
        <p className="book-loading">Using the local service list until Supabase services respond.</p>
      )}
      {loading ? (
        <p className="book-loading">Loading services...</p>
      ) : services.length === 0 ? (
        <p className="book-loading">No services are available right now.</p>
      ) : (
        <div className="book-service-grid">
          {services.map((svc) => (
            <button
              className={`book-service-card${selected === svc.id ? ' is-selected' : ''}`}
              key={svc.id}
              type="button"
              onClick={() => onSelect(svc.id)}
            >
              <div className="book-service-top">
                <strong>{svc.name}</strong>
                <span className="book-service-price">${svc.price}</span>
              </div>
              <p className="book-service-meta">
                <span>
                  <Icon name="clock" />
                  {svc.duration} min
                </span>
                <span className="book-service-dot">·</span>
                <span>{svc.descriptor}</span>
              </p>
              {svc.tag && <span className="book-service-tag">{svc.tag}</span>}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function BarberPanel({
  selected,
  onSelect,
  barbers,
  loading,
  error,
  favoriteIds,
  onToggleFavorite,
}) {
  return (
    <section className="book-panel" aria-labelledby="book-barber-heading">
      <header className="book-panel-head">
        <span className="book-panel-num">2</span>
        <div>
          <h2 id="book-barber-heading">Pick your barber</h2>
          <p>Pick a specific barber to lock in their schedule.</p>
        </div>
      </header>

      {loading ? (
        <p className="book-loading">Loading barbers...</p>
      ) : error ? (
        <p className="book-error">Live barbers could not load: {error}</p>
      ) : barbers.length === 0 ? (
        <p className="book-loading">No barbers available right now.</p>
      ) : (
        <div className="book-barber-grid">
          {barbers.map((barber) => {
            const isFav = favoriteIds?.has(barber.id)
            return (
              <div
                className={`book-barber-card${selected === barber.id ? ' is-selected' : ''}`}
                key={barber.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(barber.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onSelect(barber.id)
                  }
                }}
              >
                <span className="book-barber-radio" aria-hidden="true" />
                <span className="book-barber-avatar">{barber.initials}</span>
                <strong>{barber.fullname}</strong>
                <small>
                  {barber.specialty}
                  {barber.location && ` · ${barber.location}`}
                </small>
                <span className="book-barber-rating">★ {barber.rating}</span>
                <button
                  className={`book-barber-fav${isFav ? ' is-saved' : ''}`}
                  type="button"
                  aria-label={isFav ? 'Remove from favourites' : 'Save to favourites'}
                  title={isFav ? 'Saved' : 'Save to favourites'}
                  onClick={(event) => {
                    event.stopPropagation()
                    onToggleFavorite?.(barber.id, !isFav)
                  }}
                >
                  ★
                </button>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function WhenPanel({
  selectedBarberName,
  selectedDay,
  selectedDate,
  selectedTime,
  onSelectDay,
  onSelectTime,
  monthLabel,
  calendarRows,
  onPrevMonth,
  onNextMonth,
  canGoBack,
  takenSlots,
  takenSlotsLoading,
  takenSlotsError,
  now,
}) {
  return (
    <section className="book-panel" aria-labelledby="book-when-heading">
      <header className="book-panel-head">
        <span className="book-panel-num">3</span>
        <div>
          <h2 id="book-when-heading">When works for you?</h2>
          <p>
            {selectedBarberName
              ? `Times below are based on ${selectedBarberName.split(' ')[0]}'s schedule.`
              : 'Pick a barber to see available times.'}
          </p>
        </div>
      </header>

      <div className="book-when-grid">
        <div className="book-calendar" aria-label="Calendar">
          <div className="book-calendar-head">
            <button
              className="book-calendar-nav"
              type="button"
              aria-label="Previous month"
              onClick={onPrevMonth}
              disabled={!canGoBack}
            >
              <Icon name="chevronLeft" />
            </button>
            <strong>{monthLabel}</strong>
            <button
              className="book-calendar-nav"
              type="button"
              aria-label="Next month"
              onClick={onNextMonth}
            >
              <Icon name="chevronRight" />
            </button>
          </div>
          <div className="book-calendar-weekdays" aria-hidden="true">
            {dayLabels.map((d, i) => (
              <span key={`${d}-${i}`}>{d}</span>
            ))}
          </div>
          <div className="book-calendar-grid" role="grid">
            {calendarRows.flat().map((cell, index) => {
              const isSelected = cell.day === selectedDay && !cell.muted && !cell.disabled
              const className = [
                'book-day',
                cell.muted && 'is-muted',
                cell.disabled && 'is-disabled',
                cell.today && 'is-today',
                isSelected && 'is-selected',
              ]
                .filter(Boolean)
                .join(' ')

              return (
                <button
                  key={`${cell.day}-${index}`}
                  type="button"
                  className={className}
                  disabled={cell.muted || cell.disabled}
                  onClick={() =>
                    !cell.muted && !cell.disabled && onSelectDay(cell.day, cell.dateLabel, cell.date)
                  }
                >
                  {cell.day}
                </button>
              )
            })}
          </div>
        </div>

        {takenSlotsError && (
          <p className="book-error">Availability check failed: {takenSlotsError}</p>
        )}
        {takenSlotsLoading && (
          <p className="book-loading">Checking booked times...</p>
        )}
        {!selectedBarberName && (
          <p className="book-loading">Pick a barber before selecting a time.</p>
        )}

        <div className="book-times" aria-label="Available times">
          {FALLBACK_TIME_GROUPS.map((group) => (
            <div className="book-time-group" key={group.label}>
              <p className="book-time-label">{group.label}</p>
              <div className="book-time-grid">
                {group.slots.map((slot) => {
                  const time = typeof slot === 'string' ? slot : slot.time
                  const presetDisabled = typeof slot === 'object' && slot.disabled
                  const taken = takenSlots?.has(time)
                  const past = isPastTimeSlot(selectedDate, time, now)
                  const missingBarber = !selectedBarberName
                  const missingDate = !selectedDate
                  const disabled =
                    presetDisabled || taken || past || missingBarber || missingDate || takenSlotsLoading
                  const isSelected = time === selectedTime
                  const title = missingBarber
                    ? 'Pick a barber first'
                    : missingDate
                      ? 'Pick a date first'
                      : takenSlotsLoading
                        ? 'Checking availability'
                        : taken
                          ? 'Already booked'
                          : past
                            ? 'Time has passed'
                            : undefined
                  return (
                    <button
                      className={`book-time${isSelected ? ' is-selected' : ''}${
                        disabled ? ' is-disabled' : ''
                      }`}
                      key={time}
                      type="button"
                      disabled={disabled}
                      onClick={() => onSelectTime(time)}
                      title={title}
                    >
                      {time}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function NotesPanel({ value, onChange }) {
  return (
    <section className="book-panel" aria-labelledby="book-notes-heading">
      <header className="book-panel-head">
        <span className="book-panel-num">4</span>
        <div>
          <h2 id="book-notes-heading">Notes for your barber</h2>
          <p>Optional — anything they should know? e.g. "Keep length on top, fade on the sides."</p>
        </div>
      </header>
      <textarea
        className="book-notes"
        placeholder="Share your preferences…"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={500}
      />
    </section>
  )
}

function SummaryPanel({
  service,
  barber,
  dateLabel,
  selectedTime,
  isReady,
  onConfirm,
  submitState,
}) {
  const total = service ? service.price : 0

  return (
    <aside className="book-summary" aria-label="Booking summary">
      <p className="customer-eyebrow">Your appointment</p>

      <ul className="book-summary-rows">
        <li>
          <span className="book-summary-icon"><Icon name="check" /></span>
          <span>
            <small>SERVICE</small>
            <strong>{service ? service.name : <em>Select a service</em>}</strong>
          </span>
        </li>
        <li>
          <span className="book-summary-icon"><Icon name="user" /></span>
          <span>
            <small>BARBER</small>
            <strong>{barber ? barber.name : <em>Select a barber</em>}</strong>
          </span>
        </li>
        <li>
          <span className="book-summary-icon"><Icon name="calendar" /></span>
          <span>
            <small>DATE & TIME</small>
            <strong>
              {dateLabel && selectedTime ? (
                `${dateLabel} · ${selectedTime}`
              ) : (
                <em>Select a date & time</em>
              )}
            </strong>
          </span>
        </li>
        <li>
          <span className="book-summary-icon"><Icon name="pin" /></span>
          <span>
            <small>LOCATION</small>
            <strong>Blade & Co. Downtown</strong>
          </span>
        </li>
      </ul>

      <div className="book-summary-prices">
        <div>
          <span>Service</span>
          <span>{service ? `$${service.price.toFixed(2)}` : '—'}</span>
        </div>
        <div className="book-summary-total">
          <span>Total today</span>
          <span>{service ? `$${total}` : '—'}</span>
        </div>
      </div>

      <button
        className="book-confirm"
        type="button"
        disabled={!isReady || submitState?.status === 'saving'}
        onClick={onConfirm}
      >
        {submitState?.status === 'saving' ? 'Booking...' : 'Confirm booking'}
      </button>
      {submitState?.status === 'error' && (
        <p className="book-error">{submitState.message || 'Something went wrong.'}</p>
      )}
      <p className="book-fineprint">
        Free cancellation up to 2 hours before. We'll text you a reminder the day before.
      </p>
    </aside>
  )
}

export default function BookAppointmentPage({
  onBack,
  onOpenSidebar,
  onNavigate,
  onAppointmentsChange,
  session,
}) {
  const {
    services,
    loading: servicesLoading,
    error: servicesError,
    usingFallback: servicesUsingFallback,
  } = useServices()
  const [serviceId, setServiceId] = useState(
    () => readBookingDraft()?.serviceId || readBookingDraft()?.serviceSlug || readBookingDraft()?.serviceName || 'classic-fade-beard',
  )
  const [barberId, setBarberId] = useState(() => readBookingDraft()?.barberId || null)
  const [selectedDay, setSelectedDay] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedDateLabel, setSelectedDateLabel] = useState('')
  const [selectedTime, setSelectedTime] = useState(null)
  const [notes, setNotes] = useState('')

  const [barbers, setBarbers] = useState([])
  const [barbersLoading, setBarbersLoading] = useState(true)
  const [barbersError, setBarbersError] = useState('')
  const [takenSlotsData, setTakenSlotsData] = useState(new Set())
  const [takenSlotsKey, setTakenSlotsKey] = useState('')
  const [takenSlotsLoading, setTakenSlotsLoading] = useState(false)
  const [takenSlotsError, setTakenSlotsError] = useState('')
  const [favoriteIds, setFavoriteIds] = useState(new Set())
  const [toast, setToast] = useState('')
  const userId = session?.user?.id

  const [now, setNow] = useState(() => new Date())
  const [cursor, setCursor] = useState(() => {
    const today = new Date()
    return {
      year: today.getFullYear(),
      month: today.getMonth(),
    }
  })

  const [submitState, setSubmitState] = useState({ status: 'idle', message: '' })

  useEffect(() => {
    clearBookingDraft()
  }, [])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date())
    }, 30000)
    return () => window.clearInterval(intervalId)
  }, [])

  // Fetch barbers from DB
  useEffect(() => {
    let cancelled = false
    supabase
      .from('barbers')
      .select('id, fullname, initials, specialty, location, rating, review_count')
      .eq('active', true)
      .order('rating', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setBarbers([])
          setBarbersError(error.message)
          setBarbersLoading(false)
          return
        }
        setBarbers(data || [])
        setBarbersLoading(false)
      })
      .catch((error) => {
        if (cancelled) return
        setBarbers([])
        setBarbersError(error.message || 'Unable to load barbers.')
        setBarbersLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Fetch user's favourite barber ids
  useEffect(() => {
    if (!userId) return undefined
    let cancelled = false
    supabase
      .from('favorites')
      .select('barber_id')
      .eq('customer_id', userId)
      .then(({ data }) => {
        if (cancelled) return
        setFavoriteIds(new Set((data || []).map((r) => r.barber_id)))
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  const handleToggleFavorite = async (barberId, shouldSave) => {
    if (!userId || !barberId) return
    // Optimistic
    setFavoriteIds((prev) => {
      const next = new Set(prev)
      if (shouldSave) next.add(barberId)
      else next.delete(barberId)
      return next
    })
    if (shouldSave) {
      const { error } = await supabase
        .from('favorites')
        .insert({ customer_id: userId, barber_id: barberId })
      if (error && error.code !== '23505') {
        // 23505 = unique violation (already saved) — ignore
        setFavoriteIds((prev) => {
          const next = new Set(prev)
          next.delete(barberId)
          return next
        })
        setToast(`Couldn't save favourite: ${error.message}`)
      }
    } else {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('customer_id', userId)
        .eq('barber_id', barberId)
      if (error) {
        setFavoriteIds((prev) => {
          const next = new Set(prev)
          next.add(barberId)
          return next
        })
        setToast(`Couldn't remove favourite: ${error.message}`)
      }
    }
  }

  const slotsKey =
    barberId && selectedDate
      ? `${barberId}|${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}`
      : ''

  // Fetch taken slots for selected barber+day
  useEffect(() => {
    let cancelled = false
    if (!slotsKey || !barberId || !selectedDate) {
      queueMicrotask(() => {
        if (cancelled) return
        setTakenSlotsData(new Set())
        setTakenSlotsKey('')
        setTakenSlotsLoading(false)
        setTakenSlotsError('')
      })
      return () => {
        cancelled = true
      }
    }
    queueMicrotask(() => {
      if (cancelled) return
      setTakenSlotsLoading(true)
      setTakenSlotsError('')
    })
    const dayStart = new Date(selectedDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(selectedDate)
    dayEnd.setHours(23, 59, 59, 999)

    supabase
      .from('appointments')
      .select('scheduled_at')
      .eq('barber_id', barberId)
      .eq('status', 'scheduled')
      .gte('scheduled_at', dayStart.toISOString())
      .lte('scheduled_at', dayEnd.toISOString())
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setTakenSlotsData(new Set())
          setTakenSlotsKey(slotsKey)
          setTakenSlotsError(error.message)
          setTakenSlotsLoading(false)
          return
        }
        const slotSet = new Set()
        ;(data || []).forEach((row) => {
          const d = new Date(row.scheduled_at)
          let hour = d.getHours()
          const minute = d.getMinutes()
          const ampm = hour >= 12 ? 'PM' : 'AM'
          if (hour === 0) hour = 12
          else if (hour > 12) hour -= 12
          slotSet.add(`${hour}:${String(minute).padStart(2, '0')} ${ampm}`)
        })
        setTakenSlotsData(slotSet)
        setTakenSlotsKey(slotsKey)
        setTakenSlotsLoading(false)
      })
      .catch((error) => {
        if (cancelled) return
        setTakenSlotsData(new Set())
        setTakenSlotsKey(slotsKey)
        setTakenSlotsError(error.message || 'Unable to check availability.')
        setTakenSlotsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slotsKey, barberId, selectedDate])

  const takenSlots =
    slotsKey && takenSlotsKey === slotsKey ? takenSlotsData : new Set()

  const calendarRows = useMemo(
    () => buildCalendar(cursor.year, cursor.month, now),
    [cursor.year, cursor.month, now],
  )
  const monthLabel = monthLabelOf(cursor.year, cursor.month)

  const canGoBack =
    cursor.year > now.getFullYear() ||
    (cursor.year === now.getFullYear() && cursor.month > now.getMonth())

  const service = useMemo(() => {
    if (services.length === 0) return null
    const target = String(serviceId || '').toLowerCase()
    return (
      services.find(
        (s) => s.id === serviceId || s.slug === serviceId || s.name.toLowerCase() === target,
      ) || services[0]
    )
  }, [services, serviceId])
  const barber = useMemo(
    () => barbers.find((b) => b.id === barberId) || null,
    [barbers, barberId],
  )

  const isReady = Boolean(
    service && barber && selectedDate && selectedTime && session?.user?.id,
  )

  useEffect(() => {
    if (selectedTime && isPastTimeSlot(selectedDate, selectedTime, now)) {
      queueMicrotask(() => setSelectedTime(null))
    }
  }, [selectedDate, selectedTime, now])

  useEffect(() => {
    if (
      selectedTime &&
      slotsKey &&
      takenSlotsKey === slotsKey &&
      takenSlotsData.has(selectedTime)
    ) {
      queueMicrotask(() => setSelectedTime(null))
    }
  }, [selectedTime, slotsKey, takenSlotsData, takenSlotsKey])

  const handleSelectDay = (day, label, date) => {
    setSelectedDay(day)
    setSelectedDate(date || null)
    setSelectedDateLabel(label || `${MONTH_NAMES[cursor.month].slice(0, 3)} ${day}`)
    setSelectedTime(null)
  }

  const handlePrevMonth = () => {
    setCursor((c) => {
      const month = c.month === 0 ? 11 : c.month - 1
      const year = c.month === 0 ? c.year - 1 : c.year
      return { year, month }
    })
  }

  const handleNextMonth = () => {
    setCursor((c) => {
      const month = c.month === 11 ? 0 : c.month + 1
      const year = c.month === 11 ? c.year + 1 : c.year
      return { year, month }
    })
  }

  const handleConfirm = async () => {
    if (!isReady || submitState.status === 'saving') return
    if (takenSlotsLoading) {
      setSubmitState({ status: 'error', message: 'Wait for availability to finish checking.' })
      return
    }
    if (takenSlots.has(selectedTime)) {
      setSubmitState({ status: 'error', message: 'That time was just booked. Pick another slot.' })
      return
    }
    const scheduledAt = buildScheduledAt(selectedDate, selectedTime)
    if (!scheduledAt || scheduledAt < new Date()) {
      setSubmitState({ status: 'error', message: 'Pick a time in the future.' })
      return
    }

    setSubmitState({ status: 'saving', message: '' })
    const { error } = await supabase.from('appointments').insert({
      customer_id: session.user.id,
      barber_id: barber.id,
      service: service.name,
      ...(service.source === 'db' ? { service_id: service.id } : {}),
      scheduled_at: scheduledAt.toISOString(),
      duration_minutes: service.duration,
      location: barber.location || 'Downtown',
      price_cents: Math.round(service.price * 100),
      status: 'scheduled',
      notes: notes || null,
    })

    if (error) {
      setSubmitState({ status: 'error', message: error.message })
      return
    }

    setSubmitState({ status: 'success', message: '' })
    onAppointmentsChange?.()
    if (onNavigate) onNavigate('appointments')
  }

  const currentStep = service
    ? barber && selectedTime
      ? 2
      : 1
    : 0

  return (
    <section className="customer-main book-page" aria-label="Book appointment">
      <Toast message={toast} onClose={() => setToast('')} />
      <button
        aria-label="Open navigation"
        className="customer-square-button customer-mobile-menu-button book-mobile-menu"
        type="button"
        onClick={onOpenSidebar}
      >
        <svg aria-hidden="true" className="customer-icon" viewBox="0 0 24 24" fill="none">
          <path d="M4.5 7h15" />
          <path d="M4.5 12h15" />
          <path d="M4.5 17h15" />
        </svg>
      </button>
      <nav className="book-breadcrumb" aria-label="Breadcrumb">
        <a
          href="#dashboard"
          onClick={(event) => {
            event.preventDefault()
            onBack?.()
          }}
        >
          Home
        </a>
        <span aria-hidden="true">/</span>
        <span>Book appointment</span>
      </nav>

      <header className="book-header">
        <div className="book-heading">
          <h1>
            Book a <span>cut.</span>
          </h1>
          <p>Pick a service, choose your barber, and lock in a time. Takes about 30 seconds.</p>
        </div>
        <Stepper currentStep={currentStep} />
      </header>

      <div className="book-layout">
        <div className="book-form-column">
          <ServicePanel
            selected={service?.id || serviceId}
            onSelect={setServiceId}
            services={services}
            loading={servicesLoading}
            error={servicesError}
            usingFallback={servicesUsingFallback}
          />
          <BarberPanel
            selected={barberId}
            onSelect={setBarberId}
            barbers={barbers}
            loading={barbersLoading}
            error={barbersError}
            favoriteIds={favoriteIds}
            onToggleFavorite={handleToggleFavorite}
          />
          <WhenPanel
            selectedBarberName={barber?.fullname || ''}
            selectedDay={selectedDay}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            onSelectDay={handleSelectDay}
            onSelectTime={setSelectedTime}
            monthLabel={monthLabel}
            calendarRows={calendarRows}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            canGoBack={canGoBack}
            takenSlots={takenSlots}
            takenSlotsLoading={takenSlotsLoading}
            takenSlotsError={takenSlotsError}
            now={now}
          />
          <NotesPanel value={notes} onChange={setNotes} />
        </div>

        <SummaryPanel
          service={service}
          barber={barber ? { ...barber, name: barber.fullname } : null}
          dateLabel={selectedDateLabel}
          selectedTime={selectedTime}
          isReady={isReady}
          onConfirm={handleConfirm}
          submitState={submitState}
        />
      </div>
    </section>
  )
}
