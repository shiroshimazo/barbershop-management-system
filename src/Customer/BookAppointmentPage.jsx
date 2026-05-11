import { useMemo, useState } from 'react'

const services = [
  {
    id: 'classic-fade-beard',
    name: 'Classic Fade + Beard Trim',
    price: 48,
    duration: 45,
    descriptor: 'Most popular',
    tag: 'Signature',
  },
  {
    id: 'skin-fade',
    name: 'Skin Fade',
    price: 40,
    duration: 40,
    descriptor: 'Sharp lines',
  },
  {
    id: 'classic-cut',
    name: 'Classic Cut',
    price: 35,
    duration: 30,
    descriptor: 'Scissor & comb',
  },
  {
    id: 'beard-sculpt',
    name: 'Beard Sculpt & Hot Towel',
    price: 32,
    duration: 30,
    descriptor: 'Includes oil',
  },
  {
    id: 'full-service',
    name: 'The Full Service',
    price: 75,
    duration: 75,
    descriptor: 'Cut + beard + treatment',
    tag: 'Premium',
  },
  {
    id: 'kids-cut',
    name: "Kid's Cut",
    price: 22,
    duration: 25,
    descriptor: 'Under 12',
  },
]

const barbers = [
  {
    id: 'any',
    name: 'Any available',
    initials: '?',
    role: 'Fastest booking',
    location: '',
    rating: 'First open',
    isWildcard: true,
  },
  {
    id: 'jordan',
    name: 'Jordan Tate',
    initials: 'JT',
    role: 'Senior cuts',
    location: 'Downtown',
    rating: '5.0',
  },
  {
    id: 'sami',
    name: 'Sami Kade',
    initials: 'SK',
    role: 'Beard sculpting',
    location: 'Eastside',
    rating: '4.8',
  },
  {
    id: 'rey',
    name: 'Rey Vargas',
    initials: 'RV',
    role: 'Designs & skin fades',
    location: 'Downtown',
    rating: '4.9',
  },
]

const timeGroups = [
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
      { time: '3:00 PM', disabled: true },
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

const monthLabel = 'May 2026'
const calendarRows = [
  [
    { day: 26, muted: true },
    { day: 27, muted: true },
    { day: 28, muted: true },
    { day: 29, muted: true },
    { day: 30, muted: true },
    { day: 1 },
    { day: 2 },
  ],
  [
    { day: 3, disabled: true },
    { day: 4, disabled: true },
    { day: 5, disabled: true },
    { day: 6, disabled: true },
    { day: 7, disabled: true },
    { day: 8, today: true },
    { day: 9 },
  ],
  [
    { day: 10 },
    { day: 11, dateLabel: 'Mon, May 11' },
    { day: 12 },
    { day: 13 },
    { day: 14 },
    { day: 15 },
    { day: 16 },
  ],
  [
    { day: 17 },
    { day: 18 },
    { day: 19 },
    { day: 20 },
    { day: 21 },
    { day: 22 },
    { day: 23 },
  ],
  [
    { day: 24 },
    { day: 25 },
    { day: 26 },
    { day: 27 },
    { day: 28 },
    { day: 29 },
    { day: 30 },
  ],
  [
    { day: 31 },
    { day: 1, muted: true },
    { day: 2, muted: true },
    { day: 3, muted: true },
    { day: 4, muted: true },
    { day: 5, muted: true },
    { day: 6, muted: true },
  ],
]

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

function ServicePanel({ selected, onSelect }) {
  return (
    <section className="book-panel" aria-labelledby="book-service-heading">
      <header className="book-panel-head">
        <span className="book-panel-num">1</span>
        <div>
          <h2 id="book-service-heading">Choose a service</h2>
          <p>Pick a single service — you can add upgrades at checkout.</p>
        </div>
      </header>

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
              <span><Icon name="clock" />{svc.duration} min</span>
              <span className="book-service-dot">·</span>
              <span>{svc.descriptor}</span>
            </p>
            {svc.tag && <span className="book-service-tag">{svc.tag}</span>}
          </button>
        ))}
      </div>
    </section>
  )
}

