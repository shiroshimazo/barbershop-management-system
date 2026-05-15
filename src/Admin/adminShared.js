export const adminNavSections = [
  {
    items: [
      { id: 'dashboard', target: 'overview', icon: 'home', label: 'Dashboard' },
      { id: 'appointments', target: 'appointments', icon: 'calendar', label: 'Appointments' },
      { id: 'customers', target: 'overview', icon: 'customers', label: 'Customers' },
      { id: 'barbers', target: 'availability', icon: 'scissors', label: 'Barbers' },
      { id: 'services', target: 'overview', icon: 'services', label: 'Services' },
      { id: 'schedule', target: 'availability', icon: 'clock', label: 'Schedule' },
    ],
  },
  {
    label: 'REVENUE',
    items: [
      { id: 'transactions', target: 'revenue', icon: 'dollar', label: 'Transactions' },
      { id: 'reports', target: 'revenue', icon: 'reports', label: 'Reports' },
    ],
  },
  {
    label: 'ENGAGE',
    items: [
      { id: 'loyalty', target: 'overview', icon: 'star', label: 'Loyalty' },
      { id: 'perks', target: 'overview', icon: 'gift', label: 'Perks' },
      { id: 'notifications', target: 'overview', icon: 'bell', label: 'Notifications' },
    ],
  },
  {
    divider: true,
    items: [{ id: 'settings', target: 'overview', icon: 'settings', label: 'Settings' }],
  },
]

export function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Singapore'
  } catch {
    return 'Asia/Singapore'
  }
}
