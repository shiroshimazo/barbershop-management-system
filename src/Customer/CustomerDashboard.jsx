import { Icon } from './CustomerShell.jsx'

const quickActions = [
  {
    id: 'book',
    icon: 'calendar-plus',
    title: 'Book new appointment',
    description: 'Pick service, barber & time',
    primary: true,
  },
  {
    id: 'rebook',
    icon: 'rotate',
    title: 'Rebook last cut',
    description: 'Classic Fade - w/ Jordan',
  },
  {
    id: 'favourites',
    icon: 'star',
    title: 'My favorites',
    description: '3 saved barbers',
  },
  {
    id: 'history',
    icon: 'receipt',
    title: 'Receipts',
    description: 'Last 12 visits',
  },
]

const favoriteBarbers = [
  {
    initials: 'JT',
    name: 'Jordan Tate',
    specialty: 'Classic cuts & fades',
    location: 'Downtown',
    rating: '5.0',
    reviews: 218,
  },
  {
    initials: 'SK',
    name: 'Sami Kade',
    specialty: 'Beard sculpting',
    location: 'Eastside',
    rating: '4.8',
    reviews: 164,
  },
  {
    initials: 'RV',
    name: 'Rey Vargas',
    specialty: 'Skin fades & designs',
    location: 'Downtown',
    rating: '4.9',
    reviews: 302,
  },
]

const recentVisits = [
  {
    month: 'APR',
    day: '22',
    date: '2026-04-22',
    service: 'Classic Fade + Beard Trim',
    details: 'Jordan Tate - Downtown - $48',
  },
  {
    month: 'MAR',
    day: '28',
    date: '2026-03-28',
    service: 'Skin Fade',
    details: 'Rey Vargas - Downtown - $40',
  },
  {
    month: 'MAR',
    day: '02',
    date: '2026-03-02',
    service: 'Beard Sculpt & Hot Towel',
    details: 'Sami Kade - Eastside - $35',
  },
  {
    month: 'FEB',
    day: '08',
    date: '2026-02-08',
    service: 'Classic Fade',
    details: 'Jordan Tate - Downtown - $40',
  },
]