function BarberPanel({ selected, onSelect }) {
  return (
    <section className="book-panel" aria-labelledby="book-barber-heading">
      <header className="book-panel-head">
        <span className="book-panel-num">2</span>
        <div>
          <h2 id="book-barber-heading">Pick your barber</h2>
          <p>Or let us assign the first available — it's faster.</p>
        </div>
      </header>

      <div className="book-barber-grid">
        {barbers.map((barber) => (
          <button
            className={`book-barber-card${selected === barber.id ? ' is-selected' : ''}${
              barber.isWildcard ? ' is-wildcard' : ''
            }`}
            key={barber.id}
            type="button"
            onClick={() => onSelect(barber.id)}
          >
            <span className="book-barber-radio" aria-hidden="true" />
            <span className="book-barber-avatar">{barber.initials}</span>
            <strong>{barber.name}</strong>
            <small>
              {barber.role}
              {barber.location && ` · ${barber.location}`}
            </small>
            <span className="book-barber-rating">
              {barber.isWildcard ? barber.rating : <>★ {barber.rating}</>}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

function WhenPanel({
  selectedBarberName,
  selectedDay,
  selectedTime,
  onSelectDay,
  onSelectTime,
}) {
  return (
    <section className="book-panel" aria-labelledby="book-when-heading">
      <header className="book-panel-head">
        <span className="book-panel-num">3</span>
        <div>
          <h2 id="book-when-heading">When works for you?</h2>
          <p>
            {selectedBarberName === 'Any available'
              ? "Times below are based on the shop's open chairs."
              : `Times below are based on ${selectedBarberName.split(' ')[0]}'s schedule.`}
          </p>
        </div>
      </header>

      <div className="book-when-grid">
        <div className="book-calendar" aria-label="Calendar">
          <div className="book-calendar-head">
            <button className="book-calendar-nav" type="button" aria-label="Previous month">
              <Icon name="chevronLeft" />
            </button>
            <strong>{monthLabel}</strong>
            <button className="book-calendar-nav" type="button" aria-label="Next month">
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
                    !cell.muted && !cell.disabled && onSelectDay(cell.day, cell.dateLabel)
                  }
                >
                  {cell.day}
                </button>
              )
            })}
          </div>
        </div>

        <div className="book-times" aria-label="Available times">
          {timeGroups.map((group) => (
            <div className="book-time-group" key={group.label}>
              <p className="book-time-label">{group.label}</p>
              <div className="book-time-grid">
                {group.slots.map((slot) => {
                  const time = typeof slot === 'string' ? slot : slot.time
                  const disabled = typeof slot === 'object' && slot.disabled
                  const isSelected = time === selectedTime
                  return (
                    <button
                      className={`book-time${isSelected ? ' is-selected' : ''}${
                        disabled ? ' is-disabled' : ''
                      }`}
                      key={time}
                      type="button"
                      disabled={disabled}
                      onClick={() => onSelectTime(time)}
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
}) {
  const loyaltyDiscount = 5
  const total = service ? service.price - loyaltyDiscount : 0

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
        <div>
          <span>Loyalty discount</span>
          <span className="book-discount">{service ? `–$${loyaltyDiscount.toFixed(2)}` : '—'}</span>
        </div>
        <div className="book-summary-total">
          <span>Total today</span>
          <span>{service ? `$${total}` : '—'}</span>
        </div>
      </div>

      <button
        className="book-confirm"
        type="button"
        disabled={!isReady}
        onClick={onConfirm}
      >
        Confirm booking
      </button>
      <p className="book-fineprint">
        Free cancellation up to 2 hours before. We'll text you a reminder the day before.
      </p>
    </aside>
  )
}

export default function BookAppointmentPage({ onBack, onOpenSidebar }) {
  const [serviceId, setServiceId] = useState('classic-fade-beard')
  const [barberId, setBarberId] = useState('jordan')
  const [selectedDay, setSelectedDay] = useState(11)
  const [selectedDateLabel, setSelectedDateLabel] = useState('Mon, May 11')
  const [selectedTime, setSelectedTime] = useState('2:30 PM')
  const [notes, setNotes] = useState('')

  const service = useMemo(
    () => services.find((s) => s.id === serviceId) || null,
    [serviceId],
  )
  const barber = useMemo(
    () => barbers.find((b) => b.id === barberId) || null,
    [barberId],
  )

  const isReady = Boolean(service && barber && selectedDay && selectedTime)

  const handleSelectDay = (day, label) => {
    setSelectedDay(day)
    if (label) {
      setSelectedDateLabel(label)
    } else {
      setSelectedDateLabel(`May ${day}`)
    }
  }

  const handleConfirm = () => {
    if (!isReady) return
    window.alert(
      `Booking confirmed!\n\n${service.name} with ${barber.name}\n${selectedDateLabel} · ${selectedTime}`,
    )
  }

  const currentStep = service ? (barber && selectedTime ? 2 : 1) : 0

  return (
    <section className="customer-main book-page" aria-label="Book appointment">
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
          <ServicePanel selected={serviceId} onSelect={setServiceId} />
          <BarberPanel selected={barberId} onSelect={setBarberId} />
          <WhenPanel
            selectedBarberName={barber?.name || 'Any available'}
            selectedDay={selectedDay}
            selectedTime={selectedTime}
            onSelectDay={handleSelectDay}
            onSelectTime={setSelectedTime}
          />
          <NotesPanel value={notes} onChange={setNotes} />
        </div>

        <SummaryPanel
          service={service}
          barber={barber}
          dateLabel={selectedDateLabel}
          selectedTime={selectedTime}
          isReady={isReady}
          onConfirm={handleConfirm}
        />
      </div>
    </section>
  )
}
