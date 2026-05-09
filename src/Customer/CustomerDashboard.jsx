import { useState } from 'react'

const navItems = [
  { icon: 'home', label: 'Home', active: true },
  { icon: 'calendar-plus', label: 'Book appointment' },
  { icon: 'calendar', label: 'My appointments', badge: 2 },
  { icon: 'history', label: 'History' },
  { icon: 'star', label: 'Favourites' },
]

const accountItems = [
  { icon: 'user', label: 'My profile' },
  { icon: 'bell', label: 'Notifications', badge: 1 },
  { icon: 'settings', label: 'Settings' },
]

const quickActions = [
  {
    icon: 'calendar-plus',
    title: 'Book new appointment',
    description: 'Pick service, barber & time',
    primary: true,
  },
  {
    icon: 'rotate',
    title: 'Rebook last cut',
    description: 'Classic Fade - w/ Jordan',
  },
  {
    icon: 'star',
    title: 'My favorites',
    description: '3 saved barbers',
  },
  {
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

function Icon({ name }) {
  const commonProps = {
    'aria-hidden': true,
    className: 'customer-icon',
    viewBox: '0 0 24 24',
    fill: 'none',
  }

  const paths = {
    home: (
      <>
        <path d="m4 10 8-6 8 6" />
        <path d="M6.5 9.5V20h11V9.5" />
        <path d="M10 20v-6h4v6" />
      </>
    ),
    'calendar-plus': (
      <>
        <path d="M6.5 4v3M17.5 4v3M4.75 8.25h14.5M5.75 5.75h12.5v14H5.75z" />
        <path d="M12 11.25v5.5M9.25 14h5.5" />
      </>
    ),
    calendar: (
      <>
        <path d="M6.5 4v3M17.5 4v3M4.75 8.25h14.5M5.75 5.75h12.5v14H5.75z" />
        <path d="M8.75 12h2M13.25 12h2M8.75 15.25h2M13.25 15.25h2" />
      </>
    ),
    history: (
      <>
        <path d="M4.5 7.25V3.75M4.5 7.25h3.5" />
        <path d="M5.15 7.5a7.25 7.25 0 1 1 .75 9" />
        <path d="M12 8v4.4l3 1.8" />
      </>
    ),
    star: (
      <path d="m12 4 2.35 4.75 5.25.77-3.8 3.7.9 5.22L12 15.97l-4.7 2.47.9-5.22-3.8-3.7 5.25-.77z" />
    ),
    user: (
      <>
        <path d="M12 12.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        <path d="M4.75 20a7.25 7.25 0 0 1 14.5 0" />
      </>
    ),
    bell: (
      <>
        <path d="M18.25 16.25H5.75l1.4-1.9V10a4.85 4.85 0 0 1 9.7 0v4.35z" />
        <path d="M10 18.25a2 2 0 0 0 4 0" />
      </>
    ),
    settings: (
      <>
        <path d="M12 15.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Z" />
        <path d="m18.45 13.35.95 1.82-2.3 2.3-1.82-.95a7.4 7.4 0 0 1-1.45.6L13.2 19.1H9.95l-.62-1.98a7.4 7.4 0 0 1-1.45-.6l-1.82.95-2.3-2.3.95-1.82a7.4 7.4 0 0 1-.6-1.45L2.13 11.3V8.05l1.98-.62c.15-.5.35-.98.6-1.45l-.95-1.82 2.3-2.3 1.82.95c.47-.25.95-.45 1.45-.6l.62-1.98h3.25l.63 1.98c.5.15.98.35 1.45.6l1.82-.95 2.3 2.3-.95 1.82c.25.47.45.95.6 1.45l1.98.62v3.25l-1.98.6c-.15.5-.35.98-.6 1.45Z" />
      </>
    ),
    search: (
      <>
        <path d="M10.75 17.25a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Z" />
        <path d="m15.5 15.5 4.25 4.25" />
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
    receipt: (
      <>
        <path d="M6.5 4.75h11v14.5l-2-1.1-2 1.1-2-1.1-2 1.1-2-1.1-2 1.1z" />
        <path d="M9 9h6M9 12h6M9 15h3.5" />
      </>
    ),
    rotate: (
      <>
        <path d="M5.75 7.75a7.25 7.25 0 1 1-.6 7.45" />
        <path d="M5.75 3.75v4h4" />
      </>
    ),
    menu: (
      <>
        <path d="M4.5 7h15" />
        <path d="M4.5 12h15" />
        <path d="M4.5 17h15" />
      </>
    ),
    close: (
      <>
        <path d="M6.5 6.5 17.5 17.5" />
        <path d="m17.5 6.5-11 11" />
      </>
    ),
    logout: (
      <>
        <path d="M10 5.25H5.75v13.5H10" />
        <path d="M13.25 8.25 17 12l-3.75 3.75" />
        <path d="M17 12H8.75" />
      </>
    ),
  }

  return (
    <svg {...commonProps}>
      {paths[name]}
    </svg>
  )
}

function SidebarSection({ label, items }) {
  return (
    <div className="customer-nav-section">
      {label && <p className="customer-nav-label">{label}</p>}
      <nav aria-label={label || 'Primary'}>
        {items.map((item) => (
          <a
            className={`customer-nav-item${item.active ? ' is-active' : ''}`}
            href="#dashboard"
            key={item.label}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
            {item.badge && <span className="customer-nav-badge">{item.badge}</span>}
          </a>
        ))}
      </nav>
    </div>
  )
}

function CustomerSidebar({ isOpen, onClose, onLogoutRequest }) {
  return (
    <aside
      className={`customer-sidebar${isOpen ? ' is-open' : ''}`}
      aria-label="Customer navigation"
    >
      <div className="customer-brand">
        <span className="customer-brand-mark">B</span>
        <strong>BLADE & CO.</strong>
        <button
          aria-label="Close navigation"
          className="customer-sidebar-close"
          type="button"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>

      <SidebarSection items={navItems} />
      <SidebarSection label="Account" items={accountItems} />

      <button className="customer-nav-item customer-logout-item" type="button" onClick={onLogoutRequest}>
        <Icon name="logout" />
        <span>Log out</span>
      </button>

      <div className="customer-user-foot">
        <span className="customer-avatar">M</span>
        <span>
          <strong>Marcus R.</strong>
          <small>Member - Gold</small>
        </span>
        <button aria-label="Open account menu" type="button">
          ...
        </button>
      </div>
    </aside>
  )
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

function LogoutDialog({ onCancel, onConfirm }) {
  return (
    <div className="customer-modal-backdrop" role="presentation">
      <section
        aria-labelledby="logout-dialog-heading"
        aria-modal="true"
        className="customer-logout-modal"
        role="dialog"
      >
        <h2 id="logout-dialog-heading">Are you sure want to log out?</h2>
        <p>You will return to the sign in page.</p>
        <div className="customer-modal-actions">
          <button className="customer-button customer-button-cancel" type="button" onClick={onCancel}>
            No
          </button>
          <button className="customer-button customer-button-primary" type="button" onClick={onConfirm}>
            Yes, log out
          </button>
        </div>
      </section>
    </div>
  )
}

function HeroSection() {
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
            <Icon name="clock" />
            45 min
          </span>
          <span>
            <Icon name="pin" />
            Blade & Co. - Downtown
          </span>
        </div>

        <div className="customer-hero-actions">
          <button className="customer-button customer-button-primary" type="button">
            <Icon name="pin" />
            Get directions
          </button>
          <button className="customer-button customer-button-light" type="button">
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

function QuickActions() {
  return (
    <section className="customer-quick-grid" aria-label="Quick actions">
      {quickActions.map((action) => (
        <a
          className={`customer-quick-card${action.primary ? ' is-primary' : ''}`}
          href="#dashboard"
          key={action.title}
        >
          <span className="customer-quick-icon">
            <Icon name={action.icon} />
          </span>
          <strong>{action.title}</strong>
          <small>{action.description}</small>
        </a>
      ))}
    </section>
  )
}

function FavoriteBarbers() {
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
            <button className="customer-book-button" type="button">
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

export default function CustomerDashboard({ onLogout }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false)

  const openLogoutDialog = () => {
    setIsSidebarOpen(false)
    setIsLogoutDialogOpen(true)
  }

  const confirmLogout = () => {
    setIsLogoutDialogOpen(false)
    onLogout?.()
  }

  return (
    <main className="customer-dashboard">
      <CustomerSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onLogoutRequest={openLogoutDialog}
      />
      <button
        aria-label="Close navigation"
        className={`customer-sidebar-backdrop${isSidebarOpen ? ' is-open' : ''}`}
        type="button"
        onClick={() => setIsSidebarOpen(false)}
      />
      <section className="customer-main" aria-label="Customer dashboard">
        <TopBar onOpenSidebar={() => setIsSidebarOpen(true)} />
        <HeroSection />
        <QuickActions />
        <div className="customer-two-column">
          <FavoriteBarbers />
          <LoyaltyPanel />
        </div>
        <RecentVisits />
      </section>
      {isLogoutDialogOpen && (
        <LogoutDialog
          onCancel={() => setIsLogoutDialogOpen(false)}
          onConfirm={confirmLogout}
        />
      )}
    </main>
  )
}