function HomeIcon({ name }) {
  // Local icon for shapes only used in dashboard hero/quick/visits.
  const commonProps = {
    'aria-hidden': true,
    className: 'customer-icon',
    viewBox: '0 0 24 24',
    fill: 'none',
  }
  const paths = {
    rotate: (
      <>
        <path d="M5.75 7.75a7.25 7.25 0 1 1-.6 7.45" />
        <path d="M5.75 3.75v4h4" />
      </>
    ),
    receipt: (
      <>
        <path d="M6.5 4.75h11v14.5l-2-1.1-2 1.1-2-1.1-2 1.1-2-1.1-2 1.1z" />
        <path d="M9 9h6M9 12h6M9 15h3.5" />
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
  }
  if (paths[name]) {
    return <svg {...commonProps}>{paths[name]}</svg>
  }
  return <Icon name={name} />
}

function TopBar({ onOpenSidebar }) {
  return (
    <header className="customer-topbar">
      <div className="customer-topbar-title">
        <button
          aria-label="Open navigation"
          className="customer-square-button customer-mobile-menu-button"
          type="button"
          onClick={onOpenSidebar}
        >
          <Icon name="menu" />
        </button>
        <div>
          <h1>Welcome back, Marcus</h1>
          <p>Friday, May 8 - Your next cut is in 3 days</p>
        </div>
      </div>

      <div className="customer-topbar-actions">
        <label className="customer-search" htmlFor="customer-search">
          <Icon name="search" />
          <span className="sr-only">Search barbers and services</span>
          <input id="customer-search" type="search" placeholder="Search barbers, services..." />
        </label>
        <button className="customer-square-button has-dot" aria-label="Notifications" type="button">
          <Icon name="bell" />
        </button>
        <span className="customer-top-avatar">M</span>
      </div>
    </header>
  )
}

function HeroSection({ onBook }) {
  return (
    <section className="customer-hero" aria-labelledby="next-appointment-heading">
      <div className="customer-hero-copy">
        <p className="customer-eyebrow">Next appointment</p>
        <h2 id="next-appointment-heading">
          Classic Fade
          <br />
          + Beard <span>Trim.</span>
        </h2>

        <div className="customer-hero-meta">
          <span>
            <Icon name="calendar" />
            Mon, May 11 - 2:30 PM
          </span>
          <span>
            <HomeIcon name="clock" />
            45 min
          </span>
          <span>
            <HomeIcon name="pin" />
            Blade & Co. - Downtown
          </span>
        </div>

        <div className="customer-hero-actions">
          <button className="customer-button customer-button-primary" type="button">
            <HomeIcon name="pin" />
            Get directions
          </button>
          <button
            className="customer-button customer-button-light"
            type="button"
            onClick={onBook}
          >
            Reschedule
          </button>
          <button className="customer-button customer-button-light" type="button">
            Cancel
          </button>
        </div>
      </div>

      <article className="customer-hero-card" aria-label="Your barber">
        <p className="customer-eyebrow">Your barber</p>
        <div className="customer-barber-row">
          <span className="customer-avatar customer-avatar-large">JT</span>
          <span>
            <strong>Jordan Tate</strong>
            <small>Senior Barber - 8 yrs</small>
            <span className="customer-stars">*****</span>
          </span>
        </div>
        <div className="customer-countdown" aria-label="Appointment countdown">
          <span>
            <strong>03</strong>
            <small>Days</small>
          </span>
          <span>
            <strong>14</strong>
            <small>Hrs</small>
          </span>
          <span>
            <strong>22</strong>
            <small>Min</small>
          </span>
        </div>
      </article>
    </section>
  )
}

function QuickActions({ onAction }) {
  return (
    <section className="customer-quick-grid" aria-label="Quick actions">
      {quickActions.map((action) => (
        <a
          className={`customer-quick-card${action.primary ? ' is-primary' : ''}`}
          href={`#${action.id}`}
          key={action.title}
          onClick={(event) => {
            event.preventDefault()
            onAction?.(action.id)
          }}
        >
          <span className="customer-quick-icon">
            <HomeIcon name={action.icon} />
          </span>
          <strong>{action.title}</strong>
          <small>{action.description}</small>
        </a>
      ))}
    </section>
  )
}

function FavoriteBarbers({ onBook }) {
  return (
    <section className="customer-panel" aria-labelledby="favorite-barbers-heading">
      <div className="customer-panel-head">
        <h2 id="favorite-barbers-heading">Favorite barbers</h2>
        <a href="#dashboard">{'See all ->'}</a>
      </div>

      <div className="customer-barber-list">
        {favoriteBarbers.map((barber) => (
          <article className="customer-barber-card" key={barber.name}>
            <span className="customer-avatar customer-avatar-square">{barber.initials}</span>
            <div>
              <strong>{barber.name}</strong>
              <small>
                {barber.specialty} - {barber.location}
              </small>
              <span className="customer-rating">
                <span className="customer-stars">*****</span> {barber.rating} ({barber.reviews})
              </span>
            </div>
            <button className="customer-book-button" type="button" onClick={onBook}>
              Book
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}

function LoyaltyPanel() {
  return (
    <aside className="customer-loyalty-column">
      <section className="customer-loyalty" aria-label="Loyalty status">
        <p className="customer-eyebrow">Loyalty - Gold tier</p>
        <div className="customer-loyalty-points">
          <strong>1,240</strong>
          <span>pts</span>
        </div>
        <p>260 points to your next free cut. Earn 25 pts per visit.</p>
        <div className="customer-progress" aria-label="1,240 of 1,500 points">
          <span />
        </div>
        <div className="customer-progress-labels">
          <span>1,240 / 1,500</span>
          <span>Platinum tier</span>
        </div>
      </section>

      <div className="customer-stats-row">
        <article className="customer-stat-card">
          <strong>24</strong>
          <span>Visits this year</span>
        </article>
        <article className="customer-stat-card">
          <strong>2.3 <small>yrs</small></strong>
          <span>Member since 2024</span>
        </article>
      </div>
    </aside>
  )
}

function RecentVisits() {
  return (
    <section className="customer-panel customer-visits" aria-labelledby="recent-visits-heading">
      <div className="customer-panel-head">
        <h2 id="recent-visits-heading">Recent visits</h2>
        <a href="#dashboard">{'View history ->'}</a>
      </div>

      <div className="customer-visit-list">
        {recentVisits.map((visit) => (
          <article className="customer-visit-row" key={`${visit.month}-${visit.day}`}>
            <time className="customer-visit-date" dateTime={visit.date}>
              <span>{visit.month}</span>
              <strong>{visit.day}</strong>
            </time>
            <div className="customer-visit-info">
              <strong>{visit.service}</strong>
              <small>{visit.details}</small>
            </div>
            <div className="customer-visit-actions">
              <button className="customer-chip" type="button">
                Receipt
              </button>
              <button className="customer-chip customer-chip-gold" type="button">
                Rebook
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default function CustomerDashboard({ onOpenSidebar, onNavigate }) {
  const goBook = () => onNavigate?.('book')

  const handleQuick = (id) => {
    if (id === 'book' || id === 'rebook') return goBook()
    onNavigate?.(id)
  }

  return (
    <section className="customer-main" aria-label="Customer dashboard">
      <TopBar onOpenSidebar={onOpenSidebar} />
      <HeroSection onBook={goBook} />
      <QuickActions onAction={handleQuick} />
      <div className="customer-two-column">
        <FavoriteBarbers onBook={goBook} />
        <LoyaltyPanel />
      </div>
      <RecentVisits />
    </section>
  )
}
