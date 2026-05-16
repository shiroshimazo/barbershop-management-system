import {
  FiBell,
  FiCalendar,
  FiClock,
  FiDollarSign,
  FiFileText,
  FiGift,
  FiHome,
  FiLogOut,
  FiMenu,
  FiRefreshCw,
  FiScissors,
  FiSettings,
  FiSliders,
  FiStar,
  FiUser,
  FiUserPlus,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import { adminNavSections } from './adminShared.js'

const iconComponents = {
  bell: FiBell,
  calendar: FiCalendar,
  clock: FiClock,
  close: FiX,
  customers: FiUsers,
  dollar: FiDollarSign,
  gift: FiGift,
  home: FiHome,
  logout: FiLogOut,
  menu: FiMenu,
  refresh: FiRefreshCw,
  reports: FiFileText,
  scissors: FiScissors,
  services: FiSliders,
  settings: FiSettings,
  star: FiStar,
  user: FiUser,
  walkin: FiUserPlus,
}

export function Icon({ name }) {
  const IconComponent = iconComponents[name] || FiHome
  return <IconComponent aria-hidden="true" className="customer-icon" focusable="false" />
}

export function AdminSidebar({
  activeId,
  isOpen,
  onClose,
  onSelect,
  onLogoutRequest,
  upcomingCount,
}) {
  return (
    <aside className={`customer-sidebar${isOpen ? ' is-open' : ''}`} aria-label="Admin navigation">
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

      {adminNavSections.map((section, index) => (
        <div
          className={`customer-nav-section${section.divider ? ' admin-nav-separated' : ''}`}
          key={section.label || `admin-primary-${index}`}
        >
          {section.label && <p className="customer-nav-label">{section.label}</p>}
          <nav aria-label={section.label ? `${section.label} sections` : 'Admin primary sections'}>
            {section.items.map((item) => (
              <a
                className={`customer-nav-item${activeId === item.id ? ' is-active' : ''}`}
                href={`#${
                  item.id === 'appointments' || item.id === 'customers' ? item.id : 'dashboard'
                }`}
                key={item.id}
                onClick={(event) => {
                  event.preventDefault()
                  onSelect(item)
                }}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
                {item.id === 'appointments' && upcomingCount > 0 && (
                  <span className="customer-nav-badge">{upcomingCount}</span>
                )}
              </a>
            ))}
          </nav>
        </div>
      ))}

      <button className="customer-logout-foot" type="button" onClick={onLogoutRequest}>
        <span className="customer-logout-icon">
          <Icon name="logout" />
        </span>
        <span className="customer-logout-text">
          <strong>Log out</strong>
          <small>End admin session</small>
        </span>
      </button>
    </aside>
  )
}
